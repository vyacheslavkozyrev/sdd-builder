# User Stories — Project wizard: frame, name and idea, workflow host (F-05)

Feature entry: `spec/documents/features.md` → F-05
Screens: `spec/design/features/F-05-project-brief-form/` (`screens.md`, two SVG wireframes: step 1 and the Map tab of step 3).
Split on 2026-11-15 from the wizard as first specified. Step 2 is F-21 and step 4 is F-22; their criteria moved there. Criterion IDs restart in each feature.
Requirements owned by this feature: none yet

## Out of Scope

- The technical details step (step 2): F-21.
- Analyze and generate (step 4): F-22.
- The builder itself: flows, blocks, gates, checks, custom agents, and the flow tabs' toolbox (F-06). Step 3 only hosts it.
- Saving, importing and exporting projects (F-08) and browser-local autosave (F-20). Nothing is stored between visits.
- The analyzer's checks and the review prompt (F-04), and the server side of `/analyze` and `/generate` and the zip (F-07).
- A privacy notice on step 1, a clickable stepper, and links from findings to the step that fixes them. The owner decided against all three.
- Browser tests. Logic is tested with Vitest; the layout is checked by hand against the screens (AC-014).

**Dependency:** step 3 shows the builder, so this feature depends on F-06 for AC-010 and AC-011. Until F-06 is complete, step 3 cannot show the pipeline.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-05 AC-003`).

### US-001: Four-step wizard frame

**As a** user
**I want to** move through four ordered steps with Back and Next
**So that** the project is described in order, from name to generated files.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The wizard has four steps in this order: 1 Project name and idea, 2 Technical details, 3 Workflow, 4 Analyze and generate. This feature provides the frame and the navigation for all four; the bodies of steps 2 and 4 are built by F-21 and F-22. A new wizard starts at step 1, with Back disabled.
- [ ] AC-002 `[auto]`: Next moves forward one step and Back moves back one step. Back on step 1 changes nothing, and step 4 has no Next (negative case).
- [ ] AC-003 `[auto]`: The stepper marks the current step as active and the earlier steps as done. A click on a step in the stepper leaves the current step unchanged (decision: navigation by Back and Next only).
- [ ] AC-004 `[auto]`: Moving between steps keeps every value as entered: the name and the idea (step 1), the fields and rule blocks (step 2, F-21), and the pipeline (step 3).
- [ ] AC-005 `[auto]`: Next is never blocked by an empty field. A blank name, idea or language is reported later by Analyze as a blocker (negative case; the analyzer owns the required-field check, F-04 AC-010).
- [ ] AC-006 `[auto]`: The wizard holds its state in React memory only. The web source writes nothing to `localStorage`, `sessionStorage` or `indexedDB`, and a new mount starts at step 1 with every field empty.

---

### US-002: Project name and idea (step 1)

**As a** user
**I want to** give the project a name and describe the idea
**So that** the analysis and the generated files describe my project.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-007 `[auto]`: The name field maps to `name` in the config and is stored as typed. Spaces only are kept as typed; the form does not trim it, and the analyzer decides that it is blank.
- [ ] AC-008 `[auto]`: The idea field accepts at most 8,000 characters, counted in code points (a surrogate pair counts as one character; a cut never splits a pair) without trimming. Typing or pasting beyond the limit keeps the first 8,000 characters, and the counter reads `8,000 / 8,000` (thousands separator, as on the approved screen) (negative case: a paste of 9,000 characters).
- [ ] AC-009 `[auto]`: Boundary: at 7,999 characters the field accepts one more character; at 8,000 it accepts none. The counter shows the current count at each length in a table test (0, 1, 7,999, 8,000).

---

### US-003: Workflow host (step 3)

**As a** user
**I want to** see the pipeline on the Map tab inside the wizard, starting from the default pipeline
**So that** I can check the process the project will get before I analyze it.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: Step 3 shows the builder (F-06) on its Map tab, starting from the default pipeline in `source/templates/pipeline/default.json`. The Map tab's tab row holds the Map tab, the flow tabs in order, and a + that adds a flow after the last tab.
- [ ] AC-011 `[auto]`: The `pipeline` in the config sent at step 4 is the builder's current pipeline, so a change made at step 3 is what Analyze and Generate see. Next from step 3 always opens step 4, even when the pipeline has problems; the problems appear as findings at Analyze, not as a block at step 3 (negative case).

---

### US-004: Privacy of the brief and no secrets in the web app

**As a** user
**I want to** be sure the brief is sent only to the analysis and generation routes and kept nowhere
**So that** my brief is not stored or logged by the browser or the app.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-012 `[auto]`: The brief leaves the page only in the bodies of `POST /analyze` and `POST /generate`. A static test fails when `source/apps/web/src` calls `console`, `localStorage`, `sessionStorage` or `indexedDB`, outside the tests.
- [ ] AC-013 `[auto]`: The web source holds no API key and names no provider variable: a static test finds no `ANTHROPIC` text in `source/apps/web/src`. The routes are called with relative paths, so the browser calls one origin.
- [ ] AC-014 `[device]`: At 1280 × 800 the wizard frame, step 1 and the Map tab of step 3 match the approved screens in `spec/design/features/F-05-project-brief-form/`: the stepper, the footer with Back and Next, the name and idea fields with the counter, and the tab row with the + button.

---

## Requirement Coverage

Scope items are the F-05 items in `spec/documents/features.md`.

| Requirement | Covered by |
|---|---|
| Scope 1: Four-step wizard frame, Back and Next, in-memory state (`architecture.md` §6 decisions 13 and 15) | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006 |
| Scope 2: Project name and idea (name is required; idea with a counter of 8,000 characters) | AC-007, AC-008, AC-009 |
| Scope 3: Workflow host (the builder's Map tab, step 3; the pipeline goes to step 4) | AC-010, AC-011 |
| Scope 4: Privacy and no secrets in the web app (`architecture.md` §6, decision 13) | AC-012, AC-013 |
| Screens for the frame, step 1 and the Map tab (`screens.md`) | AC-014 |
