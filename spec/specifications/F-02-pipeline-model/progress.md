# Progress — Pipeline model and the default pipeline (F-02)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 10 stories, 35 criteria, all `[auto]`; approved by the user. Schema recorded as `architecture.md` §6 decision 33 |
| UX       | ➖ Not needed | 2026-11-16 | No user interface: a model, a parser and a JSON file |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-16 | 1 of 13 tasks committed |
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
| T001 | Model types and primitive checks (decision 33 types; value rules of AC-021, AC-024 to AC-026). Built as one commit of about 440 changed lines by the user's decision, size guard waived for this task | 0 blockers, 2 warnings fixed (body cap reads at most 2,000 units; sparse list holes refused), 1 suggestion fixed (shared-rule tests not claimed as criteria) | task check passed: core 85, api 6, web 3 |

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
