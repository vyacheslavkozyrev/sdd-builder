# User Stories — Visual builder: the Map tab, flow tabs, gates and checks, custom agents (F-06)

Feature entry: `spec/documents/features.md` → F-06 (absorbs F-14 and F-15)
Requirements owned by this feature: R-01 to R-09 (listed in the Requirement Coverage table)

## Out of Scope

- Saving, importing and exporting a configuration (F-08). Reloading the page resets the builder (F-20 adds autosave later).
- Presets and other starting pipelines than the default (F-09).
- Structural analysis on the server and the LLM review of the brief (F-04). F-06 shows the structural marks while the user edits; F-04 runs the same rules at analyze time.
- The wizard's step 3 that hosts the builder (F-05). F-05 places the builder; F-06 provides it.
- The process diagram in presentation mode, and Mermaid output (F-18).
- Review as a check type. A review is an Agent block (the `review` agent), not a Condition type.
- Skills and scripts as blocks; a second pipeline; a release flow.
- Flows nested inside a flow. The pipeline holds flows, and a flow holds blocks only (building-blocks §1).

## Decisions taken in this specification (the user is asked to approve them)

- **Placement:** a gate or check can be dragged onto a connection, and it can also be added from the connection's panel. The model operation is proven by tests; the drag gesture is checked by a person.
- **Map toolbox:** Connection, Approval and Check (as decided 2026-11-15). The user confirmed that Approval and Check are the only gates on the Map. A Check carries one of two types: `checks` (agent decided) or `diff-size` (a line threshold). Review is an Agent block, so it is not a Condition type. Inside a flow, a Condition offers the same three types: `approval`, `checks`, `diff-size`.
- **Validation:** the builder marks structural problems next to the item as the user edits, using the structural rules of building-blocks §7 from `source/packages/core`. A mark never refuses an edit. Only a value the model cannot hold is refused at entry (an id, a name, a number, a body over its cap).
- **Structural rules live in core:** the live marks need the rule set in core, so F-04 uses the same module at analyze time. This changes the dependency: F-06 needs the rule module from F-04. The owner is asked to confirm this before Plan.
- **Ordering:** a block is added after the selected block (or at the end of the flow when none is selected) and can be moved up or down. A flow is added after the last tab.
- **Removal:** a deleted item is removed after a confirmation; routes that pointed to it are left unwired and marked. Switching off keeps the item and its properties (building-blocks §13).
- **Condition description:** required, because the generated rule for a Condition is written from it.
- **Custom agent body cap:** 4,000 characters (the user's choice, 2026-11-15).

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-06 AC-003`).

### US-001: See the pipeline on the Map tab

**As a** user
**I want to** see the whole process as a diagram of its flows
**So that** I can understand the order of the phases and the gates between them

**Requirements:** R-01

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The Map tab draws the pipeline's child flows as nodes, in order from left to right, each with its name, its scope and its number of blocks.
- [ ] AC-002 `[auto]`: The tab row holds the Map tab first, then one tab per child flow in order. Selecting a flow node or a flow tab opens that flow's tab.
- [ ] AC-003 `[auto]`: A Connection between two flows is drawn as an arrow with its artifact label.
- [ ] AC-004 `[auto]`: A Condition on a connection between two flows is drawn as a diamond on the arrow, with its pass output and its fail output labelled.
- [ ] AC-005 `[device]`: On a desktop browser at its default window size, the diagram of the default pipeline is legible and no node or label overlaps another, as judged by a person.

### US-002: Add and connect flows on the Map

**As a** user
**I want to** add a flow and connect it to the flows around it
**So that** I can extend the process with a new phase

**Requirements:** R-01

#### Acceptance Criteria

- [ ] AC-006 `[auto]`: The + at the end of the tab row adds a flow after the last tab. The new flow has a file-safe id that is unique in the pipeline, one Start block and one End block, and a default name the user can change.
- [ ] AC-007 `[auto]`: A flow id that is not file-safe, or that repeats an id already in the pipeline, is refused at entry and the flow keeps its previous id.
- [ ] AC-008 `[auto]`: A Connection drawn from one flow to another adds a Connection with an artifact label. An empty artifact label is refused at entry.
- [ ] AC-009 `[auto]`: A connection that closes a cycle is marked as a structural problem, and the edit is kept (cycles are the structural rule in building-blocks §7).

### US-003: Gates and checks on connections

**As a** user
**I want to** place an approval or a check between two flows
**So that** the process stops until a person or an agent says it may go on

**Requirements:** R-02

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: Dragging an Approval onto a connection places a Condition with check type `approval` on that connection. Its decided-by is `human` and it cannot be changed.
- [ ] AC-011 `[auto]`: Dragging a Check onto a connection places a Condition with check type `checks` or `diff-size`, chosen in its panel. Its decided-by is `agent`. The check type `review` is not offered.
- [ ] AC-012 `[auto]`: Selecting a connection and adding an Approval or a Check from its panel places the same Condition as the drag does (AC-010 and AC-011 apply to both).
- [ ] AC-013 `[auto]`: A `diff-size` check has a threshold in lines. A threshold that is not a positive whole number is refused at entry.
- [ ] AC-014 `[auto]`: A gate's pass route goes to the next flow. Its fail route is either to stop, or back to an earlier flow. Routes to the same flow or to a later flow are not offered.
- [ ] AC-015 `[auto]`: A back route on a gate has an optional round limit. An empty limit means no limit and the panel shows a warning that the retry is unbounded (building-blocks §12). A limit that is not a positive whole number is refused at entry.
- [ ] AC-016 `[auto]`: A Condition's description (what passing means) is required. An empty description is refused at entry.

### US-004: Blocks inside a flow

**As a** user
**I want to** build the steps of a flow in order
**So that** the command for that phase runs its steps in the order I set

**Requirements:** R-02

#### Acceptance Criteria

- [ ] AC-017 `[auto]`: A flow tab shows its blocks in order. The Start block is first and the End blocks are last.
- [ ] AC-018 `[auto]`: The toolbox on a flow tab holds Start, Agent, Condition, Connection and End. Adding a second Start to a flow is refused, because a flow has one Start.
- [ ] AC-019 `[auto]`: Adding a block places it after the selected block, or at the end of the flow when none is selected. A block can be moved up or down, and the order of the other blocks stays the same.
- [ ] AC-020 `[auto]`: A Connection inside a flow joins two blocks of the same flow. A Connection to a block in another flow is not offered.
- [ ] AC-021 `[auto]`: A Condition inside a flow has a pass route and a fail route. Each route is the next block, a back route to an earlier block of the same flow (with an optional round limit), or stop. No route points to another flow.
- [ ] AC-022 `[auto]`: A flow with no End block is marked as a structural problem (building-blocks §7), and the mark is removed when an End is added.

### US-005: Property panels for each block

**As a** user
**I want to** set the properties of each block in its panel
**So that** the generated files say what I mean

**Requirements:** R-03

#### Acceptance Criteria

- [ ] AC-023 `[auto]`: Selecting a block or a flow opens its property panel. The panel lists the properties that building-blocks §3 gives for that kind: Start, Agent, Condition, Connection, End and Flow.
- [ ] AC-024 `[auto]`: Each panel shows the file the block generates (`.claude/agents/<name>.md` for an Agent, `.claude/commands/<flow>.md` for a flow, the pipeline command for the pipeline), and the block's rule tags.
- [ ] AC-025 `[auto]`: A rule tag is the name of a rule file (file-safe, without the folder). A duplicate tag on the same block is refused at entry.
- [ ] AC-026 `[auto]`: An Agent block has a name, a description, a scope (`project`, `feature` or `task`), a model (`haiku`, `sonnet`, `opus` or `inherit`), an allowed tool list and a body. An empty name or description is refused at entry.
- [ ] AC-027 `[auto]`: An Agent name that is not file-safe, or that another Agent block in the project already uses, is refused at entry.
- [ ] AC-028 `[auto]`: An Agent whose scope is `feature` or `task` needs an iteration source produced by an upstream block. Without one, the panel marks the problem (the rule in building-blocks §7).

### US-006: Custom agents

**As a** user
**I want to** add my own agent to a flow
**So that** a step the default pipeline does not have can run in the process

**Requirements:** R-04

#### Acceptance Criteria

- [ ] AC-029 `[auto]`: A custom agent is added from a flow tab's toolbox as an Agent block with the properties of AC-026. A flow may have no custom agent.
- [ ] AC-030 `[auto]`: An Agent body longer than 4,000 characters is refused at entry. A body of exactly 4,000 characters is accepted.
- [ ] AC-031 `[auto]`: A custom agent is generated as `.claude/agents/<name>.md` with the frontmatter of its name, description, model and tools, and its body (the generator output is covered by F-02 and F-03; the builder keeps the properties it needs).

### US-007: Switch off and delete

**As a** user
**I want to** switch a block or flow off without losing it, and delete what I do not need
**So that** I can test a variant of the process and keep the original for later

**Requirements:** R-05

#### Acceptance Criteria

- [ ] AC-032 `[auto]`: Switching a block or flow off sets it to disabled. It stays in place, keeps its properties and is drawn in a muted style with an "off" label. Switching it on again restores it.
- [ ] AC-033 `[auto]`: A disabled block or flow is not marked as a structural problem (building-blocks §13).
- [ ] AC-034 `[auto]`: Deleting a block or a flow asks for confirmation. After confirmation it is removed with its connections, and the routes that pointed to it are left unwired and marked as a structural problem.
- [ ] AC-035 `[auto]`: The Start block of a flow, and the Start block of the pipeline, cannot be deleted. The request is refused with a message naming the flow.

### US-008: Live structural marks

**As a** user
**I want to** see a broken structure as I edit it
**So that** I fix it before I run the analysis

**Requirements:** R-06

#### Acceptance Criteria

- [ ] AC-036 `[auto]`: A Condition with an unwired pass or fail output is marked next to the item.
- [ ] AC-037 `[auto]`: A flow with no Start or no End is marked. A flow with two Start blocks cannot be made, because AC-018 refuses it.
- [ ] AC-038 `[auto]`: The marks come from the structural rules of building-blocks §7 in `source/packages/core`. The same module is used by the analyzer (F-04), so one rule has one implementation.
- [ ] AC-039 `[auto]`: A mark never refuses an edit. After any sequence of edits, the builder's state is a configuration that the F-01 parser accepts, or the state holds a mark that says why it is not complete.
- [ ] AC-040 `[auto]`: A retry with no round limit is shown as a warning, not as an error (building-blocks §12).

### US-009: Pipeline properties, starting point and session

**As a** user
**I want to** start from the default process, set the pipeline's own properties, and have the builder report its configuration to the wizard
**So that** the wizard can use the process I built

**Requirements:** R-07, R-08, R-09

#### Acceptance Criteria

- [ ] AC-041 `[auto]`: The builder starts from the default pipeline in `source/templates/pipeline/default.json`, as the core loads it. It shows the six flows and the five gates of building-blocks §4.
- [ ] AC-042 `[auto]`: The pipeline's panel holds its name, description, arguments (name, required or optional, hint), model, tools, rule tags and body. Argument names must be unique; a repeated name is refused at entry.
- [ ] AC-043 `[auto]`: The builder accepts an initial configuration from its host and reports its current configuration to the host after each change.
- [ ] AC-044 `[auto]`: The builder sends no request to the server while the user edits. Its state is kept in memory for the page session only.
- [ ] AC-045 `[device]`: Reloading the page resets the builder to the default pipeline. A person checks this in a browser.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| R-01 Map tab: the pipeline's flows, tab row, connections, adding flows | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009 |
| R-02 Flow tabs, gates and checks: the blocks in order, Approval and Check on connections | AC-010, AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018, AC-019, AC-020, AC-021, AC-022 |
| R-03 Property panels for each block, the generated file and rule tags | AC-023, AC-024, AC-025, AC-026, AC-027, AC-028 |
| R-04 Custom agents (F-14): a toolbox item with the properties of an agent, body cap | AC-029, AC-030, AC-031 |
| R-05 Switch off and delete, with the item kept when switched off | AC-032, AC-033, AC-034, AC-035 |
| R-06 Live structural marks, using the core rules shared with F-04 | AC-036, AC-037, AC-038, AC-039, AC-040 |
| R-07 Pipeline properties: name, arguments, model, tools, rule tags, body | AC-041, AC-042 |
| R-08 The default starting point and the host interface for F-05 | AC-041, AC-043 |
| R-09 Session-only state: no server calls while editing, reset on reload | AC-044, AC-045 |
