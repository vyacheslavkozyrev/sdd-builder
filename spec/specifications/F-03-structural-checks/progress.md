# Progress — Structural checks (F-03)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 6 stories, 30 criteria, all `[auto]`; approved by the user. Decision 34 recorded in `architecture.md` §6 |
| UX       | ➖ Not needed |      | No user interface: pure functions in `source/packages/core` |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-16 | 6 of 8 tasks committed |
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
| T006 | Check routes and retries: a route to the Check itself refused; a back route with no `roundLimit` is a warning (`analyze/routes.ts`); T005's AC-014 cases given `roundLimit: 2` so only the loop rule is tested | 0 blockers, 0 warnings; 1 suggestion fixed (duplicate AC-017 case removed) | task check passed: core 511, api 6, web 3 |
| T005 | Loops among Connections: depth-first search over block Connections per flow and flow Connections of the pipeline; one blocker at the closing Connection; Check routes not in the graph (`analyze/cycles.ts`) | 0 blockers, 0 warnings; 1 suggestion fixed (iterative search, no recursion per block) | task check passed: core 496, api 6, web 3 |
| T004 | Flow links and rule tags: a flow's `connectedTo` must name a flow of the pipeline; rule tags on the pipeline, flows and agents must name a rule (`analyze/references.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (shared position type; a test title made exact) | task check passed: core 481, api 6, web 3 |
| T003 | Block and route references: a block's `connectedTo` and a Check's true and false routes must name a block of their own flow, or stop (`analyze/references.ts`); T002's AC-004 test isolated so only the End rule fires | 0 blockers, 0 warnings; 1 suggestion fixed (id sets built once per call) | task check passed: core 466, api 6, web 3 |
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
