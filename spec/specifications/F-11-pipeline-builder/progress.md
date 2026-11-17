# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 8 stories, 42 criteria: 37 `[auto]`, 5 `[device]`; approved by the user |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user; two owner decisions applied (new connections by drag from the Connection tool; a refused value reverts to the saved value) |
| Plan     | ✅ Complete | 2026-11-17 | Approved by the user before any code is written (18 tasks; two open points decided: flow name free text with a fixed file-safe id; a second arrow from a flow refused) |
| Build    | 🔄 In Progress | 2026-11-17 | 4 of 18 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Builder model: tab order, next free flow id (skips ids and names, owner decision), addFlow, boxes and connections (`source/apps/web/src/builder/model.ts`) | 0 blockers; 1 warning fixed (owner decision, option 1); 1 suggestion fixed | task check passed: api 57, web 324, core 1017 |
| T002 | Canvas layout as a pure function: boxes left to right in pipeline order, 160 px pitch, no change to the pipeline value (`source/apps/web/src/builder/layout.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (a self-comparison and a repeated AC-010 test removed) | task check passed: api 57, web 330, core 1017 |
| T003 | `connectFlows`: non-blank artifact label (AC-013), target and source must be in the pipeline, a flow refused a second arrow (open point 2), a flow refused a connection to itself (`source/apps/web/src/builder/connect.ts`) | 0 blockers; 1 warning fixed (self-connection refused, architecture §12 no cycle); 2 suggestions fixed (test names) | task check passed: api 57, web 342, core 1017 |
| T004 | Repoint a connection end (target, or the source moving the whole arrow); removeConnection; connectionConfirmation data (`source/apps/web/src/builder/connect.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (test names and import order) | task check passed: api 57, web 359, core 1017 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 WARNING (resolved, owner decision 2026-11-17, option 1) `source/apps/web/src/builder/model.ts` `addFlow`: the new flow's name is its id, which clashed when an existing flow already had that name. `nextFlowId` now skips any N whose `flow-N` is used as an id or a name (AC-003, AC-029); covered by `builder-model.test.ts` "F-11 AC-003 skips a number that another flow uses as its name" and "gives the new flow a name that no other flow has".

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
