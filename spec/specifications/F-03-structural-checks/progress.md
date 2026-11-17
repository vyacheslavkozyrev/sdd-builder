# Progress — Structural checks (F-03)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 6 stories, 30 criteria, all `[auto]`; approved by the user. Decision 34 recorded in `architecture.md` §6 |
| UX       | ➖ Not needed |      | No user interface: pure functions in `source/packages/core` |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-16 | 2 of 8 tasks committed |
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
| T002 | Flow rules: one Start per flow (second Start refused), at least one End, empty flow gets both, pipeline with no flow refused (`analyze/start-end.ts`) | 0 blockers; 1 warning fixed (empty-flow test now checks which finding is the Start and which the End); 0 suggestions | task check passed: core 456, api 6, web 3 |
| T001 | Finding type (`Severity`, `Finding`, `LocatedFinding`), `analyzeStructure` with the fixed sort (flow, block, rule, path) and the fixture `analyze-fixture.ts` | 0 blockers; 2 warnings fixed (AC-026 test could not fail, config now frozen; AC-027 test name overstated); 3 suggestions fixed | task check passed: core 449, api 6, web 3 |

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
