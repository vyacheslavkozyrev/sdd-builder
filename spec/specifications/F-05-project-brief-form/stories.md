# User Stories — Project wizard: name and idea, technical details, workflow, analyze and generate (F-05)

Feature entry: `spec/documents/features.md` → F-05
Screens: `spec/design/features/F-05-project-brief-form/` (`screens.md`, four SVG wireframes). The screens are the layout and states; the open points in `screens.md` were decided with the owner (see the notes in each story).
Requirements owned by this feature: none yet

## Out of Scope

- Saving, importing and exporting projects (F-08) and browser-local autosave (F-20). Nothing is stored between visits.
- The builder itself: flows, blocks, gates, checks, custom agents and the Map tab (F-06). Step 3 only hosts it.
- The analyzer's checks and the review prompt (F-04), and the server side of `/analyze` and `/generate` and the zip (F-07). F-05 calls these routes and shows their answers.
- The text of the generated files, and where the architecture text is used in them (F-03). F-05 only puts the values into the config.
- A privacy notice on step 1, a clickable stepper, and links from findings to the step that fixes them. The owner decided against all three.
- Browser tests. Logic is tested with Vitest; the layout is checked by hand against the screens (AC-037).

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-05 AC-003`).

### US-001: Four-step wizard

**As a** user
**I want to** fill in the project in four ordered steps and move between them
**So that** I can describe the project, see the workflow and check and generate the files without leaving the page.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The wizard has four steps in this order: 1 Project name and idea, 2 Technical details, 3 Workflow, 4 Analyze and generate. A new wizard starts at step 1, with Back disabled.
- [ ] AC-002 `[auto]`: Next moves forward one step and Back moves back one step. Back on step 1 changes nothing, and step 4 has no Next (negative case).
- [ ] AC-003 `[auto]`: The stepper marks the current step as active and the earlier steps as done. A click on a step in the stepper leaves the current step unchanged (decision: navigation by Back and Next only).
- [ ] AC-004 `[auto]`: Moving between steps keeps every value as entered: the name, the idea, the technical fields, every rule block with its title and body, and the pipeline from step 3.
- [ ] AC-005 `[auto]`: Next is never blocked by an empty field. A blank name, idea or language reaches step 4 and is reported by Analyze as a blocker (negative case; the analyzer owns the required-field check, F-04 AC-010).
- [ ] AC-006 `[auto]`: The wizard holds its state in React memory only. The web source writes nothing to `localStorage`, `sessionStorage` or `indexedDB`, and a new mount starts at step 1 with every field empty.

---

### US-002: Project name and idea (step 1)

**As a** user
**I want to** give the project a name and describe the idea
**So that** the analysis and the generated files describe my project.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-007 `[auto]`: The name field maps to `name` in the config and is stored as typed. Spaces only are kept as typed; the form does not trim it, and the analyzer decides that it is blank.
- [ ] AC-008 `[auto]`: The idea field accepts at most 8,000 characters, counted as JavaScript string length without trimming. Typing or pasting beyond the limit keeps the first 8,000 characters, and the counter reads `8000 / 8000` (negative case: a paste of 9,000 characters).
- [ ] AC-009 `[auto]`: Boundary: at 7,999 characters the field accepts one more character; at 8,000 it accepts none. The counter shows the current count at each length in a table test (0, 1, 7,999, 8,000).

---

### US-003: Technical details and code rules (step 2)

**As a** user
**I want to** give the architecture, the stack and my code rules as separate blocks
**So that** each rule becomes its own file the project can read.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: The language, framework, platform, build tool and test framework fields map to `stack.language`, `stack.framework`, `stack.platform`, `stack.buildTool` and `stack.testFramework`. An empty optional field is left out of the config, not sent as an empty string.
- [ ] AC-011 `[auto]`: The architecture style text maps to an optional `architecture` string in the config. A blank value is left out. The core parser accepts an absent `architecture` and a string, and refuses any other type with a problem at its path (decision recorded in `architecture.md` §5 before the code depends on it; the generator's use of it is F-03).
- [ ] AC-012 `[auto]`: "Add rule block" appends one block with an empty title and body after the last block. "Remove block" removes only that block and keeps the order of the others.
- [ ] AC-013 `[auto]`: Each rule block shows its file name as `.claude/rules/<id>.md`. The id is the title lowercased, each run of characters outside `a`–`z` and `0`–`9` replaced by one hyphen, and leading and trailing hyphens removed (`Code style` gives `code-style`; `Testing!` gives `testing`). A title that gives an empty id shows "no file name". A table test covers these cases.
- [ ] AC-014 `[auto]`: Two rule blocks whose titles give the same id both show a duplicate-id message. The form keeps both blocks as entered and does not rename them. Analyze reports the duplicate as a blocker at the rule's path (negative case).
- [ ] AC-015 `[auto]`: The list holds at most 60 rule blocks. At 60, "Add rule block" is disabled; the 61st block cannot be added by any path (boundary, 59 and 60 in a table test).
- [ ] AC-016 `[auto]`: The config's `rules` list has one entry per block, in screen order, with `id` (the derived id), `title` and `text` (the body). A block with a blank title stays in the list, so Analyze reports it, and the form does not drop it.
- [ ] AC-017 `[auto]`: Step 2 starts with no rule blocks. No block is fixed: a block titled "Testing" can be removed like any other, and the form never adds one by itself (owner decision: the testing rules are an ordinary block).
- [ ] AC-018 `[auto]`: Editing a block's title changes the file name shown on that block and in the step 4 tree. Editing the title does not change the body.

---

### US-004: Workflow (step 3)

**As a** user
**I want to** see the pipeline on the Map tab inside the wizard, starting from the default pipeline
**So that** I can check the process the project will get before I analyze it.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-019 `[auto]`: Step 3 shows the builder (F-06) starting from the default pipeline in `source/templates/pipeline/default.json`. The `pipeline` in the config sent at step 4 is the builder's current pipeline, so a change made at step 3 is what Analyze and Generate see.
- [ ] AC-020 `[auto]`: Next from step 3 always opens step 4, even when the pipeline has problems. The problems appear as findings at Analyze, not as a block at step 3 (negative case).

---

### US-005: Analyze (step 4)

**As a** user
**I want to** have my brief checked, with a privacy notice before it is sent
**So that** I know what the analysis found and I agree to the brief being sent for review.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-021 `[auto]`: The privacy notice sits above Analyze on step 4. Analyze is disabled until its checkbox is ticked, and unticking the checkbox disables it again. The checkbox is not ticked on a new wizard.
- [ ] AC-022 `[auto]`: Analyze sends one `POST /analyze` with the config built from the wizard's state: `schemaVersion` 2, `name`, `idea`, `stack`, `architecture` when set, `rules` and `pipeline`. Analyze sends no other request.
- [ ] AC-023 `[auto]`: Analyze shows the findings in the order the API returns them. Each shows its severity label (`blocker`, `warning` or `info`), its subject and its message, as plain text with no links.
- [ ] AC-024 `[auto]`: When the review status is `skipped` or `failed`, a note beside the findings says so, and the structural findings are still shown (negative case).
- [ ] AC-025 `[auto]`: A 400, 422, 429, 500 or 502 reply, or a network failure, shows its message as text on step 4 and keeps the wizard's state. A 422 lists every `<path>: <reason>` problem. No failure leaves the page blank.
- [ ] AC-026 `[auto]`: After any change to a field, a rule block or the pipeline, the last analysis is out of date and Generate is disabled until Analyze runs again on the current config.

---

### US-006: Generate, file tree and zip download (step 4)

**As a** user
**I want to** see the files the project will get, then generate and download them
**So that** the zip holds exactly the files I was shown.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-027 `[auto]`: Generate is disabled until an analysis has run on the current config and that analysis has no `blocker` finding. Warnings, and a review that is `skipped` or `failed`, do not disable it (decision: Generate waits for an analysis; blockers close it, since `/generate` refuses the same problems with 422).
- [ ] AC-028 `[auto]`: The file tree lists the paths that `planGeneration` (core) returns for the current config, in plan order. The web app computes it with no request and no model call, and it is shown before Generate is pressed (decision: the tree comes from core, not from the zip).
- [ ] AC-029 `[auto]`: The files planned from rule blocks (paths under `.claude/rules/`) are marked in the tree. A table test with two rule blocks and one without marks exactly the two rule files.
- [ ] AC-030 `[auto]`: Generate sends one `POST /generate` with the same config body as Analyze. While the request is pending Generate is disabled, so a second click sends no request.
- [ ] AC-031 `[auto]`: After a 200 reply, Download zip is enabled. It saves the reply as a file named `sddbuilder-project.zip`, whatever the reply's `Content-Disposition` says. A test uses a fake reply and a fake save function.
- [ ] AC-032 `[auto]`: The zip holds the tree's paths: for a fixed config, the entry names of a zip built from the planned paths are the tree's paths, in the same order.
- [ ] AC-033 `[auto]`: A failed Generate (422 with every problem listed, 429 with its `Retry-After` seconds, 502, 503 or 500) shows the message as text, and Download zip stays disabled. A zip from an earlier run is not offered after a failure (negative case).
- [ ] AC-034 `[auto]`: Editing any field, rule block or the pipeline after a successful Generate discards the zip. Download zip is disabled until Generate runs again (negative case).

---

### US-007: Privacy of the brief and no secrets in the web app

**As a** user
**I want to** be sure the brief is sent only to the analysis and generation routes and kept nowhere
**So that** my brief is not stored or logged by the browser or the app.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-035 `[auto]`: The brief leaves the page only in the bodies of `POST /analyze` and `POST /generate`. A static test fails when `source/apps/web/src` calls `console`, `localStorage`, `sessionStorage` or `indexedDB`, outside the tests.
- [ ] AC-036 `[auto]`: The web source holds no API key and names no provider variable: a static test finds no `ANTHROPIC` text in `source/apps/web/src`. The routes are called with relative paths, so the browser calls one origin.
- [ ] AC-037 `[device]`: At 1280 × 800 the four steps match the approved screens in `spec/design/features/F-05-project-brief-form/`: the stepper, the Back and Next controls, the rule blocks with their file names, the step 4 layout, and the states listed for each screen in `screens.md`.

---

## Requirement Coverage

Scope items are the four items of F-05 in `spec/documents/features.md`.

| Requirement | Covered by |
|---|---|
| Scope 1: Project name and idea (name is required; idea with a counter of 8,000 characters) | AC-007, AC-008, AC-009, AC-005 |
| Scope 2: Technical details (architecture style; language, framework, test framework, build tool; code rules as rule blocks, one Markdown file each; no module list) | AC-010, AC-011, AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018 |
| Scope 3: Workflow (the builder on the Map tab, step 3) | AC-019, AC-020 |
| Scope 4: Analyze and generate (privacy notice with checkbox before Analyze; findings; Generate; file tree; Download zip) | AC-021, AC-022, AC-023, AC-024, AC-025, AC-026, AC-027, AC-028, AC-029, AC-030, AC-031, AC-032, AC-033, AC-034, AC-037 |
| Four-step wizard, in-memory state only (`architecture.md` §6 decisions 13 and 15) | AC-001, AC-002, AC-003, AC-004, AC-006, AC-035, AC-036 |
