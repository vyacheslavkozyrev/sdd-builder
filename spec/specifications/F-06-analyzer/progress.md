# Progress — Analyzer (F-06)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 6 stories, 32 criteria, all `[auto]`; approved by the user. Owner decision 2026-11-17: brief fields (`name`, `idea`, `architecture`, `stack`) added to the pipeline model in F-06, and brief checks run in F-06 in their own function, not in `analyzeStructure`. Review: fixed limits (8192 tokens, 60 s), at most 10 kept entries, no retry, no daily ceiling (F-17) |
| UX       | ➖ Not needed | 2026-11-17 | No user interface: model, checks and analysis function only (the stories have no user-facing criterion) |
| Plan     | ✅ Complete | 2026-11-17 | 7 tasks, all 32 criteria covered; approved by the user before any code is written |
| Build    | 🔄 In Progress | | 6 of 7 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T006 | `analyzePipeline` in `apps/api/src/analyze.ts`: findings are structural then brief; every failure (no model, thrown error, `max_tokens`, rejected reply) gives `failed`, no entries, `dropped` 0; one review call, no retry; config not changed; log called with event and status only | 0 blockers, 2 warnings fixed (strict equality in the config-unchanged test; the test now covers each path), 1 suggestion fixed (the silent catch documented) | task check passed: core 1017 of 1017 (53 files), api 44 of 44 (5 files), web 3 of 3 |
| T005 | Review request in `apps/api`: fixed prompt (`review/prompt.ts`); request text from the brief, rules and pipeline in fixed key order; call parameters 8192 tokens, 60 s, no SDK retry, and `callReview` with a fake client (`review/anthropic.ts`) | 1 blocker fixed (`callReview` had no test), 1 warning fixed (key order of `rules` and `pipeline` not fixed), 1 suggestion fixed (duplicate order assertion removed) | task check passed: core 1017 of 1017 (53 files), api 21 of 21 (4 files), web 3 of 3 |
| T004 | `checkReview` in `analyze/review.ts`: `failed` for non-JSON or a non-array; entries kept only with severity `warning`, `info` or `blocker` (kept as `warning`) and non-blank `subject` and `message`; at most 10 kept, in reply order; the rest counted in `dropped` | 0 blockers, 0 warnings, 1 suggestion fixed (no-trim behaviour tested) | task check passed: core 1017 of 1017 (53 files), api 6 of 6, web 3 of 3 |
| T003 | `analyzeBrief` in `analyze/brief.ts`: blockers for `name`, `idea`, `stack.language`; warnings for blank optional stack fields and empty `rules`; kept out of `analyzeStructure` (proved by a test) | 0 blockers, 2 warnings fixed (exact blocker list asserted; the stack-absent warnings tested), 1 suggestion fixed (test title) | task check passed: core 987 of 987 (52 files), api 6 of 6, web 3 of 3 |
| T002 | Brief fields in the model (`name`, `idea`, `architecture`, `stack`, optional) and the parser (`parse/brief.ts`); 5,000-code-point limit on `idea` and `architecture`; unknown `stack` keys refused with their path | 0 blockers, 1 warning fixed (surrogate-pair boundary tested for `architecture`), 1 suggestion fixed (unused export removed), 1 suggestion deferred (length check repeats `bodyText`; shared helper is outside T002) | task check passed: core 939 of 939 (50 files), api 6 of 6, web 3 of 3 |
| T001 | Decision 37 recorded in `architecture.md` §6; §4 Failure (no SDK retry), Output (severities `warning` and `info`, cap of 10) and a new Review call row | 0 blockers, 2 warnings fixed (the blocker wording in §4 Output; the review limits missing from §4), 0 suggestions | task check passed: core 904 of 904 (49 files), api 6 of 6, web 3 of 3 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T002 SUGGESTION `source/packages/core/src/pipeline/parse/brief.ts` `longBriefText`: repeats the two-part length check of `bodyText` (`check/primitives.ts`). A shared helper would change `bodyText`, an earlier task's code, so it is left for a later tidy-up.
- Doc inconsistency found in T001 (not F-06 scope): `spec/documents/architecture.md` §4 "Input" still says the idea is capped at 8,000 characters; decision 28 supersedes it with 5,000 code points. To fix in a docs task.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
