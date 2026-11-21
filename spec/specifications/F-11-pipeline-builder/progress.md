# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | 8 stories, 45 criteria: 39 `[auto]`, 6 `[device]`; re-specified from the final schema (`pipeline-schema.md`) and approved by the user. Flow checks removed from the panel; rule tags kept; Delete connection kept; pipeline panel (arguments and body) added as US-008 (user decisions, 2026-11-20) |
| UX       | ✅ Complete | 2026-11-20 | Approved by the user at the committed screens (`5dd262d`, 2026-11-19 revision; earlier 2026-11-20 redraw reverted at the user's request). Stories changed to match them (US-008, AC-035 and AC-045, option 1). Screens 11 to 13 and the review fixes were not kept. Three states have no screen: the delete-connection confirmation and the refused flow name and body (proved by tests), and the red blocker box (Verify checklist) |
| Plan     | ✅ Complete | 2026-11-20 | Approved by the user; 23 tasks (T001 to T023), written from the stories and the approved screens |
| Build    | 🔄 In Progress | 2026-11-20 | 5 of 23 tasks committed |
| Verify   | ⏳ Pending |  | |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Builder model: tab order, `flow-N` ids, `addFlow` returning the new flow id (`source/apps/web/src/builder/model.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (test helper numbering; Pipeline tab always first test) | task check passed: api 45, web 527, core 1208 |
| T002 | Canvas layout as a pure function: boxes in list order at a 110 px pitch, arrows from `next`, empty pipeline (`source/apps/web/src/builder/layout.ts`) | 0 blockers, 3 warnings fixed (order test with names and indices that disagree; a self-comparison; the dragged-box clause untested), 3 suggestions fixed | task check passed: api 45, web 539, core 1208 |
| T003 | `connectFlows`: sets `next`; refuses with its own reason when the source or target is not a flow, the target is the source, the source already has a `next`, or the link would close a loop (`source/apps/web/src/builder/connect.ts`) | 0 blockers, 1 warning fixed (success-path test asserted only ok); 1 suggestion fixed (long line split) | task check passed: api 45, web 556, core 1208 |
| T004 | Drop rule (a left point of another flow counts) and repoint of an arrow end (target end through the T003 rules; source end moves to a flow with no next) (`source/apps/web/src/builder/connect.ts`) | 0 blockers, 1 warning fixed (no test for an unknown flow on either end); 2 suggestions fixed (check order; throw documented) | task check passed: api 45, web 578, core 1208 |
| T005 | Arrow panel data (source and target names, frozen) and `removeConnection` (clears the source's `next`, keeps the rest) (`source/apps/web/src/builder/panel.ts`, `connect.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (duplicate type alias; untyped index in a test) | task check passed: api 45, web 596, core 1208 |

_The records of the earlier build (T001 to T020 of the connection model, its Deferred Findings and its Test Results) were removed at the 2026-11-20 re-plan. They remain in git history before commit `4c6e642`._

---

## Deferred Findings

_None for the 2026-11-20 build._

---

## Test Results

_Recorded per task in the Task Log and in the commit messages. Verify results come at the Verify step._

---

## Amendments

### Amendment — 2026-11-17 (Verify failure: connections not visible; owner request for connection points)
**Changed**: `plan.md` adds T019 (visible connections: explicit connection points on each box, verified in a real browser) and T020 (drag from one flow's connection point to another's to create a connection, with the label asked first).
**Reason**: at Verify the owner reported no connection arrows in the app (top priority) and asked for connection points on the box sides, so that a connection is made by dragging between them. The arrows were never checked in a browser; the jsdom tests cannot draw React Flow edges.
**Impact**: Build reopens for T019 and T020. Verify is re-run after them. Stories AC-008 (visible) and AC-013 (UI) cover the work; AC-012 gains the connection-point drag.

### Amendment — 2026-11-17 (T015 file name)
**Changed**: `plan.md` T015 names its view `MarkViews.tsx` and its test `MarkViews.test.tsx`, not `Marks.tsx`. `marks.ts` (T009) stays the pure function.
**Reason**: on the case-insensitive filesystem, `./Marks.js` resolves to `marks.ts`. Owner decision (option a).
**Impact**: T015 only. T016 to T018 are unchanged.

### Amendment — 2026-11-17
**Changed**: `plan.md` adds task T013a (pipeline arguments row editor), after T013. Owner decision.
**Reason**: T013 shows the pipeline arguments read-only. AC-027 requires that an accepted edit updates the value, and screen 09 designs the row editor; no task covered it.
**Impact**: T013a runs before T014. T014 to T018 are unchanged.
```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
