# Progress — Generator core (F-04)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 6 stories, 33 criteria, all `[auto]`; approved by the user. Scope: core generator only (planning, reply check, refusals); the templates text, the model call and the analyzer rewiring are later features |
| UX       | ➖ Not needed | 2026-11-16 | No user interface: a pure generator in `source/packages/core` |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user |
| Build    | ✅ Complete | 2026-11-16 | 13 of 13 tasks committed (T011 to T013 by the Verify amendments) |
| Verify   | ✅ Complete | 2026-11-17 | 33 of 33 criteria covered by passing [auto] tests; no [device] criteria |

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
| T012 | Test: planning a flow-less pipeline returns the no-flow blocker and no files (AC-020 planning clause); test-only | 0 blockers, 1 duplication fixed (test helper) | task check passed: core 738 of 738, web 3 of 3, api 6 of 6 |
| T013 | Test: a reordering that leaves a flow unreached is refused and plans no file (AC-007 refusal clause); test-only | 0 blockers, 1 warning fixed (exact problem list) | task check passed: core 739 of 739, web 3 of 3, api 6 of 6 |

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

Verify run 4 (final) on 2026-11-17 on `main` (clean tree, all 13 tasks ticked, Current Task None, HEAD 3abdd96). `source/scripts/task-check.sh` passed (exit 0): typecheck clean; core 739 of 739 (37 files), web 3 of 3 (2 files), api 6 of 6 (3 files); total 748 of 748. The AC-007 tests ran by name: 6 of 6 passed. Test files are under `source/packages/core/test/pipeline/` unless a path is given.

All 33 criteria are `[auto]`; none is `[device]`, so there is no manual checklist.

Result: 33 of 33 criteria proven. No gap remains. Verify is complete.

The AC-007 refusal clause (run 3's gap G1) is now proven by the `F-04 AC-007` case in `plan-files.test.ts` (line 249): reversing two flows so that `alpha` is no longer reached gives `{ ok: false }`, exactly one reachability blocker at `pipeline.flows[1]`, and no `files`. No other criterion changed status.

| Criterion | Test file | Status |
| --- | --- | --- |
| AC-001 | `plan-files.test.ts` | Pass |
| AC-002 | `plan-files.test.ts` | Pass |
| AC-003 | `plan-files.test.ts` | Pass |
| AC-004 | `plan-files.test.ts` | Pass |
| AC-005 | `plan-default.test.ts` | Pass |
| AC-006 | `plan-files.test.ts` | Pass (unsafe paths tested on base files only; see note) |
| AC-007 | `plan-files.test.ts` (order and refusal), `plan-determinism.test.ts` (order) | Pass (refusal clause: F-04 AC-007 case in `plan-files.test.ts`, T013) |
| AC-008 | `plan-determinism.test.ts` | Pass |
| AC-009 | `plan-determinism.test.ts` | Pass |
| AC-010 | `plan-determinism.test.ts` | Pass |
| AC-011 | `plan-command.test.ts`, `plan-entries.test.ts` | Pass |
| AC-012 | `plan-command.test.ts`, `render.test.ts` | Pass |
| AC-013 | `plan-entries.test.ts`, `render.test.ts` | Pass |
| AC-014 | `plan-entries.test.ts`, `render.test.ts` | Pass |
| AC-015 | `plan-command.test.ts` | Pass |
| AC-016 | `config-problems.test.ts` | Pass |
| AC-017 | `plan-files.test.ts` | Pass (no-render clause proven by T011) |
| AC-018 | `config-problems.test.ts` | Pass |
| AC-019 | `generated-names.test.ts`, `plan-files.test.ts` | Pass |
| AC-020 | `config-problems.test.ts` | Pass (planning clause proven by T012) |
| AC-021 | `plan-files.test.ts` | Pass |
| AC-022 | `reply-check.test.ts` | Pass |
| AC-023 | `reply-check.test.ts` | Pass |
| AC-024 | `reply-check.test.ts` | Pass |
| AC-025 | `reply-check.test.ts` | Pass |
| AC-026 | `reply-check.test.ts`, `reply-check-text.test.ts` | Pass |
| AC-027 | `reply-check-text.test.ts` | Pass |
| AC-028 | `reply-check-text.test.ts` | Pass |
| AC-029 | `reply-check.test.ts`, `reply-check-text.test.ts` | Pass |
| AC-030 | `reply-check-text.test.ts` | Pass |
| AC-031 | `namespace.test.ts` | Pass |
| AC-032 | `purity.test.ts` | Pass |
| AC-033 | `plan-fixed-templates.test.ts` | Pass |

Notes (not counted as gaps):

- AC-006 says every planned path is file-safe. The check runs on every planned path in one loop (`plan.ts`), but the tests only pass unsafe paths through the base files. Rule, agent and command paths are not tested with unsafe ids.
- AC-017 no-render proof (`plan-files.test.ts`, "F-04 AC-017 refuses a blocked config before any layout is rendered"): a blocked config whose command layout holds `{{nope}}` returns the blockers and no `files`, while the same layout on a valid config throws (control).
- AC-020 planning proof (`config-problems.test.ts`, "F-04 AC-020 planning a pipeline with no flows returns the no-flow blocker and no files"): `planGeneration` on a flow-less pipeline returns exactly `{ ok: false, problems: [no-flow blocker] }` with no `files` property.

---

## Amendments

```
### Amendment — 2026-11-17 (Verify)
**Changed**: `plan.md` gains T011 and T012 (test-only). No story changed.
**Reason**: Verify (test agent, verify mode) found two missing proofs: AC-017 does not prove that a refused config renders no layout (T011); AC-020 does not prove that planning a flow-less pipeline returns no files (T012). A third gap, AC-007's flow-order wording, is a specification question and is not part of this amendment; it waits for the user's decision.
**Impact**: T011 and T012 run in Build, then Verify runs again. Phase Verify stays Pending until AC-007 is decided.

### Amendment — 2026-11-17 (Verify, final run)
**Changed**: `plan.md` gains T013 (test-only). AC-007's wording was narrowed by the user's decision (the spec change is committed in 41fcebb).
**Reason**: the final Verify run found that AC-007's refusal clause ("a reordering that leaves a flow unreached is refused, not planned") has no test named `F-04 AC-007`.
**Impact**: T013 runs in Build, then Verify runs again.
```
