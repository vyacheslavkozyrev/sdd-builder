# SDDBuilder — Features

Status: draft, reviewed 2026-11-11 against the decisions in [idea.md](idea.md), [building-blocks.md](building-blocks.md) and [architecture.md](architecture.md). Screens referenced here are wireframes in `design/mockups/`, not the final UI. Each feature becomes stories and tasks later, following [process.md](process.md).

## Overview

| ID | Feature | Scope | Type | Where | Phase | Depends on | Status |
|---|---|---|---|---|---|---|---|
| F-01 | Domain model and step catalog | MVP | Enabler | packages/core | 0 | — | ✅ Complete (model and catalog replaced in F-02 T002 and T003) |
| F-02 | Generator core: workflows and steps to file tree | MVP | Enabler | packages/core | 1 | F-01 | ✅ Complete (18 tasks, 34 criteria, 99 tests) |
| F-03 | Claude Code templates | MVP | User | templates, core | 1 | F-02 | ⏳ Pending |
| F-04 | Analyzer: structural checks and LLM review | MVP | User | packages/core, apps/api | 2 | F-01 | ⏳ Pending |
| F-05 | Project brief form | MVP | User | apps/web | 2 | F-01 | ⏳ Pending |
| F-06 | Visual builder: global map and workflow tabs | MVP | User | apps/web | 2 | F-01 | ⏳ Pending |
| F-07 | API: analyze and generate, zip download | MVP | User | apps/api | 2 | F-02, F-03, F-04 | ⏳ Pending |
| F-08 | Save, import and export of projects | Post-MVP | User | apps/web | — | F-05, F-06 | Not started |
| F-09 | Presets: Light, Standard, Full | Post-MVP | User | packages/core, apps/web | 3 | F-06 | ⏳ Pending |
| F-10 | Generated-project self-check | Post-MVP | Enabler | packages/core | 3 | F-03 | ⏳ Pending |
| F-11 | Cursor target | Post-MVP | User | templates, core | — | F-03 | Not planned |
| F-12 | Copilot target | Post-MVP | User | templates, core | — | F-03 | Not planned |
| F-13 | Abuse, cost and privacy controls | MVP | Enabler | apps/api, apps/web | 2 | F-04, F-07 | ⏳ Pending |
| F-14 | Custom steps | MVP | User | packages/core, apps/web | 3 | F-06, F-02 | ⏳ Pending |
| F-15 | Configurable quality gates | MVP | User | packages/core, apps/web | 2 | F-06 | ⏳ Pending |
| F-16 | GitHub Spec Kit output | Post-MVP | User | packages/core, templates | 4 | F-03 | ⏳ Proposed, first after MVP |
| F-17 | OpenSpec output | Post-MVP | User | packages/core, templates | 4 | F-03 | ⏳ Proposed, first after MVP |
| F-18 | Process diagrams: global map, workflow tabs, presentation mode; Mermaid in process.md | MVP | User | packages/core, apps/web | 3 | F-06, F-15 | ⏳ Proposed |
| F-19 | Read-only share link for clients | Post-MVP | User | apps/web | — | F-18 | Not planned |
| F-20 | Browser-local autosave | Post-MVP | User | apps/web | — | F-06 | Not planned |

**Totals:** 20 features. MVP: 11 (F-01 to F-07, F-13, F-14, F-15, F-18). Post-MVP: 9 (F-08 to F-12, F-16, F-17, F-19, F-20).

**Phases** are the order of work inside each scope. A feature starts only when its dependencies are complete.

## Features

### F-01 Domain model and step catalog

The types for `ProjectConfig`, workflows, steps, gates, branches, the map, `AnalysisResult` and `GenerationResult`, and the default step catalog (Specify, Implement, Verify and Release workflows with their steps; see `building-blocks.md` §4). The scaffold in `packages/core/src/` still has the earlier flat model and must be changed to match `building-blocks.md` before F-02.

### F-02 Generator core

A pure function `generate(config, templates) → GenerationResult`. It checks the structural rules, selects the enabled workflows and steps in order, renders base files and placeholders, and returns a sorted file list. The output is deterministic. Specified in `spec/specifications/F-02-generator-core/`; that draft describes the earlier flat model and is rewritten before approval.

### F-03 Claude Code templates

Templates for `CLAUDE.md`, `spec/documents/process.md` (with the Mermaid view), the spec template, one `workflow-<name>.md` command per workflow, step commands, agents, skills, rule files and the checks script. Taken from the reference projects and made stack-neutral.

### F-04 Analyzer: structural checks and LLM review

- *Structural (in `core`, deterministic):* missing required steps; module layers that break the dependency direction; unknown ids; empty required fields; and the workflow rules of `building-blocks.md`: no cycles on the map, every input produced upstream, both outputs of every condition wired, every step reachable, and a warning on retries with no round limit.
- *Semantic (in `apps/api`, LLM):* a fixed review prompt over the brief and the process; output validated against the `AnalysisFinding` shape; invalid output dropped and counted. Covers gaps in the idea, contradictory or unverifiable rules, test rules that name tools outside the stack, and suggested steps. Advice only.
- Structural findings are returned even when the LLM step fails.

### F-05 Project brief form

Idea and structured fields for stack, architecture modules, code rules and test rules. Validation matches `model.ts`. The privacy notice is shown before analysis, and Analyze stays disabled until it is accepted (wireframe `02-brief.svg`).

### F-06 Visual builder: global map and workflow tabs

- **Global map:** add, remove and connect workflows. Each workflow shows its scope, its iteration source and counts of steps, gates and branches. Connections carry an optional artifact label and an optional gate. Cycles are refused (wireframe `07-map.svg`).
- **Workflow tabs:** one tab per workflow. Adding a tab creates a workflow. Within a tab: add, remove, reorder and switch on or off steps, gates and branch routes. Required steps cannot be removed. Each step's inspector shows the file it generates and its rule-set tags (wireframe `01-builder.svg`).
- The state lives in the browser session only. Reloading clears it (see F-20).

### F-07 API and zip download

`POST /analyze` and `POST /generate`. Generation returns a zip with the file tree. Stateless. Input is validated against the model.

### F-08 Save, import and export (post-MVP)

Export the project as JSON, import it back, and check `schemaVersion` on import. Not in the MVP: the MVP keeps no state between visits. Its design (file format, migration, what is stored) is specified when it is planned.

### F-09 Presets (post-MVP)

Starting points for a new project, as sets of workflows and steps:

- **Light:** Specify and Implement, with the approval and commit gates.
- **Standard:** adds the review and test branches.
- **Full:** adds Verify, Release and optional Research.

Presets are starting points; the builder can change them.

### F-10 Generated-project self-check (post-MVP)

After generation, every path named in a generated command, agent, skill or script must exist in the output. Mismatches are reported as warnings.

### F-11 Cursor target (post-MVP)

Maps the Claude layout to `AGENTS.md` and `.cursor/rules/`. Not planned until the Claude target is in use.

### F-12 Copilot target (post-MVP)

Maps the Claude layout to `.github/copilot-instructions.md`, `.github/instructions/` and `.github/prompts/`. Not planned until the Claude target is in use.

### F-13 Abuse, cost and privacy controls

Needed because the service is anonymous and calls a paid model:

- Per-client rate limit on `/analyze` and `/generate`, in memory.
- Input caps on the idea text, the number of modules and the number of rules; requests over the cap are rejected before any LLM call.
- A configured daily ceiling on analyzer calls; once reached, analysis returns structural findings only.
- Timeout and maximum output size on each LLM call.
- No brief content in logs or error reports; the privacy notice in F-05 is tested.

Numeric limits are set when the feature is specified.

### F-14 Custom steps

- Authoring: a form for id, name, summary, kind (command, agent, skill or script), the workflow it belongs to, `consumes`, `produces`, and the body (Markdown; for an agent, its tools and model). Ids are checked against the catalog and other custom steps (wireframe `04-custom-block.svg`).
- Always optional (`required: false`); the form does not offer the option.
- Size-capped body (the cap is set when the feature is specified).
- Generation writes custom steps like catalog steps, into `.claude/commands/`, `.claude/agents/` or `.claude/skills/`.
- The analyzer (F-04) checks custom steps structurally and, in the LLM review, for contradictions with the brief.

### F-15 Configurable quality gates

Four gate types, fixed (`architecture.md` §9): `approval`, `checks`, `review`, `diff-size`. The user sets thresholds, moves gates, adds or removes optional gates, and can place a gate on a map connection. Each gate's fail output stops the process, unless the gate is used as a branch (see `building-blocks.md` §3). Generation writes the gates into the workflow commands and `process.md`.

### F-16 GitHub Spec Kit output (post-MVP, first after the MVP)

An adapter that writes the Spec Kit layout (`.specify/` artifacts, the constitution, `/speckit-*` commands) from the same model. Covers the steps that map; gaps are written into the generated notes. Verify paths and command names against the repository first.

### F-17 OpenSpec output (post-MVP, first after the MVP)

An adapter that writes `openspec/` (specs, changes with `proposal.md`, `design.md`, `tasks.md`, the archive folder) and the `openspec-*` workflow. Verify paths and the profile system first.

### F-18 Process diagrams (MVP)

The global map and the workflow tabs are drawn from the model as they are edited. Gates are decision points; disabled steps are greyed out. The presentation mode shows the global map full-screen for client conversations, with a plain-language key (wireframe `03-presentation.svg`). The generated `process.md` carries the same process as a Mermaid flowchart. No Miro step and no image export in the MVP.

### F-19 Read-only share link (post-MVP)

A link a client can open to see the process without editing it. Proposed design: the configuration is carried in the URL fragment, so the server stores nothing and the fragment is never sent to the server. Not planned for the MVP.

### F-20 Browser-local autosave (post-MVP)

Keeps the builder state in the browser between reloads, as a per-viewer convenience. It is not a saved project and it is not shared. Post-MVP, so the MVP keeps nothing between visits (the brief screen says so).
