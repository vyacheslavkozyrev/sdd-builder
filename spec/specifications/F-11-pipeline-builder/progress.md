# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 8 stories, 42 criteria: 37 `[auto]`, 5 `[device]`; approved by the user |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user; two owner decisions applied (new connections by drag from the Connection tool; a refused value reverts to the saved value) |
| Plan     | ✅ Complete | 2026-11-17 | Approved by the user before any code is written (18 tasks; two open points decided: flow name free text with a fixed file-safe id; a second arrow from a flow refused) |
| Build    | 🔄 In Progress | 2026-11-17 | 9 of 18 tasks committed |
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
| T005 | Gates on arrows: `addGate` for an approval or a check, refusal texts from the parser, one gate per arrow (`source/apps/web/src/builder/gates.ts`) | 0 blockers; 2 warnings fixed (a total typed gate with no unreachable fallback; a test for a problem elsewhere in the pipeline); 2 suggestions fixed; 1 suggestion deferred | task check passed: api 57, web 382, core 1017 |
| T006 | Remove a gate (only the gate key goes; the arrow stays); no routing field on a gate or an arrow (`source/apps/web/src/builder/gates.ts`) | 0 blockers; 2 warnings fixed (connection test asserted an exact key list; removal test had no blocks); 4 suggestions fixed | task check passed: api 57, web 391, core 1017 |
| T007 | Field edits through the parser: `applyPipelineField` and `applyFlowField`, the flow name's uniqueness, body limit through the parser (`source/apps/web/src/builder/fields.ts`) | 0 blockers; 2 warnings fixed (two assertions passed on a refusal; the name comparison rule had no test); 3 suggestions fixed (reason checks for tools and rule tags; comments on the throw and the comparison); 1 suggestion deferred | task check passed: api 57, web 423 (fields.test.ts 32), core 1017 |
| T008 | Delete a flow: `deleteFlow` removes the flow, its outgoing and incoming arrows and gates, and returns them for the confirmation; the last flow may go; an unknown id refused (`source/apps/web/src/builder/delete.ts`) | 0 blockers; 1 warning fixed (a test that did not prove other flows unchanged); 1 suggestion fixed (self-arrow edge case) | task check passed: api 57, web 441, core 1017 |
| T009 | Structure marks from `analyzeStructure`: placed on a box, an arrow or 'Not on a drawn item'; severity; the rule list mapped from step 2 with the F-10 rule-id function (`source/apps/web/src/builder/marks.ts`) | 0 blockers; 1 warning fixed (AC-038 test could not fail); 2 suggestions fixed (a rule tag on the pipeline; a helper for the placement) | task check passed: api 57, web 457, core 1017 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 WARNING (resolved, owner decision 2026-11-17, option 1) `source/apps/web/src/builder/model.ts` `addFlow`: the new flow's name is its id, which clashed when an existing flow already had that name. `nextFlowId` now skips any N whose `flow-N` is used as an id or a name (AC-003, AC-029); covered by `builder-model.test.ts` "F-11 AC-003 skips a number that another flow uses as its name" and "gives the new flow a name that no other flow has".
- T005 SUGGESTION `source/apps/web/src/builder/gates.ts` `rawThreshold`: a threshold in exponent form (`1e3`) is refused with the parser's message, although it is a whole number. Left as is: the form reads plain digits only, the parser's message names the rule, and accepting exponent text would make the web conversion a second number parser. Decided in review of T005; covered by `gates.test.ts` "F-11 AC-018 refuses a diff size gate with an exponent threshold, with the reason, and adds no gate".

- T006 NOTE (accepted, not a finding) `source/apps/web/src/builder/gates.ts` `removeGate`: refuses with `NO_GATE_REASON` when the arrow has no gate, rather than a no-op. Kept: the other arrow functions refuse the same way (`removeConnection`, `repointConnection` refuse with `NO_ARROW_REASON`), so the Analyze-style reasons stay uniform. Covered by `gates.test.ts` "F-11 AC-021 refuses to remove a gate from an arrow that has none, with the reason".

- T007 SUGGESTION `source/apps/web/src/builder/connect.ts` (`connectFlows`, `repointConnection`) and `gates.ts` (`addGate`, `removeGate`): an unknown flow id is a refusal there, while `fields.ts` `applyFlowField` throws. Left as is: typescript.md gives an unknown id as a programmer error (throw), and the refusals in the T003 to T005 files are outside T007. Owner to decide whether to align the earlier files to the throw or the builder to refusals. Nothing in `src` calls the T007 functions yet, so the throw is not reachable from the panel today.
- T007 NOTE (decision, not a finding) `source/apps/web/src/builder/fields.ts` `applyFlowField`: the flow name's uniqueness compares trimmed text and is case-sensitive. Trimmed, because the blank check trims and two names that look the same on the Map clash. Case-sensitive, because a flow's file comes from its id (`.claude/commands/<id>.md`), so a case difference is not a file clash. Covered by `fields.test.ts` "F-11 AC-029 compares names after trimming" and "compares names case-sensitively".

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
