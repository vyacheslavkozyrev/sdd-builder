# Implementation Plan — Generator core (F-04)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Source of the criteria: `stories.md` (AC-001 to AC-036, all `[auto]`). Paths are relative to the repository root. The generator lives in `source/packages/core/src/pipeline/generate/`, one module per concern. Tests live in `source/packages/core/test/pipeline/`, and each test name carries `F-04 AC-0xx`. Templates are passed in as data (AC-035): no task reads a template file from disk. The layouts themselves are F-05; F-04 tests use fixture layouts.

## Decision used by the plan: the templates are data

`planGeneration(config, templates)` takes a `GenerationTemplates` value, defined in T003:

- `base`: the base files in output order, each `{ path, layout }`. The paths come from `source/templates/base/manifest.json` (decision 36d) and include the spec-template files under `spec/specifications/F-00-template/`.
- `pipeline`, `flow`, `agent`, `rule`: one layout text each, for `.claude/commands/pipeline.md`, a flow command, an agent file and a rule file.

Layouts use `{{name}}` placeholders. Each value is a text built in code (decision 36b): a value that is a whole line (a step list, a condition list, an optional frontmatter line, the approval line) is built by `generate/`, so no layout holds a conditional.

## Interpretations (taken at Specify and carried into the rules)

- The walk of a flow starts at its Start and follows `next` links; at a condition it visits the `true` route before the `false` route; a block reached twice is listed once (AC-015).
- A retry route always carries a `roundLimit` (the schema requires it), so the layout never writes "no limit set".
- A configuration with a blocker, including a flow whose id is `pipeline`, is refused before any layout is rendered (AC-020, AC-022).
- Warnings never refuse a configuration (AC-021).
- The file list is sorted by path in code-point order (decision 35). The text of `pipeline.md` follows the flow order, so a reordering of flows changes that text but not the list of paths.

## Tasks

- [ ] T001 [Docs] Align the generation model with the flow model: `spec/documents/architecture.md` §3 steps 2 and 4 (remove "required blocks and the flow approvals and checks are always present" and the "gates" wording; state that the walk follows `next` and conditions, and that approval is a flag of the flow); `spec/documents/features.md` F-04 scope line only if its wording names gates or checks as flow properties. Covers no criterion; no code.

- [ ] T002 [Core] Errors and one-pass rendering: `source/packages/core/src/pipeline/generate/error.ts` (class `GenerationError`, a programmer error that names a path); `source/packages/core/src/pipeline/generate/render.ts` (`renderLayout(layout, values, path)`: replaces every `{{name}}` in one pass; an unknown name throws `GenerationError` naming the name and the path; a value is copied as written and is not rendered again). Test: `source/packages/core/test/pipeline/generate-render.test.ts`. Covers AC-012 (substitution), AC-013, AC-014.

- [ ] T003 [Core] Templates input and the file list: `source/packages/core/src/pipeline/generate/templates.ts` (type `GenerationTemplates` as in the decision above); `source/packages/core/src/pipeline/generate/paths.ts` (file-safe test of a relative path: no leading slash, no `..`, no backslash, no empty segment); `source/packages/core/src/pipeline/generate/file-list.ts` (lists each planned path with its kind: base, pipeline command, flow command, agent, rule; sorted by code-point order; two planned files with one path throw `GenerationError` naming the path). Tests: `generate-file-list.test.ts`. Covers AC-001, AC-002, AC-003, AC-004, AC-006, AC-024; the sort part of AC-007.

- [ ] T004 [Core] Refusals from the analysis: `source/packages/core/src/pipeline/generate/refuse.ts` (`configProblems(config)` returns the blocker findings of `analyzeStructure` in the same order and no warning). Test: `generate-refuse.test.ts`. Covers AC-019, AC-021 (warnings do not refuse), AC-022 (a flow id `pipeline` is a blocker at the flow's path), AC-023 (a pipeline with no flows is refused with F-03's blocker).

- [ ] T005 [Core] The walk of a flow: `source/packages/core/src/pipeline/generate/walk.ts` (from the flow's Start, follow `next` and a condition's `true` before `false`; list each block once; return the ordered blocks). Test: `generate-walk.test.ts` with a fixture flow that has a condition with a return, a `{stop: true}` route and a block reached by two routes. Covers AC-015 (the order and the once-only rule).

- [ ] T006 [Core] Values of a flow command: `source/packages/core/src/pipeline/generate/values-flow.ts` (values for a flow's command: `flowId`, `flowName`, `flowDescription`; the argument lines; the step lines, one numbered line per Agent block with its agent file, its arguments and its description; the condition lines, one numbered rule per condition with its description, its true and false routes, the round limit of a return (1 to 5) and, for `{stop: true}`, the text that the flow stops and asks the person a question built from the condition's description; the approval line, present only when the flow's approval is on). Test: `generate-values-flow.test.ts`. Covers AC-012 (the `flowId` value), AC-015 (the steps and conditions), AC-016, AC-018.

- [ ] T007 [Core] Values of the pipeline command, agents and rules: `source/packages/core/src/pipeline/generate/values-pipeline.ts` (the pipeline's name and description, its argument lines, and one line per flow in pipeline order with its id, description and approval); `source/packages/core/src/pipeline/generate/values-agent.ts` (`agentName`, `agentDescription`, the optional `model` and `tools` frontmatter lines, the reads and writes lines, the body, the argument lines); `source/packages/core/src/pipeline/generate/values-rule.ts` (`ruleId`, `ruleTitle`, `ruleText`). Test: `generate-values.test.ts`. Covers AC-017, and the value part of AC-003 and AC-004.

- [ ] T008 [Core] The plan: `source/packages/core/src/pipeline/generate/plan.ts` (`planGeneration(config, templates)` returns a `GeneratedPlan` of `PlannedFile` entries `{ path, layout (rendered), description, ruleTags }` in the file-list order; the description and rule tags are the flow's or the Agent block's; an empty description or list when none; no date, time or random value is added; the input is not changed). Test: `generate-plan.test.ts` with fixture templates; the default pipeline from `source/templates/pipeline/default.json` plans with fixture layouts. Covers AC-005, AC-007 (the reordering of rules and flows after the first gives the same paths), AC-008, AC-009, AC-010, AC-011, AC-036.

- [ ] T009 [Core] The refusal gate of the plan: in `plan.ts`, `planGeneration` runs `configProblems` first; with a blocker it returns `{ ok: false, problems }` with every blocker in analysis order, and it renders no layout and returns no files. Test: `generate-plan-refuse.test.ts` (a control: the same layout that fails on a blocked config throws on a valid one). Covers AC-020.

- [ ] T010 [Core] Reply check, part 1: `source/packages/core/src/pipeline/generate/reply-check.ts` (`checkReply(plan, reply)` returns findings `{ path, message }`: a planned path missing from the reply; a reply path not in the plan (its text is not used); a reply path that is unsafe (T003 test); an empty text or a `{{...}}` placeholder in a text; a value that is not a string). Test: `generate-reply-check.test.ts`. Covers AC-026, AC-027, AC-028, AC-029, AC-032.

- [ ] T011 [Core] Reply check, part 2: `source/packages/core/src/pipeline/generate/headings.ts` (`headingsOf(layout)`: the lines that start with `## `, in order; a `###` line is not one); `reply-check.ts` gains the required heading check (each heading of a Markdown layout must be a whole line of the reply text), the SDDBuilder self-reference check (`SDDBuilder`, `source/apps/web`, `source/apps/api`, `source/packages/core`), the sort of findings by path then message, and the no-change test. Tests: `generate-reply-check-text.test.ts`. Covers AC-025 (a valid reply has no finding), AC-030, AC-031, AC-033.

- [ ] T012 [Core] Namespace and purity: `source/packages/core/src/pipeline/index.ts` exports `configProblems`, `planGeneration` and `checkReply` and no other generator name; `source/packages/core/test/pipeline/namespace.test.ts` gains the generator names; `source/packages/core/test/pipeline/purity.test.ts` scans the `generate/` folder (no `fs`, `http`, `process`, `window`, model client, or template file read). Covers AC-034, AC-035.

- [ ] T013 [Docs] Record F-04 as built: `spec/documents/architecture.md` §3 (the functions as built and their names: `pipeline.planGeneration`, `pipeline.checkReply`, `pipeline.configProblems`; the templates as data and the one-pass rendering); `source/templates/README.md` (the value names of section T006 and T007 that layouts may use, so F-05 writes its layouts against them). Covers no criterion; no code.

## Rationale

- **The docs first (T001).** The architecture text still names gates and required checks as flow properties, which the flow model removed (`pipeline-schema.md` §5). The code is written against the corrected text.
- **Rendering before the plan (T002).** Every layout goes through one renderer; the error path and the one-pass rule are proven once, before anything depends on them.
- **Paths before text (T003, T004).** The file list and the refusal gate come from the model and the analysis; neither needs a layout, so they are built and tested first.
- **Values in small modules (T005 to T007).** The walk is the hardest part of the command text, so it is its own task. Each value builder is pure and tested with fixed input; the plan (T008) only assembles them.
- **The plan after its parts (T008, T009).** The plan uses every value builder and the refusal, so it comes after them. The refusal is a separate task so that the rule "no layout rendered on a blocked config" has its own control test.
- **The reply check in two tasks (T010, T011).** The first covers the file set and the text values; the second covers headings, self-references and ordering. Each stays within one review.
- **Namespace and purity last (T012).** The public names come after the modules exist; the purity scan covers the whole `generate/` folder at once.
- **Docs last (T013).** The functions and value names are written down once they are built.

**Libraries:** none added. The generator is pure TypeScript over `ProjectConfig` and the model types (decision 19); it reuses `analyzeStructure` (F-03).

**Layer tag:** all code tasks are `[Core]`. T001 and T013 are `[Docs]`.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Core]` | `source/packages/core`: the pure generator and its tests |
| `[Build]` | Project setup, manifests, scripts, and the default pipeline data file |
| `[Docs]` | Documentation changes required by the feature |
