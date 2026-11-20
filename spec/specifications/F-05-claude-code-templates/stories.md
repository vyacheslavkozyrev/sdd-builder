# User Stories — Claude Code templates (F-05)

Feature entry: `spec/documents/features.md` → F-05
Requirements owned by this feature: the F-05 scope item in `features.md` (the pipeline command, one command per flow, agent files with frontmatter and body, rule files, the base files of the layout, and `process.md` with a Mermaid diagram); `architecture.md` §3 (step 3), §6 decisions 7, 17, 18, 20, 26, 27, 28, 34, 36, 38, 39, 40 and 41, §10 (process diagrams); `spec/documents/pipeline-schema.md` (the pipeline shape: flows, blocks, artifacts, approval, next links and routes); `source/templates/README.md` (placeholders and the Claude Code layout)

This feature is the text of the templates. The generator core (F-04) fills the placeholders and fixes the file list; F-05 writes the layouts under `source/templates/base/` and `source/templates/claude-code/`, and the tests that prove the output of the default pipeline. Templates are data: a change to a layout changes what users download, so each layout criterion is tested against the default pipeline config (`source/templates/pipeline/default.json`) and against a small fixture config.

The model writes the content of the agent bodies, the flow commands and the other files at generation (decisions 7 and 41, F-15). F-05 writes the structure and the fixed text around it, and tests the layouts with fixed values.

## Out of Scope

- The model call that writes the file content, `parseReply` and the retry (F-15). F-05 tests the layouts with fixed values, not with a model.
- The `/generate` route and the zip (F-15). F-05 renders the files in memory.
- Rule files written from rule blocks. Decision 20 makes rules a list in the project config, not blocks; the list is filled by the technical details step (F-10).
- Enabled sections (`#enabled:<id>` … `/enabled:<id>`). Decision 34 removes the enabled property, so no layout needs them.
- Condition routes drawn as decision nodes in the diagram. The diagram shows the flows only (decision 36 and the owner's choice of 2026-11-19); the conditions and retry routes are written as text in `process.md` and in each flow command.
- The interactive diagram on the Pipeline tab (the builder's view, `architecture.md` §10, F-11 and F-23). F-05 writes the diagram into `process.md` only.
- The project name, the idea and the stack in the base files. Decision 37 makes them optional brief fields; the layouts that show them follow with F-09 (name and idea) and F-10 (stack).
- Output for Cursor and Copilot (F-19, F-20), and for GitHub Spec Kit and OpenSpec (`architecture.md` §8).
- Import and export of the pipeline as JSON (F-18).
- Changes to the generator core (F-04) beyond a placeholder that a layout needs and the core does not fill yet; any such change is named in the plan.

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-05 AC-003`).

### US-001: The pipeline command runs the flows in order

**As a** developer who downloads the framework
**I want to** get a pipeline command that lists the flows of the pipeline in order, with an approval stop where a flow asks for one
**So that** Claude Code runs the whole process for a feature from one command and waits for me where the process says so

**Requirements:** F-05 scope (the pipeline command); `pipeline-schema.md` §1 and §4 (the pipeline is an ordered list of flows; approval is a flag of the flow); decision 38 (a flow is one object, linear pipeline)

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The pipeline command is written to `.claude/commands/pipeline.md`, and its arguments are the pipeline's arguments, each with its id, its required flag and its hint.
- [ ] AC-002 `[auto]`: The command lists every flow of the pipeline as a numbered step, in the order of the `next` links from the first flow, and names each flow by its id.
- [ ] AC-003 `[auto]`: A flow with approval on adds a step after it that stops the run and waits for the person's approval; a flow with approval off adds no such step.
- [ ] AC-004 `[auto]`: A pipeline with one flow writes one flow step, no approval step if approval is off, and does not fail.
- [ ] AC-005 `[auto]`: The pipeline command writes its model and tools in the frontmatter only when they are set (as AC-018 and AC-019 do for agents), and its body under Purpose only when it has one.

### US-002: Each flow has its own command

**As a** developer who downloads the framework
**I want to** get one command file per flow, with its arguments, its artifacts and its steps in run order
**So that** each phase of the process can be run on its own, as the pipeline command runs it

**Requirements:** F-05 scope (one command per flow); `pipeline-schema.md` §1 and §4 (blocks, routes, artifacts and End's `producedArtifact`); decision 40 (a failed check stops the flow and asks the user, or returns to an earlier agent with a round limit)

#### Acceptance Criteria

- [ ] AC-006 `[auto]`: Each flow is written to `.claude/commands/<flow-id>.md`, with its name as the title, its description under Purpose and its body as a Context section, with the line breaks of the body kept.
- [ ] AC-007 `[auto]`: The rule tags of a flow are written as one comma-separated list in their order, and `none` when the flow has none.
- [ ] AC-008 `[auto]`: Each argument of the flow is written on its own line with its id, whether it is required, and its hint; a flow with no arguments writes `No arguments`.
- [ ] AC-009 `[auto]`: Each artifact of the flow is written with its label and its template text; a flow with no artifacts writes `No artifacts`.
- [ ] AC-010 `[auto]`: The steps follow the route from the Start block to the End block: one numbered step for each block on the route, Start first and End last, with no block written twice.
- [ ] AC-011 `[auto]`: An Agent step names the agent file `.claude/agents/<name>.md` and gives the agent's description.
- [ ] AC-012 `[auto]`: A Condition step gives its description as the check to pass, names its true route as the next step, and names its false route: `stop and ask the person what to do` when the false route stops the flow.
- [ ] AC-013 `[auto]`: A Condition whose false route returns to an earlier Agent writes a numbered rule that names that agent and the round limit (1 to 5), as a retry.
- [ ] AC-014 `[auto]`: The End step names the flow's `producedArtifact` when it has one, and writes no artifact line when it has none.
- [ ] AC-015 `[auto]`: A flow with only its Start and End blocks writes those two steps and no rule, and does not fail.

### US-003: Each agent has a file with frontmatter and a body

**As a** developer who downloads the framework
**I want to** get one agent file per Agent block, with the frontmatter Claude Code reads and the artifacts the agent reads and writes
**So that** Claude Code can run each agent with the model and tools the block sets, on the artifacts it names

**Requirements:** F-05 scope (agent files with frontmatter and body); decision 26 (model, tools and body on Agent blocks); decision 27 (reads and writes); decision 18 (agent names are unique and file-safe)

#### Acceptance Criteria

- [ ] AC-016 `[auto]`: Each Agent block of the pipeline is written to `.claude/agents/<name>.md`, where `<name>` is the block's name; an agent name is written once, as names are unique in the pipeline.
- [ ] AC-017 `[auto]`: The frontmatter holds `name` and `description` (the description as a quoted YAML string), and the agent file's Purpose section repeats the description.
- [ ] AC-018 `[auto]`: The frontmatter holds `model` only when the block sets one, and the value is written as given (`haiku`, `sonnet`, `opus` or `inherit`). A block with no model has no `model` key, not an empty one.
- [ ] AC-019 `[auto]`: The frontmatter holds `tools` only when the block lists tools, written as one comma-separated list in the block's order and quoted when YAML would break. A block with no tools has no `tools` key.
- [ ] AC-020 `[auto]`: The body is written under an Instructions heading when the block has body text; a block with no body or a blank body has no Instructions section.
- [ ] AC-021 `[auto]`: The Reads and Writes sections list the block's artifact labels, one per line in their order; a section is left out when its list is empty.
- [ ] AC-022 `[auto]`: The rule tags of the block are written as a comma-separated list, and `none` when the block has no tags.
- [ ] AC-023 `[auto]`: A body text that contains a `{{...}}` placeholder is written as typed; the placeholder is not filled a second time.

### US-004: Each rule has a file

**As a** developer who downloads the framework
**I want to** get one file per project rule, with the rule's title and text
**So that** the agents can read the rules that apply to them by file name

**Requirements:** F-05 scope (rule files); decision 20 (one rule file per rule)

#### Acceptance Criteria

- [ ] AC-024 `[auto]`: Each entry of the rules list is written to `.claude/rules/<id>.md`, with its title as the heading and its text as the body, and the line breaks of the text kept as given.
- [ ] AC-025 `[auto]`: A configuration with an empty rules list writes no file under `.claude/rules/`, and does not fail.

### US-005: The base files describe the project

**As a** developer who downloads the framework
**I want to** get the project instructions, the process text and the spec template, filled from my pipeline
**So that** Claude Code starts from a project file that names the flows, agents and rules I have

**Requirements:** F-05 scope (the base files of the layout); `architecture.md` §3 step 3; `source/templates/README.md` (placeholders); decision 5 (generated projects follow the reference layout)

#### Acceptance Criteria

- [ ] AC-026 `[auto]`: `CLAUDE.md`, `spec/documents/process.md` and the three files of `spec/specifications/F-00-template/` are written from their layouts, each filled only from the values the pipeline config gives.
- [ ] AC-027 `[auto]`: `CLAUDE.md` lists the command files, the agent files and the rule files of the configuration, each from the same list the generator builds for the output.
- [ ] AC-028 `[auto]`: The spec template files keep the exact level-2 headings that the reply check of F-04 requires for their document type (for `stories.md`: Out of Scope, Stories and Requirement Coverage).
- [ ] AC-029 `[auto]`: `process.md` lists each flow once, in order, with its name, its description, whether it asks for approval, and its conditions and retry routes as text.

### US-006: process.md shows the flows as a diagram

**As a** developer who reads the framework on a hosting site
**I want to** see the flows of the process as a diagram in `process.md`
**So that** the process renders as a picture and matches the configuration it was made from

**Requirements:** F-05 scope (process.md with a Mermaid diagram); `architecture.md` §10 (Mermaid flowchart of the generated `process.md`); decision 36 (one node per flow; approval marks)

#### Acceptance Criteria

- [ ] AC-030 `[auto]`: `process.md` holds one fenced block marked `mermaid` whose first line is `flowchart`.
- [ ] AC-031 `[auto]`: The diagram has one node per flow, in the order of the `next` links from the first flow, with node ids `F1`, `F2` and so on, and each node is labelled with the flow's name.
- [ ] AC-032 `[auto]`: Each flow with a `next` link has one unlabelled edge to the flow it names; the last flow, which has no `next`, gets no edge.
- [ ] AC-033 `[auto]`: A flow with approval on has its node label end with the word `approval`; a flow with approval off has no such word in its label.
- [ ] AC-034 `[auto]`: A quote, bracket, brace, pipe or hash in a flow name is escaped to an entity code so the diagram parses, and a line break in a name is written as a space; a test with such a name shows the escaped form.
- [ ] AC-035 `[auto]`: The same configuration gives the same diagram text, byte for byte, on two calls.

### US-007: The output is deterministic and self-contained

**As a** developer who relies on the framework
**I want to** get the same files from the same configuration, with no reference to SDDBuilder
**So that** a downloaded project works on its own and a template change is visible in tests

**Requirements:** F-05 scope (generated projects do not refer to SDDBuilder's own files); F-04 (deterministic file list, paths and order); `source/templates/README.md` (no unfilled placeholder)

#### Acceptance Criteria

- [ ] AC-036 `[auto]`: Generating the default pipeline config twice gives the same file list, the same paths and the same text.
- [ ] AC-037 `[auto]`: No output file of the default pipeline mentions SDDBuilder, `source/apps`, `source/packages`, `source/templates` or any other path of this repository.
- [ ] AC-038 `[auto]`: Every placeholder that a layout under `source/templates/` uses is one the generator fills. A test that reads the layouts fails on a placeholder that no value is given for.
- [ ] AC-039 `[auto]`: No output file of the default pipeline has a `{{` placeholder, a `#enabled` section marker or a `#step:` marker left in its text.
- [ ] AC-040 `[auto]`: The default pipeline config (`source/templates/pipeline/default.json`) renders through every layout with no error, and the paths it plans are the files of the Claude Code layout table in `source/templates/README.md`.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| Pipeline command (F-05 scope) | AC-001, AC-002, AC-003, AC-004, AC-005 |
| One command per flow (F-05 scope) | AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014, AC-015 |
| Agent files with frontmatter and body (F-05 scope; decisions 26 and 27) | AC-016, AC-017, AC-018, AC-019, AC-020, AC-021, AC-022, AC-023 |
| Rule files (F-05 scope; decision 20) | AC-024, AC-025 |
| Base files of the layout (F-05 scope) | AC-026, AC-027, AC-028, AC-029 |
| process.md with a Mermaid diagram (F-05 scope; §10) | AC-030, AC-031, AC-032, AC-033, AC-034, AC-035 |
| Self-contained, deterministic output (F-05 scope) | AC-036, AC-037, AC-038, AC-039, AC-040 |
