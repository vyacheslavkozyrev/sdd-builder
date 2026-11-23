# Progress — Workflow builder (F-12)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-23 | 9 stories, 53 criteria: 50 `[auto]`, 3 `[device]`; approved by the user with the readings under "Open for approval" as written. Decisions taken in the questions: Condition blocks in F-12; no Move up or Move down (order from the arrows); arrows drawn by dragging between points, as on the Pipeline tab; a flow keeps its Start and at least one End |
| UX       | ✅ Complete | 2026-11-23 | Approved by the user: the six approved screens 01 to 06 in `spec/design/features/F-12-workflow-builder/` (the set of 2026-11-19, restored at the user's request on 2026-11-23 with its `screens.md` and `index.html`). The 14-screen set drawn on 2026-11-23 (commit `ad4bec5`) is not the approved set |
| Plan     | ✅ Complete | 2026-11-23 | Approved by the user; 24 tasks (T001 to T024), written from the stories and the six approved screens. Differences from the screens (Link icon, Reads, Writes and Rule tags on the Agent panel, the false route as text, the name-clash and delete wording) are listed in `plan.md`, "Differences from the approved screens", and approved with the plan |
| Build    | 🔄 In Progress | | 7 of 24 tasks committed |
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

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- Open decision (T007, AC-026): the core parser checks that reads and writes labels are not duplicated but not that they name an outcome artifact of a flow. The web layer refuses such a label; the API and JSON load would accept it. Proposed: a core check with a core test (a small [Core] task after T007b). Awaiting the user's decision.

- T004 review note (not a finding): AC-018's first half (a drag that starts at an input point starts no link) is a canvas concern. `linkBlocks` takes an output name, so an input point cannot start a link in the logic; the drag handling is checked in T015 or T016.
- T005 review (SUGGESTION, `source/apps/web/src/builder/blockLink.ts` `repointBlockTarget` and `repointBlockSource`): a return is judged on the layout after the dragged arrow is cleared, not on the layout on screen before the drag. Both readings are defensible (a free block placed after an End looks like a return on screen but gives a valid forward link once wired). Kept as implemented; the stories do not say which layout applies. Confirm at Verify.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

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
