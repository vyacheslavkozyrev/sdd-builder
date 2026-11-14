# User Stories — Visual builder: global map and workflow tabs (F-06)

Feature entry: `spec/documents/features.md` → F-06
Requirements owned by this feature: R-01 to R-10 (the scope items of F-06 in `features.md`, listed in the Requirement Coverage table)

## Out of Scope

- Live structural checks while editing. The builder refuses cycles only; the analyzer (F-04) runs the full checks when the user clicks Analyze (F-05).
- Custom steps and their editor (F-14). The tab adds catalog steps only.
- Configurable quality gates: adding or removing gates, changing gate types or thresholds beyond the map connection gate (F-15). In a tab, gates and branch routes are switched on or off, not created.
- Creating new branch routes. The reference process supplies them.
- Editing a workflow's scope or iteration source after it is created.
- Editing the user-written `description` of a workflow or step.
- The presentation view and process diagrams (F-18).
- Generate, the file tree preview and the zip download (F-07).
- Saving, importing or exporting a project (F-08). Browser-local autosave (F-20).
- Presets (F-09).
- Browser (end-to-end) tests. Logic is tested in Vitest (`qa.md`); the layout is checked on a device.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-06 AC-003`).

Decisions taken in this specification (the user is asked to approve them):

- **React Flow (`@xyflow/react`)** draws the global map, as the user chose. The workflow tab uses the same library for its diagram. This is the first new front-end dependency of `apps/web`; it is recorded in `architecture.md` §5 before code depends on it.
- **Starting state:** the builder opens with the reference process (the default workflows and connections, as F-05's form sends them), in the same app, reached from the brief form.
- **Removing a workflow** also removes every connection to and from it.
- **Model change:** a condition (gate or branch route) gets a required `enabled: boolean` (default `true`), so it can be switched off the way a step can. The generator and `parse-config` honour it. This changes `packages/core/src/model.ts` (F-01 domain) and is a task of this feature.
- **Removing a step** is refused while another route points to it; the user switches that route off or retargets it first. No silent rerouting.
- **Adding a workflow:** the user types a name (required, unique among workflows) and picks a scope. The iteration source follows the scope: `project` → `project`, `feature` → `features.md`, `task` → `plan.md`.
- **Each step appears at most once** in a workflow.
- **Route targets** a route may point to: `next`, `stop`, or a step in the same workflow that comes before the condition's step (a backward retry). Pointing forward is refused.

---

### US-001: Start from the reference process

**As a** user
**I want to** open the builder with the reference process already drawn
**So that** I can change a working process instead of building one from nothing

**Requirements:** R-01, R-10

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: the builder's starting state equals the default workflows and connections of the reference process (no edits applied).
- [ ] AC-002 `[auto]`: the brief form's default workflows and connections are the same data as the builder's starting state, so opening the builder shows what the form sends.
- [ ] AC-003 `[auto]`: builder state is held in memory only; no code path writes to `localStorage`, `sessionStorage` or `indexedDB` (a test with those globals replaced by throwing fakes passes through a full edit session).
- [ ] AC-004 `[auto]`: a fresh builder session after a reload starts again from the reference process, with no edit from the previous session kept.

### US-002: See each workflow and connection on the map

**As a** user
**I want to** read each workflow's scope, iteration source and counts on the map
**So that** I can understand the process at a glance

**Requirements:** R-02, R-03

#### Acceptance Criteria

- [ ] AC-005 `[auto]`: each map node shows its name, its scope, its iteration source, and counts of enabled steps, gates and branch routes. A gate is a condition whose fail output is `stop`; a branch route is a condition whose fail output goes to a step.
- [ ] AC-006 `[auto]`: a workflow with its step disabled does not count that step's conditions (matching the generator's rule for disabled steps).
- [ ] AC-007 `[auto]`: a connection with an artifact label shows the label; a connection without one shows no label.
- [ ] AC-008 `[auto]`: a connection with a gate shows the gate type; a connection without a gate shows none.

### US-003: Edit workflows and connections on the map

**As a** user
**I want to** add, remove and connect workflows on the map
**So that** I can shape the process between workflows

**Requirements:** R-03, R-04

#### Acceptance Criteria

- [ ] AC-009 `[auto]`: adding a workflow creates one with a unique id, the typed name, the chosen scope, the scope's iteration source and no steps or conditions.
- [ ] AC-010 `[auto]`: adding a workflow with an empty name, a name only of spaces, or a name that duplicates another workflow's is refused with a message; the state does not change.
- [ ] AC-011 `[auto]`: removing a workflow removes it, every connection to and from it, and nothing else.
- [ ] AC-012 `[auto]`: connecting workflow A to workflow B creates a connection from A to B with no artifact label and no gate.
- [ ] AC-013 `[auto]`: connecting a workflow to itself is refused.
- [ ] AC-014 `[auto]`: a connection that would close a cycle is refused and the state does not change (for example A→B→C then C→A).
- [ ] AC-015 `[auto]`: a second connection between the same two workflows in the same direction is refused.
- [ ] AC-016 `[auto]`: removing a connection leaves both workflows in place.
- [ ] AC-017 `[auto]`: setting an artifact label on a connection stores it trimmed; an empty label clears it.
- [ ] AC-018 `[auto]`: a connection's gate can be set to one of `approval`, `checks`, `review`, `diff-size`, or cleared; `diff-size` needs a whole-number threshold of at least 1, and any other input is refused with a message.
- [ ] AC-019 `[device]`: on a desktop-width screen the map shows all workflows without overlap, and nodes can be dragged and connected with the pointer.

### US-004: Add and reorder steps in a workflow tab

**As a** user
**I want to** add catalog steps to a workflow and put them in order
**So that** the workflow runs the steps in the order I need

**Requirements:** R-05, R-06

#### Acceptance Criteria

- [ ] AC-020 `[auto]`: adding a tab creates a workflow with no steps; the tabs are exactly the workflows on the map, one tab each.
- [ ] AC-021 `[auto]`: adding a catalog step appends it at the end of the workflow's list, enabled.
- [ ] AC-022 `[auto]`: adding a step that the workflow already has is refused and the list does not change.
- [ ] AC-023 `[auto]`: moving a step up or down swaps it with its neighbour; moving the first step up or the last step down changes nothing.
- [ ] AC-024 `[auto]`: moving a step keeps every condition attached to it (its `afterStepId` is unchanged).

### US-005: Remove, switch on and off steps, gates and branch routes

**As a** user
**I want to** remove optional steps and switch steps, gates and branch routes on or off
**So that** I can shape a workflow without breaking the rules it must keep

**Requirements:** R-07, R-08

#### Acceptance Criteria

- [ ] AC-025 `[auto]`: removing a non-required step removes it from the list and removes the conditions placed after it.
- [ ] AC-026 `[auto]`: removing a step that another route points to is refused with a message naming the route; the state does not change.
- [ ] AC-027 `[auto]`: a required step cannot be removed; the removal is refused even when the store is called directly.
- [ ] AC-028 `[auto]`: switching a step off keeps it in the list marked off; switching it on again restores it without changing its position.
- [ ] AC-029 `[auto]`: switching a gate or branch route on or off sets its `enabled` value; a new or reference condition is on by default.
- [ ] AC-030 `[auto]`: a required gate cannot be switched off; the switch is refused even when the store is called directly.
- [ ] AC-031 `[auto]`: switching a branch route off keeps its round limit unchanged; switching it on again restores it.
- [ ] AC-032 `[auto]`: the core model and `parse-config` accept a condition with `enabled`, reject one without it, and reject a non-boolean value (negative cases in `packages/core/test/`).

### US-006: See what a step generates in the inspector

**As a** user
**I want to** select a step and see the file it generates and its rule-set tags
**So that** I know what each step produces before I generate

**Requirements:** R-09

#### Acceptance Criteria

- [ ] AC-033 `[auto]`: selecting a step shows the files it produces, taken from its catalog or custom definition.
- [ ] AC-034 `[auto]`: selecting a step shows its rule-set tags; a step with no tags shows none.
- [ ] AC-035 `[auto]`: a step that produces no file shows that no file is generated, not an empty list.
- [ ] AC-036 `[device]`: the inspector and the workflow diagram are readable at desktop width, and the inspector opens beside the diagram.

---

## Requirement Coverage

| Requirement | Scope item (features.md, F-06) | Covered by |
|---|---|---|
| R-01 | Global map: add, remove and connect workflows | AC-001, AC-002, AC-009, AC-010, AC-011, AC-012, AC-016, AC-019 |
| R-02 | Each workflow shows its scope, iteration source and counts | AC-005, AC-006 |
| R-03 | Connections carry an optional artifact label and an optional gate | AC-007, AC-008, AC-017, AC-018 |
| R-04 | Cycles are refused | AC-013, AC-014, AC-015 |
| R-05 | One tab per workflow; adding a tab creates a workflow | AC-020 |
| R-06 | Within a tab: add, remove, reorder and switch on or off steps, gates and branch routes | AC-021, AC-022, AC-023, AC-024, AC-025, AC-026, AC-028, AC-029, AC-031 |
| R-07 | Required steps cannot be removed | AC-027, AC-030 |
| R-08 | Gates and branch routes switched on or off (the reference process supplies them) | AC-029, AC-030, AC-031, AC-032 |
| R-09 | Each step's inspector shows the file it generates and its rule-set tags | AC-033, AC-034, AC-035, AC-036 |
| R-10 | The state lives in the browser session only; reloading clears it | AC-003, AC-004 |
