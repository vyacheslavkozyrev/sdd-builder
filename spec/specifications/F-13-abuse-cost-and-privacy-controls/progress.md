# Progress — Abuse, cost and privacy controls (F-13)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-13 | Stories approved by the user; 29 criteria (28 `[auto]`, 1 `[device]`). |
| Plan     | ✅ Complete | 2026-11-13 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-13 | 6 of 10 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task.

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

---

## Deferred Findings
- T006 review, `apps/api/src/limits/client-limiter.ts:66-70` (`roll`) (SUGGESTION): if the server clock steps backwards to an earlier UTC day, `roll` drops every current-day entry, so counts reset early. It is not a bypass (the client cannot move the server clock), and a fix changes behaviour the spec does not cover.
- T006 review, `apps/api/src/limits/client-limiter.ts:56` (`admit`) (SUGGESTION): the table holds one entry per distinct client address per UTC day with no cap, so many distinct addresses (for example IPv6 rotation) grow memory within a day. AC-009 and architecture decision 12 accept in-memory fixed windows; a cap or eviction policy is a user decision, not applied in review.
- T005 review, `apps/api/src/review/anthropic-model.ts` and `apps/api/src/generate/generation-model.ts` (SUGGESTION): the SDK's default `maxRetries` (2) still applies, so a timed-out call can wait up to three attempts (about 180 s review, 900 s generation) before it fails. AC-023 and AC-024 hold per attempt and the failure path is unchanged. Setting `maxRetries` changes the factory options and the AC-023 assertions, so it is a user decision, not applied in review.
- T001, decided in the build: a request that gets 400 (invalid JSON or an unparseable body) counts toward the per-minute and per-day limits. The limiter runs before the body is read (plan T008), so it cannot tell a valid request from an invalid one; decision 12 is read this way. Recorded here; architecture §6 decision 12 is unchanged.
