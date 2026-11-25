# SDDBuilder — Architecture

Status: proposed. Technology choices in §5 are proposals to confirm before the first feature starts. The process model is in §6 (decisions) and §11 (the default pipeline); §12 holds the structural rules. This document describes how it is built and generated. The builder code was removed on 2026-11-16 for a restart; §10 describes what is to be rebuilt. The flow model of 2026-11-18 is decisions 38 and 39 (§6). §9, §11 and §12 are updated to it; the block-level rules stay until the parser plan.

## 1. Components

```
┌────────────────────────────┐   ProjectConfig (JSON)   ┌───────────────────────────────┐
│ source/apps/web                   │ ───────────────────────▶ │ source/apps/api                      │
│ map, pipeline, wizard,     │                          │ POST /analyze                 │──▶ LLM API
│ brief form, presentation   │ ◀─────────────────────── │ POST /generate → zip          │   (server-side only)
│ state in the browser only  │   findings, zip          └──────────────┬────────────────┘
└────────────────────────────┘                                          │ uses
                                                       ┌────────────────▼──────────────┐
                                                       │ source/packages/core                 │
                                                       │ model, default pipeline,      │
                                                       │ structural checks, generator  │
                                                       │ (pure, no I/O)                │
                                                       └────────────────┬──────────────┘
                                                                        │ reads
                                                       ┌────────────────▼──────────────┐
                                                       │ source/templates/                    │
                                                       │ Claude Code layout            │
                                                       └───────────────────────────────┘
```

| Module | Responsibility | Depends on |
|---|---|---|
| `source/packages/core` | Domain types (commands, blocks, conditions, map), the default pipeline, structural checks, file-tree generation. No I/O, no HTTP, no UI, no LLM calls. | nothing |
| `source/templates/` | Text templates with `{{placeholders}}`, Claude Code layout. Data, not code. | — |
| `source/apps/api` | HTTP routing, request validation, LLM review, rate and cost limits, zip packaging. Stateless. | `core` |
| `source/apps/web` | The project wizard, four steps in order: step 1 project name and idea (F-05), step 2 technical details and code rules (F-21), step 3 workflow, which hosts the builder on its Pipeline tab (F-05 hosts it, F-06 builds it), and step 4 analyze and generate (F-22): an analyze block, and a project preview with one Generate and download button. F-05 also owns the frame: a stepper that is not clickable, with Prev and Next buttons beside it and the web app's privacy rules (no storage or console calls, no provider key in the source). The privacy notice with its checkbox sits on step 4 and is built by F-22. Presentation mode (F-18) is in the same app. Holds state in browser memory only (no `localStorage`, `sessionStorage` or `indexedDB`, decision 13). The Vite dev server forwards `/analyze` and `/generate` to `source/apps/api`, with a 300-second proxy timeout. | `core` (types only) |

Dependency direction: `web → core`, `api → core`, `core → templates` (read at build time). Nothing depends on `web` or `api`. The LLM is called only from `source/apps/api`.

## 2. Data flow

1. The user edits the pipeline on the map and the brief in the browser. The state is one `ProjectConfig` (see `source/packages/core/src/model.ts`).
2. `POST /analyze` with the config:
   1. `core` runs the structural checks (instant, no cost). These include the rules in §12.
   2. `source/apps/api` sends the brief and the process to the LLM with a fixed review prompt, and asks for output in the `AnalysisFinding` shape.
   3. The API validates the model output against the schema. Invalid output is dropped and counted, not shown.
   4. The response is `{ findings, review: { status, findings, dropped } }`: the structural findings, and the valid model findings under `review`. If the LLM step fails, `review.status` is `failed` with no review findings, and the structural findings are still returned. Budget limits are F-13. The request body is the `ProjectConfig` itself. A body that is not a valid `ProjectConfig` gets 400; a valid config gets 200 even when the model fails.
3. `POST /generate` with the pipeline config (`schemaVersion` 2, the same body as `/analyze`) returns a zip. `source/apps/api` refuses a configuration that `core` finds problems in with 422, before any model call. `core` builds the generation input from the config (the block descriptions, the process and the template layout). `source/apps/api` makes one model call for the whole plan, which writes every planned file: the base files (`CLAUDE.md`, `spec/documents/process.md`, the spec template) and the final command, agent and rule files; `core` then checks the reply (§3). A failed reply gets one retry. Nothing is stored on the server.
4. The MVP keeps the config in the browser session only. Save, import and export are post-MVP (F-08).

Findings never change the configuration. The user decides what to apply.

## 3. Generation model

- **Input:** `ProjectConfig` plus the default pipeline (the default pipeline, §11).
- **Step 1, check:** the structural rules. A configuration that fails them is refused with every problem listed (F-02, `InvalidConfigError`).
- **Step 2, select:** all flows and blocks, in pipeline order. Each flow's blocks are walked from its Start along `next` links and the `true` (then `false`) routes of conditions; each block is listed once. A flow's approval is a flag of the flow.
- **Step 3, render base files:** project instructions (`CLAUDE.md`), spec templates, `process.md` (text listing the flows, their blocks and their approvals; the Mermaid view is F-05). The base layouts take the lists `baseValues` builds in code (`processFlows`, `commandList`, `agentList`, `ruleList`); `processDiagram` is F-05's (`source/templates/README.md`).
- **Step 4, render per flow:** the pipeline command file `pipeline.md` (its arguments, its flows in order, and each flow's approval), and one command file per flow, named from the flow name (`flowFileName`, F-16 AC-013) and not from the flow id, with its Agent calls in order and its conditions as numbered rules, with their true and false routes and the round limit of each return (a return always carries one).
- **Step 5, write per file (LLM):** the LLM writes the content of each command and agent file, from its description and its template, and the rule files they carry. `core` fixes the file path and the place of each file in the output.
- **Step 6, check:** `core` checks what the model returned. Every file path must be one `core` expects, no placeholder may be left in the text (step markers wait for F-05), and every path mentioned in a generated file must exist in the output (F-10). The checks a reply must pass are set in F-04 (see below); the retry for a reply that fails them is made by `source/apps/api` (F-07).

Three pure functions in `source/packages/core` serve steps 1, 5 and 6 (F-04), exported in the `pipeline` namespace, and no other generator name is exported (`pipeline/index.ts`).

- **`pipeline.configProblems(config)`** (step 1) returns the blocker findings of `analyzeStructure` (F-03), in the same order. A warning is not returned. An empty list means the configuration may be planned.
- **`pipeline.planGeneration(config, templates)`** (step 5's input) returns `{ ok: true, files }` or `{ ok: false, problems }`. A configuration with a blocker is refused first: `problems` are the blockers of `configProblems`, in analysis order, and no layout is rendered and no file is listed. Otherwise `files` has one entry per output file, in the file list's order (code-point order by path): its path, its rendered layout, its description (a flow's or an Agent block's `description`, or empty) and its rule tags (empty when none). The templates are data passed in (`GenerationTemplates`); core reads no file.
- **`pipeline.checkReply(plan, reply)`** (step 6) takes the plan and the reply as a `Map` from path to value. A value is `unknown` and is not trusted. It returns findings `{ path, message }`: a planned file missing from the reply, a reply path that is unsafe or not in the plan, a value that is not a string, an empty text, a `{{...}}` placeholder left in a text, a `##` heading of a Markdown layout that is not a whole line of the text, and a mention of SDDBuilder or its own paths (`source/apps/web`, `source/apps/api`, `source/packages/core`). It returns the findings sorted by path, then by message, and changes neither input. Step markers are not checked until F-05 defines their syntax.

The values of each layout are built in code, one builder per layout kind in `source/packages/core/src/pipeline/generate/values-*.ts` (`flowValues`, `pipelineValues`, `agentValues`, `ruleValues` and `baseValues`), and the layouts are rendered by `renderLayout`: each `{{name}}` is replaced in one pass, a value is not rendered again, and an unknown name or an unclosed `{{` throws `GenerationError` naming the file path. The value names and the line-break convention are in `source/templates/README.md`.

The model call and the one-retry rule live in `source/apps/api` (F-07), not in `core`.

`/generate` makes one model call for the whole plan. The reply must be one JSON object mapping each planned path to its text, with no code fence and no text around it; it goes through `parseReply` (`source/apps/api/src/generate/parse-reply.ts`) and `pipeline.checkReply`. A reply whose stop reason is `max_tokens` counts as a bad reply. If either fails, one retry is made with the findings in the prompt. A second failure returns the findings and paths only, never file text. A provider error is not retried.

The zip is named `sddbuilder-project.zip` (`application/zip`, `Content-Disposition: attachment`). It holds file entries only, in plan order, DEFLATE-compressed, each stamped with the fixed date 2020-01-01 00:00 UTC, so the same files give the same bytes.

Status codes of `/generate`: 200 zip; 400 invalid JSON or a body that is not a `ProjectConfig`; 422 configuration refused (every problem listed, no model call); 502 model call failed, or the reply failed the checks twice; 503 generation model not configured; 500 unexpected error (generic message). Unknown paths give 404; any other method on `/analyze` or `/generate` gives 405 with `Allow: POST`.

The file list, paths and order are deterministic: the same config gives the same set of files. The wording of LLM-written content may differ between runs. Tests use a fake model with fixed replies, so they stay deterministic.

## 4. LLM analysis

| Concern | Decision |
|---|---|
| Provider | Anthropic API |
| Model | A Claude Sonnet model, set by the `SDDBUILDER_ANALYZER_MODEL` environment variable. The analyzer default is `claude-sonnet-5-5`, used when the variable is not set. |
| Key | `ANTHROPIC_API_KEY`, server environment only. Never sent to the browser, never logged. |
| Environment | `ANTHROPIC_API_KEY` (server only); `SDDBUILDER_ANALYZER_MODEL` (model for analysis, default `claude-sonnet-5-5`); `SDDBUILDER_GENERATOR_MODEL` (model for generation, default `claude-opus-5-5`; see §5); `PORT` (listen port, default 3000; a value that is not a whole number from 1 to 65535 stops startup). |
| Input | Analysis: `/analyze` takes the pipeline config (`schemaVersion` 2) and reads it with `parsePipelineConfig` from its own reader. A body that is not JSON is a 400 with an error only; a body that fails the parse is a 400 with `<path>: <reason>` problems, and a problem may name an unknown key the client sent. The caps are checked after the parse, before any model call: the idea at most 5,000 characters, counted in code points (decision 28), and at most 60 rules (the pipeline caps; the flat module cap does not apply); a cap refusal is a 422 with `<path>: <reason>` problems (decision 12). `/generate` takes the same pipeline config (decision 23). Generation: the block descriptions, the process and the template layout, with a size cap (F-13). |
| Output | JSON in the `AnalysisFinding` shape, validated server-side. The analysis result is `{ findings, review: { status, findings, dropped } }`. `findings` are the structural findings from `pipeline.analyzeStructure` in `core`: the refusals of the generator's pipeline checks are blockers, reachability among them; retry round limits and iteration sources are warnings; brief checks give a blocker for a blank `name`, `idea` or `stack.language`, and warnings for a blank optional stack field and an empty `rules` list. `review.status` is `ok`, `failed` or `skipped` (decision 12). The review reply is checked by `pipeline.checkReview`: a reply that is not an array fails; an entry is kept only with a non-blank `subject` and `message` and with severity `warning` or `info` (a model `blocker` is converted to `warning` and kept). At most 10 entries are kept (decision 37). `review.findings` are the kept entries and `review.dropped` counts the others. Structural findings are returned even when the review fails. |
| Review call | One call per analysis, made with the fixed review prompt, the brief and the pipeline config (the prompt is held in `source/apps/api`, decision 37). `max_tokens` 8192; client timeout 60 s; no SDK retry (decision 37). |
| Failure | No model (a missing `ANTHROPIC_API_KEY`; the log line names the cause, never the value), or a thrown error from the model call (a timeout of 60 s on the SDK client; the review call makes no SDK retry, so one call per analysis, which supersedes the SDK default of two retries (decision 37); a provider error), a reply cut short at `max_tokens` (`stop_reason`; the reply is not parsed), a reply that is not JSON, or a reply that is not a JSON array → `review.status` is `failed` with no review findings; the structural findings are still returned. Invalid single findings are dropped, not a failure. At the daily review ceiling `/analyze` answers 200 with `review.status` `skipped` and the structural findings only; the model is not called (decision 12). Per-client limits and the budget are F-13. |
| Generation call | One call per `/generate`, for the whole plan. `max_tokens` 32000 (`GENERATION_MAX_TOKENS`); client timeout 300 s (`GENERATION_TIMEOUT_MS`, not the review's 60 s). A timeout or provider error fails after that call; the SDK's own retries apply inside the adapter. The retry for a bad reply is in §3. |
| Privacy | The browser shows a notice before analysis: the brief is sent to the model provider. The server does not store or log brief content. |

## 5. Technology (proposed)

| Concern | Proposal | Why |
|---|---|---|
| Language | TypeScript, strict | Matches the existing ComEd backend; shared types between web and API |
| Monorepo | npm workspaces | No extra tool needed for three packages |
| Web | Vite + React for `source/apps/web`; the Vite dev server forwards `/analyze` and `/generate` to `source/apps/api`, with a 300-second proxy timeout | Standard, small, static build. Decided 2026-11-13 (F-05) |
| Component library | Material UI (`@mui/material`) React components for the wizard, the panels and the buttons. The diagram stays React Flow. The exact version is pinned when the package is installed | The owner's choice for the look and feel (`ui.md`). Recorded here before code uses it. Decided 2026-11-16. Approved pin `@mui/material` 9.5.0 (exact), approved by the user 2026-11-17 (F-07 T001) |
| Material UI styling engine (peers of `@mui/material`) | `@emotion/react` 11.14.0 and `@emotion/styled` 11.14.1, both exact pins in `source/apps/web`. Approved by the user 2026-11-17 (option 1, F-07 T001). `@emotion/react` 11.14.1 is not published on npm, so 11.14.0 was chosen by the user; 11.14.0 is the latest published `@emotion/react` | Material UI 9 uses Emotion 11 as its default styling engine (both peers are marked optional in Material UI, for the Pigment CSS alternative); the application code does not import Emotion, only Material UI components |
| Visual style (F-11 screens) | Material Kit React by Devias IO: the layout, the palette and the radii are taken as a look (grey page `#F0F4F8`, white cards with a 12 px radius, controls with 8 px, primary `#635BFF`, Inter font). MIT licence, github.com/devias-io/material-kit-react. No code is copied and no package is added | Decided 2026-11-18 (owner). Credited in `ui.md` §3.0 and in the F-11 screens |
| Platform | Desktop browsers only; reference layout 1280 × 800; no mobile or tablet layout in the MVP | The owner's decision (decision 31). Decided 2026-11-16 |
| Diagrams (Pipeline tab) | React Flow, `@xyflow/react` 12.x (the 12 line; 13 is not used), in `source/apps/web` only | Renders nodes and connectors with drag and pointer connect for the Pipeline tab (F-06) and the presentation and process diagrams (F-18). Decided 2026-11-13 (F-06) |
| Builder state (Pipeline tab, flow tabs) | Plain TypeScript in `source/apps/web/src/builder/`: an in-memory view-model over `ProjectConfig.pipeline`, with the live marks from `pipeline.analyzeStructure` in `core`. No storage, no network call. Decided 2026-11-15 (F-06, decision 24) | Keeps the edit rules testable with Vitest, as the web tests of §5 require, and keeps the rules in one place: the analyzer |
| API | Hono 4.13.14 with `@hono/node-server` 2.1.5 (peer `hono` `^4 \|\| ^5.0.0-0`, we pin 4.x) on Node | Small surface: two endpoints; Web-standard `Request`/`Response`, so routes test without a network port. Decided 2026-11-12 (F-07) |
| LLM SDK | Official Anthropic TypeScript SDK | First-party, typed |
| API start script runner | `vite-node` 5.3.0, exact devDependency of `source/apps/api`, runs `src/server.ts` for `npm run start`. Its `vite` dependency (`^7.3.1`) resolves to the one vite already installed for vitest, so no second copy is installed. Approved by the user 2026-11-24 (F-14 T008 stop; option 1) | The `start` script of F-14 needs a runner; 5.3.0 is the line that matches the installed vite (6.0.0 needs vite 8, a second copy) |
| Zip | JSZip 3.10.2, in memory | Works in memory for project-sized output; ships its own types. Decided 2026-11-12 (F-07) |
| Tests | Vitest. For `source/apps/web` the logic and markup tests run in Node as before. Click tests of a component use a DOM library, enabled per file with `// @vitest-environment jsdom`: `jsdom` 30.1.3, `@testing-library/react` 16.3.3 and `@testing-library/dom` 10.4.2 (its peer), exact dev-dependency pins of `source/apps/web`. No browser test library (no Playwright) in the MVP | Same family as the ComEd backend tests. Decided 2026-11-13 (F-05). DOM library added 2026-11-17 (F-10 T004), approved by the user (option A, the rule-list removal clicks could not be tested without it) |
| Default pipeline data | `source/templates/pipeline/default.json` is imported by `source/packages/core` at build time (`resolveJsonModule`, `source/templates/` in its include path). Core reads no file at run time. Decided 2026-11-14 (F-01) | Keeps core pure (no file system) and the default process as data (decision 1) |
| Config format | `ProjectConfig` carries `schemaVersion: 2`; the parser refuses any other value. Decided 2026-11-14 (F-01) | One version check for the API, the JSON load and the later import (F-08) |

No database, no user authentication, no queue in the MVP. Rate limiting is per client address and in memory; the spending ceiling is a configured daily limit.

Abuse and cost settings (F-13, decision 12): environment variables `SDDBUILDER_REVIEW_DAILY_LIMIT` (default 500) and `SDDBUILDER_GENERATE_DAILY_LIMIT` (default 50), read once at startup. Both are whole numbers of 0 or more; an invalid value stops startup and the error names the variable only. `SDDBUILDER_GENERATOR_MODEL` names the generation model (default `claude-opus-5-5`); a blank value counts as unset, and it is read once at startup, like `SDDBUILDER_ANALYZER_MODEL`. `ANTHROPIC_API_KEY` stays in the server environment only. Review calls use `max_tokens` 8192 and a 60-second timeout; generation calls use the fixed constants `max_tokens` 32000 and a 300-second timeout (not environment variables). Limiter and counter state is in memory and resets on restart.

## 6. Decisions

1. **The process is data, not code.** Commands, blocks, conditions and the map are JSON in `ProjectConfig`; the templates are text files. Adding a block kind means changing the model and the templates, not the generator's logic for the others.
2. **The server is stateless.** No projects, no accounts, no stored briefs. Each request is self-contained.
3. **Structure is enforced in the model,** not only in the UI. A required block cannot be removed through the API, and a configuration that breaks the workflow rules is refused.
4. **Claude Code is the only target in the MVP.** Spec Kit and OpenSpec outputs are planned right after it (§8). Cursor and Copilot are later. Gaps between formats are stated rather than invented.
5. **Generated projects follow the reference layout** (`CLAUDE.md`, `spec/documents`, `spec/specifications/F-XX-*`, `.claude/`), so a project set up here can be run with the same commands as ComEd and PhotoSync. The `.claude/` folder of this repository is the development environment and is not generated: a generated project gets the pipeline command and the agents of its blocks only.
6. **The LLM advises, the structure decides.** Structural checks are authoritative. LLM findings are labelled as advice and never applied automatically.
7. **The LLM writes the final framework at generation, from the block descriptions.** Each block carries a high-level description of what it should do. At `/generate` the LLM turns the built commands into the final command, agent and rule files. `core` fixes the file list, paths, block order, gates and branches, and checks the reply before it reaches the zip. This replaces the earlier rule that generation is template-only with no LLM. Recorded 2026-11-11, confirmed by the user. Templates hold the layout and the block descriptions the LLM works from, not final content.
8. **Custom blocks are data, optional, and never required.** A custom block is an agent with a name, a description and a body, placed in a flow. Its id must not clash with another id. Required blocks come only from the default pipeline.
9. **One level of nesting, and no cycles.** The pipeline contains flows; a flow contains blocks only. Blocks run in order; a retry goes back to an earlier block of the same flow (in the pipeline, a gate may go back to an earlier flow). An Agent block runs an agent, never a flow. Under decision 38 the pipeline is a chain of flows (one `next` each) and a loop is refused; the back routes of checks have no place in the flow model (§11).
10. **One analysis shape, refusals are blockers, and LLM findings are advice.** `analyzePipeline(config, model, log)` in `source/apps/api/src/analyze.ts` returns `{ findings, review: { status, findings, dropped } }` for the pipeline model. `findings` are the structural findings from `pipeline.analyzeStructure` in `source/packages/core/src/pipeline/analyze/`. `review` is the LLM part from `source/apps/api`: `status` is `ok`, `failed` or `skipped` (`skipped` when the daily review ceiling is reached, decision 12; the route then answers with `pipeline.skippedAnalysis` and the model is not called), `findings` are the valid model findings, and `dropped` counts model findings that failed the reply check. The problems that make `generate()` refuse a configuration (the generator's pipeline refusal checks, `configProblems`) appear as blocker findings in the analysis, so the analysis reports the same problems `generate()` refuses. Structural severities: a refusal, including an unreachable block, is a blocker; a retry with no round limit is a blocker (updated 2026-11-19, owner decision, F-03); an agent that repeats over a task or feature scope with no iteration source is a warning (in the first flow, the pipeline Start's declared arguments count as a source); a brief missing a required field (`name`, `idea`, `stack.language`) is a blocker; a blank optional stack field and an empty `rules` list are warnings. LLM findings are advice: a model finding with severity `blocker` is kept as `warning`, and model output is never applied automatically. Recorded 2026-11-12, before the analyzer code (F-04). Updated 2026-11-15 (F-04).
11. **Generation makes one model call for the whole plan, with one retry, and returns a zip.** `/generate` takes the `ProjectConfig` itself as the request body (no wrapper). After `validateConfig` and `planGeneration`, the API makes one model call whose reply is one JSON object mapping each planned path to its text. The reply goes through `parseReply` and `checkReply`. If either fails, the API makes exactly one retry whose prompt lists the first findings. A second failure returns the findings and paths only, never file text. F-07 does not retry provider errors: a model that throws, times out or is rate-limited fails after one call, and the Anthropic SDK's own retries stay inside the adapter. Status codes: 400 for bad input (invalid JSON or a `ProjectConfig` that does not parse), 422 for a configuration refused by `validateConfig` (every problem listed), 502 for a provider error on the first call (no retry) or a reply that fails the check on both calls (with `problems`), 503 when the generation model is not configured, 500 for an unexpected error (generic message, no exception text), 200 for the zip. Unknown paths return 404, and a `GET` on either route returns 405 with `Allow: POST`. The zip is served as `application/zip` with `Content-Disposition: attachment; filename="sddbuilder-project.zip"`, a fixed name. No file is written during a request. The generation call sets `GENERATION_MAX_TOKENS` to 32000 (starting value, to be checked once a product runs end to end) and a client timeout of `GENERATION_TIMEOUT_MS` (300 seconds): a whole-plan reply takes minutes, unlike the 60 seconds of the review. Recorded 2026-11-12, before the generation code (F-07). Note 2026-11-15 (F-07): the body is the `schemaVersion` 2 pipeline config, not the flat `ProjectConfig` (decision 23), and the checks named above are `pipeline.configProblems` and `pipeline.planGeneration`; the flat `validateConfig` and `planGeneration` are removed.
12. **Abuse and cost limits are fixed, in memory, and checked before any model call.** Limits are per client address, taken from the connection's remote address; a forwarded-address header from the request is ignored. Per client: 10 accepted requests per minute and 100 per UTC day, as fixed windows. A refusal is 429 with `Retry-After` in whole seconds and the error body. `/analyze` and `/generate` share one count. Only accepted requests count; 404 and 405 do not count, and neither do requests refused by a limit or an input cap. Input caps, checked on both routes before any model call: the idea text at most 5,000 characters (decision 28 replaces the 8,000 first set here; counted in code points, a surrogate pair counts as one character; as submitted, no trimming), and at most 60 rule blocks. A cap refusal is 422 and lists every exceeded cap as `<path>: <reason>`, never submitted text. Daily ceilings per UTC day, counted when a model call is made (a failed call still counts): review 500 (`SDDBUILDER_REVIEW_DAILY_LIMIT`); at the ceiling `/analyze` answers 200 with review `skipped` and structural findings only, and the model is not called. Generation 50 (`SDDBUILDER_GENERATE_DAILY_LIMIT`); at the ceiling `/generate` answers 429 with the error body. A configuration refused by `validateConfig` on `/generate` answers 422 before the generation ceiling is checked, so it does not count. A review reply that stops at `max_tokens` counts as `failed`. Log lines for refusals carry the event, route and status only. Behind a shared proxy all clients share one address, which is accepted for the MVP. Recorded 2026-11-13, before the limiter code (F-13).
13. **The brief form is a Vite + React app with logic tested apart from the UI.** `source/apps/web` is built with Vite and React. Its state, configuration building, validation, gate, request and result view-model live in plain TypeScript modules under `source/apps/web/src/` and are tested with Vitest; the React components only bind them, and no DOM or browser test library is used in the MVP. The Vite dev server forwards `/analyze` to `source/apps/api`, so the browser calls one origin. The brief has a Project name field that maps to `name` (required, a blocker when blank, as in decision 10). The browser keeps the brief in React memory only: no `localStorage`, `sessionStorage` or `indexedDB`. Recorded 2026-11-13, before the web code (F-05).

14. **Commands and blocks (2026-11-14).** *Condition, Connection and the gates between flows are superseded by decision 38 (2026-11-18); Approval and Check are flow properties.* The pipeline is the top-level flow and contains child flows; a flow contains blocks: Start, Agent (runs an agent; scope set on the block), Condition (a fixed check type, pass and fail routes, an optional round limit; it can sit between flows as a gate or check), Connection (a runs-after link with an artifact label) and End. Only the pipeline contains flows. Skills and scripts are not block kinds in the MVP. The pipeline is shown on the Pipeline tab (renamed from Map, decision 30). The scope on Agent blocks is superseded by decision 29. Confirmed by the owner.
15. **The brief is a four-step wizard (2026-11-14).** Project name and idea; technical details (architecture style, tech stack, and code rules as rule blocks, each becoming one Markdown file in `.claude/rules/`; no module list); workflow (the command builder, §10); analyze and generate. There is no Brief / Builder switch. Confirmed by the owner.
16. **The config is versioned, with one pipeline per project (2026-11-14).** `ProjectConfig` carries `schemaVersion: 2` and one `pipeline`. The parser refuses any other schema version. Several pipelines per project are not in the MVP. Recorded 2026-11-14, F-01.
17. **The default pipeline is data, imported at build time (2026-11-14).** *The gates named here are the flow properties of decision 38 (2026-11-18); the data file changes with the parser plan.* The six flows, their blocks and the gates between them live in `source/templates/pipeline/default.json`. `source/packages/core` imports the file when it is built and never reads files at run time, so core stays free of file system code. Changing the default process means changing the JSON; a test checks that the default still parses without problems. Recorded 2026-11-14, F-01.
18. **Ids are user-given, file-safe and unique in the project (2026-11-14).** An id uses lowercase letters, digits and hyphens, starts with a letter, and is unique in the project across flows, blocks and arguments; an agent name is unique among agents. An id that breaks the rule, or clashes with another, is refused with its path. Agent names are file names, so the rule keeps them safe in file names and links. Recorded 2026-11-14, F-01.
19. **The new model is built beside the flat model until each consumer is rebuilt (2026-11-14).** The pipeline model lives in `source/packages/core/src/pipeline/`, beside the flat model (`model.ts`, `catalog.ts`, `parse-config.ts`) that `core` and the apps still use. F-01 removes no flat code. Each later feature rebuilds the consumers it touches on the new model and removes the flat code it replaces in the same task, so the build stays green at every step. A flat file is removed by the feature that rebuilds its last consumer. Recorded 2026-11-14, F-01. Note 2026-11-15 (F-07): F-07 removed the flat generator and the flat templates: the flat generation service, prompt, planning and reply check, the flat `src/generate.ts`, `plan.ts`, `reply-check.ts`, `select.ts` and `file-list.ts`, the flat `src/validate/`, the flat `src/render/` files except `render/mermaid.ts` (named for F-18 here; the Mermaid view is F-05, decision 36), and the flat template folders `flat/`, `rules/`, `workflows/` and `steps/`. The pipeline files `source/apps/api/src/generate/service.ts` and `prompt.ts` keep the names of the removed flat files; they hold the pipeline versions now. The flat model files (`model.ts`, `catalog.ts`, `parse-config.ts`) stay until F-05 rebuilds the web app.
20. **Rules are a list in the project config (2026-11-14).** `ProjectConfig` gains a `rules` list of entries with `id`, `title` and `text`. Each entry becomes `.claude/rules/<id>.md`, with the rule's title and text as its content. The pipeline model has no rule block kind: rules are project data, not blocks, so the five block kinds of decision 14 stay. F-05 fills the list from the wizard's technical details step. Recorded 2026-11-14, F-02.

21. **Rule-set tags are rule ids (2026-11-14).** An Agent block and a flow carry `ruleTags`: a list of ids of entries in `ProjectConfig.rules`, empty when the key is absent. A tag that names no rule is refused as a blocker at the tag's path, as an unknown id is. The tags reach the agent and flow command entries of the plan (`planGeneration`), so the model writes each file knowing which rule files apply. Recorded 2026-11-14, F-03 (Amendment of 2026-11-14 in the F-03 progress record).

22. **The pipeline module is exposed as a namespace, and the pipeline analysis lives beside the flat one (2026-11-14).** The root of `source/packages/core` exports the pipeline module as the namespace `pipeline` (`export * as pipeline from './pipeline/index.js'`), so its names (`ProjectConfig`, `Scope`, `planGeneration`, `checkReply`, and the rest) do not collide with the flat model's names. The pipeline analysis (structural findings, review reply check, input caps, skipped analysis) lives in `source/packages/core/src/pipeline/analyze/` and `source/packages/core/src/pipeline/caps.ts`. The flat analyzer (`source/packages/core/src/analyze/`) is removed in F-06, the analyzer's owner, when `/analyze` is rewired to the pipeline model (decision 19). Note 2026-11-16 (F-04): F-04 adds the generator's refusals to the analysis rules only; the rest of the analyzer wiring is F-06. `/generate` keeps the flat model until F-07. Recorded 2026-11-14, F-04. Note 2026-11-15 (F-07): `/generate` is on the pipeline model now (decision 23), and the root no longer exports the flat `generate`, `planGeneration`, `checkReply`, `finishFileList` or `validateConfig`. `generate`, `planGeneration` and `checkReply` are reached through `pipeline.` only; `finishFileList` and `validateConfig` are removed.
23. **`/generate` takes the pipeline config only, and the flat generator goes (2026-11-15).** `/generate` takes the `schemaVersion` 2 pipeline config, like `/analyze`. A flat `schemaVersion` 1 body is refused with 400, so no client depends on the flat shape. The flat generator is removed in F-07 (decision 19): its route, its flat planning and reply check, and its flat template layouts go in the same feature. The flat model stays only where the web app still imports it, until F-05 rebuilds the app. A duplicate output path is a server error, not a refusal: the pipeline generator (`source/packages/core/src/pipeline/generate/`, F-02) throws `GenerationError` for two files with one path, and the route reports it as an unexpected error with the generic 500 message, because a duplicate is a bug in the pipeline code, not a fault in the user's configuration. Limits, retries and status codes are not re-decided here (§3, decisions 11 and 12). Recorded 2026-11-15, F-07.

24. **The visual builder is a view-model over the pipeline config, and the live marks reuse the analyzer's rules (2026-11-15, F-06; drawn by F-06 T023, amendment 16).** The builder's state and edit rules live in `source/apps/web/src/builder/` as plain TypeScript over `ProjectConfig.pipeline`. The state holds the configuration in memory and reports it to its host after each change; no `fetch`, XHR or WebSocket call is made from that folder. The live marks on the Map and the flow tabs call `pipeline.analyzeStructure` from `source/packages/core` (F-04) and never refuse an edit; entry checks refuse only a value the model cannot hold (an id, a number, a body over its cap). No rule module is built in F-06. `review` is no longer a check type (§6 decision 8, §3 and §4; §9 here): the review is an Agent block followed by a `checks` Condition. F-06 depends on F-01 and F-04. The flat builder and the flat model are removed in F-06 T021, after F-05 T001 to T015 are committed (decision 19), and only the flat code with no remaining consumer goes; a remaining consumer stops that task. Recorded 2026-11-15, F-06.

25. **Every Condition has a description in the model (F-06 amendment 1, 2026-11-15).** The description says what passing means, and the generator writes the flow's rule text from it. The parser refuses a missing or blank description on any Condition. Before this decision the field was in the block table of ui.md §4 but not in the model.

26. **Agent blocks and the pipeline carry model, tools and body (F-06 amendment 4, 2026-11-16).** An Agent block takes an optional model (`haiku`, `sonnet`, `opus`, `inherit`), an optional list of tool names and an optional body. The pipeline takes the same three, and its description and rule tags. The parser checks their shape; the generator writes them into the agent file frontmatter and body, and into the pipeline command. The body length cap (4,000 characters) is an entry check in the builder (F-06 AC-030), not a parse rule. Before this decision the fields were in the block table of ui.md §4 but not in the model.

27. **Agent blocks carry reads and writes (F-06 amendment 9, 2026-11-16); removed (amended 2026-11-24).** The 2026-11-16 decision gave an Agent block optional `reads` and `writes` lists of artifact names, checked by the parser and shown on the Agent panel. Amended 2026-11-24 (owner decision): both are removed from the model, the parser, the schema, the analyzer and the generator, and the Agent panel has no Reads or Writes list. Tools are the one list of an Agent: the builder refuses a tool the Agent already lists, with the reason "repeats <tool>; each tool must be listed once"; the parser still accepts repeats. A saved project with `reads` or `writes` is refused as an unknown key; there is no migration, and the schema version stays at 2.

28. **Text limits (2026-11-16).** Every body text is at most 1,000 characters: a rule block's description, an Agent body, a flow body and the pipeline body. The idea and the architecture text are at most 5,000 characters, counted in code points. This supersedes the 8,000-character idea limit (F-05 AC-008) and the 4,000-character Agent body cap (F-06 AC-030). Decided for Agent bodies too (`ui.md` D2).

29. **Agent blocks have no scope field (2026-11-16).** An Agent block has no scope. Its scope is written in its arguments, as text. This supersedes the scope attribute of decision 8 and the iteration-source rule for agents in §12. The loop a command runs in (per feature, per task) is written in the flow's and the agent's argument text, and the command text is written from it (decision 7); the model has no rule for it. The analysis no longer checks that a task-scoped agent reads a plan (decided 2026-11-16, `ui.md` D6). The core model is changed when the features are rebuilt.

30. **The builder tabs, toolboxes and blocks (2026-11-16).** The first tab is **Pipeline** (the whole process; it replaces the name Map). One tab per flow follows, in pipeline order. A **+** button after the last tab adds a flow. The pipeline's toolbox holds **Connection**, **Approval** and **Check**. A flow's toolbox holds **Start**, **Agent**, **Approval**, **Check**, **Connection** and **End**. Start and End exist only on flow tabs; the pipeline's arguments are set in its properties panel. **Approval** is a block that stops and waits for a person. **Check** is a block with two outputs, one for true and one for false, decided by an agent (`checks` or `diff size`). Approval and Check are different blocks. Supersedes the Map toolbox and the drawn-only connections of the earlier F-06 decisions. The pipeline toolbox is removed, and Approval and Check are properties of the flow, not blocks (decision 38, 2026-11-18; `ui.md` §3.2).

31. **Desktop only, and Material UI (2026-11-16).** The MVP is a desktop web app at the reference layout 1280 × 800. There is no phone or tablet layout. The UI uses Material UI components (§5).

32. **Wizard navigation and step 4 (2026-11-16).** The wizard's stepper is not clickable. Prev and Next are buttons beside it, and step 4 shows Next disabled (decision amended 2026-11-17, F-08). Step 4 has an analyze block (the privacy notice with its checkbox, Analyze, and the findings) and a project preview (the file tree). One button, **Generate and download**, is enabled only when the analysis has no blocker. This replaces the separate Generate and Download steps of F-22 AC-010 and AC-011.

33. **Connections are `connectedTo` properties, and the pipeline is a JSON file (2026-11-16, F-02).** *Superseded by the final schema, `spec/documents/pipeline-schema.md` (2026-11-19), which the F-02 parser implements. Under it: a link is `next`, on a block or a flow, with no label and no gate; the block kinds are start, agent, condition and end (Approval and Check are removed, approval is a flag of the flow, and a flow has no checks of its own; a check is a condition block); the TypeScript types below are the 2026-11-16 draft. Decisions 38 to 41 govern the flow model.* Decided by the owner. The pipeline is one JSON object: `source/templates/pipeline/default.json` is that object, and it becomes the `pipeline` of `ProjectConfig` (decision 16). Its 2026-11-16 draft schema, as TypeScript types (`Id` and the id rule are decision 18; `Model` is `"haiku" | "sonnet" | "opus" | "inherit"`):

```ts
interface ProjectConfig { schemaVersion: 2; rules: Rule[]; pipeline: Pipeline }
interface Rule { id: Id; title: string; text: string }

interface Pipeline {                 // default.json
  name: string;                      // non-blank
  description: string;               // non-blank
  arguments: Argument[];             // structured; default: feature-id, required
  model?: Model;
  tools?: string[];                  // non-blank, no duplicates
  ruleTags?: Id[];                   // ids of rules (refused by F-03 when unknown)
  body?: string;                     // at most 1,000 characters
  flows: Flow[];                     // in pipeline order
}
interface Argument { id: Id; required: boolean; hint: string }

interface Flow {
  id: Id;
  name: string;
  description: string;
  arguments: string;                 // text: once, per feature, or per task
  model?: Model;
  ruleTags?: Id[];
  body?: string;                     // at most 1,000 characters
  blocks: Block[];                   // in block order
  connectedTo?: FlowLink;            // absent: the next flow in the array, no label, no gate
}

type Block = Start | Agent | Approval | Check | End;
interface Start    { id: Id; kind: "start"; connectedTo?: BlockLink }
interface Agent    { id: Id; kind: "agent"; name: Id; description: string; arguments: string;
                     restrictions?: string; model?: Model; tools?: string[];
                     ruleTags?: Id[];   // reads and writes removed (decision 27, amended 2026-11-24)
                     body?: string; connectedTo?: BlockLink }   // name: file-safe, unique among agents
interface Approval { id: Id; kind: "approval"; description: string; connectedTo?: BlockLink }
interface Check   { id: Id; kind: "check"; description: string; type: "checks" | "diff size";
                    threshold?: number;   // required for "diff size", refused otherwise; positive whole number
                    connectedTo: { true: Route; false: Route } }   // required: both outputs
interface End      { id: Id; kind: "end"; outcome: "done" | "stopped"; producedArtifact?: string }

interface BlockLink { to: Id; label: string }                 // label: artifact, non-blank
interface FlowLink  { to: Id; label: string; gate?: Gate }    // gate sits on the arrow between flows
type Gate =
  | { kind: "approval"; description: string }
  | { kind: "check"; description: string; type: "checks" | "diff size"; threshold?: number };
  // a gate's fail output stops the process; its pass output is the arrow
type Route = { to: Id; roundLimit?: number } | { stop: true };  // roundLimit: positive whole number
```

Parser rules that follow from the schema (shape only; references are checked by F-03): every object refuses unknown keys, with their path; `kind` selects the allowed keys, so `connectedTo` on an End, or `outcome` on an Agent, is refused; a Check without both outputs, or a `threshold` that does not match its type, is refused; every id follows decision 18; text fields are non-blank where marked; lists have no duplicates; the two body caps of decision 28 apply. Routes name block ids, and a route to an earlier block is a retry (F-03 checks order, reachability and round limits). Supersedes the Connection block kind of decisions 14 and 30; the UI keeps the Connection tool as the way to draw a `connectedTo` link (ui.md §4 to be aligned in the F-11 specification).

34. **Blocks and flows have no enabled property (2026-11-16, decided by the owner).** Every block and every flow is part of the process: it is checked, generated and shown. The schema carries no `enabled`, `disabled`, switch or similar key on a block or a flow; the parser refuses such a key as an unknown key (decision 33). The switch-off footer of `ui.md` §3.4 and the disabled rules of §12 are removed. Recorded 2026-11-16, F-03.
35. **The file list is sorted by path, and a flow named `pipeline` is refused (2026-11-16, F-04).** The file list of `pipeline.planGeneration` is sorted by path in code-point order, whatever the order of the rules, or of the flows after the first. The first flow is the pipeline's entry (decision 30), so a reordering that leaves a flow unreached is refused by the reachability rule, not planned (amended 2026-11-17, F-04 Verify, the user's decision). A flow whose id is `pipeline` is a blocker at the flow's path, because its command file would be `.claude/commands/pipeline.md`, the same path as the pipeline command; the analysis reports this blocker, and `configProblems` refuses the configuration with it. Two planned files with one path throw `GenerationError` (decision 23). No configuration reaches that throw: the unique ids of decision 18 and the unique rule ids and agent names of the parser leave the flow-name blocker as the only way two planned paths can clash, and that blocker refuses the configuration first. Recorded 2026-11-16, F-04.
36. **The Mermaid view is F-05; optional layout lines are built in code; base paths come from a manifest (2026-11-17, F-05).** (a) The Mermaid diagram of the generated `process.md` belongs to F-05, not F-18 (F-18 is the post-MVP import and export of the pipeline). (b) The template renderer has no conditionals, so an optional line of a layout is a whole-line value built in code, and the template holds only its placeholder on a line of its own: the `model` and `tools` lines of an agent file (`optionalFrontmatter`), and the stack-free base (`bodySection`). No layout holds a conditional. (c) A layout's `##` headings are its lines that start with `## `, in order (`headingsOf`); a `###` line is not a heading. (d) The base files' output paths are listed in `source/templates/base/manifest.json` in output order. Recorded 2026-11-17, F-05.

37. **The analyzer's brief, review limits and review prompt (2026-11-17, F-06).** (a) The brief fields `name`, `idea`, `architecture` and `stack` (`language`, `framework`, `platform`, `buildTool`, `testFramework`) are optional in the pipeline model (`ProjectConfig`); a config without them parses and the brief reads as blank. F-02 owns the parse, the limits and the stack keys (`pipeline-schema.md` §2); F-06 reads the parsed brief and adds no model fields (corrected 2026-11-20, F-06 T001; the earlier wording named F-06 as the adder). `idea` and `architecture` are at most 5,000 code points (decision 28), kept as submitted. (b) The brief checks are `pipeline.analyzeBrief`, a function of its own. `analyzeStructure` does not see the brief, so a pipeline without a brief gets no brief blocker. The analysis result lists the structural findings, then the brief findings. (c) The review call has fixed limits: `max_tokens` 8192, a 60-second timeout, and no SDK retry. One review call is made per analysis. A reply cut short at `max_tokens` gives review status `failed`. (d) `pipeline.checkReview` keeps at most 10 entries; further valid entries are counted in `dropped`. (e) The review prompt is held in `source/apps/api`, which builds the request from the prompt and the JSON of the brief and the pipeline. Core only checks the reply. Recorded 2026-11-17, F-06.

38. **A flow is one JSON object; there is no connection object (2026-11-18, F-11, owner decision; false-route options clarified 2026-11-19).** A flow holds its id, name, description, arguments, model, body, blocks, `artifacts` (its outcome artifacts: each a `label` of one line, required and non-blank, and a `template` of several lines that may be empty), `checks` (each a check: a free-text description of what must pass, required and non-blank; no type and no threshold, owner decision 2026-11-18c), `approval` (on or off: the process stops for a person at the end of this flow), and `next` (the id of the next flow, optional). The arrow between two flows is drawn from `next`; no separate connection exists, so the connection has no label and no gate. The pipeline is linear: a flow has at most one `next`, and the builder refuses a link that would close a loop; the structural rule of §12 still flags any loop that reaches the file. Delete removes the whole flow object, and any flow whose `next` pointed to it loses that `next`. This supersedes decision 33 for the connection (`connectedTo` with its label and gate) and the one-gate rule of §9 (gates are per flow: checks and the approval flag). The parser, analyzer, generator and the default pipeline (§11, `source/templates/pipeline/default.json`) change with this model, in a plan of their own; until then F-11's builder works on the current model.

39. **A flow's required attributes and its connection (2026-11-18, F-11, owner decision).** A flow requires a name and a body; its description and arguments are optional. A flow must be connected to another flow (an incoming or an outgoing `next`), except in a pipeline with a single flow. This extends the reachability rule of §12 (a flow with no link in a pipeline of more than one flow is a blocker). Not yet implemented: the parser, analyzer and default pipeline change in a plan of their own.

40. **A failed check stops the flow and asks the user (2026-11-18, F-11, owner decision).** A check is free text. When a check fails in the generated process, the flow stops and the command asks the person what to do, as the commit size check does. A condition has a true and a false route. A failed check's false route either stops the flow (`{stop: true}`, the default) or returns to an earlier agent of the same flow with a round limit (1 to 5, `roundLimit`) as a retry; loops between flows are forbidden (decision 38); a link is removed by Delete connection, which leaves the target flow in place. Placement of the build check (2026-11-19, owner decision, option 2): in the default `build` flow the build condition sits after the last work agent (`test`) and before the commit agent, so the commit happens only after the check passes. Its true route goes to the commit agent and its false route stops the flow (`{stop: true}`). This amends the earlier placement, which put the check after the commit; `source/templates/pipeline/default.json` and AC-080 of F-02 follow it.

41. **Analysis must succeed before generation; generation writes the content with the model (2026-11-19, owner decision).** A skipped or failed review is an error, not a pass: Generate stays disabled until Analyze runs and the review completes. Generation (`/generate`) does not only lay out the folder structure: the model writes the content of each generated file (agents, rules, commands, `CLAUDE.md`, `process.md`) from the pipeline's descriptions, as decision 7 states; the file list and paths come from core, and the reply is checked (decision 11). The preview shows the file list; the contents are written when the user generates. While generation runs, the Generate button shows a pending state.

## 7. Out of scope for the MVP

Accounts, saved projects on the server, save, import and export of projects (F-08), read-only share links (F-19), browser-local autosave (F-20), Cursor and Copilot targets, hosted previews of generated projects, LLM-written project content (only LLM review in the MVP), sharing custom blocks between users.

## 8. Output adapters (planned, first after the MVP)

The generator builds one logical project model (instructions, stories, plan, commands, agents, conditions), and each adapter maps it to a tool's files. The Claude adapter is the reference. Paths below come from the public docs and must be verified in the repositories before F-16 and F-17.

| Logical part | Claude Code (MVP) | GitHub Spec Kit | OpenSpec |
|---|---|---|---|
| Project instructions | `CLAUDE.md` | constitution (created with `/speckit-constitution`; storage path to verify) | `openspec/` config (to verify) |
| Spec per feature | `spec/specifications/F-XX-*/stories.md` | spec artifacts under `.specify/` (to verify) | `openspec/changes/<change>/specs/` deltas |
| Plan and tasks | `plan.md` | plan and tasks artifacts (to verify) | `design.md` and `tasks.md` in the change folder |
| Commands | `.claude/commands/pipeline.md` and one `<flow>.md` per child flow | `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement` | `/openspec-propose`, `/openspec-apply-change`, `/openspec-archive-change` |
| Agents | `.claude/agents/*.md` (skills are after the MVP) | not a native concept (to verify) | agent roles, mapped where possible (to verify) |
| Done work | commit per task | implement step (to verify) | `archive` moves the change and updates `openspec/specs/` |

Gaps are real: our commit-per-task gate and our agent split have no direct counterpart in either tool. The adapter writes them as rules or steps in the tool's own format and says so in the generated `process.md`.

## 9. Gates (MVP)

Changed 2026-11-18 (decisions 38 and 39). A gate is no longer a block or a connection label, and the gate table of the earlier model is removed.

- **Approval** is a checkbox on the flow (`approval`). On: the process stops for a person at the end of that flow.
- **Checks** are free text on the flow (`checks`). Each is a required, non-blank statement of what must pass, decided by an agent in the flow. A check has no type (`checks` or `diff size`) and no threshold, and no true or false output.
- Nothing is drawn on the arrows between flows; the Pipeline tab has no gate tools.

Gate types are not a fixed set in the model: the approval and the checks are the only two. User-written check commands are not allowed in generated projects; a check is text that the agent reads.

The generator writes the approval and the checks into the flow's command, and `process.md` and the diagram show them. The default placements are in §11. The parser plan (not yet written) changes the schema, the parser and the analyzer to this model.

## 10. Process diagrams (MVP)

The builder is the process diagram. It draws the process from the same `ProjectConfig` the generator uses, so the picture cannot drift from the output. The text below describes the builder built under F-06; its code was removed on 2026-11-16 and is to be rebuilt to decisions 30 and 32.

- **Pipeline tab (to rebuild to `ui.md` §3.2, 2026-11-18):** the flows as boxes in one row, in pipeline order. An arrow is a flow's `next`, set by dragging from its right connection point to the left one of another flow. There is no toolbox, no label and no gate on an arrow. A flow's artifacts, checks and approval are in its properties panel (decision 38). The pipeline's properties sit in a panel to the right of the diagram, shown when nothing is selected.
- **Flow tabs and property panels (to rebuild):** each flow's blocks in order, numbered, with the flow toolbox (Start, Agent, End; Approval and Check are flow properties under decision 38). Move up and Move down reorder the selected block. The property panel shows the selected block's properties (or the flow's, when no block is selected), the file it generates, and a footer with Delete, which asks first. Properties are as §6 and §3 list them.
- **Live marks (to rebuild):** `marks.ts` maps each finding of `pipeline.analyzeStructure` (core, the F-04 rules) to the flow, block or Connection its path names. The pipeline and the flow tabs draw each mark beside its item, with its severity (blocker red, warning amber) and message. Disabled items get no mark. A mark never refuses an edit. A live finding on an item the pipeline does not draw (a flow not linked to another flow, decision 39) is listed under the pipeline diagram with its severity and message (`unplacedMarks`, AC-039). Brief and stack findings name no pipeline item and are not listed.

Builder file list (`source/apps/web/src/builder/`, as of F-06 T023):

| File | Role |
|---|---|
| `PipelineBuilder.tsx` | The component step 3 of the wizard renders. Holds the selected tab and item; binds the views to the edit rules |
| `MapTab.tsx`, `Toolbox.tsx` | The Pipeline tab (React Flow canvas, gate drop on an arrow) and its toolbox (file names kept from F-06; renamed 2026-11-16) |
| `FlowTab.tsx`, `PropertyPanel.tsx`, `PipelinePanel.tsx` | A flow tab; the property panel of a block or flow; the pipeline panel and the gate panel |
| `FormFields.tsx`, `ConfirmDelete.tsx` | Shared form controls; the delete confirmation |
| `map-tab-view.ts`, `tab-view.ts` | Read models of the Pipeline tab and of a flow tab (pure) |
| `map-edit.ts`, `block-edit.ts`, `flow-edit.ts`, `agent-edit.ts`, `pipeline-edit.ts` | Edit rules: gates, blocks, flows, custom agents, the pipeline. Each returns the new configuration or the refusal |
| `entry-checks.ts` | Entry checks that refuse a value the model cannot hold, and the unbounded-retry warning |
| `marks.ts` | Live structural marks from `analyzeStructure`, and the marks no drawn item carries |
| `MarkList.tsx` | The list of marks: drawn beside an item, or under the Pipeline tab |
| `state.ts` | Builder state in memory and the host contract (initial configuration in, changes out) |

Three uses, in order of priority:

1. **Editing:** the Pipeline tab and the flow tabs are the builder's views. Flows, their arrows, artifacts, checks and approval are edited on the Pipeline tab; a flow's blocks on its own tab, with their properties in the property panel.
2. **Client view (post MVP, F-23):** a full-screen presentation mode, showing the Pipeline tab with a plain-language key, for a client conversation. Connections may be hidden there (a view option). The shareable read-only link is post-MVP (F-19); its proposed design carries the configuration in the URL fragment, so the server still stores nothing.
3. **Repository:** a Mermaid flowchart of the same process in the generated `process.md` (F-05), so the process renders on the hosting site.

Miro is not part of the flow. Image export is not planned for the MVP.

## 11. The default pipeline

The default pipeline is the flow of `.claude/commands/pipeline.md`, written as flows, in order. A flow's arguments say whether it runs once or for each feature or task (decision 29).

1. **specify** (flow, for each feature). Agent `specify`: drafts `stories.md`. Its questions are asked by the main session before it starts.
2. **ux** (flow, for each feature). Agent `ux`: draws the screens under `spec/design/features/`, from the stories. Its screens are approved before the plan is written.
3. **plan** (flow, for each feature). Agent `plan`: drafts `plan.md` from the stories and the approved screens.
4. **build** (flow, for each task in `plan.md`). Agent `implement` → Agent `review` → Agent `test` → the build check (a condition) → Agent `commit`. One commit per task, made only after the build check passes (owner decision 2026-11-19, option 2).
5. **verify** (flow, for each feature). Agent `verify`: verify mode, every criterion covered.
6. **complete** (flow, for each feature). Agent `complete`: marks the feature complete and commits its spec folder.

**Note on the flow model (2026-11-18, decision 38).** In the flow model the six flows are linked by `next` (specify → ux → plan → build → verify → complete). The approval is a property of the flow (a checkbox). The checks are conditions inside the flow's blocks (`pipeline-schema.md` §1 and §5), not flow properties, and not gates between flows. The table lists what must pass in each flow:

| Flow | Approval (checkbox, at the end of the flow) | Checks (what must pass; each one a condition in the flow) |
|---|---|---|
| specify | on: the user approves the stories | — |
| ux | on: the user approves the screens | — |
| plan | on: the user approves the plan | — |
| build | off | the review reports no blocker or warning; the test check passes; the staged change is at most 400 lines; the build check passes before the task is committed |
| verify | on: the user approves the manual checklist results | — |
| complete | off | — |

The 400-line limit becomes text in a check. The routes that sent a failed check back to an earlier block (to `implement`, `specify`, `ux`, `plan` or `verify`) have no place in the flow model. Resolved 2026-11-19 by the owner: a condition's false route may be a retry to an earlier agent with a round limit, or a stop. Schema §1 and decision 40 agree; the default pipeline uses the stop. The data file `source/templates/pipeline/default.json` follows the final schema in `spec/documents/pipeline-schema.md` (2026-11-19), and decisions 38 to 41 govern this flow model.

The pipeline's arguments include `feature-id` (required), set in the pipeline's properties panel. The pipeline has no release flow. A release flow can be added by the user. Presets (F-09) are other starting pipelines; the default is the first.

## 12. Structural rules (the structural checks, F-03)

As built, the rules run in `analyzeStructure` (`source/packages/core/src/pipeline/analyze/`). The rule modules run in one fixed order, and the findings come back sorted in document order. The rules that F-02 already checks reuse its functions in `check/` (flow and block links, the route `to` checks, ids, rule tags), so each of those rules has one implementation; the other rules are written in the `analyze/` modules. The function is pure. Its callers (the analyzer in `source/apps/api` and the builder marks) are not wired yet.

The rules marked **(38)** and **(39)** are the rules of the flow model (decisions 38 and 39, 2026-11-18). The other rules are the block-level rules of the model in use until the parser plan replaces them; they are listed here so the analyzer's rules stay in one place until then.

**Flow model (2026-11-18):**
- **(38)** The pipeline is linear: a flow has at most one `next`. A `next` that closes a loop, or points a flow to itself, is a structural problem. The builder refuses it, so the rule is a safety net for a file that reaches the analyzer.
- **(39)** A flow requires a name and a body. Its description and arguments are optional. Each outcome artifact requires a one-line, non-blank label; each check requires non-blank text.
- **(39)** A flow must be connected: it has an incoming or an outgoing `next`, unless the pipeline has one flow. A flow with neither is a blocker at the flow's path.
- **(38)** Every flow is reachable from the pipeline's first flow along the `next` links. The first flow is the first flow, in pipeline order, that no other flow's `next` points to. A chain that loops stops at a flow already reached. A pipeline with no such flow gives no finding here; the start and link rules report it. (The block rule below is the same idea at the block level, from each flow's Start.)
- **(38)** A flow whose command file name is `pipeline` is a blocker (decision 35); ids are unique and file-safe (decision 18).
- **(F-16, AC-014)** A flow whose name gives an empty command file name (no letter or digit) is a blocker at the flow's name. A blank name is already refused by the flow-name rule, so it is not reported twice.
- **(F-16, AC-015)** Two flows whose names give the same command file name is a blocker at the later flow's name, since one path would be written twice.

**Block model (in use until the parser plan):**
- The pipeline model has no blocks of its own (decision 30): its Start is the Start of the first flow, in pipeline order. Each flow has exactly one Start and at least one End. The pipeline has at least one flow.
- Only the pipeline contains flows; a flow contains no flow (one nesting level).
- Every Connection joins two blocks of the same flow, or two flows of the pipeline.
- No cycle: the Connections of a flow, and the Connections of the pipeline, form no cycle. A back route is a Check's retry, not a Connection. A Connection that closes a cycle is a structural problem (F-06 amendment 6).
- Both outputs of every Check are wired.
- Every block is reachable from its flow's Start (the first Start, when a flow has two). A flow with no Start is skipped here, since the Start rule reports it.
- A back route (a condition's route with a `roundLimit`) goes to an earlier agent of the same flow; a back route never leaves its flow. The pipeline has no back route: a `next` that leads back to a flow already in the chain is refused (decision 38).
- Every Agent block has a name that is file-safe and unique in the project, and a description.
- Argument names are unique.
- A flow whose command file name is `pipeline` is a blocker at the flow's path, because its command file would be `.claude/commands/pipeline.md`, the same file as the pipeline command (decision 35).
- A back route (a retry) with no round limit is a blocker at its `to` path, as F-02 already refuses it (owner decision, 2026-11-19). The analysis and the parser then agree.
- Every block and flow is checked. No block or flow can be switched off (decision 34).
