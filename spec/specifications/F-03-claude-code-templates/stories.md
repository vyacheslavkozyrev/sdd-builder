# User Stories — Claude Code templates (F-03)

Feature entry: `spec/documents/features.md` → F-03
Requirements owned by this feature: none (SDDBuilder has no requirement IDs; scope items S1–S7 are listed in the Requirement Coverage table)
Depends on: F-02 (generator core: selection, validation, placeholders, step files, file list)
Reads: `spec/documents/architecture.md` §3 and §6 (decision 7), `spec/documents/building-blocks.md`, `templates/README.md`, the reference projects `../ComEd` and `../PhotoSync` (`.claude/` and `spec/`)

## Scope (from features.md)

- S1: base layouts: `CLAUDE.md`, `process.md` (with the Mermaid view), and the spec template.
- S2: the workflow command layout, filled once per workflow.
- S3: step layouts for every catalog step id, by kind: command, agent, skill, script.
- S4: rule-file layouts: general, qa and code.
- S5: the generation input: for each file the generator plans, its layout, its block description and its rule tags.
- S6: the reply check: the model's files are checked against the plan before they reach the zip.
- S7: `templates/README.md` matches the files that exist.

## Design decisions in this spec

These are the defaults chosen in the specify step. Each one is covered by an acceptance criterion; changing one means changing its criteria.

- **A layout gives structure, never content.** A layout is Markdown with section headings, short field prompts and the placeholders listed in `templates/README.md`. It names no language, framework, test runner, package manager or shell command. The LLM writes the content at generation from the layout and the block description (architecture §6, decision 7).
- **Templates are never scripts.** No file under `templates/` is a script or has a shebang. A script step has a `script.md` layout that lists what the script must check and its inputs; the LLM writes `scripts/<name>.sh` at generation.
- **Banned words in layouts.** Layouts and rule layouts must not contain any of: `Swift`, `TypeScript`, `JavaScript`, `Python`, `Go`, `Java`, `Kotlin`, `Rust`, `C#`, `Node`, `npm`, `pnpm`, `yarn`, `Vitest`, `Jest`, `pytest`, `xcodebuild`, `Xcode`, `Vite`, `React`, `Fastify`, `Hono`, `task-check.sh`. A test scans every file under `templates/`. The list is a fixed constant in the test.
- **Rule tag is stack-neutral.** The catalog tag `typescript.md` on the Implement and Code review steps becomes `code.md`. The tag names a layout, not a stack. This changes F-02 data (`packages/core/src/catalog.ts`) and the F-02 tests that use `typescript.md` (AC-029 below). It needs approval, and the change is part of the plan.
- **Reference content, both projects.** Sections are the union of ComEd and PhotoSync layouts that apply to any stack. The catalog fixes the step ids, so ComEd's `release` and PhotoSync's device-only checks and `ux-review` are not separate steps in the MVP. A custom step (F-14) can add them.
- **Core checks replies; it does not call the model.** The reply check (S6) and the input builder (S5) are pure functions in `packages/core`. They return findings and never throw on model output, which is a boundary.

## Out of scope

- The model call (`apps/api`), the retry rule (one retry with the model's own failures, then refuse with the problems), and the response shape. These belong to F-07. F-03 supplies the input and the check they use.
- The generation model setting `SDDBUILDER_GENERATOR_MODEL` (F-07; cost limits in F-13).
- Stack-specific rule content, check commands and scripts. The LLM writes these from the brief at generation.
- PhotoSync's device-only checks and the `ux-review` agent as built-in steps (see Design decisions).
- Cursor and Copilot layouts (post-MVP).
- A browser or end-to-end test. Tests are unit and generator tests in `packages/core/test/`.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-03 AC-003`).

### US-001: Base layouts for every project

**As a** developer who generates a project
**I want to** receive a `CLAUDE.md`, a `process.md` and a spec template laid out for my process
**So that** the project starts with the same working files as the reference projects

**Requirements:** none (S1)

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: `templates/base/` contains `CLAUDE.md`, `process.md`, and `spec-template/` with `stories.md`, `plan.md` and `progress.md`. Each file is non-empty Markdown.
- [ ] AC-002 `[auto]`: the base `CLAUDE.md` layout has the sections Overview, Layout, Working rules, Commands and agents, and Rules, in that order.
- [ ] AC-003 `[auto]`: the `process.md` layout has a section headed "Process diagram", where F-02 writes the Mermaid flowchart (F-02 AC-028).
- [ ] AC-004 `[auto]`: each `spec-template/` file is byte-identical to the matching file in `spec/specifications/F-00-template/`.

### US-002: Workflow command layout

**As a** developer who generates a project
**I want to** receive one command per workflow, with its steps in order and its rules written out
**So that** each workflow runs the same way every time

**Requirements:** none (S2)

#### Acceptance Criteria

- [ ] AC-005 `[auto]`: `templates/workflows/` contains one layout with the sections Purpose, Steps, Rules and Scope.
- [ ] AC-006 `[auto]`: the layout uses only the workflow placeholders of `templates/README.md` (`workflow.name`, `workflow.id`, `workflow.scope`, `workflow.steps`, `workflow.rules`). A test lists every `{{…}}` name in the layout and fails on any other name.
- [ ] AC-007 `[auto]`: the layout contains no step id from the catalog as fixed text. Steps appear only through `{{workflow.steps}}`.

### US-003: Step layouts for every catalog step

**As a** developer who generates a project
**I want to** each enabled step to have a layout of its own, by kind
**So that** the LLM knows what each command, agent, skill or script must contain

**Requirements:** none (S3)

#### Acceptance Criteria

- [ ] AC-008 `[auto]`: for every step id in the catalog there is a folder `templates/steps/<id>/` with exactly one layout for its kind: `command.md` (command), `agent.md` (agent), `skill.md` (skill) or `script.md` (script).
- [ ] AC-009 `[auto]`: every step layout has the sections Purpose, Inputs, Outputs, Rules and Checks. A `script.md` layout's Checks section names what the script verifies and contains no command.
- [ ] AC-010 `[auto]`: `command.md` and `skill.md` layouts have a frontmatter block with `description`; `agent.md` has a frontmatter block with `name`, `description` and `tools`. A test parses each frontmatter block.
- [ ] AC-011 `[auto]`: no file under `templates/` has a name ending in `.sh`, `.ps1`, `.bat`, `.py`, `.js` or `.ts`, and no file begins with a shebang line (`#!`).
- [ ] AC-012 `[auto]`: no file under `templates/` contains a word from the banned list in Design decisions. The test reports the file and the word.

### US-004: Rule-file layouts

**As a** developer who generates a project
**I want to** rule files whose sections are fixed and whose content comes from my brief
**So that** the rules fit my stack without the templates assuming one

**Requirements:** none (S4)

#### Acceptance Criteria

- [ ] AC-013 `[auto]`: `templates/rules/` contains `general.md`, `qa.md` and `code.md`. `general.md` has the sections Scope, Code, Architecture and Documentation; `qa.md` has the sections Tests travel with the code, Where tests live, Naming criteria and What to test; `code.md` has the sections Naming, Structure, Examples and Errors.
- [ ] AC-014 `[auto]`: the `code.md` layout has the placeholders `{{codeRules}}` and `{{testRules}}`. No rule layout contains a code sample.
- [ ] AC-015 `[auto]`: the catalog tag `typescript.md` is replaced by `code.md` on the Implement and Code review steps. No catalog step carries the tag `typescript.md`.

### US-005: Generation input for each planned file

**As a** developer of the generator
**I want** core to give the LLM, for every file it plans, the layout, the block description and the rule tags
**So that** the model writes each file from the same inputs every time

**Requirements:** none (S5)

#### Acceptance Criteria

- [ ] AC-016 `[auto]`: `generationInput(config, templates)` returns one entry per planned file, with its path, layout text, block description and rule-set tags. The entries are in the order of the F-02 file list.
- [ ] AC-017 `[auto]`: the same config gives the same entries. A test builds the input twice and compares.
- [ ] AC-018 `[auto]`: a disabled step has no entry; a required step always has one (negative test on a config with an optional step disabled).
- [ ] AC-019 `[auto]`: a configuration refused by the structural rules throws `InvalidConfigError` and returns no entries (F-02 behaviour preserved).
- [ ] AC-020 `[auto]`: an enabled step with no layout in `templates/` makes the input fail with an error that names the step id (F-02 behaviour preserved).

### US-006: Check the model's reply against the plan

**As a** developer of the generator
**I want** every reply from the model checked against the planned files before it reaches the zip
**So that** a missing, extra or unfilled file never ships

**Requirements:** none (S6)

#### Acceptance Criteria

- [ ] AC-021 `[auto]`: a reply with exactly the planned files and no placeholder left returns no findings.
- [ ] AC-022 `[auto]`: a planned file missing from the reply is a finding that names its path. An extra file in the reply is a finding that names its path. Both are reported in one pass.
- [ ] AC-023 `[auto]`: a file that still contains `{{` or `}}`, or a `{{#step:` marker, is a finding that names the file and the leftover text.
- [ ] AC-024 `[auto]`: a file that lacks a section heading required by its layout is a finding that names the heading. Headings are compared exactly, after trimming.
- [ ] AC-025 `[auto]`: a file that mentions an SDDBuilder path (`apps/web`, `apps/api`, `packages/core`, `SDDBuilder`) is a finding. Generated projects are self-contained.
- [ ] AC-026 `[auto]`: a reply path that is unsafe (leading slash, `..`, or a backslash) is a finding and is never written to the zip. The F-02 path rule is reused.
- [ ] AC-027 `[auto]`: the check never throws. An empty reply, a reply that is not an object of strings, and a reply with a non-string value each return findings (negative tests). The input type is `unknown` and is narrowed.
- [ ] AC-028 `[auto]`: findings are sorted by file path, then by message. The same reply gives the same findings (a test runs the check twice).

### US-007: Templates README matches the files

**As a** maintainer of the templates
**I want** `templates/README.md` to list only files that exist
**So that** the layout table cannot drift from the templates

**Requirements:** none (S7)

#### Acceptance Criteria

- [ ] AC-029 `[auto]`: every source path in the Claude Code layout table of `templates/README.md` exists under `templates/`, or is a `scripts/` output produced from a `script.md` layout. A test checks each row.

---

## Requirement Coverage

| Scope item | Covered by |
|---|---|
| S1 — base layouts | AC-001, AC-002, AC-003, AC-004 |
| S2 — workflow command layout | AC-005, AC-006, AC-007 |
| S3 — step layouts by kind | AC-008, AC-009, AC-010, AC-011, AC-012, AC-015 |
| S4 — rule-file layouts | AC-013, AC-014, AC-015 |
| S5 — generation input | AC-016, AC-017, AC-018, AC-019, AC-020 |
| S6 — reply check | AC-021, AC-022, AC-023, AC-024, AC-025, AC-026, AC-027, AC-028 |
| S7 — templates README matches the files | AC-029 |
