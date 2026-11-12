# User Stories — Generator Core (F-02)

Feature entry: `spec/documents/features.md` → F-02
Requirements owned by this feature: none (SDDBuilder has no requirement IDs; scope items S1–S5 are listed in the Requirement Coverage table)
Depends on: F-01 (the model must first be changed from the flat block list to workflows, steps, gates, branches and the map, as in `spec/documents/building-blocks.md` §6)
Reads: `spec/documents/building-blocks.md`, `spec/documents/architecture.md` §3 and §9, `templates/README.md`

## Scope (from features.md)

- S1: a pure function `generate(config, templates) → GenerationResult`, which refuses configurations it cannot generate.
- S2: selects the enabled workflows and steps and orders them: workflows by the map, steps by their tab.
- S3: renders the base files, one command per workflow, the step files, gates, branches, placeholders and the Mermaid view of the process.
- S4: returns a file list.
- S5: output is deterministic.

## Design decisions in this spec

These are the defaults chosen in the specify step. Each one is covered by an acceptance criterion; changing one means changing its criteria.

- **Hard errors only in this feature.** The generator refuses what it cannot generate or cannot generate unambiguously: duplicate ids, unknown references, cycles, unwired outputs, unknown gate types, invalid round limits, missing required steps, routes to disabled steps. It does not refuse advice. Unreachable steps, retries with no round limit, and inputs with no upstream producer are findings for F-04, and are never errors here.
- **Invalid input is an error, not partial output.** `generate` throws `InvalidConfigError` carrying every problem found, and returns no files.
- **No default round limit.** A retry without a limit is valid. The generated text says "no limit set". The generator never invents a number.
- **Gate types are a fixed set:** `approval`, `checks`, `review`, `diff-size`. Any other type is refused. Generated projects never contain user-written check commands.
- **Custom steps are generated like catalog steps.** Authoring them is F-14. Generation uses the model only.
- **Templates are injected.** `generate` receives a `TemplateSource` (`get(path) → string | undefined`). Tests use fixture templates. The real Claude Code templates arrive with F-03.
- **Placeholders follow `templates/README.md`:** `{{name}}` for values; `{{#step:<id>}}…{{/step:<id>}}` for conditional sections, not nested.
- **The Mermaid view of the process is part of this feature** (architecture §3, step 3), as text in `process.md`. The diagrams in the builder are F-18.

## Out of Scope

- Advice findings: unreachable steps, retries with no limit, missing upstream producers, LLM review (F-04).
- The generated-project self-check that every path a command names exists (F-10).
- The Claude Code template content itself (F-03).
- The HTTP endpoint and the zip packaging (F-07). This feature returns a file list, not a zip.
- Authoring workflows, steps and custom steps in the UI (F-06, F-14), and the gate UI (F-15).
- The diagrams and the presentation mode in the builder (F-18).
- Presets (F-09), Spec Kit and OpenSpec outputs (F-16, F-17), Cursor and Copilot (F-11, F-12).

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-02 AC-003`). This feature has no `[device]` criteria.

### US-001: Refuse configurations that cannot be generated

**As a** developer using the API
**I want to** be told every problem with my process at once
**So that** I fix them in one pass and never receive a half-built framework

**Requirements:** S1

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: A workflow id, step id or custom step id that appears twice (in any combination of workflows, catalog steps and custom steps) makes `generate` throw `InvalidConfigError` naming both occurrences.
- [ ] AC-002 `[auto]`: A map connection, branch route or gate target that names an unknown workflow or step makes `generate` throw `InvalidConfigError` naming the reference.
- [ ] AC-003 `[auto]`: A cycle on the map makes `generate` throw `InvalidConfigError` naming the workflows in the cycle.
- [ ] AC-004 `[auto]`: A branch route that targets a step in another workflow, or a backward route to a step that is not earlier in the same workflow, makes `generate` throw `InvalidConfigError`. Forward routes inside the workflow are valid.
- [ ] AC-005 `[auto]`: A condition with a missing pass output or a missing fail output makes `generate` throw `InvalidConfigError`.
- [ ] AC-006 `[auto]`: A required catalog step that is absent or disabled in its workflow, or a required gate that is absent, makes `generate` throw `InvalidConfigError`.
- [ ] AC-007 `[auto]`: A gate whose type is not one of `approval`, `checks`, `review`, `diff-size` makes `generate` throw `InvalidConfigError`.
- [ ] AC-008 `[auto]`: A round limit that is set but is not a positive integer makes `generate` throw `InvalidConfigError`. An absent round limit is valid.
- [ ] AC-009 `[auto]`: A custom step marked `required`, or with an id that clashes with a catalog step, makes `generate` throw `InvalidConfigError`.
- [ ] AC-010 `[auto]`: A branch route or connection that refers to a disabled step or disabled workflow makes `generate` throw `InvalidConfigError`.
- [ ] AC-011 `[auto]`: When several problems exist, the thrown error lists all of them in one `InvalidConfigError`, not only the first.

### US-002: Select and order what is generated

**As a** developer
**I want to** get only the enabled parts of my process, in the order I designed
**So that** the framework runs the way the map and the tabs show it

**Requirements:** S2

#### Acceptance Criteria

- [ ] AC-012 `[auto]`: Workflows are emitted in map order: a workflow comes after every workflow connected into it. Workflows with no connection between them keep their tab order.
- [ ] AC-013 `[auto]`: Steps inside a workflow are emitted in tab order. Disabled steps produce no files.
- [ ] AC-014 `[auto]`: A disabled workflow produces no files and takes no part in the ordering.

### US-003: Generate one command per workflow

**As a** developer running the process in Claude Code
**I want to** one command per workflow that calls its steps in order, with gates and retries stated
**So that** I can run a whole workflow with one command and know what it will do

**Requirements:** S3

#### Acceptance Criteria

- [ ] AC-015 `[auto]`: Each enabled workflow produces exactly one `.claude/commands/workflow-<id>.md`, where `<id>` is the workflow id.
- [ ] AC-016 `[auto]`: The workflow command lists its enabled steps as numbered items in tab order. Each item names the file the step generates.
- [ ] AC-017 `[auto]`: Each branch becomes a numbered rule that names where the pass output and the fail output go. A retry rule states its round limit, or "no limit set" when there is none.
- [ ] AC-018 `[auto]`: A gate placed after a step becomes a stop rule ("if this gate fails, stop and report"). A gate placed on a map connection becomes a precondition at the top of the downstream workflow's command.
- [ ] AC-019 `[auto]`: The workflow command states its scope and iteration source, for example "for each task in plan.md".

### US-004: Generate step files

**As a** developer
**I want to** each step to become the file its kind requires
**So that** Claude Code finds commands, agents, skills and scripts where it expects them

**Requirements:** S3, S4

#### Acceptance Criteria

- [ ] AC-020 `[auto]`: An enabled command step writes `.claude/commands/<id>.md`; an agent step writes `.claude/agents/<id>.md`; a skill step writes `.claude/skills/<id>/SKILL.md`; a script step writes `scripts/<id>.sh`. No other paths are written for steps.
- [ ] AC-021 `[auto]`: A rule-set tag on a step lists the referenced files under `.claude/rules/` in that step's file. A referenced rule file that is not in the templates makes generation throw an error naming the step and the rule.
- [ ] AC-022 `[auto]`: A step used in two workflows yields one file, not two.
- [ ] AC-023 `[auto]`: An enabled step whose template is missing from the `TemplateSource` makes generation throw an error naming the step and the missing path.

### US-005: Render placeholders and conditional sections

**As a** template author
**I want to** use placeholders and step-conditional sections in templates
**So that** generated files carry the project's own values and only the sections for enabled steps

**Requirements:** S3

#### Acceptance Criteria

- [ ] AC-024 `[auto]`: The project placeholders in `templates/README.md` (`projectName`, `idea`, `stack.language`, `stack.framework`, `stack.testFramework`, `modules`, `codeRules`, `testRules`) are replaced with their values. A placeholder with no value, in a template that uses it, makes generation throw an error naming the template and the placeholder.
- [ ] AC-025 `[auto]`: `{{#step:<id>}}…{{/step:<id>}}` keeps its content when the step is enabled and removes the content, markers included, when it is disabled or absent.
- [ ] AC-026 `[auto]`: An unknown placeholder, an unclosed or mismatched conditional marker, or a nested conditional makes generation throw an error naming the template path and the problem. No returned file contains a raw `{{` marker.
- [ ] AC-027 `[auto]`: A value that itself contains `{{` text is inserted literally and is not rendered again.

### US-006: Describe the process in process.md

**As a** developer or a client reader
**I want to** the generated `process.md` to show the process as a diagram
**So that** the process renders on the hosting site without the builder

**Requirements:** S3, S5

#### Acceptance Criteria

- [ ] AC-028 `[auto]`: `spec/documents/process.md` contains a Mermaid flowchart of the enabled map. Each enabled workflow is a node; each map connection is an edge labelled with its artifact, if any.
- [ ] AC-029 `[auto]`: The flowchart shows each enabled gate as a decision node and each branch as a labelled edge, including its round limit or "no limit set".
- [ ] AC-030 `[auto]`: Node ids in the Mermaid text are made from the workflow and step ids with only letters, digits and underscores. Every edge refers to a declared node.

### US-007: Produce a deterministic file list

**As a** developer who versions the generated framework
**I want to** get byte-identical output for the same input
**So that** regenerating a project produces no spurious diffs

**Requirements:** S4, S5

#### Acceptance Criteria

- [ ] AC-031 `[auto]`: Generating the same config twice gives identical file lists, paths and content, byte for byte.
- [ ] AC-032 `[auto]`: The file list is sorted by path. Paths are relative, use forward slashes, have no leading slash and no `..` segment, and appear at most once. Two outputs with the same path make generation throw an error.
- [ ] AC-033 `[auto]`: Content is UTF-8 with LF line endings, ends with exactly one newline, and contains no timestamps, random ids or machine-specific values.

### US-008: Keep the core pure

**As a** maintainer
**I want to** be sure the generator does no I/O
**So that** it runs the same in the API, in tests and later in the browser

**Requirements:** S1

#### Acceptance Criteria

- [ ] AC-034 `[auto]`: `packages/core/src` imports nothing from `node:*`, `fs`, `http`, `process` or any LLM SDK. A test scans the source and fails on a match.

---

## Requirement Coverage

| Scope item | Covered by |
|---|---|
| S1 — pure `generate(config, templates)`; refuses what it cannot generate | AC-001 to AC-011, AC-034 |
| S2 — select enabled workflows and steps and order them | AC-012, AC-013, AC-014 |
| S3 — render base files, workflow commands, step files, gates, branches, placeholders, Mermaid view | AC-015 to AC-030 |
| S4 — return a file list | AC-020, AC-022, AC-023, AC-032 |
| S5 — deterministic output | AC-031, AC-032, AC-033 |
