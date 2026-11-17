# Progress — Structural checks (F-03)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 6 stories, 30 criteria, all `[auto]`; approved by the user. Decision 34 recorded in `architecture.md` §6 |
| UX       | ➖ Not needed |      | No user interface: pure functions in `source/packages/core` |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-16 | 0 of 8 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

---

## Test Results

_Filled in by the Verify phase._

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```

### Decisions taken during Specify (2026-11-16)

- **Disabled items:** the owner decided that blocks and flows have no enabled property at all. Recorded as `architecture.md` §6 decision 34; §12 and §3 updated; the switch-off footer removed from `ui.md` §3.4 and `features.md` F-12.
- **Iteration-source warning:** not in F-03. Decision 29 supersedes it, although decision 10 still lists it.
- **Pipeline start:** read as the Start of the first flow, because the model has no pipeline-level blocks (decisions 30 and 33).
