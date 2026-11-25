# User Stories — API and UI integration (F-16)

Feature entry: `spec/documents/features.md` → F-16
Requirements owned by this feature: R-16-1 (the dev server reaches the API for both calls), R-16-2 (the step shows the real results of a running API), R-16-3 (the owner's end-to-end check of a generated project), R-16-4 (the analyze request follows the pipeline schema; command files take the flow name; added 2026-11-24 after the owner's bug report), R-16-5 (the analyze reply has the shape the step reads; added 2026-11-25 after the owner's second bug report), R-16-7 (the flow body accepts typing; added 2026-11-25 after the owner's blocker report).

The web app already sends the requests (F-13: `POST /analyze` and `POST /generate` from the analyze step). F-16 connects them to the running API and proves the whole path works. The owner runs the end-to-end check in a browser with a real provider key.

## Out of Scope

- Browser tests (Playwright or similar) and any new test library: the owner runs the end-to-end check by hand.
- Any change to the requests, the findings list, the gate or the preview: F-13 owns them and is complete.
- The production build and its hosting: the MVP runs the dev server with the API beside it.
- Rate limits, daily ceilings and input caps: F-17.
- Saving projects, autosave and share links: F-08, F-19, F-20 (post MVP).
- A new API route or a change to the API's reply shapes: F-14 and F-15 are complete.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-16 AC-003`).

### US-001: The dev server reaches the API for both calls

**As a** developer running the app
**I want to** have the browser's calls to `/analyze` and `/generate` reach the API
**So that** the analyze step works against the real server

**Requirements:** R-16-1

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: the dev server's proxy forwards `/analyze` and `/generate` to the API on the same target (`http://localhost:<PORT>`, the port the API uses, 3000 when unset).
- [ ] AC-002 `[auto]`: the proxy forwards no other path to the API: a request to another path (for example `/`, `/generate/x` or `/analyzer`) is not forwarded.
- [ ] AC-003 `[auto]`: the proxy's timeout for both paths is 300 seconds, the same as the API's generation timeout, so a generation that takes minutes is not cut off by the proxy.
- [ ] AC-004 `[auto]`: the proxy reads `PORT` the way the API does: unset or blank gives 3000, and any other value is used as given.

---

### US-002: The step shows the real results of a running API

**As a** user
**I want to** run Analyze and Generate and see the real findings and the real zip
**So that** I can trust the generated project

**Requirements:** R-16-2

#### Acceptance Criteria

- [ ] AC-005 `[device]`: with the API and the dev server running and `ANTHROPIC_API_KEY` set, Analyze on a filled-in brief shows the findings the API returns (the structural findings, then the review findings), and no "not found" text.
- [ ] AC-006 `[device]`: with `ANTHROPIC_API_KEY` unset, Analyze shows the structural findings and the "did not finish" note (F-13 AC-009), and Generate stays disabled with its reason.
- [ ] AC-007 `[device]`: with a green analysis, Generate and download saves `sddbuilder-project.zip` through the browser.
- [ ] AC-008 `[device]`: the saved zip, unpacked, holds the files of the project preview in the same order, and each file has text (none is empty).
- [ ] AC-009 `[device]`: with the API stopped, Analyze shows a network error as text beside it (F-13 AC-010) and the entered values stay as they were.

---

### US-003: The owner's end-to-end check of a generated project

**As the** owner
**I want to** generate a project from the browser and check its result
**So that** I know the whole app works before I rely on it

**Requirements:** R-16-3

#### Acceptance Criteria

- [ ] AC-010 `[device]`: the owner fills in a brief, runs Analyze to a green result, generates the project and checks that the process it describes matches the brief (the owner's judgement, recorded on the checklist).

---

### US-004: The analyze request follows the pipeline schema, and command files take the flow name (bug, found by the owner at Verify)

**As a** user
**I want to** have the analyze and generate requests accepted, and the command files named after my flows
**So that** the generated project has `specify.md`, not `flow-1.md`

**Requirements:** R-16-4

#### Acceptance Criteria

- [ ] AC-011 `[auto]`: the body the analyze step sends has no `index` key at any level (rules, arguments, flows and blocks), so it matches `spec/documents/pipeline-schema.md`.
- [ ] AC-012 `[auto]`: the body the analyze step sends for a filled-in wizard state is accepted by `pipeline.parseProjectConfig`.
- [ ] AC-013 `[auto]`: a command file is named from its flow name: the name in lower case, each run of characters that is not a letter or a digit replaced by one `-`, and the ends trimmed (`Specify` gives `specify.md`; `Review code` gives `review-code.md`).
- [ ] AC-014 `[auto]`: a flow name that gives an empty file name (no letter or digit) is a blocker: the analysis reports it, and generation refuses it with 422 and no model call.
- [ ] AC-015 `[auto]`: two flows whose names give the same file name are a blocker: the analysis reports it, and generation refuses it with 422 and no model call. A flow whose file name is `pipeline` is the same blocker, since that file is the pipeline command's file.
- [ ] AC-016 `[auto]`: the file list, and the command list in `process.md`, name each command file with the same file name.

---

### US-005: The analyze reply has the shape the step reads (bug, found by the owner at Verify)

**As a** user
**I want to** see the findings of a 200 analysis reply
**So that** a valid analysis is not shown as an error

**Requirements:** R-16-5

#### Acceptance Criteria

- [ ] AC-017 `[auto]`: every finding in a 200 `/analyze` reply, structural and brief findings alike, has `severity`, `subject` (the finding's path, for a structural finding) and `message`, and keeps its `rule` and `path`.
- [ ] AC-018 `[auto]`: a 200 reply in that shape is read by the web app's reply parser (`parseAnalysisReply`) as an analysis result, with every finding listed (no reply is refused for a structural finding).

---

### US-006: A new project starts empty (owner request, 2026-11-25)

**As a** user
**I want to** start a new project with no pipeline
**So that** I build the process myself rather than edit a default

**Requirements:** R-16-6, R-16-7

#### Acceptance Criteria

- [ ] AC-019 `[auto]`: a new wizard state, and a restart, has no flows and no arguments in its pipeline. The parser is unchanged: it refuses such a pipeline (no flow, blank name), so `/analyze` answers 422 with those problems until the user adds a flow and a name.
- [ ] AC-020 `[auto]`: typing into the flow body is accepted and shown. The body keeps every character typed (a space, a newline, a long text); a refusal shows the parser's reason at the body, and a refused text returns the field to the saved body. This holds for a flow from Add flow with an empty body and for a pipeline with a blank name. The parser still refuses the body itself (blank, over 1000 characters); a problem that the flow's link checks show only once the body has text is not a refusal of the body. An argument, rule tag, artifact or approval edit on a flow whose body is still blank is checked as if the body had text, so an invalid edit is refused with the parser's reason; the saved body stays blank.

---

### US-007: Block ids are unique across the pipeline (owner blocker, 2026-11-25)

**As a** user
**I want to** add blocks to any flow without an id clash
**So that** the pipeline is accepted by the parser

**Requirements:** R-16-8

#### Acceptance Criteria

- [ ] AC-021 `[auto]`: a block added to any flow gets an id that no block of any flow of the pipeline has; ids stay unique after blocks are added to several flows and after a block is removed.

---

### US-008: Error messages name flows and blocks (owner request, 2026-11-25)

**As a** user
**I want to** read the builder's errors by flow and block name
**So that** I can find the problem without decoding ids

**Requirements:** R-16-9

#### Acceptance Criteria

- [ ] AC-022 `[auto]`: each error or warning in the builder names its location by name: the flow's name, and for a block the block's name (an Agent's name; `Start`; `End`; a Condition's description, or `Condition N` when it has none), or `pipeline` for a pipeline field. A message that quotes a path or an id is shown with the same names, and no raw path or block id (such as `pipeline.flows.1.blocks.0.id` or `block-1`) appears in it.

---

### US-009: Arguments are kept when the selection changes (owner blocker, 2026-11-25)

**As a** user
**I want to** keep the arguments I add
**So that** they are still there when I come back to the block or the pipeline

**Requirements:** R-16-10

#### Acceptance Criteria

- [ ] AC-023 `[auto]`: an argument added to a block or to the pipeline is saved at once; after the user selects another block and returns, the argument is still listed with its values.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| R-16-1 — the dev server reaches the API for both calls | AC-001, AC-002, AC-003, AC-004 |
| R-16-2 — the step shows the real results of a running API | AC-005, AC-006, AC-007, AC-008, AC-009 |
| R-16-3 — the owner's end-to-end check of a generated project | AC-010 |
| R-16-4 — the analyze request follows the pipeline schema; command files take the flow name | AC-011, AC-012, AC-013, AC-014, AC-015, AC-016 |
| R-16-5 — the analyze reply has the shape the step reads | AC-017, AC-018 |
| R-16-6 — a new project starts empty | AC-019 |
| R-16-8 — block ids are unique across the pipeline | AC-021 |
| R-16-9 — error messages name flows and blocks | AC-022 |
| R-16-10 — arguments are kept when the selection changes | AC-023 |
| R-16-7 — the flow body accepts typing | AC-020 |
