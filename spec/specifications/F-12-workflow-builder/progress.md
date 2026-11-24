# Progress — Workflow builder (F-12)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-23 | 9 stories, 53 criteria: 50 `[auto]`, 3 `[device]`; approved by the user with the readings under "Open for approval" as written. Decisions taken in the questions: Condition blocks in F-12; no Move up or Move down (order from the arrows); arrows drawn by dragging between points, as on the Pipeline tab; a flow keeps its Start and at least one End |
| UX       | ✅ Complete | 2026-11-23 | Approved by the user: the six approved screens 01 to 06 in `spec/design/features/F-12-workflow-builder/` (the set of 2026-11-19, restored at the user's request on 2026-11-23 with its `screens.md` and `index.html`). The 14-screen set drawn on 2026-11-23 (commit `ad4bec5`) is not the approved set |
| Plan     | ✅ Complete | 2026-11-23 | Approved by the user; 24 tasks (T001 to T024), written from the stories and the six approved screens. Differences from the screens (Link icon, Reads, Writes and Rule tags on the Agent panel, the false route as text, the name-clash and delete wording) are listed in `plan.md`, "Differences from the approved screens", and approved with the plan |
| Build    | ✅ Complete | | 27 of 27 tasks committed |
| Verify   | ⏳ Pending  | 2026-11-23 | AWAITING CONFIRMATION: 50 `[auto]` criteria covered, no gaps; 3 `[device]` criteria in `checklist.md`; matrix under Test Results |

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

Whole canvas pan (2026-11-24) — reviewed: 0 blockers; 1 warning fixed (no test proved the link preview is converted by the pan offset while the drawing is panned; added a test that draws the preview from the port to the pointer in drawing units at offset (-50, -20)); 2 suggestions fixed (the `pointerIn` comment still said "the drawing's own units"; the test helper `contentOf` was called only for its capture mock, now `mockCapture`). Pan offset is per flow id, block and link gestures take the offset off the pointer, no colour literals, style rules pass. Accepted limits, not findings: the offset is not clamped; touch may scroll natively. Task check passed: api 45, web 1649, core 1231. Staged, not committed.

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
| T021 | Start panel (Delete block disabled with "A flow keeps its Start block."); shared Delete block footer on the Agent, Condition and End panels (confirmation with the arrow count, Cancel and Delete through deleteBlock); Delete connection on a block arrow through the F-11 connection panel (`BlockPanel.tsx`, `ConnectionPanel.tsx`) | 0 blockers; 1 warning fixed (singular wording untested); 2 suggestions fixed; 2 deferred (T023 hand-offs: map the selected arrow to a BlockArrow; key each panel by block id). Accepted deviations: confirmation wording and the Start subtitle; the delete is not run through the parser | task check passed: api 45, web 1558, core 1215 |
| T022 | Structure marks in the UI: amber badges on the blocks and arrows with findings (`BlockCanvas.tsx`, `MarkViews.tsx`, `markViewsStyles.ts`); a read-only findings list in each block panel (`BlockPanel.tsx`) | 0 blockers; 2 warnings fixed (the unlinked-block test checked no mark on screen; no negative case); 2 suggestions fixed. One-off size exception: 490 changed lines, accepted by the user. Open for the user: blockers amber on the canvas (F-11 draws them red); the arrow badge's overlap with route labels (Verify) | task check passed: api 45, web 1567, core 1215 |
| T023 | Step 3 wiring: the flow tab shows the block canvas (with the Toolbox, the marks, the error panel when there are findings), the block panels keyed by block id, the arrow panel for the selected block arrow, `onChange` for accepted drags, the F-11 placeholder removed (`PipelineStep.tsx`, `pipelineStepStyles.ts`) | 0 blockers; 3 warnings fixed (weak test assertions; untested delete-arrow and keep-selection paths); 1 suggestion deferred. One-off size exception: 426 changed lines, accepted by the user. Open for the user: AC-049 selection is cleared on every tab switch (the stories say each flow keeps its own selection); the block-arrow subtitle wording | task check passed: api 45, web 1581, core 1215 |
| T024 | Docs: `features.md` F-12 scope line, `ui.md` §3.3 and §4 (toolbox, block rules, Agent properties without restrictions as the stories have them), `pipeline-schema.md` §3 (at least one End). Open points stated, not decided: AC-043 wording, AC-049 selection, the arrow subtitle, the blocker colour | 0 code changes; `git diff --check` clean | no tests (docs only) |
| T026 | Core: a Condition's blank description is refused by the structural checks at its path (`pipeline.flows.<n>.blocks.<m>.description`, rule `condition-description`) (`source/packages/core/src/pipeline/analyze/condition.ts`, `index.ts`) | 0 blockers, 0 warnings; 1 suggestion fixed (a constant name); 1 deferred (a shared path helper with text.ts). The parser already refuses a blank description, so the rule fires only on unparsed configs | task check passed: api 45, web 1581, core 1220 |
| T027 | End last on the canvas (Amendment 2026-11-23, AC-009): End blocks after every other block, by a stable partition (`blockLayout.ts`) | 0 blockers; 2 warnings fixed (a test that passed on the old layout; no test for an arrow into an End); 2 suggestions fixed; 1 deferred (a hand-edited backward route is drawn as a return; core has no return rule). Consequence, confirmed in review: an arrow into an End is never a return | task check passed: api 45, web 1587, core 1220 |
| T025 | Core: an Agent's reads or writes label that no flow lists as an outcome artifact is a blocker at its path (`analyze/agent-labels.ts`, registered in `analyze/index.ts`) | 0 blockers, 0 warnings; 1 suggestion deferred (a shared path helper). The plan's file list was amended to the analyze/ rule | task check passed: api 45, web 1587, core 1231 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- Verify device fix (2026-11-23), open point for the user: the marked-arrow arrowhead colour. A marked normal arrow is drawn in its mark's colour, but its arrowhead keeps the line colour (`BlockCanvas.tsx`, `block-arrowhead` marker). Left as is; the user confirms on the device.

- Verify device fix (2026-11-23), open point for the user: the dragged blocks keep their place while the flow tab is open (`BlockCanvas.tsx`, `dragged` state, view only). A place is kept by block id, so a block removed and re-added with the same id on the same tab takes the old place. The places live in the canvas component's state, so they are lost when the canvas unmounts. Confirm on the device that this is wanted.

- Verify device fix (2026-11-23), open point for the user: the error panel placement under the toolbox inside the flow card (`BlockCanvas.tsx`, `blockCanvasStyles.ts` `errors`). The user confirms it on the device.

- Verify device fix (2026-11-23), open point for the user: the shared select shape (`flowPanelStyles.ts` `select`, used by `blockPanelStyles.ts`) changes the F-11 dropdowns too: the value is no longer cut off by the chevron (right padding 5). The F-11 dropdowns need the same check on the device.

- Verify device fix (2026-11-23), suggestion, not applied: the selected arrow and the return arrow keep the old 8x8 accent arrowhead (`block-arrowhead-accent`), not the closed 12.5 px arrowhead of a normal arrow. The stories ask for a normal arrow only (AC-008), so the accent shape is kept until the user asks for it.

- Verify device fix (2026-11-23), suggestion, not applied: the device-fix tests carry "no criterion: Verify device fix 2026-11-23" rather than a story criterion. The drawing criteria they check are AC-007 and AC-008 (`[device]`), which stay on the manual checklist; the QA rule asks for a criterion ID only where a test proves one.

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

- T023 hand-off from T021 (user-decided deviation, `source/apps/web/src/builder/ConnectionPanel.tsx`, `BlockArrowPanel`): the block-arrow panel takes a `BlockArrow` from `flowArrows`, not a `fromId`/`output` pair. T023 must map the selected arrow to a `BlockArrow` from `flowArrows(flow)` before it mounts `BlockArrowPanel` with `flow`, `arrow` and an `onDelete` that stores the returned flow.
- T023 hand-off from T021 (`source/apps/web/src/builder/BlockPanel.tsx`, `DeleteBlockFooter`): the Delete confirmation keeps its open state in the panel. Mount each block panel with a `key` of the block id, so a change of selected block cannot carry an open confirmation to another block.
- T021 SUGGESTION (`source/apps/web/src/builder/ConfirmDialog.tsx` line 5, comment "Used for Delete flow and Delete connection."): the comment does not yet name Delete block. Deferred because the user accepted ConfirmDialog.tsx as unchanged in this task.
- T021 SUGGESTION (`source/apps/web/src/builder/BlockPanel.tsx`, `withFlow`): it duplicates the flow-replacement logic of `withFlow` in `fields.ts`, which takes a position, not an id. Deferred: sharing it means changing `fields.ts`, which is outside T021.

- T023 hand-off from T022 (`source/apps/web/src/wizard/PipelineStep.tsx`, `source/apps/web/src/builder/BlockCanvas.tsx` prop `marks`, `source/apps/web/src/builder/BlockPanel.tsx` prop `findings` on each block panel): the step 3 wiring must pass the structure marks to `BlockCanvas` as `marks` and, for each selected block, `findingsOfBlock(marks, flow.id, block.id)` to its panel as `findings`. Both props are optional and nothing passes them until T023, so no mark or list is shown before then.
- T022 question for the user (not changed): on the canvas a blocker is drawn amber, as a warning is. F-11 draws a blocker on the flow box in red. Keep the amber for blockers on the canvas, or draw them red? The code stays as built until the user decides.
- T022 Verify checklist (AC-045 `[device]`-level look, not checked visually): the amber arrow badge sits at the middle of its route and may overlap the "true" or "false" label or the round-limit label of a Condition arrow. Check in a browser on a Condition with a return and with a forward route.
- T022 note (user-accepted, not a finding): a block's findings list also holds the findings of its outgoing arrows, in the analyzer's order.

- T023 OPEN QUESTION for the user (not changed): `source/apps/web/src/wizard/PipelineStep.tsx` `selectTab` clears the block selection on every tab switch, so a flow tab reopens with the flow's own panel. AC-049 (`stories.md`) says switching "keeps each flow's blocks, arrows and selection of its own". Keep the clear-on-switch behaviour (as built, and as the user asked for this review), or keep each flow's selection per tab as AC-049 reads? The code stays as built until the user decides.
- T023 OPEN QUESTION for the user (not changed): the block-arrow panel subtitle "An arrow only points one block to another." (`PipelineStep.tsx`, the `blockArrow` case) is new wording, not in the stories or the approved screens. The Pipeline tab's arrow panel says "An arrow only points one flow to another.". Keep the new wording or replace it?
- T023 SUGGESTION (`source/apps/web/src/wizard/PipelineStep.tsx`, `panelOf` `blockArrow` case): the check `blockSelection.kind !== 'blockArrow'` cannot fail once the panel is `blockArrow`, and `arrowFrom` looks up again the arrow that `blockPanelFor` already found. Deferred: `blockPanelFor` returns the names, not the `BlockArrow` the delete needs, so the second lookup is the simplest typed route. A cleaner route changes `panel.ts` (T012 scope).
- T026 SUGGESTION (`source/packages/core/src/pipeline/analyze/condition.ts`, `blockPath` and `flowPath`): they repeat the helpers of `text.ts`. Deferred: sharing them changes `text.ts`, which is outside T026.
- T026 review note (not a defect): the parser already refuses a blank Condition description (`parse/condition.ts`, `readText` with `nonBlank`, F-02 AC-057), so `parseProjectConfig` never passes a blank one on to the analyzer. The analyzer rule therefore fires only on a config that was not parsed, as the T026 rationale intends. Results for every parsed config are unchanged; `task-check.sh` passed on the whole workspace.
- T027 SUGGESTION (`source/apps/web/src/builder/blockArrows.ts`, `flowArrows`, line 89): a return is any arrow whose target is at or before the source in the layout, so a hand-edited saved flow with a backward Agent next or a backward true route is drawn dashed. The link rules refuse such links (AC-016, AC-017), so this only shows for a loaded config, and core has no return rule to catch it. Deferred: a core return check is outside F-12 T027 scope.
- T025 SUGGESTION (`source/packages/core/src/pipeline/analyze/agent-labels.ts`, `blockPath`): it repeats the helper of the other analyzer rule files (`outputs.ts`, `condition.ts`, `text.ts`, and others). Deferred: sharing it changes files outside T025, and the repeated shape is the analyzer's existing pattern.
- T023 review note (not a defect): the drag and repoint wiring (`blockDragged`, `blockArrowDeleted` drag path, `onChange` of `BlockCanvas`) is not driven by a test in `PipelineStep.test.tsx`; jsdom does not run the pointer gesture. The drop rules are tested in `BlockCanvas.test.tsx` and the store is checked through `onChange`. Goes on the Verify manual checklist (AC-012 `[device]`, drag from an output point to a block, with the step 3 flow tab).

- Verify device fix (2026-11-23), open point: a dragged block keeps its dragged place while its flow tab is open, and the place is not reset by the automatic layout. This differs from F-11, where a moved box is laid out again. Confirm with the user.
- Verify device fix (2026-11-23), open point: a block dragged far from its main line may make a return route run through the wrong side of the block, because the return is routed from the block's sides and not re-planned for the new place. Not changed in this fix.
- Verify device fix (2026-11-23), open point: the error panel sits inside the flow card under the toolbox (`blockCanvasStyles.ts`, `errors`, top 68 px). Placement inside the card is the user's to confirm on a device.
- Verify device fix (2026-11-24), open point for the user, BLOCKING the device check: the curve the user saw is not reproduced in the code. The F-12 drawing draws only straight polylines (a forward arrow is two points, a return is an orthogonal run of four points); no path or curve command exists under `source/apps/web/src/builder`. The Pipeline tab (`Canvas.tsx`, F-11) sets no edge type, so React Flow's default curved edges apply there; that may be the curve seen, but this is not confirmed. The device check must give the exact step (tab, block, gesture) or a screenshot before any change is made.
- Verify device fix (2026-11-24), suggestion, not applied: the drawing sets no `touch-action` (`BlockCanvas.tsx`, the drawing svg). On touch, the browser may take the press for its own scroll and send a pointer cancel, which now ends the pan. Setting `touch-action` needs a style in `blockCanvasStyles.ts`, outside the two staged files. Confirm the touch behaviour on the device.
- Verify device fix (2026-11-23), open point: the shared select shape in `flowPanelStyles.ts` (height 100%, right padding 5) now also applies to the F-11 dropdowns, and the End panel takes it through `blockPanelStyles.ts`. The F-11 dropdowns change through this shape; their look is to be checked on a device.

## Test Results

_Criteria coverage matrix and manual checklist outcome._

**Verify run 2026-11-23.** Preconditions: all 27 tasks ticked and committed (T001 to T027), Current Task None, branch `main`, clean tree. `source/scripts/task-check.sh` passed: typecheck clean; tests api 45 of 45, web 1587 of 1587, core 1231 of 1231 (total 2863, none skipped).

**Gaps:** none. Every `[auto]` criterion (50) has at least one passing test whose name carries its F-12 ID. The three `[device]` criteria (AC-007, AC-008, AC-012) are in `checklist.md`.

**Scope (`features.md`, F-12):** covered by AC-001 to AC-003 (toolbox, four blocks, no Link/Move/Connection), AC-022 to AC-038 (block properties, custom agents, Condition and End), AC-012 to AC-021 (arrows by dragging, delete connection), AC-039 to AC-044 (delete with Start and last End kept). No scope item is without a criterion.

**Thin coverage (passing, but worth strengthening; not gaps by the QA rule):**
- AC-050: the only test that names it covers Agent field edits. The same rule holds for Condition, End, link and delete edits in the code, but no test names AC-050 for them.
- AC-052: the test named AC-052 checks that `blocks.ts`, `blockLink.ts` and `blockArrows.ts` are in the scan list. The forbidden-name check itself runs under the F-11 AC-041 name.
- AC-028: the 1001-character body test uses ASCII; no test proves the "code points" count for characters outside the BMP.

**Open points for the user (not failures):**
- AC-043 wording: the stories say the last-End reason is shown "beside" the disabled Delete control; it is built under the button (T020, user-accepted).
- AC-049 selection: the stories keep each flow's selection on tab switch; the build clears the selection on every tab switch (`PipelineStep.tsx` `selectTab`). The blocks and arrows part is covered by tests; the selection part is not met as built.
- Block-arrow subtitle: "An arrow only points one block to another." is new wording, not in the stories or screens (`PipelineStep.tsx`, `blockArrow` case).
- Blocker colour: blockers are drawn amber on the block canvas; F-11 draws a blocker in red on the flow box (T022).
- Agent restrictions in the docs: `ui.md` §4 (Agent row) and `features.md` F-12 line state the description limit and the custom-agent rule; the user to confirm the wording matches AC-022 to AC-028.

**Matrix (criterion, tag, covering tests, result)**

| Criterion | Tag | Covering tests (test files) | Result |
| --- | --- | --- | --- |
| AC-001 | auto | Toolbox.test.tsx | covered |
| AC-002 | auto | builder-blocks, Toolbox, BlockCanvas | covered |
| AC-003 | auto | builder-blocks, Toolbox | covered |
| AC-004 | auto | builder-blocks, builder-model | covered |
| AC-005 | auto | builder-blocks | covered |
| AC-006 | auto | builder-model, builder-block-layout, blockDrawing, BlockCanvas | covered |
| AC-007 | device | blockDrawing, BlockCanvas (geometry only) | checklist |
| AC-008 | device | blockDrawing, BlockCanvas, builder-block-arrows (data only) | checklist |
| AC-009 | auto | builder-block-layout, blockDrawing, BlockCanvas (End last, amended) | covered |
| AC-010 | auto | builder-block-layout, BlockCanvas | covered |
| AC-011 | auto | builder-block-arrows, builder-panel, PipelineStep, BlockCanvas | covered |
| AC-012 | device | builder-block-drag, builder-block-link, BlockCanvas (rules only) | checklist |
| AC-013 | auto | builder-block-arrows, builder-block-drag, BlockCanvas | covered |
| AC-014 | auto | builder-block-link, builder-block-drag, BlockCanvas | covered |
| AC-015 | auto | builder-block-link, builder-block-drag, BlockCanvas | covered |
| AC-016 | auto | builder-block-link, builder-block-drag, BlockCanvas | covered |
| AC-017 | auto | builder-block-link, builder-block-drag (amended refusal, unset limit) | covered |
| AC-018 | auto | builder-block-link, builder-block-drag, BlockCanvas | covered |
| AC-019 | auto | builder-block-repoint, builder-block-drag, BlockCanvas | covered |
| AC-020 | auto | builder-block-arrows, builder-block-repoint | covered |
| AC-021 | auto | builder-block-repoint, ConnectionPanel, PipelineStep | covered |
| AC-022 | auto | builder-block-agent, builder-block-fields, BlockPanel, AgentRows | covered |
| AC-023 | auto | builder-block-fields, BlockPanel | covered |
| AC-024 | auto | builder-block-fields (1000 and 1001), BlockPanel | covered |
| AC-025 | auto | builder-block-agent (four accepted, refused values), BlockPanel | covered |
| AC-026 | auto | analyze-agent-labels (core), builder-block-agent, AgentRows | covered |
| AC-027 | auto | builder-block-agent, AgentRows | covered |
| AC-028 | auto | builder-block-fields, BlockPanel, core agent.test.ts | covered (see thin note) |
| AC-029 | auto | builder-block-agent, builder-block-fields | covered |
| AC-030 | auto | builder-block-condition, BlockPanel | covered |
| AC-031 | auto | builder-block-condition, BlockPanel | covered |
| AC-032 | auto | builder-block-condition, BlockPanel | covered |
| AC-033 | auto | builder-block-condition (accepted 1 to 5, refused 0, 6, 2.5, blank), BlockPanel | covered |
| AC-034 | auto | builder-block-condition, BlockPanel | covered |
| AC-035 | auto | builder-block-end, BlockPanel | covered |
| AC-036 | auto | builder-block-end, BlockPanel | covered |
| AC-037 | auto | builder-block-end (amended: move, rename, sole outcome refused) | covered |
| AC-038 | auto | builder-block-end | covered |
| AC-039 | auto | builder-delete-block, BlockPanel | covered |
| AC-040 | auto | builder-delete-block, BlockPanel | covered |
| AC-041 | auto | builder-delete-block (true, false, Condition, Start or Agent next) | covered |
| AC-042 | auto | builder-delete-block, BlockPanel | covered |
| AC-043 | auto | builder-delete-block, BlockPanel (wording open) | covered |
| AC-044 | auto | builder-delete-block, builder-panel, PipelineStep | covered |
| AC-045 | auto | builder-marks, MarkViews, PipelineStep | covered |
| AC-046 | auto | builder-marks (flow blocked, seven cases), analyze-condition (core, amended) | covered |
| AC-047 | auto | builder-marks, MarkViews | covered |
| AC-048 | auto | builder-marks, MarkViews | covered |
| AC-049 | auto | builder-model, PipelineStep (selection clause open) | covered (open point) |
| AC-050 | auto | builder-block-fields (Agent edits only) | covered (thin) |
| AC-051 | auto | wizard-pipeline, PipelineStep | covered |
| AC-052 | auto | wizard-privacy (scan list; see thin note) | covered (thin) |
| AC-053 | auto | wizard-pipeline | covered |

**Manual checklist:** `spec/specifications/F-12-workflow-builder/checklist.md`, three entries (AC-007, AC-008, AC-012), results pending. Status: AWAITING CONFIRMATION.

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

### Amendment — 2026-11-23 (T025: file list of the reads and writes rule)
**Changed**: `plan.md` T025 file list. The rule is an analyzer rule in `source/packages/core/src/pipeline/analyze/agent-labels.ts`, registered in `analyze/index.ts`, with its test `analyze-agent-labels.test.ts`; `check/` and `parse/agent.ts` are not changed.
**Reason**: the parser reads one block at a time and cannot see the flows' outcome artifacts, so the check needs the whole config, as the other cross-block analyzer rules have.
**Impact**: T025 is reviewed as built; no task is re-run.

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
