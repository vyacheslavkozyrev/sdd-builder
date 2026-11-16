# User Stories — Project wizard step 4: analyze and generate (F-22)

Feature entry: `spec/documents/features.md` → F-22
Screens: `spec/design/features/F-22-wizard-analyze-generate/` (`screens.md`, three SVG wireframes: analyze and generate, the analyze states, the generate states).
Split from F-05 on 2026-11-15; the criteria were carried over from the approved F-05 stories and renumbered. Criterion IDs restart in each feature.
Requirements owned by this feature: none yet

## Out of Scope

- The wizard frame, the stepper, Back and Next (F-05). Step 4 is the last step, so it has no Next.
- The analyzer's checks and the review prompt (F-04), and the server side of `/analyze` and `/generate` and the zip (F-07). This feature calls these routes and shows their answers.
- The text of the generated files (F-03).
- Saving, importing and exporting projects (F-08).
- Browser tests. Logic is tested with Vitest; the layout is checked by hand against the screens (AC-015).

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-22 AC-003`).

### US-001: Analyze the brief

**As a** user
**I want to** have my brief checked, with a privacy notice before it is sent
**So that** I know what the analysis found and I agree to the brief being sent for review.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The privacy notice sits above Analyze on step 4. Analyze is disabled until its checkbox is ticked, and unticking the checkbox disables it again. The checkbox is not ticked on a new wizard.
- [ ] AC-002 `[auto]`: Analyze sends one `POST /analyze` with the config built from the wizard's state: `schemaVersion` 2, `name`, `idea`, `stack`, `architecture` when set, `rules` and `pipeline`. Analyze sends no other request.
- [ ] AC-003 `[auto]`: Analyze shows the findings in the order the API returns them. Each shows its severity label (`blocker`, `warning` or `info`), its subject and its message, as plain text with no links.
- [ ] AC-004 `[auto]`: When the review status is `skipped` or `failed`, a note beside the findings says so, and the structural findings are still shown (negative case).
- [ ] AC-005 `[auto]`: A 400, 422, 429, 500 or 502 reply, or a network failure, shows its message as text on step 4 and keeps the wizard's state. A 422 lists every `<path>: <reason>` problem. No failure leaves the page blank.
- [ ] AC-006 `[auto]`: After any change to a field, a rule block or the pipeline, the last analysis is out of date and Generate is disabled until Analyze runs again on the current config.

---

### US-002: Generate, file tree and zip download

**As a** user
**I want to** see the files the project will get, then generate and download them
**So that** the zip holds exactly the files I was shown.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-007 `[auto]`: Generate is disabled until an analysis has run on the current config and that analysis has no `blocker` finding. Warnings, and a review that is `skipped` or `failed`, do not disable it (decision: Generate waits for an analysis; blockers close it, since `/generate` refuses the same problems with 422).
- [ ] AC-008 `[auto]`: The file tree lists the paths that `planGeneration` (core) returns for the current config, in plan order. The web app computes it with no request and no model call, and it is shown before Generate is pressed (decision: the tree comes from core, not from the zip).
- [ ] AC-009 `[auto]`: The files planned from rule blocks (paths under `.claude/rules/`) are marked in the tree. A table test with two rule blocks and one without marks exactly the two rule files.
- [ ] AC-010 `[auto]`: Generate sends one `POST /generate` with the same config body as Analyze. While the request is pending Generate is disabled, so a second click sends no request.
- [ ] AC-011 `[auto]`: After a 200 reply, Download zip is enabled. It saves the reply as a file named `sddbuilder-project.zip`, whatever the reply's `Content-Disposition` says. A test uses a fake reply and a fake save function.
- [ ] AC-012 `[auto]`: The zip holds the tree's paths: for a fixed config, the entry names of a zip built from the planned paths are the tree's paths, in the same order.
- [ ] AC-013 `[auto]`: A failed Generate (422 with every problem listed, 429 with its `Retry-After` seconds, 502, 503 or 500) shows the message as text, and Download zip stays disabled. A zip from an earlier run is not offered after a failure (negative case).
- [ ] AC-014 `[auto]`: Editing any field, rule block or the pipeline after a successful Generate discards the zip. Download zip is disabled until Generate runs again (negative case).
- [ ] AC-015 `[device]`: At 1280 × 800 step 4 matches the approved screens in `spec/design/features/F-22-wizard-analyze-generate/`: the numbered sub-steps, the privacy checkbox and Analyze, the findings, Generate with the file tree, the footer with Download zip, and the states listed in `screens.md`.

---

## Requirement Coverage

Scope items are the step 4 items of F-22 in `spec/documents/features.md`.

| Requirement | Covered by |
|---|---|
| Scope 1: Privacy notice with a checkbox before Analyze; findings | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006 |
| Scope 2: Generate; file tree; Download zip after generation | AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014 |
| Screens for step 4 and its states (`screens.md`) | AC-015 |
