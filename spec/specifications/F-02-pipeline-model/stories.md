# User Stories — Pipeline model and the default pipeline (F-02)

Feature entry: `spec/documents/features.md` → F-02
Requirements owned by this feature: the F-02 scope items in `features.md` as amended on 2026-11-18, and `spec/documents/pipeline-schema.md` (sections 1 to 6), with `architecture.md` §6 decisions 16, 17, 18, 20, 21, 25 to 28, 37 (brief fields), 38 and 39, and §11 (the default pipeline)

## Out of Scope

- Structural checks of the pipeline: exactly one Start and one End per flow, reachability from Start, no cycle inside a flow, and the warning for a retry with no round limit. These are F-03's rules, not parser criteria. F-02 checks shape, ids, names, references to a block, flow or rule, and the flow links.
- The generator and the file tree (F-04), the `/analyze` and `/generate` endpoints (F-14, F-07), and the LLM calls (F-06, F-14).
- The builder UI: the Pipeline tab, the flow tabs, the canvas, the toolboxes and the properties panels (F-05, F-11); storage, import and export of pipelines (F-18).
- Removing the flat model (`model.ts`, `catalog.ts`, `parse-config.ts`): decision 19 keeps it until its consumers are rebuilt.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-02 AC-003`). Criterion IDs restart at AC-001 in this re-specification.

This feature is an enabler: the stories are written for the developer who builds the builder, the analyzer and the generator on top of the model. Every criterion here is `[auto]`: parser and model tests with fixed inputs.

### US-001: Parse a project config

**As a** developer
**I want to** parse a project config with one call and get either the typed config or a list of problems
**So that** the API, the generator and the builder share one checked shape of the project

**Requirements:** `ProjectConfig` with `schemaVersion` 2, a `rules` list and one `pipeline` (decisions 16, 20; schema §2)

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The parser accepts a valid `ProjectConfig` (`schemaVersion` 2, a `rules` list and a `pipeline`) and returns it typed, with an empty list of problems.
- [ ] AC-002 `[auto]`: A `schemaVersion` that is not the number 2 (1, 3, the string `"2"`, or missing) is refused with a problem at the path `schemaVersion`, and no typed config is returned.
- [ ] AC-003 `[auto]`: An input that is not an object (`null`, an array, a string or a number) is refused with one problem at the root path.
- [ ] AC-004 `[auto]`: A missing required top-level key (`rules` or `pipeline`) is refused with a problem at that key's path.

### US-002: Return every problem, with its path, and refuse unknown keys

**As a** developer
**I want to** an invalid config to come back with every problem at once, and no key to be silently ignored
**So that** the builder can mark them all, and a typo never reaches the generator

**Requirements:** the parser returns problems with their paths and refuses unknown keys (features.md F-02; schema §3)

#### Acceptance Criteria

- [ ] AC-005 `[auto]`: A config with three independent errors in three different places returns three problems, each with its own path, in document order. The parser does not stop at the first one.
- [ ] AC-006 `[auto]`: An input with problems returns no typed config; an input without problems returns no problem list entries. The result is either the typed config or a non-empty problem list, never both.
- [ ] AC-007 `[auto]`: An unknown key is refused at every object level (root, rule, pipeline, argument, flow, artifact, block, route, stack), and the problem names the path of that key. A table test covers one case per level.
- [ ] AC-008 `[auto]`: A key from a retired model is refused as unknown: `connectedTo`, `checks`, `enabled` or `disabled` on a flow or a block, `gate` on a route, and `label` on a block's route. Each problem names the key's path.
- [ ] AC-009 `[auto]`: A value of the wrong JSON type is refused with a problem at its path: a string where a boolean is required (`approval: "yes"`), an object where a list is required (`arguments: {}`), a number where text is required (`name: 3`), and `null` for a required or an optional key (`next: null`).
- [ ] AC-010 `[auto]`: An absent optional key is accepted; the same key with the value `null` is refused.

### US-003: The pipeline object

**As a** developer
**I want to** the pipeline to have one fixed set of keys and an ordered list of flows
**So that** the generator reads one pipeline per project, in one order

**Requirements:** one pipeline per project; the pipeline's name, description, arguments, model, tools, rule tags, body and flows (decisions 16, 26; schema §2)

#### Acceptance Criteria

- [ ] AC-011 `[auto]`: The pipeline requires `name`, `description`, `arguments` and `flows`; a missing key is refused with the path of the pipeline. `model`, `tools`, `ruleTags` and `body` are optional and may be absent.
- [ ] AC-012 `[auto]`: The pipeline `name` is 1 to 100 code points: `"SDD"` is accepted; the empty string, a name of spaces only (`"   "`) and 101 code points are refused with the path `pipeline.name`.
- [ ] AC-013 `[auto]`: The pipeline `flows` is a list, and the typed result keeps the order of the list. A `flows` that is not a list is refused with the path `pipeline.flows`.
- [ ] AC-014 `[auto]`: The pipeline `description` is text of up to 1,000 code points; 1,001 is refused with its path, and the key itself is required.
- [ ] AC-086 `[auto]`: A pipeline with zero flows (`flows: []`) is refused with the path `pipeline.flows`.

### US-004: Argument rows

**As a** developer
**I want to** arguments as rows with an id, a required flag and a hint
**So that** the command text can name each argument and say whether it must be given

**Requirements:** arguments are rows (schema §5; decisions 18, 33); the argument id is file-safe

#### Acceptance Criteria

- [ ] AC-015 `[auto]`: An argument row requires `id`, `required` and `hint`; a row missing one of them is refused with the path of the row. An empty `arguments` list is accepted.
- [ ] AC-016 `[auto]`: An argument `id` is accepted when it uses lowercase letters, digits and hyphens, starts with a letter and is at most 60 code points. `feature-id` is accepted; `Feature_ID`, `1st`, `feature id`, `feature.id` and the empty string are each refused with the path of the `id`.
- [ ] AC-017 `[auto]`: `required` must be the boolean `true` or `false` (`"true"` is refused). `hint` is text of up to 100 code points: 100 is accepted, 101 is refused with the path of the `hint`.
- [ ] AC-018 `[auto]`: Two argument rows with the same `id` anywhere in the project are refused with the path of the second row's `id`. An argument `id` that equals a flow id, a block id or a rule id of the project is refused with the path of the argument's `id`.
- [ ] AC-019 `[auto]`: The argument rows of the pipeline, of a flow and of an agent are checked by the same rules, and each problem names the list it sits in (for example `pipeline.arguments[0].id`).

### US-005: The flow object

**As a** developer
**I want to** every flow to be one object with fixed required fields and optional fields
**So that** the generator reads the name, the body, the artifacts, the approval and the blocks of each flow

**Requirements:** a flow is one object with id, name, body, arguments, artifacts, approval and blocks required; description, model, rule tags and next optional (decisions 38, 39)

#### Acceptance Criteria

- [ ] AC-020 `[auto]`: A flow requires `id`, `name`, `body`, `arguments`, `artifacts`, `approval` and `blocks`; a flow missing one of them is refused with the path of the flow.
- [ ] AC-021 `[auto]`: A flow may omit `description`, `model`, `ruleTags` and `next`. A flow with all four omitted, and one list-valued key empty (`arguments: []`, `artifacts: []`), is accepted.
- [ ] AC-022 `[auto]`: `approval` is a boolean. `true` and `false` are accepted; `"on"`, `1` and `null` are refused with the path `approval`.
- [ ] AC-023 `[auto]`: A flow `description` is text of up to 1,000 code points; 1,001 is refused with its path. A `model` on a flow takes the same four values as the pipeline's (AC-030).
- [ ] AC-024 `[auto]`: A flow `ruleTags` list follows the rule-tag rules of US-014 (AC-070 to AC-073).

### US-006: Flow id, name and body

**As a** developer
**I want to** each flow to have a file-safe unique id, a unique name and a body within the limit
**So that** the command file of each flow has a safe name and the flows are told apart in the builder

**Requirements:** flow ids are file-safe and unique (decision 18); flow names are unique, 1 to 100 non-blank (schema §3); body texts are at most 1,000 code points (decision 28)

#### Acceptance Criteria

- [ ] AC-025 `[auto]`: A flow `id` follows the id rule of AC-016 (lowercase letters, digits and hyphens; starts with a letter; at most 60 code points). `Plan`, `plan_1`, `1plan` and the empty string are each refused with the path of the `id`.
- [ ] AC-026 `[auto]`: Two flows with the same `id` are refused with the path of the second flow's `id`. A flow `id` that equals a block id, an argument id or a rule id of the project is refused with the path of the flow's `id`.
- [ ] AC-027 `[auto]`: A flow `name` is 1 to 100 code points and not blank: `"Plan"` is accepted; the empty string, `"   "` and 101 code points are refused with the path of the `name`.
- [ ] AC-028 `[auto]`: Two flows with the same `name` are refused with the path of the second flow's `name`. A flow named `"plan"` and a flow named `"Plan"` are two different names.
- [ ] AC-029 `[auto]`: A flow `body` of exactly 1,000 code points is accepted; 1,001 code points is refused with the path of the `body`. A body of 1,000 emoji is accepted, because the count is in code points, not in UTF-16 units.
- [ ] AC-030 `[auto]`: A `model` of `haiku`, `sonnet`, `opus` or `inherit` is accepted on the pipeline, a flow and an agent. Any other value (for example `Haiku` or `gpt`) is refused with its path.

### US-007: Flows are linked by `next`

**As a** developer
**I want to** the flows chained by one `next` each, in a line with no loops
**So that** the process runs in one order, from the first flow to the last

**Requirements:** a flow's `next` names another flow; at most one incoming and one outgoing link; no loops; every flow connected in a pipeline of more than one flow (decisions 38, 39; schema §3)

#### Acceptance Criteria

- [ ] AC-031 `[auto]`: A flow `next` names the id of another flow of the same pipeline. A `next` naming an id that is no flow of the pipeline is refused with the path of the `next`.
- [ ] AC-032 `[auto]`: A flow whose `next` names its own id is refused with the path of the `next`.
- [ ] AC-033 `[auto]`: Two flows whose `next` names the same flow are refused with the path of the second `next`. Each flow has at most one incoming `next`.
- [ ] AC-034 `[auto]`: A chain of `next` links that returns to a flow already in the chain is refused (a two-flow loop A → B → A and a three-flow loop A → B → C → A are each refused with a problem). A chain that ends without a `next` is accepted.
- [ ] AC-035 `[auto]`: In a pipeline of more than one flow, a flow with neither an incoming nor an outgoing `next` is refused with the path of the flow. A pipeline of one flow with no `next` is accepted.

### US-008: Artifacts of a flow

**As a** developer
**I want to** each flow to list its outcome artifacts, with a one-line label and a template
**So that** the end of a flow names the artifact it produces, and the generator writes the template

**Requirements:** artifacts: a label of one line, non-blank, and a template of several lines that may be empty (decision 38; §6 owner decisions)

#### Acceptance Criteria

- [ ] AC-036 `[auto]`: An artifact requires `label` and `template`; an artifact missing one of them is refused with the path of the artifact.
- [ ] AC-037 `[auto]`: An artifact `label` is one line, not blank, and at most 200 code points: `"plan.md"` is accepted; the empty string, `"   "`, `"plan.md\nspec.md"` and 201 code points are each refused with the path of the `label`.
- [ ] AC-038 `[auto]`: An artifact `template` may be the empty string and may hold several lines; a template of 5,000 code points is accepted and 5,001 is refused with the path of the `template`.
- [ ] AC-039 `[auto]`: The artifact list of a flow keeps the order of its array in the typed result, and an empty list is accepted.
- [ ] AC-087 `[auto]`: Two artifacts of one flow with the same `label` are refused with the path of the second artifact's `label`. The same label in two different flows is accepted.

### US-009: Blocks: the four kinds and their count

**As a** developer
**I want to** a flow's blocks to be one of four kinds, and at least two of them
**So that** the flow canvas only holds Start, Agent, Condition and End, and a flow always has a start and an exit

**Requirements:** blocks are start, agent, condition and end; a flow has at least two blocks (decisions 33, 38; schema §2 and §5)

#### Acceptance Criteria

- [ ] AC-040 `[auto]`: A flow with no blocks or with one block is refused with the path of `blocks`. A flow with two blocks is accepted by this rule.
- [ ] AC-041 `[auto]`: The `kind` of a block is one of `start`, `agent`, `condition` or `end`. Any other value (`approval`, `check`, `connection`, `Agent` and the empty string) is refused with the path of `kind`.
- [ ] AC-042 `[auto]`: A block without a `kind` is refused with its path. A block whose keys do not belong to its kind (for example a `true` route on an Agent, or a `roundLimit` on a Start) is refused as an unknown key with that key's path.
- [ ] AC-043 `[auto]`: A block `id` follows the id rule of AC-016 and is unique in the whole project, across flow ids, block ids, argument ids and rule ids. A block `id` that equals any of them, in its own flow or in another flow, is refused with the path of the later one.

### US-010: Start block

**As a** developer
**I want to** each flow to enter through one Start block that points to its first block
**So that** the generator knows where a flow begins

**Requirements:** start has `next` to an agent or a condition of the same flow (schema §2, `blockStart`)

#### Acceptance Criteria

- [ ] AC-044 `[auto]`: A start block requires `id`, `kind` and `next`. A start with a `description`, or with any other key, is refused as an unknown key with the path of that key.
- [ ] AC-045 `[auto]`: A start's `next` names an agent or a condition of the same flow and is accepted. A `next` that names an end block, or the start block itself, is refused with the path of `next`.
- [ ] AC-046 `[auto]`: A start's `next` that names a block of another flow, or an id that is no block, is refused with the path of `next`.

### US-011: Agent block

**As a** developer
**I want to** each agent to have a safe unique name, a description, its arguments, its artifacts, its rules and its next block
**So that** the generator writes one agent file per agent, with the artifacts it reads and writes and the rules it follows

**Requirements:** agent name is file-safe and unique among the agents of the pipeline (decision 18); reads and writes are artifact labels, non-blank, no duplicates (decision 27); rule tags name rules, no duplicates (decisions 21, 26); body at most 1,000 code points (decision 28)

#### Acceptance Criteria

- [ ] AC-047 `[auto]`: An agent block requires `id`, `kind`, `name`, `description`, `arguments` and `next`. A missing key is refused with the path of the agent.
- [ ] AC-048 `[auto]`: An agent `name` follows the id rule of AC-016 (for example `review` is accepted; `Review Agent` and `review_agent` are refused with the path of `name`). Two agents with the same name anywhere in the pipeline, even in different flows, are refused with the path of the second `name`.
- [ ] AC-049 `[auto]`: An agent `description` is text that is not blank and at most 1,000 code points. The empty string, `"   "` and 1,001 code points are each refused with the path of `description`.
- [ ] AC-050 `[auto]`: An agent `tools` list is accepted as a list of text items of up to 100 code points, and the empty list is accepted. A non-text item, and a text item over 100 code points, are refused with the path of the item.
- [ ] AC-051 `[auto]`: An agent `reads` and `writes` list hold non-blank text items: `["plan.md"]` is accepted; `[""]` and `["  "]` are refused with the path of the item. The same label twice in one list is refused with the path of the second item. The same label in `reads` and in `writes` is accepted.
- [ ] AC-052 `[auto]`: An agent `ruleTags` list holds rule ids. A tag that names no rule of `rules` is refused with the path of the tag; a tag listed twice is refused with the path of the second entry.
- [ ] AC-053 `[auto]`: An agent `body` of 1,000 code points is accepted; 1,001 is refused with the path of `body`. An agent `model` takes the four values of AC-030, and `model` may be absent.
- [ ] AC-054 `[auto]`: An agent `next` names an agent, a condition or an end block of the same flow and is accepted. A `next` that names the start block, a block of another flow, or an id that is no block, is refused with the path of `next`.
- [ ] AC-055 `[auto]`: An agent's `arguments` follow the argument rows of AC-015 to AC-018, and an empty list is accepted.

### US-012: Condition block and its routes

**As a** developer
**I want to** each check to be a condition with a free-text description and a true and a false route
**So that** the generator can write what a check tests and where a failed check goes

**Requirements:** a condition has a non-blank description (decision 25); its routes are `{to}`, `{to, roundLimit}` or `{stop: true}`; a return to an earlier agent carries a round limit of 1 to 5 (decision 40; schema §2 and §3)

#### Acceptance Criteria

- [ ] AC-056 `[auto]`: A condition requires `id`, `kind`, `description`, `true` and `false`; a condition missing one of them is refused with the path of the condition.
- [ ] AC-057 `[auto]`: A condition `description` is text that is not blank and at most 1,000 code points. The empty string, `"   "` and 1,001 code points are each refused with the path of `description`.
- [ ] AC-058 `[auto]`: A route is exactly one of `{to}`, `{to, roundLimit}` or `{stop: true}`. The empty object `{}`, a route with both `to` and `stop`, `{stop: false}` and a route with an unknown key are each refused with the path of the route.
- [ ] AC-059 `[auto]`: A route `{to}` that names a block of the same flow later in the array is accepted. A route `{to}` that names an earlier agent of the same flow is refused, because a return needs a round limit (AC-060). "Earlier" means earlier in the flow's block list (owner, 2026-11-19).
- [ ] AC-060 `[auto]`: A route `{to, roundLimit}` is accepted only when `to` names an earlier agent of the same flow, and `roundLimit` is an integer from 1 to 5. The values 0, 6, 2.5 and `"2"` are each refused with the path of `roundLimit`; the values 1 and 5 are accepted.
- [ ] AC-061 `[auto]`: A route `{to, roundLimit}` that names a block which is not an earlier agent of the same flow (a later block, a condition, the end, or the condition itself) is refused with the path of `to`.
- [ ] AC-062 `[auto]`: A route `to` that names a block of another flow, or an id that is no block of the pipeline, is refused with the path of `to`.

### US-013: End block

**As a** developer
**I want to** each flow to exit through an End block that names the artifact it produces
**So that** the generator knows the outcome of a flow and the artifact that carries it

**Requirements:** an end has an outcome of `done` or `stopped` and a `producedArtifact` that is the label of one of the flow's artifacts (schema §2 and §3; §6 owner decisions)

#### Acceptance Criteria

- [ ] AC-063 `[auto]`: An end block requires `id`, `kind`, `outcome` and `producedArtifact`, and `outcome` is `done` or `stopped`. `"success"` and the empty string are refused with the path of `outcome`; an end with any other key, such as `next`, is refused as an unknown key.
- [ ] AC-064 `[auto]`: `producedArtifact` is the exact label of one of the flow's artifacts and is accepted. A label that no artifact of the flow has, the empty string, and `"none"` (when no artifact is labelled `none`) are each refused with the path of `producedArtifact`.
- [ ] AC-065 `[auto]`: A flow with no artifacts cannot have a valid end: any `producedArtifact` on its end is refused, and the problem names the path of `producedArtifact`.

### US-014: Rules and rule tags

**As a** developer
**I want to** the project's rules to be a list of id, title and text, and the rule tags of the pipeline, its flows and its agents to name them
**So that** every rule file has a safe name and every tag points at a rule that exists

**Requirements:** rules are a list in the project config (decision 20); rule tags name rules (decision 21; schema §3)

#### Acceptance Criteria

- [ ] AC-066 `[auto]`: A rule requires `id`, `title` and `text`; `id` follows the id rule of AC-016. A rule missing one of the three keys, or with an unknown key, is refused with the path of the rule.
- [ ] AC-067 `[auto]`: A rule `title` is at most 100 code points (100 is accepted; 101 is refused with the path of `title`). A rule `text` is at most 1,000 code points (1,001 is refused with the path of `text`).
- [ ] AC-068 `[auto]`: A rule `id` is unique in the whole project: a rule id that equals another rule id, a flow id, a block id or an argument id is refused with the path of the later one.
- [ ] AC-069 `[auto]`: The `rules` list may be empty. A pipeline with no rules and no rule tags is accepted.
- [ ] AC-070 `[auto]`: A rule tag on the pipeline (`pipeline.ruleTags`), on a flow or on an agent that names no rule of `rules` is refused with the path of the tag.
- [ ] AC-071 `[auto]`: A rule tag must be an id that follows the id rule of AC-016; `"Style Rule"` is refused with the path of the tag.
- [ ] AC-072 `[auto]`: A tag listed twice in one `ruleTags` list is refused with the path of the second entry, on the pipeline, a flow or an agent.
- [ ] AC-073 `[auto]`: A `ruleTags` key that is absent is accepted, and an empty list is accepted.

### US-015: Brief fields and text limits of the project

**As a** developer
**I want to** the project's name, idea, architecture and stack to be optional and within their limits
**So that** a config without a brief still parses, and a brief the builder would refuse cannot reach the analyzer

**Requirements:** brief fields are optional and limited: the name to 100, the idea and the architecture to 5,000 code points, each stack field to 100 (decisions 28, 37)

#### Acceptance Criteria

- [ ] AC-074 `[auto]`: `name`, `idea`, `architecture` and `stack` may be absent, and a config without them parses with no problems. `name` of 100 code points is accepted; 101 is refused with the path `name`.
- [ ] AC-075 `[auto]`: `idea` and `architecture` of 5,000 code points are accepted; 5,001 is refused with the path of the field.
- [ ] AC-076 `[auto]`: `stack` is an object whose optional keys are `language`, `framework`, `platform`, `buildTool` and `testFramework`. Each is text of up to 100 code points (100 accepted, 101 refused with its path). An unknown stack key is refused with its path, and `stack` given as a string is refused with the path `stack`.
- [ ] AC-088 `[auto]`: Every length limit of the schema counts code points, not UTF-16 units: a pipeline name of 100 emoji is accepted and 101 emoji are refused, and the same holds for the idea, the architecture, the stack fields, the hints, the titles, the texts and the bodies.

### US-016: The default pipeline is data, and it parses

**As a** developer
**I want to** the default process restated in the new model as a data file that parses with no problems
**So that** a new project starts from the process of `architecture.md` §11, and changing that process changes data, not the parser

**Requirements:** the default pipeline is data, imported at build time (decision 17; `architecture.md` §11); its six flows and their links as §11 specifies

#### Acceptance Criteria

- [ ] AC-077 `[auto]`: The default pipeline, placed in a `ProjectConfig` with `schemaVersion` 2 and an empty `rules` list, parses with an empty list of problems.
- [ ] AC-078 `[auto]`: The default pipeline has six flows with the ids `specify`, `ux`, `plan`, `build`, `verify` and `complete`, in this order. `specify` is the first flow (no flow's `next` names it); each flow's `next` names the following flow; `complete` has no `next`.
- [ ] AC-079 `[auto]`: Each default flow has exactly one Start, exactly one End and at least one Agent. The agents of the default pipeline have unique names.
- [ ] AC-080 `[auto]`: The `build` flow has exactly one condition, placed after its last agent and before its end, with the description `the build shows 0 errors, 0 warnings, 0 lint errors and all tests pass`. Its `true` route goes to the end, and its `false` route stops the flow (`{stop: true}`).
- [ ] AC-081 `[auto]`: `approval` is `true` for `specify`, `ux`, `plan` and `verify`, and `false` for `build` and `complete`.
- [ ] AC-082 `[auto]`: Each default flow's End names, in `producedArtifact`, the label of one of that flow's artifacts, and every artifact of the default flows has a non-blank label.
- [ ] AC-083 `[auto]`: The default pipeline has `name`, `description` and `arguments`, and its arguments include `feature-id`, which is required.

### US-017: The parser is pure

**As a** developer
**I want to** the parser and the model in core to do no I/O, no network and no process access
**So that** core stays a pure package that the API and the web app can both import, and the default pipeline is data read at build time

**Requirements:** core is pure (`architecture.md` §1; the TypeScript rules); the default pipeline is imported, not read at run time (decision 17)

#### Acceptance Criteria

- [ ] AC-084 `[auto]`: No file under `source/packages/core/src/pipeline/` imports or references `fs`, `node:fs`, `path` file access, `http`, `https`, `net`, `fetch`, `process`, `window` or `import.meta.env`. A test scans the source files and fails on any match.
- [ ] AC-085 `[auto]`: Parsing the same value twice gives the same typed result and the same list of problems, and the parser does not change the value it is given.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| `ProjectConfig` with `schemaVersion` 2, a rules list and one pipeline (decisions 16, 20) | AC-001, AC-002, AC-003, AC-004 |
| Parser returns every problem with its path, never throws, and returns either a typed config or problems (features.md F-02) | AC-005, AC-006 |
| Parser refuses unknown keys and wrong types (features.md F-02) | AC-007, AC-008, AC-009, AC-010 |
| Pipeline object: name, description, arguments, flows, model, tools, rule tags, body (decisions 16, 26) | AC-011, AC-012, AC-013, AC-014, AC-030, AC-086 |
| Argument rows: id, required, hint; file-safe id; hint limit; duplicate ids refused (schema §5) | AC-015, AC-016, AC-017, AC-018, AC-019 |
| Flow object: required and optional attributes (decisions 38, 39) | AC-020, AC-021, AC-022, AC-023, AC-024 |
| Ids file-safe and unique across the project (decision 18; owner, 2026-11-19) | AC-016, AC-018, AC-025, AC-026, AC-043, AC-048, AC-068 |
| Flow names unique, 1 to 100 non-blank (schema §3) | AC-027, AC-028 |
| Body texts of at most 1,000 code points (decision 28) | AC-029, AC-053 |
| Flows linked by `next`: one target, never itself, at most one incoming, no loops, connected (decisions 38, 39) | AC-031, AC-032, AC-033, AC-034, AC-035 |
| Artifacts: one-line label, template that may be empty, limits, no duplicate labels in a flow (decision 38; §6) | AC-036, AC-037, AC-038, AC-039, AC-087 |
| Length limits count code points (decision 28; owner, 2026-11-19) | AC-029, AC-037, AC-038, AC-088 |
| Block kinds start, agent, condition, end only; at least two blocks (decision 38; schema §2) | AC-040, AC-041, AC-042 |
| Start: `next` to an agent or a condition of the same flow (schema §2) | AC-044, AC-045, AC-046 |
| Agent: name, description, arguments, model, tools, reads, writes, rule tags, body, next (decisions 18, 21, 26, 27, 28) | AC-047, AC-048, AC-049, AC-050, AC-051, AC-052, AC-053, AC-054, AC-055 |
| Condition: description required; routes `{to}`, `{to, roundLimit}`, `{stop: true}`; round limit 1 to 5 (decisions 25, 40) | AC-056, AC-057, AC-058, AC-059, AC-060, AC-061, AC-062 |
| End: outcome `done` or `stopped`; `producedArtifact` is an artifact label of the flow (§6) | AC-063, AC-064, AC-065 |
| Rules: id, title, text; limits; unique ids; rule tags name rules (decisions 20, 21) | AC-066, AC-067, AC-068, AC-069, AC-070, AC-071, AC-072, AC-073 |
| Brief fields optional, with their limits (decisions 28, 37) | AC-074, AC-075, AC-076 |
| Default pipeline restated as data, six flows, linked, parses with no problems (decision 17; §11) | AC-077, AC-078, AC-079, AC-080, AC-081, AC-082, AC-083 |
| Core stays pure; the default pipeline is imported, not read (`architecture.md` §1; decision 17) | AC-084, AC-085 |

Criteria: 88, all `[auto]`; `[device]`: 0.
