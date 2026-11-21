# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | 8 stories, 45 criteria: 39 `[auto]`, 6 `[device]`; re-specified from the final schema (`pipeline-schema.md`) and approved by the user. Flow checks removed from the panel; rule tags kept; Delete connection kept; pipeline panel (arguments and body) added as US-008 (user decisions, 2026-11-20) |
| UX       | ✅ Complete | 2026-11-20 | Approved by the user at the committed screens (`5dd262d`, 2026-11-19 revision; earlier 2026-11-20 redraw reverted at the user's request). Stories changed to match them (US-008, AC-035 and AC-045, option 1). Screens 11 to 13 and the review fixes were not kept. Three states have no screen: the delete-connection confirmation and the refused flow name and body (proved by tests), and the red blocker box (Verify checklist) |
| Plan     | ✅ Complete | 2026-11-20 | Approved by the user; 23 tasks (T001 to T023), written from the stories and the approved screens |
| Build    | 🔄 In Progress | 2026-11-20 | 13 of 23 tasks committed |
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
| T006 | Flow name, description, body and model through the parser: edit on a copy, parser decides, refusal reason kept; core flow body made non-blank (owner decision, see Amendments) (`source/apps/web/src/builder/fields.ts`, `source/packages/core/src/pipeline/parse/flow.ts`) | 0 blockers; 2 warnings fixed (duplicate-name test asserted only refusal; schema doc body rule); 1 suggestion fixed (AC-028 expected reason) | task check passed: api 45, web 625, core 1211 |
| T007 | Flow argument rows (add, edit, remove; the parser decides, id unique project-wide) and rule tag rows (must name a rule of the project) (`source/apps/web/src/builder/fields.ts`) | 0 blockers, 0 warnings; 3 suggestions fixed (duplicate rule-tag pre-check removed; comment; a test) | task check passed: api 45, web 662, core 1211 |
| T008 | Flow outcome artifacts: add, edit (label and template as separate fields), remove; refused edits keep the saved values; remove and label edits follow the parser's End rule (`source/apps/web/src/builder/fields.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (header width; label limit test) | task check passed: api 45, web 685, core 1211 |
| T009 | Human approval flag: `setFlowApproval` changes only `approval`, through the parser path (`source/apps/web/src/builder/fields.ts`) | 0 blockers, 0 warnings; 1 suggestion fixed (test title for a programmer error) | task check passed: api 45, web 695, core 1211 |
| T010 | Delete flow (logic): removes the flow with its owned parts, clears `next` where it named the flow, renumbers the rest; last flow may go; unknown id throws (`source/apps/web/src/builder/delete.ts`) | 0 blockers; 1 warning fixed (surviving flows kept stale index) | task check passed: api 45, web 709, core 1211 |
| T011 | Structure marks: analyzer findings placed on a flow box, an arrow or none; blocked flows; no disabled controls; new-flow marks (`source/apps/web/src/builder/marks.ts`) | 0 blockers; 2 warnings fixed (AC-038 missing End not tested; blocker kinds not proven on the box); 1 suggestion fixed (unused parameter) | task check passed: api 45, web 726, core 1211 |
| T012 | Selection and panel choice: `panelFor` (pipeline, flow, arrow); after a confirmed delete the selection is the pipeline and the tab is Pipeline (`source/apps/web/src/builder/panel.ts`) | 0 blockers; 2 warnings fixed (delete rule not conditional; vacuous one-item tests); 1 suggestion fixed (type import) | task check passed: api 45, web 739, core 1211 |
| T013 | Pipeline-level fields through the parser: name, description, model, tools, rule tags, body, arguments rows; `fields.ts` refactored to share the holder helpers with the flow functions (`pipelineFields.ts`, `fields.ts`) | 0 blockers; 1 warning fixed (id-clash test did not prove the reason); 6 suggestions fixed. Size: 831 changed lines, accepted by the user as a one-off exception to the 400-line guard | task check passed: api 45, web 776, core 1211 |

_The records of the earlier build (T001 to T020 of the connection model, its Deferred Findings and its Test Results) were removed at the 2026-11-20 re-plan. They remain in git history before commit `4c6e642`._

---

## Deferred Findings

- T007 `source/packages/core/src/pipeline/check/ids.ts` (AC-024 wording): AC-024 and AC-043 say an argument id is unique within its flow or pipeline; decision 18 and the parser make it unique project-wide. The builder follows the parser (kept on review). The stories wording needs an amendment by the owner; not a code change.

- T011 `source/apps/web/src/builder/marks.ts` (AC-034, AC-035, AC-036): a flow's body or name blocker marks its box red (AC-034) and its message is listed under "Not on a drawn item" (AC-036 names a flow missing its body). AC-035 says a blocker's message shows as a notification at the top centre. Read together, the body and name blocker messages are not shown as a notification. Kept as the implementer decided (AC-036 is the more specific rule); the owner should confirm the wording in stories.md. Not a code change in T011.

_Otherwise none for the 2026-11-20 build._

---

## Test Results

_Recorded per task in the Task Log and in the commit messages. Verify results come at the Verify step._

---

## Amendments

### Amendment — 2026-11-20 (T006 blank flow body)
**Changed**: `source/packages/core/src/pipeline/parse/flow.ts` reads the flow body as non-blank (owner decision: the parser refuses a blank body, AC-022). The body keeps its 1000-code-point limit and the parser's message style.
**Reason**: AC-022 requires a blank body to be refused with the reason; the parser accepted it, so the web edit could save a blank body.
**Impact**: F-02 and F-03 tests touched: `flow.test.ts` (blank body refusal added), `analyze-text.test.ts` (blank body cases comment on being built without the parser; they still prove the analyzer blocker). Nothing else.

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
