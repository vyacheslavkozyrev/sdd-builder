# User Stories — Generator core: pipeline, agents and rules to file tree (F-02)

Feature entry: `spec/documents/features.md` → F-02
Requirements owned by this feature: R-01 to R-07 (listed in the Requirement Coverage table)

## Out of Scope

- Advice findings: a retry with no round limit and an agent input with no upstream producer are analyzer findings (F-04). They never refuse generation.
- The LLM review and the analysis result (F-04).
- The content of the Claude Code templates, the `planGeneration` and `checkReply` functions, and the template placeholder list for the Claude Code layout (F-03).
- The LLM writing of final command, agent and rule text, the model call, the one retry, and the HTTP endpoint and zip packaging (F-07). F-02 writes stub text only.
- The generated-project self-check that every path a command names exists (F-10).
- The Mermaid view of the process in `process.md` and the process diagrams (F-18).
- Authoring of the rules list in the wizard (F-05) and of blocks and gates in the builder (F-06).
- Presets (F-09), Spec Kit and OpenSpec outputs (F-16, F-17), Cursor and Copilot (F-11, F-12).
- Removing the flat generator code. It stays until F-07 rebuilds the API, its last consumer (decision 19).

## Decisions taken in this specification (the user is asked to approve them)

- **Scope:** a pure function `generate(config, templates) → GenerationResult` in `source/packages/core`, on the pipeline model. It sits beside the flat generator, which stays until F-07 (decision 19).
- **Refusal (decision 10):** `generate` refuses only blockers and throws `InvalidConfigError` with every problem found, returning no files. The blockers are the structural rules of `building-blocks.md` §7 that decision 10 names as blockers (shape, ids, one nesting level, wiring of both Condition outputs, reachability from Start, required blocks, an Agent block with no description). Two more are blockers here, because a command file cannot be written without them: a back route that leaves its child flow or goes to a later block, and an enabled route into a disabled block. Advice stays in F-04.
- **Output:** the base files, `process.md` (text, no Mermaid), `pipeline.md`, and one command file per enabled child flow are rendered in full. Agent and rule files are emitted in full with stub text: the block's description or the rule's text. F-07 replaces the stub text with LLM-written content (decision 7). The file list and paths are fixed by `core`.
- **Rules:** `ProjectConfig` gains a `rules` list (`id`, `title`, `text`). Each entry becomes `.claude/rules/<id>.md`. This is an architecture change, recorded as decision 20 in `architecture.md` §6 before code depends on it.
- **Mermaid:** the Mermaid view of `process.md` is F-18. `architecture.md` §3 step 3 and `source/templates/README.md` are updated to match in the same task as the spec.
- **Templates are injected:** `generate` receives a `TemplateSource` (`get(path) → string | undefined`). Tests use fixture templates; the real templates arrive with F-03.
- **Placeholders:** `{{name}}` for a value from the config; `{{#enabled:<id>}}…{{/enabled:<id>}}` for a section kept only when that block or flow is enabled, not nested. A placeholder with no value fails generation with an error naming the file and the placeholder.
- **Round limits:** a retry with no limit is valid. The generated text says "no limit set". The generator never invents a number.
- **Gate types:** `approval`, `checks`, `review`, `diff-size`. Any other type is refused. A `diff-size` threshold is a whole number of at least 1.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-02 AC-003`).

### US-001: Refuse configurations that cannot be generated

**As a** developer
**I want to** have a configuration that cannot be generated refused with every problem listed
**So that** no partial or ambiguous output is ever produced

**Requirements:** R-01

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: a pipeline or a child flow with no Start block is refused, with the path of the flow.
- [ ] AC-002 `[auto]`: a pipeline or a child flow with more than one Start block, or with no End block, is refused, with its path.
- [ ] AC-003 `[auto]`: a Connection whose two ends are in different child flows, or whose end is not a block or flow of the config, is refused, with its path.
- [ ] AC-004 `[auto]`: a Condition whose pass or fail output is not wired is refused, naming the Condition and the missing output.
- [ ] AC-005 `[auto]`: a block or a flow that cannot be reached from the pipeline's Start is refused, naming it.
- [ ] AC-006 `[auto]`: a back route that goes to a later block, goes to a block outside its child flow, or leaves a child flow is refused, naming the route.
- [ ] AC-007 `[auto]`: an enabled route that points into a disabled block or flow is refused, naming the route.
- [ ] AC-008 `[auto]`: an id that is not file-safe, or that repeats across flows, blocks and arguments, is refused, naming every path that clashes. An agent name that repeats another agent's name is refused.
- [ ] AC-009 `[auto]`: a custom block whose id clashes with another id is refused (decision 8 of `architecture.md`).
- [ ] AC-010 `[auto]`: a required block of the default pipeline that is missing, or disabled, is refused, naming it.
- [ ] AC-011 `[auto]`: a Condition with a check type outside `approval`, `checks`, `review`, `diff-size` is refused; a `diff-size` threshold that is missing, not a whole number, or below 1 is refused; a threshold on another check type is refused.
- [ ] AC-012 `[auto]`: when several problems exist, every one is listed in the error, sorted by path, and `generate` returns no files.
- [ ] AC-013 `[auto]`: a retry with no round limit, and an agent input with no upstream producer, do not refuse; the configuration generates (the advice is F-04).
- [ ] AC-014 `[auto]`: the content of disabled blocks and flows is not checked; a disabled flow with an invalid Condition does not refuse the configuration.

### US-002: Select and order what is generated

**As a** developer
**I want to** get exactly the enabled flows and blocks, in their order
**So that** the output follows the process as the user built it

**Requirements:** R-02

#### Acceptance Criteria

- [ ] AC-015 `[auto]`: disabled flows and blocks produce no output; enabled flows appear in pipeline order, and enabled blocks inside each flow in their block order.
- [ ] AC-016 `[auto]`: a custom block is selected and ordered like a block of the default pipeline.
- [ ] AC-017 `[auto]`: the Start and End blocks of each flow and the gate Conditions between flows are always selected when their flow is enabled.

### US-003: Render base files and placeholders

**As a** developer
**I want to** the base files filled with the project's values
**So that** every generated project starts with the same layout

**Requirements:** R-03

#### Acceptance Criteria

- [ ] AC-018 `[auto]`: `CLAUDE.md`, `spec/documents/process.md` and the spec template are rendered from the `TemplateSource`, with each `{{name}}` replaced by its value from the config.
- [ ] AC-019 `[auto]`: a `{{name}}` with no value fails generation with an error naming the file and the placeholder; no files are returned.
- [ ] AC-020 `[auto]`: a `{{#enabled:<id>}}…{{/enabled:<id>}}` section is kept when that block or flow is enabled and removed when it is disabled; a nested section is refused with an error naming the file.
- [ ] AC-021 `[auto]`: a template that the `TemplateSource` does not hold fails generation with an error naming the missing path; no files are returned.
- [ ] AC-022 `[auto]`: `process.md` is text that lists the flows, blocks and gates in order and contains no Mermaid block.

### US-004: Generate the pipeline and command files

**As a** developer
**I want to** one command file per enabled child flow and one pipeline command
**So that** the process runs in the order the builder shows

**Requirements:** R-04

#### Acceptance Criteria

- [ ] AC-023 `[auto]`: each enabled child flow produces `.claude/commands/<flow-id>.md`, listing its enabled blocks as numbered steps in order, each naming the file it calls.
- [ ] AC-024 `[auto]`: `.claude/commands/pipeline.md` lists the pipeline's arguments (name and whether required), its child flows in order, and the gates and checks between them.
- [ ] AC-025 `[auto]`: a back route becomes a numbered rule that names its target and its round limit; without a limit it says "no limit set". A Condition of type `diff-size` shows its threshold, and the other check types show their decider (`human` or `agent`).
- [ ] AC-026 `[auto]`: a command file never mentions a disabled block or flow.

### US-005: Generate agent and rule files

**As a** developer
**I want to** one agent file per agent and one rule file per rule
**So that** the files that the LLM fills later have fixed paths

**Requirements:** R-05

#### Acceptance Criteria

- [ ] AC-027 `[auto]`: each enabled Agent block produces `.claude/agents/<name>.md`, with the block's description as its stub text.
- [ ] AC-028 `[auto]`: each entry of the config's `rules` list produces `.claude/rules/<id>.md`, with the rule's title and text.
- [ ] AC-029 `[auto]`: an Agent block with no description is refused, naming the block, because the stub text would be empty.

### US-006: Produce a deterministic, sorted file list

**As a** developer
**I want to** the same configuration to give the same files every time
**So that** tests and the zip are reproducible

**Requirements:** R-06

#### Acceptance Criteria

- [ ] AC-030 `[auto]`: the file list is sorted by path; two outputs with the same path are an error, not a silent overwrite.
- [ ] AC-031 `[auto]`: generating twice from the same config and the same `TemplateSource` gives the same paths, order and content.
- [ ] AC-032 `[auto]`: no timestamp, random id or environment value is written into any generated file.

### US-007: Keep the core pure

**As a** developer
**I want to** the generator to do no I/O
**So that** it can run in the browser and in tests without a file system

**Requirements:** R-07

#### Acceptance Criteria

- [ ] AC-033 `[auto]`: no source file under `source/packages/core/src/` imports `fs`, `http`, `window` or reads `process.env`; a test scans the package and names any file that does.
- [ ] AC-034 `[auto]`: `generate` runs with a fake `TemplateSource` and fixed input, with no network or file access.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| R-01 Refuse configurations that cannot be generated (blockers only) | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014 |
| R-02 Select and order enabled flows and blocks | AC-015, AC-016, AC-017 |
| R-03 Base files and placeholders | AC-018, AC-019, AC-020, AC-021, AC-022 |
| R-04 Pipeline and command files | AC-023, AC-024, AC-025, AC-026 |
| R-05 Agent and rule files with stub text | AC-027, AC-028, AC-029 |
| R-06 Sorted, deterministic file list | AC-030, AC-031, AC-032 |
| R-07 Pure core | AC-033, AC-034 |
