# User Stories — Generate and Download API (F-15)

Feature entry: `spec/documents/features.md` → F-15
Requirements owned by this feature: R-15-1 (the zip reply), R-15-2 (the refusal of a configuration), R-15-3 (no state kept between requests). The decisions it implements: architecture §3 (decision 11 and decision 7), decision 23 (`/generate` takes the pipeline config), decision 41 (the content is written by the model at generation).

## Out of Scope

- Rate limits, the daily generation ceiling and the input caps (idea length, rule count): F-17 (post MVP). This feature returns no 429 and checks no cap.
- The analysis that the user runs before Generate, and the Generate button's enabled state: F-13 and F-16. `/generate` does not check that an analysis ran.
- The web app's call to `/generate`, the progress state and the file download in the browser: F-16.
- Real provider calls in tests: every test uses a fake model (qa rules).
- Writing any file to the server's disk, storing a generated project, or a cache between requests.
- Retries of a provider error (a throw, timeout or rate limit fails after one call), streaming of the reply, and output formats other than the zip (GitHub Spec Kit and OpenSpec are post MVP).
- Changes to the structural rules, the generator templates or the reply checks: F-03, F-04, F-05.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-15 AC-003`).

### US-001: Download the generated project as a zip

**As a** user
**I want to** send my configuration to `POST /generate` and receive the framework as a zip
**So that** I can unpack the Claude Code project and use it

**Requirements:** R-15-1

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: a valid configuration gets 200 with `Content-Type: application/zip` and `Content-Disposition: attachment; filename="sddbuilder-project.zip"`.
- [ ] AC-002 `[auto]`: the zip holds the file entries of the generation plan, each at its planned path and with the text the model wrote, and no directory entries.
- [ ] AC-003 `[auto]`: the entries are in plan order, compressed with DEFLATE, and each carries the fixed date 2020-01-01 00:00 UTC.
- [ ] AC-004 `[auto]`: the same configuration and the same model reply give the same zip bytes on two requests.
- [ ] AC-005 `[auto]`: a configuration with warnings only (no blocker) is generated and gets 200.

---

### US-002: Refuse a configuration that cannot be generated

**As a** user
**I want to** be told every problem in my configuration when it cannot be generated
**So that** I can fix them all in one step

**Requirements:** R-15-2

#### Acceptance Criteria

- [ ] AC-006 `[auto]`: a configuration with one or more blockers (the problems of `configProblems`) gets 422 with `problems` listing every blocker as `<path>: <reason>`, in the order `configProblems` returns them.
- [ ] AC-007 `[auto]`: a 422 reply has no zip, no file text and no `files` field.
- [ ] AC-008 `[auto]`: a refused configuration makes no model call (the fake model records zero calls).
- [ ] AC-009 `[auto]`: a configuration that has a blocker and no model key still gets 422, not 503 (the refusal is checked first).
- [ ] AC-010 `[auto]`: a configuration whose plan cannot be built gets 422 with the same problems as the refusal gate; no file is planned or rendered.

---

### US-003: Reject a body that is not a pipeline configuration

**As a** developer calling the API
**I want to** get a clear 400 for a body that is not a valid pipeline configuration
**So that** a malformed request never reaches the generator

**Requirements:** R-15-2

#### Acceptance Criteria

- [ ] AC-011 `[auto]`: a body that is not JSON gets 400 with `{ error }` and no model call.
- [ ] AC-012 `[auto]`: a JSON body that fails the pipeline parser (`parseProjectConfig`) gets 400 with `problems` as `<path>: <reason>`, and names an unknown key the client sent.
- [ ] AC-013 `[auto]`: a flat `schemaVersion` 1 body gets 400 and no model call.
- [ ] AC-014 `[auto]`: an empty body gets 400 with `{ error }`.

---

### US-004: Write the whole project with one model call, checked before it is returned

**As a** user
**I want to** get files that match the plan, checked before I download them
**So that** a poor model reply never reaches my zip

**Requirements:** R-15-1

#### Acceptance Criteria

- [ ] AC-015 `[auto]`: one generation call is made for the whole plan. The prompt holds the block descriptions, the process and the template layout for every planned path.
- [ ] AC-016 `[auto]`: the model reply must be one JSON object mapping each planned path to a text. A reply that is not such an object is a failed reply.
- [ ] AC-017 `[auto]`: a reply that fails `parseReply` or `checkReply` gets exactly one retry. The retry's prompt lists the findings of the first reply.
- [ ] AC-018 `[auto]`: when the retry's reply is good, the request answers 200 with the zip built from that reply.
- [ ] AC-019 `[auto]`: when the second reply also fails, the request answers 502 with `problems` (findings and paths only) and never returns file text.
- [ ] AC-020 `[auto]`: a provider error (a throw from the model) on the first call answers 502 after one call; no retry is made.
- [ ] AC-021 `[auto]`: the generation call is made with `max_tokens` 32000 and a client timeout of 300 seconds (both fixed constants, checked on the fake client's options).

---

### US-005: Report a missing generation model and keep the key server-side

**As an** operator
**I want to** see a clear 503 when the generation model is not configured, and no key in any reply or log
**So that** the key never leaves the server

**Requirements:** R-15-2, R-15-3

#### Acceptance Criteria

- [ ] AC-022 `[auto]`: with no `ANTHROPIC_API_KEY` a valid configuration gets 503 with `{ error }` and no model call.
- [ ] AC-023 `[auto]`: `SDDBUILDER_GENERATOR_MODEL` sets the model of the generation call; when it is unset or blank the model is `claude-opus-5-5`.
- [ ] AC-024 `[auto]`: no reply, error body or log line contains the key value, the model reply or any file text.

---

### US-006: Keep the route to its contract

**As a** developer calling the API
**I want to** get a fixed status for every route and method, and a generic 500 for an unexpected failure
**So that** no internal detail leaks and clients can rely on the codes

**Requirements:** R-15-1, R-15-3

#### Acceptance Criteria

- [ ] AC-025 `[auto]`: a `GET` on `/generate` gets 405 with `Allow: POST`, and no model call.
- [ ] AC-026 `[auto]`: an unknown path (for example `/generate/x`) gets 404 with `{ error }`.
- [ ] AC-027 `[auto]`: an unexpected error (a throw from the generator, such as a duplicate output path) gets 500 with the generic message `Internal error` and no exception text.
- [ ] AC-028 `[auto]`: a request writes no file on the server and leaves no state behind: a second request with the same body behaves the same as the first.
- [ ] AC-029 `[auto]`: each request writes one log line with `route=/generate`, `event` and `status` only, with no brief text, idea text or file text.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| R-15-1 — `POST /generate` runs the generator with the model's content and returns the zip `sddbuilder-project.zip` in the response | AC-001, AC-002, AC-003, AC-004, AC-005, AC-015, AC-016, AC-017, AC-018, AC-019, AC-020, AC-021, AC-025 |
| R-15-2 — a refused configuration gets a 422 that lists every problem | AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013, AC-014, AC-022 |
| R-15-3 — nothing is kept between requests | AC-024, AC-028, AC-029, AC-026, AC-027 |
