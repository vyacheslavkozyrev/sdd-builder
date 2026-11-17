# Progress — Generator core (F-04)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 6 stories, 33 criteria, all `[auto]`; approved by the user. Scope: core generator only (planning, reply check, refusals); the templates text, the model call and the analyzer rewiring are later features |
| UX       | ➖ Not needed | 2026-11-16 | No user interface: a pure generator in `source/packages/core` |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user |
| Build    | 🔄 In Progress | 2026-11-16 | 10 of 12 tasks committed (T011 by the Verify amendment; T012 pending) |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decision 35 recorded; §3 and decision 22 corrected; template README sort and duplicate wording | 0 blockers, 0 warnings | task check passed: core 545 of 545, web 3 of 3, api 6 of 6 |
| T002 | Flow-name blocker for `pipeline`; configProblems = analysis blockers; architecture §12 lists the rule | 0 blockers, 1 warning fixed | task check passed: core 556 of 556, web 3 of 3, api 6 of 6 |
| T003 | Template input type; one-pass placeholder rendering; GenerationError for a missing value | 0 blockers, 1 warning and 2 suggestions fixed (test-only) | task check passed: core 583 of 583, web 3 of 3, api 6 of 6 |
| T004 | File list in planGeneration: base, pipeline command, flow commands, agents, rules; file-safe paths; code-point sort; refusal and duplicate handling; headings carried on each planned file. Staged size 451 lines, over the 400 guard; kept as one task at the user's direction | 0 blockers, 2 warnings and 1 suggestion fixed | task check passed: core 615 of 615, web 3 of 3, api 6 of 6 |
| T005 | Command entries: flow and pipeline values, step and route rules, rendered command layouts with description and tags. Staged size 531 lines, over the 400 guard; kept as one task at the user's direction | 0 blockers, 2 warnings and 3 suggestions fixed (tests added) | task check passed: core 630 of 630, web 3 of 3, api 6 of 6 |
| T006 | Agent, rule and base entries: agent description and tags, rule title and text, base files rendered; processList, commandList, agentList and ruleList | 0 blockers, 2 warnings and 2 suggestions fixed | task check passed: core 639 of 639, web 3 of 3, api 6 of 6 |
| T007 | Determinism and default plan tests (test-only); the flow-order wording of AC-007 is recorded as a deferred finding | 0 blockers, 2 weak tests fixed | task check passed: core 655 of 655, web 3 of 3, api 6 of 6 |
| T008 | Reply check part 1: missing, extra, unsafe paths, empty text, placeholders, non-string values; the reply is narrowed with no throw | 0 blockers, 1 warning fixed | task check passed: core 686 of 686, web 3 of 3, api 6 of 6 |
| T009 | Reply check part 2: required headings as whole lines; self-reference names; findings sorted by path then message; every applicable check runs on a text | 0 blockers, 1 defect fixed (early return removed for text checks) | task check passed: core 714 of 714, web 3 of 3, api 6 of 6 |
| T010 | Namespace exports; purity scan over generate/ with positive samples, templates imports refused; fixed-templates test | 0 blockers, 1 warning and 1 suggestion fixed | task check passed: core 736 of 736, web 3 of 3, api 6 of 6 |
| T011 | Test: a refused config renders no layout (AC-017 no-render clause); test-only | 0 blockers, 1 suggestion fixed (test helper) | task check passed: core 737 of 737, web 3 of 3, api 6 of 6 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T007 review: AC-007 says the same paths come out "whatever the order of the flows or rules in the config". The first flow is the pipeline's entry (reachability starts there), so reversing the flows refuses the config instead of reordering it. The intended wording is: the same paths in the same order whatever the order of the rules, or of the flows after the first; a reordering that leaves a flow unreached is refused. architecture.md decision 35 has the same broad wording. Not edited: the stories are approved, so this needs the user's decision on the wording.

- T001 review: `source/templates/README.md` still says "enabled" in the command, agent and rule rows (lines 59–61 and 75–77). Decision 34 removed the enabled property, so the wording is stale. Not in T001's scope; to be fixed with the template placeholder work (F-04 T003 or a later Docs task).
- T005 review: `source/templates/README.md` lines 28–31 name `command-layouts.ts` as the builder of the step, rule and argument values; they now live in `source/packages/core/src/pipeline/generate/values-command.ts`. The same lines carry the deferred "enabled" wording, so the file name is corrected with it.
- T006 review: no `ProjectConfig` field carries `projectName`, `idea` or `stack` (`source/packages/core/src/pipeline/model.ts` has `name` only on `Pipeline`), so a base layout using `{{projectName}}` throws at planning (AC-013). The behaviour matches AC-013, but `source/templates/README.md` lines 17–20 still promise these values from `ProjectConfig`. Open decision for the user: give the base layouts a value source (for example `Pipeline.name`, or a new config field), or drop the rows. Not changed here: it is a model and template decision. The T004 fixture now uses placeholder-free text so the structure test stays valid.
- T008 review: `source/packages/core/src/pipeline/generate/reply-check.ts` line 18 repeats the placeholder pattern of `render.ts` line 11 instead of sharing it. Sharing needs `render.ts` to export its pattern, a change outside T008's listed files, so it is left for a later task that touches `render.ts`.

---

## Test Results

Verify run 2026-11-17 on `main` (clean tree, all 10 tasks ticked, Current Task None). `source/scripts/task-check.sh` passed (exit 0): typecheck clean; core 736 of 736 (37 files), web 3 of 3, api 6 of 6; total 745 of 745.

All 33 criteria are `[auto]`; none is `[device]`, so there is no manual checklist.

| Criterion | Test file | Status |
| --- | --- | --- |
| AC-001 | `source/packages/core/test/pipeline/plan-files.test.ts` | Pass |
| AC-002 | `source/packages/core/test/pipeline/plan-files.test.ts` | Pass |
| AC-003 | `source/packages/core/test/pipeline/plan-files.test.ts` | Pass |
| AC-004 | `source/packages/core/test/pipeline/plan-files.test.ts` | Pass |
| AC-005 | `source/packages/core/test/pipeline/plan-default.test.ts` | Pass |
| AC-006 | `source/packages/core/test/pipeline/plan-files.test.ts` | Pass (unsafe paths tested on base files only; see note) |
| AC-007 | `source/packages/core/test/pipeline/plan-files.test.ts`, `plan-determinism.test.ts` | Gap (wording, see G1) |
| AC-008 | `source/packages/core/test/pipeline/plan-determinism.test.ts` | Pass |
| AC-009 | `source/packages/core/test/pipeline/plan-determinism.test.ts` | Pass |
| AC-010 | `source/packages/core/test/pipeline/plan-determinism.test.ts` | Pass |
| AC-011 | `source/packages/core/test/pipeline/plan-command.test.ts`, `plan-entries.test.ts` | Pass |
| AC-012 | `source/packages/core/test/pipeline/render.test.ts`, `plan-command.test.ts` | Pass |
| AC-013 | `source/packages/core/test/pipeline/render.test.ts`, `plan-entries.test.ts` | Pass |
| AC-014 | `source/packages/core/test/pipeline/render.test.ts`, `plan-entries.test.ts` | Pass |
| AC-015 | `source/packages/core/test/pipeline/plan-command.test.ts` | Pass |
| AC-016 | `source/packages/core/test/pipeline/config-problems.test.ts` | Pass |
| AC-017 | `source/packages/core/test/pipeline/plan-files.test.ts` | Gap (no-render clause, see G2) |
| AC-018 | `source/packages/core/test/pipeline/config-problems.test.ts` | Pass |
| AC-019 | `source/packages/core/test/pipeline/generated-names.test.ts`, `plan-files.test.ts` | Pass |
| AC-020 | `source/packages/core/test/pipeline/config-problems.test.ts` | Gap (planning clause, see G3) |
| AC-021 | `source/packages/core/test/pipeline/plan-files.test.ts` | Pass |
| AC-022 | `source/packages/core/test/pipeline/reply-check.test.ts` | Pass |
| AC-023 | `source/packages/core/test/pipeline/reply-check.test.ts` | Pass |
| AC-024 | `source/packages/core/test/pipeline/reply-check.test.ts` | Pass |
| AC-025 | `source/packages/core/test/pipeline/reply-check.test.ts` | Pass |
| AC-026 | `source/packages/core/test/pipeline/reply-check.test.ts`, `reply-check-text.test.ts` | Pass |
| AC-027 | `source/packages/core/test/pipeline/reply-check-text.test.ts` | Pass |
| AC-028 | `source/packages/core/test/pipeline/reply-check-text.test.ts` | Pass |
| AC-029 | `source/packages/core/test/pipeline/reply-check.test.ts`, `reply-check-text.test.ts` | Pass |
| AC-030 | `source/packages/core/test/pipeline/reply-check-text.test.ts` | Pass |
| AC-031 | `source/packages/core/test/pipeline/namespace.test.ts` | Pass |
| AC-032 | `source/packages/core/test/pipeline/purity.test.ts` | Pass |
| AC-033 | `source/packages/core/test/pipeline/plan-fixed-templates.test.ts` | Pass |

Gaps (criterion as written is not proven by a passing test):

- **G1 AC-007**: the criterion says the order is the same "whatever the order of the flows or rules". The tests reverse the rules and the flows after the first one. The first flow is never moved, and reversing it refuses the config (see the T007 deferred finding). Needs the user's decision on the wording, or a test for the agreed wording.
- **G2 AC-017**: the test checks the problems and that no `files` are returned. Nothing proves that no layout is rendered for a refused config (for example, a refused config with a template placeholder that has no value still returns the problems, not a throw).
- **G3 AC-020**: the test checks only `configProblems` for a pipeline with no flows. Nothing calls `planGeneration` on that config to prove that it returns no files.

Note (not counted as a gap): AC-006 says every planned path is file-safe. The check runs on every planned path in one loop (`plan.ts`), but the tests only pass unsafe paths through the base files. Rule, agent and command paths are not tested with unsafe ids.

---

## Amendments

```
### Amendment — 2026-11-17 (Verify)
**Changed**: `plan.md` gains T011 and T012 (test-only). No story changed.
**Reason**: Verify (test agent, verify mode) found two missing proofs: AC-017 does not prove that a refused config renders no layout (T011); AC-020 does not prove that planning a flow-less pipeline returns no files (T012). A third gap, AC-007's flow-order wording, is a specification question and is not part of this amendment; it waits for the user's decision.
**Impact**: T011 and T012 run in Build, then Verify runs again. Phase Verify stays Pending until AC-007 is decided.
```
