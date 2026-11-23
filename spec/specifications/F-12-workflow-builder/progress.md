# Progress — Workflow builder (F-12)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-23 | 9 stories, 53 criteria: 50 `[auto]`, 3 `[device]`; approved by the user with the readings under "Open for approval" as written. Decisions taken in the questions: Condition blocks in F-12; no Move up or Move down (order from the arrows); arrows drawn by dragging between points, as on the Pipeline tab; a flow keeps its Start and at least one End |
| UX       | ✅ Complete | 2026-11-23 | Approved by the user: the six approved screens 01 to 06 in `spec/design/features/F-12-workflow-builder/` (the set of 2026-11-19, restored at the user's request on 2026-11-23 with its `screens.md` and `index.html`). The 14-screen set drawn on 2026-11-23 (commit `ad4bec5`) is not the approved set |
| Plan     | ✅ Complete | 2026-11-23 | Approved by the user; 24 tasks (T001 to T024), written from the stories and the six approved screens. Differences from the screens (Link icon, Reads, Writes and Rule tags on the Agent panel, the false route as text, the name-clash and delete wording) are listed in `plan.md`, "Differences from the approved screens", and approved with the plan |
| Build    | 🔄 In Progress | | 12 of 24 tasks committed |
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

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T012 review note (plan deviation, not a defect): the plan line names `panelFor` as the function that returns the Start, Agent, Condition and End panels. The build adds `blockPanelFor` and a `BlockSelection` type, and leaves `panelFor` and `Selection` as they were, because changing `Selection` would break the exhaustive switch in `source/apps/web/src/wizard/PipelineStep.tsx`, which is outside T012. AC-011 and AC-044 are met and tested. Plan amendment needed: the T012 line and the later wiring tasks (T013, T017 to T021) name `blockPanelFor` and `BlockSelection`.

- Open decision (T007, AC-026): the core parser checks that reads and writes labels are not duplicated but not that they name an outcome artifact of a flow. The web layer refuses such a label; the API and JSON load would accept it. Proposed: a core check with a core test (a small [Core] task after T007b). Decided by the user: the core check is task T025 (Amendment 2026-11-23).

- T004 review note (not a finding): AC-018's first half (a drag that starts at an input point starts no link) is a canvas concern. `linkBlocks` takes an output name, so an input point cannot start a link in the logic; the drag handling is checked in T015 or T016.
- T005 review (SUGGESTION, `source/apps/web/src/builder/blockLink.ts` `repointBlockTarget` and `repointBlockSource`): a return is judged on the layout after the dragged arrow is cleared, not on the layout on screen before the drag. Both readings are defensible (a free block placed after an End looks like a return on screen but gives a valid forward link once wired). Kept as implemented; the stories do not say which layout applies. Confirm at Verify.

- T011 gap 1 (AC-046, known, reported to the user for a decision): the core analyzer has no rule for a Condition with a blank description, so a Condition with a blank description is not marked as blocked and has no test in the AC-046 table. Not fixed here: `source/packages/core` is out of scope for T011.
- T011 gap 2 (AC-046, known, reported to the user for a decision): the core analyzer has no "no route out" rule. Checked on 2026-11-23: an Agent with an empty `next` does get a blocker from the existing link check, at `pipeline.flows.<n>.blocks.<m>.next`, with the message "must name a block of this flow, got ''"; the wording is not "No route out" and the marks show it on the block (test `F-12 AC-045`). The AC-046 table's "no route out" case passes on that blocker. Not fixed here, since the analyzer is in core.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment — 2026-11-23 (AC-037 follows F-11)
**Changed**: `stories.md` AC-037 and `plan.md` T009: removing an outcome artifact that an End names moves the End to the first remaining outcome; renaming renames the reference; the sole outcome is refused with the parser's reason (option a, confirmed by the user).
**Reason**: T009 found that the F-11 amendments of 2026-11-22 and 2026-11-23 differ from AC-037 as first written.
**Impact**: T009 resumes; no task is re-run.

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
