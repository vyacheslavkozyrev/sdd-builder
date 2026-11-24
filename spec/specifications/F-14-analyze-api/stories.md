# User Stories — Analyze API (F-14)

Feature entry: `spec/documents/features.md` → F-14
Requirements owned by this feature: the F-14 scope in `features.md` (`POST /analyze` takes the configuration, parses it with the F-02 parser, runs the F-06 analysis, returns the findings as JSON; a body that is not JSON gets a 400; a parse refusal gets a 400 with every problem; nothing from the brief is stored or logged); `architecture.md` §3 step 2 and the status codes of `/analyze` (200, 400, 404, 405); §4 (Input, Output, Failure, Privacy, Environment: `ANTHROPIC_API_KEY`, `SDDBUILDER_ANALYZER_MODEL`, `PORT`); decision 12 (log lines carry the event, route and status only); decision 23 (the body is the `schemaVersion` 2 pipeline config). The parse-status answer of 2026-11-24 (owner): a body that fails the parse is a 400, not a 422.

## Out of Scope

- The input caps: the idea at most 5,000 code points and at most 60 rule blocks, with their 422 refusal (F-17; `features.md` lists input caps there, and F-06 places the request caps in F-17).
- The per-client rate limit (429, `Retry-After`), the daily review ceiling and the `skipped` review status (F-17).
- `POST /generate` (F-15). Until F-15, `/generate` answers 404 like any unknown path.
- The browser's call, the Analyze block, the findings view and the failed note (F-13 and F-16).
- The review internals: the prompt, the request, the reply check and the analysis rules (F-06, already built and tested).
- The brief parse rules, the stack keys and the caps of the brief fields (F-02).
- Deployment, HTTPS and any process manager. The server runs on localhost.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-14 AC-003`).

This feature is an enabler: the stories are written for the web app that calls the route (F-13, F-16) and for the user who reads the findings. Every test uses a fake model and the route's own in-memory request (no network port, no real provider call), as the architecture's HTTP tests require.

### US-001: The route returns the analysis of a configuration

**As a** user
**I want to** send my configuration to `/analyze` and get the findings back as JSON
**So that** the analyze step can show me what to fix before I generate

**Requirements:** features.md F-14 (returns the findings as JSON); architecture §3 step 2 (response shape, status 200 for a valid config); §4 Output; decision 10 (one analysis shape); decision 23 (the body is the pipeline config)

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: a `POST /analyze` with a valid `schemaVersion` 2 configuration answers 200 with `Content-Type` `application/json`, and a body `{ findings, review }`, where `review` has `status`, `findings` and `dropped`.
- [ ] AC-002 `[auto]`: the `findings` in the response are the structural findings then the brief findings of the F-06 analysis for the same configuration, in the same order, in the same shape (`severity`, `rule`, `path`, `message`).
- [ ] AC-003 `[auto]`: two requests with the same body and the same fake model give the same response body.
- [ ] AC-004 `[auto]`: a valid configuration with no brief fields gets 200, and the brief blockers for `name`, `idea` and `stack.language` are in `findings`.

### US-002: A body that cannot be read gets a 400 with the reason

**As a** user
**I want to** be told why the configuration was refused
**So that** I can fix the field the message names

**Requirements:** features.md F-14 (a body that is not JSON gets a 400; a parse refusal gets a 400 with every problem); architecture §3 step 2 and §4 Input (a 400 with `<path>: <reason>` problems; a problem may name an unknown key the client sent); decision 23 (a flat `schemaVersion` 1 body is refused with 400); owner answer 2026-11-24 (parse refusal is 400)

#### Acceptance Criteria

- [ ] AC-005 `[auto]`: a body that is not JSON (including an empty body, and `{` alone) gets 400 with an error message and no `problems` list. No model call is made.
- [ ] AC-006 `[auto]`: a JSON body that the pipeline parser refuses gets 400 with `problems`, a list of strings in the form `<path>: <reason>`, with every problem the parser reports, in the parser's order. No model call is made.
- [ ] AC-007 `[auto]`: a flat `schemaVersion` 1 body gets 400, and the message names the version the route accepts. No model call is made.
- [ ] AC-008 `[auto]`: an unknown key the client sent is named by its path in a problem, and the value of that key is not repeated in the reply.
- [ ] AC-009 `[auto]`: a 400 reply contains no text from the brief: with a sentinel idea text in the body, the sentinel appears in no 400 reply, including a body with a parse problem elsewhere in the config.

### US-003: Other paths and methods are refused

**As a** developer
**I want to** get the right status for a wrong path or method
**So that** a client can tell a missing route from a bad request

**Requirements:** architecture §3 (unknown paths give 404; any other method on `/analyze` or `/generate` gives 405 with `Allow: POST`); §3 (`/generate` is F-15, so until then it is an unknown path)

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: `GET`, `PUT`, `PATCH` and `DELETE` on `/analyze` each answer 405 with the header `Allow: POST`, and make no model call.
- [ ] AC-011 `[auto]`: `POST /generate` and any other path answer 404 and make no model call, because `/generate` is built in F-15.
- [ ] AC-012 `[auto]`: a request with a method other than `POST` to an unknown path answers 404, not 405.

### US-004: A failed review is reported in the result, not as an error

**As a** user
**I want to** keep the structural findings when the model fails
**So that** a provider problem does not hide the checks I can rely on

**Requirements:** features.md F-14 (runs the F-06 analysis); architecture §4 Failure (the review status is `failed`; the structural findings are still returned); decision 37 (c) (one review call per analysis, no retry)

#### Acceptance Criteria

- [ ] AC-013 `[auto]`: with no model configured (no `ANTHROPIC_API_KEY`), a valid configuration answers 200 with `review.status` `failed`, `review.findings` empty and `dropped` 0, and the structural findings in full.
- [ ] AC-014 `[auto]`: a model call that throws answers 200 with `review.status` `failed`, and the thrown message appears in no part of the response.
- [ ] AC-015 `[auto]`: a model reply that is not JSON answers 200 with `review.status` `failed`.
- [ ] AC-016 `[auto]`: a valid reply answers 200 with `review.status` `ok`, and its entries are the entries `checkReview` keeps (a model `blocker` is returned as `warning`).
- [ ] AC-017 `[auto]`: one request makes at most one model call, and a throwing call is not retried.

### US-005: An unexpected error gets a generic 500

**As a** user
**I want to** see a plain error when the server fails in a way the route did not expect
**So that** no internal detail or brief content reaches my screen

**Requirements:** architecture §3 (500 unexpected error, generic message); §4 Failure (the error text of a model call is never returned); decision 12 (log lines carry the event, route and status only)

#### Acceptance Criteria

- [ ] AC-018 `[auto]`: when the analysis throws an error outside the model call, the route answers 500 with a generic message, and the text of the error appears in no part of the response.
- [ ] AC-019 `[auto]`: the 500 reply is JSON with the same `error` field the 400 replies use.

### US-006: Startup reads the environment and refuses a bad port

**As a** developer
**I want to** start the server with the settings from its environment
**So that** a bad setting stops startup with a clear message, and a missing key only disables the review

**Requirements:** architecture §4 Environment (`ANTHROPIC_API_KEY`, server only; `SDDBUILDER_ANALYZER_MODEL`, default `claude-sonnet-5-5`; `PORT`, default 3000, a value that is not a whole number from 1 to 65535 stops startup); §4 Failure (a missing key gives a failed review and a log line that names the cause, never the value)

#### Acceptance Criteria

- [ ] AC-020 `[auto]`: with `PORT` unset the listen port is 3000; with `PORT` set to `8080` it is 8080; with `PORT` set to `1` or `65535` it is accepted.
- [ ] AC-021 `[auto]`: `PORT` set to `0`, `65536`, `80.5`, `abc`, a negative number or an empty string stops startup, and the error names `PORT` only.
- [ ] AC-022 `[auto]`: with `SDDBUILDER_ANALYZER_MODEL` unset the model is `claude-sonnet-5-5`; when set, the model is the value given.
- [ ] AC-023 `[auto]`: with `ANTHROPIC_API_KEY` unset, startup succeeds, and the analysis runs with no model (AC-013). The startup log line names the missing key and not its value.
- [ ] AC-024 `[auto]`: the value of `ANTHROPIC_API_KEY` appears in no response and no log line, with a sentinel key set.

### US-007: The brief is not stored or logged

**As a** user
**I want to** know that my brief is not kept or written to a log
**So that** the analysis leaves no record of my project

**Requirements:** features.md F-14 (nothing from the brief is stored or logged); architecture §4 Privacy; decision 12 (log lines carry the event, route and status only)

#### Acceptance Criteria

- [ ] AC-025 `[auto]`: with a sentinel idea text in the body, the sentinel appears in no log line on the success path, on a 400, on a 405 or on a 500.
- [ ] AC-026 `[auto]`: each log line of a request carries the event, the route and the status, and no other field.
- [ ] AC-027 `[auto]`: a request writes no file and keeps no state. Two requests with different briefs each return only their own findings.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| `POST /analyze` takes the configuration and returns the findings as JSON (features.md F-14) | AC-001, AC-002, AC-003, AC-004 |
| A body that is not JSON gets a 400 (features.md F-14) | AC-005 |
| A parse refusal gets a 400 with every problem (features.md F-14; owner answer 2026-11-24) | AC-006, AC-007, AC-008, AC-009 |
| Other methods give 405 with `Allow: POST`; unknown paths give 404 (architecture §3) | AC-010, AC-011, AC-012 |
| The model's failure is reported in the result; structural findings kept (architecture §4 Failure) | AC-013, AC-014, AC-015, AC-016, AC-017 |
| Unexpected errors give a generic 500 (architecture §3) | AC-018, AC-019 |
| Environment: `PORT`, `SDDBUILDER_ANALYZER_MODEL`, `ANTHROPIC_API_KEY` (architecture §4 Environment) | AC-020, AC-021, AC-022, AC-023, AC-024 |
| Nothing from the brief is stored or logged (features.md F-14; architecture §4 Privacy; decision 12) | AC-025, AC-026, AC-027 |
