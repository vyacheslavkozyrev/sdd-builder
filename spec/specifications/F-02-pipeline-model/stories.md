# User Stories — Pipeline model and the default pipeline (F-02)

Feature entry: `spec/documents/features.md` → F-02
Requirements owned by this feature: the F-02 scope items in `features.md`, and `architecture.md` §6 decisions 16, 17, 18, 20, 22, 25 to 28 and 33 (the JSON schema of the pipeline)

## Out of Scope

- Structural checks of the pipeline: one start per flow, every block reachable, no cycles, both outputs of a check wired, back routes only to earlier blocks, a retry with no round limit, and references (a route, a connection or a rule tag that names an unknown id). These are F-03; F-02 checks shape only.
- Rule tags that name no rule are refused by F-03, not by the parser.
- The generator and the file tree (F-04), the `/analyze` and `/generate` endpoints (F-14, F-07), and the LLM review (F-06 analysis, F-14).
- The builder UI: the Pipeline tab, the flow tabs, the toolboxes and the properties panels (F-05, F-06, F-11).
- Removing the flat model (`model.ts`, `catalog.ts`, `parse-config.ts`): decision 19 keeps it until the app is rebuilt on the new model (F-05).
- Presets and other starting pipelines (F-09), and more than one pipeline per project (decision 16).
- Length limits on rule text (`rules[].text`): the decisions set limits for body texts only, so no limit is added here.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-02 AC-003`).

This feature is an enabler: the stories are written for the developer who builds the app and the generator on top of the model. The schema they test is in `architecture.md` §6 decision 33.

### US-001: Parse a valid project config

**As a** developer
**I want to** parse a project config with one call and get either the typed config or a list of problems
**So that** the API, the generator and the builder share one checked shape of the project

**Requirements:** ProjectConfig with `schemaVersion` 2, a rules list and one pipeline (decisions 16, 20)

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The parser accepts a valid `ProjectConfig` (`schemaVersion` 2, a `rules` list and one `pipeline`) and returns it typed, with no problems.
- [ ] AC-002 `[auto]`: A `schemaVersion` that is not the number 2 (1, 3, the string `"2"`, or missing) is refused with a problem at the path `schemaVersion`, and no typed config is returned.
- [ ] AC-003 `[auto]`: An input that is not an object (`null`, an array, a string or a number) is refused with one problem at the root path.

### US-002: Refuse unknown keys with their path

**As a** developer
**I want to** have every unknown key refused, wherever it sits
**So that** a typo in a config cannot be silently ignored or passed to the generator

**Requirements:** the parser refuses unknown keys (features.md F-02)

#### Acceptance Criteria

- [ ] AC-004 `[auto]`: An unknown key is refused at each level of the config (root, rule, pipeline, argument, flow, block, link, gate and route), and each problem names the exact path of that key.
- [ ] AC-005 `[auto]`: A key that the block's kind does not allow is refused with its path: `connectedTo` on an End, `outcome` on an Agent, and `threshold` on a Check of type `checks`.

### US-003: Pipeline, flow and argument structure

**As a** developer
**I want to** the pipeline and its flows to have fixed required fields
**So that** every flow the generator reads has a name, a description and its blocks

**Requirements:** flows hold blocks, one nesting level (features.md F-02; decision 14 without Connection, decision 33)

#### Acceptance Criteria

- [ ] AC-006 `[auto]`: A pipeline needs `name`, `description` and `flows`; a missing key, or a blank `name` or `description`, is refused with its path.
- [ ] AC-007 `[auto]`: A flow needs `id`, `name`, `description`, `arguments` (text) and `blocks`; the flows and the blocks keep the order of their arrays in the typed result.
- [ ] AC-008 `[auto]`: Pipeline arguments are structured: `id` (the id rule), `required` (a boolean) and `hint` (text). A `required` that is not a boolean is refused with its path.

### US-004: Block kinds and their fields

**As a** developer
**I want to** the five block kinds to have exactly the fields of the UI spec
**So that** the generator writes each block from known fields

**Requirements:** five block kinds: start, agent, approval, check, end (decisions 14 and 33; idea.md §2 decision 9)

#### Acceptance Criteria

- [ ] AC-009 `[auto]`: The kinds `start`, `agent`, `approval`, `check` and `end` are accepted. Any other value of `kind`, including `connection`, is refused with the path of `kind`.
- [ ] AC-010 `[auto]`: An Agent needs `name`, `description` and `arguments`. Its `name` must be file-safe, and two agents with the same name in the project are refused with the path of the second.
- [ ] AC-011 `[auto]`: An Approval needs a non-blank `description`; a blank one is refused with its path.
- [ ] AC-012 `[auto]`: A Check needs a non-blank `description` and both outputs in `connectedTo` (`true` and `false`). A Check missing either output is refused with its path.
- [ ] AC-013 `[auto]`: A Check of type `diff size` needs `threshold` as a positive whole number. `threshold` is refused on a Check of type `checks`. The values 0, -1, 1.5 and `"10"` are each refused with the path of `threshold`.
- [ ] AC-014 `[auto]`: An End needs `outcome`, which must be `done` or `stopped`. `producedArtifact` is optional text. Any other outcome is refused with its path.
- [ ] AC-015 `[auto]`: A flow with no blocks is accepted by the parser; the rules that need a start or an end are F-03's.

### US-005: Connections as `connectedTo` properties

**As a** developer
**I want to** connections stored on the flow or block they leave
**So that** a connection is one property, not a separate block in the order

**Requirements:** `connectedTo` on flows and blocks, with the gate on an arrow between flows (decision 33)

#### Acceptance Criteria

- [ ] AC-016 `[auto]`: A block link is `{ to, label }`. `label` (the artifact) must be non-blank. A link without a label, or with a key other than `to` and `label` (such as `gate`), is refused with its path.
- [ ] AC-017 `[auto]`: A flow link may carry a `gate`. A gate of kind `approval` needs a `description`. A gate of kind `check` needs a `description` and a `type`, and a `threshold` only for `diff size`. A gate of any other kind is refused with its path.
- [ ] AC-018 `[auto]`: A route is `{ to, roundLimit? }` or `{ stop: true }`. `roundLimit` must be a positive whole number. A route with both `to` and `stop`, or with neither, is refused with its path.
- [ ] AC-019 `[auto]`: A Start, Agent or Approval without `connectedTo` is accepted: it runs into the next block in order. A Check without `connectedTo` is refused, because a Check always has both outputs (AC-012).
- [ ] AC-020 `[auto]`: A flow without `connectedTo` is accepted: it runs into the next flow in the array, with no label and no gate. The last flow may omit it.

### US-006: Identifiers are file-safe and unique

**As a** developer
**I want to** every id to be safe in a file name and unique in the project
**So that** the generator can name files and link to blocks without clashes

**Requirements:** the id rule of decision 18

#### Acceptance Criteria

- [ ] AC-021 `[auto]`: An id is accepted when it uses lowercase letters, digits and hyphens and starts with a letter. An id with uppercase letters, a leading digit, an underscore, a space, a dot, or an empty value is refused with its path (table-driven, one row per case).
- [ ] AC-022 `[auto]`: An id that equals another id across flows, blocks and pipeline arguments is refused with the path of the second occurrence.
- [ ] AC-023 `[auto]`: A rule id that equals another rule id is refused with the path of the second rule.

### US-007: Text, lists and limits

**As a** developer
**I want to** text limits, lists and model names checked when the config is parsed
**So that** an API request cannot carry a body the builder would refuse, or a model the generator cannot write

**Requirements:** text limits (decision 28); lists without blanks or duplicates (decisions 21, 26, 27); the model values (decision 26)

#### Acceptance Criteria

- [ ] AC-024 `[auto]`: A body of the pipeline, a flow or an agent of exactly 1,000 code points is accepted; 1,001 is refused with its path. The count is in code points, so a string of 1,000 emoji is accepted.
- [ ] AC-025 `[auto]`: `tools`, `reads`, `writes` and `ruleTags` refuse a blank entry and a duplicate entry, each with the path of the entry.
- [ ] AC-026 `[auto]`: `model` accepts `haiku`, `sonnet`, `opus` and `inherit`. Any other value is refused with its path.
- [ ] AC-027 `[auto]`: A rule needs `id`, `title` and `text`, all non-blank. A rule with an unknown key is refused with its path.

### US-008: Problems are returned, not thrown

**As a** developer
**I want to** an invalid config to come back with every problem, each with its path
**So that** the builder can mark them all at once and the API can answer with 422 and the full list

**Requirements:** the parser returns problems with their paths (features.md F-02; `architecture.md` §6 decision 3)

#### Acceptance Criteria

- [ ] AC-028 `[auto]`: An invalid config returns all of its problems in document order, each with a path and a message. The parser does not stop at the first one.
- [ ] AC-029 `[auto]`: The parser returns a result for any input value and does not throw. A result is either the typed config with no problems, or a non-empty list of problems with no typed config.

### US-009: The default pipeline is data

**As a** developer
**I want to** the default pipeline to be a JSON file that the core imports at build time
**So that** changing the default process changes data, not the generator

**Requirements:** the default pipeline is data, imported at build time (decision 17; `architecture.md` §11)

#### Acceptance Criteria

- [ ] AC-030 `[auto]`: `source/templates/pipeline/default.json` parses without problems.
- [ ] AC-031 `[auto]`: The default pipeline has six flows in this order: specify, ux, plan, build, verify, complete, as `architecture.md` §11 describes them. The build flow has the blocks of §11 in order: start, agent `implement`, agent `review`, check `checks`, agent `test`, check `checks`, check `diff size`, agent `commit`, end.
- [ ] AC-032 `[auto]`: The default pipeline's arguments include `feature-id`, and it is required.
- [ ] AC-033 `[auto]`: The default pipeline value exported by the core equals the content of `default.json`. A test fails when the two differ, so the core never holds a copy of the process.

### US-010: The model is exported beside the flat one, and core stays pure

**As a** developer
**I want to** the new model reached through one namespace and no I/O in core
**So that** the flat model keeps working until its consumers are rebuilt, and core stays free of file system and network code

**Requirements:** decision 19 (the new model beside the flat model) and decision 22 (the namespace); `architecture.md` §1 (dependency direction) and the TypeScript rules (purity)

#### Acceptance Criteria

- [ ] AC-034 `[auto]`: The root of `source/packages/core` exports the new model and the parser under the namespace `pipeline`, and the flat model's exports are still present and their tests still pass.
- [ ] AC-035 `[auto]`: No file under `source/packages/core/src` imports `fs`, `node:fs`, `http`, `node:http`, `process` or `window`. A test scans the source and fails on any such import.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| ProjectConfig with `schemaVersion` 2, rules and one pipeline (features.md F-02; decisions 16, 20) | AC-001, AC-002, AC-003, AC-027 |
| Flows hold blocks, one nesting level (features.md F-02) | AC-006, AC-007, AC-015 |
| Five block kinds: start, agent, approval, check, end (decision 33) | AC-009, AC-010, AC-011, AC-012, AC-013, AC-014 |
| Connections are `connectedTo` on flows and blocks, gates on flow arrows (decision 33) | AC-016, AC-017, AC-018, AC-019, AC-020 |
| Parser returns problems with their paths (features.md F-02) | AC-028, AC-029 |
| Parser refuses unknown keys (features.md F-02) | AC-004, AC-005 |
| Ids file-safe and unique; rule ids unique (decision 18) | AC-010, AC-021, AC-022, AC-023 |
| Text limits, lists, model values (decisions 25 to 28) | AC-011, AC-024, AC-025, AC-026 |
| Pipeline arguments are structured (decision 33; ui.md §4) | AC-008, AC-032 |
| Default pipeline loaded as data at build time (features.md F-02; decision 17) | AC-030, AC-031, AC-033 |
| Pipeline exposed as the `pipeline` namespace beside the flat model (decisions 19, 22) | AC-034 |
| Core stays pure (`architecture.md` §1; TypeScript rules) | AC-035 |
