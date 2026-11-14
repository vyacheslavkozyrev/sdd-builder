# User Stories — Project brief form (F-05)

Feature entry: `spec/documents/features.md` → F-05
Requirements owned by this feature: none yet (scope items of F-05 are mapped in the Requirement Coverage table)

## Out of Scope

- The visual builder: the global map, workflow tabs and editing workflows or steps (F-06). The form sends the default workflows and connections unchanged.
- Custom steps and configurable quality gates (F-14, F-15).
- Generate, the file tree preview and the zip download (F-07, F-06).
- Saving, importing or exporting a brief (F-08). Browser-local autosave (F-20).
- Presets (F-09).
- The platform field of `TechStack`. The wireframe does not show it and it is optional in the model.
- Structural checks and their wording. The analyzer (F-04) decides the findings; the form shows what `/analyze` returns.
- Browser (end-to-end) tests. Logic is tested in Vitest (`qa.md`).

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-05 AC-003`).

Decisions taken in this specification (the user is asked to approve them):

- The form has a **Project name** field. `ProjectConfig.name` is required by the model and by the analyzer, but wireframe `02-brief.svg` has no name field. The name sits at the top of section 1.
- **Analyze** is enabled only when the brief is valid *and* the privacy checkbox is ticked.
- The form's data is built into a `ProjectConfig` and checked with `parseProjectConfig` from `packages/core`.

### US-001: Describe the product idea

**As a** builder user
**I want to** name the project and describe the product idea in my own words
**So that** the review has the context it needs

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The idea is required. An empty idea, or one that is only whitespace, gives a problem at `idea` and disables Analyze.
- [ ] AC-002 `[auto]`: An idea of exactly 8,000 characters is accepted. One of 8,001 characters gives a problem at `idea` and disables Analyze.
- [ ] AC-003 `[auto]`: The idea counter reads `N / 8,000`, where N is the length counted the same way as the core limit in F-13 (AC-010). The counter for "Hourly Tracker helps…" text of 312 characters reads `312 / 8,000`.
- [ ] AC-004 `[auto]`: The project name is required. A blank name gives a problem at `name` and disables Analyze.

### US-002: Describe the stack

**As a** builder user
**I want to** enter the language, framework, test framework and build tool
**So that** the generated process uses my stack

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-005 `[auto]`: Language is required. A blank language gives a problem at `stack.language` and disables Analyze.
- [ ] AC-006 `[auto]`: Framework, test framework and build tool are optional. A blank optional field is left out of `stack`: the key is absent, not an empty string.
- [ ] AC-007 `[auto]`: Values are trimmed before they go into the configuration. The framework entered as "  Node.js + Fastify " is stored as `Node.js + Fastify`.

### US-003: Describe the architecture modules

**As a** builder user
**I want to** list the architecture style and its modules with their layers and dependencies
**So that** the review can check that dependencies point one way

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-008 `[auto]`: The architecture style is required text. A blank style gives a problem at `architecture.style` and disables Analyze.
- [ ] AC-009 `[auto]`: "Add module" adds one row with name, layer, responsibility and depends-on. Depends-on is a comma-separated list of module names: blanks are dropped and the order is kept.
- [ ] AC-010 `[auto]`: A layer that is not a whole number of 0 or more gives a problem at that module's layer path and disables Analyze. The problem names the module's position in the list, not the value typed.
- [ ] AC-011 `[auto]`: Removing a module removes its row. A depends-on entry that names no module is kept in the configuration, so `/analyze` reports it; the form does not drop it silently.
- [ ] AC-027 `[auto]`: A module row with a blank name gives a problem at that module's name path and disables Analyze, even though the model accepts an empty name. The check runs even when another field has a problem.
- [ ] AC-028 `[auto]`: With no modules at all, the modules entry in the progress panel is not ✓; it shows as incomplete until at least one module is listed and valid.

### US-004: Describe the code and test rules

**As a** builder user
**I want to** add code rules and test rules one at a time
**So that** the generated process follows them

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-012 `[auto]`: Code rules and test rules are lists of text, each added and removed one at a time. Blank rules are dropped before the configuration is built. Having no rules is valid and gives no problem.
- [ ] AC-013 `[auto]`: The progress panel shows four entries (idea, stack, modules, rules). Idea, stack and modules show ✓ when their required fields are valid. Rules shows ○ "optional" until one or more rules exist, then ✓.

### US-005: See the privacy notice before analysis

**As a** builder user
**I want to** be told that my brief goes to an AI model provider before I submit it
**So that** I decide to send it knowing that

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-014 `[auto]`: The notice above the Analyze button reads exactly: "Your brief is sent to an AI model provider for review. The service does not store or log it, and the review only advises. It never edits your setup." A test compares the text with the constant the view-model exports.
- [ ] AC-015 `[auto]`: The checkbox "I understand, send the brief for review" starts unticked. While it is unticked, Analyze is disabled even when the brief is valid.
- [ ] AC-016 `[auto]`: While the brief is invalid, Analyze is disabled even when the checkbox is ticked.
- [ ] AC-017 `[auto]`: Unticking the checkbox after ticking it disables Analyze again.

### US-006: Analyze the brief

**As a** builder user
**I want to** send the brief for review and see what comes back
**So that** I can fix gaps before I generate the framework

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-018 `[auto]`: Analyze sends `POST /analyze` with a JSON body equal to the configuration built from the form: `schemaVersion` 1, the entered fields, `targets` `["claude"]`, `customSteps` `[]`, and `workflows` and `connections` equal to the core's `DEFAULT_WORKFLOWS` and `DEFAULT_CONNECTIONS`. The test uses a fake `fetch`.
- [ ] AC-019 `[auto]`: A configuration built from a valid brief is accepted by `parseProjectConfig`. A test covers the complete valid brief from the wireframe values.
- [ ] AC-020 `[auto]`: While the request is in flight, Analyze is disabled and shows a waiting state. A second press sends no second request.
- [ ] AC-021 `[auto]`: A 200 response shows the structural findings, each with its severity, subject and message, in the order received.
- [ ] AC-022 `[auto]`: The review status is shown beside the structural findings. `ok` shows the review findings. `failed` and `skipped` each show a notice naming the status, and the structural findings stay visible.
- [ ] AC-023 `[auto]`: A network error or a non-200 response shows an error message on the page. The brief stays filled in; nothing is cleared.

### US-007: Start clean on every visit

**As a** builder user
**I want to** know that the brief is not kept between visits
**So that** I am not surprised by what is or is not saved

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-024 `[auto]`: The brief is held in memory only. A test with spies on `localStorage`, `sessionStorage` and `indexedDB` shows that filling in and analyzing the brief writes nothing to any of them.
- [ ] AC-025 `[device]`: Reloading the page clears the brief and the privacy checkbox.

### US-008: Use the form on a phone and a desktop

**As a** builder user
**I want to** fill in the brief on a phone or a laptop
**So that** I can work from either

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-026 `[device]`: At phone width the form has a 16px side gutter and no horizontal page scroll. The five numbered sections, the progress panel, the privacy notice and Analyze appear in the order of `02-brief.svg`.

---

## Requirement Coverage

| Scope item (features.md, F-05) | Covered by |
|---|---|
| Idea and structured fields: the idea, and the project name the model requires | AC-001, AC-002, AC-003, AC-004 |
| Structured fields for stack | AC-005, AC-006, AC-007 |
| Structured fields for architecture modules | AC-008, AC-009, AC-010, AC-011, AC-027, AC-028 |
| Structured fields for code rules and test rules | AC-012, AC-013 |
| Validation matches `model.ts` (checked with `parseProjectConfig`) | AC-004, AC-005, AC-008, AC-010, AC-016, AC-019 |
| Privacy notice shown before analysis | AC-014, AC-015 |
| Analyze stays disabled until the notice is accepted | AC-015, AC-016, AC-017 |
| Analyze sends the brief and shows the review (decision in this spec) | AC-018, AC-020, AC-021, AC-022, AC-023 |
| Nothing saved between visits (wireframe `02-brief.svg`) | AC-024, AC-025 |
| Layout matches the wireframe at phone width | AC-026 |
