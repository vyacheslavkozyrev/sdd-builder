# Implementation Plan — Generator core (F-04)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are relative to the repository root. The generator lives in `source/packages/core/src/pipeline/generate/` (decision 23 and `source/templates/README.md`). Tests live in `source/packages/core/test/pipeline/`, and each test name carries `F-04 AC-0xx`. Templates are passed in as data; no task reads a template file from disk (AC-032).

## Tasks

- [x] T001 [Docs] Record the decisions the stories rely on and correct the conflicting wording: `spec/documents/architecture.md` §3 (`planGeneration` and `checkReply` belong to F-04, not F-03); a new decision 35 in §6 (the file list is sorted by path; a flow whose id is `pipeline` is a blocker, since its command file would clash with `pipeline.md`; a duplicate output path throws, as decision 23 says, and no configuration reaches it because of the blocker); decision 22 (the flat analyzer's removal moves to F-06, the analyzer's owner); `source/templates/README.md` (the duplicate-path sentence and the sort sentence match decisions 23 and 35) — covers no criterion; records the rules that AC-007, AC-016, AC-019 and AC-021 rely on

- [x] T002 [Core] Refusals: the flow-name rule and `configProblems`: `source/packages/core/src/pipeline/analyze/generated-names.ts` (a blocker at the flow's path when a flow's id is `pipeline`; the rule is registered in `analyze/index.ts`); `source/packages/core/src/pipeline/generate/problems.ts` (`configProblems(config)` returns the blocker findings of `analyzeStructure`, in its order, and no warning); `source/packages/core/test/pipeline/generated-names.test.ts` (table-driven) and `source/packages/core/test/pipeline/config-problems.test.ts` — covers AC-016, AC-018, AC-019, AC-020

- [x] T003 [Core] Template input and placeholders: `source/packages/core/src/pipeline/generate/templates.ts` (the type `Templates`: base files, each with its output path, text and required `##` headings, plus the layout texts for the pipeline, command, agent and rule files); `source/packages/core/src/pipeline/generate/render.ts` (replaces every `{{name}}` in one pass from a value map; a placeholder with no value throws `GenerationError` naming the placeholder and the file path); `source/packages/core/src/pipeline/generate/errors.ts` (`GenerationError`); `source/packages/core/test/pipeline/render.test.ts` (fixture templates; a value containing `{{...}}` is copied as written) — covers AC-012, AC-013, AC-014

- [x] T004 [Core] The file list: `source/packages/core/src/pipeline/generate/plan.ts` (`planGeneration(config, templates)` returns `{ ok: true, files }` or `{ ok: false, problems }`; a refused config returns its problems and renders nothing; files: the base files in template order, `.claude/commands/pipeline.md`, `.claude/commands/<flow-id>.md` per flow, `.claude/agents/<name>.md` per Agent block of each flow, `.claude/rules/<id>.md` per rule; paths are checked as file-safe; the list is sorted by path in code-point order; a duplicate path throws `GenerationError`); `source/packages/core/test/pipeline/plan-files.test.ts` (table-driven, fixture config and templates) — covers AC-001, AC-002, AC-003, AC-004, AC-006, AC-007, AC-017, AC-021

- [x] T005 [Core] Entries of the flow and pipeline command files: `source/packages/core/src/pipeline/generate/values-command.ts` (the values `flowId`, `flowName`, `description`, `ruleTags` (`none` when empty), `stepList`, `routeRules` (a numbered rule per back route, `no limit set` when the limit is absent), `argumentList`, `pipelineStepList` and `commandList`); `plan.ts` gains each command file's entry: its rendered layout, its description (the flow's description, empty when none) and its rule tags (the flow's `ruleTags`, empty when none); `source/packages/core/test/pipeline/plan-command.test.ts` — covers AC-011 (command files), AC-012 (`{{flowId}}`), AC-015

- [x] T006 [Core] Entries of the agent, rule and base files: `source/packages/core/src/pipeline/generate/values-agent.ts` (the values `name`, `description`, `ruleTags`, `ruleTitle`, `ruleText`, and the lists `agentList`, `ruleList`, `processList` and `commandList` used by the base files); `plan.ts` gains each agent entry (its Agent block's description, its `ruleTags`), each rule entry (its title and text) and each base file entry (empty description and tags, its rendered text); `source/packages/core/test/pipeline/plan-entries.test.ts` — covers AC-011 (agent, rule and base entries)

- [x] T007 [Core] Determinism and the default plan: tests only, with the code of T004 to T006: `source/packages/core/test/pipeline/plan-determinism.test.ts` (the same config and templates planned twice give equal plans; a config with its flows and rules in another order gives the same paths; no planned text holds a date, a time, a UUID or a random string; the config and the templates are not changed by planning) and `source/packages/core/test/pipeline/plan-default.test.ts` (the default pipeline plans without a blocker, and its plan holds `pipeline.md`, one command file per child flow and one agent file per Agent block) — covers AC-005, AC-008, AC-009, AC-010

- [x] T008 [Core] Reply check, part 1: `source/packages/core/src/pipeline/generate/reply-check.ts` (`checkReply(plan, reply)` returns findings: a planned path missing from the reply; a reply path not in the plan; a path that is absolute, has a `..` segment, a backslash or an empty segment; an empty text or a `{{...}}` placeholder; a reply value that is not a string; a complete reply has no finding); `source/packages/core/test/pipeline/reply-check.test.ts` (table-driven) — covers AC-022, AC-023, AC-024, AC-025, AC-026, AC-029

- [x] T009 [Core] Reply check, part 2: `reply-check.ts` gains the required `##` headings of each Markdown output (a finding names the path and the heading), and the self-reference rule (a text naming `SDDBuilder`, `source/apps/web`, `source/apps/api` or `source/packages/core` is a finding naming the path); the findings come out sorted by path, then by message; `source/packages/core/test/pipeline/reply-check-text.test.ts` (the same reply checked twice gives the same findings; the plan and the reply are not changed) — covers AC-027, AC-028, AC-030

- [x] T010 [Core] Namespace, purity and the generator's data: `source/packages/core/src/pipeline/index.ts` exports `configProblems`, `planGeneration`, `checkReply` and `GenerationError`; the root export list stays as it is; `source/packages/core/test/pipeline/namespace.test.ts` gains the check of the new names; `source/packages/core/test/pipeline/purity.test.ts` scans `source/packages/core/src/pipeline/generate/` for `fs`, `http`, `process`, `window` and model client imports; `source/packages/core/test/pipeline/plan-fixed-templates.test.ts` (the same fixture templates given as data give the same plan in two runs) — covers AC-031, AC-032, AC-033

- [x] T011 [Core] Test: a refused config renders no layout (AC-017, no-render clause): `source/packages/core/test/pipeline/plan-files.test.ts` gains a case where the config has a blocker and the templates hold a layout with an unknown placeholder (`{{nope}}`); planning must return `{ ok: false, problems }` and must not throw, which proves no layout was rendered. Test-only; covers AC-017 (the no-render clause, added by the Verify amendment of 2026-11-17)

- [x] T012 [Core] Test: planning a flow-less pipeline returns no files (AC-020, planning clause): `source/packages/core/test/pipeline/config-problems.test.ts` or `plan-files.test.ts` gains a case that calls `planGeneration` on a config with no flows and asserts `{ ok: false }` with the F-03 "no flow" blocker and no `files`. Test-only; covers AC-020 (the planning clause, added by the Verify amendment of 2026-11-17)

## Rationale

- **Decisions first (T001).** Four things the stories rely on (refusal of flow id `pipeline`, sort by path, duplicate handling, and F-04's ownership of `planGeneration` and `checkReply`) conflict with the docs today. `CLAUDE.md` and `general.md` require the decision in `architecture.md` before code depends on it, so the record comes before any code.
- **Refusals before planning (T002).** `planGeneration` calls `configProblems` before it renders anything (AC-017), and the flow-name rule must exist in the analysis before the generator relies on it.
- **Placeholders before entries (T003 before T005, T006).** The entries are rendered by the placeholder function, so that function and the template type come first.
- **File list before entries (T004 before T005, T006).** Entries are attached to the files the list produces, so the list is fixed first; the entries then fill it in by file kind.
- **Determinism after the entries (T007).** The determinism tests compare complete plans, so they run after every entry kind exists. They add tests only, since the code they test is already in place.
- **Reply check after the plan type (T008, T009).** `checkReply` takes the plan from T004 and uses the layouts' headings from T003, so it comes after both. Part 2 extends part 1 in the same file, so it comes second.
- **Namespace and purity last (T010).** The exports and the purity scan describe the finished module, so they are the last change.

**Libraries:** none added. The generator is pure TypeScript over the model, the templates and the reply (decision 1). Templates are read at build time by `source/apps/api` (F-07) and passed in as data, so core never reads a file (AC-032).

**Layer tags:** `[Docs]` for T001 (the spec and the template README), `[Core]` for T002 to T010.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Core]` | `source/packages/core`: the generator, the reply check, the refusal rule and their tests |
| `[Build]` | Project setup, manifests, scripts, and the default pipeline data file |
| `[Docs]` | Documentation changes required by the feature |

## Coverage check

| Criterion | Task |
|---|---|
| AC-001 | T004 |
| AC-002 | T004 |
| AC-003 | T004 |
| AC-004 | T004 |
| AC-005 | T007 |
| AC-006 | T004 |
| AC-007 | T004 |
| AC-008 | T007 |
| AC-009 | T007 |
| AC-010 | T007 |
| AC-011 | T005, T006 |
| AC-012 | T003, T005 |
| AC-013 | T003 |
| AC-014 | T003 |
| AC-015 | T005 |
| AC-016 | T002 |
| AC-017 | T004 |
| AC-018 | T002 |
| AC-019 | T002 |
| AC-020 | T002 |
| AC-021 | T004 |
| AC-022 | T008 |
| AC-023 | T008 |
| AC-024 | T008 |
| AC-025 | T008 |
| AC-026 | T008 |
| AC-027 | T009 |
| AC-028 | T009 |
| AC-029 | T008 |
| AC-030 | T009 |
| AC-031 | T010 |
| AC-032 | T010 |
| AC-033 | T010 |
