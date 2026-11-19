# Implementation Plan — Pipeline builder (UI only) (F-11), regenerated 2026-11-18

Regenerated because the screens and the model changed after Build (decisions of 2026-11-18, stories sections "Amendment 2026-11-17" and "Decision 2026-11-18" to "2026-11-18g"). The earlier plan (18 tasks plus T013a, T019, T020) is the record of what was built on the old connection model; its code is reworked by the tasks below.

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose (the owner waives the guard per task, as before).
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Prerequisites (must be complete before Build of this plan)

- **F-02 amendment (flow model, core):** a flow is one object (`id`, `name`, `description`, `arguments`, `model`, `body`, `blocks`, `artifacts`, `checks`, `approval`, `next`); the connection object is removed; `artifacts` (label one line, template several lines), `checks` (free text), `approval` (boolean) and `next` (optional id) are parsed and refused as typed; the default pipeline data (`source/templates/pipeline/default.json`) is restated in the new model. Architecture decisions 38 and 40. Not started.
- **F-03 amendment (structural rules, core):** a flow must be connected unless the pipeline has one flow (decision 39); no loops (decision 38); the first flow is the one no `next` points to. Not started.
- **F-04 and F-06 follow-up (generator and analyzer, core):** the command files are written from the flow's artifacts, checks and approval, and a failed check stops the flow and asks the user (decision 40). Not started; needed before F-13/F-14 use the model, not before F-11's builder.

F-11's Build cannot start until the F-02 and F-03 amendments are complete, because the builder reads the parser and the analyzer. Tasks T001 to T004 can be written against the new types only after F-02's amendment lands.

## Tasks

- [ ] T001 [Web] Flow model view-model: the flow list, the tab row (Pipeline first, then the flows in order), the box of each flow (name, block count), the arrows from `next`, the first flow (no other `next` points to it) — `source/apps/web/src/builder/model.ts`, `source/apps/web/test/builder-model.test.ts` — covers AC-001, AC-007, AC-008 (arrow data from `next`, no label)
- [ ] T002 [Web] Layout as a pure function (box positions, left to right in pipeline order, 160 px pitch, no saved positions): reuse `layout.ts` on the flow model — `source/apps/web/src/builder/layout.ts`, `source/apps/web/test/layout.test.ts` — covers AC-009, AC-010
- [ ] T003 [Web] Add flow and the tab row: `+` adds an empty flow with id `flow-N` (N the first number not used as another flow's id or name; name starts as the id); the new flow is shown and selected as decided; the tab row (Pipeline first, no remove control on Pipeline, the flow tab placeholder) — `source/apps/web/src/builder/PipelineTabs.tsx`, `source/apps/web/src/builder/add.ts`, `source/apps/web/test/PipelineTabs.test.tsx` — covers AC-001, AC-002, AC-003, AC-004, AC-005; AC-006 is a device check
- [ ] T004 [Web] Set the next flow by dragging a connection point: `setNext(config, from, to)` refuses a second next on the same flow, a link to itself, a link that would close a loop (forbidden, decision 38), and an unknown target, each with its reason; the drag gesture is wired in T014 — `source/apps/web/src/builder/next.ts`, `source/apps/web/test/next.test.ts` — covers AC-012 (model part: connection points), AC-014 (superseded button path; the refusal of a second arrow is kept), loops (no AC: open point 1)
- [ ] T005 [Web] Delete connection (remove the link only): `removeNext(config, from)` sets the source's `next` to none and keeps the target flow and its fields — `source/apps/web/src/builder/next.ts`, `source/apps/web/test/next.test.ts` — covers AC-016 (modified: the target flow stays; confirmation text in T016)
- [ ] T006 [Web] Repoint the next flow by dragging its end: `repointNext(config, from, to)` changes only the target; refused for a loop or a self-link, with the reason — `source/apps/web/src/builder/next.ts`, `source/apps/web/test/next.test.ts` — covers AC-015 (modified: drag only, no label)
- [ ] T007 [Web] Outcome artifacts on a flow: add, edit and remove; the label is one line, required and non-blank; the template is several lines and may be empty; a refused edit keeps the saved values and shows the reason beneath the field — `source/apps/web/src/builder/artifacts.ts`, `source/apps/web/test/artifacts.test.ts` — covers AC-043, AC-044
- [ ] T008 [Web] Checks on a flow: add and remove; a check is free text, required and non-blank; a check has no true or false output; "No checks yet." when empty — `source/apps/web/src/builder/checks.ts`, `source/apps/web/test/checks.test.ts` — covers AC-046, AC-020 (superseded wording: no output choice), AC-021 (superseded: removal of a check)
- [ ] T009 [Web] Human approval on a flow: the checkbox sets `approval` on or off and changes only that flag; the arrow carries no mark — `source/apps/web/src/builder/approval.ts`, `source/apps/web/test/approval.test.ts` — covers AC-045
- [ ] T010 [Web] Flow properties edited through the parser: name (free text, non-blank, unique among the flows' names, refused with the reason), description (optional), arguments (rows as decided on screen 03 — open point 2), model, body (1000 code points); a refused edit keeps the saved value and shows the reason beneath — `source/apps/web/src/builder/fields.ts`, `source/apps/web/test/fields.test.ts` — covers AC-027, AC-028, AC-029
- [ ] T011 [Web] Delete flow: `deleteFlow` removes the whole flow object (its artifacts, checks, approval and next); flows whose `next` pointed to it lose it; the removed list is returned for the confirmation; the last flow may be deleted — `source/apps/web/src/builder/delete.ts`, `source/apps/web/test/delete.test.ts` — covers AC-031 (data), AC-032, AC-033
- [ ] T012 [Web] Pipeline properties: name, description, arguments (rows with + and minus, the repeated-name refusal naming the row), model, tools, rule tags (rows with a dropdown listing the rules of the previous step, with + and minus), body (1000) — `source/apps/web/src/builder/pipelineFields.ts`, `source/apps/web/test/pipelineFields.test.ts` — covers AC-025, AC-026, AC-027, AC-028 (pipeline body)
- [ ] T013 [Web] Structure marks: `marksFor` over `analyzeStructure`; a flow with a blocker is red and its message is the notification at the top centre; findings that name a block or the pipeline as a whole are listed under "Not on a drawn item"; brief problems excluded; marks equal the analyzer's output — `source/apps/web/src/builder/marks.ts`, `source/apps/web/test/marks.test.ts` — covers AC-035 (modified: decision 2026-11-18f), AC-036, AC-037, AC-038, AC-039
- [ ] T014 [Web] Canvas (React Flow, already approved): flow boxes (name, block count, red when blocked), arrows from `next` with no label, connection-point drag sets `next` (T004), arrow-end drag repoints (T006), pan, one selection, box drag, empty state text, the scroll strip — `source/apps/web/src/builder/Canvas.tsx`, `source/apps/web/src/builder/drawing.ts`, `source/apps/web/test/Canvas.test.tsx` — covers AC-008 (drawn), AC-009 (UI), AC-011 (device), AC-012 (device), AC-033 (empty state), AC-024 (device)
- [ ] T015 [Web] Panels: the Pipeline panel (T012), the flow panel with all fields in order (name, description, arguments, model, body, outcome artifacts, checks, Human approval checkbox, Delete flow with "Asks first"; scrollable in the app), the connection panel (read-only source and target, Delete connection with "Removes the link only. The flow stays."); no toolbox on the Pipeline tab; selection of one item at a time; no switch-off control — `source/apps/web/src/builder/PropertiesPanel.tsx`, `source/apps/web/src/builder/panel.ts`, `source/apps/web/test/PropertiesPanel.test.tsx` — covers AC-025, AC-026 (flow file by id), AC-030, AC-034, AC-047, AC-048 (device: no label on arrows, panels), AC-023 (superseded: no toolbox)
- [ ] T016 [Web] Confirmations: Delete flow asks "Are you sure you want to delete this flow?" (title "Delete flow <name>?", Cancel and Delete flow, Cancel changes nothing, proved in a DOM test); Delete connection asks before it removes the link — `source/apps/web/src/builder/ConfirmDialog.tsx`, `source/apps/web/test/ConfirmDialog.test.tsx` — covers AC-016 (confirmation), AC-031 (confirmation)
- [ ] T017 [Web] Step 3 wiring: `PipelineStep` holds the selection and the open tab, reports every change through `onUpdate`, the rules of step 2 are passed to the rule-tag dropdown; New project resets the pipeline; no network or storage call; the wizard-privacy scan covers the files — `source/apps/web/src/wizard/PipelineStep.tsx`, `source/apps/web/src/wizard/Wizard.tsx`, `source/apps/web/src/App.tsx`, `source/apps/web/test/PipelineStep.test.tsx`, `source/apps/web/test/wizard-privacy.test.ts` — covers AC-040, AC-041, AC-042
- [ ] T018 [Docs] Documentation check: `spec/documents/ui.md` §3, §4, §6 and `architecture.md` decisions 38 to 40 match the built behaviour; the open points listed in `screens.md` are closed or carried — `spec/documents/ui.md`, `spec/documents/architecture.md`, `spec/design/features/F-11-pipeline-builder/screens.md` — covers AC-029 (documented), AC-012 (documented)

## Superseded criteria (no task of their own)

- AC-013 (connection label) → AC-043 (artifact label, T007).
- AC-014 (button path "Connect to next flow") → removed by decision 2026-11-18d; the second-arrow refusal is kept in T004.
- AC-017 (approval gate on an arrow) → AC-045 (T009).
- AC-018 (check type and threshold) → AC-046 (free text, T008).
- AC-019 (one gate per arrow) → removed: a flow holds many checks and one approval flag.
- AC-021 (remove gate) → removal of a check (T008) and unticking approval (T009).
- AC-022 (drop a gate on an arrow) → removed; connection points (T004, T014).
- AC-023 (toolbox on the Pipeline tab) → AC-047 (no toolbox; T015).

## Rationale

- **Order.** The prerequisites (F-02 and F-03 amendments) come first because the builder uses the parser and the analyzer. Then the model helpers (T001 to T002), the tab row (T003), the next-flow functions (T004 to T006), the flow's own content (T007 to T011), the Pipeline's content (T012), the marks (T013), the canvas (T014), the panels (T015), the confirmations (T016), the wizard (T017), and the documentation check (T018).
- **Pure logic before components.** Every rule (loops, one next, the connected rule, names, limits) is a pure function with table tests (`qa.md`). Components only wire events to them.
- **Libraries.** `@xyflow/react` 12.12.1 and `@mui/material` 9.5.0 are already approved in `architecture.md` §5. The Material Kit look is a style choice (MIT, credit in `ui.md` §3.0 and `architecture.md` §5): no new package.
- **Device checks.** AC-006, AC-011, AC-012, AC-024 and AC-048 are checked on screen at Verify (T014, T015).

## Open points for the approval (do not build before these are decided)

1. **Loops.** Decision 38 forbids loops and screen 08 shows the refusal, but no acceptance criterion says so. Add a criterion to the stories (e.g. AC-049 `[auto]`: a drag or a link that would close a loop is refused with the reason and nothing changes).
2. **Flow arguments.** Screen 03 shows flow arguments as rows (with + and minus, like the pipeline), while the model's flow `arguments` is one text value. Choose: rows (model change in F-02) or one text value (screen change).
3. **Rule tags.** The dropdown lists the rules of the previous step (decision 2026-11-18). No criterion covers it. Add one, or confirm it is covered by AC-026 and T012.
4. **AC-003.** After `+`, does the new flow's tab open (the story text) or does the Pipeline tab stay open with the new flow selected (screen 05)?
5. **Input height** in the flow panel: 26 px or 34 px (screen 01 uses 34 px).
6. **AC-005 wording** of the flow tab placeholder ("built in F-12").

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Web]` | `source/apps/web`: the builder view-model (`src/builder/`), the components of the Pipeline tab, the wizard state and wiring |
| `[Docs]` | Documentation changes required by the feature (`spec/documents/ui.md`, `architecture.md`, F-11 screens) |
