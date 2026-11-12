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
   4. The response merges both lists. If the LLM step fails or is over budget, the response still contains the structural findings plus a notice that the semantic review did not run.
3. `POST /generate` with the config returns a zip. `core` builds the generation input from the config (the block descriptions, the process and the template layout). `apps/api` sends it to the LLM, which writes the final command, agent, skill, script and rule files. `core` then checks the output (§3). Nothing is stored on the server.
4. The MVP keeps the config in the browser session only. Save, import and export are post-MVP (F-08).

Findings never change the configuration. The user decides what to apply.

## 3. Generation model

- **Input:** `ProjectConfig` plus the step catalog.
- **Step 1, check:** the structural rules. A configuration that fails them is refused with every problem listed (F-02, `InvalidConfigError`).
- **Step 2, select:** enabled workflows and steps, in the order of the map and of each workflow's tab. Required steps and gates are always present.
- **Step 3, render base files:** project instructions (`CLAUDE.md`), spec templates, `process.md` (with the Mermaid view of the process), placeholder values.
- **Step 4, render per workflow:** one `workflow-<name>.md` command that calls the workflow's steps in order and writes its branches as numbered rules, with their round limits (or "no limit set").
- **Step 5, write per step (LLM):** the LLM writes the content of the command, agent, skill or script the step uses, from its block description and its template, and the rule-set files it carries. `core` fixes the file path and the place of each file in the output.
- **Step 6, check:** `core` checks what the model returned. Every file path must be one `core` expects, no placeholder may be left in the text, and every path mentioned in a generated file must exist in the output (F-10). The checks a reply must pass are set in F-03 (see below); the retry for a reply that fails them belongs to F-07.

Two pure functions in `packages/core` serve steps 5 and 6 (F-03): `planGeneration` gives step 5 its input, and `checkReply` is step 6.

- **`planGeneration(config, templates)`** returns one entry per output file, in the order of the file list: its path, its rendered layout, its block description (a step's `description`, or its `summary` when the description is unset or empty; a workflow's `description`, or empty) and its rule-set tags (steps only).
- **`checkReply(plan, reply)`** checks the model's reply against the plan: each planned file is present, no extra file is returned, no path is unsafe, no placeholder or step marker is left, each required `##` heading of a Markdown output is present, and no file mentions SDDBuilder or its own paths (`apps/web`, `apps/api`, `packages/core`). It returns the findings sorted by path, then by message.

The model call and the one-retry rule belong to F-07 (`apps/api`), not to `core`.

The file list, paths and order are deterministic: the same config gives the same set of files. The wording of LLM-written content may differ between runs. Tests use a fake model with fixed replies, so they stay deterministic.

## 4. LLM analysis

| Concern | Decision |
|---|---|
| Provider | Anthropic API |
| Model | A Claude Sonnet model, set by the `SDDBUILDER_ANALYZER_MODEL` environment variable. The default is set when F-04 starts (open question). |
| Key | `ANTHROPIC_API_KEY`, server environment only. Never sent to the browser, never logged. |
| Input | Analysis: the brief and the process. Generation: the block descriptions, the process and the template layout. Both with a size cap (F-13). |
| Output | JSON in the `AnalysisFinding` shape, validated server-side. |
| Failure | Timeout, error or budget exhausted → structural findings only, with a notice. |
| Privacy | The browser shows a notice before analysis: the brief is sent to the model provider. The server does not store or log brief content. |

## 5. Technology (proposed)

| Concern | Proposal | Why |
|---|---|---|
| Language | TypeScript, strict | Matches the existing ComEd backend; shared types between web and API |
| Monorepo | npm workspaces | No extra tool needed for three packages |
| Web | Vite + React | Standard, small, static build |
| API | Node HTTP framework (Fastify or Hono), decided in F-07 | Small surface: two endpoints |
| LLM SDK | Official Anthropic TypeScript SDK | First-party, typed |
| Zip | `archiver` or `jszip`, decided in F-07 | Both work in memory for project-sized output |
| Tests | Vitest | Same family as the ComEd backend tests |

No database, no user authentication, no queue in the MVP. Rate limiting is per client address and in memory; the spending ceiling is a configured daily limit.

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
