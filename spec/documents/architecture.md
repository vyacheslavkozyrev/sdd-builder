# SDDBuilder — Architecture

Status: proposed. Technology choices in §5 are proposals to confirm before the first feature starts. The process model (commands and blocks, updated 2026-11-14) is in `building-blocks.md`; this document describes how it is built and generated.

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
| `source/apps/web` | The project wizard, four steps in order: step 1 project name and idea (F-05), step 2 technical details and code rules (F-21), step 3 workflow, which hosts the builder on its Map tab (F-05 hosts it, F-06 builds it), and step 4 analyze and generate (F-22). F-05 also owns the frame (Back and Next, the stepper that is not clickable) and the web app's privacy rules (no storage or console calls, no provider key in the source). The privacy notice with its checkbox sits on step 4 and is built by F-22. Presentation mode (F-18) is in the same app. Holds state in browser memory only (no `localStorage`, `sessionStorage` or `indexedDB`, decision 13). | `core` (types only) |

Dependency direction: `web → core`, `api → core`, `core → templates` (read at build time). Nothing depends on `web` or `api`. The LLM is called only from `source/apps/api`.

## 2. Data flow

1. The user edits the pipeline on the map and the brief in the browser. The state is one `ProjectConfig` (see `source/packages/core/src/model.ts`).
2. `POST /analyze` with the config:
   1. `core` runs the structural checks (instant, no cost). These include the rules in `building-blocks.md` §7.
   2. `source/apps/api` sends the brief and the process to the LLM with a fixed review prompt, and asks for output in the `AnalysisFinding` shape.
   3. The API validates the model output against the schema. Invalid output is dropped and counted, not shown.
   4. The response is `{ findings, review: { status, findings, dropped } }`: the structural findings, and the valid model findings under `review`. If the LLM step fails, `review.status` is `failed` with no review findings, and the structural findings are still returned. Budget limits are F-13. The request body is the `ProjectConfig` itself. A body that is not a valid `ProjectConfig` gets 400; a valid config gets 200 even when the model fails.
3. `POST /generate` with the pipeline config (`schemaVersion` 2, the same body as `/analyze`) returns a zip. `source/apps/api` refuses a configuration that `core` finds problems in with 422, before any model call. `core` builds the generation input from the config (the block descriptions, the process and the template layout). `source/apps/api` makes one model call for the whole plan, which writes every planned file: the base files (`CLAUDE.md`, `spec/documents/process.md`, the spec template) and the final command, agent and rule files; `core` then checks the reply (§3). A failed reply gets one retry. Nothing is stored on the server.
4. The MVP keeps the config in the browser session only. Save, import and export are post-MVP (F-08).

Findings never change the configuration. The user decides what to apply.

## 3. Generation model

- **Input:** `ProjectConfig` plus the default pipeline (the catalog of commands and blocks, `building-blocks.md` §4).
- **Step 1, check:** the structural rules. A configuration that fails them is refused with every problem listed (F-02, `InvalidConfigError`).
- **Step 2, select:** enabled flows and blocks, in pipeline order and in each flow's block order. Required blocks and gates are always present.
- **Step 3, render base files:** project instructions (`CLAUDE.md`), spec templates, `process.md` (text listing the flows, blocks and gates; the Mermaid view is F-18), placeholder values.
- **Step 4, render per flow:** the pipeline command file `pipeline.md` (its arguments, its flows in order, and the gates and checks between them), and one command file per child flow, with its Agent calls and its conditions as numbered rules, with their round limits (or "no limit set").
- **Step 5, write per file (LLM):** the LLM writes the content of each command and agent file, from its description and its template, and the rule files they carry. `core` fixes the file path and the place of each file in the output.
- **Step 6, check:** `core` checks what the model returned. Every file path must be one `core` expects, no placeholder may be left in the text, and every path mentioned in a generated file must exist in the output (F-10). The checks a reply must pass are set in F-03 (see below); the retry for a reply that fails them is made by `source/apps/api` (F-07).

Two pure functions in `source/packages/core` serve steps 5 and 6 (F-03), exported in the `pipeline` namespace: `pipeline.planGeneration` gives step 5 its input, and `pipeline.checkReply` is step 6.

- **`pipeline.planGeneration(config, templates)`** returns one entry per output file, in the order of the file list: its path, its rendered layout, its description (a block's or a flow's `description`, or empty) and its rule-set tags (agents and flows).
- **`pipeline.checkReply(plan, reply)`** checks the model's reply against the plan: each planned file is present, no extra file is returned, no path is unsafe, no placeholder or step marker is left, each required `##` heading of a Markdown output is present, and no file mentions SDDBuilder or its own paths (`source/apps/web`, `source/apps/api`, `source/packages/core`). It returns the findings sorted by path, then by message.

The model call and the one-retry rule live in `source/apps/api` (F-07), not in `core`.

`/generate` makes one model call for the whole plan. The reply must be one JSON object mapping each planned path to its text; it goes through `parseReply` (`source/apps/api/src/generate/parse-reply.ts`) and `pipeline.checkReply`. If either fails, one retry is made with the findings in the prompt. A second failure returns the findings and paths only, never file text. A provider error is not retried.

The zip is named `sddbuilder-project.zip` (`application/zip`, `Content-Disposition: attachment`). It holds file entries only, in plan order, DEFLATE-compressed, each stamped with the fixed date 2020-01-01 00:00 UTC, so the same files give the same bytes.

Status codes of `/generate`: 200 zip; 400 invalid JSON or a body that is not a `ProjectConfig`; 422 configuration refused (every problem listed, no model call); 502 model call failed, or the reply failed the checks twice; 503 generation model not configured; 500 unexpected error (generic message). Unknown paths give 404; any other method on `/analyze` or `/generate` gives 405 with `Allow: POST`.

The file list, paths and order are deterministic: the same config gives the same set of files. The wording of LLM-written content may differ between runs. Tests use a fake model with fixed replies, so they stay deterministic.

## 4. LLM analysis

| Concern | Decision |
|---|---|
| Provider | Anthropic API |
| Model | A Claude Sonnet model, set by the `SDDBUILDER_ANALYZER_MODEL` environment variable. The analyzer default is `claude-sonnet-5-5`, used when the variable is not set. |
| Key | `ANTHROPIC_API_KEY`, server environment only. Never sent to the browser, never logged. |
| Environment | `ANTHROPIC_API_KEY` (server only); `SDDBUILDER_ANALYZER_MODEL` (model for analysis and generation, default `claude-sonnet-5-5`); `PORT` (listen port, default 3000; a value that is not a whole number from 1 to 65535 stops startup). |
| Input | Analysis: `/analyze` takes the pipeline config (`schemaVersion` 2) and reads it with `parsePipelineConfig` from its own reader. A body that is not JSON is a 400 with an error only; a body that fails the parse is a 400 with `<path>: <reason>` problems, and a problem may name an unknown key the client sent. The caps are checked after the parse, before any model call: the idea at most 8,000 characters and at most 60 rules (the pipeline caps; the flat module cap does not apply); a cap refusal is a 422 with `<path>: <reason>` problems (decision 12). `/generate` takes the same pipeline config (decision 23). Generation: the block descriptions, the process and the template layout, with a size cap (F-13). |
| Output | JSON in the `AnalysisFinding` shape, validated server-side. The analysis result is `{ findings, review: { status, findings, dropped } }`. `findings` are the structural findings from `pipeline.analyzeStructure` in `core`: the refusals of the generator's pipeline checks are blockers, reachability among them; retry round limits and iteration sources are warnings; brief checks give a blocker for a blank `name`, `idea` or `stack.language`, and warnings for a blank optional stack field and an empty `rules` list. `review.status` is `ok`, `failed` or `skipped` (decision 12). The review reply is checked by `pipeline.checkReview`: a reply that is not an array fails; an entry is kept only with a known severity and a non-blank `subject` and `message`; a model `blocker` is kept as `warning`. `review.findings` are the kept entries and `review.dropped` counts the others. Structural findings are returned even when the review fails. |
| Failure | No model (a missing `ANTHROPIC_API_KEY`; the log line names the cause, never the value), or a thrown error from the model call (a timeout of 60 s per attempt on the SDK client, the SDK retries twice by default; a provider error), a reply cut short at `max_tokens` (`stop_reason`; the reply is not parsed), a reply that is not JSON, or a reply that is not a JSON array → `review.status` is `failed` with no review findings; the structural findings are still returned. Invalid single findings are dropped, not a failure. At the daily review ceiling `/analyze` answers 200 with `review.status` `skipped` and the structural findings only; the model is not called (decision 12). Per-client limits and the budget are F-13. |
| Generation call | One call per `/generate`, for the whole plan. `max_tokens` 32000 (`GENERATION_MAX_TOKENS`); client timeout 300 s (`GENERATION_TIMEOUT_MS`, not the review's 60 s). A timeout or provider error fails after that call; the SDK's own retries apply inside the adapter. The retry for a bad reply is in §3. |
| Privacy | The browser shows a notice before analysis: the brief is sent to the model provider. The server does not store or log brief content. |

## 5. Technology (proposed)

| Concern | Proposal | Why |
|---|---|---|
| Language | TypeScript, strict | Matches the existing ComEd backend; shared types between web and API |
| Monorepo | npm workspaces | No extra tool needed for three packages |
| Web | Vite + React for `source/apps/web`; the Vite dev server forwards `/analyze` to `source/apps/api` | Standard, small, static build. Decided 2026-11-13 (F-05) |
| Diagrams (Map tab) | React Flow, `@xyflow/react` 12.x (the 12 line; 13 is not used), in `source/apps/web` only | Renders nodes and connectors with drag and pointer connect for the Map tab (F-06) and the presentation and process diagrams (F-18). Decided 2026-11-13 (F-06) |
| Builder state (Map tab, flow tabs) | Plain TypeScript in `source/apps/web/src/builder/`: an in-memory view-model over `ProjectConfig.pipeline`, with the live marks from `pipeline.analyzeStructure` in `core`. No storage, no network call. Decided 2026-11-15 (F-06, decision 24) | Keeps the edit rules testable with Vitest, as the web tests of §5 require, and keeps the rules in one place: the analyzer |
| API | Hono 4.13.14 with `@hono/node-server` 2.1.5 (peer `hono` `^4 \|\| ^5.0.0-0`, we pin 4.x) on Node | Small surface: two endpoints; Web-standard `Request`/`Response`, so routes test without a network port. Decided 2026-11-12 (F-07) |
| LLM SDK | Official Anthropic TypeScript SDK | First-party, typed |
| Zip | JSZip 3.10.2, in memory | Works in memory for project-sized output; ships its own types. Decided 2026-11-12 (F-07) |
| Tests | Vitest. For `source/apps/web` it runs logic tests only: no DOM or browser test library (no jsdom, Testing Library or Playwright in the MVP) | Same family as the ComEd backend tests. Decided 2026-11-13 (F-05) |
| Default pipeline data | `source/templates/pipeline/default.json` is imported by `source/packages/core` at build time (`resolveJsonModule`, `source/templates/` in its include path). Core reads no file at run time. Decided 2026-11-14 (F-01) | Keeps core pure (no file system) and the default process as data (decision 1) |
| Config format | `ProjectConfig` carries `schemaVersion: 2`; the parser refuses any other value. Decided 2026-11-14 (F-01) | One version check for the API, the JSON load and the later import (F-08) |

No database, no user authentication, no queue in the MVP. Rate limiting is per client address and in memory; the spending ceiling is a configured daily limit.

Abuse and cost settings (F-13, decision 12): environment variables `SDDBUILDER_REVIEW_DAILY_LIMIT` (default 500) and `SDDBUILDER_GENERATE_DAILY_LIMIT` (default 50), read once at startup. Both are whole numbers of 0 or more; an invalid value stops startup and the error names the variable only. `ANTHROPIC_API_KEY` stays in the server environment only. Review calls use `max_tokens` 8192 and a 60-second timeout; generation calls use `max_tokens` 32000 and a 300-second timeout. Limiter and counter state is in memory and resets on restart.

## 6. Decisions

1. **The process is data, not code.** Commands, blocks, conditions and the map are JSON in `ProjectConfig`; the templates are text files. Adding a block kind means changing the model and the templates, not the generator's logic for the others.
2. **The server is stateless.** No projects, no accounts, no stored briefs. Each request is self-contained.
3. **Structure is enforced in the model,** not only in the UI. A required block cannot be removed through the API, and a configuration that breaks the workflow rules is refused.
4. **Claude Code is the only target in the MVP.** Spec Kit and OpenSpec outputs are planned right after it (§8). Cursor and Copilot are later. Gaps between formats are stated rather than invented.
5. **Generated projects follow the reference layout** (`CLAUDE.md`, `spec/documents`, `spec/specifications/F-XX-*`, `.claude/`), so a project set up here can be run with the same commands as ComEd and PhotoSync. The `.claude/` folder of this repository is the development environment and is not generated: a generated project gets the pipeline command and the agents of its blocks only.
6. **The LLM advises, the structure decides.** Structural checks are authoritative. LLM findings are labelled as advice and never applied automatically.
7. **The LLM writes the final framework at generation, from the block descriptions.** Each block carries a high-level description of what it should do. At `/generate` the LLM turns the built commands into the final command, agent and rule files. `core` fixes the file list, paths, block order, gates and branches, and checks the reply before it reaches the zip. This replaces the earlier rule that generation is template-only with no LLM. Recorded 2026-11-11, confirmed by the user. Templates hold the layout and the block descriptions the LLM works from, not final content.
8. **Custom blocks are data, optional, and never required.** A custom block is an agent with a name, a description and a body, placed in a flow. Its id must not clash with another id. Required blocks come only from the default pipeline.
9. **One level of nesting, and no cycles.** The pipeline contains flows; a flow contains blocks only. Blocks run in order; a retry goes back to an earlier block of the same flow (in the pipeline, a gate may go back to an earlier flow). An Agent block runs an agent, never a flow.
10. **One analysis shape, refusals are blockers, and LLM findings are advice.** `analyzePipeline(config, model, log)` in `source/apps/api/src/analyze.ts` returns `{ findings, review: { status, findings, dropped } }` for the pipeline model. `findings` are the structural findings from `pipeline.analyzeStructure` in `source/packages/core/src/pipeline/analyze/`. `review` is the LLM part from `source/apps/api`: `status` is `ok`, `failed` or `skipped` (`skipped` when the daily review ceiling is reached, decision 12; the route then answers with `pipeline.skippedAnalysis` and the model is not called), `findings` are the valid model findings, and `dropped` counts model findings that failed the reply check. The problems that make `generate()` refuse a configuration (the generator's pipeline refusal checks, `configProblems`) appear as blocker findings in the analysis, so the analysis reports the same problems `generate()` refuses. Structural severities: a refusal, including an unreachable block, is a blocker; a retry with no round limit is a warning; an agent that repeats over a task or feature scope with no iteration source is a warning (in the first flow, the pipeline Start's declared arguments count as a source); a brief missing a required field (`name`, `idea`, `stack.language`) is a blocker; a blank optional stack field and an empty `rules` list are warnings. LLM findings are advice: a model finding with severity `blocker` is kept as `warning`, and model output is never applied automatically. Recorded 2026-11-12, before the analyzer code (F-04). Updated 2026-11-15 (F-04).
11. **Generation makes one model call for the whole plan, with one retry, and returns a zip.** `/generate` takes the `ProjectConfig` itself as the request body (no wrapper). After `validateConfig` and `planGeneration`, the API makes one model call whose reply is one JSON object mapping each planned path to its text. The reply goes through `parseReply` and `checkReply`. If either fails, the API makes exactly one retry whose prompt lists the first findings. A second failure returns the findings and paths only, never file text. F-07 does not retry provider errors: a model that throws, times out or is rate-limited fails after one call, and the Anthropic SDK's own retries stay inside the adapter. Status codes: 400 for bad input (invalid JSON or a `ProjectConfig` that does not parse), 422 for a configuration refused by `validateConfig` (every problem listed), 502 for a provider error on the first call (no retry) or a reply that fails the check on both calls (with `problems`), 503 when the generation model is not configured, 500 for an unexpected error (generic message, no exception text), 200 for the zip. Unknown paths return 404, and a `GET` on either route returns 405 with `Allow: POST`. The zip is served as `application/zip` with `Content-Disposition: attachment; filename="sddbuilder-project.zip"`, a fixed name. No file is written during a request. The generation call sets `GENERATION_MAX_TOKENS` to 32000 (starting value, to be checked once a product runs end to end) and a client timeout of `GENERATION_TIMEOUT_MS` (300 seconds): a whole-plan reply takes minutes, unlike the 60 seconds of the review. Recorded 2026-11-12, before the generation code (F-07). Note 2026-11-15 (F-07): the body is the `schemaVersion` 2 pipeline config, not the flat `ProjectConfig` (decision 23), and the checks named above are `pipeline.configProblems` and `pipeline.planGeneration`; the flat `validateConfig` and `planGeneration` are removed.
12. **Abuse and cost limits are fixed, in memory, and checked before any model call.** Limits are per client address, taken from the connection's remote address; a forwarded-address header from the request is ignored. Per client: 10 accepted requests per minute and 100 per UTC day, as fixed windows. A refusal is 429 with `Retry-After` in whole seconds and the error body. `/analyze` and `/generate` share one count. Only accepted requests count; 404 and 405 do not count, and neither do requests refused by a limit or an input cap. Input caps, checked on both routes before any model call: the idea text at most 8,000 characters (counted in code points, a surrogate pair counts as one character; as submitted, no trimming), and at most 60 rule blocks. A cap refusal is 422 and lists every exceeded cap as `<path>: <reason>`, never submitted text. Daily ceilings per UTC day, counted when a model call is made (a failed call still counts): review 500 (`SDDBUILDER_REVIEW_DAILY_LIMIT`); at the ceiling `/analyze` answers 200 with review `skipped` and structural findings only, and the model is not called. Generation 50 (`SDDBUILDER_GENERATE_DAILY_LIMIT`); at the ceiling `/generate` answers 429 with the error body. A configuration refused by `validateConfig` on `/generate` answers 422 before the generation ceiling is checked, so it does not count. A review reply that stops at `max_tokens` counts as `failed`. Log lines for refusals carry the event, route and status only. Behind a shared proxy all clients share one address, which is accepted for the MVP. Recorded 2026-11-13, before the limiter code (F-13).
13. **The brief form is a Vite + React app with logic tested apart from the UI.** `source/apps/web` is built with Vite and React. Its state, configuration building, validation, gate, request and result view-model live in plain TypeScript modules under `source/apps/web/src/` and are tested with Vitest; the React components only bind them, and no DOM or browser test library is used in the MVP. The Vite dev server forwards `/analyze` to `source/apps/api`, so the browser calls one origin. The brief has a Project name field that maps to `name` (required, a blocker when blank, as in decision 10). The browser keeps the brief in React memory only: no `localStorage`, `sessionStorage` or `indexedDB`. Recorded 2026-11-13, before the web code (F-05).

14. **Commands and blocks (2026-11-14).** The pipeline is the top-level flow and contains child flows; a flow contains blocks: Start, Agent (runs an agent; scope set on the block), Condition (a fixed check type, pass and fail routes, an optional round limit; it can sit between flows as a gate or check), Connection (a runs-after link with an artifact label) and End. Only the pipeline contains flows. Skills and scripts are not block kinds in the MVP. The pipeline is shown on the Map tab. Recorded in `building-blocks.md`, confirmed by the owner.
15. **The brief is a four-step wizard (2026-11-14).** Project name and idea; technical details (architecture style, tech stack, and code rules as rule blocks, each becoming one Markdown file in `.claude/rules/`; no module list); workflow (the command builder, §10); analyze and generate. There is no Brief / Builder switch. Confirmed by the owner.
16. **The config is versioned, with one pipeline per project (2026-11-14).** `ProjectConfig` carries `schemaVersion: 2` and one `pipeline`. The parser refuses any other schema version. Several pipelines per project are not in the MVP. Recorded 2026-11-14, F-01.
17. **The default pipeline is data, imported at build time (2026-11-14).** The six flows, their blocks and the gates between them live in `source/templates/pipeline/default.json`. `source/packages/core` imports the file when it is built and never reads files at run time, so core stays free of file system code. Changing the default process means changing the JSON; a test checks that the default still parses without problems. Recorded 2026-11-14, F-01.
18. **Ids are user-given, file-safe and unique in the project (2026-11-14).** An id uses lowercase letters, digits and hyphens, starts with a letter, and is unique in the project across flows, blocks and arguments; an agent name is unique among agents. An id that breaks the rule, or clashes with another, is refused with its path. Agent names are file names, so the rule keeps them safe in file names and links. Recorded 2026-11-14, F-01.
19. **The new model is built beside the flat model until each consumer is rebuilt (2026-11-14).** The pipeline model lives in `source/packages/core/src/pipeline/`, beside the flat model (`model.ts`, `catalog.ts`, `parse-config.ts`) that `core` and the apps still use. F-01 removes no flat code. Each later feature rebuilds the consumers it touches on the new model and removes the flat code it replaces in the same task, so the build stays green at every step. A flat file is removed by the feature that rebuilds its last consumer. Recorded 2026-11-14, F-01. Note 2026-11-15 (F-07): F-07 removed the flat generator and the flat templates: the flat generation service, prompt, planning and reply check, the flat `src/generate.ts`, `plan.ts`, `reply-check.ts`, `select.ts` and `file-list.ts`, the flat `src/validate/`, the flat `src/render/` files except `render/mermaid.ts` (kept for F-18), and the flat template folders `flat/`, `rules/`, `workflows/` and `steps/`. The pipeline files `source/apps/api/src/generate/service.ts` and `prompt.ts` keep the names of the removed flat files; they hold the pipeline versions now. The flat model files (`model.ts`, `catalog.ts`, `parse-config.ts`) stay until F-05 rebuilds the web app.
20. **Rules are a list in the project config (2026-11-14).** `ProjectConfig` gains a `rules` list of entries with `id`, `title` and `text`. Each entry becomes `.claude/rules/<id>.md`, with the rule's title and text as its content. The pipeline model has no rule block kind: rules are project data, not blocks, so the five block kinds of decision 14 stay. F-05 fills the list from the wizard's technical details step. Recorded 2026-11-14, F-02.

21. **Rule-set tags are rule ids (2026-11-14).** An Agent block and a flow carry `ruleTags`: a list of ids of entries in `ProjectConfig.rules`, empty when the key is absent. A tag that names no rule is refused as a blocker at the tag's path, as an unknown id is. The tags reach the agent and flow command entries of the plan (`planGeneration`), so the model writes each file knowing which rule files apply. Recorded 2026-11-14, F-03 (Amendment of 2026-11-14 in the F-03 progress record).

22. **The pipeline module is exposed as a namespace, and the pipeline analysis lives beside the flat one (2026-11-14).** The root of `source/packages/core` exports the pipeline module as the namespace `pipeline` (`export * as pipeline from './pipeline/index.js'`), so its names (`ProjectConfig`, `Scope`, `planGeneration`, `checkReply`, and the rest) do not collide with the flat model's names. The pipeline analysis (structural findings, review reply check, input caps, skipped analysis) lives in `source/packages/core/src/pipeline/analyze/` and `source/packages/core/src/pipeline/caps.ts`. The flat analyzer (`source/packages/core/src/analyze/`) is removed in F-04, when `/analyze` is rewired to the pipeline model (decision 19). `/generate` keeps the flat model until F-07. Recorded 2026-11-14, F-04. Note 2026-11-15 (F-07): `/generate` is on the pipeline model now (decision 23), and the root no longer exports the flat `generate`, `planGeneration`, `checkReply`, `finishFileList` or `validateConfig`. `generate`, `planGeneration` and `checkReply` are reached through `pipeline.` only; `finishFileList` and `validateConfig` are removed.
23. **`/generate` takes the pipeline config only, and the flat generator goes (2026-11-15).** `/generate` takes the `schemaVersion` 2 pipeline config, like `/analyze`. A flat `schemaVersion` 1 body is refused with 400, so no client depends on the flat shape. The flat generator is removed in F-07 (decision 19): its route, its flat planning and reply check, and its flat template layouts go in the same feature. The flat model stays only where the web app still imports it, until F-05 rebuilds the app. A duplicate output path is a server error, not a refusal: the pipeline generator (`source/packages/core/src/pipeline/generate/`, F-02) throws `GenerationError` for two files with one path, and the route reports it as an unexpected error with the generic 500 message, because a duplicate is a bug in the pipeline code, not a fault in the user's configuration. Limits, retries and status codes are not re-decided here (§3, decisions 11 and 12). Recorded 2026-11-15, F-07.

24. **The visual builder is a view-model over the pipeline config, and the live marks reuse the analyzer's rules (2026-11-15, F-06; drawn by F-06 T023, amendment 16).** The builder's state and edit rules live in `source/apps/web/src/builder/` as plain TypeScript over `ProjectConfig.pipeline`. The state holds the configuration in memory and reports it to its host after each change; no `fetch`, XHR or WebSocket call is made from that folder. The live marks on the Map and the flow tabs call `pipeline.analyzeStructure` from `source/packages/core` (F-04) and never refuse an edit; entry checks refuse only a value the model cannot hold (an id, a number, a body over its cap). No rule module is built in F-06. `review` is no longer a check type (`building-blocks.md` decision 8, §3 and §4; §9 here): the review is an Agent block followed by a `checks` Condition. F-06 depends on F-01 and F-04. The flat builder and the flat model are removed in F-06 T021, after F-05 T001 to T015 are committed (decision 19), and only the flat code with no remaining consumer goes; a remaining consumer stops that task. Recorded 2026-11-15, F-06.

25. **Every Condition has a description in the model (F-06 amendment 1, 2026-11-15).** The description says what passing means, and the generator writes the flow's rule text from it. The parser refuses a missing or blank description on any Condition. Before this decision the field was in building-blocks §3 but not in the model.

26. **Agent blocks and the pipeline carry model, tools and body (F-06 amendment 4, 2026-11-16).** An Agent block takes an optional model (`haiku`, `sonnet`, `opus`, `inherit`), an optional list of tool names and an optional body. The pipeline takes the same three, and its description and rule tags. The parser checks their shape; the generator writes them into the agent file frontmatter and body, and into the pipeline command. The body length cap (4,000 characters) is an entry check in the builder (F-06 AC-030), not a parse rule. Before this decision the fields were in building-blocks §3 but not in the model.

27. **Agent blocks carry reads and writes (F-06 amendment 9, 2026-11-16).** An Agent block takes optional `reads` and `writes` lists of artifact names (non-blank text, no duplicates). The parser checks them; the Agent panel shows them. They are the artifacts an agent reads and writes, as building-blocks §3 lists. Before this decision the fields were in building-blocks §3 but not in the model.

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

A gate is a Condition whose fail output stops the process. Gates sit between blocks of a flow, or on a connection between two flows of the pipeline.

Gate types are a fixed set. User-written check commands are not allowed in generated projects.

| Gate | Passes when | Default placement |
|---|---|---|
| `approval` | the user approves the output | after `specify`, `plan` and `ux` in the pipeline |
| `checks` | the check named in its description passes; after the review Agent in `build`, the description is "the review reports no blocker or warning" (`review` is no longer a gate type, 2026-11-15, F-06) | after the review Agent and after the test Agent in `build`; in `verify` |
| `diff-size` | the staged change is at most N lines | before the commit Agent in `build` (N = 400 in the references) |

The user may change thresholds and where a gate sits, and add or remove optional gates. Required blocks keep their required gates. Gates are data: the generator writes them into the command and into `process.md`, and the diagrams show them.

## 10. Process diagrams (MVP)

The builder is the process diagram. It draws the process from the same `ProjectConfig` the generator uses, so the picture cannot drift from the output (`building-blocks.md`).

- **Map tab (built, F-06):** the pipeline as one diagram of its child flows in order, drawn with React Flow (§5). The tab row holds Map, one tab per flow in order, and a + that adds a flow after the last tab. A flow is a node with its name, its scope (the one scope of its enabled Agent blocks, `mixed` when they differ, `no agent` when it has none) and its block count, which counts switched-off blocks too. A Connection between two flows is an edge with its artifact label; a gate or check on it is a diamond with its pass and fail outputs. The Map toolbox (left of the diagram) holds Connection, Approval and Check; an Approval or a Check is dragged onto a connection, and a connection takes one gate at most. The pipeline's properties sit in a panel to the right of the diagram, shown when nothing is selected; a selected gate or check opens its own panel with its description, fail route and round limit; a `diff-size` check also takes a threshold.
- **Flow tabs and property panels (built, F-06):** each flow's blocks in order, numbered, with the flow toolbox (Start, Agent, Condition, Connection, End). The Connections between blocks are listed in a section below the numbered boxes. Move up and Move down reorder the selected block. The property panel shows the selected block's properties (or the flow's, when no block is selected), the file it generates, its rule tags, and the footer with Switch off and Delete; Delete asks for confirmation first. An unbounded retry shows a warning beside it. Properties are as `building-blocks.md` §2 and §3 list them.
- **Live marks (built, F-06 T013 and T023):** `marks.ts` maps each finding of `pipeline.analyzeStructure` (core, the F-04 rules) to the flow, block or Connection its path names. The Map and the flow tabs draw each mark beside its item, with its severity (blocker red, warning amber) and message. Disabled items get no mark. A mark never refuses an edit. A live finding on an item the Map does not draw (a Connection that does not join two flows) is listed under the diagram with its severity and message (`unplacedMarks`, AC-039). Brief and stack findings name no pipeline item and are not listed.

Builder file list (`source/apps/web/src/builder/`, as of F-06 T023):

| File | Role |
|---|---|
| `PipelineBuilder.tsx` | The component step 3 of the wizard renders. Holds the selected tab and item; binds the views to the edit rules |
| `MapTab.tsx`, `Toolbox.tsx` | The Map tab (React Flow canvas, gate drop on an arrow) and the Map toolbox |
| `FlowTab.tsx`, `PropertyPanel.tsx`, `PipelinePanel.tsx` | A flow tab; the property panel of a block or flow; the pipeline panel and the gate panel |
| `FormFields.tsx`, `ConfirmDelete.tsx` | Shared form controls; the delete confirmation |
| `map-tab-view.ts`, `tab-view.ts` | Read models of the Map tab and of a flow tab (pure) |
| `map-edit.ts`, `block-edit.ts`, `flow-edit.ts`, `agent-edit.ts`, `pipeline-edit.ts` | Edit rules: gates, blocks, flows, custom agents, the pipeline. Each returns the new configuration or the refusal |
| `entry-checks.ts` | Entry checks that refuse a value the model cannot hold, and the unbounded-retry warning |
| `marks.ts` | Live structural marks from `analyzeStructure`, and the marks no drawn item carries |
| `MarkList.tsx` | The list of marks: drawn beside an item, or under the Map |
| `state.ts` | Builder state in memory and the host contract (initial configuration in, changes out) |

Three uses, in order of priority:

1. **Editing:** the Map tab and the flow tabs are the builder's views. Flows, gates, checks and connections between flows are edited on the Map tab; a flow's blocks on its own tab, with their properties in the property panel.
2. **Client view (MVP):** a full-screen presentation mode, showing the Map tab with a plain-language key, for a client conversation. Connections may be hidden there (a view option). The shareable read-only link is post-MVP (F-19); its proposed design carries the configuration in the URL fragment, so the server still stores nothing.
3. **Repository:** a Mermaid flowchart of the same process in the generated `process.md`, so the process renders on the hosting site.

Miro is not part of the flow. Image export is not planned for the MVP.
