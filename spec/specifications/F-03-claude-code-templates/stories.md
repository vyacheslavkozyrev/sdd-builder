# User Stories — Claude Code templates (F-03)

Feature entry: `spec/documents/features.md` → F-03
Requirements owned by this feature: R-01 to R-08 (listed in the Requirement Coverage table)

## Out of Scope

- The Mermaid view of the process in `process.md`, and the process diagrams. Owned by F-18 (`architecture.md` §10; F-02 decision). The `features.md` F-03 line that says "with the Mermaid view" is corrected in this feature's build.
- The model call, the one retry, the zip, the HTTP route and the LLM-written final content of command, agent and rule files. Owned by F-07. F-03 supplies the layouts and the checks around the reply, not the reply.
- Rebuilding the web app on the pipeline model (F-05, F-06). The flat model and catalog that the web app imports (`model.ts`, `catalog.ts`, `parse-config.ts`, `DEFAULT_WORKFLOWS`, `DEFAULT_STEP_CATALOG`, `DEFAULT_CONNECTIONS`, `getCatalogStep`) stay unchanged.
- A module list in `CLAUDE.md`. The brief has no module list (F-05, technical details step), so the `Modules` section of the base layout is removed.
- The generated-project self-check that every path a command names exists (F-10).
- Spec Kit and OpenSpec outputs (F-16, F-17), Cursor and Copilot (F-11, F-12), presets (F-09).
- Authoring the rules list in the wizard (F-05).
- Removing the flat layouts (`source/templates/steps/`, `workflows/`, `rules/`), the flat renderers (`render/step-files.ts`, `render/workflow-command.ts`), the flat generator (`src/generate.ts`) and the flat root exports `planGeneration`, `checkReply` and `validateConfig`. The API's generate service (`source/apps/api/src/generate/`) still runs on them, so the removal belongs to F-07, which rebuilds the API (decision 19).

---

## Decisions taken in this specification (the user is asked to approve them)

- **Mermaid (user, 2026-11-14):** the Mermaid view is F-18. F-03 writes `process.md` as text only.
- **Flat code stays until F-07 (user, 2026-11-14, amending the first draft):** the flat layouts, renderers, generator and root exports are not removed in F-03. `apps/api/src/generate/service.ts` imports the root `planGeneration`, `checkReply` and `validateConfig`, and the flat generator reads `steps/` and `workflows/`; removing them now would break `/generate`. Decision 19 stands: F-07 removes them. F-03 adds the pipeline `planGeneration` and `checkReply` beside the flat ones, in the pipeline module. No new decision is needed for this.
- **Rules are project data (decision 20):** one rule file per entry of `ProjectConfig.rules`, not per block. `features.md` says "one rule file per rule block"; that line is read as per rule entry and corrected in this feature's build.
- **Layout location:** the four Claude Code layouts (`command`, `pipeline-command`, `agent`, `rule`) live in `source/templates/claude-code/`. The base layouts stay in `source/templates/base/` and are rewritten in place.
- **`planGeneration` layout:** each planned entry's `layout` is the file's layout with the config values filled. The sections that need the model's wording stay as the layout's own prose, which the model writes at F-07. No stub text is planned.
- **Layout placeholders:** only the placeholders listed in `source/templates/README.md` may appear in a layout. A new one needs a row in that table first.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-03 AC-003`).

This feature has no user interface, so no UX screens are needed (`➖ Not needed`). Every criterion is `[auto]`: the feature is templates and pure functions in `source/packages/core`.

### US-001: Base files come from layouts that describe sections, not content

**As a** developer
**I want to** have the base files of a generated project come from layouts that list their sections
**So that** the model writes each file from its layout, and no brief-specific placeholder is left unfilled.

**Requirements:** R-01

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The layouts `base/CLAUDE.md`, `base/process.md` and the three `base/spec-template/` files exist under `source/templates/`. None contains `{{modules}}`, `{{codeRules}}`, `{{testRules}}` or `{{process.diagram}}`, and every placeholder in them is one listed in `source/templates/README.md`.
- [ ] AC-002 `[auto]`: The rendered `CLAUDE.md` plan entry names every enabled flow command and every rule file path of the config, and contains no module list. A config with a disabled flow does not name that flow's command (negative case).
- [ ] AC-003 `[auto]`: The rendered `process.md` plan entry lists the enabled flows, blocks and gates in pipeline order as text, and contains no Mermaid fence (no line opening with three backticks followed by `mermaid`).

---

### US-002: Command files list the flow they run, in order

**As a** developer
**I want to** have the pipeline command and each child flow's command file list their steps, gates and round limits
**So that** the model writes each command file from its exact order and routes.

**Requirements:** R-02

#### Acceptance Criteria

- [ ] AC-004 `[auto]`: The pipeline command plan entry (`.claude/commands/pipeline.md`) lists the arguments first, then the enabled child flows and the gates and checks between them, in pipeline order, as numbered steps.
- [ ] AC-005 `[auto]`: Each enabled child flow has one command plan entry at `.claude/commands/<flow-id>.md` that lists its enabled blocks in block order. A disabled block of an enabled flow is not listed (negative case).
- [ ] AC-006 `[auto]`: A back route is a numbered rule that names its target block and round limit. A route with no limit says `no limit set`. A check with no back route on an outcome writes no rule for that outcome.
- [ ] AC-007 `[auto]`: A disabled child flow has no command plan entry, and the pipeline command does not name it (negative case).

---

### US-003: Agent and rule files come from their blocks and entries

**As a** developer
**I want to** have one plan entry per enabled Agent block and one per rule entry
**So that** each agent and rule file is planned with its description and rule-set tags.

**Requirements:** R-03

#### Acceptance Criteria

- [ ] AC-008 `[auto]`: Each enabled Agent block in an enabled flow has one plan entry at `.claude/agents/<name>.md`, carrying the block's description and its rule-set tags. An Agent block in a disabled flow, or a disabled Agent block, has no entry (negative case).
- [ ] AC-009 `[auto]`: Each entry of `ProjectConfig.rules` has one plan entry at `.claude/rules/<id>.md`, whose layout carries the rule's title and text. A config with no rules has no rule entry.
- [ ] AC-010 `[auto]`: The agent layout's required `##` headings are `Purpose`, `Inputs`, `Outputs`, `Rules` and `Checks`. A reply whose agent file lacks one of them is refused by `checkReply` (see AC-020).

---

### US-004: `planGeneration` gives the model one entry per output file

**As a** developer
**I want to** have `planGeneration(config, templates)` return one entry per output file, on the pipeline model
**So that** the model call (F-07) has one input that the structure of the output decides.

**Requirements:** R-04

#### Acceptance Criteria

- [ ] AC-011 `[auto]`: `planGeneration` returns one entry per output file, in the order of the file list. Calling it twice with the same config gives the same paths in the same order.
- [ ] AC-012 `[auto]`: Each entry carries its `path`, its `layout`, its `description` and its `ruleTags`. An agent entry and a flow command entry carry their block's description and rule-set tags (Amendment 2026-11-14, US-008). Every other entry has empty `description` and `ruleTags`.
- [ ] AC-013 `[auto]`: A configuration that the pipeline's structural rules refuse (for example, a flow with no Start block) throws `InvalidConfigError` listing every problem, and returns no plan.
- [ ] AC-014 `[auto]`: A layout missing from the `TemplateSource` throws `GenerationError` naming each missing layout path together. No partial plan is returned.
- [ ] AC-015 `[auto]`: `planGeneration` does not change the config it receives. The test passes a deeply frozen config and expects no error.

---

### US-005: `checkReply` refuses a reply that does not match its plan

**As a** developer
**I want to** have `checkReply(plan, reply)` return findings for every way a model reply can fail its plan
**So that** the API (F-07) can retry once with the findings, and no bad file reaches the zip.

**Requirements:** R-05

#### Acceptance Criteria

- [ ] AC-016 `[auto]`: A reply that maps every planned path to text, and no other path, returns no findings.
- [ ] AC-017 `[auto]`: A planned path missing from the reply gives one finding that names the path.
- [ ] AC-018 `[auto]`: A path not in the plan gives one finding that names it. Table-driven: an absolute path, a path with `..`, and a path with a backslash each give a finding that names the path and says it is unsafe.
- [ ] AC-019 `[auto]`: Text containing `{{`, `}}`, or a `#enabled:` or `/enabled:` marker gives one finding that names the path.
- [ ] AC-020 `[auto]`: Text that lacks a required `##` heading of its layout gives one finding that names the heading and the path.
- [ ] AC-021 `[auto]`: Text that mentions `SDDBuilder`, `source/apps/web`, `source/apps/api` or `source/packages/core` gives one finding that names the path.
- [ ] AC-022 `[auto]`: A reply that is not an object, or that maps a path to a value that is not a string, returns findings and does not throw.
- [ ] AC-023 `[auto]`: Findings are sorted by path and then by message. The same reply against the same plan gives the same findings in the same order.

---

### US-006: Layouts are stack-neutral and carry no scripts

**As a** developer
**I want to** have every layout free of scripts and stack-specific tool names
**So that** a check's command is written from the brief's stack, and the templates stay data.

**Requirements:** R-06

#### Acceptance Criteria

- [ ] AC-024 `[auto]`: No layout under `source/templates/base/` or `source/templates/claude-code/` contains a fenced block opened with `sh`, `bash`, `shell` or `zsh`, or the name of a stack tool (`npm`, `npx`, `pnpm`, `yarn`, `vitest`, `jest`, `pytest`, `cargo`, `go test`). The test is table-driven over every layout file, and each name is listed in the test.
- [ ] AC-025 `[auto]`: Every placeholder in every layout under `source/templates/base/` or `source/templates/claude-code/` is one that `source/templates/README.md` lists. A placeholder outside the list fails the test and names the file. The flat folders are not checked; they are removed by F-07.

---

### US-007: The pipeline's generator path is separate from the flat one

**As a** developer
**I want to** have the pipeline's `planGeneration` and `checkReply` live in the pipeline module, reading only the new layouts
**So that** the new path is ready for F-07 and the flat path, which the API still uses, keeps working unchanged until F-07 removes it.

**Requirements:** R-07

#### Acceptance Criteria

- [ ] AC-026 `[auto]`: The pipeline module (`source/packages/core/src/pipeline/index.ts`) exports `planGeneration` and `checkReply`. The root package still exports the flat `planGeneration`, `checkReply` and `validateConfig`, with unchanged behaviour: the existing flat tests pass without edits.
- [ ] AC-027 `[auto]`: No module under `source/packages/core/src/pipeline/` imports `render/step-files`, `render/workflow-command`, `generate.ts` or `plan.ts`, and none reads a path under `steps/`, `workflows/` or `rules/`. A test scans the imports and the path strings of the pipeline folder.
- [ ] AC-028 `[auto]`: The API's generate tests (`source/apps/api/test/generate-*.test.ts`, `generation-model.test.ts`) and the web app's test suite pass without edits, and the flat model and catalog (`DEFAULT_WORKFLOWS`, `DEFAULT_STEP_CATALOG`, `DEFAULT_CONNECTIONS`, `getCatalogStep`) are still exported from `@sddbuilder/core`.

---

### US-008: Agent blocks and flows carry rule-set tags

**As a** developer
**I want to** tag each Agent block and each flow with the rule files it relates to
**So that** the agent and flow command files name the rules they must follow, and an unknown rule is refused.

**Requirements:** R-08

#### Acceptance Criteria

- [ ] AC-029 `[auto]`: A `ruleTags` list on an Agent block or a flow holds rule ids. A tag that names no entry of `ProjectConfig.rules` is refused at the tag's path, with every such tag listed. A tag that is not a non-empty string is refused by the parser.
- [ ] AC-030 `[auto]`: A block or flow with no `ruleTags` key parses with an empty list. The default pipeline parses without problems, with empty tags.
- [ ] AC-031 `[auto]`: The flow command entry of an enabled flow carries the flow's description and rule-set tags. A flow with no tags has empty `ruleTags`, and a disabled flow has no entry (AC-007 unchanged).

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| R-01 Base layouts: CLAUDE.md, process.md and the spec template, as section layouts | AC-001, AC-002, AC-003 |
| R-02 Command layouts: the pipeline command and one command per enabled child flow | AC-004, AC-005, AC-006, AC-007 |
| R-03 Agent and rule layouts: one entry per enabled Agent block and per rule entry | AC-008, AC-009, AC-010 |
| R-04 `planGeneration` on the pipeline model: one entry per output file, deterministic, pure | AC-011, AC-012, AC-013, AC-014, AC-015 |
| R-05 `checkReply`: the reply is checked against its plan, findings only | AC-016, AC-017, AC-018, AC-019, AC-020, AC-021, AC-022, AC-023 |
| R-06 Stack-neutral layouts, no scripts, placeholders from the README list | AC-024, AC-025 |
| R-07 Pipeline generator path separate from the flat one; flat code and API unchanged until F-07 | AC-026, AC-027, AC-028 |
| R-08 Rule-set tags on Agent blocks and flows: rule ids, refused when unknown; carried into the agent and flow entries | AC-029, AC-030, AC-031 |
