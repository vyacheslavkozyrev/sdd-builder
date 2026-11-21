# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | 8 stories, 45 criteria: 39 `[auto]`, 6 `[device]`; re-specified from the final schema (`pipeline-schema.md`) and approved by the user. Flow checks removed from the panel; rule tags kept; Delete connection kept; pipeline panel (arguments and body) added as US-008 (user decisions, 2026-11-20) |
| UX       | ⏳ Pending |  | reset 2026-11-20: the screens of 2026-11-19 predate US-008 and the blocker and refusal placement of the stories (top-centre notification, Not on a drawn item); revise to the stories, then approval |
| Plan     | ⏳ Pending |  | reset 2026-11-19: to be re-specified from the final schema and architecture |
| Build    | ⏳ Pending |  | 0 tasks committed (reset) |
| Verify   | ⏳ Pending |  | reset 2026-11-19: to be re-specified from the final schema and architecture |

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
| T005 | Gates on arrows: `addGate` for an approval or a check, refusal texts from the parser, one gate per arrow (`source/apps/web/src/builder/gates.ts`) | 0 blockers; 2 warnings fixed (a total typed gate with no unreachable fallback; a test for a problem elsewhere in the pipeline); 2 suggestions fixed; 1 suggestion deferred | task check passed: api 57, web 382, core 1017 |
| T006 | Remove a gate (only the gate key goes; the arrow stays); no routing field on a gate or an arrow (`source/apps/web/src/builder/gates.ts`) | 0 blockers; 2 warnings fixed (connection test asserted an exact key list; removal test had no blocks); 4 suggestions fixed | task check passed: api 57, web 391, core 1017 |
| T007 | Field edits through the parser: `applyPipelineField` and `applyFlowField`, the flow name's uniqueness, body limit through the parser (`source/apps/web/src/builder/fields.ts`) | 0 blockers; 2 warnings fixed (two assertions passed on a refusal; the name comparison rule had no test); 3 suggestions fixed (reason checks for tools and rule tags; comments on the throw and the comparison); 1 suggestion deferred | task check passed: api 57, web 423 (fields.test.ts 32), core 1017 |
| T008 | Delete a flow: `deleteFlow` removes the flow, its outgoing and incoming arrows and gates, and returns them for the confirmation; the last flow may go; an unknown id refused (`source/apps/web/src/builder/delete.ts`) | 0 blockers; 1 warning fixed (a test that did not prove other flows unchanged); 1 suggestion fixed (self-arrow edge case) | task check passed: api 57, web 441, core 1017 |
| T009 | Structure marks from `analyzeStructure`: placed on a box, an arrow or 'Not on a drawn item'; severity; the rule list mapped from step 2 with the F-10 rule-id function (`source/apps/web/src/builder/marks.ts`) | 0 blockers; 1 warning fixed (AC-038 test could not fail); 2 suggestions fixed (a rule tag on the pipeline; a helper for the placement) | task check passed: api 57, web 457, core 1017 |
| T010 | Selection and panel content: `panelFor` for the pipeline, a flow and an arrow; the toolbox list (Connection, Approval, Check); no switch-off (`source/apps/web/src/builder/panel.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (test fixture helper; AC-034 checks field keys); AC-026 corrected to the flow id | task check passed: api 57, web 472, core 1017 |
| T011 | Wizard values for step 3: `pipeline` in the wizard state from the default pipeline (copied per state), reset by New project (`source/apps/web/src/wizard/state.ts`) | 0 blockers; 1 warning fixed (the no-network-call test did not stub the network); shape-only fixture updates in F-08, F-10 and App/Wizard tests | task check passed: api 57, web 478, core 1017 |
| T012 | Pipeline tab shell: tab row (Pipeline first, a tab per flow, + after the last), the flow placeholder, no remove control (`source/apps/web/src/builder/PipelineTabs.tsx`) | 0 blockers; 2 warnings fixed (the + test did not exercise + ; a test name that did not match its test); 1 suggestion deferred (tab ARIA to T017) | task check passed: api 57, web 491, core 1017 |
| T013 | Properties panel and toolbox UI: panel fields and edits, refusals revert to the saved value with the reason beneath, body counter, Delete-only footer, toolbox (`PropertiesPanel.tsx`, `Toolbox.tsx`) | 0 blockers; 2 warnings fixed (arrow heading 'Connection' as on the screens; AC-027 tests for Enter, a parser flow-name refusal and a multi-line body); 2 suggestions fixed. Size: 746 insertions, over the 400 guard; committed as one commit on the owner's instruction. Open: pipeline arguments are read-only, so AC-027 for arguments needs a task (plan amendment pending) | task check passed: api 57, web 518, core 1017 |
| T013a | Pipeline arguments row editor: rows with Add, Edit and Remove, each edit through `applyPipelineField` 'arguments'; a refused edit keeps the saved row with the reason beneath it; a repeated id names the row that uses it (`source/apps/web/src/builder/ArgumentRows.tsx`) | 0 blockers; 2 warnings fixed (the AC-034 assertion narrowed to a delete name, so it no longer proved no switch-off; a flow's arguments as text had no test); 1 suggestion fixed (Cancel clears the refusal of a new row); 2 suggestions deferred. Size: 30 changed lines in the fix | task check passed: api 57, web 529, core 1017 |
| T015 | Structure marks and the empty state: `MarkViews.tsx` (a mark beside its box or on its arrow, the "Not on a drawn item" section, the screen 06 and 11 notes), `arrowMarksBySource` in `marks.ts`, the empty state "No flows yet." (`Canvas.tsx`). Marks are the analyzer's findings; a blocker disables nothing | 0 blockers; 2 warnings fixed (arrow mark wiring in Canvas had no test: moved to `arrowMarksBySource` and tested; screen 06 and 11 notes were missing: added); 3 suggestions fixed (the warning test now asserts the analyzer's output; a fixture that was not mark-free; long test lines and a prop type). Size: 427 lines staged, plus the fixes; size guard waived by the owner | task check passed: api 57, web 579, core 1017 |
| T014 | Canvas with React Flow: boxes, arrows with labels and gates, pan and select, box drag, repoint by reconnect, Connection, Approval and Check drops, scroll strip, captions and empty state (`Canvas.tsx`, `drawing.ts`, `Toolbox.tsx`) | 1 blocker fixed (React Flow passes the fixed end; the reconnect mapping was reversed); 5 warnings fixed (scroll strip, captions, empty state, drop-on-empty test, alert text); 2 suggestions fixed; 3 deferred. Size: 1052 lines, committed as one on the owner's instruction. Device checks at Verify: AC-011, AC-012, AC-022, AC-024 | task check passed: api 57, web 563, core 1017 |
| T016 | Button paths and confirmations: the arrow's Add approval, Add check, Remove gate, Source flow and Target flow pickers, Delete connection with its confirmation; the flow's Connect to next flow with its artifact label, and Delete flow with its confirmation naming the arrows and gates (`ButtonPaths.tsx`, `ConfirmDialog.tsx`, `GateForm.tsx`, `drawing.ts`) | 0 blockers; 1 warning fixed (a threshold typed under diff size and kept on checks was dropped, not refused: `gateRequestFor` passes it on, AC-018); 2 suggestions fixed (`GateForm` moved out of `Canvas.tsx` so the panel does not load the canvas; a test for a flow with no connections). Size: 749 lines staged; size guard waived by the owner; committed as one on the owner's instruction | task check passed: api 57, web 603, core 1017 |
| T017 | Step 3 wiring: PipelineStep on step 3 (tabs, toolbox, canvas, panel, selection), reports every change through onUpdate, delete flow clears the selection, rulesFor passed to the canvas, privacy scan extended (`PipelineStep.tsx`, `Wizard.tsx`, `App.tsx`) | 0 blockers; 1 warning fixed (the privacy scan missed WebTransport, EventSource, cookies, caches, storage); 1 suggestion fixed; 2 deferred. Size: 410 changed lines, committed as one on the owner's instruction. Tests: api 57, web 616, core 1017 | task check passed: api 57, web 616, core 1017 |
| T018 | `ui.md` §3 updated: flow ids and names, automatic layout with no saved positions, connect by drag and by button, one arrow per flow, refusals keep the saved value, 'Not on a drawn item', body limit 1000 (`spec/documents/ui.md`) | docs only; 0 blockers; ui.md §4 and §6 still say 1,000 (owner to align) | task check passed: api 57, web 616, core 1017 |
| T019 | Visible connections: memoised nodes and edges (the cause: new arrays on each render stopped React Flow measuring the edges); arrow look for selected and unselected; box 100 x 76 (`Canvas.tsx`, `drawing.ts`) | 0 blockers; 2 warnings fixed (selected arrow look; box and arrow look tests); 1 suggestion fixed. Browser check at 1280 x 800: 5 arrows drawn with arrowheads, no console errors. Gates are text in the label, not diamonds (deferred to the owner) | task check passed: api 57, web 617, core 1017 |
| T020 | Connection points: a drag from a flow's right point to another's left point asks the label, then connectFlows; arrow-end repoint wired with onReconnect (`Canvas.tsx`) | 1 blocker fixed (the arrow-end repoint never started: onReconnect was missing); 1 warning fixed (wiring tests); 0 suggestions. Owner decision open: a loop (A to B to A) is accepted and flagged as a blocker by the analysis. Device checks at Verify | task check passed: api 57, web 626, core 1017 |

---

## Deferred Findings

- T016 open item 1 (from the implementer): the gate form is shared by Add approval and Add check, so it shows the check's fields. Screen 03's approval hint ("Approval: say what the person approves.") is not shown. Owner decision needed on the form.
- T016 open item 2 (from the implementer): refusal wording comes from gates.ts, connect.ts and repointConnection, and differs from the screens (screen 02 "Refused: this arrow already has a gate. Remove it first." vs. the code's "This arrow already has a gate. An arrow holds one gate: remove the existing gate first."). A wording task or a screen update is needed.
- T016 open item 3 (from the implementer): screen 01 still shows the old button-only toolbox hint. The implemented hint follows the owner decision (drag, then the button path). Screen 01 should be redrawn.
- T016 open item 4 (from the implementer): the AC-018 row "checks with a threshold is refused" cannot be reached in the DOM, because the threshold field is hidden for checks. It is covered by gates.test.ts.
- T016 open item 5 (from the implementer): arrow-panel refusals use role="alert" under the buttons; picker and label refusals use the field's helper text. Consistent with the screens? Owner to check at Verify.
- T016 open item 6 (from the implementer): the flow Delete confirmation is raised in the panel and calls onDelete(flowId) only on Confirm. The caller (T017 wiring) must remove the flow and clear the selection.

_Review suggestions intentionally not applied, with the reason._

- T001 WARNING (resolved, owner decision 2026-11-17, option 1) `source/apps/web/src/builder/model.ts` `addFlow`: the new flow's name is its id, which clashed when an existing flow already had that name. `nextFlowId` now skips any N whose `flow-N` is used as an id or a name (AC-003, AC-029); covered by `builder-model.test.ts` "F-11 AC-003 skips a number that another flow uses as its name" and "gives the new flow a name that no other flow has".
- T005 SUGGESTION `source/apps/web/src/builder/gates.ts` `rawThreshold`: a threshold in exponent form (`1e3`) is refused with the parser's message, although it is a whole number. Left as is: the form reads plain digits only, the parser's message names the rule, and accepting exponent text would make the web conversion a second number parser. Decided in review of T005; covered by `gates.test.ts` "F-11 AC-018 refuses a diff size gate with an exponent threshold, with the reason, and adds no gate".

- T006 NOTE (accepted, not a finding) `source/apps/web/src/builder/gates.ts` `removeGate`: refuses with `NO_GATE_REASON` when the arrow has no gate, rather than a no-op. Kept: the other arrow functions refuse the same way (`removeConnection`, `repointConnection` refuse with `NO_ARROW_REASON`), so the Analyze-style reasons stay uniform. Covered by `gates.test.ts` "F-11 AC-021 refuses to remove a gate from an arrow that has none, with the reason".

- T007 SUGGESTION `source/apps/web/src/builder/connect.ts` (`connectFlows`, `repointConnection`) and `gates.ts` (`addGate`, `removeGate`): an unknown flow id is a refusal there, while `fields.ts` `applyFlowField` throws. Left as is: typescript.md gives an unknown id as a programmer error (throw), and the refusals in the T003 to T005 files are outside T007. Owner to decide whether to align the earlier files to the throw or the builder to refusals. Nothing in `src` calls the T007 functions yet, so the throw is not reachable from the panel today.
- T012 SUGGESTION `source/apps/web/src/builder/PipelineTabs.tsx` `PipelineTabs`: the tabs have `role="tab"` with no `aria-controls` and no `tabpanel`, and there is no arrow-key focus movement between tabs. Left as is: the panel the tabs control (the canvas or the flow body) is wired in T017, and a link to a panel that does not exist yet would be a broken reference.
- T007 NOTE (decision, not a finding) `source/apps/web/src/builder/fields.ts` `applyFlowField`: the flow name's uniqueness compares trimmed text and is case-sensitive. Trimmed, because the blank check trims and two names that look the same on the Map clash. Case-sensitive, because a flow's file comes from its id (`.claude/commands/<id>.md`), so a case difference is not a file clash. Covered by `fields.test.ts` "F-11 AC-029 compares names after trimming" and "compares names case-sensitively".
- T013 SUGGESTION `source/packages/core/src/pipeline/check/primitives.ts` (body refusal text): the parser says "must be at most 1000 characters", while screen 09 and the counter say "1,000". Left as is: the text is the parser message, which AC-027 requires, and it is in core, outside T013. Owner may decide the format.
- T013 SUGGESTION `source/apps/web/src/builder/PropertiesPanel.tsx` (gate text): the gate lines do not match screens 02 and 03 ("Gate on this arrow", the no-gate state). Left as is: the gate controls and the no-gate state belong to T016 with the Add and Remove buttons.
- T013a SUGGESTION `source/apps/web/src/builder/ArgumentRows.tsx` (Add argument and Edit on another row): opening another row while a draft is open discards that draft with no warning. Left as is: screen 09 does not say what happens to an open draft, and a guard would change the screen behaviour; owner to decide.
- T013a SUGGESTION `source/apps/web/src/builder/fields.ts` `checkCandidate` (refusal text): the parser names an argument by its 0-based index (`Arguments at [1].id`), while the panel numbers rows from 1. Left as is: the text is the parser message that the Analyze step shows too, and changing it would split the two; owner may decide the format with the T013 body-limit text.
- T014 SUGGESTION `source/apps/web/src/builder/Canvas.tsx` (arrow label, screens 02 and 03): the arrow is one line of text (artifact, then gate), while the screens put the artifact above the arrow and the gate under its marker. React Flow measures an edge label as one SVG text, so a two-line label is a layout change. Left as is: AC-008 is met by the text, and the placement is checked on screen at Verify (AC-024 device).
- T014 SUGGESTION `source/apps/web/src/builder/gates.ts` and `connect.ts` (refusal wording): the reasons are not the screen copy ("Refused: ..." prefix, "a check needs a description: what passing means"). The reasons are shared with the panel and were set in T003 to T005, so a wording pass is outside T014. Owner to decide one format for all refusals.
- T014 SUGGESTION `source/apps/web/src/builder/Canvas.tsx` `onDrop`: a Connection tool dropped on an arrow cancels a pending source without a message. The spec names only empty canvas as the cancel. Left as is: the drop is a cancel either way, and the pending note says so.
- T015 SUGGESTION `source/apps/web/src/builder/Canvas.tsx` (`BOX_MARKS_SX`, the blocker border in `nodes`): a blocked flow box gets a red border, and the marks sit under the box in a 100 px column that may wrap into the 60 px gap. Left as is: screen 06 draws the mark beside the box and says nothing of a border; the owner decides the border at the device check at Verify (AC-035 layout).
- T015 SUGGESTION `source/apps/web/src/builder/MarkViews.tsx` (mark wording and paths): screen 06 and 11 show example texts and paths (for example `flows.build.blocks.review.routes.false`) that differ from the analyzer's messages and paths. Left as is: AC-039 requires the analyzer's output, and the screens are wireframes; the text the marks show is the analyzer's.
- T015 SUGGESTION `source/apps/web/src/builder/Toolbox.tsx` (screens 01, 06, 07, 11 hint lines: "+ adds a flow after the last tab. Start and End are not on this tab."): not in T015's plan line, and the toolbox belongs to T013. Left as is; owner to decide whether T013 or Verify adds them.
- T016 OPEN (owner input needed) implementer's open items 1 to 6: NOT RECORDED. The reviewer was not given the list, and it is in neither the repository nor the review notes. The owner must supply them; they are to be entered here as items 1 to 6, each with its owner decision.
- T016 NOTE (implementer deviation 2, wording) `source/apps/web/src/builder/connect.ts`, `gates.ts`, `ButtonPaths.tsx`: the refusal wording is left as built, as the owner decided. It is handled in the later wording task together with the T014 wording entry above.
- T016 SUGGESTION `source/apps/web/src/builder/ButtonPaths.tsx` (`ArrowActions`, gate form): a threshold typed under `diff size` stays when the type is changed to `checks`; the refusal "Threshold is not allowed on a checks gate." then shows under the buttons, although the threshold field is hidden. Left as is: AC-018 asks for this refusal, and the owner decides whether a change of type should clear the threshold instead.
- T017 SUGGESTION `source/apps/web/src/wizard/PipelineStep.tsx` (`tab`, `selection`): the open tab and the selection reset when the user leaves step 3 and comes back, because the step unmounts. Left as is: no criterion asks to keep them; the owner may decide.
- T017 NOTE (open item 6 closed) `source/apps/web/src/wizard/PipelineStep.tsx` `removeFlow`: the flow's Delete removes the flow, clears the selection and moves the tab to Pipeline (AC-031). Covered by `PipelineStep.test.tsx` "F-11 AC-031 a confirmed Delete flow removes the flow, clears the selection and moves the tab to Pipeline".
- T019 SUGGESTION `source/apps/web/src/builder/Canvas.tsx` (`ArrowEdge`, screens 01 to 03): the artifact label sits above the row of boxes, and the gate is drawn as text in the label, not as the diamond on the arrow that screen 01 draws. Left as is: the one-line label is the T014 decision (see the T014 entry above); a diamond and a label beside the arrow are a layout change for the owner and UX to decide.

- T020 OWNER DECISION `source/apps/web/src/builder/connect.ts` (`connectFlows`), the loop case: a connection that closes a cycle (A to B, then B to A, or a longer loop) is not refused on the canvas. It is added, and the analysis reports it as a structural blocker (`source/packages/core/src/pipeline/analyze/cycles.ts`, `architecture.md` §12, F-06 amendment 6). Kept as the architecture defines it: cycles are blockers, not refusals. The owner confirms or asks for a canvas refusal instead.
- T020 BLOCKER (resolved) `source/apps/web/src/builder/Canvas.tsx` (`onReconnect`, arrow-end repoint): React Flow draws an arrow's end handles only when `onReconnect` is given, so the repoint drag never started (the prop was missing before T020). Fixed with `NO_RECONNECT`; covered by `Canvas.test.tsx` "F-11 AC-012 gives React Flow an onReconnect, so an arrow end can be dragged to repoint it". The drag itself is checked on screen at Verify (AC-012 `[device]`).
- T020 WARNING (resolved) `source/apps/web/test/Canvas.test.tsx` (wiring): no test pinned `nodesConnectable`, `connectOnClick` or `onReconnect`. Added "F-11 AC-012 starts a connection only by a drag" and the onReconnect test; both fail when the prop is reverted.
- T020 SUGGESTION `spec/specifications/F-11-pipeline-builder/plan.md` (T020 line): the file list names `source/apps/web/src/builder/drawing.ts`, which this task does not change. Left as is: no code impact; correct the list at the next plan amendment.

---

## Test Results

Verify re-run, 2026-11-17, after T019 and T020, on `main`, Current Task None, all 21 plan tasks ticked. The working tree holds only the untracked `checklist.md` (not staged, per the caller).

**Test totals** (`source/scripts/task-check.sh`, passed, exit 0): typecheck clean; api 57 passed (6 files), web 626 passed (34 files), core 1017 passed (53 files). Total 1700 passed, 0 failed, 0 skipped. No `it.skip`, `test.todo`, `.only` or `describe.skip` in the sources.

**Automated coverage**: 37 of 37 `[auto]` criteria have at least one passing test named `F-11 AC-###` (291 test declarations carry an F-11 id). Gaps: none. AC-008 is `[auto]` and is covered for the arrow data (source, target, label, gate); that the arrows are drawn on screen is not provable in jsdom and is on the checklist.

**Manual criteria** (`[device]`, in `checklist.md`): AC-006, AC-011, AC-012, AC-022, AC-024. Added at re-verify: AC-008 (visible arrows, `[auto]` tag kept). AC-037 is tagged `[auto]` in `stories.md` and is covered by tests; it is also on the checklist at the caller's request.

| Criterion | Tag | Covering tests (test files) | Result |
| --- | --- | --- | --- |
| AC-001 | auto | builder-model, PipelineTabs (5 tests) | covered |
| AC-002 | auto | PipelineTabs (2) | covered |
| AC-003 | auto | builder-model, PipelineStep, PipelineTabs (11) | covered |
| AC-004 | auto | PipelineTabs (2) | covered |
| AC-005 | auto | PipelineStep, PipelineTabs (4) | covered |
| AC-006 | device | none (checklist) | manual |
| AC-007 | auto | builder-model, Canvas, drawing (5) | covered |
| AC-008 | auto | builder-model, Canvas, drawing (9); visible drawing on screen (checklist) | covered; visible check manual |
| AC-009 | auto | Canvas, drawing, layout (9) | covered |
| AC-010 | auto | layout (1) | covered |
| AC-011 | device | Canvas, drawing (10; selection and layout key) | manual |
| AC-012 | device | Canvas, drawing (11; reconnect, connection-point drag, drag connect) | manual |
| AC-013 | auto | Canvas, connect (4) | covered |
| AC-014 | auto | ButtonPaths, connect (10) | covered |
| AC-015 | auto | ButtonPaths, connect (14) | covered |
| AC-016 | auto | ButtonPaths, connect (8) | covered |
| AC-017 | auto | ButtonPaths, gates (7) | covered |
| AC-018 | auto | ButtonPaths, drawing, gates (8) | covered |
| AC-019 | auto | ButtonPaths, gates (3) | covered |
| AC-020 | auto | gates (2) | covered |
| AC-021 | auto | ButtonPaths, gates (8) | covered |
| AC-022 | device | Canvas, drawing (7; drop tests) | manual |
| AC-023 | auto | panel, PropertiesPanel (4) | covered |
| AC-024 | device | none (checklist) | manual |
| AC-025 | auto | ArgumentRows, panel, PropertiesPanel (13) | covered |
| AC-026 | auto | panel, PropertiesPanel (6) | covered |
| AC-027 | auto | ArgumentRows, fields, PropertiesPanel (32) | covered |
| AC-028 | auto | fields, PropertiesPanel (10) | covered |
| AC-029 | auto | fields (7) | covered |
| AC-030 | auto | panel (2) | covered |
| AC-031 | auto | ButtonPaths, delete, PipelineStep (14) | covered |
| AC-032 | auto | delete (8) | covered |
| AC-033 | auto | Canvas, delete, MarkViews (6) | covered |
| AC-034 | auto | panel, PropertiesPanel (4) | covered |
| AC-035 | auto | marks, MarkViews (11) | covered |
| AC-036 | auto | marks, MarkViews (5) | covered |
| AC-037 | auto | marks, MarkViews (7) | covered |
| AC-038 | auto | marks (2) | covered |
| AC-039 | auto | marks (4) | covered |
| AC-040 | auto | App, PipelineStep, state, Wizard, wizard-privacy (8) | covered |
| AC-041 | auto | App, PipelineStep, state, Wizard (6) | covered |
| AC-042 | auto | App, state (2) | covered |

**Scope**: every F-11 scope item in `features.md` maps to at least one criterion (the coverage table in `stories.md`).

**Checklist status**: AWAITING CONFIRMATION. Five device criteria (AC-006, AC-011, AC-012, AC-022, AC-024), the on-screen check of AC-008 (visible arrows, added at re-verify) and the requested on-screen check of AC-037 wait for the user's results in `checklist.md`. Verify is not complete.

**Notes for the owner**: `stories.md` tags AC-037 `[auto]`, while the task request listed it as a device check. The checklist covers it as an extra. `ui.md` §4 and §6 still say 1,000 for the body limit (T018 note). Earlier review items (refusal wording, screen 01 hint) stay in Deferred Findings.

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
