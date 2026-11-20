# User Stories — Analyzer (F-06)

Feature entry: `spec/documents/features.md` → F-06
Requirements owned by this feature: the F-06 scope items in `features.md` (structural findings, advice-only LLM review, validation and cap, findings returned when the review fails, brief not stored or logged); `architecture.md` §4 (LLM analysis: output, review call, failure, privacy); decision 6 (the LLM advises), decision 10 (one analysis shape, brief checks, LLM findings are advice), decision 37 (b) to (e) (brief checks as their own function, review limits, the review prompt and the reply cap).

The brief model (`name`, `idea`, `architecture`, `stack`, their limits and the parse) is owned by F-02 (`pipeline-schema.md` §2; F-02 AC-074 to AC-076). F-06 reads the parsed brief and adds no model fields.

## Out of Scope

- The brief model and its parse: the optional fields, the 100-code-point `name` limit, the 5,000-code-point `idea` and `architecture` limits, the `stack` keys and their refusals (F-02, AC-074 to AC-076 and AC-088 there).
- The `POST /analyze` route, its 400 and 422 responses, and reading `ANTHROPIC_API_KEY` and `SDDBUILDER_ANALYZER_MODEL` at startup (F-14). F-06 provides the analysis function that the route calls.
- The daily review ceiling and the `skipped` review status (F-17, post MVP; `features.md` puts the abuse and cost controls there). F-06 returns `ok` or `failed` only.
- The per-client rate limit, the request caps checked before a model call, and the daily generation ceiling (F-17).
- Retry of a failed review call. A provider error, a timeout or a bad reply fails the review once; the SDK's own retries stay inside the adapter.
- Showing the findings, the failed note and the privacy notice in the browser (F-13).
- Input checks beyond the brief checks listed in US-001, and any use of the brief in `/generate` (F-15).
- Adding brief fields to the wizard's forms (F-09 and F-10). F-06 changes the analysis only.
- Changes to the default pipeline's content. The default has no brief; its brief reads as blank.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-06 AC-003`).

This feature is an enabler: the stories are written for the developer who builds on the analysis (the route in F-14 and the analysis panel in F-13), and for the user who reads the findings. The model call uses a fake model in every test; no test calls the real provider.

### US-001: The analysis checks the brief

**As a** user
**I want to** see a finding when the brief is missing a required field or leaves a useful field empty
**So that** I can fix the brief before I generate the project

**Requirements:** architecture §4 (brief checks: blocker for `name`, `idea`, `stack.language`; warnings for blank optional stack fields and an empty `rules` list); decision 10; decision 37 (b)

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: `name`, `idea` or `stack.language` that is absent, empty, or only spaces or line breaks gives a `blocker` at the path `name`, `idea` or `stack.language`.
- [ ] AC-002 `[auto]`: `stack.framework`, `stack.platform`, `stack.buildTool` or `stack.testFramework` that is absent or blank gives a `warning` at its path (`stack.<field>`).
- [ ] AC-003 `[auto]`: an empty `rules` list gives a `warning` at the path `rules`; a list with one or more rules gives none.
- [ ] AC-004 `[auto]`: a complete brief (every required field and every optional stack field filled, with at least one rule) gives no brief finding.
- [ ] AC-005 `[auto]`: the brief checks are not part of `analyzeStructure`. The structural findings of a pipeline are the same whether its brief is blank or complete, so the pipeline refusals of F-04 and the marks of F-11 do not change.
- [ ] AC-006 `[auto]`: brief findings come after the structural findings, in this order: `name`, `idea`, `stack.language`, `stack.framework`, `stack.platform`, `stack.buildTool`, `stack.testFramework`, `rules`.

### US-002: The review sends the brief and the process with a fixed prompt

**As a** developer
**I want to** have the review call send a fixed prompt, the brief and the process, with fixed limits
**So that** the review is the same on every run and its cost is bounded

**Requirements:** architecture §4 (input, review call: `max_tokens` 8192, 60-second timeout per attempt, no SDK retry); decision 6; decision 37 (c) and (e)

#### Acceptance Criteria

- [ ] AC-007 `[auto]`: the review request carries the fixed review prompt, the brief and the pipeline config. The same input gives the same request text on two calls.
- [ ] AC-008 `[auto]`: the review call sets `max_tokens` to 8192 and a timeout of 60 seconds per attempt.
- [ ] AC-009 `[auto]`: one analysis makes at most one review call. A model call that throws is not retried, and the fake model records one call.
- [ ] AC-010 `[auto]`: with no model configured, the review status is `failed` and no call is made.

### US-003: The review reply is checked and capped

**As a** user
**I want to** see only well-formed advice from the review, capped at a short list
**So that** a bad or long reply from the model cannot clutter or break the analysis

**Requirements:** features.md F-06 ("validated and capped"); architecture §4 (reply check, the findings and the `dropped` count); decision 10 (a model `blocker` is kept as `warning`); decision 37 (d); ui.md (the severities shown are `blocker`, `warning` and `info`)

#### Acceptance Criteria

- [ ] AC-011 `[auto]`: a reply that is not valid JSON gives review status `failed` with no review findings.
- [ ] AC-012 `[auto]`: a reply that is valid JSON but not an array gives review status `failed` with no review findings.
- [ ] AC-013 `[auto]`: a reply that stops at `max_tokens` gives review status `failed`, and the reply is not parsed.
- [ ] AC-014 `[auto]`: an entry is kept only with severity `warning` or `info` and with a `subject` and a `message` that are not blank. An entry with another severity, a blank field, or that is not an object is dropped and counted in `dropped`.
- [ ] AC-015 `[auto]`: an entry with severity `blocker` is kept with severity `warning`, and is never a blocker in the result.
- [ ] AC-016 `[auto]`: kept entries are returned in reply order. At most 10 are returned; any further valid entries are counted in `dropped`.
- [ ] AC-017 `[auto]`: a reply that is an empty array gives review status `ok`, no review findings and `dropped` 0.
- [ ] AC-018 `[auto]`: a failed review has `dropped` 0, since no reply was checked entry by entry.

### US-004: The analysis returns the findings, and the review never changes the config

**As a** user
**I want to** get the structural findings and the review together, and keep them even when the review fails
**So that** the checks I can rely on are never lost to a model failure

**Requirements:** features.md F-06 (structural findings included; findings returned when the review fails; advice only); architecture §4 (output); decision 6 (the structure decides, the LLM advises); decision 37 (b)

#### Acceptance Criteria

- [ ] AC-019 `[auto]`: the analysis result has `findings` (structural, then brief) and `review` with `status`, `findings` and `dropped`.
- [ ] AC-020 `[auto]`: when the review fails for any reason (no model, a thrown error, a reply that is not JSON, a reply that is not an array, a reply stopped at `max_tokens`), the structural and brief findings are still returned in full, and `review.findings` is empty.
- [ ] AC-021 `[auto]`: a valid reply gives review status `ok`, even when it has no entries or every entry was dropped.
- [ ] AC-022 `[auto]`: the analysis does not change the config. The config is equal before and after the call, and no review entry carries a change to the process.
- [ ] AC-023 `[auto]`: the structural findings in the result are the same, in the same order, as `analyzeStructure` returns for the same pipeline.

### US-005: The brief is not stored or logged

**As a** user
**I want to** know that the brief I send is not kept or written to a log
**So that** I can use the analysis without a record of my project being kept

**Requirements:** features.md F-06 ("the brief is not stored or logged"); architecture §4 (privacy); decision 12 (log lines carry the event, route and status only)

#### Acceptance Criteria

- [ ] AC-024 `[auto]`: the analysis writes no file and keeps no state between calls. Two calls with different configs each return only their own findings.
- [ ] AC-025 `[auto]`: the log lines of an analysis carry the event and the status only. With a sentinel idea text in the brief, the sentinel appears in no log line on the success path or on any failure path.
- [ ] AC-026 `[auto]`: the message of a thrown model error is not logged and not put in the result. A model error that contains the sentinel text leaves the sentinel out of the log lines and the result.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| Structural findings of F-03 are included in the analysis | AC-019, AC-023 |
| LLM review returns advice only; findings never change the config | AC-015, AC-021, AC-022 |
| Review findings are validated and capped | AC-011, AC-012, AC-013, AC-014, AC-016, AC-017, AC-018 |
| Structural findings are returned when the review fails | AC-020 |
| The brief is not stored or logged | AC-024, AC-025, AC-026 |
| Brief checks (§4; decisions 10 and 37 (b)) | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006 |
| Review request, fixed prompt and limits (§4; decision 37 (c), (e)) | AC-007, AC-008, AC-009, AC-010 |
