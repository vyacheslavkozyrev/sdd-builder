# Progress — Generator Core (F-02)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-11 | Stories re-specified for the workflow model (34 criteria); approved by the user; committed (33e8859). |
| Plan     | ✅ Complete | 2026-11-11 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-11 | 12 of 18 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Vitest test runner and `test` script; task check fixed to detect the script | self-review: no findings | 1 passed |
| T002 | Model replaced: workflows, steps, gates, routes, conditions, map, custom steps; flat catalog removed until T003 | self-review: no findings | 3 passed, typecheck clean |
| T003 | Default steps, workflows and map for Specify, Implement, Verify, Release. A condition after a disabled step is dropped, not refused | self-review: no findings | 8 passed (cumulative) |
| T004 | InvalidConfigError with all problems; TemplateError; TemplateSource interface and in-memory source | self-review: no findings | 12 passed (cumulative) |
| T005 | Duplicate ids across workflows, catalog steps and custom steps; default workflow ids renamed to implement-cycle, verify-feature, release-project (display names unchanged) | self-review: no findings | 16 passed (cumulative) |
| T006 | Unknown workflows, steps and conditions' steps; connections to disabled workflows; map cycles. Default Release workflow enabled (the reference process releases) | self-review: no findings | 23 passed (cumulative) |
| T007 | Outputs wired; routes stay in the workflow; fail routes go back, pass routes go forward; no route into a disabled step; conditions after disabled steps are dropped | self-review: no findings | 31 passed (cumulative) |
| T008 | Required workflows (specify, implement-cycle, verify-feature), required steps and gates from the catalog, fixed gate types, positive integer round limits, custom steps never required. Fixture `withDefaults` for tests that change workflows | self-review: no findings | 41 passed (cumulative) |
| T009 | Workflows in map order with tab order as tie-break; steps in tab order, disabled steps dropped; conditions after disabled steps not selected | self-review: no findings | 46 passed (cumulative) |
| T010 | Project placeholder values; one-pass substitution; no value and unknown placeholders refused (the unknown-name rule of AC-026 is here, not in T011) | self-review: no findings | 51 passed (cumulative) |
| T011 | Conditional sections by step state; nested, unclosed, mismatched, orphan and unknown-step markers refused; malformed markers refused before values are inserted; template pipeline `renderTemplate` | self-review: no findings | 60 passed (cumulative) |
| T012 | `workflow-<id>.md` from a workflow template: numbered steps in tab order with their files, scope and iteration source. Placeholders `workflow.name`, `workflow.id`, `workflow.scope`, `workflow.steps`, `workflow.rules` (rules text arrives with T013) | self-review: no findings | 65 passed (cumulative) |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
