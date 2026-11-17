# SDDBuilder — Features

Status: the features list, generated 2026-11-16 from the owner's draft and checked against `ui.md`, `architecture.md` (decisions 28 to 32, §11, §12) and `idea.md`. Every feature is **Not started**. Each feature gets its own specification (stories, screens, plan) when it is started, in this order.

Numbering: the IDs are the build order. The **Draft** column gives the number used in the owner's draft (1 to 16), and "added" marks features the documents require but the draft did not list.

---

## 1. Review of the draft

1. **Download API conflicts with the stateless design.** The service keeps nothing between requests (`idea.md`, decision 3), so a zip made by one request cannot be fetched by a later one. Proposed: merge draft 11 into the Generate API, which returns the zip (F-17, decision). The step still has one button, Generate and download.
2. **"Projects list" (draft 16) needs saved projects,** which the MVP excludes. It is listed as post-MVP (F-23), with the save and import work it depends on.
3. **Draft 16 is numbered twice.** The autosave item is now F-24.
4. **The draft leaves out MVP items the documents require:** the pipeline model and the default pipeline data, the structural checks that the builder and the analyzer share, the generator, the Claude Code templates, the analyzer's LLM review, the abuse, cost and privacy controls, and presentation mode with the process diagram. They are added below.
5. **Draft 6 and 7 split by tab.** Draft 6 is the Pipeline tab (the process: flows, approvals and checks between them). Draft 7 is the flow tab (blocks inside a flow). Custom agents are part of draft 7.
6. **Scaffolding (draft 1) must include the checks script.** The working process runs `source/scripts/task-check.sh` after every task, so the test and typecheck setup is part of F-01.
7. **Demo button:** not listed. You said it will be defined in the features list; it is F-09 (see the note there).

---

## 2. MVP

| ID | Title | Draft | Where | Depends on |
|---|---|---|---|---|
| F-01 | Project scaffolding: workspaces, TypeScript strict, Vitest, the task check script | 1 | all | — |
| F-02 | Pipeline model and the default pipeline: `ProjectConfig`, flows, blocks, the parser, the default pipeline data | added | `source/packages/core` | F-01 |
| F-03 | Structural checks: the rules of `architecture.md` §12, used by the builder marks and the analyzer | added | `source/packages/core` | F-02 |
| F-04 | Generator core: the pipeline to a file tree, deterministic paths, the check of the model's reply | added | `source/packages/core` | F-02 |
| F-05 | Claude Code templates: commands, agents, rules, base files, the process diagram in `process.md` | added | `source/templates`, `source/packages/core` | F-04 |
| F-06 | Analyzer: structural findings plus the LLM review (advice only), server side | added | `source/apps/api`, `source/packages/core` | F-03, F-05 |
| F-07 | Abuse, cost and privacy controls: rate limit, input caps, daily ceiling, no brief in logs | added (from the earlier plan) | `source/apps/api`, `source/apps/web` | F-06 |
| F-08 | UI layout template: header (logo, New project), app footer (not saved), centre area | 2 | `source/apps/web` | F-01 |
| F-09 | Demo button: what it does (to be defined) | added (owner, to define) | `source/apps/web` | F-08 |
| F-10 | Wizard stepper and navigation: four steps, Prev and Next buttons, the stepper is not clickable | 3 | `source/apps/web` | F-08 |
| F-11 | Project step: name (stored as typed) and idea (5,000 characters, counted in code points, counter) | 4 | `source/apps/web` | F-10 |
| F-12 | Technical details step: stack, architecture (5,000 characters), rules as blocks (1,000 characters, 60 at most) | 5 | `source/apps/web` | F-10 |
| F-13 | Pipeline builder: the Pipeline tab, flow tabs and +, the Pipeline toolbox (connection, approval, check), the live structure marks | 6 | `source/apps/web` | F-02, F-03, F-08, F-10 |
| F-14 | Workflow builder: a flow tab, its blocks in order (start, agent, approval, check, connection, end), properties, custom agents, switch off and delete | 7 | `source/apps/web` | F-13 |
| F-15 | Analyze and generate step: privacy notice, Analyze block, project preview, one Generate and download button enabled when the analysis is green | 8 | `source/apps/web` | F-11, F-12, F-14 |
| F-16 | Analyze API: `POST /analyze` takes the configuration, returns the findings | 9 | `source/apps/api` | F-06 |
| F-17 | Generate API: `POST /generate` takes the configuration, returns the zip | 10, 11 | `source/apps/api` | F-04, F-05, F-16 |
| F-18 | API and UI integration: the step sends the configuration, shows findings, generates and downloads | 12 | `source/apps/web`, `source/apps/api` | F-15, F-16, F-17 |
| F-19 | Presentation mode and process diagram: the Pipeline tab as a client view with a plain-language key; the Mermaid flowchart in `process.md` | added (idea, MVP) | `source/apps/web`, `source/templates` | F-13, F-05 |

Notes on the MVP:
- F-17 covers draft 11 (download). See §1, item 1.
- F-09 (Demo button) is open. Its scope is set when you define it in the features list.
- F-14 includes custom agents (formerly a separate feature, merged into the builder).

---

## 3. Post MVP

| ID | Title | Draft | Where | Depends on |
|---|---|---|---|---|
| F-20 | Pipeline import and export (JSON, with `schemaVersion` checked on import) | 13 | `source/apps/web`, `source/packages/core` | F-18 |
| F-21 | Cursor target: `AGENTS.md` and `.cursor/rules/` | 14 | `source/packages/core`, `source/templates` | F-05 |
| F-22 | Copilot target: `.github/copilot-instructions.md`, `.github/instructions/`, `.github/prompts/` | 15 | `source/packages/core`, `source/templates` | F-05 |
| F-23 | Projects list: saved projects (needs storage; decision to be made with F-20) | 16 | `source/apps/web`, `source/apps/api` | F-20 |
| F-24 | Browser-local autosave of the work in progress | 16 (second) | `source/apps/web` | F-18 |
| F-25 | GitHub Spec Kit output (from `idea.md`, next after the MVP) | added | `source/packages/core`, `source/templates` | F-05 |
| F-26 | OpenSpec output (from `idea.md`, next after the MVP) | added | `source/packages/core`, `source/templates` | F-05 |
| F-27 | Presets: other starting pipelines (the default is the first) | added | `source/packages/core`, `source/apps/web` | F-13 |
| F-28 | Generated-project self-check: every path a command names must exist in the output | added | `source/packages/core` | F-04 |
| F-29 | Read-only share link for clients (the configuration in the URL fragment; the server stores nothing) | added | `source/apps/web` | F-19 |
| F-30 | Skills and scripts as block kinds | added | `source/packages/core`, `source/apps/web` | F-14 |

---

## 4. Open points for the list
1. **Download API (draft 11):** merged into F-17 unless you want a stored zip (which conflicts with decision 3).
2. **Projects list (draft 16):** post-MVP; it needs a storage decision with F-20.
3. **Demo button (F-09):** to be defined.
4. **Items added to the MVP** (F-02 to F-07, F-19): please confirm they belong in the MVP.
