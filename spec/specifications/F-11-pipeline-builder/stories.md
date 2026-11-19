# User Stories — Pipeline builder (UI only) (F-11)

Feature entry: `spec/documents/features.md` → F-11
Requirements owned by this feature: the F-11 scope items in `features.md` (the Pipeline tab that cannot be removed; one tab per flow and a + button after the last tab; the canvas with flows as boxes, connections as arrows and one gate per arrow; the properties panel for the pipeline, including its arguments; structure marks next to the items they name; no Start or End on this tab); `ui.md` §3.1 to §3.5 (tab row, Pipeline tab, flow tab placeholder, property panels, structure marks), §4 (block table for Approval, Check, Connection, Flow, Pipeline), §5 (interaction rules); `architecture.md` decisions 24 (the builder is a view-model over the pipeline config, marks from `analyzeStructure`), 30 (tabs, toolboxes), 33 (gate types in the schema), 34 (no switch-off).

Owner decisions of 2026-11-17 (this specification):

- Flow boxes are laid out automatically, left to right in pipeline order. The schema has no position key and gets none; a dragged box keeps its place only until the next layout and is never saved.
- A flow's own properties (name, description, arguments, model, body) are edited in F-11 from its box's properties panel. Blocks, Agent blocks and custom agents are F-12.
- + adds an empty flow with no Start and no End; the structure marks show what it still needs. The user adds those in the flow tab (F-12).
- A flow can be deleted from the Pipeline tab in F-11, after a confirmation.

Decisions taken in this specification (not owner decisions; changes are welcome at approval):

- A connection's artifact label is required (`ui.md` §4), on the Pipeline tab too.
- An arrow holds at most one gate; a second gate is refused with the reason.
- A check on an arrow has no true or false output on this tab: a failed check stops the process (`architecture.md` §9). Routing a check stays on the flow tab (F-12).
- The flow tab's body is a one-line placeholder until F-12 (as F-08 does for the steps).
- Deleting an arrow asks for confirmation, like Delete on a flow; Remove gate on an arrow needs no confirmation and keeps the arrow.

## Out of Scope

- The flow tab's content: blocks, Start, End, Agent, the flow's own Connection between blocks, Check routes, Move up and Move down, block properties, custom agents and their delete (F-12).
- Save, load and import or export of the pipeline as JSON (F-18, post MVP). The pipeline is in memory only; nothing is written to storage (`architecture.md` decision 13).
- Saving canvas positions. The schema has no position key (decision 33), and F-11 adds none.
- The Analyze step, its button and its findings list (F-13 and F-14). The builder only reports the config to its host after each change.
- Switching a block or a flow off (`architecture.md` decision 34).
- The process diagram with its gates (F-05 and F-18, `architecture.md` §10).
- The Demo button and presentation mode (F-23, post MVP).
- Phone and tablet layouts (decision 31).

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-11 AC-003`).

### US-001: The Pipeline tab and the flow tabs

**As a** builder user
**I want to** see the Pipeline tab first and one tab per flow after it, with a + button to add a flow
**So that** I can see the whole process and open any flow from one place.

**Requirements:** `features.md` F-11 (the Pipeline tab, flow tabs and +); `ui.md` §3.1, §3.3; decision 30

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: the tab row shows the Pipeline tab first, then one tab per flow in pipeline order, then a + button after the last tab.
- [ ] AC-002 `[auto]`: the Pipeline tab has no remove control, and no control on the tab row removes it (negative case: the tab is still there after every flow is deleted).
- [ ] AC-003 `[auto]`: + adds one flow with no blocks, with the id `flow-2`, `flow-3` and so on (the first number not used by another flow's id or name, so that the new name, which starts as the id, does not clash; owner decision, 2026-11-17), which is file-safe and unique in the pipeline (decision 18); the new flow's tab is selected at once.
- [ ] AC-004 `[auto]`: + is the only control that adds a flow (negative case: no toolbox, arrow panel or box panel on the Pipeline tab adds a flow).
- [ ] AC-005 `[auto]`: a flow tab shows the flow's name and a one-line placeholder that its blocks are built in F-12; the Pipeline tab shows the canvas.
- [ ] AC-006 `[device]`: the tab row spans the full width of the available space; it is not centred and has no fixed width.

### US-002: Flows as boxes and connections as arrows

**As a** builder user
**I want to** see every flow as a box and every connection as an arrow between two boxes
**So that** I can read the order of the process at a glance.

**Requirements:** `features.md` F-11 (canvas: flows as boxes, connections as arrows); `ui.md` §3.2; decision 24

#### Acceptance Criteria

- [ ] AC-007 `[auto]`: each flow is drawn as a box showing its name and its block count (table: 0, 1 and 5 blocks give `0`, `1` and `5`).
- [ ] AC-008 `[auto]`: each connection of the pipeline is drawn as an arrow from its source flow to its target flow, with its artifact label on the arrow.
- [ ] AC-009 `[auto]`: boxes are placed automatically, left to right in pipeline order; the same pipeline gives the same positions when laid out twice.
- [ ] AC-010 `[auto]`: laying out the canvas does not change the pipeline value: the saved config has no position key before or after the layout (negative case for position data).
- [ ] AC-011 `[device]`: the canvas pans, selects one item at a time and lets a box be dragged; a dragged box keeps its place until the next layout.
- [ ] AC-012 `[device]`: dragging an arrow's end onto another flow's box repoints that end of the connection; dragging the Connection tool from the toolbox onto a flow and then onto another flow starts a new connection, and the artifact label (AC-013) is asked before it is added (owner decision, 2026-11-17).

### US-003: Connections between flows

**As a** builder user
**I want to** connect one flow to the next with a labelled arrow, by drag or by button
**So that** the hand-over between two flows is named.

**Requirements:** `ui.md` §3.2 (connection between flows, repoint by drag, button path), §4 (Connection: artifact label required), §5 (every drag has a button path)

#### Acceptance Criteria

- [ ] AC-013 `[auto]`: a new connection needs a non-blank artifact label (table: empty, spaces only and a valid label); a blank label is refused, no connection is added, and the reason is shown next to the field.
- [ ] AC-014 `[auto]`: the source flow's properties panel has **Connect to next flow**; it lists the other flows, and choosing one and giving a label creates the same connection a drag would create.
- [ ] AC-015 `[auto]`: repointing an end through the arrow's panel (**Target flow** or **Source flow**) changes only that end; the label and any gate on the arrow stay.
- [ ] AC-016 `[auto]`: Delete on an arrow asks for confirmation; a confirmed delete removes the connection and its gate, and cancel changes nothing (negative case).

### US-004: Gates on arrows

**As a** builder user
**I want to** place an approval or a check on an arrow between two flows
**So that** the process stops for a person, or for a check, before the next flow starts.

**Requirements:** `features.md` F-11 (approval and check on the arrows, one gate per arrow); `ui.md` §3.2, §4 (Approval and Check); `architecture.md` §9 (gate types), decision 33 (gate types and their properties)

#### Acceptance Criteria

- [ ] AC-017 `[auto]`: **Add approval** on an arrow adds an approval with a description; a blank description is refused with the reason, and no gate is added.
- [ ] AC-018 `[auto]`: **Add check** on an arrow adds a check with a description and a type of `checks` or `diff size`. Table: `checks` without a threshold is valid; `checks` with a threshold is refused; `diff size` with a positive whole-number threshold is valid; `diff size` with a missing, blank, zero, negative or fractional threshold is refused; each refusal gives its reason and adds no gate.
- [ ] AC-019 `[auto]`: an arrow holds at most one gate: adding a second gate (approval or check) to an arrow that already has one is refused with the reason, and the existing gate stays (negative case).
- [ ] AC-020 `[auto]`: a check on an arrow has no true or false output on this tab: its properties show no output choice, and a failed check stops the process.
- [ ] AC-021 `[auto]`: **Remove gate** in the arrow's panel removes only the gate; the connection stays.
- [ ] AC-022 `[device]`: dragging an Approval or a Check from the toolbox onto an arrow adds that gate to the arrow; dropping it on a box or on empty canvas adds nothing.

### US-005: Toolbox and properties panels

**As a** builder user
**I want to** see the tools I can use and the properties of what I have selected
**So that** I can change the pipeline, a flow or a connection without leaving the tab.

**Requirements:** `features.md` F-11 (the Pipeline toolbox, the properties panel for the pipeline including its arguments); `ui.md` §3.2, §3.4, §4 (Pipeline and Flow properties); decision 26 (pipeline model, tools and body)

#### Acceptance Criteria

- [ ] AC-023 `[auto]`: the Pipeline toolbox holds Connection, Approval and Check in that order; it holds no Start and no End (negative case).
- [ ] AC-024 `[device]`: at the reference layout 1280 × 800 the toolbox is on the left at a fixed width, the canvas takes the centre, and the properties panel is on the right at a fixed width.
- [ ] AC-025 `[auto]`: with nothing selected, the properties panel shows the pipeline's name, description, arguments, model, tools, rule tags and body; with a flow selected, its name, description, arguments, model and body; with an arrow selected, its artifact label and its gate when it has one.
- [ ] AC-026 `[auto]`: each panel shows the file its item generates: the pipeline `.claude/commands/pipeline.md`, a flow `.claude/commands/<flow id>.md`. Note (2026-11-17): a flow's generated file is named from its id, not its name, as decision 18 states; the owner accepted the id in the approved plan (open point 1).
- [ ] AC-027 `[auto]`: an edit the parser accepts updates the pipeline value at once and the panel shows the new value; an edit the parser refuses keeps the previous value and shows the parser's message next to the field.
- [ ] AC-028 `[auto]`: a body (pipeline or flow) is at most 1000 characters, counted in code points: 1000 is accepted, 1001 is refused, and one emoji counts as one character (owner decision, 2026-11-17: the limit is written 1000, as the parser's message states it).
- [ ] AC-029 `[auto]`: a flow's name is free text that is non-blank and unique among the flows' names; a blank or duplicate name is refused with the reason, and the previous name stays (table of valid and refused names). The flow's id, which names its generated file, is file-safe (lowercase letters, digits and hyphens, starting with a letter, as decision 18 states) and is set when the flow is created; it is not changed by the Name field (owner decision, 2026-11-17).
- [ ] AC-030 `[auto]`: only one item is selected at a time; selecting another item moves the selection, and the panel shows that item (negative case: no two items selected).

### US-006: Deleting a flow

**As a** builder user
**I want to** delete a flow from the Pipeline tab, with a clear warning about what goes with it
**So that** I never remove a connection or gate by accident.

**Requirements:** `ui.md` §3.4 (Delete for a flow, with confirmation naming the connections it removes), §5 (Delete always asks for confirmation); decision 34 (no switch-off)

#### Acceptance Criteria

- [ ] AC-031 `[auto]`: Delete in a flow's footer asks for confirmation; the confirmation names every connection the flow has, in or out, and the gate on each; cancel changes nothing (negative case).
- [ ] AC-032 `[auto]`: a confirmed delete removes the flow's tab and box, its connections and their gates; no other flow, connection or gate changes.
- [ ] AC-033 `[auto]`: deleting the last flow is allowed; the structure marks then show that the pipeline has no flow, and no edit is blocked by it.
- [ ] AC-034 `[auto]`: a flow and its properties have no switch-off control (negative case, decision 34).

### US-007: Structure marks

**As a** builder user
**I want to** see the structural problems next to the items they name, as I edit
**So that** I can fix a broken process before I run the analysis.

**Requirements:** `features.md` F-11 (structure marks next to the items they name); `ui.md` §3.5; `architecture.md` §12 (structural rules), decision 24 (marks reuse the analyzer's rules)

#### Acceptance Criteria

- [ ] AC-035 `[auto]`: a finding from `analyzeStructure` that names a flow, a connection or a gate is shown beside that item, in its severity colour (blocker red, warning amber, info grey) with its message.
- [ ] AC-036 `[auto]`: a finding that names an item not drawn on this tab (a block, or the pipeline as a whole) is listed under the heading "Not on a drawn item", with its message and its path.
- [ ] AC-037 `[auto]`: the marks are updated after every edit; a blocker never stops an edit (negative case: Delete and Add stay enabled while a blocker shows).
- [ ] AC-038 `[auto]`: brief problems (name, idea, stack and rules) are not shown on the Pipeline tab.
- [ ] AC-039 `[auto]`: the marks are the findings of `analyzeStructure` for the same config, unchanged; the builder adds no rule of its own (test: a fixed config gives the same findings from both).

### US-008: Builder state and the default pipeline

**As a** builder user
**I want to** start from the default process and have my edits kept while I work
**So that** I can change the default instead of building one from nothing.

**Requirements:** `architecture.md` decision 24 (in-memory view-model, reported to the host), decision 13 (no storage); `ui.md` §1.1 (New project starts over, F-08)

#### Acceptance Criteria

- [ ] AC-040 `[auto]`: the pipeline is held in memory and reported to the wizard after each change; the builder makes no network call and writes no storage (negative case: nothing is written to `localStorage`, `sessionStorage` or IndexedDB).
- [ ] AC-041 `[auto]`: when the wizard opens, the Pipeline tab shows the default pipeline: its flows as tabs in the default order.
- [ ] AC-042 `[auto]`: New project restarts the pipeline at the default pipeline, and every edit is discarded.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| The Pipeline tab, which cannot be removed (`features.md` F-11) | AC-001, AC-002 |
| One tab per flow, and a + button after the last tab that adds a flow | AC-001, AC-003, AC-004 |
| The canvas shows flows as boxes | AC-007, AC-009, AC-011 |
| Connections shown as arrows | AC-008, AC-012, AC-013, AC-014, AC-015, AC-016 |
| Approval and check on the arrows, one gate per arrow | AC-017, AC-018, AC-019, AC-020, AC-021, AC-022 |
| The properties panel for the pipeline, including its arguments | AC-025, AC-026, AC-027 |
| Structure marks next to the items they name | AC-035, AC-036, AC-037, AC-038, AC-039 |
| The Pipeline toolbox (Connection, Approval, Check) | AC-023, AC-024 |
| No Start or End on this tab | AC-023 |
| The flow tab is a placeholder until F-12 (decision for this specification) | AC-005 |
| Flow properties edited from its box (owner decision) | AC-025, AC-027, AC-028, AC-029 |
| Delete a flow from the Pipeline tab (owner decision) | AC-031, AC-032, AC-033, AC-034 |
| Box layout automatic, no saved positions (owner decision) | AC-009, AC-010, AC-011 |
| The default pipeline is the start (`ui.md` §3, decision 24) | AC-041, AC-042, AC-040 |

---

## Amendment 2026-11-17 (owner, after Verify): connections carry artifacts and checks; no toolbox

The owner asks for these changes before implementation. They supersede the criteria named below; the superseded criteria stay in the text for the record and are not tested. The UX screens are redrawn from this amendment before the plan changes.

- **Connections have no label.** The arrow shows no artifact label. Artifacts belong to the connection and are listed in its properties.
- **Artifacts (replace AC-013 and the label parts of AC-014 to AC-016).** A connection holds any number of artifacts. Each artifact has a `label` (free text, one line, required, non-blank) and a `template` (free text, several lines, may be empty). Add artifact, edit, and remove are in the connection's properties. A refused value keeps the saved value and shows its reason beneath the field.
- **Human approval is a checkbox (replaces AC-017 and the approval parts of AC-019 and AC-021).** The connection has a "Human approval" checkbox. Ticked, the process stops for a person at this connection; unticked, it does not. No description is needed.
- **Checks are added from the properties (replaces AC-018, AC-019 and AC-021).** A connection can hold any number of checks. "Add check" in the connection's properties adds one. Each check has a description (required, non-blank), a type (`checks` or `diff size`) and, for `diff size` only, a positive whole-number threshold (AC-018's table still applies to a check). A check is removed from its own row. Checks have no true or false output (AC-020 still applies).
- **No toolbox on the Pipeline tab (replaces AC-023 and the drop parts of AC-012 and AC-022).** The Connection, Approval and Check tools are removed from the Pipeline tab. A connection is still made by dragging from one flow's connection point to another's, or by the button "Connect to next flow" in the source flow's properties.
- **Unchanged:** the one outgoing arrow per flow (AC-014 refusal), the no-self-connection rule, repointing an arrow end (AC-015 without its label), delete of a connection (AC-016 without its label and gate), the flow properties and delete (AC-025 for flows, AC-031 to AC-034), the structure marks (AC-035 to AC-039), the default pipeline (AC-040 to AC-042).

New criteria for the amendment:

- AC-043 `[auto]`: a connection holds any number of artifacts, each with a non-blank one-line label and a template that may be empty and may span lines; adding an artifact appends it; a blank label is refused with the reason and the artifact is not added.
- AC-044 `[auto]`: an artifact can be edited and removed; a refused edit keeps the saved values and shows the reason beneath the field.
- AC-045 `[auto]`: the connection's "Human approval" checkbox is on or off; switching it on and off changes only that flag; the arrow itself shows no label.
- AC-046 `[auto]`: "Add check" adds one check to the connection; a connection holds any number of checks; each check is removed on its own row; an invalid check (blank description, a threshold on `checks`, a missing or non-positive threshold on `diff size`) is refused with the reason and not added.
- AC-047 `[auto]`: the Pipeline tab has no toolbox; no Connection, Approval or Check tool is offered on the tab.
- AC-048 `[device]`: the arrows show no label; the connection's properties show its artifacts, checks and approval checkbox (checked on screen at Verify).

---

## Decisions 2026-11-18 (owner, on the redrawn screens)

- **Arrows show no label.** The artifact label is not on the arrow (AC-048).
- **Artifacts, checks and the approval flag belong to the source flow's connection.** They are edited in that connection's properties; the arrow itself carries nothing.
- **Linear flow.** A flow with an outgoing arrow never offers a second one. "Connect to next flow" is not offered on such a flow, so the refusal of AC-014 is not reachable from the UI.
- **No loops.** A drag or a "Connect to next flow" that would close a loop is refused, with the reason, and nothing is added. The structural rule (architecture §12) still flags any loop that reaches the file, as a safety net.
- **Repoint by drag only.** The arrow's end is moved by dragging it (AC-015 as drawn); no picker in the panel.
- **Empty artifacts.** A new connection's artifact list is empty; no empty-state line is drawn.
- **Model.** Open: the stored model keeps one label and one gate per connection (`architecture.md` §6 decision 33). Multiple artifacts and multiple checks need a change to the stored model. Not decided.

---

## Decision 2026-11-18 (owner): artifacts, checks and approval belong to the flow

- **A connection only points one flow to another.** It carries no artifacts, no checks and no approval. Its properties show the source and target only (already drawn); it has no fields to edit.
- **A flow has outcome artifacts (multiple).** Each artifact has a `label` (one line, required, non-blank) and a `template` (several lines, may be empty). The flow's properties list them: add, edit and remove. This replaces the artifacts of the connection in AC-043 and AC-044.
- **A flow has checks (multiple).** "Add check" in the flow's properties adds one check, as in AC-046; each check is removed on its own row.
- **A flow has a "Human approval" checkbox.** Owner assumption, to be confirmed on the screens: the approval moves with the checks and sits on the flow, as AC-045 says for the connection.
- **Model (decision needed to implement).** The stored model changes: a flow holds `artifacts`, `checks` and `approval`; a connection holds only its target. This supersedes `architecture.md` §6 decision 33 for the connection's label and gate. Recorded for approval before any code.

---

## Decision 2026-11-18 (owner, second): a flow is one JSON object; there is no connection object

- **A flow holds:** its id, name, description, arguments, model, body, blocks, its outcome `artifacts` (each with `label` and `template`), its `checks`, its `approval` (on or off) and its `next` (the id of the next flow, or none).
- **There is no connection object.** The arrow is drawn from a flow's `next`. "Connect to next flow" sets `next`; the connection points set `next`; repointing changes `next`.
- **Human approval stops the process at the end of its flow.**
- **Delete removes the whole flow object**: its artifacts, checks, approval and its `next`. Flows pointing to it lose that `next`.
- **Keep** the scroll in the flow panel; **keep** "No checks yet." for checks.
- **Template help text:** open (the owner asked for the wording).
- **Not approved yet:** the screens wait for a visual style change; they are not committed.
- **Model:** this replaces `architecture.md` §6 decision 33 (connections as `connectedTo` with a label and gate). Needs an architecture decision before code.

---

## Decision 2026-11-18c (owner): a check is free text

- **A check is free text only.** It has no type (`checks` or `diff size`) and no threshold. The check's text says what must pass, and a check is removed on its own row. This supersedes the type and threshold rules of AC-018 and the check's fields in AC-046 (the blank-description refusal remains: a check's text is required, non-blank).
- **Human approval** remains the flow's checkbox, as in the 2026-11-18 decision.

---

## Decision 2026-11-18d (owner): the next flow is set only by drag

- **No next-flow field on the flow panel.** The flow's next flow is set only by dragging a connection point of one flow onto another flow (AC-012, connection points). The "Connect to next flow" button path of AC-014 is removed; the Connection tool drag is removed too (the decision of 2026-11-18 already removed the toolbox).
- **Read-only text of the next flow** may stay only where the flow is shown as a link (for example the "Next flow" line on a flow that already has one), not as an editable field. Screen 03 drops it.

---

## Decision 2026-11-18e (owner): required attributes of a flow; a flow must be connected

- **A flow's required attributes are its name and its body.** Description and arguments are optional.
- **A flow must be connected**: it has an incoming or an outgoing link to another flow. The only exception is a pipeline with one flow.
- **Structure marks (AC-035 to AC-037)**: the blocker for a flow with no link is shown on the flow's box when the pipeline has more than one flow. The "no End block" example of screen 06 is no longer a use case and the screen is removed.
