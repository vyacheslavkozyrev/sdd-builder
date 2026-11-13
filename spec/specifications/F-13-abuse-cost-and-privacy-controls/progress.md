# Progress — Abuse, cost and privacy controls (F-13)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-13 | Stories approved by the user; 29 criteria (28 `[auto]`, 1 `[device]`). |
| Plan     | ✅ Complete | 2026-11-13 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-13 | 4 of 10 tasks committed |
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

---

## Deferred Findings
- T001, decided in the build: a request that gets 400 (invalid JSON or an unparseable body) counts toward the per-minute and per-day limits. The limiter runs before the body is read (plan T008), so it cannot tell a valid request from an invalid one; decision 12 is read this way. Recorded here; architecture §6 decision 12 is unchanged.
