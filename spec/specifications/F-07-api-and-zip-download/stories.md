# User Stories — API: analyze and generate, zip download (F-07)

Feature entry: `spec/documents/features.md` → F-07
Requirements owned by this feature: none (SDDBuilder has no requirement IDs; scope items S1–S7 are listed in the Requirement Coverage table)
Depends on: F-02 (generator, `planGeneration`, `generate`), F-03 (layouts and the plan), F-04 (`analyze`, `checkReview`, the review prompt and the Anthropic adapter)
Reads: `spec/documents/architecture.md` §2, §3, §4 and §6 (decisions 2, 6, 7, 10), `spec/documents/idea.md` (privacy of the brief)

## Scope (from features.md)

The `features.md` entry: "`POST /analyze` and `POST /generate`. Generation returns a zip with the file tree. Stateless. Input is validated against the model."

- S1: `POST /analyze` takes a configuration, runs `analyze` from F-04 and returns the result.
- S2: `POST /generate` takes a configuration and returns a zip of the generated project.
- S3: input is validated against the model before anything else runs (JSON parse, then the shape of `ProjectConfig`).
- S4: the generated file contents are written by the LLM from the plan (`architecture.md` §3, step 5), and each reply is checked with `checkReply` (F-03), with one retry.
- S5: the zip is built in memory and is deterministic: the same files give the same entries, paths, order and bytes.
- S6: stateless and private: nothing is stored between requests, and the brief and the reply text are never logged.
- S7: a fixed set of status codes and one error body shape for every failure.

## Design decisions in this spec

These are the defaults chosen in the specify step. Each one is covered by an acceptance criterion; changing one means changing its criteria and recording it in `architecture.md` §5 before code depends on it.

- **HTTP framework: Hono**, served on Node. Tests call the app directly (`app.request`), with no port and no network, so the HTTP tests stay deterministic. (`architecture.md` §5 leaves this to F-07.)
- **Zip library: JSZip**, in memory. Every entry carries one fixed timestamp, so the bytes depend only on the files. (`architecture.md` §5 leaves this to F-07.)
- **Shape check in `packages/core`.** A new pure function `parseProjectConfig(value: unknown)` returns either the typed `ProjectConfig` or a list of problems. Each problem names the field path and the reason, never the submitted value. Core has no such parser today, and `apps/api` must not hold its own copy of the model.
- **One generation call per request.** The model receives the whole plan and returns one JSON object that maps each planned path to its text. That is the shape `checkReply` takes. A reply cut off by the provider's length limit is a failed reply.
- **One retry for a failed reply.** The retry prompt is the original prompt plus the findings of the first reply. A second failure ends the request. Provider errors (throw, timeout) are not retried by F-07; the Anthropic SDK's own retries stay inside the adapter.
- **Missing key.** `/analyze` still answers with the structural findings and `review.status` `failed`. `/generate` answers 503, because it cannot produce files without the model.
- **Status codes.** 400: the body is not JSON or is not a `ProjectConfig`. 422: the configuration is refused by the structural rules. 502: the model failed (provider error, or a reply that failed the check after its retry). 503: generation is not configured on the server. 500: an unexpected error. 200: an analysis, or a zip.
- **Zip name.** Fixed: `sddbuilder-project.zip`. The project name is not used in the file name.
- **Routes.** `POST /analyze` and `POST /generate`. The request body is the `ProjectConfig` itself, as JSON.

## Out of Scope

- The per-client rate limit, the daily ceiling on model calls, the request size cap and the budget (F-13).
- The privacy notice and the Analyze and Generate buttons in the browser (F-05, F-06).
- Checking the generated files for paths that do not exist (F-10).
- Other targets: GitHub Spec Kit, OpenSpec, Cursor, Copilot (`architecture.md` §8, F-11 onward).
- Saved projects, import and export of a configuration (F-08).
- Streaming the model reply, a health endpoint, and a web-server deployment (hosting, same-origin routing or CORS) — decided with the deployment, not in this feature.
- A second retry, or a retry on a provider error, beyond the rule above.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-07 AC-003`).

### US-001: Analyze a process over HTTP

**As a** user
**I want to** send my process to the server and get the analysis back
**So that** I see the structural findings and the review in one response

**Requirements:** none

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: `POST /analyze` with a valid `ProjectConfig` returns 200 and a JSON body equal to the result of `analyze(config, model)` for the same configuration and model.
- [ ] AC-002 `[auto]`: a body that is not JSON returns 400 with an `error` naming invalid JSON, and the model is not called.
- [ ] AC-003 `[auto]`: a JSON body that is not a `ProjectConfig` returns 400 and lists every problem, one per field path. Table-driven cases: missing `name`, `schemaVersion` other than 1, an unknown target tool, a step `enabled` that is not a boolean, a workflow `steps` that is not an array. The problems name the path and the reason, never the submitted value. The model is not called.
- [ ] AC-004 `[auto]`: a valid shape with a configuration the structural rules refuse (for example a duplicate id) returns 200 with the refusals as `blocker` findings. A refusal is not an HTTP error.
- [ ] AC-005 `[auto]`: when the model throws, times out, or replies with text that is not JSON, `/analyze` returns 200 with `review.status` `failed`, no review findings, and the structural findings.
- [ ] AC-006 `[auto]`: with `ANTHROPIC_API_KEY` unset, `/analyze` returns 200 with `review.status` `failed` and the structural findings. The server logs one line that names the variable and never its value.

### US-002: Generate a project zip over HTTP

**As a** user
**I want to** download the generated project as one zip
**So that** I can unpack it into a repository

**Requirements:** none

#### Acceptance Criteria

- [ ] AC-007 `[auto]`: `POST /generate` with a valid configuration and a reply that passes `checkReply` returns 200 with `Content-Type: application/zip` and `Content-Disposition: attachment; filename="sddbuilder-project.zip"`.
- [ ] AC-008 `[auto]`: the zip holds exactly the files of the plan, at the planned paths, in plan order, and each file's content equals the reply text for its path (read back from the zip in the test).
- [ ] AC-009 `[auto]`: two generations from the same configuration and the same fake reply give byte-identical zips.
- [ ] AC-010 `[auto]`: a configuration that `generate` refuses returns 422 with every problem listed. The model is not called and no zip is returned.
- [ ] AC-011 `[auto]`: `/generate` applies the same input rules as `/analyze`: a body that is not JSON returns 400 with `error`, and a body that is not a `ProjectConfig` returns 400 with `problems`. The model is not called (table-driven, both endpoints).

### US-003: Model replies are checked before they reach the zip

**As a** user
**I want to** get only files that pass the check
**So that** a broken or partial reply never becomes part of my project

**Requirements:** none

#### Acceptance Criteria

- [ ] AC-012 `[auto]`: a reply that fails `checkReply` triggers exactly one retry, and the retry prompt contains each finding of the first reply.
- [ ] AC-013 `[auto]`: a reply that fails on the first call and passes on the retry returns 200 with the zip, after exactly two model calls.
- [ ] AC-014 `[auto]`: a reply that fails on both calls returns 502 with `problems` listing the findings of the last reply. No zip is returned and the model was called exactly twice.
- [ ] AC-015 `[auto]`: a reply that is not JSON, is a JSON value that is not an object, or maps a path to a non-text value counts as a failed reply and takes the same single retry (table-driven).
- [ ] AC-016 `[auto]`: a reply cut off by the provider's length limit counts as a failed reply. Its partial text is never parsed or packaged.
- [ ] AC-017 `[auto]`: when the model throws or times out on the first call, `/generate` returns 502 with no retry by F-07 and no zip.
- [ ] AC-018 `[auto]`: with `ANTHROPIC_API_KEY` unset, `/generate` returns 503 with an `error` saying generation is not configured on this server. The model is not called and no zip is returned.
- [ ] AC-019 `[auto]`: the 502 body carries findings and paths only. It never carries file text from a failed reply.

### US-004: The zip is deterministic

**As a** developer
**I want to** get the same zip for the same input
**So that** the output can be compared and tested

**Requirements:** none

#### Acceptance Criteria

- [ ] AC-020 `[auto]`: the zip holds only file entries (no folder entries), and its entry count equals the number of files in the plan.
- [ ] AC-021 `[auto]`: every entry carries the same fixed timestamp, and the zip bytes do not change when the clock is set to a different date (fake timers in the test).

### US-005: The server is stateless and keeps the brief private

**As a** user
**I want to** know that the server keeps nothing from my brief
**So that** the privacy notice I see before analysis is true

**Requirements:** none

#### Acceptance Criteria

- [ ] AC-022 `[auto]`: two requests in a row with different configurations each return results for their own configuration only; nothing from the first request is visible in the second.
- [ ] AC-023 `[auto]`: a request writes no file and no database row. The test spies on the file system during a request and finds no write.
- [ ] AC-024 `[auto]`: for a successful and for a failed request, the captured log output contains neither the brief text (`idea`, names, rules) nor the reply text nor the request body.

### US-006: Routes and errors have one shape

**As a** developer of the browser app
**I want to** read every error the same way
**So that** the builder can show it without special cases

**Requirements:** none

#### Acceptance Criteria

- [ ] AC-025 `[auto]`: an unknown path returns 404 with a JSON body; a `GET` on `/analyze` or `/generate` returns 405 with `Allow: POST`.
- [ ] AC-026 `[auto]`: every error response is JSON with `error` (a string), and `problems` (an array of strings) where there are problems. No response carries a stack trace or a server file path.
- [ ] AC-027 `[auto]`: an unexpected exception inside a handler returns 500 with a generic `error`. The response carries no text from the exception, and the log records the error's name only.
- [ ] AC-028 `[auto]`: the value of `ANTHROPIC_API_KEY` never appears in a response body or a log line, across success, each error status, and the missing-key path.
- [ ] AC-029 `[device]`: with a real key, one `/generate` call from a terminal returns a zip whose unpacked files read as a usable Claude Code project (`CLAUDE.md`, `spec/documents/process.md`, the workflow command and its step files), and nothing refers to SDDBuilder.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| S1 `POST /analyze` runs `analyze` and returns the result | AC-001, AC-004, AC-005, AC-006 |
| S2 `POST /generate` returns a zip of the generated project | AC-007, AC-008, AC-010, AC-029 |
| S3 input validated against the model before anything runs | AC-002, AC-003, AC-011 |
| S4 LLM writes the files; reply checked; one retry | AC-012, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018, AC-019 |
| S5 zip built in memory, deterministic | AC-008, AC-009, AC-020, AC-021 |
| S6 stateless and private | AC-022, AC-023, AC-024, AC-028 |
| S7 status codes and one error shape | AC-010, AC-011, AC-025, AC-026, AC-027, AC-028 |
