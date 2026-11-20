# Progress — Claude Code templates (F-05)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 7 stories, 40 criteria, all [auto]; re-specified from the final schema (`pipeline-schema.md`) and approved by the user |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 19 tasks (T001 to T019); 40 criteria, all covered |
| Build    | 🔄 In Progress | 2026-11-19 | 1 of 19 tasks committed |
| Verify   | ⏳ Pending |  | Not yet run |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Flow steps: every block of the walk is a numbered step, Start first and End last; a Condition step carries its check and routes; route text names the step numbers | 1 blocker (Conditions not steps), 1 warning (stop wording), 2 suggestions fixed | task check passed: core 965 of 965 (44 files), api 6 of 6, web 4 of 4 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/packages/core/src/pipeline/generate/values-flow.ts` (`flowConditions`, `routeLines`): a Condition's true and false routes are written both in its step (`flowSteps`, AC-012) and in its numbered rule (`flowConditions`). Kept on purpose: AC-013 requires the retry rule, and the F-04 AC-016 rule tests assert it. T011 may narrow the rules section to retries when it writes the layout.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Not yet run.

---

## Amendments

### Amendment — 2026-11-19
**Changed**: The earlier F-05 build (tasks T001 to T013, verified 2026-11-17) is replaced. Its layouts were removed by the reset in commit `9c86eb5`, and its task log, deferred findings and test results were cleared here at Plan approval. They remain in git history before commit `bc8f671`.
**Reason**: The pipeline schema changed (decision 38, `spec/documents/pipeline-schema.md`): Approval and Check blocks, connection labels and gates between flows were removed. The earlier stories and plan described that model.
**Impact**: Build restarts from T001 with the 19 tasks of the approved plan.
