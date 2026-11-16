# SDDBuilder — Features

Status: updated 2026-11-14 to the model of a pipeline with flows (one nesting level) and blocks ([building-blocks.md](building-blocks.md)), the decisions in [idea.md](idea.md) and the architecture in [architecture.md](architecture.md). Screens referenced here are wireframes in `spec/design/features/`. Each feature becomes stories and tasks later, following [process.md](process.md).

## Overview

| ID | Feature | Scope | Type | Where | Phase | Depends on | Status |
|---|---|---|---|---|---|---|---|
| F-01 | Domain model: the pipeline, its flows, blocks and the default pipeline | MVP | Enabler | source/packages/core | 0 | — | ✅ Complete in `source/packages/core/src/pipeline/` (9 tasks, 27 criteria, 784 tests); the flat model files stay until F-05 rebuilds the web app |
| F-02 | Generator core: pipeline, agents and rules to file tree | MVP | Enabler | source/packages/core | 1 | F-01 | ✅ Complete in `source/packages/core/src/pipeline/generate/` (17 tasks, 34 criteria, 1059 tests); the flat generator was removed in F-07 |
| F-03 | Claude Code templates | MVP | User | templates, core | 1 | F-02 | ✅ Complete in `source/templates/claude-code/` and `source/packages/core/src/pipeline/` (16 tasks, 31 criteria, 1343 core tests); the flat layouts and generator were removed in F-07 |
| F-04 | Analyzer: structural checks and LLM review | MVP | User | source/packages/core, source/apps/api | 2 | F-01 | ✅ Complete (26 tasks, 25 criteria, 2090 tests across api, web and core; the flat analyzer is removed; see `spec/specifications/F-04-analyzer/verify.md`) |
| F-05 | Project wizard: frame, name and idea, workflow host (step 3) | MVP | User | source/apps/web | 2 | F-01, F-06 | Specified and UX approved 2026-11-15 |
| F-21 | Project wizard step 2: technical details and code rules | MVP | User | source/apps/web | 2 | F-05 | Specified 2026-11-15 (split from F-05); UX pending |
| F-22 | Project wizard step 4: analyze and generate | MVP | User | source/apps/web | 2 | F-04, F-05, F-07 | Specified 2026-11-15 (split from F-05); UX pending |
| F-06 | Visual builder: Map tab, flow tabs, gates and checks, custom agents | MVP | User | source/apps/web | 2 | F-01, F-04 | Not started |
| F-07 | API: analyze and generate, zip download | MVP | User | source/apps/api | 2 | F-02, F-03, F-04 | ✅ Complete in `source/apps/api/`, `source/packages/core/` and `spec/specifications/F-07-api-and-zip/` (25 tasks, 28 criteria, 2086 tests across api, web and core; flat generator and flat templates removed; see `verify.md`) |
| F-08 | Save, import and export of projects | Post-MVP | User | source/apps/web | — | F-05, F-06, F-21, F-22 | Not started |
| F-09 | Presets: other starting pipelines | Post-MVP | User | source/packages/core, source/apps/web | 3 | F-06 | Not started |
| F-10 | Generated-project self-check | Post-MVP | Enabler | source/packages/core | 3 | F-03 | Not started |
| F-11 | Cursor target | Post-MVP | User | templates, core | — | F-03 | Not started |
| F-12 | Copilot target | Post-MVP | User | templates, core | — | F-03 | Not started |
| F-13 | Abuse, cost and privacy controls | MVP | Enabler | source/apps/api, source/apps/web | 2 | F-04, F-07 | Not started |
| F-14 | Custom blocks: agents | Merged into F-06 | User | — | — | — | Merged 2026-11-14: a custom agent is a toolbox item in F-06 |
| F-15 | Configurable quality gates: conditions | Merged into F-06 | User | — | — | — | Merged 2026-11-14: a gate or check is a Condition block in F-06 |
| F-16 | GitHub Spec Kit output | Post-MVP | User | source/packages/core, templates | 4 | F-03 | Not started |
| F-17 | OpenSpec output | Post-MVP | User | source/packages/core, templates | 4 | F-03 | Not started |
| F-18 | Process diagrams: the Map tab, presentation mode; Mermaid in process.md | MVP | User | source/packages/core, source/apps/web | 3 | F-06 | Not started |
| F-19 | Read-only share link for clients | Post-MVP | User | source/apps/web | — | F-18 | Not started |
| F-20 | Browser-local autosave | Post-MVP | User | source/apps/web | — | F-06 | Not started |

**Totals:** 22 features, two of them merged into F-06 (F-14, F-15). MVP: 11 (F-01 to F-07, F-13, F-18, F-21, F-22). Post-MVP: 9 (F-08 to F-12, F-16, F-17, F-19, F-20).

**Build order (2026-11-14):** F-01 first, since everything depends on the domain model. Then F-02 and F-03 together, F-04, F-07, F-05 and F-06 (with gates and custom agents), then F-21 and F-22 (wizard steps 2 and 4), F-13 (caps update), F-18. F-05 needs F-06 for its step 3.

**↻ Built on the previous model.** The rows marked ↻ were built or specified on the flat model (workflows as tabs of steps, nine node kinds). Their code and their specs are not reused as they are: each is re-specified after F-01 is reworked, and its stories and tasks are rewritten to the new model. Completed work stays in the history.

**Phases** are the order of work inside each scope. A feature starts only when its dependencies are complete.

## Features

### F-01 Domain model: the pipeline, blocks and the default pipeline

The types for `ProjectConfig`, the pipeline and its flows (one nesting level), the five block kinds (start, agent, condition, connection, end) and the Flow block, conditions with their fixed check types and routes, scope on agent blocks, the `AnalysisResult` and `GenerationResult`, and the default pipeline (`building-blocks.md` §4). The scaffold in `source/packages/core/src/` had only the flat model; the pipeline model was added beside it in `src/pipeline/` before F-02, to match `building-blocks.md`. The flat model files stay until F-05 (decision 19 in `architecture.md`).

### F-02 Generator core

A pure function `generate(config, templates) → GenerationResult`. It checks the structural rules (`building-blocks.md` §7), selects the enabled blocks in order, renders base files and placeholders, and returns a sorted file list. The output is deterministic. Specified and built in `spec/specifications/F-02-generator-core/`. The shipped base templates still hold placeholders the config cannot fill; F-03 rewrites them.

### F-03 Claude Code templates

Layouts for `CLAUDE.md`, `spec/documents/process.md` (without a diagram: the Mermaid flowchart belongs to F-18), the spec template, the pipeline command file, one command file per flow, one agent file per Agent block, and one rule file per rule entry in `ProjectConfig.rules` (architecture decision 20). Taken from both reference projects (ComEd and PhotoSync) and made stack-neutral: a layout gives the file's sections, never its content. Core builds the generation input for each file and checks the model's reply against the plan. The LLM writes the final content (architecture §6, decision 7). Templates contain no scripts; a check's command is written from the brief's stack.

### F-04 Analyzer: structural checks and LLM review

- *Structural (in `core`, deterministic):* the rules of `building-blocks.md` §7: one Start block per flow, connections that join two blocks or two flows, only the pipeline contains flows, both outputs of every condition wired, every block reachable, no cycles apart from retries, unique agent names, and a warning on a retry with no round limit. Plus empty required fields and unknown ids.
- *Semantic (in `source/apps/api`, LLM):* a fixed review prompt over the brief and the process; output validated against the `AnalysisFinding` shape; invalid output dropped and counted. Covers gaps in the idea, contradictory or unverifiable rules, test rules that name tools outside the stack, and suggested blocks. Advice only.
- Structural findings are returned even when the LLM step fails.

### F-05 Project wizard: frame, name and idea, workflow host

The wizard shell for four steps, in order (screens: `spec/design/features/F-05-project-brief-form/`). This feature builds:

1. **The frame.** Four steps, Back and Next, the stepper (not clickable), state in memory only.
2. **Step 1, project name and idea.** The name is required. The idea has a counter (8,000 characters). A Project name field maps to `name`.
3. **Step 3, the workflow host.** Shows the builder (F-06) on its Map tab, with the + that adds a flow after the last tab. Depends on F-06.

Steps 2 and 4 are their own features: F-21 (technical details and code rules) and F-22 (analyze and generate). The privacy of the brief and the no-secrets check for the web app are here.

The web app is Vite + React; its logic is tested with Vitest and the dev server forwards `/analyze` and `/generate` to `source/apps/api` (`architecture.md` §6, decision 13). The browser keeps the wizard in memory only.

### F-21 Project wizard step 2: technical details and code rules

Step 2 of the wizard (screens: `spec/design/features/F-21-wizard-technical-details/`).

- **Architecture and stack.** An architecture style text (optional, `architecture` in the config); language (required), framework, platform, build tool and test framework.
- **Code rules.** Each rule is a rule block with a title and a body; the block shows the file it becomes, `.claude/rules/<id>.md`. Blocks can be added and removed; at most 60. Testing rules are an ordinary block. No module list.

### F-22 Project wizard step 4: analyze and generate

Step 4 of the wizard (screens: `spec/design/features/F-22-wizard-analyze-generate/`).

- **Analyze.** The privacy notice with a checkbox before Analyze; the findings as the analyzer returns them (`POST /analyze`, F-04 and F-07).
- **Generate.** Waits for an analysis with no blockers; the file tree is shown before Generate (from core's `planGeneration`); then `POST /generate` and Download zip (F-07).

### F-06 Visual builder: the Map tab, flow tabs, gates and checks, custom agents

Absorbs F-14 (custom agents) and F-15 (gates and checks), merged 2026-11-14.

Screens: `spec/design/features/F-06-visual-builder/` (to be redrawn for flows, gates and checks).

- **Map tab (the pipeline).** A tab row: the Map tab, then one tab per child flow in order, and a + at the end that adds a flow after the last tab. The Map canvas shows the flows as nodes, with connections that carry the artifact label. Gates and checks sit on those connections, drawn as diamonds on the arrow. A toolbox to the left of the diagram holds Connection, Approval and Check (decided 2026-11-15); an Approval or a Check is dragged onto a connection. The pipeline's properties (name, description, arguments, model, tools, rule tags, body) are in a panel to the right of the diagram.
- **Flow tabs.** One tab per child flow, opened from the tab row. The flow's blocks in order, and a toolbox that lists every block kind: Start, Agent, Condition, Connection and End. A flow has one Start and at least one End. Screen: `spec/design/features/F-06-visual-builder/06-flow-tab-toolbox.svg`.
- **Property panels** for each block (Start, Agent, Condition, Connection, End, Flow), as `building-blocks.md` §3 lists them. Every block shows its generated file and its rule tags.
- Blocks and flows can be switched off; a switched-off item stays in place with its properties.
- The state lives in the browser session only. Reloading clears it (see F-20).

### F-07 API and zip download

`POST /analyze` and `POST /generate`. Generation returns a zip with the file tree. Stateless. Input is validated against the model. The wizard's step 4 calls analyze, then generate, then the zip download.

### F-08 Save, import and export (post-MVP)

Export the project as JSON, import it back, and check `schemaVersion` on import. Not in the MVP: the MVP keeps no state between visits. Its design (file format, migration, what is stored) is specified when it is planned.

### F-09 Presets: other starting pipelines (post-MVP)

Starting pipelines other than the default one, as sets of blocks, for example a lighter pipeline without the UX phase or without the review loop. The default pipeline is in F-01. Presets are starting points; the builder can change them.

### F-10 Generated-project self-check (post-MVP)

After generation, every path named in a generated command or agent file must exist in the output. Mismatches are reported as warnings.

### F-11 Cursor target (post-MVP)

Maps the Claude layout to `AGENTS.md` and `.cursor/rules/`. Not planned until the Claude target is in use.

### F-12 Copilot target (post-MVP)

Maps the Claude layout to `.github/copilot-instructions.md`, `.github/instructions/` and `.github/prompts/`. Not planned until the Claude target is in use.

### F-13 Abuse, cost and privacy controls

Needed because the service is anonymous and calls a paid model:

- Per-client rate limit on `/analyze` and `/generate`, in memory.
- Input caps on the idea text (8,000 characters) and on the number of rule blocks (60); requests over the cap are rejected before any LLM call.
- A configured daily ceiling on analyzer calls; once reached, analysis returns structural findings only.
- Timeout and maximum output size on each LLM call.
- No brief content in logs or error reports; the privacy notice in F-05 is tested.

The limits are as in `architecture.md` §6, decision 12. The module cap is removed with the module list.

### F-14 Custom blocks: agents (merged into F-06)

Merged 2026-11-14 into F-06. A custom agent is a toolbox item on a flow tab, with the same properties as a catalog agent (name, description, scope, model, tools, body). Always optional. Its body size cap and its checks are set in F-06.

### F-15 Configurable quality gates: conditions (merged into F-06)

Merged 2026-11-14 into F-06. A gate or check is a Condition block with a fixed check type (`approval`, `checks`, `diff-size`; `review` was removed 2026-11-15, see `architecture.md` §6 decision 24), placed on a connection between flows or inside a flow. Its threshold, decider, routes and round limit are set in F-06 (`architecture.md` §9, `building-blocks.md` §3).

### F-16 GitHub Spec Kit output (post-MVP, first after the MVP)

An adapter that writes the Spec Kit layout (`.specify/` artifacts, the constitution, `/speckit-*` commands) from the same model. Covers the blocks that map; gaps are written into the generated notes. Verify paths and command names against the repository first.

### F-17 OpenSpec output (post-MVP, first after the MVP)

An adapter that writes `openspec/` (specs, changes with `proposal.md`, `design.md`, `tasks.md`, the archive folder) and the `openspec-*` workflow. Verify paths and the profile system first.

### F-18 Process diagrams (MVP)

The Map tab is drawn from the model as it is edited. Conditions are decision points; switched-off blocks are greyed out. The presentation mode shows the pipeline full-screen for client conversations, with a plain-language key (wireframe to be drawn for the new map). Connections may be hidden there. The generated `process.md` carries the pipeline as a Mermaid flowchart. No Miro step and no image export in the MVP.

### F-19 Read-only share link (post-MVP)

A link a client can open to see the process without editing it. Proposed design: the configuration is carried in the URL fragment, so the server stores nothing and the fragment is never sent to the server. Not planned for the MVP.

### F-20 Browser-local autosave (post-MVP)

Keeps the builder state in the browser between reloads, as a per-viewer convenience. It is not a saved project and it is not shared. Post-MVP, so the MVP keeps nothing between visits (the wizard says so).
