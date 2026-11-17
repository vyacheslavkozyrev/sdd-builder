# Implementation Plan — Claude Code templates (F-05)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are relative to the repository root. The layouts are text files under `source/templates/` (data, read by the caller and passed in as `Templates`). The generator's pure code is in `source/packages/core/src/pipeline/generate/`. Tests live in `source/packages/core/test/pipeline/`, and each test name carries `F-05 AC-0xx`. Tests that check the real layouts read `source/templates/` from the test code, never from `src/`.

## Tasks

- [x] T001 [Docs] Record decision 36 in `spec/documents/architecture.md` §6 and correct the two places that name F-18 for the Mermaid view (§3 step 3 and §10 use 3): the Mermaid diagram of `process.md` is F-05; the optional lines of a layout (`model`, `tools`, the stack-free base) are whole-line values built in code, not conditionals in the templates; a layout's `##` headings are its `##` lines (`headingsOf`); the base files' output paths are listed in `source/templates/base/manifest.json` in output order — covers no criterion

- [x] T002 [Core] Mermaid flows: `source/packages/core/src/pipeline/generate/mermaid.ts` (`processDiagram(pipeline)` returns the text of a `flowchart TD`: one node per child flow in pipeline order, with node ids `F1`, `F2`, … (never the flow id, so no Mermaid keyword clashes) and the flow name as its label; an edge from each flow to the flow its FlowLink names (`connectedTo.to`), labelled with the FlowLink label; a flow with no FlowLink gets an unlabelled edge to the next flow; a `"`, `[`, `]`, `{`, `}`, `|` or `#` in a label is written as its Mermaid entity code, so the diagram parses); `source/packages/core/test/pipeline/mermaid-flows.test.ts` (table-driven: flows in order, one node each, a flow named `end` or with a bracket in its name, an empty label) — covers AC-026 (the first line is `flowchart`), AC-027, AC-029

- [x] T003 [Core] Mermaid gates and the process values: `mermaid.ts` gains the gate nodes (an Approval or a Check on a FlowLink is a decision node `G1{"…"}` between its two flows, labelled with its kind and description; the edge out of it is labelled `pass`; no fail edge, as the model gives a pipeline gate no fail route); `source/packages/core/src/pipeline/generate/values-agent.ts` `baseValues` gains `processDiagram` (the value of `processDiagram(config.pipeline)`); `source/packages/core/test/pipeline/mermaid-gates.test.ts` (an approval gate, a check gate, a gate label with a quote, two calls with the same config give the same text) — covers AC-028, AC-029 (gate labels), AC-030

- [x] T004 [Core] Agent values for the frontmatter and the body: `values-agent.ts` `agentValues` gains `optionalFrontmatter` (the line `model: <value>` when the block sets a model, the line `tools: <a, b>` when it lists tools, each ending in a newline; empty when neither) and `bodySection` (`## Instructions` then the block's body when it has one; empty when not); `source/packages/core/test/pipeline/values-agent.test.ts` (table-driven: model set, tools set, both, neither; a body set and not set; a body with `{{x}}` kept as typed through the renderer) — covers AC-012, AC-013, AC-014, AC-015, AC-016, AC-017

- [x] T005 [Core] Layout headings and the layout loader for the tests: `source/packages/core/src/pipeline/generate/templates.ts` gains `headingsOf(text)` (the text of each line that starts with `## `, in order); `source/packages/core/test/pipeline/support/load-templates.ts` (reads `source/templates/` from the test code: `base/manifest.json` gives the base files in output order, `claude-code/*.md` the four layouts, and each layout's headings come from `headingsOf`); `source/packages/core/test/pipeline/headings-of.test.ts` (table-driven: no headings, a `###` line not counted, headings in order) — covers no criterion of its own; it is the reader the layout tests of T006 to T012 use

- [x] T006 [Templates] The pipeline and flow command layouts: `source/templates/claude-code/pipeline-command.md` (the arguments with `{{argumentList}}`, the flows and gates as numbered steps with `{{pipelineStepList}}`, the back-route rules with `{{routeRules}}`, the command files it lists); `source/templates/claude-code/command.md` (the name, description and rule tags with `{{flowId}}`, `{{flowName}}`, `{{description}}`, `{{ruleTags}}`; the steps with `{{stepList}}`; the route rules with `{{routeRules}}`); `source/packages/core/test/pipeline/layouts-command.test.ts` (loads the real layouts, plans the default config, checks the pipeline command and each flow command: arguments, flows in order, Start and End steps present, route rules with `no limit set` where absent, no rule for an outcome with no back route, a flow with only Start and End has two steps and no route rule, `none` for no rule tags) — covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010

- [x] T007 [Templates] The agent and rule layouts: `source/templates/claude-code/agent.md` (frontmatter `name: {{name}}`, `description: {{description}}`, then `{{optionalFrontmatter}}`; the body: `# {{name}}`, a `## Purpose` section with `{{description}}`, the rule tags with `{{ruleTags}}`, then `{{bodySection}}`); `source/templates/claude-code/rule.md` (`# {{ruleTitle}}` then `{{ruleText}}`); `source/packages/core/test/pipeline/layouts-agent-rule.test.ts` (the default pipeline's agent files: frontmatter order, no `model` or `tools` key for a block without them, `model` and `tools` lines for a block with them, the body section present only with a body; a fixture rule with its title and text; a configuration with no rules writes no `.claude/rules/` file) — covers AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-018, AC-019, AC-020

- [x] T008 [Templates] The base manifest and the spec template's stories file: `source/templates/base/manifest.json` (the base files in output order: `CLAUDE.md` → `CLAUDE.md`, `process.md` → `spec/documents/process.md`, `spec-template/stories.md`, `spec-template/plan.md`, `spec-template/progress.md` → `spec/specifications/F-00-template/…`); `source/templates/base/spec-template/stories.md` (the F-00 stories template made generic: the headings Out of Scope, Stories and Requirement Coverage, the `[auto]` and `[device]` tags, no path of this repository); `source/packages/core/test/pipeline/layouts-spec-stories.test.ts` (the manifest lists the paths in order; `stories.md` has its three headings; no `source/`, `SDDBuilder` or `spec/specifications/F-0` path other than the output path) — covers AC-021 (the spec template paths), AC-024 (stories headings)

- [x] T009 [Templates] The spec template's plan and progress files: `source/templates/base/spec-template/plan.md` (the task rules, the Tasks, Rationale and Layer Tags headings, layer tags generic: `[Build]`, `[Docs]` and a `[Core]` example, no path of this repository) and `source/templates/base/spec-template/progress.md` (the Phase Status, Current Task, Task Log, Deferred Findings, Test Results and Amendments headings); `source/packages/core/test/pipeline/layouts-spec-plan.test.ts` (the headings of both files; no repository path; each file of the manifest exists) — covers AC-021, AC-024

- [ ] T010 [Templates] The project instructions: `source/templates/base/CLAUDE.md` (the project's instructions: its process with `{{processList}}`, its command files with `{{commandList}}`, its agent files with `{{agentList}}`, its rule files with `{{ruleList}}`; generic wording, no path of this repository); `source/packages/core/test/pipeline/layouts-claude-md.test.ts` (renders the default config and fixture rules; the lists match the planned files; no layout holds a `projectName`, `idea` or `stack.` placeholder) — covers AC-021, AC-022, AC-023

- [ ] T011 [Templates] The process text with the diagram: `source/templates/base/process.md` (the process as text with `{{processList}}`; the Mermaid diagram in a fenced block marked `mermaid` with `{{processDiagram}}`, its first line `flowchart`; the command files with `{{commandList}}`); `source/packages/core/test/pipeline/layouts-process.test.ts` (renders the default config: the process lists the flows in pipeline order with their steps; one fenced `mermaid` block; the fence's first line is `flowchart`) — covers AC-021, AC-025, AC-026

- [ ] T012 [Core] Self-containment and the default output: tests only, with the layouts of T006 to T011: `source/packages/core/test/pipeline/layouts-default.test.ts` (plans the default config twice with the real layouts and compares the file lists, paths and text; no output file mentions `SDDBuilder`, `source/apps`, `source/packages`, `source/templates` or a path of the repository; every placeholder name that a layout uses is a value the generator gives for the default config; no output has `{{`, a `#enabled` marker or a step marker left; the planned paths are the base files, `.claude/commands/pipeline.md`, one command per child flow and one agent per Agent block, in code-point order, as the layout table of `source/templates/README.md` lists them) — covers AC-031, AC-032, AC-033, AC-034, AC-035

- [ ] T013 [Docs] `source/templates/README.md`: the status section says which layouts are in use (the base manifest and the four `claude-code/` layouts); the placeholders table gains `processDiagram`, `optionalFrontmatter` and `bodySection`, drops the `{{stack.*}}`, `{{process.diagram}}` and `{{#step:…}}` rows that no layout uses, and corrects the Mermaid F-18 wording to F-05; the Claude Code layout table lists the manifest and the `claude-code/` layouts — covers no criterion

## Rationale

- **Decision first (T001).** The layouts need three things the docs do not yet say: the Mermaid view is F-05, whole-line values replace conditionals (the renderer has none), and the base paths come from a manifest. `CLAUDE.md` and `general.md` require the decision before code depends on it.
- **Mermaid before the process layout (T002, T003 before T011).** `process.md` holds the diagram value, so the value comes first. Flows (T002) before gates (T003) because gates sit on the edges between flows.
- **Values before layouts (T004 before T007).** The agent layout uses the frontmatter and body values, so they are fixed first.
- **Reader before the layout tests (T005).** Every layout test loads the real files; the loader and the headings function come before the first of them.
- **Command layouts before agent and rule (T006 before T007).** The pipeline and flow commands carry the most criteria and the route rules; the agent and rule files are simpler and reuse the same values.
- **Base files after the values they use (T008 to T011).** The manifest is created with its first file (T008) so that no commit lists a file that does not exist; `CLAUDE.md` (T010) and `process.md` (T011) come after the list and diagram values.
- **Self-containment last (T012).** It reads every layout, so it runs after all of them; it adds tests only.
- **Docs of the layouts last (T013).** The README describes the finished layouts.

**Known limit, recorded for Verify:** the model gives a pipeline gate no fail route (`Gate` has no route), so the process diagram draws no fail edge (AC-028, as amended). Drawing the fail output would be a model change, which is outside F-05.

**Libraries:** none added. The generator and the Mermaid text are plain TypeScript; the test loader uses Node's `fs` in test code only (the purity scan covers `src/pipeline/generate/` and stays green).

**Layer tags:** `[Docs]` for T001 and T013; `[Core]` for T002 to T005 and T012; `[Templates]` for T006 to T011.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Core]` | `source/packages/core`: the Mermaid text, the values of the layouts, the headings reader and their tests |
| `[Templates]` | `source/templates/`: the layouts and the base manifest (data), with the tests that load them |
| `[Docs]` | `spec/documents/architecture.md` §6, §3, §10 and `source/templates/README.md` |

## Amendments

### Amendment — 2026-11-17 (T007)
**Changed**: T007 layout `source/templates/claude-code/agent.md` uses `{{frontmatterDescription}}` for the frontmatter `description` (not `{{description}}`) and `{{optionalFrontmatter}}` for the optional lines. The tools line is not a placeholder of its own: `yamlText` in `source/packages/core/src/pipeline/generate/values-agent.ts` builds it inside the value of `{{optionalFrontmatter}}`. `yamlText` writes a value as a plain YAML scalar when it matches a fixed pattern (letters, digits, spaces and `, . ( ) ' / -`, starting with a letter or digit, no trailing space, not a boolean, null or number word), and as a JSON double-quoted string otherwise.
**Reason**: a description such as `feature: user stories` made the default agent files invalid YAML in review.
**Impact**: none beyond T007 (values-agent.ts and the agent layout are in the same commit).
