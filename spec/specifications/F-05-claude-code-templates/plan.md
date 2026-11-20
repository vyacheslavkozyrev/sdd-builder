# Implementation Plan — Claude Code templates (F-05)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are relative to the repository root. The layouts are text files under `source/templates/` (data, read by the caller and passed in as `Templates`). The generator's pure code is in `source/packages/core/src/pipeline/generate/`. Tests live in `source/packages/core/test/pipeline/`, and each test name carries `F-05 AC-0xx`. Tests that check the real layouts read `source/templates/` from the test code, never from `src/`.

## Tasks

Value tasks (T001 to T009) change the F-04 value builders in `generate/values-*.ts`. The stories allow this when the plan names it (Out of Scope: "any such change is named in the plan"). Each such task updates the F-04 tests that assert the old text.

- [x] T001 [Core] Flow steps: every block of the walk is a numbered step, Start first and End last; a Condition step gives its check and routes, and Conditions also stay numbered rules (AC-013) — `source/packages/core/src/pipeline/generate/values-flow.ts`, `source/packages/core/test/pipeline/generate-values-flow.test.ts` — covers AC-010, AC-011
- [ ] T002 [Core] Flow artifacts: `flowArtifacts` writes each artifact's label and template, `No artifacts` when none; the End step names `producedArtifact` and writes no artifact line without one — `values-flow.ts`, `generate-values-flow.test.ts` — covers AC-009, AC-014
- [ ] T003 [Core] Flow body and arguments: `flowBody` holds the body text with its line breaks; `flowArguments` writes `No arguments` when the flow has none — `values-flow.ts`, `generate-values-flow.test.ts` — covers AC-006, AC-008
- [ ] T004 [Core] Rule tags: `flowRuleTags` and `agentRuleTags` write the tags as a comma-separated list in order, `none` when there are none — `values-flow.ts`, `values-agent.ts`, `generate-values.test.ts` — covers AC-007, AC-022
- [ ] T005 [Core] Agent frontmatter and body: `agentDescription` and the `tools` line are YAML-safe (quoted when YAML would break); `agentBody` carries its own `Instructions` heading and is empty with no body or a blank body — `values-agent.ts`, `generate-values.test.ts` — covers AC-017, AC-019, AC-020
- [ ] T006 [Core] Agent Reads and Writes: `agentReads` and `agentWrites` become a heading with one artifact label per line in order, and are empty when the list is empty; replaces the single `Reads: …` line — `values-agent.ts`, `generate-values.test.ts` — covers AC-021
- [ ] T007 [Core] Mermaid flowchart nodes and edges: `processDiagram` in `source/packages/core/src/pipeline/generate/mermaid.ts` (new), with `flowchart` first line, one node per flow in `next` order with ids `F1`, `F2`, and an unlabelled edge for each `next`; a flow with approval on has `approval` at the end of its label — `mermaid.ts`, `source/packages/core/test/pipeline/mermaid-diagram.test.ts` (new), `values-base.ts` (adds `processDiagram`) — covers AC-031, AC-032, AC-033
- [ ] T008 [Core] Mermaid escaping and determinism: a quote, bracket, brace, pipe or hash in a flow name is written as an entity code, a line break as a space; the same config gives the same text on two calls — `mermaid.ts`, `mermaid-diagram.test.ts` — covers AC-034, AC-035
- [ ] T009 [Core] process.md flow list: `processFlows` replaces `processList` in `values-base.ts`; each flow once, in order, with its name, description, approval sentence, and its conditions and retry routes from `flowValues` — `values-base.ts`, `generate-values-base.test.ts` — covers AC-029
- [ ] T010 [Templates] Pipeline command layout: `source/templates/claude-code/pipeline.md` with the placeholders of the README (`pipelineModel`, `pipelineTools`, `pipelineBody` and the rest), and the test loader that reads `source/templates/` from test code — `source/templates/claude-code/pipeline.md`, `source/packages/core/test/pipeline/layouts-loader.ts` (new), `source/packages/core/test/pipeline/layouts-pipeline.test.ts` (new) — covers AC-001, AC-002, AC-003, AC-004, AC-005
- [ ] T011 [Templates] Flow command layout: `source/templates/claude-code/flow.md` (title from the name, Purpose, Context, arguments, artifacts, steps, rules, approval, rule tags) — `source/templates/claude-code/flow.md`, `source/packages/core/test/pipeline/layouts-flow.test.ts` (new) — covers AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014, AC-015
- [ ] T012 [Templates] Agent file layout: `source/templates/claude-code/agent.md` (frontmatter `name`, `description`, the optional `model` and `tools` lines, Purpose, Instructions, Reads and Writes, rule tags) — `source/templates/claude-code/agent.md`, `source/packages/core/test/pipeline/layouts-agent.test.ts` (new) — covers AC-016, AC-017, AC-018, AC-019, AC-020, AC-021, AC-022, AC-023
- [ ] T013 [Templates] Rule file layout: `source/templates/claude-code/rule.md` (title heading, text) — `source/templates/claude-code/rule.md`, `source/packages/core/test/pipeline/layouts-rule.test.ts` (new) — covers AC-024, AC-025
- [ ] T014 [Templates] Base manifest and CLAUDE.md: `source/templates/base/manifest.json` lists the base files in output order; `source/templates/base/CLAUDE.md` lists the commands, agents and rules from `commandList`, `agentList` and `ruleList` — `source/templates/base/manifest.json`, `source/templates/base/CLAUDE.md`, `source/packages/core/test/pipeline/layouts-claude-md.test.ts` (new) — covers AC-026, AC-027
- [ ] T015 [Templates] process.md layout: `source/templates/base/process.md` with `processFlows` and the `mermaid` fence of `processDiagram`, first line `flowchart` — `source/templates/base/process.md`, `source/packages/core/test/pipeline/layouts-process.test.ts` (new) — covers AC-026, AC-029, AC-030
- [ ] T016 [Templates] Spec template layouts: `source/templates/base/spec-template/stories.md`, `plan.md` and `progress.md` written to `spec/specifications/F-00-template/`, with the exact level-2 headings the F-04 reply check needs — `source/templates/base/spec-template/*.md`, `source/packages/core/test/pipeline/layouts-spec-template.test.ts` (new) — covers AC-026, AC-028
- [ ] T017 [Core] Default pipeline output tests: determinism (same file list, paths and text twice), no reference to this repository, no `{{`, `#enabled` or `#step:` marker left in any output — `source/packages/core/test/pipeline/layouts-default.test.ts` (new) — covers AC-036, AC-037, AC-039
- [ ] T018 [Docs] Templates README: the value table matches the values of T001 to T009 (`processFlows`, `processDiagram`, `flowArtifacts`, `flowBody`, `flowRuleTags`, `agentRuleTags`, the Reads and Writes sections), and a Claude Code layout table lists the planned path of each layout — `source/templates/README.md` — covers AC-040 (input for the test)
- [ ] T019 [Core] Placeholder and path tests: a layout with an unfilled placeholder fails with the placeholder and file named; the default pipeline renders through every layout and its planned paths are the rows of the README layout table — `source/packages/core/test/pipeline/layouts-default.test.ts`, `layouts-placeholders.test.ts` (new) — covers AC-038, AC-040

## Rationale

- **Values before layouts.** A layout can only write a value that exists, and the renderer has no conditionals. So the value builders change first (T001 to T009), and each layout task (T010 to T016) comes after the values it writes. Optional lines, such as the `Instructions` heading and the `Reads` section, are built in code and not in the layout (decision 36b).
- **F-04 changes are named.** The stories' Out of Scope list allows changes to the generator core only when the plan names them. T001 to T009 change `values-flow.ts`, `values-agent.ts`, `values-base.ts` and add `mermaid.ts`, and each updates the F-04 tests that asserted the older text. The F-04 contract itself (the walk, the routes, the reply check) does not change.
- **Reads and Writes.** The README of T018 currently describes a single `Reads: …` line. AC-021 (approved) asks for a section with one artifact per line, so T006 changes the value and the README follows.
- **Base layouts after their values.** `processList` becomes `processFlows` (T009) before `process.md` is written (T015), so no layout names a value that is removed.
- **Layout table last.** AC-040 checks the planned paths against the README table, so the table (T018) is written before its test (T019).
- **Mermaid view.** Decision 36(a) puts the diagram in F-05. Only flow nodes and `next` edges are drawn, with approval in the label (owner's choice). Conditions and retries are text, in `process.md` and in each flow command.
- **No new libraries.** Everything is string building in `packages/core` and text files under `source/templates/`.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Core]` | `source/packages/core`: the value builders, the Mermaid view and the tests of the generated output |
| `[Templates]` | `source/templates/`: the layouts and the base manifest (data), with the tests that read them |
| `[Docs]` | Documentation changes required by the feature (the templates README) |
