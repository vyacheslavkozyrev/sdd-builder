# Progress — Workflow builder (F-12)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-23 | 9 stories, 53 criteria: 50 `[auto]`, 3 `[device]`; approved by the user with the readings under "Open for approval" as written. Decisions taken in the questions: Condition blocks in F-12; no Move up or Move down (order from the arrows); arrows drawn by dragging between points, as on the Pipeline tab; a flow keeps its Start and at least one End |
| UX       | ✅ Complete | 2026-11-23 | Approved by the user: the six approved screens 01 to 06 in `spec/design/features/F-12-workflow-builder/` (the set of 2026-11-19, restored at the user's request on 2026-11-23 with its `screens.md` and `index.html`). The 14-screen set drawn on 2026-11-23 (commit `ad4bec5`) is not the approved set |
| Plan     | ✅ Complete | 2026-11-23 | Approved by the user; 24 tasks (T001 to T024), written from the stories and the six approved screens. Differences from the screens (Link icon, Reads, Writes and Rule tags on the Agent panel, the false route as text, the name-clash and delete wording) are listed in `plan.md`, "Differences from the approved screens", and approved with the plan |
| Build    | 🔄 In Progress | | 20 of 24 tasks committed |
| Verify   | ⏳ Pending  | | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Open for approval

These points come from documents that disagree. The stories follow the reading shown; the user confirms or changes it at approval.

1. **End count.** `pipeline-schema.md` §3 says a flow has exactly one End; the stories (AC-038, AC-043) allow one or more, as the owner chose in the Specify question. The parser rule must match the answer; if the user keeps "exactly one", AC-038 and AC-043 change.
2. **Start and End deletion.** The stories keep one Start (its Delete control is disabled, AC-042) and at least one End (AC-043). The owner's option text said "Start can be deleted"; the stories follow the label "Keep one Start, one or more End".
3. **Reads and Writes.** Their labels are the outcome artifacts of the flows of the pipeline (AC-026). `pipeline-schema.md` §6 does not say which flow's artifacts.
4. **Documents to update in the plan.** `features.md` (F-12 scope line), `ui.md` §3.3 and §4 (Condition, no Move buttons, Agent reads and writes and rule tags) and `pipeline-schema.md` §6 are out of date with these stories. A docs task in the plan updates them, not the Specify commit.

---

## Current Task

None.

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Block ids and adding blocks: `addBlock` (lowest free `block-N`, blank fields, no arrows), `canAddStart`, `nextBlockId` (`source/apps/web/src/builder/blocks.ts`) | 0 blockers, 1 warning fixed (AC-005 test could not fail on a cross-flow leak); 3 suggestions fixed (criterion IDs in titles, wrapped row) | task check passed: api 45, web 1118, core 1211 |
| T002 | Block layout as a pure function: `blockLayout(flow)` gives each block a column (breadth-first from Start over next, then true, then false; returns add nothing; unreached blocks in list order), and `countLine` (`source/apps/web/src/builder/blockLayout.ts`) | 0 blockers, 1 warning fixed (a test name contradicted its assertion) | task check passed: api 45, web 1130, core 1211 |
| T003 | Output and input points, arrows of a flow (`flowArrows`: from next, true and false; return when the target's column is at or before the source's; round limit kept on returns only) and arrow panel data (`source/apps/web/src/builder/blockArrows.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (missing layout column now throws; a test name claimed an unasserted property) | task check passed: api 45, web 1156, core 1211 |
| T004 | Link rules `linkBlocks(flow, from, output, target)`: refusals in the plan's order (self, Start to End, output already linked, drop on Start, true or Agent output to an earlier block, false output to an earlier non-Agent), accepted links kept without a round limit on forward routes (`source/apps/web/src/builder/blockLink.ts`) | 0 blockers; 1 warning fixed (a test name claimed an unasserted round-limit property); 1 suggestion fixed (test moved under its criterion) | task check passed: api 45, web 1177, core 1211 |
| T005 | Repoint an arrow end through the link rules (a refused repoint leaves the flow unchanged), `removeBlockArrow` (empty true or next, `stop` for false) and the empty-output texts (`source/apps/web/src/builder/blockLink.ts`) | 0 blockers, 0 warnings; 1 suggestion fixed (a test asserted a constant); 1 suggestion deferred (the layout used for a return after a repoint, see Deferred Findings) | task check passed: api 45, web 1201, core 1211 |
| T006 | Block field edits through the parser (`editAgentField`): the edit is applied to a copy and the parser's problem for that field decides; Agent name (the name clash shown as "Another Agent already has this name." by path), description and body; core: a blank Agent body is refused (Amendment 2026-11-23) (`source/apps/web/src/builder/blockFields.ts`, `source/packages/core/src/pipeline/parse/agent.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (a long comment line; a padded-name clash test) | task check passed: api 45, web 1222, core 1215 |
| T007 | Agent lists through the parser: argument rows (id, required, hint), tools, model, reads and writes (labels from the flows' outcome artifacts, no duplicates), rule tags (project rules only) (`source/apps/web/src/builder/blockAgentFields.ts`, `source/apps/web/src/builder/blockFields.ts`) | 0 blockers; 2 warnings fixed (weak refusal tests; missing error-path tests); 1 suggestion fixed (programmer-error wording). One-off size exception: 625 changed lines, accepted by the user. Open: core check for reads and writes labels (AC-026), see Deferred Findings | task check passed: api 45, web 1260, core 1215 |
| T008 | Condition fields: description through the parser (AC-030); true route text (AC-031); false route text (AC-032); round limit as an integer 1 to 5, refusal "A return allows 1 to 5 rounds." (AC-033); the field only for a return (AC-034) (`source/apps/web/src/builder/blockCondition.ts`). Unset round limit: "Returns to <name>, round limit not set" (AC-017, confirmed). One-off size exception: 432 changed lines, accepted by the user | 0 blockers, 0 warnings; 2 suggestions fixed (exact parser reasons in tests; unused type removed) | task check passed: api 45, web 1290, core 1215 |
| T009 | End fields: outcome (`done` or `stopped`, a new End starts `done`), produced artifact (a label of the flow's outcomes, required, empty-flow text), refusals through the parser; AC-037 as amended: removing an artifact moves the End, renaming renames its reference, the sole outcome is refused (F-11 behaviour, reused) (`source/apps/web/src/builder/blockEnd.ts`) | 0 blockers; 2 warnings fixed (a test that could pass for any reason; the outcome refusal path untested) | task check passed: api 45, web 1306, core 1215 |
| T010 | Delete block (logic): `arrowsRemovedBy` (the confirmation count), `deleteRefusal` (Start and last End), `deleteBlock` (removes the block and its arrows, clears the routes that pointed to it, nothing rewired) (`source/apps/web/src/builder/deleteBlock.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (test gaps: an arrow that starts and ends at the block; a Condition with both routes to it) | task check passed: api 45, web 1325, core 1215 |
| T011 | Block structure marks (logic): findings on a block (`pipeline.flows.<n>.blocks.<m>...`), on the arrow of a route, or on the flow; a route with no arrow falls back to its block; blocked flows; no disabled control (`source/apps/web/src/builder/marks.ts`, `MarkViews.tsx` placement keys) | 0 blockers, 0 warnings; 2 suggestions fixed (import style; test for an Agent with an empty next). Open for the user, core: a Condition blank-description rule and a "no route out" wording (see Deferred Findings) | task check passed: api 45, web 1341, core 1215 |
| T012 | Selection and panel choice for blocks: `blockPanelFor` and `BlockSelection` (flow panel when nothing is selected; Start, Agent, Condition or End panel by kind; block-arrow panel with source and target), `afterDeleteBlock` (tab kept, selection empty) (`source/apps/web/src/builder/panel.ts`) | 0 blockers; 1 warning fixed (a test that could not fail); 3 suggestions fixed. Plan deviation: `blockPanelFor` instead of `panelFor` (Amendment 2026-11-23) | task check passed: api 45, web 1355, core 1215 |
| T013 | Flow tab state (logic): `addFlow` gives no blocks, switching tabs keeps each flow's blocks, the default pipeline's blocks and arrows as the model holds them, step 3 keeps the pipeline across steps; tests added (`model.ts` and `state.ts` already met the criteria, no production change); the memory-only scan covers `blocks.ts`, `blockLink.ts`, `blockArrows.ts` (`source/apps/web/test/builder-model.test.ts`, `wizard-pipeline.test.ts`, `wizard-privacy.test.ts`) | 0 blockers; 2 warnings fixed (an AC-049 isolation test that could not fail, rewritten on a pipeline; a block-id test labelled AC-049 relabelled AC-004); 0 suggestions. Plan deviations: the flow tab UI is not in T013 (see Deferred Findings); `wizard-privacy.test.ts` is outside the T013 file list (accepted, see Deferred Findings) | task check passed: api 45, web 1367, core 1215 |
| T014 | Toolbox component: a card with four icon buttons (Agent, Condition, Start, End), each named by a tooltip; no Link, Move, Connection or Delete-flow control; Start disabled with "This flow already has a Start block."; a press calls `addBlock` and reports the result; not mounted yet (T015) (`source/apps/web/src/builder/Toolbox.tsx`, `toolboxStyles.ts`) | 0 blockers; 1 warning fixed (a tooltip test checked the wrong thing); 1 suggestion fixed (card padding); 1 suggestion deferred (aria-label on the span). Hand-off to T015: the canvas card needs `position: relative` | task check passed: api 45, web 1384, core 1215 |
| T015 | Canvas drawing of blocks, as screen 01 (block canvas files `BlockCanvas.tsx`, `blockDrawing.ts`, `blockCanvasStyles.ts`): block and arrow shapes, labels, return routes, captions (above, or below when a route returns; shifted left for a return beside a forward route), selection by click, the Toolbox mounted in the card (position relative) | 0 blockers; warnings fixed over three rounds (caption rules, a forward false line through a caption, false test citations); 2 suggestions deferred (footer hint wording, double blockLayout call). One-off size exception: 1213 changed lines, accepted by the user. Deferred: a shifted caption can cross a route of a neighbouring Condition (see Deferred Findings) | task check passed: api 45, web 1430, core 1215 |
| T017 | Agent panel, as screen 02 (`source/apps/web/src/builder/BlockPanel.tsx`, `blockPanelStyles.ts`): subtitle, Name, Description, Model, Body with its counter; each refusal beneath its field, the saved value stays. Accepted deviations (user): no Description help line or counter (see Deferred Findings); the file is BlockPanel.tsx with the exported AgentPanel; "Body · required" as the flow panel; the name refusal in the stories' wording. One-off size exception: about 515 changed lines, accepted by the user | 0 blockers; 2 warnings fixed (AC-028 code-point count and whitespace-only body untested); 2 suggestions fixed (panel comment wording; padded name clash untested) | task check passed: api 45, web 1496, core 1215 |
| T018 | Agent lists in the panel: argument rows (the flow panel row with its required checkbox, `AgentRows.tsx`), tools as read-only rows with a minus, reads and writes as chips with a remove control and a free-text add line, rule tags through `RuleTagRows` with the Agent target; refusals beneath each list (`source/apps/web/src/builder/AgentRows.tsx`, `agentRowsStyles.ts`, `BlockPanel.tsx`, `RowEditors.tsx`, `source/apps/web/src/styles/common.ts`) | 0 blockers; 1 warning fixed (the chip surface copied the field shape, now `chipSurface` in common.ts); 2 suggestions fixed (test lines over 120 characters; the minus of a new tool line untested). Accepted deviations (user): argument row as the flow panel row; tools read-only with a minus; reads and writes as chips; rule tags through RuleTagRows; test file `AgentRows.test.tsx` in place of `BlockPanel.test.tsx` and `RowEditors.test.tsx`. One-off size waiver: 752 insertions and 26 deletions, accepted by the user | task check passed: api 45, web 1520, core 1215 |
| T019 | Condition panel (`ConditionPanel` in BlockPanel.tsx, not yet mounted; the dispatch is T023): description through the parser with its counter (AC-030); true route read-only (AC-031); false route text (AC-032); round limit 1 to 5 shown only for a return (AC-033, AC-034) (`blockPanelStyles.ts`, `BlockPanel.tsx`). Accepted as built: title "Condition: pre-check" or "end check" as on the screens; no help line under "What it checks" | 0 blockers; 1 warning fixed (two title tests missing); 1 suggestion fixed; 1 suggestion deferred (drafts, recheck at T023). One-off size exception: 417 changed lines, accepted by the user | task check passed: api 45, web 1538, core 1215 |
| T016 | Canvas drag for blocks: a drag from an output point to an input point through the link rules (`blockDrag.ts`), the source and target ends of the selected arrow repointed, refusals in the message band, the points drawn; `onChange` prop for the accepted drops (`BlockCanvas.tsx`, `blockDrawing.ts`) | 0 blockers; 1 warning fixed (a click after a drop swallowed the next empty-canvas click). One-off size exception: 927 changed lines, accepted by the user. For T023: pass `onChange` and store the flow it receives. Device checks: AC-012 gesture, AC-008 return route after a repoint | task check passed: api 45, web 1473, core 1215 |
| T020 | End panel, as screen 01 (`EndPanel` in BlockPanel.tsx, `blockPanelStyles.ts`): Outcome (`done` or `stopped`), Produced artifact (the flow's outcome labels, or the empty text), Delete block disabled on the last End with its reason. Accepted deviations (user): the reason under the button, not beside it; Delete enabled with no handler until T021; the labels "Outcome" and "Produced artifact"; the no-artifact field as a read-only box (see Deferred Findings) | 0 blockers; 1 warning fixed (the refusal path of the artifact field untested); 1 suggestion fixed (AC-043 test name said "beside it") | task check passed: api 45, web 1547, core 1215 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T015 (not a finding, for the user): a caption shifted left for a Condition with a return on one output can run across a forward route of a Condition immediately to its left, when the two sit side by side. Fixing it needs a narrower caption (text measurement or wrapping), a drawing decision outside T015. Recorded for later.

- T012 review note (plan deviation, not a defect): the plan line names `panelFor` as the function that returns the Start, Agent, Condition and End panels. The build adds `blockPanelFor` and a `BlockSelection` type, and leaves `panelFor` and `Selection` as they were, because changing `Selection` would break the exhaustive switch in `source/apps/web/src/wizard/PipelineStep.tsx`, which is outside T012. AC-011 and AC-044 are met and tested. Plan amendment needed: the T012 line and the later wiring tasks (T013, T017 to T021) name `blockPanelFor` and `BlockSelection`.

- Open decision (T007, AC-026): the core parser checks that reads and writes labels are not duplicated but not that they name an outcome artifact of a flow. The web layer refuses such a label; the API and JSON load would accept it. Proposed: a core check with a core test (a small [Core] task after T007b). Decided by the user: the core check is task T025 (Amendment 2026-11-23).

- T004 review note (not a finding): AC-018's first half (a drag that starts at an input point starts no link) is a canvas concern. `linkBlocks` takes an output name, so an input point cannot start a link in the logic; the drag handling is checked in T015 or T016.
- T005 review (SUGGESTION, `source/apps/web/src/builder/blockLink.ts` `repointBlockTarget` and `repointBlockSource`): a return is judged on the layout after the dragged arrow is cleared, not on the layout on screen before the drag. Both readings are defensible (a free block placed after an End looks like a return on screen but gives a valid forward link once wired). Kept as implemented; the stories do not say which layout applies. Confirm at Verify.

- T011 gap 1 (AC-046, known, reported to the user for a decision): the core analyzer has no rule for a Condition with a blank description, so a Condition with a blank description is not marked as blocked and has no test in the AC-046 table. Not fixed here: `source/packages/core` is out of scope for T011.
- T011 gap 2 (AC-046, known, reported to the user for a decision): the core analyzer has no "no route out" rule. Checked on 2026-11-23: an Agent with an empty `next` does get a blocker from the existing link check, at `pipeline.flows.<n>.blocks.<m>.next`, with the message "must name a block of this flow, got ''"; the wording is not "No route out" and the marks show it on the block (test `F-12 AC-045`). The AC-046 table's "no route out" case passes on that blocker. Not fixed here, since the analyzer is in core.
- T013 review (plan gap, not a code defect): the T013 line says "a flow tab shows the flow's blocks (the F-11 placeholder goes)", but no T013 file renders the tab. `source/apps/web/src/wizard/PipelineStep.tsx` still shows "The blocks of this flow are built in a later step." That change is T023's ("in place of the F-11 placeholder"). It is not a gap for T013's criteria: AC-006 (new flow), AC-049, AC-051, AC-052 and AC-053 are `[auto]` and their logic is tested in T013. Plan amendment: remove that clause from the T013 line.
- T013 review (plan gap): AC-051 (the default pipeline's blocks shown as the model holds them) has no UI task. T015 covers AC-006 (UI), AC-007, AC-008 and AC-010; T023 covers AC-044 (UI) and AC-049 (UI). Suggest adding AC-051 (UI) to T023 at the plan amendment. The `[auto]` logic test named F-12 AC-051 passes.
- T013 review (plan file list): `source/apps/web/test/wizard-privacy.test.ts` was changed for F-12 AC-052 and is not in the T013 file list. Accepted: the T013 line names the memory-only scan as part of the task, and the scan's test lives in that file. The new test only checks that the three block files are in the scan list. Plan amendment: add the file to the T013 line.

---

- T014 `source/apps/web/src/builder/Toolbox.tsx` (SUGGESTION, unresolved): `Tooltip` puts `aria-label` on the wrapping span, which has no role, so the span's label is ignored by assistive tech; the button keeps its own `aria-label`. Left as is: `describeChild` would add a native `title` on the span and a second tooltip.

- T014 hand-off for T015 (not a finding in T014): the toolbox is `position: absolute` at top 16 px and right 24 px, so the canvas card must set `position: relative` when T015 mounts it. Without it the toolbox sits relative to the wrong ancestor.

- T015 WARNING (resolved 2026-11-23, the user's option 1 on AC-007, amended again in the second round): `blockDrawing.ts` `captionYOf` draws a Condition's description above its diamond (`mainY - 50`), and below it (`mainY + 50`) only when its false route returns to an earlier Agent. `BlockCanvas.tsx` draws the `captionY` it is given, so it needed no change. Tests: `blockDrawing.test.ts` (AC-007: a return-false Condition at 470, a forward-false pre-check at 370, a mid-flow forward-false Condition at 370, a mid-flow return-false Condition at 470, a true-return Condition at 370) and `BlockCanvas.test.tsx` (AC-007 DOM y for the return-false and the pre-check cases).
- T015 WARNING (resolved 2026-11-23 by the second-round amendment of AC-007): a forward false route of a Condition that does not follow Start dropped from the bottom vertex through the caption below the diamond. A Condition with a forward false route now keeps its caption above, so no caption sits under a forward false route. Its false label stays under the diamond at the same height, with no caption there.
- T015 WARNING (resolved 2026-11-23 by the third-round amendment of AC-007, "either of its routes"): a true-return Condition kept its description above the diamond, so the dashed return from the top vertex ran through it. `blockDrawing.ts` `captionYOf` now puts the description below the diamond when either output returns (`returnFromIds`), so that return no longer crosses it. Tests: `blockDrawing.test.ts` (true-return Condition at 470; both-routes-return Condition at 470) and `BlockCanvas.test.tsx` (DOM y 470 for a true-return Condition, `trueReturnFlow`).
- T015 WARNING (resolved 2026-11-23, the user's option 1 for a Condition with a return on one output and a forward route on the other): the caption is ended at x = cx - 8 (`blockDrawing.ts` `captionXOf`, `captionShift`), so the forward false line dropping from the bottom vertex at cx and its "false" label at cx + 6 are clear of it. Routes, labels and blockLayout are unchanged; y stays 470. Tests: `blockDrawing.test.ts` (true return with forward false; false return with forward true; both forward stays centred) and `BlockCanvas.test.tsx` (DOM x 286, text-anchor end, for `trueReturnFlow` and `loopFlow`). AC-007 is not changed.
- T015 SUGGESTION (deferred, the user's approval needed): the footer hint "A dashed arrow is a return: a false branch back to an earlier Agent." is quoted verbatim from approved screen 01 and the plan. A true return is dashed too, so the hint describes only the false case. Changing the wording changes the approved text.
- T015 SUGGESTION (deferred): `BlockCanvas.tsx` calls `blockLayout(flow)` for the count line, and `blockDrawingOf` calls it again for the drawing. Both give the same order; one call would be simpler. Not changed: no criterion depends on it, and the count line is outside the drawing.
- T019 SUGGESTION (`source/apps/web/src/builder/BlockPanel.tsx`, `ConditionPanel` `settle`): a typed value that was accepted stays in `drafts` after the edit, as in `AgentPanel`. If the saved round limit or description later changes while the panel stays open (for example by an arrow repoint), the field shows the draft, not the saved value. Not reachable yet: `ConditionPanel` is not mounted by `blockPanelFor` until the wiring task. Recheck when it is mounted; the same pattern is shared with `AgentPanel`, so the fix would cover both.
- T015 review note (not a defect): AC-007 and AC-008 are `[device]`. The automated tests in `blockDrawing.test.ts` and `BlockCanvas.test.tsx` prove their geometry and DOM structure only, not the look. Both go on the Verify manual checklist.
- T015 note: the empty-canvas click clears the selection and keyboard access on the canvas is not built. Both are the user's decisions for T015 and are not findings. No criterion names the empty-canvas click; its test is labelled as having no criterion.
- T016 hand-off for T023 (`source/apps/web/src/builder/BlockCanvas.tsx`, prop `onChange`): the step 3 wiring must pass `onChange` and store the flow it receives. A drag or repoint that is accepted goes only through `onChange`; a refused one changes nothing. Without the prop the drag has no effect on the pipeline.
- T016 wireframe-level addition (user-accepted): the connection points (small circles on the inputs and outputs, `data-port`) are not on the approved screens. They are drawn so a drag has a visible start and end, and they are a wireframe-level addition, not a change of the approved look.
- T016 Verify checklist (AC-008 `[device]`): the return arrow keeps its dashed route and its "up to N rounds" label while a drag or repoint moves an end. Check on screen in a browser that the return still reads as a return after a repoint.
- T016 Verify checklist (AC-012 `[device]`, the gesture): a drag from an output point to a block links it, and a drag that leaves the drawing ends with no change (no pointer capture, by design). Check in a browser, with a mouse and a trackpad.
- T016 note (user-accepted, not a finding): a source-end drop that lands on a block body and not on one of its output points does nothing (AC-019). Its test is labelled AC-019.
- T017 plan wording (user-accepted deviation, not a finding): the plan's T017 line asks for a Description help line and counter. The stories and screen 02 give neither, so the panel does not build them. The plan wording is the only source of the request; no other document asks for them. Add them only if the user asks, with a new task.
- T020 hand-off for T021 (`source/apps/web/src/builder/BlockPanel.tsx`, `EndPanel`, Delete block): on an End that is not the flow's last, the Delete block button is enabled and has no click handler. This is the user-accepted intermediate state. T021 wires the confirmation and the delete.
- T020 wording deviation (user-accepted, not a finding): AC-043 says the last-End reason is shown "beside" the disabled Delete control. The reason sits under the button, because it does not fit beside the 224 px field. The stories and `ui.md` wording is for the docs task, not this one.

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment — 2026-11-23 (AC-037 follows F-11)
**Changed**: `stories.md` AC-037 and `plan.md` T009: removing an outcome artifact that an End names moves the End to the first remaining outcome; renaming renames the reference; the sole outcome is refused with the parser's reason (option a, confirmed by the user).
**Reason**: T009 found that the F-11 amendments of 2026-11-22 and 2026-11-23 differ from AC-037 as first written.
**Impact**: T009 resumes; no task is re-run.

### Amendment — 2026-11-23 (T015 decisions: End last, AC-046 wording, T026 and T027)
**Changed**: `stories.md` AC-009 (the End block is placed after every other block, as on screen 01); AC-046 (the message shown for a block with no route out is the analyzer's; a Condition's blank description is refused by a new core rule). `plan.md`: T026 [Core] (the Condition blank-description rule with a core test) and T027 [Web] (End last in the layout, with its tests); T015 and T016 name the block canvas files (`BlockCanvas.tsx`).
**Reason**: the user decided: End last; the analyzer's wording for no route out; a core rule for the Condition description. T015 was built with the block canvas files and the layout order of T002, which puts End before the reviewer.
**Impact**: T015 is committed as one task under the size waiver (982 changed lines, accepted by the user), with its review. T027 and T026 run after T025. Keyboard access and the empty-canvas click stay as built (the user's decisions 3 and 4).

### Amendment — 2026-11-23 (T012 panel interface)
**Changed**: `plan.md` T012: the block panels are `blockPanelFor` with `BlockSelection`; `panelFor` and `Selection` stay for the Pipeline tab. T013, T017 to T021 and T023 use `blockPanelFor`.
**Reason**: changing `Selection` would break the exhaustive switch in `src/wizard/PipelineStep.tsx`, which is outside T012.
**Impact**: none on behaviour; no task is re-run.

### Amendment — 2026-11-23 (T007 size waiver, T008 wording, T025 core check)
**Changed**: `plan.md` adds T025 [Core] (the parser refuses a reads or writes label that no flow lists as an outcome artifact, with a core test). T007 and T008 committed as one task each under a one-off waiver of the 400-line size guard (625 and 432 changed lines; the user accepted both). The unset round-limit text for a return (AC-017) is "Returns to <name>, round limit not set" (confirmed by the user).
**Reason**: the core parser did not check that reads and writes labels name an outcome artifact (AC-026); the user chose the core check; T008 needed the wording.
**Impact**: T025 runs after T024; the web pre-check of T007 stays. No task is re-run.

### Amendment — 2026-11-23 (T006: Agent body rule and name-clash wording)
**Changed**: `plan.md` T006 and "Core untouched". Core `readBody` for an Agent becomes non-blank (the flow body and the schema already require it). The name clash keeps the parser's check; the web app maps that problem, by its path, to "Another Agent already has this name." (both decisions confirmed by the user).
**Reason**: T006 stopped: the parser accepted a blank Agent body (AC-028), and the parser's name-clash message differed from AC-023.
**Impact**: T006 resumes with the core change and its test; no task is re-run.

### Amendment — 2026-11-23 (AC-017 refusal wording)
**Changed**: `stories.md` AC-017: the refusal "Only an Agent can be returned to." for a false output that links to an earlier block which is not an Agent (wording confirmed by the user).
**Reason**: T004 needs this refusal; the stories had no wording for it, so the task stopped.
**Impact**: T004 resumes; no task is re-run.

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
