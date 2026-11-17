# SDDBuilder — Features

Status: updated 2026-11-16 from the owner's draft. Every feature is **Not started**. Each feature gets its own specification (stories, screens, plan) when it is started, in the order below. The IDs are the build order: MVP first, then post MVP.

Numbering: the **Draft** column gives the number in the owner's draft. "Added" marks a feature the documents require for the MVP but the draft does not list.

Use: internal use on localhost only for now. Deployment is not needed.

---

## 1. Review

1. **Items 1 to 8 are "UI only".** The UI needs the pipeline model, the checks, the generator and the analyzer behind it. F-02 to F-06 are added and confirmed as MVP.
2. **Demo and presentation mode are one feature** (owner, 2026-11-16): F-23, post MVP.
3. **Download and Generate.** The draft has "Generate and Download API" as one item, which fits the stateless design (a zip is returned by the request that makes it). No separate download API.
4. **Abuse, cost and privacy controls** are post MVP (F-17), as the owner decided. Internal use on localhost does not need them.
5. **Deployment** is not needed for internal use on localhost, so it is removed from the list.
6. **Output formats** that `idea.md` lists as next (Spec Kit, OpenSpec, presets, the self-check, the share link, skills and scripts) are not in the draft. Not added.

---

## 2. MVP

| ID | Title | Draft | Depends on |
|---|---|---|---|
| F-01 | Project scaffolding: workspaces, TypeScript strict, Vitest, the task check script | 1 | — |
| F-02 | Pipeline model and the default pipeline: `ProjectConfig`, flows, blocks, the parser, the default pipeline data | added (confirmed) | F-01 |
| F-03 | Structural checks: the rules of `architecture.md` §12, shared by the builder and the analyzer | added (confirmed) | F-02 |
| F-04 | Generator core: the pipeline to a file tree, deterministic paths, the check of the model's reply | added (confirmed) | F-02 |
| F-05 | Claude Code templates: commands, agents, rules, base files, the process diagram in `process.md` | added (confirmed) | F-04 |
| F-06 | Analyzer: structural findings plus the LLM review (advice only), server side | added (confirmed) | F-03, F-05 |
| F-07 | UI layout template: header (logo, New project), app footer (not saved), centre area | 2 | F-01 |
| F-08 | Wizard stepper (UI only): four steps, Prev and Next buttons, the stepper is not clickable | 3 | F-07 |
| F-09 | Project step (UI only): name and idea (5,000 characters, counter) | 4 | F-08 |
| F-10 | Technical details step (UI only): stack, architecture, rules as blocks | 5 | F-08 |
| F-11 | Pipeline builder (UI only): the Pipeline tab, flow tabs and +, the Pipeline toolbox, the live structure marks | 6 | F-02, F-03, F-07, F-08 |
| F-12 | Workflow builder (UI only): a flow tab, its blocks, properties, custom agents and delete | 7 | F-11 |
| F-13 | Analyze and generate step (UI only): privacy notice, Analyze block, project preview, Generate and download button | 8 | F-09, F-10, F-12 |
| F-14 | Analyze API: `POST /analyze` takes the configuration, returns the findings | 9 | F-06 |
| F-15 | Generate and Download API: `POST /generate` takes the configuration, returns the zip | 10 | F-04, F-05, F-14 |
| F-16 | API and UI integration: the step sends the configuration, shows findings, generates and downloads | 11 | F-13, F-14, F-15 |

---

## 3. Post MVP

| ID | Title | Draft | Depends on |
|---|---|---|---|
| F-17 | Abuse, cost and privacy controls: rate limit, input caps, daily ceiling, no brief in logs | added | F-14 |
| F-18 | Pipeline import and export (JSON) | 12 | F-16 |
| F-19 | Cursor target | 13 | F-05 |
| F-20 | Copilot target | 14 | F-05 |
| F-21 | Projects list (needs storage; decided with F-18) | 15 | F-18 |
| F-22 | Browser-local autosave | 16 | F-16 |
| F-23 | Presentation mode and demo: one feature, the Pipeline tab as a client view with a plain-language key; the Demo button | 17, 18 | F-11, F-05 |

---

## 4. Descriptions

Each description is the starting point for the feature's specification. Decisions are those in `ui.md`, `architecture.md` and `idea.md`.

**F-01 Project scaffolding.** npm workspaces for `apps/api`, `apps/web` and `packages/core`, TypeScript strict with NodeNext imports, and Vitest in each package. The task check script `source/scripts/task-check.sh` typechecks and runs every test; the working process runs it after every task.

**F-02 Pipeline model and the default pipeline.** `ProjectConfig` with `schemaVersion` 2 and one pipeline. Flows hold blocks (one nesting level): start, agent, approval, check and end. Connections are `connectedTo` properties on flows and blocks, and the pipeline is one JSON object with the schema of `architecture.md` §6 decision 33. The parser returns problems with their paths, refuses unknown keys, and loads the default pipeline (`source/templates/pipeline/default.json`) as data at build time.

**F-03 Structural checks.** The rules of `architecture.md` §12: one start and one end per flow, connections that join blocks of one flow or flows of the pipeline, no cycles, both outputs of every check wired, reachability, back routes only to earlier blocks, unique file-safe names, and a warning for a retry with no limit. These are pure functions used by both the builder marks and the analyzer, so each rule has one implementation.

**F-04 Generator core.** A pure function from the configuration to a file tree, with deterministic paths and order and no timestamps. Generated text comes from the templates and from the model's reply, which the core checks before use. Configurations that cannot be generated are refused with their problems.

**F-05 Claude Code templates.** Text templates for the pipeline command, one command per flow, agent files with frontmatter (name, description, model, tools) and body, rule files from the rule blocks, and the base files of the reference layout. It also writes `process.md` with a Mermaid diagram of the process. Generated projects do not refer to SDDBuilder's own files.

**F-06 Analyzer.** Server-side analysis: the structural findings of F-03, plus an LLM review that returns advice only and never edits the process. Findings are validated and capped; if the review is skipped or fails, the structural findings are still returned. The brief is not stored or logged.

**F-07 UI layout template.** The header (logo, New project), the app footer with the note that work is not saved, and the centre content area, in Material UI on a desktop layout of 1280 × 800. Every screen uses it.

**F-08 Wizard stepper.** Four steps (Project, Technical details, Workflow, Analyze and generate) in a stepper that is not clickable and shows done, current and to-do states. Prev and Next buttons sit beside it: Prev is disabled on step 1, and Next is disabled on step 4. Values are kept in memory between steps.

**F-09 Project step.** The project name is a single-line field, stored as typed and required, but a blank name does not block Next; the analysis reports it. The idea is a multi-line field of at most 5,000 characters, counted in code points, with a counter `N / 5,000`; pasting past the limit keeps the first 5,000 characters. The project name is limited to 100 characters, counted in code points, and the idea is trimmed at both ends when the configuration is built.

**F-10 Technical details step.** Language (required), framework, platform, build tool and test framework, and an architecture text of at most 5,000 characters. Rule blocks have a name and a description of at most 1,000 characters; each shows its file name, and the list holds at most 60 blocks. Duplicate ids are flagged, and the list starts empty.

**F-11 Pipeline builder.** The Pipeline tab (it cannot be removed), one tab per flow, and a + button after the last tab to add a flow. The canvas shows flows as boxes, connections as arrows, and approval and check blocks on the arrows (one gate per arrow). It has a properties panel for the pipeline (including its arguments, such as `feature-id`) and shows structure marks next to the items they name. There are no Start or End blocks on this tab.

**F-12 Workflow builder.** A flow tab with the toolbox Start, Agent, Approval, Check, Connection and End. Blocks are numbered in order, with Start first and End last. Approval stops and waits for a person; Check has a true output and a false output. Blocks can be moved up and down, and deleted after confirmation (no switch-off: architecture decision 34). Agent properties are name, description, arguments, restrictions, model and body (at most 1,000 characters); custom agents are Agent blocks.

**F-13 Analyze and generate step.** A privacy notice with a checkbox sits above Analyze, which is disabled until the box is ticked. The Analyze block lists the findings with severity, subject and message, and notes a skipped or failed review. The project preview shows the file tree and one button, Generate and download, which is enabled only when the analysis has no blocker or warning. Any change to the project makes the analysis out of date.

**F-14 Analyze API.** `POST /analyze` takes the configuration, parses it with the F-02 parser, runs the F-06 analysis and returns the findings as JSON. A body that is not JSON gets a 400, and a configuration the parser refuses gets a 422 with every problem. Nothing from the brief is stored or logged.

**F-15 Generate and Download API.** `POST /generate` takes the same configuration, runs the F-04 generator with the model's content, and returns the zip `sddbuilder-project.zip` in the response. A refused configuration gets a 422 that lists every problem. Nothing is kept between requests.

**F-16 API and UI integration.** The Analyze block and the Generate button call the endpoints with the configuration built from the wizard state. Errors (400, 422, 429, 500, 502 and network failures) are shown as text, and the entered values are kept. The file tree is computed in the browser, with no request.

**F-17 Abuse, cost and privacy controls (post MVP).** A per-client rate limit held in memory, input caps checked before any model call, a daily ceiling on analysis and generation calls, timeouts and output limits on each model call, and no brief content in logs or error reports.

**F-18 Pipeline import and export (post MVP).** Save the pipeline as JSON and load it back. The import checks `schemaVersion` and validates the file with the parser; the migration design is settled when the feature is planned.

**F-19 Cursor target (post MVP).** Map the Claude layout to `AGENTS.md` and `.cursor/rules/`, using the same pipeline model and a separate generator adapter. The file paths are tested.

**F-20 Copilot target (post MVP).** Map the Claude layout to `.github/copilot-instructions.md`, `.github/instructions/` and `.github/prompts/`, with its own adapter and path tests.

**F-21 Projects list (post MVP).** A list of saved projects. The stateless MVP has no storage, so this needs a decision on where projects are kept (server or browser) and on ownership and privacy, to be taken with F-18.

**F-22 Browser-local autosave (post MVP).** The work in progress is saved in the browser and restored when the page is opened again. The app tells the user that it is kept only in that browser; nothing is stored on the server.

**F-23 Presentation mode and demo (post MVP).** A full-screen read-only view of the Pipeline tab with a plain-language key and an option to hide connections, for showing a process to a client. A Demo entry point opens a sample process in the same view. The Demo button is not shown until this feature exists.
