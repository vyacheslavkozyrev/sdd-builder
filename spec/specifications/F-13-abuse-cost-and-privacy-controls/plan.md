# Implementation Plan — Abuse, cost and privacy controls (F-13)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [x] T001 [Docs] Record the F-13 decisions: limit values, per-client fixed window, `skipped` review status, environment variables, client address from the connection; architecture §5 and §6 (decision 12) — `spec/documents/architecture.md` — covers none (decision record required before code depends on it)
- [x] T002 [Core] `AnalysisReview.status` gains `skipped`; `skippedAnalysis(config)` returns the structural findings with review `skipped`, no findings, `dropped` 0 — `packages/core/src/model.ts`, `packages/core/src/analyze/index.ts`, `packages/core/test/analyze-skipped.test.ts` — covers AC-022
- [x] T003 [Core] Input caps as data: `INPUT_CAPS` (idea 8000 characters, 12 modules, 60 rules over `codeRules` and `testRules`) and `capProblems(config)` returning `<path>: <reason>` in a fixed order, using JavaScript string length, no trimming, no submitted text — `packages/core/src/limits.ts`, `packages/core/src/index.ts`, `packages/core/test/limits.test.ts` — covers AC-010, AC-011, AC-012, AC-013, AC-014
- [x] T004 [API] Review reply truncation: the review port returns `{ text, truncated }`, the Anthropic adapter reads `stop_reason` as the generation adapter does, and `analyze` counts a truncated reply as `failed` — `apps/api/src/analyze.ts`, `apps/api/src/review/anthropic-model.ts`, `apps/api/test/analyze.test.ts`, `apps/api/test/anthropic-model.test.ts`, `apps/api/test/analyze-route.test.ts` — covers AC-025
- [x] T005 [API] Timeouts and output limits are testable: both adapters take an injectable client factory that receives the timeout; tests assert review `max_tokens` 8192 with 60 s and generation `max_tokens` 32000 with 300 s; a review rejection gives `failed` with structural findings; a generation timeout gives 502 with no file text — `apps/api/src/review/anthropic-model.ts`, `apps/api/src/generate/generation-model.ts`, `apps/api/test/anthropic-model.test.ts`, `apps/api/test/generation-model.test.ts`, `apps/api/test/generate-route.test.ts` — covers AC-023, AC-024
- [ ] T006 [API] Per-client limiter: fixed windows, 10 accepted requests per minute and 100 per UTC day per address, `Retry-After` in whole seconds, clock injected, only accepted requests count, expired entries pruned when the UTC day changes — `apps/api/src/limits/client-limiter.ts`, `apps/api/test/client-limiter.test.ts` — covers AC-001, AC-002, AC-003, AC-006, AC-009
- [ ] T007 [API] Daily ceiling counter (per UTC day, injected clock, counted when a model call is made) and environment parsing: `SDDBUILDER_REVIEW_DAILY_LIMIT` (default 500) and `SDDBUILDER_GENERATE_DAILY_LIMIT` (default 50); an invalid value throws naming the variable, never its value; `server.ts` reads both — `apps/api/src/limits/daily-ceiling.ts`, `apps/api/src/limits/env.ts`, `apps/api/src/server.ts`, `apps/api/test/daily-ceiling.test.ts`, `apps/api/test/limits-env.test.ts` — covers AC-017, AC-018 (environment part), AC-019
- [ ] T008 [API] Route wiring for limits: `POST` on `/analyze` and `/generate` checks the limiter first (remote address from the connection, supplied to `createApp` so tests pass a fixed address), then reads the body, then `capProblems` gives 422 before any model call; one count covers both routes; 404 and 405 are not counted; a refused request is not counted; the 429 body uses the error shape — `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/test/limits-route.test.ts` — covers AC-001, AC-004, AC-005, AC-007, AC-008, AC-010, AC-011, AC-012, AC-015
- [ ] T009 [API] Daily ceilings on the routes: at the ceiling `/analyze` answers 200 with `skipped` and does not call the model; `/generate` answers 429 with the error body; a failed call still counts; refused requests (rate limit or caps) do not count — `apps/api/src/app.ts`, `apps/api/test/ceiling-route.test.ts` — covers AC-016, AC-018, AC-020, AC-021, AC-022
- [ ] T010 [API] Privacy of logs and errors: new log events `rate_limited`, `input_refused` and `daily_ceiling_reached` carry event, route and status only; a failed review logs the error name only (`review_model_failed`); sentinel tests on every error status of both routes; a manual check with a real key is listed in the checklist — `apps/api/src/log.ts`, `apps/api/src/analyze.ts` or `apps/api/src/app.ts`, `apps/api/test/privacy-limits.test.ts` — covers AC-026, AC-027, AC-028, AC-029

## Rationale

- **Order:** the docs record the decisions first (general rule: a decision is recorded before code depends on it). Core comes next (`packages/core` has no dependency on the API): the `skipped` status and the input caps are pure and tested without any server. Then the API adapters, so the review and generation calls can be asserted for truncation and timeouts before limits wrap them.
- **Limiter before wiring:** the rate limiter (T006) and the daily counter (T007) are plain classes with an injected clock, so their rules are tested with fixed times. Route wiring (T008, T009) only connects them. This keeps every test free of the wall clock and of real network calls, as `qa.md` requires.
- **Checks before the model:** the input caps (T003) and the limiter run before the body is parsed into a model call. Rate-limit and cap refusals never reach a counter or the model (AC-005, AC-021).
- **Privacy last:** log events and sentinel tests (T010) come after the routes exist, so they cover every status the routes can return.
- **Architecture constraints:** no new library. The client address comes from the Node connection through the server adapter (`apps/api/src/server.ts`); `packages/core` stays free of I/O. The LLM is still called only from `apps/api`.
- **Known limits:** all counters are in memory and reset on restart. Behind a shared proxy, all clients share one address (AC-008, decided in the specification).

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Docs]` | Documentation changes required by the feature |
| `[Core]` | `packages/core`: model, pure checks, caps |
| `[API]` | `apps/api`: limiter, daily counters, routes, adapters, logs |

Add layer tags matching the modules in `architecture.md` §3.
