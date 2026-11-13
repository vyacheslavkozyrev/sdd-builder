# User Stories — Abuse, cost and privacy controls (F-13)

Feature entry: `spec/documents/features.md` → F-13
Requirements owned by this feature: none yet (scope items of F-13 in `features.md`: per-client rate limit; input caps; daily ceiling; timeout and output limits; no brief content in logs or error reports)

## Out of Scope

- The privacy notice shown before analysis, and the Analyze button that waits for it. Belongs to F-05.
- Accounts, authentication or per-user quotas. The service stays anonymous.
- Counters that survive a restart or are shared between server instances. Both are in memory by design (architecture §5).
- Trusting forwarded-address headers (`X-Forwarded-For`) to identify a client. Deferred until the service runs behind a known proxy.
- Money amounts or per-token pricing. Ceilings are counted in calls, not in currency.
- Browser display of limits or remaining quota. Belongs to F-05 and F-06.
- Changes to the review or generation prompts. Only the limits around the calls are in scope.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-13 AC-003`).

Limits used in the criteria (set by the owner on 2026-11-13):

- Per client address: 10 requests per minute and 100 per UTC day, counted across `/analyze` and `/generate` together.
- Input caps: idea text 8,000 characters; 12 modules; 60 rules (code rules and test rules together).
- Daily ceilings (per UTC day, in memory): 500 review calls; 50 generation calls.
- Timeouts and output limits: review 60 s and `max_tokens` 8192; generation 300 s and `max_tokens` 32000 (existing values, `GENERATION_TIMEOUT_MS` and `GENERATION_MAX_TOKENS`).

Refusals from these controls use the existing error shape (`errorBody`). Each refusal happens before any model call.

### US-001: Per-client rate limit

**As a** developer
**I want to** limit how often one client address can call the two routes that cost money
**So that** one script cannot spend the service's model budget

**Requirements:** F-13 scope: per-client rate limit

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: A client that sends 10 requests within one minute gets 200 (or the route's normal answer) on each. The 11th gets 429 with a `Retry-After` header in whole seconds and the error body.
- [ ] AC-002 `[auto]`: The 100-per-day limit applies per client: the 101st request of a UTC day gets 429 even when the minute window has reset.
- [ ] AC-003 `[auto]`: Limits are per client address. A second address has its own counts and is not affected by the first.
- [ ] AC-004 `[auto]`: One count covers `/analyze` and `/generate` together. Requests on both routes are added to the same client total.
- [ ] AC-005 `[auto]`: A rate-limited request is refused before its body is read and before any model call. A fake model records zero calls.
- [ ] AC-006 `[auto]`: The clock is injected. Tests move the minute window and the day boundary with fixed times; no test reads the wall clock. At the window boundary the minute count resets.
- [ ] AC-007 `[auto]`: Requests that are not `POST` (405) or that go to unknown paths (404) do not count toward any limit.
- [ ] AC-008 `[auto]`: The client address is the connection's remote address. A forwarded-address header from the request does not change which client is counted.
- [ ] AC-009 `[auto]`: Expired entries are removed from the in-memory table, so it does not grow with the number of past clients.

### US-002: Input caps before any model call

**As a** developer
**I want to** reject oversized briefs before they reach the model
**So that** one request cannot send an unbounded prompt

**Requirements:** F-13 scope: input caps

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: An idea text of exactly 8,000 characters is accepted. One of 8,001 characters is refused with 422 on both `/analyze` and `/generate`, and the model is not called.
- [ ] AC-011 `[auto]`: 12 modules are accepted. 13 modules are refused with 422 before any model call.
- [ ] AC-012 `[auto]`: 60 rules (code rules and test rules counted together) are accepted. 61 are refused with 422 before any model call.
- [ ] AC-013 `[auto]`: Length is counted as the JavaScript string length of the idea text as submitted, with no trimming.
- [ ] AC-014 `[auto]`: A refusal lists every cap that is exceeded, in a fixed order, as `<path>: <reason>` problems, and never includes any submitted text.
- [ ] AC-015 `[auto]`: The caps are defined once and used by both routes; a test fails if one route checks a different value.

### US-003: Daily ceilings on paid calls

**As a** developer
**I want to** stop paid calls once a daily ceiling is reached
**So that** the monthly cost of the service has a fixed upper bound

**Requirements:** F-13 scope: daily ceiling; architecture §5 (spending ceiling is a configured daily limit)

#### Acceptance Criteria

- [ ] AC-016 `[auto]`: After 500 review calls in one UTC day, the next `/analyze` answers 200 with `review.status` `skipped`, no review findings, `dropped` 0, and the structural findings unchanged. The model is not called.
- [ ] AC-017 `[auto]`: The review ceiling is read from `SDDBUILDER_REVIEW_DAILY_LIMIT`. Unset or empty uses 500. A value that is not a whole number of 0 or more stops startup and names the variable, never its value.
- [ ] AC-018 `[auto]`: After 50 generation calls in one UTC day, the next `/generate` returns 429 with the error body, and the model is not called. The limit is read from `SDDBUILDER_GENERATE_DAILY_LIMIT`, unset or empty uses 50, and invalid values stop startup as in AC-017.
- [ ] AC-019 `[auto]`: Both counts reset at the UTC day boundary (clock injected, as AC-006).
- [ ] AC-020 `[auto]`: A review call that fails (a thrown error, a timeout or a bad reply) still counts toward the review ceiling. A generation call that fails still counts toward the generation ceiling.
- [ ] AC-021 `[auto]`: A request refused by a rate limit or an input cap does not count toward either daily ceiling.
- [ ] AC-022 `[auto]`: `review.status` accepts `skipped` in addition to `ok` and `failed`. The `AnalysisResult` type in `packages/core` and its check are updated, and the existing `ok` and `failed` results are unchanged.

### US-004: Timeouts and output limits on every call

**As a** developer
**I want to** bound how long and how much each model call can take
**So that** a slow or runaway reply cannot hold a request or cost more than planned

**Requirements:** F-13 scope: timeout and maximum output size

#### Acceptance Criteria

- [ ] AC-023 `[auto]`: Every review call is made with `max_tokens` 8192 and a 60-second timeout. Every generation call is made with `max_tokens` 32000 and a 300-second timeout. A fake client records the values and the tests check them.
- [ ] AC-024 `[auto]`: A review call that times out or is rejected gives `review.status` `failed` with the structural findings returned. A generation call that times out returns 502 with no file text.
- [ ] AC-025 `[auto]`: A review reply that stops because it reached `max_tokens` counts as a failed review, not as a reply to parse. A test with a fake reply marked as truncated gives `review.status` `failed`.

### US-005: No brief content in logs or error reports

**As a** developer
**I want to** be sure the server never writes the brief to logs or error responses
**So that** the privacy promise in the notice holds (idea.md, risk 3; architecture §4)

**Requirements:** F-13 scope: no brief content in logs or error reports

#### Acceptance Criteria

- [ ] AC-026 `[auto]`: For each route and each error status the API can return (400, 404, 405, 422, 429, 500, 502, 503), the response body contains no sentinel string placed in the idea text, a module name or a rule text of the submitted brief.
- [ ] AC-027 `[auto]`: When the model provider throws an error whose message contains a sentinel from the brief, the log line and the response carry only the error name, on the review path and on the generation path.
- [ ] AC-028 `[auto]`: Log lines written for rate-limit, input-cap and ceiling refusals carry the event name, the route and the status only. They carry no brief text and no client address.
- [ ] AC-029 `[device]`: Run the server locally with a real key. Submit a brief through `/analyze` and `/generate`, then check the server console and the responses: no brief text appears. Recorded in the manual checklist.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| F-13 scope: per-client rate limit | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009 |
| F-13 scope: input caps | AC-010, AC-011, AC-012, AC-013, AC-014, AC-015 |
| F-13 scope: daily ceiling | AC-016, AC-017, AC-018, AC-019, AC-020, AC-021, AC-022 |
| F-13 scope: timeout and maximum output size | AC-023, AC-024, AC-025 |
| F-13 scope: no brief content in logs or error reports | AC-026, AC-027, AC-028, AC-029 |
