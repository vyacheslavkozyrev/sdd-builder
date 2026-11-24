# User Stories — Analyze and generate step (UI only) (F-13)

Feature entry: `spec/documents/features.md` → F-13
Requirements owned by this feature: none yet
Rules: `spec/documents/ui.md` §2 (step 4), decision 41 in `spec/documents/architecture.md` §6 (a skipped or failed review is an error), `architecture.md` §4 (the analysis result and its statuses).

Two owner answers shape this spec (2026-11-24):
- Decision 41 governs: a review with status `failed` or `skipped` is an error; Generate stays disabled until Analyze completes the review. `ui.md` §2 ("noted beside the findings") is out of date and is corrected with this feature.
- F-13 makes the real calls: Analyze sends `POST /analyze` and Generate sends `POST /generate` from this step. The endpoints do not exist yet, so a 404 is an expected reply at this stage and is shown as text. F-14 and F-15 add the endpoints; F-16 completes the error mapping and the contract checks.

## Out of Scope

- The server behaviour of `/analyze` and `/generate`: the parse, the findings and the zip (F-14, F-15). F-13 only sends the requests and shows the replies.
- The rate limit, the daily ceiling and the input caps and their messages beyond showing the status and text (F-17). A 429 is shown as an error; no counter is shown in the browser.
- Saving or loading the analysis or the configuration. Nothing is stored in browser storage or on the server; the result is lost on refresh, as the footer note says.
- Editing the wizard fields or the pipeline (F-09, F-10, F-11, F-12). This feature only reads them.
- The file contents the model writes (F-15 and the generator, F-04, F-05). The preview shows the file list only.
- Output adapters other than Claude Code (F-19).

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-13 AC-003`). Automated tests use a fake `fetch` and a fixed configuration; no test calls the real server or the wall clock.

### US-001: Privacy notice gates Analyze

**As a** builder user
**I want to** confirm that my brief goes to the model provider before I analyse it
**So that** I do not send it by accident.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: When the step opens, the privacy notice shows above the Analyze button with its checkbox unticked, and Analyze is disabled.
- [ ] AC-002 `[auto]`: Ticking the checkbox enables Analyze; unticking it disables Analyze again.
- [ ] AC-003 `[auto]`: With the checkbox unticked, Analyze sends no request, and the analysis function refuses to run.
- [ ] AC-004 `[auto]`: The notice states that the brief is sent to the model provider and that the server does not store it.

### US-002: Analyze sends the project and shows the findings

**As a** builder user
**I want to** run the analysis on my project and see every finding with its severity
**So that** I know what to fix before I generate.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-005 `[auto]`: Analyze sends one `POST /analyze` with a JSON body that is the project configuration built from the wizard state (the idea trimmed as in F-09, the stack, the architecture and the rule blocks, and the pipeline). The same state gives the same body.
- [ ] AC-006 `[auto]`: While the request is pending, Analyze is disabled and a second click sends no request.
- [ ] AC-007 `[auto]`: A successful reply lists its findings in the order the server returns them, each with its severity (`blocker`, `warning` or `info`), its subject and its message, shown as plain text (a message holding `<b>` is shown as typed).
- [ ] AC-008 `[auto]`: The list shows the structural findings (`findings`) first, then the review findings (`review.findings`), each group in the order the server returns it.
- [ ] AC-009 `[auto]`: A reply whose review status is `failed` or `skipped` shows an error note ("The analysis did not finish. Analyze again."), still lists the structural findings, and keeps Generate disabled (decision 41).
- [ ] AC-010 `[auto]`: An error reply (400, 422, 429, 500, 502, or 404 while the endpoint does not exist) or a network failure shows the status code, or "network error", as text beside Analyze; the entered values stay as they were.
- [ ] AC-011 `[auto]`: A 422 reply lists every `<path>: <reason>` problem it carries, one line each.
- [ ] AC-012 `[auto]`: A 429 reply is shown as an error with its status code and wording "too many requests"; the request is not sent again automatically.
- [ ] AC-013 `[auto]`: A 200 reply that is not JSON, or whose JSON does not match the analysis result shape, is shown as an error and lists no findings.
- [ ] AC-014 `[auto]`: A new analysis replaces the previous result, its findings and its status when it starts.

### US-003: The analysis is green only when it passes

**As a** builder user
**I want to** know when the analysis allows generation
**So that** I can tell whether the project is ready.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-015 `[auto]`: The analysis is green only when it ran on the current configuration, its review status is `ok`, and no finding is a blocker or a warning. An `info` finding does not stop it.
- [ ] AC-016 `[auto]`: A green analysis shows a result line saying there is no blocker and no warning.
- [ ] AC-017 `[auto]`: Each state where Generate is disabled shows its reason: not run ("Run Analyze first"), a blocker present, a warning present, a failed or skipped review, or an error. Each case gives one reason, the first that applies in that order.
- [ ] AC-018 `[auto]`: Changing a brief field (name, idea, architecture, a stack field, or a rule block's name or description) after an analysis marks the analysis out of date; Generate is disabled until Analyze runs again and is green.
- [ ] AC-019 `[auto]`: Changing the pipeline (a flow, a block, an arrow, a flow panel or an agent property) after an analysis marks the analysis out of date in the same way.
- [ ] AC-020 `[auto]`: The privacy tick, the analysis result and the generated state are held in memory only; nothing is written to browser storage.

### US-004: The project preview shows the files

**As a** builder user
**I want to** see the files my project will get before I generate it
**So that** I know what I am downloading.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-021 `[auto]`: The preview lists the files of the project in plan order; the list is computed in the browser from the configuration and sends no request.
- [ ] AC-022 `[auto]`: Files that come from rule blocks are marked in the tree.
- [ ] AC-023 `[auto]`: The preview shows the tree in a scrolling panel and a control that opens the full list in a dialog; Close returns to the step.
- [ ] AC-024 `[auto]`: Adding or removing a rule block changes the list of files shown, and the preview follows the configuration without a reload.

### US-005: Generate and download the project

**As a** builder user
**I want to** generate the project and save it as a zip file
**So that** I can use the Claude Code layout in my own project.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-025 `[auto]`: Generate and download is enabled only when the analysis is green (AC-015); otherwise it is disabled with the reason from AC-017.
- [ ] AC-026 `[auto]`: Clicking Generate and download sends one `POST /generate` with the same configuration as Analyze, shows a pending state, and disables the button until the reply arrives.
- [ ] AC-027 `[auto]`: A successful zip reply saves the file as `sddbuilder-project.zip`.
- [ ] AC-028 `[auto]`: An error reply or network failure from Generate is shown as text (status code or "network error"), no file is saved, and the entered values stay as they were.
- [ ] AC-029 `[auto]`: A 422 reply to Generate lists every `<path>: <reason>` problem, one line each.
- [ ] AC-030 `[device]`: On a 1280 × 800 desktop, the step matches the approved screens: the left panel, the two columns (Analyze, Project preview), the footer note and the disabled and enabled states.
- [ ] AC-031 `[device]`: In a running browser against the current server (no `/analyze` or `/generate` yet), Analyze and Generate show the 404 reply as text and keep the entered values.

---

## Requirement Coverage

| Requirement (`features.md` F-13 scope) | Covered by |
|---|---|
| Privacy notice with a checkbox above Analyze; Analyze disabled until ticked | AC-001, AC-002, AC-003, AC-004 |
| Analyze block lists findings with severity, subject and message | AC-007, AC-008 |
| A skipped or failed review is noted (decision 41: an error) | AC-009 |
| Analyze calls the endpoint (user decision, 2026-11-24); errors shown as text | AC-005, AC-006, AC-010, AC-011, AC-012, AC-013 |
| Analysis green when no blocker and no warning | AC-015, AC-016 |
| Project preview: file tree, computed in the browser | AC-021, AC-022, AC-023, AC-024 |
| One button, Generate and download, enabled only when the analysis is green | AC-017, AC-025, AC-026, AC-027, AC-028, AC-029 |
| Any change makes the analysis out of date | AC-018, AC-019, AC-014 |
| Desktop layout matches the approved screens | AC-030, AC-031 |
