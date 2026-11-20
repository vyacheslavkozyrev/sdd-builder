# Progress — Project step (F-09)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | re-specified after the 2026-11-19 reset: 17 criteria, 16 `[auto]`, 1 `[device]`; approved by the user as written |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user; screens in `spec/design/features/F-09-project-step/` on the F-08 frame. Name help line resolved 2026-11-20 (screen 01 as drawn; AC-016 `[auto]`, AC-017 `[device]`). Limit note styling kept as drawn |
| Plan     | ✅ Complete | 2026-11-20 | Approved by the user; re-planned after the reset: 4 tasks, all `[Web]`, on the current F-08 wizard (F-02 to F-13 code removed in `58ef413`) |
| Build    | 🔄 In Progress | | 1 of 4 tasks committed |
| Verify   | ⏳ Pending |  | runs after all tasks are committed |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

_Restarted after the 2026-11-19 reset. The rows of the earlier build (T001 to T005 of 2026-11-17) are in git history at `59a9be3`, `spec/specifications/F-09-project-step/progress.md`._

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Project text rules as pure functions: name 100 and idea 5,000 code-point limits, truncation that never splits a surrogate pair, counter text `N / 5,000`, `ideaForConfig` trim | 0 blockers, 1 warning fixed (AC-011 no-mutation test could not fail; removed), 2 suggestions fixed (lone-surrogate check made real; AC-003 table-driven) | task check passed: api 45, web 223, core 1208 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `source/apps/web/test/project.test.ts` AC-011: the "stored value is not changed" clause cannot be shown by a test of a pure function on an immutable string. Not applied: the guarantee belongs to the wizard value the step holds, so it is tested at the state or step level (T002, T003).

---

## Test Results

_Criteria coverage matrix and manual checklist outcome. Filled at Verify, after all tasks are committed._

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
