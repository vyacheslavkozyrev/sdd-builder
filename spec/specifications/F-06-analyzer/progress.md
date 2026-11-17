# Progress — Analyzer (F-06)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 6 stories, 32 criteria, all `[auto]`; approved by the user. Owner decision 2026-11-17: brief fields (`name`, `idea`, `architecture`, `stack`) added to the pipeline model in F-06, and brief checks run in F-06 in their own function, not in `analyzeStructure`. Review: fixed limits (8192 tokens, 60 s), at most 10 kept entries, no retry, no daily ceiling (F-17) |
| UX       | ➖ Not needed | 2026-11-17 | No user interface: model, checks and analysis function only (the stories have no user-facing criterion) |
| Plan     | ✅ Complete | 2026-11-17 | 7 tasks, all 32 criteria covered; approved by the user before any code is written |
| Build    | ✅ Complete | | 7 of 7 tasks committed |
| Verify   | ✅ Complete | 2026-11-17 | 32 of 32 criteria covered by passing tests; no `[device]` criteria, so no checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T007 | Privacy of the analysis: log lines carry the event and status only; the thrown error is neither logged nor returned; no state between calls; no file write (`analyze-privacy.test.ts`) | 0 blockers, 2 warnings fixed (write through `fs.promises` and process output not observed), 3 suggestions fixed (mock positive control, a long line split, the comment citing the criteria) | task check passed: core 1017 of 1017 (53 files), api 57 of 57 (6 files), web 3 of 3 |
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

Verify run 2026-11-17 on `main`, clean tree, all 7 tasks ticked and committed, Current Task None. `source/scripts/task-check.sh`: exit 0; typecheck passed for api, web and core; tests passed in full: api 57 of 57 (6 files), web 3 of 3 (2 files), core 1017 of 1017 (53 files). F-06 filter: 164 passed, 0 failed, 0 skipped (core `test/pipeline/` 113 cases, api `test/` 51 cases). Manual checklist: none (all 32 criteria are `[auto]`; no `checklist.md` created).

Matrix (criterion → test file, test names). Each name starts with `F-06 AC-###`; the count is the number of passing cases.

| Criterion | Covering tests (file: name) | Result |
| --- | --- | --- |
| AC-001 | `brief-parse.test.ts`: keeps name, idea, architecture and each stack field as typed; keeps the brief for each config shape (4) | pass (4) |
| AC-002 | `brief-parse.test.ts`: parses a config with no brief fields and reads the brief as blank | pass (1) |
| AC-003 | `brief-parse.test.ts`: refuses a non-string brief field (number, list, and others) at its path (9) | pass (9) |
| AC-004 | `brief-parse.test.ts`: refuses an unknown key inside stack with its path; refuses a non-object stack at `stack`; still refuses an unknown root key (5) | pass (5) |
| AC-005 | `brief-parse.test.ts`: 5,000 accepted and 5,001 refused for idea and architecture; surrogate pair counted as one; very long idea refused (11) | pass (11) |
| AC-006 | `brief-parse.test.ts`: keeps idea unchanged with spaces, line breaks and edges; keeps name, architecture and stack values unchanged (5) | pass (5) |
| AC-007 | `brief-checks.test.ts`: blocker at name, idea or stack.language when absent, empty or blank; blockers when the stack or the brief is absent (17) | pass (17) |
| AC-008 | `brief-checks.test.ts`: warning at stack.framework, platform, buildTool, testFramework when absent or blank (22) | pass (22) |
| AC-009 | `brief-checks.test.ts`: warning at rules for an empty list; none for one rule or several (3) | pass (3) |
| AC-010 | `brief-checks.test.ts`: complete brief gives no finding; a value with surrounding spaces counts as filled (2) | pass (2) |
| AC-011 | `brief-structure.test.ts`: same structural findings with no brief, a blank brief and a complete brief (2) | pass (2) |
| AC-012 | `brief-checks.test.ts`: findings in the order name, idea, stack.language, stack fields, rules, also when some are missing (2) | pass (2) |
| AC-013 | `review-request.test.ts`: request carries the fixed prompt, brief and config; same text on two calls; fixed key order; blank brief for no brief; a brief change changes the text (7) | pass (7) |
| AC-014 | `review-request.test.ts`: max_tokens 8192; timeout 60000 ms; same parameters on two calls; `callReview` sends the parameters and returns text and stop reason; max_tokens stop reason (6) | pass (6) |
| AC-015 | `analyze.test.ts`: one analysis makes exactly one review call; a throwing call is not retried; one review event logged (3). `review-request.test.ts`: maxRetries 0; `callReview` makes one call and passes the error on (2) | pass (5) |
| AC-016 | `analyze.test.ts`: with no model configured the review is failed and the analysis still returns (1) | pass (1) |
| AC-017 | `review-reply.test.ts`: gives failed for a reply that is not valid JSON (3 cases) | pass (3) |
| AC-018 | `review-reply.test.ts`: gives failed for valid JSON that is not an array (5 cases) | pass (5) |
| AC-019 | `analyze.test.ts`: a reply stopped at max_tokens gives failed and its entries are not parsed (1) | pass (1) |
| AC-020 | `review-reply.test.ts`: keeps warning and info entries with subject and message; keeps text without trimming; drops and counts each invalid entry (17) | pass (17) |
| AC-021 | `review-reply.test.ts`: keeps a blocker entry as a warning, never a blocker (1) | pass (1) |
| AC-022 | `review-reply.test.ts`: keeps entries in reply order; at most 10 kept; invalid and beyond-10 entries counted together in dropped (3) | pass (3) |
| AC-023 | `review-reply.test.ts`: empty array gives ok, no findings and dropped 0 (1) | pass (1) |
| AC-024 | `analyze.test.ts`: a failed review has dropped 0 (1) | pass (1) |
| AC-025 | `analyze.test.ts`: result has findings and review with status, findings, dropped; brief findings follow structural; config with no findings gives an empty list (3) | pass (3) |
| AC-026 | `analyze.test.ts`: with each failure (no model, thrown error, non-JSON, non-array, max_tokens) structural and brief findings returned in full (6) | pass (6) |
| AC-027 | `analyze.test.ts`: valid empty reply gives ok with no entries; every entry dropped still gives ok with the count (2) | pass (2) |
| AC-028 | `analyze.test.ts`: review entries carry only severity, subject and message; config strictly equal before and after, for each path (5) | pass (5) |
| AC-029 | `analyze.test.ts`: structural findings come first, in the order `analyzeStructure` returns them (1) | pass (1) |
| AC-030 | `analyze-privacy.test.ts`: no file written on success or failure paths; two calls with different configs return only their own findings; no state changes the next call (3) | pass (3) |
| AC-031 | `analyze-privacy.test.ts`: sentinel idea in no log line on the success path and on each failure path; nothing reaches console or process output (7) | pass (7) |
| AC-032 | `analyze-privacy.test.ts`: thrown error holding the sentinel is kept out of the log lines and the result; a non-Error thrown value is kept out too (3) | pass (3) |

Gaps: none. Every `[auto]` criterion AC-001 to AC-032 has at least one passing test named with its `F-06 AC-###`.
Failures: none. Scope in `features.md` F-06 (structural findings, advice-only review, validation and cap, findings kept on review failure, brief not stored or logged) is covered by AC-025 and AC-029; AC-021, AC-027 and AC-028; AC-017 to AC-024; AC-026; AC-030 to AC-032.

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
