# Progress — Abuse, cost and privacy controls (F-13)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-13 | Stories approved by the user; 29 criteria (28 `[auto]`, 1 `[device]`). |
| Plan     | ✅ Complete | 2026-11-13 | Approved by the user before any code is written |
| Build    | ✅ Complete | 2026-11-13 | 10 of 10 tasks committed |
| Verify   | ✅ Complete | 2026-11-13 | 29 of 29 criteria: 28 `[auto]` covered by passing tests; AC-029 `[device]` passed on a real-key run (checklist.md) |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task.

None.

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Record the F-13 decisions in architecture §5 and §6 (decision 10 status list, decision 12) | 0 blockers, 1 warning fixed (§4 output row still listed only ok and failed), 1 suggestion deferred and decided (see Deferred Findings) | docs only; task check: 254 api and 468 core tests passed |
| T002 | `AnalysisReview.status` gains `skipped`; `skippedAnalysis(config)` in core | 0 blockers, 0 warnings, 1 suggestion fixed (test renamed to what it asserts) | 36 files, 476 core and api tests passed |
| T003 | Input caps as data in core: `INPUT_CAPS` and `capProblems(config)` in a fixed order | 0 blockers, 1 warning fixed (AC-014 test asserted no length), 2 suggestions fixed (non-null assertion removed; long line wrapped) | 37 files, 492 tests passed |
| T004 | Review reply truncation: a reply cut short at `max_tokens` counts as a failed review, not parsed | 0 blockers, 1 warning fixed (architecture §4 failure row now lists the truncated reply), 0 suggestions | 37 files, 492 tests passed |
| T005 | Timeouts and output limits testable: injectable client factories; review 60 s and 8192 tokens, generation 300 s and 32000 tokens asserted; review rejection gives failed; generation timeout gives 502 with no text | 0 blockers, 0 warnings, 2 suggestions fixed (unused text assertion removed; long line wrapped), 1 suggestion deferred (see Deferred Findings) | 37 core files, 492 tests and 15 api files, 267 tests passed |
| T006 | Per-client limiter: `ClientLimiter.admit` counts an accepted request atomically; 10 per minute and 100 per UTC day per address; `Retry-After` in whole seconds; clock injected; expired days pruned | 0 blockers, 0 warnings, 2 suggestions fixed (test name made exact; redundant assertion removed), 2 suggestions deferred (see Deferred Findings) | 37 files, 492 tests passed (limiter file 13 of 13) |
| T007 | Daily ceiling counter (`DailyCeiling`, UTC day, counted before the call, forward-only reset) and `dailyLimitsFrom` for `SDDBUILDER_REVIEW_DAILY_LIMIT` (500) and `SDDBUILDER_GENERATE_DAILY_LIMIT` (50); an invalid value stops startup naming the variable | 0 blockers, 2 warnings fixed (backward clock step no longer reopens a spent day; AC-017 test reads the default), 0 suggestions | 37 core files, 492 tests and 18 api files, 306 tests passed |
| T008 | Route wiring: the limiter runs first on both POST routes (429 with `Retry-After`), then the body is read, then `capProblems` gives 422 before any model call; cap refusals refund their slot; remote address from the connection, never headers | 0 blockers, 1 warning fixed by the user's decision (422 cap refusals refunded), 0 suggestions in round 2; size guard waived by the user (567 lines, not split) | 37 core files, 492 tests and 19 api files, 331 tests passed |
| T009 | Daily ceilings on the routes: at the review ceiling `/analyze` answers 200 `skipped` with no model call; at the generation ceiling `/generate` answers 429; failed calls count; cap and rate refusals do not count; structural `/generate` refusals are refused before the ceiling and do not count | 0 blockers, 1 warning fixed by the user's decision (structural `/generate` refusals not counted), 0 suggestions fixed, 1 suggestion deferred (see Deferred Findings) | 37 core files, 492 tests and 20 api files, 342 tests passed |
| T010 | Privacy of logs and errors: log events `rate_limited`, `input_refused`, `daily_ceiling_reached` and `review_model_failed`, each with event, route and status (or the error name) only; sentinel tests on every route status | 0 blockers, 0 warnings, 2 suggestions fixed (long lines wrapped; setup folded into a helper), 1 suggestion deferred (see Deferred Findings); size guard waived by the user (485 lines) | 37 core files, 492 tests and 21 api files, 374 tests passed |

---

## Test Results

Verify run on 2026-11-13 on `main`, clean tree, Current Task None, all 10 tasks ticked.

`scripts/task-check.sh`: typecheck passed; tests passed. API: 21 files, 374 tests. Core: 37 files, 492 tests. Nothing skipped or todo in F-13 tests.

| Criterion | Tag | Covering tests (file: name) | Result |
| --- | --- | --- | --- |
| AC-001 | auto | limits-route, client-limiter: per-minute limit, 429 with `Retry-After` on the 11th | pass |
| AC-002 | auto | client-limiter: 101st request of a UTC day refused after the minute reset | pass |
| AC-003 | auto | client-limiter: per-address counts; limits-route: second address unaffected | pass |
| AC-004 | auto | limits-route: one count covers both routes | pass |
| AC-005 | auto | limits-route: refused body not read, zero model calls | pass |
| AC-006 | auto | client-limiter: minute and day boundaries with injected clock | pass |
| AC-007 | auto | limits-route: 405 and 404 not counted; client-limiter: only accepted requests count | pass |
| AC-008 | auto | limits-route: remote address counted, forwarded header ignored | pass |
| AC-009 | auto | client-limiter: expired entries pruned, current day kept | pass |
| AC-010 | auto | core limits; limits-route: 8,000 accepted, 8,001 refused 422 on both routes | pass |
| AC-011 | auto | core limits; limits-route: 12 accepted, 13 refused 422 | pass |
| AC-012 | auto | core limits; limits-route: 60 accepted, 61 refused 422 (code and test rules together) | pass |
| AC-013 | auto | core limits: JavaScript string length, no trimming | pass |
| AC-014 | auto | core limits: problems in fixed order, no submitted text | pass |
| AC-015 | auto | limits-route: caps shared by both routes | pass |
| AC-016 | auto | ceiling-route: review ceiling gives 200 `skipped`, no model call | pass |
| AC-017 | auto | limits-env: default 500, invalid value names the variable only; daily-ceiling: env default | pass |
| AC-018 | auto | ceiling-route: generation ceiling gives 429, no model call; daily-ceiling and limits-env: 50, env | pass |
| AC-019 | auto | daily-ceiling: both ceilings reset at the UTC day boundary | pass |
| AC-020 | auto | ceiling-route: failed review and failed generation still counted | pass |
| AC-021 | auto | ceiling-route: rate-limit and cap refusals not counted | pass |
| AC-022 | auto | core analyze-skipped; ceiling-route: `skipped` accepted, `ok` unchanged | pass |
| AC-023 | auto | anthropic-model, generation-model: 8192 / 60 s and 32000 / 300 s asserted | pass |
| AC-024 | auto | anthropic-model: review rejection gives `failed` with structural findings; generate-route: timeout gives 502 with no file text | pass |
| AC-025 | auto | analyze, anthropic-model, analyze-route: truncated reply gives `failed` | pass |
| AC-026 | auto | privacy-limits: sentinel case per route and status (400, 404, 405, 422, 429, 500, 502, 503), table coverage test | pass |
| AC-027 | auto | privacy-limits: review and generation failures log the error name only | pass |
| AC-028 | auto | privacy-limits: refusal log lines exact, no client address | pass |
| AC-029 | device | Manual checklist | pass (`checklist.md`, real-key run 2026-11-13) |

Scope in `features.md` (F-13): per-client rate limit (AC-001 to AC-009), input caps (AC-010 to AC-015), daily ceiling (AC-016 to AC-022), timeout and output limits (AC-023 to AC-025), no brief content in logs or errors (AC-026 to AC-029). All five items are covered.

Gaps: none for automated criteria.

---

## Deferred Findings
- T006 review, `apps/api/src/limits/client-limiter.ts:66-70` (`roll`) (SUGGESTION): if the server clock steps backwards to an earlier UTC day, `roll` drops every current-day entry, so counts reset early. It is not a bypass (the client cannot move the server clock), and a fix changes behaviour the spec does not cover.
- T006 review, `apps/api/src/limits/client-limiter.ts:56` (`admit`) (SUGGESTION): the table holds one entry per distinct client address per UTC day with no cap, so many distinct addresses (for example IPv6 rotation) grow memory within a day. AC-009 and architecture decision 12 accept in-memory fixed windows; a cap or eviction policy is a user decision, not applied in review.
- T005 review, `apps/api/src/review/anthropic-model.ts` and `apps/api/src/generate/generation-model.ts` (SUGGESTION): the SDK's default `maxRetries` (2) still applies, so a timed-out call can wait up to three attempts (about 180 s review, 900 s generation) before it fails. AC-023 and AC-024 hold per attempt and the failure path is unchanged. Setting `maxRetries` changes the factory options and the AC-023 assertions, so it is a user decision, not applied in review.
- T001, decided in the build: a request that gets 400 (invalid JSON or an unparseable body) counts toward the per-minute and per-day limits. The limiter runs before the body is read (plan T008), so it cannot tell a valid request from an invalid one; decision 12 is read this way. Recorded here; architecture §6 decision 12 is unchanged.
- T008: size guard (400 lines) waived by the user; staged change is 567 lines, not split.
- T009 review, `apps/api/src/app.ts` `/analyze` (SUGGESTION, deferred): with no review key or a disabled model, `admit` still counts a call that never reaches the provider, so after the ceiling the response reads `skipped` instead of `failed`. No cost; structural findings unchanged. Wiring decision for the user.
- T009 note: the test "F-13 AC-020 does not count a structural refusal from generation toward the generation ceiling" sits under the AC-020 block; AC-021 (refusals do not count) is the closer criterion. Moving it is a user choice.
- T008 review, open question (resolved in T009): a `/generate` 422 for a structural refusal is now refused before the generation ceiling and is not counted. See the T009 `/generate` line below.
- T008 review, `apps/api/src/app.ts` (`readWithinCaps`) (WARNING, resolved by the user's decision): 422 cap refusals are refunded. `admit` still counts before the body is read, and a cap refusal calls `ClientLimiter.refund` on the request's reservation before the 422 is returned, so architecture §6 decision 12 (requests refused by an input cap do not count) holds. 400s (invalid JSON) still count, as recorded in the T001 line above.
- T009 review, `apps/api/src/app.ts` `/generate` (WARNING, resolved by the user's decision): a `/generate` request refused by the structural check is refused before the generation ceiling and is not counted. `validateConfig` runs after the caps and the 503 check and before `generateCeiling.admit`, and returns the same 422 as `generateProject` for reason `refused`. Only real model calls use a slot of the daily generation ceiling. `generateProject` in `apps/api/src/generate/service.ts` is unchanged. Covered by `F-13 AC-020 does not count a structural refusal from generation toward the generation ceiling` in `apps/api/test/ceiling-route.test.ts`.
- T009 review, `apps/api/src/app.ts` `/analyze` (SUGGESTION): with no review key (or a disabled review model), `admit` still counts a review call that never reaches the provider, so after the review ceiling the response reads `skipped` instead of `failed`. No cost is incurred and the structural findings are unchanged. Gating the count on a configured model is a wiring change and a user decision, not applied in review.
- T010: size guard (400 lines) waived by the user; staged change is 485 lines, not split.
- Verify, AC-029 real-key run: `/generate` returned 502 for the sentinel brief because the model's reply failed the reply checks twice (planned files missing, one absolute path). This is in the F-07 generation path, not in F-13's controls. The response body and log contain no brief text. Open for the user: whether to investigate the generation reply failure as a separate task.
- T010 review, `apps/api/test/privacy-limits.test.ts` (`ROUTE_ERROR_STATUSES`, SUGGESTION): the status table is hand-kept; the coverage test checks table to cases only, so a status added to a route without a table entry is not caught. The app cannot be read for its statuses without parsing source; each case already asserts its own status, so the gap is in the table, not in what is checked.
