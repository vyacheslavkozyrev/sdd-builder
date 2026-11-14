# User Stories — Domain model: pipeline, flows, blocks and the default pipeline (F-01)

Feature entry: `spec/documents/features.md` → F-01
Requirements owned by this feature: R-01 to R-11 (listed in the Requirement Coverage table)

## Out of Scope

- Structural checks of a configuration: cycles, reachability, wiring of routes, retries without a limit. These are the analyzer's rules (F-04); F-01 only checks shape and values.
- Generation of files from the model (F-02, F-03).
- The LLM review and its findings (F-04).
- The builder UI: the Map tab, flow tabs, toolbox and property panels (F-06).
- Presets and other pipelines than the default (F-09).
- Saving, importing or exporting a configuration (F-08). A `schemaVersion` is checked, not migrated.
- Custom agents and gates as builder actions (F-06).

## Decisions taken in this specification (the user is asked to approve them)

- **Scope:** types, the default pipeline and parsing with validation. Structural rules stay in F-04.
- **Ids:** user-given, lowercase letters, digits and hyphens, starting with a letter, unique in the project. Agent names are file names, so they follow the same rule.
- **Default pipeline:** a JSON file, `source/templates/pipeline/default.json`, imported into `source/packages/core` at build time (a typed JSON import, no runtime file read). Core stays free of file-system and network code.
- **One pipeline per project** in the MVP.
- **`schemaVersion` is 2.** No saved configurations exist, so there is nothing to migrate. The flat model is removed, with no compatibility layer.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-01 AC-003`).

### US-001: The model describes a pipeline of flows and blocks

**As a** developer
**I want to** express the pipeline, its flows and their blocks in one typed model
**So that** the builder, the analyzer and the generator read the same structure

**Requirements:** R-01, R-02, R-03

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: a configuration with one pipeline, its child flows, and blocks in each flow typechecks and parses.
- [ ] AC-002 `[auto]`: a Flow block inside a child flow is refused with a problem at its path (one nesting level); the same block in the pipeline is accepted.
- [ ] AC-003 `[auto]`: the block kinds are Start, Agent, Condition, Connection, End and Flow; any other kind is refused with a problem naming the path.
- [ ] AC-004 `[auto]`: every block and flow has an `enabled` flag; a missing or non-boolean value is refused.

### US-002: Conditions are fixed checks with routes

**As a** developer
**I want to** describe a check, its decider and its routes in one shape
**So that** gates, checks and branches are generated the same way

**Requirements:** R-04

#### Acceptance Criteria

- [ ] AC-005 `[auto]`: the check type is one of `approval`, `checks`, `review`, `diff-size`; any other value is refused with a problem at the condition's path.
- [ ] AC-006 `[auto]`: `diff-size` requires a whole-number threshold of at least 1; the other check types take no threshold, and one given is refused.
- [ ] AC-007 `[auto]`: `decided by` is `human` or `agent` and is required; a missing or other value is refused.
- [ ] AC-008 `[auto]`: the pass route and the fail route are required. Each is `next`, `stop`, or `back` to an earlier item of its own list: a block of the same child flow, or, for a pipeline gate, an earlier flow. A route to a block inside another flow, or a back route to a later item, is refused.
- [ ] AC-009 `[auto]`: the round limit is optional; when given it is a whole number of at least 1; when absent the model holds no limit.

### US-003: Scope and arguments are attributes of blocks

**As a** developer
**I want to** set how often an agent runs and what the pipeline takes as input
**So that** the per-task and per-feature repetition is explicit

**Requirements:** R-05, R-08

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: every Agent block has a scope of `project`, `feature` or `task`; any other value, or none, is refused with a problem at its path.
- [ ] AC-011 `[auto]`: the pipeline's Start block carries arguments; each has a name, a required flag (boolean) and a hint; argument names are unique and follow the id rule of AC-016.
- [ ] AC-012 `[auto]`: a Start block in a child flow carries no arguments; a Start block in the pipeline is required, and a flow without one is refused.

### US-004: The default pipeline is the process we built

**As a** user
**I want to** start from the pipeline that builds this project
**So that** the default describes the process in `pipeline.md`

**Requirements:** R-06

#### Acceptance Criteria

- [ ] AC-013 `[auto]`: the default pipeline has six child flows in the order specify, ux, plan, build, verify, complete.
- [ ] AC-014 `[auto]`: the build flow has agents implement, review, test and commit, each with scope `task`; verify and complete have scope `feature`; the specify, ux and plan agents have scope `feature`.
- [ ] AC-015 `[auto]`: the pipeline has the five gates and checks of `building-blocks.md` §4 between its flows, with their check type, decider and fail route. Test: the gate list equals the table in that section.
- [ ] AC-016 `[auto]`: the default pipeline is a valid configuration: the parser accepts it without problems.
- [ ] AC-017 `[auto]`: the default pipeline is imported at build time from `source/templates/pipeline/default.json`; a test changes a copy of it and the parser refuses the change with the path of the problem.

### US-005: Parsing refuses bad input with a problem list

**As a** developer
**I want to** parse a configuration from JSON without throwing on bad input
**So that** the API and the builder can show every problem at once

**Requirements:** R-07, R-08

#### Acceptance Criteria

- [ ] AC-018 `[auto]`: a value that is not an object gives one problem at the empty path; nothing is thrown.
- [ ] AC-019 `[auto]`: a missing required field or a value of the wrong type gives a problem with its path and a message; every problem is returned, not only the first.
- [ ] AC-020 `[auto]`: an unknown key gives a problem with the key's path.
- [ ] AC-021 `[auto]`: ids (blocks, flows, arguments, agent names) are lowercase letters, digits and hyphens, starting with a letter; uppercase letters, spaces, slashes and dots are refused.
- [ ] AC-022 `[auto]`: ids are unique in the project; an agent name is unique among agents; a repeat is refused at the path of the second.
- [ ] AC-023 `[auto]`: `schemaVersion` must be 2; any other value is refused with a problem.

### US-006: Result shapes stay stable

**As a** developer
**I want to** keep the analysis and generation result shapes
**So that** the API and the web app do not change with the model

**Requirements:** R-09

#### Acceptance Criteria

- [ ] AC-024 `[auto]`: `AnalysisResult` has `findings` and `review` with `status`, `findings` and `dropped`; a type test fails if a field is removed or renamed.
- [ ] AC-025 `[auto]`: `GenerationResult` has `files` (path and content) and `warnings`; a type test fails if a field is removed or renamed.

### US-007: The core stays pure

**As a** developer
**I want to** keep `source/packages/core` free of I/O
**So that** it runs the same in the browser, the API and the tests

**Requirements:** R-10

#### Acceptance Criteria

- [ ] AC-026 `[auto]`: no source file in `source/packages/core/src` imports `node:fs`, `http`, `https`, `process`, `window` or the network; a test scans the sources and fails on a match.

### US-008: Connections, End blocks and gates between flows

**As a** developer
**I want to** check the links between blocks and flows, the End outcome, and the connection a gate sits on
**So that** every handover and every gate in the pipeline refers to something that exists

**Requirements:** R-11

#### Acceptance Criteria

- [ ] AC-027 `[auto]`: (a) a Connection's `from` and `to` name blocks of the same list (a flow's blocks, or the pipeline's flows and gates), and `artifact` is a required string; (b) an End block's `outcome` is required and is `done` or `stopped`, and `produced` is optional and a string when given; (c) a pipeline Condition's `onConnection` is required and names a Connection block of the pipeline, and inside a child flow the key is refused as unknown. An unknown key on any of these blocks is refused with its path.

---

## Requirement Coverage

| Requirement | Scope item (features.md, F-01) | Covered by |
|---|---|---|
| R-01 | Types for ProjectConfig, the pipeline and its flows | AC-001 |
| R-02 | Pipeline and flows, one nesting level | AC-001, AC-002 |
| R-03 | The five block kinds plus Flow; enabled flag | AC-003, AC-004 |
| R-04 | Conditions: fixed check types and routes | AC-005, AC-006, AC-007, AC-008, AC-009 |
| R-05 | Scope on Agent blocks; arguments on the pipeline Start | AC-010, AC-011, AC-012 |
| R-06 | The default pipeline as flows (building-blocks §4) | AC-013, AC-014, AC-015, AC-016, AC-017 |
| R-07 | Parsing and validation with a problem list | AC-018, AC-019, AC-020, AC-023 |
| R-08 | Stable, file-safe ids | AC-011, AC-021, AC-022 |
| R-09 | AnalysisResult and GenerationResult shapes | AC-024, AC-025 |
| R-10 | Pure core, no I/O | AC-026 |
| R-11 | Connections, End blocks and gates between flows | AC-027 |
