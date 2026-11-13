# SDDBuilder — Architecture

Status: proposed. Technology choices in §5 are proposals to confirm before the first feature starts. The process model is in `building-blocks.md`; this document describes how it is built and generated.

## 1. Components

```
┌────────────────────────────┐   ProjectConfig (JSON)   ┌───────────────────────────────┐
│ apps/web                   │ ───────────────────────▶ │ apps/api                      │
│ global map, workflow tabs, │                          │ POST /analyze                 │──▶ LLM API
│ brief form, presentation   │ ◀─────────────────────── │ POST /generate → zip          │   (server-side only)
│ state in the browser only  │   findings, zip          └──────────────┬────────────────┘
└────────────────────────────┘                                          │ uses
                                                       ┌────────────────▼──────────────┐
                                                       │ packages/core                 │
                                                       │ model, step catalog,          │
                                                       │ structural checks, generator  │
                                                       │ (pure, no I/O)                │
                                                       └────────────────┬──────────────┘
                                                                        │ reads
                                                       ┌────────────────▼──────────────┐
                                                       │ templates/                    │
                                                       │ Claude Code layout            │
                                                       └───────────────────────────────┘
```

| Module | Responsibility | Depends on |
|---|---|---|
| `packages/core` | Domain types (workflows, steps, gates, branches, map), step catalog, structural checks, file-tree generation. No I/O, no HTTP, no UI, no LLM calls. | nothing |
| `templates/` | Text templates with `{{placeholders}}`, Claude Code layout. Data, not code. | — |
| `apps/api` | HTTP routing, request validation, LLM review, rate and cost limits, zip packaging. Stateless. | `core` |
| `apps/web` | Global map, workflow tabs, brief form, presentation mode, privacy notice before analysis. Holds state in the browser session only. | `core` (types only) |

Dependency direction: `web → core`, `api → core`, `core → templates` (read at build time). Nothing depends on `web` or `api`. The LLM is called only from `apps/api`.

## 2. Data flow

1. The user edits the global map, the workflow tabs and the brief in the browser. The state is one `ProjectConfig` (see `packages/core/src/model.ts`).
2. `POST /analyze` with the config:
   1. `core` runs the structural checks (instant, no cost). These include the workflow rules in `building-blocks.md` §1 and §3.
   2. `apps/api` sends the brief and the process to the LLM with a fixed review prompt, and asks for output in the `AnalysisFinding` shape.
   3. The API validates the model output against the schema. Invalid output is dropped and counted, not shown.
   4. The response is `{ findings, review: { status, findings, dropped } }`: the structural findings, and the valid model findings under `review`. If the LLM step fails, `review.status` is `failed` with no review findings, and the structural findings are still returned. Budget limits are F-13. The request body is the `ProjectConfig` itself. A body that is not a valid `ProjectConfig` gets 400; a valid config gets 200 even when the model fails.
3. `POST /generate` with the `ProjectConfig` as the body returns a zip. `core` builds the generation input from the config (the block descriptions, the process and the template layout). `apps/api` makes one model call for the whole plan, which writes the final command, agent, skill, script and rule files; `core` then checks the reply (§3). A failed reply gets one retry. Nothing is stored on the server.
4. The MVP keeps the config in the browser session only. Save, import and export are post-MVP (F-08).

Findings never change the configuration. The user decides what to apply.

## 3. Generation model

- **Input:** `ProjectConfig` plus the step catalog.
- **Step 1, check:** the structural rules. A configuration that fails them is refused with every problem listed (F-02, `InvalidConfigError`).
- **Step 2, select:** enabled workflows and steps, in the order of the map and of each workflow's tab. Required steps and gates are always present.
- **Step 3, render base files:** project instructions (`CLAUDE.md`), spec templates, `process.md` (with the Mermaid view of the process), placeholder values.
- **Step 4, render per workflow:** one `workflow-<name>.md` command that calls the workflow's steps in order and writes its branches as numbered rules, with their round limits (or "no limit set").
- **Step 5, write per step (LLM):** the LLM writes the content of the command, agent, skill or script the step uses, from its block description and its template, and the rule-set files it carries. `core` fixes the file path and the place of each file in the output.
- **Step 6, check:** `core` checks what the model returned. Every file path must be one `core` expects, no placeholder may be left in the text, and every path mentioned in a generated file must exist in the output (F-10). The checks a reply must pass are set in F-03 (see below); the retry for a reply that fails them is made by `apps/api` (F-07).

Two pure functions in `packages/core` serve steps 5 and 6 (F-03): `planGeneration` gives step 5 its input, and `checkReply` is step 6.

- **`planGeneration(config, templates)`** returns one entry per output file, in the order of the file list: its path, its rendered layout, its block description (a step's `description`, or its `summary` when the description is unset or empty; a workflow's `description`, or empty) and its rule-set tags (steps only).
- **`checkReply(plan, reply)`** checks the model's reply against the plan: each planned file is present, no extra file is returned, no path is unsafe, no placeholder or step marker is left, each required `##` heading of a Markdown output is present, and no file mentions SDDBuilder or its own paths (`apps/web`, `apps/api`, `packages/core`). It returns the findings sorted by path, then by message.

The model call and the one-retry rule live in `apps/api` (F-07), not in `core`.

As built (F-07), `/generate` makes one model call for the whole plan. The reply must be one JSON object mapping each planned path to its text; it goes through `parseReply` and `checkReply`. If either fails, one retry is made with the findings in the prompt. A second failure returns the findings and paths only, never file text. A provider error is not retried.

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
| Input | Analysis: the brief and the process. Generation: the block descriptions, the process and the template layout. Both with a size cap (F-13). |
| Output | JSON in the `AnalysisFinding` shape, validated server-side. The analysis result is `{ findings, review: { status, findings, dropped } }`: `findings` are the structural findings from `core`; `review.status` is `ok`, `failed` or `skipped` (decision 12); `review.findings` are the valid model findings (a model `blocker` is kept as `warning`); `review.dropped` counts the invalid ones. Structural findings are returned even when the review fails. |
| Failure | A timeout (60 s per attempt on the SDK client; the SDK retries twice by default), a provider error, or a reply that is not a JSON array → `review.status` is `failed` with no review findings; the structural findings are still returned. Invalid single findings are dropped, not a failure. Budget exhaustion is F-13. |
| Generation call | One call per `/generate`, for the whole plan. `max_tokens` 32000 (`GENERATION_MAX_TOKENS`); client timeout 300 s (`GENERATION_TIMEOUT_MS`, not the review's 60 s). A timeout or provider error fails after that call; the SDK's own retries apply inside the adapter. The retry for a bad reply is in §3. |
| Privacy | The browser shows a notice before analysis: the brief is sent to the model provider. The server does not store or log brief content. |

## 5. Technology (proposed)

| Concern | Proposal | Why |
|---|---|---|
| Language | TypeScript, strict | Matches the existing ComEd backend; shared types between web and API |
| Monorepo | npm workspaces | No extra tool needed for three packages |
| Web | Vite + React | Standard, small, static build |
| API | Hono 4.13.14 with `@hono/node-server` 2.1.5 (peer `hono` `^4 \|\| ^5.0.0-0`, we pin 4.x) on Node | Small surface: two endpoints; Web-standard `Request`/`Response`, so routes test without a network port. Decided 2026-11-12 (F-07) |
| LLM SDK | Official Anthropic TypeScript SDK | First-party, typed |
| Zip | JSZip 3.10.2, in memory | Works in memory for project-sized output; ships its own types. Decided 2026-11-12 (F-07) |
| Tests | Vitest | Same family as the ComEd backend tests |

No database, no user authentication, no queue in the MVP. Rate limiting is per client address and in memory; the spending ceiling is a configured daily limit.

Abuse and cost settings (F-13, decision 12): environment variables `SDDBUILDER_REVIEW_DAILY_LIMIT` (default 500) and `SDDBUILDER_GENERATE_DAILY_LIMIT` (default 50), read once at startup. Both are whole numbers of 0 or more; an invalid value stops startup and the error names the variable only. `ANTHROPIC_API_KEY` stays in the server environment only. Review calls use `max_tokens` 8192 and a 60-second timeout; generation calls use `max_tokens` 32000 and a 300-second timeout. Limiter and counter state is in memory and resets on restart.

## 6. Decisions

1. **The process is data, not code.** Workflows, steps, gates, branches and the map are JSON in `ProjectConfig`; the templates are text files. Adding a step kind means changing the model and the templates, not the generator's logic for the others.
2. **The server is stateless.** No projects, no accounts, no stored briefs. Each request is self-contained.
3. **Structure is enforced in the model,** not only in the UI. A required step cannot be removed through the API, and a configuration that breaks the workflow rules is refused.
4. **Claude Code is the only target in the MVP.** Spec Kit and OpenSpec outputs are planned right after it (§8). Cursor and Copilot are later. Gaps between formats are stated rather than invented.
5. **Generated projects follow the reference layout** (`CLAUDE.md`, `spec/documents`, `spec/specifications/F-XX-*`, `.claude/`, `scripts/`), so a project set up here can be run with the same commands as ComEd and PhotoSync.
6. **The LLM advises, the structure decides.** Structural checks are authoritative. LLM findings are labelled as advice and never applied automatically.
7. **The LLM writes the final framework at generation, from the block descriptions.** Each block carries a high-level description of what it should do. At `/generate` the LLM turns the built workflow into the final commands, agents, skills, scripts and rules. `core` fixes the file list, paths, step order, gates and branches, and checks the reply before it reaches the zip. This replaces the earlier rule that generation is template-only with no LLM. Recorded 2026-11-11, confirmed by the user. Templates hold the layout and the block descriptions the LLM works from, not final content.
8. **Custom steps are data, optional, and never required.** A custom step has a kind (command, agent, skill or script), a workflow it belongs to, and a body. Its id must not clash with another id. Required steps come only from the catalog.
9. **The map has no cycles, and a workflow's steps run in order.** Branches route only inside their workflow. Cross-workflow flow is the map's job.
10. **One analysis shape, refusals are blockers, and LLM findings are advice.** `analyze(config)` returns `{ findings, review: { status, findings, dropped } }`. `findings` are the structural findings from `core`. `review` is the LLM part from `apps/api`: `status` is `ok`, `failed` or `skipped` (`skipped` when the daily review ceiling is reached, decision 12), `findings` are the valid model findings, and `dropped` counts model findings that failed the reply check. A configuration refused by `validateConfig` appears as a blocker finding in the analysis; `generate()` keeps refusing the same configuration. Structural severities: an unreachable step is a blocker; an input with no upstream producer is a warning; a retry with no round limit is a warning; a brief missing a required field (`name`, `idea`, `stack.language`) is a blocker; other empty brief fields are warnings; a module that depends on a higher layer is a blocker; a module whose `dependsOn` names no module is a blocker; a custom step whose id clashes with a catalog or workflow id is a blocker; a custom step in no enabled workflow is a warning. LLM findings are advice: a model finding with severity `blocker` is kept as `warning`, and model output is never applied automatically. Recorded 2026-11-12, before the analyzer code (F-04).
11. **Generation makes one model call for the whole plan, with one retry, and returns a zip.** `/generate` takes the `ProjectConfig` itself as the request body (no wrapper). After `validateConfig` and `planGeneration`, the API makes one model call whose reply is one JSON object mapping each planned path to its text. The reply goes through `parseReply` and `checkReply`. If either fails, the API makes exactly one retry whose prompt lists the first findings. A second failure returns the findings and paths only, never file text. F-07 does not retry provider errors: a model that throws, times out or is rate-limited fails after one call, and the Anthropic SDK's own retries stay inside the adapter. Status codes: 400 for bad input (invalid JSON or a `ProjectConfig` that does not parse), 422 for a configuration refused by `validateConfig` (every problem listed), 502 for a provider error on the first call (no retry) or a reply that fails the check on both calls (with `problems`), 503 when the generation model is not configured, 500 for an unexpected error (generic message, no exception text), 200 for the zip. Unknown paths return 404, and a `GET` on either route returns 405 with `Allow: POST`. The zip is served as `application/zip` with `Content-Disposition: attachment; filename="sddbuilder-project.zip"`, a fixed name. No file is written during a request. The generation call sets `GENERATION_MAX_TOKENS` to 32000 (starting value, to be checked once a product runs end to end) and a client timeout of `GENERATION_TIMEOUT_MS` (300 seconds): a whole-plan reply takes minutes, unlike the 60 seconds of the review. Recorded 2026-11-12, before the generation code (F-07).
12. **Abuse and cost limits are fixed, in memory, and checked before any model call.** Limits are per client address, taken from the connection's remote address; a forwarded-address header from the request is ignored. Per client: 10 accepted requests per minute and 100 per UTC day, as fixed windows. A refusal is 429 with `Retry-After` in whole seconds and the error body. `/analyze` and `/generate` share one count. Only accepted requests count; 404 and 405 do not count, and neither do requests refused by a limit or an input cap. Input caps, checked on both routes before any model call: the idea text at most 8,000 characters (JavaScript string length, as submitted, no trimming), at most 12 modules, and at most 60 rules across code rules and test rules together. A cap refusal is 422 and lists every exceeded cap as `<path>: <reason>`, never submitted text. Daily ceilings per UTC day, counted when a model call is made (a failed call still counts): review 500 (`SDDBUILDER_REVIEW_DAILY_LIMIT`); at the ceiling `/analyze` answers 200 with review `skipped` and structural findings only, and the model is not called. Generation 50 (`SDDBUILDER_GENERATE_DAILY_LIMIT`); at the ceiling `/generate` answers 429 with the error body. A review reply that stops at `max_tokens` counts as `failed`. Log lines for refusals carry the event, route and status only. Behind a shared proxy all clients share one address, which is accepted for the MVP. Recorded 2026-11-13, before the limiter code (F-13).

## 7. Out of scope for the MVP

Accounts, saved projects on the server, save, import and export of projects (F-08), read-only share links (F-19), browser-local autosave (F-20), Cursor and Copilot targets, hosted previews of generated projects, LLM-written project content (only LLM review in the MVP), sharing custom steps between users.

## 8. Output adapters (planned, first after the MVP)

The generator builds one logical project model (instructions, stories, plan, workflows, steps, gates), and each adapter maps it to a tool's files. The Claude adapter is the reference. Paths below come from the public docs and must be verified in the repositories before F-16 and F-17.

| Logical part | Claude Code (MVP) | GitHub Spec Kit | OpenSpec |
|---|---|---|---|
| Project instructions | `CLAUDE.md` | constitution (created with `/speckit-constitution`; storage path to verify) | `openspec/` config (to verify) |
| Spec per feature | `spec/specifications/F-XX-*/stories.md` | spec artifacts under `.specify/` (to verify) | `openspec/changes/<change>/specs/` deltas |
| Plan and tasks | `plan.md` | plan and tasks artifacts (to verify) | `design.md` and `tasks.md` in the change folder |
| Commands | `.claude/commands/*.md` (one `workflow-*.md` per workflow) | `/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement` | `/openspec-propose`, `/openspec-apply-change`, `/openspec-archive-change` |
| Agents and skills | `.claude/agents/*.md`, `.claude/skills/*/SKILL.md` | not a native concept (to verify) | skills, mapped where possible (to verify) |
| Done work | commit per task | implement step (to verify) | `archive` moves the change and updates `openspec/specs/` |

Gaps are real: our commit-per-task gate and our agent split have no direct counterpart in either tool. The adapter writes them as rules or steps in the tool's own format and says so in the generated `process.md`.

## 9. Gates (MVP)

A gate is a condition with a pass output and a fail output, where the fail output stops the process. Gates can sit after a step (inside a workflow) or on a map connection (between workflows). A gate on a connection holds the next workflow until it passes.

Gate types are a fixed set. User-written check commands are not allowed in generated projects.

| Gate | Passes when | Default placement |
|---|---|---|
| `approval` | the user approves the output | exit of Specify (stories and plan), before Implement |
| `checks` | a script exits 0 | after Unit tests and E2E tests |
| `review` | the review reports no blocker or warning | after Code review |
| `diff-size` | the staged change is at most N lines | before Commit (N = 400 in the references) |

The user may change thresholds, move gates, and add or remove optional gates. Required steps keep their required gates. Gates are data: the generator writes them into the workflow command and into `process.md`, and the diagrams show them.

## 10. Process diagrams (MVP)

The builder is the process diagram. It draws the process from the same `ProjectConfig` the generator uses, so the picture cannot drift from the output (`building-blocks.md`).

- **Global map:** one diagram per project. Workflows are nodes, each showing its scope, its iteration source, and counts of steps, gates and branches. Connections mean "runs after", can carry the artifact they hand over, and can carry a gate. The map has no cycles.
- **Workflow tabs:** one tab per workflow, with its ordered steps, quality gates and branch arrows. Adding a tab creates a workflow. Workflows do not nest.

Three uses, in order of priority:

1. **Editing:** the map and the workflow tabs are the builder's main views. Workflows, steps, gates, branches and connections are edited on the diagram itself.
2. **Client view (MVP):** a full-screen presentation mode, showing the global map with a plain-language key, for a client conversation. The shareable read-only link is post-MVP (F-19); its proposed design carries the configuration in the URL fragment, so the server still stores nothing.
3. **Repository:** a Mermaid flowchart of the same process in the generated `process.md`, so the process renders on the hosting site.

Miro is not part of the flow. Image export is not planned for the MVP.
