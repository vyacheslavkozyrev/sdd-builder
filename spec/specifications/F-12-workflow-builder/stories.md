# User Stories — Workflow builder (F-12)

Feature entry: `spec/documents/features.md` → F-12
Requirements owned by this feature: the flow tab's blocks (Start, Agent, Condition, End), their properties, custom agents (Agent blocks), arrows between blocks, and block delete.

Owner decisions used here (2026-11-23, Specify questions): Condition blocks are in F-12; order comes from the arrows (no Move up or Move down); Start and End block linking is by dragging from one point to another, as on the Pipeline tab (F-11); a flow keeps its Start and at least one End.

## Out of Scope

- The Pipeline tab, the flow panel, the pipeline panel and the flow's outcome artifacts (F-11). This feature changes the flow tab only.
- Move up and Move down buttons. Block order comes from the arrows (owner decision 2026-11-23).
- Saved block positions. The layout is automatic, as on the Pipeline tab (F-11).
- A Link tool in the toolbox. Arrows are made by dragging between points (owner decision 2026-11-23).
- The Analyze step, the analyze block and its findings list (F-13).
- Save, load, import and export of the pipeline (F-18). The pipeline is in memory only.
- Generated output: the command and agent files, and the mapping of blocks to files (F-04, F-05).
- Changes to the parser or the schema rules. A rule that disagrees with these stories is listed under "Open for approval" in `progress.md`, not changed here.
- Phone and tablet layouts; browser (end-to-end) tests, unless a criterion says otherwise.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-12 AC-003`).

### US-001: Add blocks from the toolbox

**As a** builder user
**I want to** add a Start, Agent, Condition or End block to the flow I am editing
**So that** I can build the flow's steps and checks

**Requirements:** F-12 flow tab toolbox; blocks of a flow (ui.md §3.3, §4)

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The flow tab shows a floating toolbox at the top right of the canvas with four icon buttons, Agent, Condition, Start and End, each with its name as a tooltip. There is no Link, Move, Connection or Delete-flow control on the flow tab.
- [ ] AC-002 `[auto]`: Pressing Agent, Condition or End adds one new block of that kind to the flow. The new block has no arrows, is selected, and its panel opens.
- [ ] AC-003 `[auto]`: Start is disabled while the flow already has a Start block. The reason, "This flow already has a Start block.", is shown as text beside the toolbox.
- [ ] AC-004 `[auto]`: A new block's id is `block-N` with N the lowest number not used by a block of the same flow. Ids are unique within the flow and file-safe.
- [ ] AC-005 `[auto]`: Adding a block to one flow never changes the blocks, arrows or properties of another flow.
- [ ] AC-006 `[auto]`: A flow with no blocks shows "No blocks yet." on the canvas. A flow created on the Pipeline tab starts with no blocks.

### US-002: Blocks and arrows on the canvas

**As a** builder user
**I want to** see the flow's blocks and how they connect
**So that** I can read the order and the checks of the flow at a glance

**Requirements:** blocks on the canvas (ui.md §3.3; pipeline-schema.md §1 and §6)

#### Acceptance Criteria

- [ ] AC-007 `[device]`: A Start is a circle with the primary outline; an End is a circle with the dark text outline; an Agent is a rounded box showing its name and one line of its description, cut with an ellipsis when long; a Condition is a diamond with its description above it, or below it when either of its routes returns to an earlier Agent (amended 2026-11-23; the pre-check of screen 03 is above). The selected block has the primary outline on the tint.
- [ ] AC-008 `[device]`: An arrow runs from the output point of a block to the input point of its target. A normal arrow is solid. An arrow that goes back to an earlier Agent is dashed and labelled "up to N rounds" with its round limit. The true output of a Condition is labelled "true" and its false output "false".
- [ ] AC-009 `[auto]`: The canvas places the blocks in the order of their arrows, starting from Start, with the same layout for the same blocks. Blocks not reached from Start follow the chain in list order, after it. The End block is placed after every other block of its flow, as on screen 01 (amended 2026-11-23).
- [ ] AC-010 `[auto]`: The canvas heading shows the flow's name and a count line "N Agents, N Conditions". With no Agent and no Condition, the count line reads "0 Agents, 0 Conditions".
- [ ] AC-011 `[auto]`: Selecting a block opens its panel. Selecting an arrow opens the arrow's panel: its source and target are shown read-only, and Delete connection asks first (AC-021).

### US-003: Link blocks by dragging between points

**As a** builder user
**I want to** draw an arrow from one block to the next
**So that** I set the order and the routes of the flow

**Requirements:** arrows between blocks; linking as on the Pipeline tab (F-11 US-003)

#### Acceptance Criteria

- [ ] AC-012 `[device]`: A drag starts at an output point (the right point of a block) and ends on an input point (the left point) of another block of the same flow. The drag shows the arrow while it moves.
- [ ] AC-013 `[auto]`: Output points by kind: Start has one (its first block), Agent has one (its next block), Condition has two (true and false), End has none. Input points: Start has none; Agent, Condition and End each have one.
- [ ] AC-014 `[auto]`: A Start links only to an Agent or a Condition. Linking a Start to an End is refused with the reason "A Start links to an Agent or a Condition."
- [ ] AC-015 `[auto]`: An output that already has an arrow is refused with the reason "This block already has an arrow from this point." A drop onto the block itself is refused with the reason "A block cannot link to itself."
- [ ] AC-016 `[auto]`: An Agent's output and a Condition's true output link only to a later block of the flow. A link back to an earlier block is refused with the reason "Only a false route can return to an earlier Agent."
- [ ] AC-017 `[auto]`: A Condition's false output can link to a later block (no round limit) or to an earlier Agent (a return). A false output that links to an earlier block which is not an Agent is refused with the reason "Only an Agent can be returned to." A return is drawn dashed; its round limit is required and starts unset, and the block's panel shows that it is incomplete until a limit from 1 to 5 is set.
- [ ] AC-018 `[auto]`: A drag that starts at an input point does not start a link. A drop on a block that has no input point (Start) is refused with the reason "A Start has no input point."
- [ ] AC-019 `[auto]`: Dragging an arrow's end to another valid target moves that end through the same rules. A refused drop keeps the arrow as it was and shows the reason in the message band.
- [ ] AC-020 `[auto]`: An output with no arrow means "no route" for a true output (a finding, see US-008) and "Stop the flow and ask the user" for a false output (the default).
- [ ] AC-021 `[auto]`: Delete connection on an arrow's panel asks first; a confirmed delete removes the arrow and leaves its source's output empty, the other arrows unchanged.

### US-004: Agent properties and custom agents

**As a** builder user
**I want to** name and describe each Agent block and give it its instructions
**So that** the generated agent file carries what the step needs

**Requirements:** Agent properties (ui.md §4); agent reads, writes and rule tags (pipeline-schema.md §6)

#### Acceptance Criteria

- [ ] AC-022 `[auto]`: The Agent panel has, in this order: Name, Description, Arguments (rows of id, required and hint, as on the flow panel), Model, Tools, Reads, Writes, Rule tags, Body. Each row or field is saved through the parser, as on the Pipeline tab.
- [ ] AC-023 `[auto]`: Name is file-safe and unique among the Agent names of the pipeline. A name that clashes with another Agent is refused with the reason "Another Agent already has this name." and the saved name stays.
- [ ] AC-024 `[auto]`: Description is required, not blank, and at most 1000 characters. A blank or longer value is refused with its reason beneath the field, and the saved value stays.
- [ ] AC-025 `[auto]`: Model accepts only `haiku`, `sonnet`, `opus` and `inherit`. Any other value is refused.
- [ ] AC-026 `[auto]`: Reads and Writes take artifact labels from the outcome artifacts of the flows of the pipeline. A label that is not one of them is refused; a label listed twice is refused.
- [ ] AC-027 `[auto]`: Rule tags name only rules of the project; an unknown rule is refused with its reason.
- [ ] AC-028 `[auto]`: Body is required, not blank, and at most 1000 code points; the counter shows the count. A blank body and a 1001-code-point body are both refused with their reasons.
- [ ] AC-029 `[auto]`: Editing an Agent's properties never changes its arrows or any other block.

### US-005: Condition properties

**As a** builder user
**I want to** say what a Condition checks and where each of its answers goes
**So that** the flow stops, returns or continues on the right answer

**Requirements:** Condition blocks and routes (pipeline-schema.md §1, §3 and §6; decision 40)

#### Acceptance Criteria

- [ ] AC-030 `[auto]`: The Condition panel has a Description: what is checked, in free text, required, not blank, at most 1000 characters. A blank value is refused with its reason beneath the field.
- [ ] AC-031 `[auto]`: The true route is shown read-only as "Next: <block name>" for the block its arrow leads to, or "No arrow yet" when there is none.
- [ ] AC-032 `[auto]`: The false route is shown as one of three texts: "Stop the flow and ask the user" (no arrow, the default), "Goes to <block name>" (a later block), or "Returns to <block name>, up to N rounds" (an earlier Agent).
- [ ] AC-033 `[auto]`: The round limit of a return is an integer from 1 to 5, required. 0, 6, a non-integer and a blank value are refused with the reason "A return allows 1 to 5 rounds." The saved limit stays.
- [ ] AC-034 `[auto]`: A false route to a later block has no round limit; the panel shows no round field for it.

### US-006: End properties

**As a** builder user
**I want to** say how a flow ends and which outcome artifact it produces
**So that** the generated command ends with the right hand-over

**Requirements:** End block (ui.md §4; pipeline-schema.md §6)

#### Acceptance Criteria

- [ ] AC-035 `[auto]`: The End panel has Outcome, a choice of `done` or `stopped`, required. A new End starts with `done`.
- [ ] AC-036 `[auto]`: The End panel has Produced artifact: one of the outcome artifact labels of its flow, required. "none" is not offered. With no outcome artifacts on the flow, the field is empty and reads "Add an outcome artifact on the flow panel first."
- [ ] AC-037 `[auto]`: Removing an outcome artifact that an End names moves that End to the flow's first remaining outcome; renaming the artifact renames the End's reference to it. Removing the flow's only outcome is refused with the parser's reason and the End keeps the artifact (F-11 amendments of 2026-11-22 and 2026-11-23).
- [ ] AC-038 `[auto]`: A flow may hold more than one End block. Each End has its own outcome and produced artifact.

### US-007: Delete blocks

**As a** builder user
**I want to** remove a block I no longer need, after a confirmation
**So that** a wrong step does not stay in the flow by accident

**Requirements:** block delete (features.md F-12; ui.md §3.3, §4; owner decision 2026-11-23)

#### Acceptance Criteria

- [ ] AC-039 `[auto]`: Each block's panel has a Delete block control. Pressing it opens a confirmation that names the block and the number of arrows that will be removed. Cancel keeps the block and its arrows.
- [ ] AC-040 `[auto]`: A confirmed delete removes the block and all arrows that start or end at it. Other blocks keep their own properties.
- [ ] AC-041 `[auto]`: A block that another block routed to keeps its own properties and has its route cleared: a true output shows "No arrow yet", a false output shows "Stop the flow and ask the user", a Start or Agent output shows "No arrow yet". No arrow is rewired to another block.
- [ ] AC-042 `[auto]`: The flow's Start block cannot be deleted. Its Delete control is disabled with the reason "A flow keeps its Start block." shown beside it.
- [ ] AC-043 `[auto]`: The flow's last End block cannot be deleted. Its Delete control is disabled with the reason "A flow keeps at least one End block." shown beside it.
- [ ] AC-044 `[auto]`: Deleting a block does not delete the flow, the pipeline or any other flow; the flow tab stays on the same flow.

### US-008: Structure marks on blocks

**As a** builder user
**I want to** see which blocks or arrows the structural checks question
**So that** I can fix the flow before generating it

**Requirements:** structure marks (F-11 US-006; structural rules, architecture.md §12)

#### Acceptance Criteria

- [ ] AC-045 `[auto]`: A finding of the structural checks that names a block of the flow is shown on that block. A finding that names an arrow is shown on that arrow. Any other finding is listed under "Not on a drawn item" (F-11).
- [ ] AC-046 `[auto]`: The structural checks report, and the flow's box on the Pipeline tab shows as blocked, while the flow has no Start, no End, a block not reached from Start, a block with no route out (shown with the analyzer's message, "must name a block of this flow"), a Condition with no true arrow or a blank description, a return with no round limit, or an End with no produced artifact (amended 2026-11-23: the message is the analyzer's; a Condition's blank description is refused by the core rule of task T026).
- [ ] AC-047 `[auto]`: A new unlinked block is not refused in editing. Its marks say what is missing (for example "No route out"), and the flow stays editable.
- [ ] AC-048 `[auto]`: Marks are read-only. No mark adds a control or changes a property.

### US-009: Flow tab state, tabs and the parser path

**As a** builder user
**I want to** move between flows and keep what I built
**So that** I can work on the whole pipeline

**Requirements:** flow tabs (F-11 US-001); parser path (F-11 US-007)

#### Acceptance Criteria

- [ ] AC-049 `[auto]`: The flow tab replaces the F-11 placeholder for every flow. Switching between the Pipeline tab and flow tabs keeps each flow's blocks, arrows and selection of its own.
- [ ] AC-050 `[auto]`: Every block change is made on a copy of the pipeline and accepted only when the parser accepts it. A refused change keeps the saved value and shows its reason, and the pipeline in memory changes only on accepted changes.
- [ ] AC-051 `[auto]`: The default pipeline's flows show their blocks exactly as the model holds them, with the arrows of each flow's `next` and routes.
- [ ] AC-052 `[auto]`: Block state lives in memory only. The web app's storage and log rules are kept: nothing is written to browser storage or the console (the scan test of F-11 AC-041 covers the builder files).
- [ ] AC-053 `[auto]`: The wizard's step 3 keeps the pipeline when the user moves to step 4 and back.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| Toolbox: Agent, Condition, Start, End; no Link, Move or Connection | AC-001, AC-002, AC-003 |
| Ids of new blocks | AC-004 |
| Flow isolation and empty flow | AC-005, AC-006 |
| Blocks and arrows on the canvas | AC-007, AC-008, AC-009, AC-010, AC-011 |
| Linking by dragging between points | AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018, AC-019 |
| Empty output means no route or stop | AC-020 |
| Delete connection | AC-021 |
| Agent properties (name, description, arguments, model, tools, reads, writes, rule tags, body) | AC-022, AC-023, AC-024, AC-025, AC-026, AC-027, AC-028, AC-029 |
| Custom agents are Agent blocks | AC-022, AC-023 |
| Condition: description, true and false routes, round limit | AC-030, AC-031, AC-032, AC-033, AC-034 |
| End: outcome and produced artifact; more than one End | AC-035, AC-036, AC-037, AC-038 |
| Delete block with confirmation; its arrows; Start and last End kept | AC-039, AC-040, AC-041, AC-042, AC-043, AC-044 |
| Structure marks on blocks and arrows | AC-045, AC-046, AC-047, AC-048 |
| Tabs, parser path, default pipeline, memory only, step 3 state | AC-049, AC-050, AC-051, AC-052, AC-053 |
