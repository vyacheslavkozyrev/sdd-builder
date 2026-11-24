# User Stories — Generator core (F-04)

Feature entry: `spec/documents/features.md` → F-04
Requirements owned by this feature: the F-04 scope item in `features.md`; `architecture.md` §3 (generation model, steps 1, 4, 5 and 6 in `core`); `spec/documents/pipeline-schema.md` (the final schema: flows, Start, Agent, Condition and End blocks, routes, rounds, approval); decisions 18 (file-safe ids), 20 (one rule file per rule), 22 (the `pipeline` namespace), 23 (a duplicate path is a server error), 35 (sorted file list; `pipeline` flow id refused), 36 (base paths from the manifest), 38 to 41 (flow model, failed check stops the flow, analysis before generation)

This feature is an enabler: the stories are written for the developer who builds `/generate` (F-07) and the templates (F-05) on top of the generator core. The generator core is pure: it takes the config, the templates and the model's reply as data, and returns data. It calls no model.

## Out of Scope

- The template text: the files under `base/` and `claude-code/` and the spec template (F-05). F-04 tests use fixture templates passed in as data.
- The model call, `parseReply`, the single retry, the HTTP route and the zip (F-07, F-15). F-04 checks a reply that is already parsed into a map from path to text.
- The `/analyze` rewiring to the pipeline model and the removal of the flat analyzer (decision 22). F-04 adds the generator's refusals to the analysis rules only; the structural rules themselves are F-03.
- The structural rules of the flow model (no loops, connected flows, block reachability, route and round-limit checks). They are F-03's; F-04 reuses them through `analyzeStructure` and does not restate them.
- Enabled sections (`#enabled:<id>` … `/enabled:<id>`) in templates. Decision 34 removes the enabled property, so no layout needs them.
- Step markers in model replies. The templates README defines no step-marker syntax yet; F-04 checks the placeholder syntax `{{...}}` only, until F-05 defines a marker.
- The check that every path mentioned in a generated file exists in the output (`architecture.md` §3 step 6, F-10).
- The Mermaid process diagram (F-05) and the content of `process.md` beyond the placeholder values of F-05.
- The wording of LLM-written content. F-04 fixes which files exist, their layouts and their inputs; it does not judge the text the model writes beyond the checks of US-005.
- A stub agent file written without the model. Agent files are written by the model at `/generate` (decision 7, decision 41).

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-04 AC-003`).

### US-001: The plan lists every output file of a configuration

**As a** developer
**I want to** get, from a configuration and the templates, the list of every file the output holds
**So that** `/generate` knows which files the model must write and the zip holds exactly those files

**Requirements:** F-04 scope (a pure function from the configuration to a file tree); `architecture.md` §3 steps 3 and 4; decisions 5, 20 and 36(d) (base paths from `source/templates/base/manifest.json`); `pipeline-schema.md` §1

#### Acceptance Criteria

- AC-001 `[auto]`: a config with one flow (Start → Agent → End), one agent and one rule plans exactly these paths: `CLAUDE.md`, `spec/documents/process.md`, the base paths listed in the manifest, `.claude/commands/pipeline.md`, `.claude/commands/<flow-id>.md`, `.claude/agents/<name>.md` and `.claude/rules/<id>.md`.
- AC-002 `[auto]`: a config with three flows plans one command file per flow, named by the flow's id, plus `pipeline.md`; a flow with no Agent block (Start → Condition or Start → End) still gets its command file.
- AC-003 `[auto]`: one agent file per Agent block of every flow, named by the block's `name`; the Agent blocks of the flows are the only source of agent files, and two Agent blocks in different flows with different names plan two files.
- AC-004 `[auto]`: one rule file per entry of `rules`, named `<id>.md`; a config with an empty `rules` list plans no file under `.claude/rules/`.
- AC-005 `[auto]`: the default pipeline (`source/templates/pipeline/default.json`) plans without a blocker; its plan holds `pipeline.md`, one command file for each of its six flows, and one agent file for each Agent block of those flows.
- AC-006 `[auto]`: every planned path is file-safe: it is relative, has no `..` segment, no backslash and no empty segment.

### US-002: The plan is deterministic

**As a** developer
**I want to** get the same paths, order and text from the same input every time
**So that** a test can compare two runs and the zip holds the same files for the same configuration

**Requirements:** F-04 scope (deterministic paths and order, no timestamps); `architecture.md` §3 (the file list is fixed by `core`); decision 35 (the file list is sorted by path; the first flow is the pipeline's entry)

#### Acceptance Criteria

- AC-007 `[auto]`: the planned files come out sorted by path, in code-point order; reordering the rules, or the flows after the first, gives the same list of paths. A reordering that leaves a flow unreached is refused, not planned (decision 35, amended 2026-11-17).
- AC-008 `[auto]`: planning the same config and templates twice gives equal plans: the same paths, the same order, the same layouts, descriptions and rule tags.
- AC-009 `[auto]`: no planned path or text contains a date, a time, a UUID or a random string; the test checks the plan of a fixed config against a fixed list of patterns.
- AC-010 `[auto]`: planning does not change the config or the templates it was given (both are equal before and after the call).

### US-003: Each planned file carries its rendered layout

**As a** developer
**I want to** have each planned file's layout rendered with the config's values and with the steps, conditions, description and rule tags of its flow or agent
**So that** the model writes each file from the right flow or block, with the rules that apply to it and the conditions it must respect

**Requirements:** `architecture.md` §3 step 4 (the pipeline command and the per-flow commands, conditions as numbered rules) and step 5 (the input of the model call); decision 7 (block descriptions); decisions 21 and 26 (rule tags, model, tools, body); decision 40 (a failed check stops the flow and asks the user); `pipeline-schema.md` §1 and §3 (Condition, route and approval rules)

#### Acceptance Criteria

- AC-011 `[auto]`: each planned file has a path, a rendered layout (text with no `{{...}}` left), a description (the `description` of its flow or Agent block, or an empty text when it has none) and a list of rule tags (the `ruleTags` of its flow or of its Agent block; an empty list when there are none).
- AC-012 `[auto]`: each `{{name}}` placeholder in a layout is replaced by its value from the config; a flow's command layout that uses `{{flowId}}` gives that flow's id.
- AC-013 `[auto]`: a placeholder with no value (a name the renderer does not know) makes planning throw an error that names the placeholder and the file path (a template error, a programmer error, not a user refusal).
- AC-014 `[auto]`: a value that contains `{{...}}` text (for example a rule text or a condition description) is copied as written and is not rendered again; the placeholders are replaced in one pass.
- AC-015 `[auto]`: a flow's command layout lists its steps in the order the flow runs them from its Start: each Agent block is a numbered step that names the agent file, its arguments and its description; the walk follows `next` links and a condition's `true` route before its `false` route, and a block reached by two routes is listed once. The walk is fixed by the config, so the layout is the same in every run.
- AC-016 `[auto]`: each Condition in a flow's command layout is a numbered rule that gives its description, its true route and its false route. A false route that returns to an earlier Agent names that Agent and its round limit (1 to 5). A false route of `{stop: true}` says that the flow stops and the command asks the person a question built from the condition's description (decision 40).
- AC-017 `[auto]`: the pipeline command layout names the pipeline's arguments and lists its flows in pipeline order, each with its approval (on: the process stops for a person at the end of the flow; off: it does not) and its description. A flow id is not repeated as a step.
- AC-018 `[auto]`: a flow with approval on has its command layout say that the process stops for the person's approval at the end of the flow; a flow with approval off has no such line.

### US-004: A configuration that cannot be generated is refused with its problems

**As a** developer
**I want to** have planning refuse a configuration with the same blockers the analysis reports
**So that** `/analyze` and `/generate` never disagree about what is wrong with a configuration

**Requirements:** F-04 scope (configurations that cannot be generated are refused with their problems); decision 10 (refusals are blockers in the analysis, `configProblems`); decision 35 (a flow whose id is `pipeline` is refused); decision 41 (analysis before generation)

#### Acceptance Criteria

- AC-019 `[auto]`: `configProblems(config)` returns exactly the blocker findings of `pipeline.analyzeStructure` for the same config, in the same order; it returns no warning.
- AC-020 `[auto]`: planning a config with at least one blocker returns no files and lists every blocker (path and message) in the analysis order; no layout is rendered.
- AC-021 `[auto]`: a config with only warnings plans normally; the default pipeline's warnings do not refuse it.
- AC-022 `[auto]`: a flow whose id is `pipeline` is a blocker at the flow's path, because its command file would be `.claude/commands/pipeline.md`, the same path as the pipeline command; the analysis reports this blocker too (AC-019).
- AC-023 `[auto]`: a pipeline whose `flows` list is empty is refused with the blocker of F-03 for a pipeline with no flows, and planning returns no files.
- AC-024 `[auto]`: a planned path that would appear twice is not produced: a duplicate is a bug in the generator, so planning throws a generation error that names the path (decision 23). No configuration that passes AC-019 reaches it.

### US-005: The model's reply is checked before any file is used

**As a** developer
**I want to** have a pure check of the model's reply against the plan
**So that** a reply with a missing, extra, unsafe or unfinished file never reaches the zip

**Requirements:** F-04 scope (the check of the model's reply); `architecture.md` §3 step 6 (`pipeline.checkReply`); decision 11 (a failed check gets one retry, which `/generate` makes); decision 41 (the model writes the content, so the reply is checked)

#### Acceptance Criteria

- AC-025 `[auto]`: a reply that holds every planned path, each with a non-empty text, and that has no problem, returns no findings.
- AC-026 `[auto]`: a planned path that is missing from the reply is a finding that names the path.
- AC-027 `[auto]`: a reply path that is not in the plan is a finding that names the path, and its text is not used.
- AC-028 `[auto]`: a reply path that is absolute, has a `..` segment, a backslash or an empty segment is a finding that names the path; the path is never used to write a file.
- AC-029 `[auto]`: a reply text that is empty or holds a `{{...}}` placeholder is a finding that names the path.
- AC-030 `[auto]`: a Markdown output that lacks a `##` heading its layout requires is a finding that names the path and the heading; a heading counts only as a whole line that starts with `## `, so a `###` line does not satisfy it.
- AC-031 `[auto]`: a reply text that names `SDDBuilder`, `source/apps/web`, `source/apps/api` or `source/packages/core` is a finding that names the path; the generated project must not refer to SDDBuilder's own files.
- AC-032 `[auto]`: a reply value that is not a string is a finding that names the path, not an exception.
- AC-033 `[auto]`: findings come out sorted by path, then by message; the same reply checked twice gives the same findings; the check does not change the plan or the reply.

### US-006: The generator core is pure and exposed as one namespace

**As a** developer
**I want to** use the generator through the `pipeline` namespace of `core`, with no file, network or clock access
**So that** the API and the builder call the same code and the core stays testable with fixed inputs

**Requirements:** `architecture.md` §5 decision 22 (namespace); `.claude/rules/typescript.md` (purity); decision 11 (no model call in core)

#### Acceptance Criteria

- AC-034 `[auto]`: `configProblems`, `planGeneration`, `checkReply` and `listFiles` (with its types `ListedFile` and `FileSource`, F-13 amendment of 2026-11-24) are reached as `pipeline.configProblems`, `pipeline.planGeneration`, `pipeline.checkReply` and `pipeline.listFiles`; F-04 adds no other name to the `pipeline` namespace.
- AC-035 `[auto]`: the generator modules of `core` import no `fs`, `http`, `process`, `window` or model client, and read no template file; the templates come in as data (checked by a purity test over the source of the generator folder).
- AC-036 `[auto]`: planning with the same fixture templates given as data returns the same plan in two test runs, with no file on disk changed between them.

### US-007: Base layouts take their lists from the config (amendment 2026-11-19)

**As a** developer
**I want to** have the base layouts (`CLAUDE.md`, `process.md`, the spec templates) filled with the lists of the process, the commands, the agents and the rules
**So that** the generated project's instructions name the flows, commands, agents and rules that the config actually holds

**Requirements:** `architecture.md` §3 step 3 (base files: project instructions, `process.md`, placeholder values); decision 36(b) (whole-line values built in code); owner decision 2026-11-19 (F-04 supplies the base values)

#### Acceptance Criteria

- AC-037 `[auto]`: `baseValues(config)` returns `processList`, `commandList`, `agentList` and `ruleList` as text built in code: `processList` has one line per flow in pipeline order, `commandList` one line per command file (the pipeline command and each flow), `agentList` one line per Agent block with its agent file, and `ruleList` one line per rule with its file. Each list is empty when it has no item.
- AC-038 `[auto]`: planning renders each base layout with the values of `baseValues`; a base layout that uses a placeholder that `baseValues` does not provide still throws (AC-013 holds). `processDiagram` is not supplied: the Mermaid view belongs to F-05 (decision 36(a)).

### US-008: The pipeline command carries model, tools and body (amendment 2026-11-19)

**As a** developer
**I want to** have the pipeline's model, tools and body written into the pipeline command, as an agent's are
**So that** the pipeline command runs with the same settings the config gives the pipeline (decision 26)

**Requirements:** decision 26 (the pipeline takes model, tools and body; the generator writes them into the pipeline command); owner decision 2026-11-19 (added to F-04)

#### Acceptance Criteria

- AC-039 `[auto]`: `pipelineValues` gives `pipelineModel` and `pipelineTools` as frontmatter lines (`\nmodel: x`, `\ntools: a, b`), empty when the pipeline has no model or an empty tools list, and `pipelineBody` as `\n\n` followed by the body, empty when there is none; a layout that places them at the end of its lines leaves no blank line when they are empty.

### US-009: A line break in a block description does not split a numbered line (amendment 2026-11-19)

**As a** developer
**I want to** have every numbered step, rule and argument line of a flow command stay one line
**So that** the numbered lists of the command are not broken by a description that contains a line break

**Requirements:** `source/templates/README.md` (line-break convention); `architecture.md` §3 step 4 (one numbered line per step, rule and argument)

#### Acceptance Criteria

- AC-040 `[auto]`: an Agent `description`, a Condition `description` and an argument `hint` that contain a line break are written on one line in the flow command's step, rule and argument lines (line breaks become spaces, the text is trimmed); the same is true for the agent's `description` in its agent value.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| A pure function from the configuration to a file tree (base, pipeline command, flow commands, agents, rules) | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006 |
| Deterministic paths and order, no timestamps; sorted by path | AC-007, AC-008, AC-009, AC-010 |
| Each file carries its rendered layout, description and rule tags (§3 step 4 and 5) | AC-011, AC-012, AC-013, AC-014 |
| Steps, conditions with round limits, `{stop: true}`, approval and arguments in the command layouts (§3 step 4; decisions 38, 40) | AC-015, AC-016, AC-017, AC-018 |
| Configurations that cannot be generated are refused with their problems | AC-019, AC-020, AC-021, AC-022, AC-023, AC-024 |
| The model's reply is checked before use (§3 step 6) | AC-025, AC-026, AC-027, AC-028, AC-029, AC-030, AC-031, AC-032, AC-033 |
| Pure core, one namespace, no model call in core | AC-034, AC-035, AC-036 |
| Base layouts take the lists of the process, commands, agents and rules (owner decision 2026-11-19) | AC-037, AC-038 |
| The pipeline command carries model, tools and body (decision 26; owner decision 2026-11-19) | AC-039 |
| A line break in a block description does not split a numbered line (`source/templates/README.md`) | AC-040 |
