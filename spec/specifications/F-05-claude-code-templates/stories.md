# User Stories — Claude Code templates (F-05)

Feature entry: `spec/documents/features.md` → F-05
Requirements owned by this feature: the F-05 scope item in `features.md` (the pipeline command, one command per flow, agent files with frontmatter and body, rule files, the base files of the layout, and `process.md` with a Mermaid diagram); `architecture.md` §3 (step 3, render base files), §6 decisions 20, 25, 26 and 34, §10 (the Mermaid view of the process), §11 (the default pipeline); `source/templates/README.md` (placeholders and the Claude Code layout)

This feature is the text of the templates. The generator core (F-04) fills the placeholders and fixes the file list; F-05 writes the layouts under `source/templates/base/` and `source/templates/claude-code/`, and the tests that prove the output of the default pipeline. Templates are data: a change to a layout changes what users download, so each layout criterion is tested against the default pipeline config (`source/templates/pipeline/default.json`) and against a small fixture config.

## Out of Scope

- The model call that writes the agent bodies and the text of the flow commands, `parseReply` and the retry (F-07). F-05 tests the layouts with fixed values, not with a model.
- The `/generate` route and the zip (F-15). F-05 renders the files in memory.
- Rule files written from rule blocks. Decision 20 makes rules a list in the project config, not blocks; the list is filled by the wizard (F-22).
- Enabled sections (`#enabled:<id>` … `/enabled:<id>`). Decision 34 removes the enabled property, so no layout needs them.
- The interactive Mermaid view on the Pipeline tab (the builder's diagram, `architecture.md` §10). F-05 writes the diagram into `process.md` only.
- The project name, the idea and the stack in the base files. The pipeline config (`schemaVersion` 2) has none of them yet; F-09 (name and idea) and F-21 (stack) add them, and their layouts follow then.
- Output for Cursor and Copilot (F-19, F-20), GitHub Spec Kit and OpenSpec (F-16, F-17).
- Import and export of the pipeline as JSON (F-18).
- Changes to the generator core (F-04) beyond a placeholder that a layout needs and the core does not fill yet; any such change is named in the plan.

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-05 AC-003`).

### US-001: The pipeline command runs the flows in order

**As a** developer who downloads the framework
**I want to** get a pipeline command that lists the flows of the pipeline in order
**So that** Claude Code runs the whole process for a feature from one command

**Requirements:** F-05 scope (the pipeline command); decision 14 and §11 (the pipeline is the top-level flow)

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The pipeline command is written to `.claude/commands/pipeline.md`, and its arguments are the pipeline's Start arguments, with the required flag shown for each.
- [ ] AC-002 `[auto]`: The command lists every flow and every check of the pipeline as a numbered step, in pipeline order.
- [ ] AC-003 `[auto]`: A back route of a check becomes a numbered rule that names its target block and its round limit; a back route with no round limit says `no limit set`.
- [ ] AC-004 `[auto]`: An outcome of a check with no back route writes no rule.
- [ ] AC-005 `[auto]`: A pipeline with one flow writes a command with one step and no error.

### US-002: Each flow has its own command

**As a** developer who downloads the framework
**I want to** get one command file per child flow, with its steps in block order
**So that** each phase of the process can be run on its own, as the pipeline command runs it

**Requirements:** F-05 scope (one command per flow); decision 14 (a flow contains blocks)

#### Acceptance Criteria

- [ ] AC-006 `[auto]`: Each child flow is written to `.claude/commands/<flow-id>.md`, with its name, its description and its rule tags.
- [ ] AC-007 `[auto]`: A flow with no rule tags shows `none` for them.
- [ ] AC-008 `[auto]`: The steps are the flow's blocks as numbered steps in block order: the Start block gives the arguments, the Agent, Approval and Check blocks give their work, and the End block gives the outcome (as F-04 renders them).
- [ ] AC-009 `[auto]`: A check's back routes become numbered rules in that flow's command, as AC-003 states them for the pipeline command.
- [ ] AC-010 `[auto]`: A flow with only its Start and End blocks writes those two steps and no route rule, and does not fail.

### US-003: Each agent has a file with frontmatter and a body

**As a** developer who downloads the framework
**I want to** get one agent file per Agent block, with the frontmatter Claude Code reads
**So that** Claude Code can run each agent with the model and tools the block sets

**Requirements:** F-05 scope (agent files with frontmatter and body); decision 26 (model, tools and body on Agent blocks)

#### Acceptance Criteria

- [ ] AC-011 `[auto]`: Each Agent block of a child flow is written to `.claude/agents/<name>.md`, where `<name>` is the block's name.
- [ ] AC-012 `[auto]`: The frontmatter holds `name` and `description`. The description is the block's description, and the agent file's Purpose section repeats it.
- [ ] AC-013 `[auto]`: The frontmatter holds `model` only when the block sets one, and the value is written as given (`haiku`, `sonnet`, `opus` or `inherit`). A block with no model has no `model` key, not an empty one.
- [ ] AC-014 `[auto]`: The frontmatter holds `tools` only when the block lists tools, written as one comma-separated list in the block's order. A block with no tools has no `tools` key.
- [ ] AC-015 `[auto]`: The body is the block's body text when it has one. A block with no body writes a body with the heading and the description and no empty section.
- [ ] AC-016 `[auto]`: The rule tags of the block are written as a comma-separated list, and `none` when the block has no tags.
- [ ] AC-017 `[auto]`: A body text that contains a `{{...}}` placeholder is written as typed; the placeholder is not filled a second time.

### US-004: Each rule has a file

**As a** developer who downloads the framework
**I want to** get one file per project rule, with the rule's title and text
**So that** the agents can read the rules that apply to them by file name

**Requirements:** F-05 scope (rule files); decision 20 (one rule file per rule)

#### Acceptance Criteria

- [ ] AC-018 `[auto]`: Each entry of the rules list is written to `.claude/rules/<id>.md`, with its title as the heading and its text as the body.
- [ ] AC-019 `[auto]`: A rule text is written as the user gave it, with its line breaks kept.
- [ ] AC-020 `[auto]`: A configuration with an empty rules list writes no file under `.claude/rules/`, and does not fail.

### US-005: The base files describe the project

**As a** developer who downloads the framework
**I want to** get the project instructions, the process text and the spec template, filled from my project
**So that** Claude Code starts from a project file that names my project, its flows, agents and rules

**Requirements:** F-05 scope (the base files of the layout); `architecture.md` §3 step 3; `source/templates/README.md` (placeholders)

#### Acceptance Criteria

- [ ] AC-021 `[auto]`: `CLAUDE.md`, `spec/documents/process.md` and the three files of `spec/specifications/F-00-template/` are written from their layouts, each filled only from the values the pipeline config gives.
- [ ] AC-022 `[auto]`: `CLAUDE.md` lists the command files, the agent files and the rule files of the configuration, each from the same list the generator builds for the output.
- [ ] AC-023 `[auto]`: No base layout holds a placeholder for the project name, the idea or the stack. The pipeline config has none of them yet (F-09 and F-21 add them), so a configuration generates with no error and the base files hold no empty line in their place.
- [ ] AC-024 `[auto]`: The spec template files keep the headings that the reply check of F-04 requires for their document type (for `stories.md`: Out of Scope, Stories and Requirement Coverage).
- [ ] AC-025 `[auto]`: `process.md` lists the flows, their blocks and the gates in pipeline order, as text.

### US-006: process.md shows the process as a diagram

**As a** developer who reads the framework on a hosting site
**I want to** see the process as a diagram in `process.md`
**So that** the process renders as a picture and matches the configuration it was made from

**Requirements:** F-05 scope (process.md with a Mermaid diagram); `architecture.md` §10 (use 3: the Mermaid flowchart in the generated `process.md`)

#### Acceptance Criteria

- [ ] AC-026 `[auto]`: `process.md` holds one fenced block marked `mermaid` whose first line is `flowchart`.
- [ ] AC-027 `[auto]`: The diagram has one node per child flow, in pipeline order. Each flow's edge goes to the flow its connection names (`connectedTo.to`), labelled with the connection's label. A flow with no connection gets an unlabelled edge to the next flow in pipeline order; the last flow with no connection gets none.
- [ ] AC-028 `[auto]`: A gate between two flows (an Approval or a Check) is drawn as a decision node, labelled with its kind and description, between the two flows; its edge to the next flow is labelled `pass`. The model gives a pipeline gate no fail route, so no fail edge is drawn.
- [ ] AC-029 `[auto]`: A flow name or a label that holds a double quote, a bracket or a pipe is escaped so the diagram parses; a test with such a name shows the escaped form.
- [ ] AC-030 `[auto]`: The same configuration gives the same diagram text, byte for byte.

### US-007: The output is deterministic and self-contained

**As a** developer who relies on the framework
**I want to** get the same files from the same configuration, with no reference to SDDBuilder
**So that** a downloaded project works on its own and a template change is visible in tests

**Requirements:** F-05 scope (generated projects do not refer to SDDBuilder's own files); decision 23 of F-04 (deterministic file list); `source/templates/README.md` (no unfilled placeholder)

#### Acceptance Criteria

- [ ] AC-031 `[auto]`: Generating the default pipeline config twice gives the same file list, the same paths and the same text.
- [ ] AC-032 `[auto]`: No output file of the default pipeline mentions SDDBuilder, `source/apps`, `source/packages`, `source/templates` or any other path of this repository.
- [ ] AC-033 `[auto]`: Every placeholder that a layout under `source/templates/` uses is one the generator fills. A test that reads the layouts fails on a placeholder that no value is given for.
- [ ] AC-034 `[auto]`: No output file of the default pipeline has a placeholder, a `#enabled` section marker or a step marker left in its text.
- [ ] AC-035 `[auto]`: The default pipeline config (`source/templates/pipeline/default.json`) renders through every layout with no error, and its output files are the files the generator plans for it, one per row of the Claude Code layout table in `source/templates/README.md`.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| Pipeline command (F-05 scope) | AC-001, AC-002, AC-003, AC-004, AC-005 |
| One command per flow (F-05 scope) | AC-006, AC-007, AC-008, AC-009, AC-010 |
| Agent files with frontmatter and body (F-05 scope; decision 26) | AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-017 |
| Rule files (F-05 scope; decision 20) | AC-018, AC-019, AC-020 |
| Base files of the layout (F-05 scope) | AC-021, AC-022, AC-023, AC-024, AC-025 |
| process.md with a Mermaid diagram (F-05 scope; §10) | AC-026, AC-027, AC-028, AC-029, AC-030 |
| Self-contained, deterministic output (F-05 scope) | AC-031, AC-032, AC-033, AC-034, AC-035 |
