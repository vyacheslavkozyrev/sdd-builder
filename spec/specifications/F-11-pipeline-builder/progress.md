# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | 8 stories, 45 criteria: 39 `[auto]`, 6 `[device]`; re-specified from the final schema (`pipeline-schema.md`) and approved by the user. Flow checks removed from the panel; rule tags kept; Delete connection kept; pipeline panel (arguments and body) added as US-008 (user decisions, 2026-11-20) |
| UX       | ✅ Complete | 2026-11-20 | Approved by the user at the committed screens (`5dd262d`, 2026-11-19 revision; earlier 2026-11-20 redraw reverted at the user's request). Stories changed to match them (US-008, AC-035 and AC-045, option 1). Screens 11 to 13 and the review fixes were not kept. Three states have no screen: the delete-connection confirmation and the refused flow name and body (proved by tests), and the red blocker box (Verify checklist) |
| Plan     | ✅ Complete | 2026-11-20 | Approved by the user; 23 tasks (T001 to T023), written from the stories and the approved screens |
| Build    | ✅ Complete | 2026-11-21 | 26 of 26 tasks committed (23 build, then T024 to T026 by Amendment 2026-11-21) |
| Verify   | 🔄 In Progress | 2026-11-21 | Automated checks pass (45 of 45 criteria covered). Awaiting the device checklist (AC-006, AC-008, AC-013, AC-014, AC-016, AC-035 and layout points 1 to 4) |

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
| T014 | Wizard state: `defaultPipelineValue()` (a checked copy of the default) in step 3 and on New project; `set-pipeline` replaces only the pipeline; AC-041 scan of the builder files (`source/apps/web/src/wizard/state.ts`, test helpers) | 0 blockers; 1 warning fixed (a negative test that could not fail); 1 suggestion fixed (test name). Plan file list corrected (wizardValues.ts is a test helper). | task check passed: api 45, web 803, core 1211 |
| T015 | Tab row: Pipeline first, a tab per flow in list order, `+` after the last; the tab list holds only tabs; no toolbox (`source/apps/web/src/builder/PipelineTabs.tsx`, `builderStyles.ts`) | 0 blockers; 2 warnings fixed (+ inside the tablist; untyped style shapes); 1 suggestion fixed | task check passed: api 45, web 819, core 1211 |
| T016 | Canvas with React Flow: boxes in layout order with left and right points, arrows from `next` with no label, blocked flow red, "No flows yet." (`source/apps/web/src/builder/Canvas.tsx`, `drawing.ts`, `canvasStyles.ts`; `theme.ts` light red). Size: 547 changed lines, accepted by the user as a one-off exception | 0 blockers, 0 warnings; 3 suggestions fixed (comments and a wrapped line) | task check passed: api 45, web 843, core 1211 |
| T017 | Canvas interactions: a drag from a right point onto a left point goes through `dropLink`; an arrow end drag goes through `repointArrow`; refusals and blocker messages in the top-centre band (`Canvas.tsx`, `MessageBand.tsx`, `builderStyles.ts`) | 1 blocker fixed (reconnect end mapping inverted); 1 warning fixed (drag could start at a left point); 1 suggestion fixed (test name). Refusal lifetime deferred to the owner | task check passed: api 45, web 861, core 1211 |
| T018 | Flow panel fields: Name, Description, Model, Body with its counter, Human approval; refusals beneath the field keep the saved value (`source/apps/web/src/builder/FlowPanel.tsx`, `flowPanelStyles.ts`). Delete flow control moved to T020 (Amendment 2026-11-20) | 0 blockers; 1 warning fixed (unused style getter removed); 1 suggestion fixed (aria-describedby set only while a refusal shows); 1 suggestion fixed (state name). Open: Delete flow part of AC-019 moved to T020 by amendment. Size: about 629 changed lines, accepted by the user as a one-off exception | task check passed: api 45, web 885, core 1211 |
| T019 | Row and list editors: argument rows (in place, Save for a new row), rule tag rows (add then remove on change), outcome artifacts (Edit, Save, Cancel, Remove; per-field refusal) in the flow and pipeline panels (`RowEditors.tsx`, `rowEditorStyles.ts`) | 0 blockers; 2 warnings fixed (name-line layout; boundary and per-field tests); 1 suggestion fixed (DOM ids from useId). Open: one artifact form at a time drops the other draft (owner). Size: about 1393 changed lines, accepted by the user as a one-off exception | task check passed: api 45, web 918, core 1211 |
| T020 | Pipeline panel (all fields of screen 01, no Delete), connection panel (read-only source and target, Delete connection with confirmation), confirmation dialog, Delete flow control with confirmation (`PipelinePanel.tsx`, `ConnectionPanel.tsx`, `ConfirmDialog.tsx`, `FlowPanel.tsx`; shared shapes in `styles/common.ts`) | 0 blockers; 2 warnings fixed (copied panel and delete shapes moved to common.ts); 1 suggestion fixed (ids from useId). Open: Delete connection dialog wording (owner). Size: about 1227 changed lines, accepted by the user as a one-off exception | task check passed: api 45, web 949, core 1211 |
| T021 | Warnings beside the item they name; "Not on a drawn item" list with path and message, blockers and warnings (`MarkViews.tsx`, `markViewsStyles.ts`) | 0 blockers; 1 warning fixed (a warning placed on no item matched "no item"); 1 suggestion deferred (fixed expected paths in a test). Wiring is T022 | task check passed: api 45, web 962, core 1211 |
| T022 | Step 3 wiring: `PipelineStep.tsx` with the tab row, canvas, panels, marks, warning notes, unplaced list and message band; Canvas gains `onSelect`; flow tab placeholder; step 4 keeps its placeholder (`source/apps/web/src/wizard/`). Layout deviations (white card, no selection highlight, approximate warning placement) for the device check at Verify. Size: about 841 changed lines, accepted by the user as a one-off exception | 0 blockers, 0 warnings; 4 suggestions fixed (comment placement, a test name and assertion, memoised layout, a wrapped line) | task check passed: api 45, web 988, core 1211 |
| T023 | Docs: `ui.md` §3, §4, §6 and §9 aligned with the stories and the approved screens (no criterion). Open for the owner: §5 "on the canvas" wording for refusals; blocker callouts on screens 05 and 09 differ from AC-035; the 2026-11-19 vs 2026-11-20 date of the checks removal; Delete connection to confirm | `spec/documents/ui.md` | task check passed: api 45, web 988, core 1211 |
| T026 | Amendment 2026-11-21: typing in a flow's name, description or body, or changing its model, added argument rows and artifacts. Cause: three sibling row editors shared the key `plan` (`FlowPanel.tsx`); each now has its own key | 0 blockers; 1 warning fixed (tests did not check the edit reached the panel); 2 suggestions deferred | task check passed: api 45, web 992, core 1211 |
| T024 | Amendment 2026-11-21: layout. Tab row outside the white card; no page scroll (fill mode for step 3 only); only the properties body scrolls; canvas title and hint inside the canvas card (`AppFrame.tsx`, `frameStyle.ts`, `layoutStyles.ts`, `pipelineStepStyles.ts`, `canvasStyles.ts`, `PipelineStep.tsx`) | 0 blockers; 1 warning fixed (min-height changed steps 1, 2 and 4); 1 suggestion fixed (shared width constant); 1 suggestion deferred (test DOM coupling) | task check passed: api 45, web 1010, core 1211 |
| T025 | Amendment 2026-11-21: one error panel with a counter for blocker and warning messages; a click opens the full list, including the "Not on a drawn item" section; the refusal band is one line (`ErrorPanel.tsx`, `MessageBand.tsx`, `MarkViews.tsx`, `PipelineStep.tsx`). AC-035 wording amended by the user's request. Warning notes beside items kept (owner decision open) | 0 blockers; 1 warning fixed (unused unplaced helper removed); 1 suggestion fixed (import order); 1 suggestion noted (overlap by containment) | task check passed: api 45, web 1020, core 1211 |
| T027 | Amendment 2026-11-21 follow-up (layout, not a new criterion): the properties card has no padding of its own; its header carries the 16 px inset; the panel's one scrolling region (fields) carries the 16 px side inset, so the scrollbar sits on the card's right edge with a gap before the content; the footer keeps its inset and stays fixed; the connection panel's fields are its scrolling region too (`pipelineStepStyles.ts`, `flowPanelStyles.ts`, `connectionPanelStyles.ts`, `styles/common.ts`, `test/PipelineStep.test.tsx`) | 0 blockers; 1 warning fixed (connection panel had no scrolling region after the body stopped scrolling; its fields now scroll); 1 suggestion fixed (layout test title named the body as the scroll container); 1 warning open (no T027 line in plan.md, see Deferred Findings) | task check passed: api 45, web 1020, core 1211 |
| T028 | Layout follow-up (not a new criterion): button captions in the builder wrapped onto two lines ("Delete connection" in the red footer button). The shared danger, outline, panel delete and plus/minus shapes in `common.ts` are nowrap, with the width taken from the caption and a minimum (dialog and panel buttons: minimum 120 and 130 wide; plus/minus: 28); the form Save in `rowEditorStyles.ts` is nowrap too. New test `buttonCaptions.test.ts` (layout follow-up). Covers AC-006 (layout follow-up) | 0 blockers; 1 warning fixed (test label named layout point 2, which is the selection highlight in the checklist); 2 suggestions fixed (outline comment lists Prev; plus/minus test name); 3 suggestions deferred; round 2 clean | task check passed: api 45, web 1037, core 1211 |
| T029 | Correction of the approved screens (not a new criterion): the saved argument row was drawn as an editor (Id input, required checkbox, Hint input, minus) and not as screens 01 and 07 draw it. Now a field with the id and "· required" and a minus (`argumentField` in `rowEditorStyles.ts`); a click on the field opens the argument's form in place (Id, required, Hint, Cancel, Save), and Save runs the parser. The add form stays closed until + is pressed. Artifact rows and forms in `RowEditors.tsx` already draw as the legend of `screens.md` says; no change. New tests in `RowEditors.test.tsx` and `PipelinePanel.test.tsx` (AC-024). Covers AC-024 (screens 01 and 07) and AC-043 (pipeline arguments) | 0 blockers; 3 warnings fixed (saved field copied the outlined button shape instead of `common.outlineButton`; no test for a refused pipeline argument edit, added; pipeline-panel argument tests tagged AC-024, now AC-043); 0 suggestions fixed; 2 owner notes and 1 suggestion deferred; 1 warning open (no T029 line in plan.md, see Deferred Findings), so Current Task stays `implemented`. Round 2 clean | task check passed: api 45, web 1042, core 1211 |
| T020 | Pipeline panel (all fields as screen 01, AC-042 to AC-045), connection panel (read-only source and target, Delete connection with confirmation), Delete flow control with its confirmation, shared confirmation dialog (`PipelinePanel.tsx`, `ConnectionPanel.tsx`, `ConfirmDialog.tsx`, `connectionPanelStyles.ts`, `confirmDialogStyles.ts`; `common.ts` gains the dialog, danger button and panel shapes, `ruleListStyles.ts` takes them with unchanged output). Size: about 1227 changed lines, accepted by the user as a one-off exception | 0 blockers; 2 warnings fixed (panel root and Delete button shapes copied into two style getters, moved to `common.ts`); 1 suggestion fixed (connection panel label ids from useId). Open: the Delete connection dialog wording (owner). Panels without screen headings left to T022; shared field shapes imported from FlowPanel kept | task check passed: api 45, web 949, core 1211 |
| T030 | Correction of the approved screens 03 and 10 (not a new criterion): artifact rows drawn as a Label field with its minus, then the Template box with its help text (`ArtifactRows` in `RowEditors.tsx`, `rowEditorStyles.ts`); in-place edits through the parser on blur or Enter in the label; a refused value shows its reason beneath the field (error state, light red fill) and the saved value stays; the minus removes the artifact; + opens the add form. Edit and Remove links removed. Tests renamed to the new layout (`RowEditors.test.tsx`). Covers AC-025 | 0 blockers; 2 warnings fixed (the add form's refused fields had no error state, as the saved form has; a refusal test compared with a hard-coded string, now the parser's reason); 2 suggestions fixed (the error rule duplicated in the styles, now one shared rule; Enter that ends an IME composition no longer ends the label edit). Owner decisions from the implementation, kept: (1) the parser checks a field on blur, and Enter in the label; (2) a refused value redisplays the saved value; (3) a refused template shows its reason beneath its box; (4) a removal refusal shows beneath the group. Size: 444 changed lines, accepted by the user as a one-off exception | task check passed: api 45, web 1047, core 1211 |
| T031 | Correction of the arguments (user request 2026-11-22, not a new criterion): + opens one line with a text box and a minus, no Id, required, Hint, Cancel or Save form; a valid id saves on blur or Enter through the parser; a blank line is discarded on blur; a refused id keeps the line with the reason beneath it; saved rows are fields with "· required" and a minus, edited in place with the same rule; remove with the minus. Hint decision: the parser requires the `hint` key (text up to 100 characters, empty allowed) and has no default, so a new argument's hint is its id and `required` is false; no form. ArgumentForm and its styles (`checkbox`, `checkboxLabel`, `argumentField`) removed. Tests: `RowEditors.test.tsx` and `PipelinePanel.test.tsx` (F-11 AC-024, AC-043) | 1 blocker fixed (after a removal the field of the row that moved up kept the removed row's id, and a blur saved that text over the moved row; the field is now keyed by its saved id); 2 warnings fixed (a refused edit redrew every argument field and took the focus from the field the user moved to, now only the refused row is redrawn; the new line's minus press guard had no test, added); 0 suggestions fixed; 1 warning open in the artifact rows (T030 code outside this change, see Deferred Findings), so Current Task stays `implemented`. Owner device note kept: the "· required" end adornment. Size: 485 changed lines, accepted by the user as a one-off exception | task check passed: api 45, web 1054, core 1211 |
| T032 | Correction completing T031 (user request 2026-11-22, not a new criterion): artifact Label and Template fields keyed by the saved value and the row's own refusal count (a removal shows the row's own label; a refused edit redraws only its field) (`source/apps/web/src/builder/RowEditors.tsx`); each argument row has a "required" checkbox beside its minus, saved through the parser, and the new line's checkbox is set before the line is saved; a new argument starts unrequired; `· required` text removed (`RowEditors.tsx`, `rowEditorStyles.ts`); panel fields 24 px apart and body text 12 px in, as screen 01 (`flowPanelStyles.ts`) | Review: 0 blockers; 2 warnings fixed (a new line saved on blur when Tab moved focus to its own required box, so the box could not be ticked by keyboard, now saved only when focus leaves the line; the spacing test was named AC-006, now AC-019 and AC-045); 1 suggestion deferred (long id, see Deferred Findings) | task check passed: api 45, web 1064, core 1211; new tests named F-11 AC-024, AC-025 and AC-043 in `RowEditors.test.tsx`, `PipelinePanel.test.tsx` and `PipelineStep.test.tsx` |
| T033 | Correction to the rendering, to approved screen 01 (user request 2026-11-22, not a new criterion): field height 40 with the text centred; label 12 px above its field and the field groups 24 px apart kept (baseline 36 px below a field); body box 80 px with its first baseline 20 px below the top and its text 12 px in, the outlined root's 16.5 px and 14 px padding removed; argument, rule tag and artifact fields 40 px high with 8 px between rows; steps 1, 2 and 4 keep `common.ts` unchanged (`flowPanelStyles.ts`, `rowEditorStyles.ts`) | Values set: field 40, body box 80 (padding 5 top, 15 bottom, 12 side, 3 rows of 20), label margin 8 on a 16 px line, field groups 24, row gap 8. Not changed: the argument minus (28), the title row (28). Tests named F-11 AC-019 and AC-045 in `PipelineStep.test.tsx` | task check passed: api 45, web 1068, core 1211 |

_The records of the earlier build (T001 to T020 of the connection model, its Deferred Findings and its Test Results) were removed at the 2026-11-20 re-plan. They remain in git history before commit `4c6e642`._

---

## Deferred Findings

- T027 `spec/specifications/F-11-pipeline-builder/plan.md` (process, WARNING, unresolved): there is no T027 line in plan.md, so the pre-flight file check could not run against a plan line. T027 is recorded in the Task Log and in this file's Amendment list only. The owner must add the T027 line to plan.md (or amend it) before Verify advances. Not added here because plan.md is the approved plan and the amendment that would authorise T027 is not recorded.

- T027 `source/apps/web/src/builder/connectionPanelStyles.ts` and `source/apps/web/src/builder/ConnectionPanel.tsx` (layout, device check): the connection panel's three fields and footer now sit in a scrolling region and a fixed footer, the same as the flow panel. Its content is short, so no scrollbar is expected at normal heights; confirm Layout 2 on the device.

- T025 `spec/specifications/F-11-pipeline-builder/stories.md` (AC-035, WARNING, unresolved): AC-035 still says a blocker's message shows "as a notification at the top centre of the builder". Amendment 2026-11-21 (T025) moved blocker and warning messages into the error panel, and the band now holds only the refusal line (`MessageBand.tsx`). The code follows the amended plan. The owner must amend AC-035 wording; not changed here because it contradicts the stories.

- T025 `source/apps/web/src/builder/MarkViews.tsx` and `source/apps/web/src/builder/ErrorPanel.tsx` (warning notes, owner decision): the warning notes beside boxes and arrows are kept as they are, as the owner asked at review. Recorded only; not a code change.

- T025 `source/apps/web/test/ErrorPanel.test.tsx` (closed-state test, suggestion): "the closed panel takes its place in the flow" checks computed `position` only. jsdom cannot measure overlap; the overlap is proved in `PipelineStep.test.tsx` by DOM containment. Not changed; does not block.

- T024 `source/apps/web/test/PipelineStep.test.tsx` (layout test, suggestion): the test of the step column finds it by `tabList.parentElement?.parentElement`, which depends on the DOM depth of `PipelineTabs`. A label on the step column would be sturdier. Not changed in T024; it does not block.

- T021 `source/apps/web/test/MarkViews.test.tsx` (AC-036 test, suggestion): the "real analyzer finding" test asserts only that each path is non-empty. A fixed expected path would be stronger. Not a code change in T021; it does not block.

- T007 `source/packages/core/src/pipeline/check/ids.ts` (AC-024 wording): AC-024 and AC-043 say an argument id is unique within its flow or pipeline; decision 18 and the parser make it unique project-wide. The builder follows the parser (kept on review). The stories wording needs an amendment by the owner; not a code change.

- T019 `source/apps/web/src/builder/RowEditors.tsx` (artifact row, AC-025): choosing Edit or + while another artifact form is open replaces that form and drops its typed draft. The screens show one open form at a time and do not say what happens to a draft; kept as built. The owner should decide whether a draft is kept. Not a code change in T019.

- T011 `source/apps/web/src/builder/marks.ts` (AC-034, AC-035, AC-036): a flow's body or name blocker marks its box red (AC-034) and its message is listed under "Not on a drawn item" (AC-036 names a flow missing its body). AC-035 says a blocker's message shows as a notification at the top centre. Read together, the body and name blocker messages are not shown as a notification. Kept as the implementer decided (AC-036 is the more specific rule); the owner should confirm the wording in stories.md. Not a code change in T011.

- T014 `source/apps/web/src/wizard/state.ts` (AC-040 wording): AC-040 says two wizard states never share one pipeline object. A fresh state and a restart get fresh copies (tested). The states that follow a builder change or a step move share the pipeline object, as the other values do; the reducer never mutates it. Kept as built. The owner should confirm the wording in stories.md. Not a code change in T014.

- T016 `source/apps/web/src/builder/canvasStyles.ts` (normal box outline): the normal box has a blue (primary) 1.5 px outline, as screen 01 draws it, while the legend reads "blue outline: the selected flow". Kept as built (user accepted the deviation); the owner should decide whether the normal outline is grey and the blue one belongs to the selection (T017 or later). Not a code change in T016.

- T016 `source/apps/web/src/builder/Canvas.tsx` (memoisation): `drawingOf` is memoised on the identity of `pipelineState` and `blockedFlowIds`. The caller (T022 wiring) must pass a memoised `blockedFlowIds` array, or the drawing is rebuilt on every render (performance only). Not a code change in T016.

- T017 `source/apps/web/src/builder/Canvas.tsx` (refusal lifetime): a refused drag's reason stays in the band until the next accepted drag or repoint, and it is not cleared when the pipeline changes from outside. AC-014 does not say when it goes. Kept as built; the owner should decide whether the reason clears on the next drag or on any edit. Not a code change in T017.

- T018 `source/apps/web/src/builder/FlowPanel.tsx` (AC-019, Delete flow control): AC-019 lists a Delete flow control at the end of the flow panel, and T018 covers AC-019. The panel has no Delete control yet. Plan T020 owns Delete flow with its confirmation, and a control without that confirmation would break AC-029. The control is to be added with T020; the owner should confirm that AC-019 is proved across T018 and T020. Not a code change in T018.

- T018 `source/apps/web/src/builder/FlowPanel.tsx` (codePointCount import): the panel imports `codePointCount` from `wizard/project.ts`. Moving the helper to a shared module touches F-09 code and is outside T018. Kept as built.

- T020 `source/apps/web/src/builder/ConnectionPanel.tsx` and `ConfirmDialog.tsx` (Delete connection wording, owner): the dialog reads "Delete connection?" with the text "Are you sure you want to delete this connection?" and the confirming button "Delete connection". AC-018 does not give the wording, and the screens do not draw this dialog. Kept as built; the owner should confirm the wording. Not a code change in T020.

- T020 `source/apps/web/src/builder/FlowPanel.tsx` (confirmation state): the `confirming` flag is not keyed to the flow, so a panel reused for another flow while the dialog is open would keep it. The dialog is modal and the selection cannot change under it; T022 wiring should key the panel by flow id. Not a code change in T020.

- T022 `source/apps/web/src/wizard/pipelineStepStyles.ts` (layout, screen 01): the properties card is white with the shared card shape, the selected box and arrow have no highlight, and the warning notes sit at an approximate place beside their box. Kept as built, per the user; confirm on the device check at Verify. Not a code change in T022; does not block.

- T022 `source/apps/web/test/App.test.tsx`, `Canvas.test.tsx`, `PipelineStep.test.tsx` (ResizeObserver stub): the same jsdom polyfill is written in three test files. A shared test setup would remove the copies. Not a code change in T022; does not block.

- T026 `source/apps/web/src/builder/FlowPanel.tsx` (keys, 148, 197, 205): the three keys are not needed. `PipelineStep.tsx` keys the panel by flow id and the three children have different types at fixed positions; removing the keys also passes the tests. Kept the unique keys as the requested fix. Not a code change in T026; does not block.

- T026 `spec/specifications/F-11-pipeline-builder/plan.md` (T026 line): the cause text says "the keydown reaches the list editors", but the list editors are siblings and the fix is the duplicate keys. The owner should correct the wording at the next plan edit. Not a code change in T026; does not block.

- T028 `spec/specifications/F-11-pipeline-builder/plan.md` (T028 line) and `progress.md` (T028 row): both say "layout point 2". In the device checklist, Layout 2 is the selection highlight; no checklist item covers button captions. The owner should decide whether to add a caption item to the checklist and correct the wording. Not a code change in T028; does not block.

- T028 `source/apps/web/src/wizard/wizardStyles.ts` (`NAV_BUTTON_WIDTH`, Prev and Next): the wizard's nav buttons keep a fixed 100 px width set outside `common.ts`. It is the screen's geometry and part of steps 1 to 4, so changing it would change the look the user asked to keep. Not a code change in T028; does not block.

- T028 `source/apps/web/src/builder/builderStyles.ts` (lines 34 and 141) and `canvasStyles.ts` (lines 76 and 83): local `nowrap` shapes on the tab, the error toggle and canvas text. They predate T028 and are not in this change. They are outside the "only in `common.ts`" rule for buttons and should be moved there in a later task. Not a code change in T028; does not block.

- T029 `spec/specifications/F-11-pipeline-builder/plan.md`: there is no T029 line, so the task's file list cannot be checked against the plan (pre-flight step 1). The change is a correction of the approved screens 01 and 07, not a new criterion. The owner should add a T029 line (or record the correction as an amendment) before the task is marked reviewed. Open WARNING; this stops the advance to `reviewed`.

- T029 owner decision, kept as built (the affordance): a saved argument is a field showing its id and "· required" with a minus; a click on it opens the argument's form in place; Save runs `editArgumentAt` (the parser) and a refused edit keeps the form open with the reason beneath it; Cancel keeps the saved row. The spec text of AC-024 and AC-043 says a refused edit "shows its reason beneath the row", and screen 07 draws a refused saved row in red with its reason beneath it. The owner should either amend those two criteria and screen 07 to match, or ask for the reason beneath the row. Not a code change in T029; does not block the code review.

- T029 `source/apps/web/src/builder/RowEditors.tsx` (`ArgumentRows`): pressing + or another row's field while a form is open closes that form and drops its typed changes without a prompt. This follows from one open form at a time; the owner may want a prompt. SUGGESTION; does not block.

- T031 `source/apps/web/src/builder/RowEditors.tsx` (`ArtifactRows`, WARNING): resolved by T032 (fields keyed by the saved value and the row's own refusal count; tests for a removal and for a refused edit that keeps the focus).
- T031 `source/apps/web/src/builder/RowEditors.tsx` (`ArgumentRows`, new line, SUGGESTION): resolved by T032 for the Tab case. Tab from the new line's text box now moves to its required box or minus without saving the line; the line is saved when focus leaves it (test added). The owner decision on Tab keeping the line open is no longer needed.
- T032 `source/apps/web/src/builder/RowEditors.tsx` (`ArgumentRows`, new line, SUGGESTION): an id longer than 100 characters is refused with the parser's hint message (the new line's hint is the id, and the parser caps a hint at 100 characters), so the user sees a reason about a field they did not type. Not changed: the message comes from the parser, and a different hint or an id length rule is an owner decision. Does not block.
- T031 device check (owner): the "· required" end adornment of a saved argument's field (`requiredText` in `rowEditorStyles.ts`) is drawn at the end of the field; confirm it on the device at Verify.
- T033 `source/apps/web/src/builder/FlowPanel.tsx` and `PipelinePanel.tsx` (body counter, SUGGESTION): the counter sits 28 px below the body box (4 px margin and the 24 px gap of the column), where screen 01 draws its baseline 20 px below the box. Not in T033's values, and screen 03 may differ; owner to confirm the counter spacing on the device at Verify.

_Otherwise none for the 2026-11-20 build._

---

## Test Results

Verify run 2026-11-21 (verify mode, test agent). Checks: `source/scripts/task-check.sh` passed (typecheck clean; api 45, web 988, core 1211 tests, all passing). F-11 tests: 488 results, 488 passing, 0 failing, 0 gaps among [auto] criteria. Test names carry "F-11 AC-###"; no F-11 test name lacks a criterion ID, and none names an ID outside 001 to 045.

| Criterion | Tag | Passing F-11 tests | Test files | Result |
|---|---|---|---|---|
| AC-001 | auto | 17 | PipelineTabs.test.tsx, builder-model.test.ts | Covered |
| AC-002 | auto | 4 | PipelineStep.test.tsx | Covered |
| AC-003 | auto | 23 | PipelineStep.test.tsx, PipelineTabs.test.tsx, builder-model.test.ts | Covered |
| AC-004 | auto | 1 | PipelineTabs.test.tsx | Covered |
| AC-005 | auto | 5 | builder-layout.test.ts | Covered |
| AC-006 | device | 7 | Canvas.test.tsx, drawing.test.ts | Checklist (automated tests also pass) |
| AC-007 | auto | 5 | builder-layout.test.ts | Covered |
| AC-008 | device | 4 | drawing.test.ts | Checklist (automated tests also pass) |
| AC-009 | auto | 5 | Canvas.test.tsx, builder-layout.test.ts, drawing.test.ts | Covered |
| AC-010 | auto | 11 | builder-connect.test.ts | Covered |
| AC-011 | auto | 6 | builder-connect.test.ts | Covered |
| AC-012 | auto | 7 | builder-repoint.test.ts | Covered |
| AC-013 | device | 4 | Canvas.test.tsx | Checklist (automated tests also pass) |
| AC-014 | device | 6 | Canvas.test.tsx, MessageBand.test.tsx | Checklist (automated tests also pass) |
| AC-015 | auto | 15 | builder-repoint.test.ts | Covered |
| AC-016 | device | 3 | Canvas.test.tsx | Checklist (automated tests also pass) |
| AC-017 | auto | 12 | ConnectionPanel.test.tsx, builder-arrow.test.ts | Covered |
| AC-018 | auto | 13 | ConnectionPanel.test.tsx, builder-arrow.test.ts | Covered |
| AC-019 | auto | 4 | FlowPanel.test.tsx | Covered |
| AC-020 | auto | 13 | FlowPanel.test.tsx, builder-fields.test.ts | Covered |
| AC-021 | auto | 5 | FlowPanel.test.tsx, builder-fields.test.ts | Covered |
| AC-022 | auto | 15 | FlowPanel.test.tsx, builder-fields.test.ts, flow.test.ts | Covered |
| AC-023 | auto | 11 | FlowPanel.test.tsx, builder-fields.test.ts | Covered |
| AC-024 | auto | 36 | RowEditors.test.tsx, builder-rows.test.ts | Covered |
| AC-025 | auto | 34 | RowEditors.test.tsx, builder-artifacts.test.ts | Covered |
| AC-026 | auto | 17 | PipelineStep.test.tsx, RowEditors.test.tsx, builder-rows.test.ts | Covered |
| AC-027 | auto | 12 | FlowPanel.test.tsx, builder-approval.test.ts | Covered |
| AC-028 | auto | 12 | FlowPanel.test.tsx, builder-fields.test.ts, builder-pipeline-fields.test.ts, builder-rows.test.ts | Covered |
| AC-029 | auto | 3 | FlowPanel.test.tsx | Covered |
| AC-030 | auto | 12 | builder-delete.test.ts | Covered |
| AC-031 | auto | 5 | PipelineStep.test.tsx, builder-panel.test.ts | Covered |
| AC-032 | auto | 2 | builder-delete.test.ts | Covered |
| AC-033 | auto | 6 | builder-marks.test.ts | Covered |
| AC-034 | auto | 5 | builder-marks.test.ts | Covered |
| AC-035 | device | 20 | Canvas.test.tsx, MarkViews.test.tsx, MessageBand.test.tsx, PipelineStep.test.tsx, drawing.test.ts | Checklist (automated tests also pass) |
| AC-036 | auto | 10 | MarkViews.test.tsx, PipelineStep.test.tsx, builder-marks.test.ts | Covered |
| AC-037 | auto | 2 | builder-marks.test.ts | Covered |
| AC-038 | auto | 2 | builder-marks.test.ts | Covered |
| AC-039 | auto | 8 | wizard-pipeline.test.ts | Covered |
| AC-040 | auto | 7 | wizard-pipeline.test.ts | Covered |
| AC-041 | auto | 29 | wizard-privacy.test.ts | Covered |
| AC-042 | auto | 20 | Canvas.test.tsx, PipelinePanel.test.tsx, PipelineStep.test.tsx, builder-panel.test.ts | Covered |
| AC-043 | auto | 18 | RowEditors.test.tsx, builder-pipeline-fields.test.ts | Covered |
| AC-044 | auto | 7 | PipelinePanel.test.tsx, builder-pipeline-fields.test.ts | Covered |
| AC-045 | auto | 29 | PipelinePanel.test.tsx, builder-pipeline-fields.test.ts | Covered |

Layout points flagged for the device check (white cards and tab row, no selection highlight, warning placement, canvas card border) have no automated test; they are in the checklist as Layout 1 to 4.

Checklist: `spec/specifications/F-11-pipeline-builder/checklist.md`, status AWAITING CONFIRMATION. Verify stays open until the user records the device results.

---

## Amendments

### Amendment — 2026-11-21 (Verify: layout and bugs reported by the user)
**Changed**: `plan.md` adds T024 (layout: tabs outside the white card, no page scroll, only the properties content scrolls), T025 (one error panel with a counter and an expandable list, including the "Not on a drawn item" list), T026 (bug: typing in a flow's name, description or body, or changing its model, adds an argument row and an outcome artifact).
**Reason**: the user's manual check of 2026-11-21 (screenshot) found these. Verify does not complete until they are fixed and the checklist is re-run.
**Impact**: Build reopens for T024 to T026. Checklist Layout 1 to 4 and AC-035 are re-run afterwards.

### Amendment — 2026-11-20 (T018 review: Delete flow control)
**Changed**: `plan.md` T020 now also covers the Delete flow control part of AC-019. T018 covers AC-019 for every field except Delete flow.
**Reason**: AC-019 lists a Delete flow control in the flow panel; the plan put it in T020 with its confirmation (AC-029). A control without the confirmation would break AC-029 until T020, so the control moves with its confirmation. Decided by the user.
**Impact**: T018 and T020 only.


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
