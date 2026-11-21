# User Stories — Pipeline builder (UI only) (F-11)

Feature entry: `spec/documents/features.md` → F-11
Requirements owned by this feature: the F-11 scope items in `features.md` (listed in the Requirement Coverage table); `architecture.md` §6 decisions 38 (a flow is one object, linear, no loops), 39 (name and body required, flows connected), 40 (checks are conditions, not flow fields); `spec/documents/pipeline-schema.md` §1, §3 and §5 (the final schema); `spec/documents/ui.md` §3.1, §3.2, §3.4 and §5.

Owner decisions taken before this specification (2026-11-17 and 2026-11-18) and kept here:

- Flow boxes are laid out automatically, left to right in pipeline order. The schema has no position key; a dragged box is not saved.
- Connections are made only by dragging the right connection point of one flow onto the left connection point of another. There is no button, no next-flow field and no Connection tool.
- A flow is one object with a `next`. There is no connection object, so an arrow carries no label and no gate.
- A flow with an outgoing arrow never offers a second one. A link that would close a loop, or point a flow to itself, is refused with the reason.
- Delete flow removes the flow with its artifacts, arguments, approval, rule tags and `next`. A flow that pointed to it loses that `next`.
- A blocker shows as a red flow box and a notification at the top centre of the builder. Blockers disable nothing.
- Body limit 1000 characters, counted in code points. Description limit 1000. Argument hint limit 100. Artifact template limit 5000 (`pipeline-schema.md` §6).
- `+` adds an empty flow; the structure marks show what it still needs.

Owner decisions taken in this specification, to confirm at approval:

- **Checks are not on the flow panel.** The final schema removes flow-level checks (`pipeline-schema.md` §5); a check is a Condition block on the flow tab, built in F-12. The owner chose this on 2026-11-20.
- **Rule tags are on the flow panel.** The owner decision of 2026-11-18 (item 11 of the consolidated decisions) keeps them, although `features.md` does not list them in the F-11 scope. The owner chose to include them on 2026-11-20.
- **Delete connection is on the arrow panel.** The owner decision of 2026-11-18g removes only the link, with a confirmation. `features.md` says the arrow panel is read-only apart from the source and target; this is the one addition. To confirm at approval.
- **The pipeline panel holds its arguments and body** (user decision, 2026-11-20; US-008). The approved screens already show it.
- The flow tab is a one-line placeholder until F-12 (as the steps are before their feature).

## Out of Scope

- A flow's checks and every Condition block: the flow tab's content (Start, Agent, Condition and End blocks, their order, routes and properties) is F-12. Checks are not on the flow panel (decision 40, `pipeline-schema.md` §5).
- The toolbox on the flow tab (F-12). The Pipeline tab has no toolbox at all.
- Gates and labels on arrows. The Approval and Check tools (removed; approval is the flow's checkbox).
- Saved canvas positions. Layout is automatic (no position key in the schema).
- The pipeline's name, description, model, tools and rule tags. F-11 edits the pipeline's arguments and body only (US-008).
- The brief checks and the LLM review. The builder runs only the structural checks (`analyzeStructure`); Analyze and its findings list are F-13.
- Save, load, import and export of the pipeline (F-18). The pipeline is in memory only.
- The process diagram (F-05, F-18), the Demo button and presentation mode (F-23).
- Phone and tablet layouts. Browser (end-to-end) tests in the MVP, unless a criterion says otherwise.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person and a real browser session (drawn arrows, drag gestures, colours); verified with a checklist.

Every automated test names the feature and criterion it covers (`F-11 AC-003`).

### US-001: The Pipeline tab and the flow tabs

**As a** builder user
**I want to** see the pipeline's flows as tabs and add a flow with +
**So that** I can open each flow and add new ones.

**Requirements:** Pipeline tab with no toolbox; flow tabs and +.

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The tab row shows Pipeline first, then one tab per flow in pipeline order, then the + control after the last flow. The Pipeline tab cannot be removed.
- [ ] AC-002 `[auto]`: Selecting the Pipeline tab shows the canvas. Selecting a flow tab shows the flow's name and a one-line note that its blocks are built in a later step; it shows no block.
- [ ] AC-003 `[auto]`: + appends a flow after the last one, with the id `flow-N`, where N is the lowest positive number such that neither `flow-N` is the id nor the name of another flow. The new flow's name is its id, its description and arguments are empty, its body is blank, it has no blocks and no artifacts, and its tab opens.
- [ ] AC-004 `[auto]`: The Pipeline tab offers no toolbox: no Connection, Approval or Check tool is listed or drawn on it.

### US-002: Flows as boxes and next arrows

**As a** builder user
**I want to** see the flows as boxes in one row with an arrow to each next flow
**So that** I can read the order of the process at a glance.

**Requirements:** the canvas with flows as boxes and next arrows; arrows carry no label and no gate.

#### Acceptance Criteria

- [ ] AC-005 `[auto]`: The canvas layout is a pure function of the flow list: boxes sit left to right in pipeline order at a fixed pitch, and a dragged box is not part of the layout. The same pipeline gives the same positions.
- [ ] AC-006 `[device]`: Each flow is drawn as a box in one row, with its name in the box, left to right in pipeline order. The canvas stays inside the content area and scrolls horizontally when the row is wider than the area.
- [ ] AC-007 `[auto]`: For each flow with a `next`, one arrow runs from that flow to the flow it names. A flow without a `next` has no outgoing arrow. Arrow data holds the source, the target and no label and no gate.
- [ ] AC-008 `[device]`: Each arrow is drawn from the right connection point of its source box to the left connection point of its target box. No arrow shows a label or a gate.
- [ ] AC-009 `[auto]`: With no flows, the canvas shows "No flows yet." and no box or arrow.

### US-003: Connections between flows

**As a** builder user
**I want to** link one flow to the next by dragging from one box to another
**So that** the pipeline order is set without a form, and impossible links are refused.

**Requirements:** next set only by a drag; second outgoing arrow and loop refused with the reason; repoint by drag.

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: `connectFlows(source, target)` sets the source's `next` to the target's id. It is refused, with the reason and with no change to the pipeline, when: the source or target is not a flow of the pipeline; the target is the source; the source already has a `next` (a second outgoing arrow); or the target reaches the source along `next` links (a loop).
- [ ] AC-011 `[auto]`: Each refusal of AC-010 gives its own reason text, and the reason for a second outgoing arrow names the source flow. A refused link leaves the pipeline value equal to what it was before the attempt.
- [ ] AC-012 `[auto]`: A link is accepted only as a drop on another flow's left connection point. A drop anywhere else (on empty canvas, on an arrow, on the same flow's own point, on a box's body) creates no link and changes nothing.
- [ ] AC-013 `[device]`: A link is made only by dragging from the right connection point of one flow onto the left connection point of another. No button, no form field and no tool creates a link.
- [ ] AC-014 `[device]`: A refused drag shows its reason in the message area at the top centre of the builder, and no arrow is drawn for it.
- [ ] AC-015 `[auto]`: Repointing an arrow: dragging its target end onto another flow's left point sets the source's `next` to that flow, under the rules of AC-010. Dragging its source end onto another flow's right point moves the arrow to start from that flow, which must have no `next`; the old source loses its `next`. A refused repoint leaves the pipeline unchanged and gives its reason.
- [ ] AC-016 `[device]`: An arrow's end moves by a drag onto another flow's connection point. No picker, field or menu repoints an arrow.
- [ ] AC-017 `[auto]`: Selecting an arrow opens its panel with the source flow's name and the target flow's name, both read-only. The panel has no field that changes them.
- [ ] AC-018 `[auto]`: Delete connection (on the arrow panel, after a confirmation) sets the source's `next` to none. The target flow and every other field of both flows stay unchanged. Cancel keeps the arrow.

### US-004: The flow panel

**As a** builder user
**I want to** edit a flow's name, description, arguments, model, body, artifacts, rule tags and approval in one panel
**So that** each flow is complete before its blocks are built.

**Requirements:** flow panel (name, description, arguments, model, body, artifacts, Human approval); rule tags; required name and body; checks are not on the panel.

#### Acceptance Criteria

- [ ] AC-019 `[auto]`: Selecting a flow box opens its panel with these fields in this order: name, description, arguments, model, body, artifacts, rule tags, Human approval, and a Delete flow control. The panel has no checks field and no next-flow field.
- [ ] AC-020 `[auto]`: Name is required. A blank name (empty after trimming spaces) is refused with the parser's reason. A name equal to the name of another flow is refused with the parser's reason. A refused value keeps the saved name and shows its reason beneath the field.
- [ ] AC-021 `[auto]`: Description is optional free text of at most 1000 characters. A longer value is refused with the reason, and the saved value stays.
- [ ] AC-022 `[auto]`: Body is required: a blank body is refused with the reason. It is at most 1000 characters, counted in code points, and a counter shows the count of the form "n / 1000". A longer body is refused with the reason and the saved body stays.
- [ ] AC-023 `[auto]`: Model is one of `haiku`, `sonnet`, `opus` or `inherit`, or is unset. Any other value is refused and not stored.
- [ ] AC-024 `[auto]`: Arguments are rows with an id, a required flag and a hint. Add appends a row. Each row can be edited and removed on its own. An id must be file-safe and unique within the flow; a hint is at most 100 characters. A refused edit keeps the saved row and shows its reason beneath the row.
- [ ] AC-025 `[auto]`: Artifacts are a list. Add appends an artifact with a `label` and a `template`. A label is required, one line and not blank. A template may be empty or span several lines, and is at most 5000 characters. Each artifact is edited and removed on its own row. A refused edit keeps the saved values and shows the reason beneath the field.
- [ ] AC-026 `[auto]`: Rule tags are rows with a dropdown that offers only the rules of the Technical details step. Add appends a row; a row is removed on its own. A rule tag that is not in that list is refused with the reason and not stored.
- [ ] AC-027 `[auto]`: Human approval is a checkbox. Ticking or unticking it changes only the flow's `approval` value.
- [ ] AC-028 `[auto]`: Every field edit goes through the parser's field rules. A refused value never changes the pipeline value, and the refusal text is the parser's message for that field.

### US-005: Deleting a flow

**As a** builder user
**I want to** delete a flow I no longer need, after a confirmation
**So that** a mistake cannot remove a flow by one click.

**Requirements:** Delete flow with confirmation removes the flow, its artifacts, arguments, approval, rule tags and `next`; a flow that pointed to it loses that `next`.

#### Acceptance Criteria

- [ ] AC-029 `[auto]`: Delete flow shows the confirmation "Are you sure you want to delete this flow?" and changes nothing until it is confirmed. Cancel keeps the flow and its selection.
- [ ] AC-030 `[auto]`: On confirmation the flow is removed with its artifacts, arguments, approval, rule tags, blocks and its own `next`. Any flow whose `next` named it loses that `next`. The other flows keep all their fields.
- [ ] AC-031 `[auto]`: After a confirmed delete, the selection is cleared and the open tab moves to the Pipeline tab.
- [ ] AC-032 `[auto]`: The last flow can be deleted. The pipeline then has no flows, the canvas shows "No flows yet." (AC-009), and the structure marks report the empty pipeline.

### US-006: Structure marks and blockers

**As a** builder user
**I want to** see what the structural checks find, beside the box or arrow it concerns
**So that** I can fix a flow before the Analyze step.

**Requirements:** structure marks from `analyzeStructure`; blocker shown as a red box and a top notification; warnings beside their item; items that are not drawn are listed.

#### Acceptance Criteria

- [ ] AC-033 `[auto]`: After every change the builder runs the pure structural checks of core (`analyzeStructure`) on the pipeline and maps each finding to a flow box, to an arrow, or to none. The builder adds no wording of its own: each shown message is the analyzer's message.
- [ ] AC-034 `[auto]`: A flow with a blocker has its box marked as a blocker. A flow with no incoming and no outgoing `next` in a pipeline of more than one flow is a blocker, marked on its box (`pipeline-schema.md` §3, decision 39).
- [ ] AC-035 `[device]`: A blocker shows a red flow box border and its message as a notification at the top centre of the builder, in the blocker colour from the theme. A warning shows beside the box or arrow it belongs to.
- [ ] AC-036 `[auto]`: A finding that belongs to no drawn item (for example a block inside a flow, or a flow missing its body) is listed under the canvas in a section named "Not on a drawn item", with its path and message.
- [ ] AC-037 `[auto]`: Blockers disable no control. Editing, Delete flow, Delete connection, + and the drags stay available while a blocker exists.
- [ ] AC-038 `[auto]`: A newly added flow (AC-003) shows its marks at once: a blank body, no Start and no End, each listed under "Not on a drawn item" or on its box, as the analyzer reports them.

### US-007: Builder state and the default pipeline

**As a** builder user
**I want to** start from the default pipeline and keep my changes while I work on step 3
**So that** the builder always shows the pipeline the generator will use.

**Requirements:** the wizard holds the pipeline value; the builder makes no network request.

#### Acceptance Criteria

- [ ] AC-039 `[auto]`: Step 3 starts with the default pipeline from core in the wizard state. Each builder change replaces the pipeline value in the wizard state, and nothing else in the wizard changes.
- [ ] AC-040 `[auto]`: New project resets the pipeline value to a fresh copy of the default pipeline, and two wizard states never share one pipeline object.
- [ ] AC-041 `[auto]`: The builder code makes no network request and writes nothing to storage; the privacy scan of the web app covers the builder's files.

### US-008: The pipeline panel

**As a** builder user
**I want to** set the pipeline's arguments and body when no flow or arrow is selected
**So that** the pipeline command has the text and arguments I wrote.

**Requirements:** the pipeline-level panel (arguments and body) on the Pipeline tab.

#### Acceptance Criteria

- [ ] AC-042 `[auto]`: On the Pipeline tab, the properties card shows the pipeline panel when no flow and no arrow is selected. Selecting a flow or an arrow shows that item's panel instead; one item is selected at a time.
- [ ] AC-043 `[auto]`: The pipeline's arguments are rows, with the same rules as a flow's arguments (AC-024): a file-safe id unique within the pipeline, a required flag, and a hint of at most 100 characters. Add, edit and remove work on each row. A refused edit keeps the saved row and shows its reason beneath the row.
- [ ] AC-044 `[auto]`: The pipeline's body is optional and may be empty. It is at most 1000 characters, counted in code points; a counter shows "n / 1000". A longer body is refused with the reason and the saved body stays.
- [ ] AC-045 `[auto]`: The pipeline panel has no field for the pipeline's name, description, model, tools or rule tags. Those values are unchanged by any edit in F-11.

---

## Requirement Coverage

| Requirement (`features.md` F-11 scope or owner decision) | Covered by |
|---|---|
| Pipeline tab with no toolbox | AC-004 |
| Flow tabs and + after the last | AC-001, AC-002, AC-003 |
| Canvas with flows as boxes and next arrows | AC-005, AC-006, AC-007, AC-008, AC-009 |
| Next set only by dragging the right point onto the left point | AC-010, AC-012, AC-013, AC-015, AC-016 |
| A second outgoing arrow and a loop refused with the reason | AC-010, AC-011, AC-014 |
| Arrows carry no label and no gate | AC-007, AC-008 |
| Selecting an arrow shows source and target, read-only | AC-017 |
| Delete connection removes only the link (owner decision 2026-11-18g; to confirm) | AC-018 |
| Flow panel: name, description, arguments, model, body, artifacts | AC-019, AC-020, AC-021, AC-022, AC-023, AC-024, AC-025, AC-028 |
| Rule tags on the flow panel (owner decision 2026-11-18, item 11) | AC-026 |
| Human approval checkbox | AC-027 |
| Checks on the flow panel (scope item, removed by the final schema) | Out of Scope; AC-019 (no checks field) |
| Delete flow with confirmation | AC-029, AC-030, AC-031, AC-032 |
| Structure marks from the analyzer; blocker red and notified; warnings beside items | AC-033, AC-034, AC-035, AC-036, AC-037, AC-038 |
| Builder state and the default pipeline | AC-039, AC-040, AC-041 |
| Pipeline panel: arguments and body (user decision 2026-11-20) | AC-042, AC-043, AC-044, AC-045 |
| Required name and body; flow connected (decisions 39 and `pipeline-schema.md` §3) | AC-020, AC-022, AC-034 |
