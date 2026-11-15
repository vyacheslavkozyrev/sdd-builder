# User Stories — API: analyze and generate, zip download (F-07)

Feature entry: `spec/documents/features.md` → F-07
Requirements owned by this feature: R-01 to R-05 (listed in the Requirement Coverage table)

## Out of Scope

- The wizard's step 4 (the Analyze and Generate buttons, the privacy notice, the file tree view and the Download zip button). They are F-05. The web app is not changed in F-07.
- The web app's flat brief model. `source/packages/core/src/model.ts`, `parse-config.ts` and `catalog.ts` stay for the web app until F-05 rebuilds it, so the web tests and type check stay green.
- Save, import and export of projects (F-08).
- Spec Kit and OpenSpec outputs (F-16, F-17). Only the Claude Code layout is generated.
- Changes to the review route beyond what F-04 already did. `/analyze` is on the pipeline model since F-04, and its tests stay as they are.
- The daily review ceiling, the per-client limits and the budget. They are F-13. F-07 keeps the limits that exist today and checks that the generation path uses them.
- Changes to the default pipeline, the templates or the generator in `source/packages/core/src/pipeline/`. F-02 and F-03 are complete; F-07 only calls them.
- A real model call in tests. Every test uses a fake generation model with fixed replies. The Anthropic adapter is not changed.

---

## Decisions taken in this specification (the owner is asked to approve them)

- **Pipeline config only on `/generate` (owner, 2026-11-15).** `/generate` takes the `schemaVersion` 2 pipeline config, like `/analyze`. A flat `schemaVersion` 1 body is refused with 400. No client depends on the flat shape, because the web app is rebuilt in F-05.
- **The flat generator is removed in this feature (architecture decision 19).** Its route, its flat planning and reply check, and its flat template layouts go with the rebuild, in the same feature. The flat model stays only where the web app still imports it, until F-05.
- **A duplicate output path is a server error, not a refusal.** The generator already refuses two files with one path (F-02). The route reports it as an unexpected error with the generic 500 message, because a duplicate is a bug in the pipeline code, not a fault in the user's configuration.
- **Limits, retries and status codes are not re-decided.** They are architecture §3 and decisions 11 and 12, as written. This feature implements them on the pipeline model.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-07 AC-003`).

This feature has no user interface, so no UX screens are needed (`➖ Not needed`). Every criterion is `[auto]`: the route is tested over HTTP with a fake generation model and fixed templates, and the generator is pure logic in `source/packages/core/src/pipeline/`.

### US-001: `/generate` reads the pipeline config and refuses anything else

**As a** developer
**I want to** have `/generate` read the same pipeline config that `/analyze` reads
**So that** the wizard sends one shape, and a body that does not fit it is refused before any model call.

**Requirements:** R-01, R-04

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: `POST /generate` with a valid `schemaVersion` 2 pipeline config and a fake model that returns a valid reply gives 200 with a zip (the zip content is in AC-009 and AC-014).
- [ ] AC-002 `[auto]`: `POST /generate` with a flat `schemaVersion` 1 body gives 400 with a problem that names `schemaVersion`, and the model is not called.
- [ ] AC-003 `[auto]`: A body that is not JSON gives 400 with an error only, and the model is not called.
- [ ] AC-004 `[auto]`: A body that fails `parsePipelineConfig` gives 400 with one `<path>: <reason>` problem per failure, and the model is not called.
- [ ] AC-005 `[auto]`: A body with an unknown key gives 400 that names the key's path, and the model is not called.

---

### US-002: Refusals and input caps stop the request before any model call

**As a** project owner
**I want to** see every problem of my process at once, and no model call for a process that cannot be generated
**So that** I fix the whole list in one pass and do not pay for a call that is refused.

**Requirements:** R-05

#### Acceptance Criteria

- [ ] AC-006 `[auto]`: A configuration that `configProblems` refuses gives 422 with every problem as `<path>: <message>`, in path then message order. The model is not called, and the request does not count toward the generation ceiling. A table test covers at least a rule tag that names no rule, a Condition whose fail route names no block, and a block with no description.
- [ ] AC-007 `[auto]`: A body over the input caps (an idea longer than 8,000 characters, or more than 60 rule blocks) gives 422 with one `<path>: <reason>` line for each exceeded cap. The response never contains the submitted text, and the model is not called.

---

### US-003: One model call for the whole plan, one retry for a bad reply

**As a** developer
**I want to** have the generation call write every planned file in one reply, checked before it reaches the zip
**So that** the zip holds exactly the files the generator planned, and a bad reply gets one more try.

**Requirements:** R-02, R-05

#### Acceptance Criteria

- [ ] AC-008 `[auto]`: A valid request makes exactly one model call, and its input contains every path of the plan from `planGeneration`.
- [ ] AC-009 `[auto]`: A reply that is one JSON object mapping each planned path to its text, and that passes `checkReply`, gives 200 with a zip whose entries are exactly the planned paths, in plan order, with the text of the reply.
- [ ] AC-010 `[auto]`: A first reply that is not JSON, or that fails `checkReply`, makes exactly one retry whose prompt lists the first findings. A valid retry gives 200.
- [ ] AC-011 `[auto]`: A reply that fails on both calls gives 502 with `problems` (the findings and the paths only). The body contains no file text.
- [ ] AC-012 `[auto]`: A provider error or timeout on the first call gives 502 after exactly one model call. There is no retry for a provider error.
- [ ] AC-013 `[auto]`: With no generation model configured, `/generate` gives 503 and makes no model call.

---

### US-004: The zip is a stable, self-contained download

**As a** user
**I want to** download one zip that holds the Claude Code framework files, in the same bytes for the same input
**So that** I can save it, compare it and trust that its files are the ones the generator planned.

**Requirements:** R-02

#### Acceptance Criteria

- [ ] AC-014 `[auto]`: A 200 response has `Content-Type: application/zip` and `Content-Disposition: attachment; filename="sddbuilder-project.zip"`. The zip holds file entries only, in plan order, DEFLATE-compressed, each dated 2020-01-01 00:00 UTC.
- [ ] AC-015 `[auto]`: The same configuration and the same fake reply give byte-identical zips on two requests.
- [ ] AC-016 `[auto]`: Two planned files with one path are never zipped. The request gives 500 with the generic message, and the response holds no zip and no exception text.

---

### US-005: Nothing the user sends is stored or logged

**As a** user who shares a brief
**I want to** know that the server keeps no copy of my brief, my rules or the model's reply
**So that** the privacy notice in the wizard is true.

**Requirements:** R-03

#### Acceptance Criteria

- [ ] AC-017 `[auto]`: Every log line written by `/generate` carries only the event, the route and the status. A test with an idea text, a rule text and a model reply in the request finds none of them in any log line, for a 200, a 422 and a 502.
- [ ] AC-018 `[auto]`: The generate path (`source/apps/api/src/generate/` and the route) imports no file-system, network or process-environment module except the configuration read at start-up. A static test over the source files fails when one is added.

---

### US-006: Routing, errors and the shared limits

**As a** developer
**I want to** have the same method, error and limit rules on `/generate` as on `/analyze`
**So that** the two routes behave the same to a client and the abuse limits cannot be bypassed by a route.

**Requirements:** R-05

#### Acceptance Criteria

- [ ] AC-019 `[auto]`: An unknown path gives 404. Any method other than `POST` on `/analyze` or `/generate` gives 405 with `Allow: POST`. Neither adds to the per-client count.
- [ ] AC-020 `[auto]`: An unexpected error inside the generate path gives 500 with the generic message and no exception text.
- [ ] AC-021 `[auto]`: `/analyze` and `/generate` share one per-client count. The 11th accepted request within a minute gives 429 with `Retry-After` in whole seconds. A request refused by a cap or by the per-client limit does not add to the count.
- [ ] AC-022 `[auto]`: At the generation daily ceiling (`SDDBUILDER_GENERATE_DAILY_LIMIT`), `/generate` gives 429 with the error body and makes no model call. A model call that fails still counts toward the ceiling; a 422 refusal does not.

---

### US-007: The flat generator is removed

**As a** maintainer
**I want to** have one generator and one route for generation
**So that** a change to the process is never generated by the old code by mistake.

**Requirements:** R-01

#### Acceptance Criteria

- [ ] AC-023 `[auto]`: A static test fails when any module under `source/apps/api/src/` imports the flat generator (its flat `generate`, `planGeneration`, `checkReply` or `validateConfig`) from `@sddbuilder/core`. The pipeline names (`pipeline.generate`, `pipeline.planGeneration`, `pipeline.checkReply`) are the only ones allowed.
- [ ] AC-024 `[auto]`: The flat generator and its flat template layouts are removed from `source/packages/core/src/` and `source/templates/`. A test fails when a removed file comes back or when a removed export is named again in the core root.
- [ ] AC-025 `[auto]`: The web app's type check and its tests pass without any change to the web app, because the flat model it still imports stays until F-05.

---

## Requirement Coverage

| Requirement | Scope item (`features.md` F-07) | Covered by |
|---|---|---|
| R-01 | `POST /analyze` and `POST /generate` on the pipeline model | AC-001, AC-002, AC-023, AC-024 |
| R-02 | Generation returns a zip with the file tree | AC-001, AC-008, AC-009, AC-010, AC-014, AC-015, AC-016 |
| R-03 | Stateless: nothing stored, nothing logged | AC-011, AC-017, AC-018 |
| R-04 | Input is validated against the model | AC-001, AC-003, AC-004, AC-005 |
| R-05 | Refusals, caps, limits and status codes of §3 and decisions 11 and 12 | AC-006, AC-007, AC-010, AC-011, AC-012, AC-013, AC-019, AC-020, AC-021, AC-022, AC-025 |
