# User Stories — Generator core (F-04)

Feature entry: `spec/documents/features.md` → F-04
Requirements owned by this feature: the F-04 scope item in `features.md`; `architecture.md` §3 (generation model, steps 1, 4, 5 and 6 in `core`); decision 10 (refusals as blockers in the analysis); decision 18 (file-safe ids); decision 20 (one rule file per rule); decision 22 (the `pipeline` namespace)

This feature is an enabler: the stories are written for the developer who builds `/generate` (F-07) and the templates (F-05) on top of the generator core. The generator core is pure: it takes the config, the templates and the model's reply as data, and returns data. It calls no model.

## Out of Scope

- The template text: the files under `base/` and `claude-code/` and the spec template (F-05). F-04 tests use fixture templates passed in as data.
- The model call, `parseReply`, the single retry, the HTTP route and the zip (F-07, F-15). F-04 checks a reply that is already parsed into a map from path to text.
- The `/analyze` rewiring to the pipeline model and the removal of the flat analyzer (decision 22). F-04 adds the generator's refusals to the analysis rules; the rest of the analyzer wiring follows its own feature (F-06).
- Enabled sections (`#enabled:<id>` … `/enabled:<id>`) in templates. Decision 34 removes the enabled property, so no layout needs them.
- Step markers in model replies. The templates README defines no step-marker syntax yet; F-04 checks the placeholder syntax `{{...}}` only, until F-05 defines a marker.
- The Mermaid process diagram (F-18) and the process text beyond the placeholder values of F-05.
- A stub agent file written without the model. Agent files are written by the model at `/generate` (decision 7).

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-04 AC-003`).

### US-001: The plan lists every output file of a configuration

**As a** developer
**I want to** get, from a configuration and the templates, the list of every file the output holds
**So that** `/generate` knows which files the model must write and the zip holds exactly those files

**Requirements:** F-04 scope (a pure function from the configuration to a file tree); `architecture.md` §3 step 4; decisions 5 and 20; `source/templates/README.md` (files the generator writes)

#### Acceptance Criteria

- AC-001 `[auto]`: a config with one flow (Start → Agent → End), one agent and one rule plans exactly these paths: `CLAUDE.md`, `spec/documents/process.md`, one path under `spec/specifications/F-00-template/` for each spec-template file the templates provide, `.claude/commands/pipeline.md`, `.claude/commands/<flow-id>.md`, `.claude/agents/<name>.md` and `.claude/rules/<id>.md`.
- AC-002 `[auto]`: a config with three child flows plans one command file per flow, named by the flow's id, plus `pipeline.md`; a flow with no Agent block still gets its command file.
- AC-003 `[auto]`: one agent file per Agent block of every flow, named by the block's `name`; a flow's Agent blocks are the only source of agent files.
- AC-004 `[auto]`: one rule file per entry of `rules`, named `<id>.md`; a config with an empty `rules` list plans no file under `.claude/rules/`.
- AC-005 `[auto]`: the default pipeline (`source/templates/pipeline/default.json`) plans without a blocker, and its plan holds `pipeline.md`, one command file per child flow of the default and one agent file per Agent block of those flows.
- AC-006 `[auto]`: every planned path is file-safe: it is relative, has no `..` segment, no backslash and no empty segment.

### US-002: The plan is deterministic

**As a** developer
**I want to** get the same paths, order and text from the same input every time
**So that** a test can compare two runs and the zip holds the same files for the same configuration

**Requirements:** F-04 scope (deterministic paths and order, no timestamps); `architecture.md` §3 (the file list is fixed by `core`); `source/templates/README.md` (sorted by path)

#### Acceptance Criteria

- AC-007 `[auto]`: the planned files come out sorted by path, in code-point order, whatever the order of the rules, or of the flows after the first; the first flow is the pipeline's entry, and a reordering that leaves a flow unreached is refused, not planned (Amendment 2026-11-17, the user's decision).
- AC-008 `[auto]`: planning the same config and templates twice gives equal plans: the same paths, the same order, the same layouts, descriptions and tags.
- AC-009 `[auto]`: no planned text contains a date, a time, a UUID or a random string; the test checks the output of a fixed config against a fixed list of patterns.
- AC-010 `[auto]`: planning does not change the config or the templates it was given (both are unchanged after the call).

### US-003: Each planned file carries its rendered layout

**As a** developer
**I want to** have each planned file's layout rendered with the config's values and with the description and rule tags of its item
**So that** the model writes each file from the right block or flow, with the rules that apply to it

**Requirements:** `architecture.md` §3 step 5 (the input of the model call); decision 7 (block descriptions); decision 21 (rule-set tags); `source/templates/README.md` (placeholders)

#### Acceptance Criteria

- AC-011 `[auto]`: each planned file has a path, a rendered layout (text with no `{{...}}` left), a description (the description of its flow or Agent block, or an empty text when it has none) and a list of rule tags (the `ruleTags` of its flow or Agent block; an empty list when it has none).
- AC-012 `[auto]`: each `{{name}}` placeholder in a layout is replaced by its value from the config; a layout that uses `{{flowId}}` in a flow's command file gives that flow's id.
- AC-013 `[auto]`: a placeholder that has no value (a name the renderer does not know) makes planning throw an error that names the placeholder and the file path (a template error, a programmer error, not a user refusal).
- AC-014 `[auto]`: a value that contains `{{...}}` text (for example a rule text) is copied as written and is not rendered again; the placeholders are replaced in one pass.
- AC-015 `[auto]`: a pipeline with a Start block and a route that the back-route rule names renders the route as a numbered rule naming its target block and its round limit, and writes `no limit set` when the limit is absent.

### US-004: A configuration that cannot be generated is refused with its problems

**As a** developer
**I want to** have planning refuse a configuration with the same blockers the analysis reports
**So that** `/analyze` and `/generate` never disagree about what is wrong with a configuration

**Requirements:** F-04 scope (configurations that cannot be generated are refused with their problems); decision 10 (refusals are blockers in the analysis, `configProblems`); F-03 out of scope (the generator's refusal checks belong to F-04)

#### Acceptance Criteria

- AC-016 `[auto]`: `configProblems(config)` returns exactly the blocker findings of `pipeline.analyzeStructure` for the same config, in the same order; it returns no warning.
- AC-017 `[auto]`: planning a config with at least one blocker returns no files and lists every blocker (path and message) in the analysis order; no layout is rendered.
- AC-018 `[auto]`: a config with only warnings plans normally; the default pipeline's two retry warnings (F-03 AC-024) do not refuse it.
- AC-019 `[auto]`: a flow whose id is `pipeline` is a blocker at the flow's path, because its command file would be `.claude/commands/pipeline.md`, the same path as the pipeline command; the analysis reports this blocker too (AC-016).
- AC-020 `[auto]`: a config whose pipeline holds no flows is refused with the blocker of F-03 for a pipeline with no flows, and planning returns no files.
- AC-021 `[auto]`: a planned path that would appear twice is not produced: a duplicate is a bug in the generator, so planning throws (decision 23), and no configuration reaches it through a refusal.

### US-005: The model's reply is checked before any file is used

**As a** developer
**I want to** have a pure check of the model's reply against the plan
**So that** a reply with a missing, extra, unsafe or unfinished file never reaches the zip

**Requirements:** F-04 scope (the check of the model's reply); `architecture.md` §3 step 6 (`pipeline.checkReply`); decision 11 (a failed check gets one retry, which `/generate` makes)

#### Acceptance Criteria

- AC-022 `[auto]`: a reply that holds every planned path, each with a non-empty text, that has no problem, returns no findings.
- AC-023 `[auto]`: a planned path that is missing from the reply is a finding that names the path.
- AC-024 `[auto]`: a reply path that is not in the plan is a finding that names the path, and the text is not used.
- AC-025 `[auto]`: a reply path that is absolute, has a `..` segment, a backslash or an empty segment is a finding; the path is never used to write a file.
- AC-026 `[auto]`: a reply text that is empty, or holds a `{{...}}` placeholder, is a finding that names the path.
- AC-027 `[auto]`: a Markdown output that lacks a `##` heading its layout requires is a finding that names the path and the heading.
- AC-028 `[auto]`: a reply text that names `SDDBuilder`, `source/apps/web`, `source/apps/api` or `source/packages/core` is a finding that names the path; the generated project must not refer to SDDBuilder's own files.
- AC-029 `[auto]`: a reply value that is not a string is a finding that names the path, not an exception.
- AC-030 `[auto]`: findings come out sorted by path, then by message; the same reply checked twice gives the same findings; the check does not change the plan or the reply.

### US-006: The generator core is pure and exposed as one namespace

**As a** developer
**I want to** use the generator through the `pipeline` namespace of `core`, with no file, network or clock access
**So that** the API and the builder call the same code and the core stays testable with fixed inputs

**Requirements:** `architecture.md` §5 decision 22 (namespace); `.claude/rules/typescript.md` (purity); decision 11 (no model call in core)

#### Acceptance Criteria

- AC-031 `[auto]`: `configProblems`, `planGeneration` and `checkReply` are reached as `pipeline.configProblems`, `pipeline.planGeneration` and `pipeline.checkReply`; the root export list gains no other name.
- AC-032 `[auto]`: the generator modules of `core` import no `fs`, `http`, `process`, `window` or model client, and read no template file; the templates come in as data (checked by a purity test over the source of the generator folder).
- AC-033 `[auto]`: planning with the same fixture templates given as data returns the same plan in two test runs with no file on disk changed between them.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| A pure function from the configuration to a file tree | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006 |
| Deterministic paths and order, no timestamps | AC-007, AC-008, AC-009, AC-010 |
| Each file carries its layout, description and rule tags (§3 step 5) | AC-011, AC-012, AC-013, AC-014, AC-015 |
| Configurations that cannot be generated are refused with their problems | AC-016, AC-017, AC-018, AC-019, AC-020, AC-021 |
| The model's reply is checked before use (§3 step 6) | AC-022, AC-023, AC-024, AC-025, AC-026, AC-027, AC-028, AC-029, AC-030 |
| Pure core, one namespace, no model call in core | AC-031, AC-032, AC-033 |
