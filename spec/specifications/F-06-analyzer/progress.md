# Progress — Analyzer (F-06)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | Re-specified from the final schema (`pipeline-schema.md`, 2026-11-19) and decision 37; 5 stories, 26 criteria, all [auto]. The brief model is F-02's (owner choice: the parse stories are dropped from F-06, F-02 AC-074 to AC-076 cover them); decision 37 (a) named F-06 as the adder of the brief fields; corrected in T001 |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-20 | Approved by the user; 6 tasks (T001 to T006); 26 criteria, all covered |
| Build    | ✅ Complete | 2026-11-20 | 6 of 6 tasks committed |
| Verify   | ✅ Complete | 2026-11-20 | 26 criteria, all [auto], all covered by passing tests; no [device] criteria, so no manual checklist. Matrix under Test Results |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

### 2026-11-20 build

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decision 37 (a) in `architecture.md` §6 corrected: F-02 owns the brief fields; F-06 adds none (docs only, no test) | 0 blockers, 0 warnings, 1 suggestion fixed (Specify note no longer calls decision 37 (a) stale) | task check passed: web 4 of 4 (2 files), core 1143 of 1143 (54 files), api 6 of 6 |
| T006 | Privacy of the analysis: the log lines carry the event and status only; a sentinel in the idea appears in no log line or result on the success path or any failure path; a thrown error message is neither logged nor returned; two calls return only their own findings; no file is written (`analyze-privacy.test.ts`; no production change) | 0 blockers, 3 warnings fixed (temp-folder cleanup and cwd restore made safe; the no-write test also redirects TMPDIR and HOME; a valid non-array reply added to the failure paths), mutation checks confirm the sentinel tests fail on a leak | task check passed: core 1208 of 1208 (57 files), api 45 of 45 (6 files), web 4 of 4 (2 files) |
| T005 | `analyzePipeline` in `apps/api/src/analyze.ts`: findings are `analyzeStructure` then `analyzeBrief`; no model, a thrown call or a `max_tokens` stop gives `failed` with no entries and `dropped` 0 (the reply is not parsed); otherwise `checkReview`; one call, no retry; the config only read; the error text never reaches the result or the log | 0 blockers, 2 warnings fixed (request built outside the try; the caught error is logged as a fixed line, not silent), 1 suggestion fixed (strict equality on the config check); AC-022 entry-shape test and AC-020 error-text test added | task check passed: core 1208 of 1208 (57 files), api 34 of 34 (5 files), web 4 of 4 (2 files) |
| T004 | Review request in `apps/api`: fixed prompt (`review/prompt.ts`, sent as the system prompt) and the request JSON (brief, rules, pipeline in fixed key order); call parameters 8192 tokens, 60 s, no SDK retry, `callReview` through an injected client (`review/anthropic.ts`); `rules` kept in the request as brief content (the rule tags name them) | 0 blockers, 4 warnings fixed (prompt misdescribed the input; data-not-instructions scope; no code fence allowed; rules not tested), 2 suggestions fixed (SDK types for the stop reason) | task check passed: core 1208 of 1208 (57 files), api 19 of 19 (4 files), web 4 of 4 (2 files) |
| T003 | `checkReview` in `analyze/review.ts`: `failed` for non-JSON or a non-array, each failure a fresh result; entries kept only as `warning`/`info` (a `blocker` kept as `warning`) with non-blank `subject` and `message`; at most 10 kept in reply order, the rest counted in `dropped`; exported through the analysis barrel and `pipeline/index.ts` (namespace pin updated) | 0 blockers, 1 warning fixed (shared failed-result array, now a fresh result per call), 2 suggestions fixed (imports through the barrel; whitespace-only and blank-subject cases) | task check passed: core 1208 of 1208 (57 files), api 6 of 6, web 4 of 4 |
| T002 | `analyzeBrief` in `analyze/brief.ts`: blockers for `name`, `idea`, `stack.language`; warnings for blank optional stack fields and empty `rules`; fixed order; kept out of `analyzeStructure`; exported from `pipeline/index.ts` (namespace pin in `namespace.test.ts` updated to match the export) | 0 blockers, 1 warning fixed (the rule-id list in the structure test named 5 of 8 ids), 3 suggestions fixed (it.each titles, rule ids in kebab style, the blank-character comment) | task check passed: core 1166 of 1166 (56 files), api 6 of 6, web 4 of 4 |

### 2026-11-17 build (before the reset of 2026-11-19; the code was removed by the reset, the log is kept)

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

- T006 SUGGESTION `source/apps/api/test/analyze-privacy.test.ts` "writes no file": checks the cwd, `TMPDIR` and `HOME` only, so a write to another absolute path would not be seen. Not extended: `analyzePipeline` takes no path argument, and a spy on `node:fs` would need a module mock for little gain.
- T006 doc (not T006 code): the old `## Test Results` table numbered the privacy criteria AC-030 to AC-032 and counted 32 criteria, but `stories.md` has AC-024 to AC-026 and 26 criteria. Resolved by the 2026-11-20 verify, which replaced that table with the current matrix.
- T002 SUGGESTION `source/packages/core/src/pipeline/parse/brief.ts` `longBriefText`: repeats the two-part length check of `bodyText` (`check/primitives.ts`). A shared helper would change `bodyText`, an earlier task's code, so it is left for a later tidy-up.
- Doc inconsistency found in T001 (not F-06 scope): `spec/documents/architecture.md` §4 "Input" still said the idea is capped at 8,000 characters. Resolved after F-06 completed: §4 Input and decision 12 now give 5,000 code points (decision 28), and the F-05 wireframe counter and limit text read 5,000.

---

## Test Results

Verify run 2026-11-20 on `main`, clean tree, all 6 tasks ticked and committed (latest `6a10b99`), Current Task None. `source/scripts/task-check.sh`: exit 0; typecheck passed; tests passed in full: core 1208 of 1208 (57 files), api 45 of 45 (6 files), web 4 of 4 (2 files). F-06 filter (verbose run of core and api): 104 passed, 0 failed, 0 skipped (core `test/pipeline/` 65 cases, api `test/` 39 cases). Criteria: 26 of 26 are `[auto]`, 0 `[device]`. Manual checklist: none; no `checklist.md` created, since there are no `[device]` criteria.

Matrix (criterion → test file, test names). Each name starts with `F-06 AC-###`; the count is the number of passing cases. Names are shortened.

| Criterion | Covering tests (file: test names) | Result |
| --- | --- | --- |
| AC-001 | `brief-checks.test.ts`: a blank name, idea or stack.language is a blocker at its path (5) | pass (5) |
| AC-002 | `brief-checks.test.ts`: a blank or absent optional stack field is a warning at stack.<field> (9) | pass (9) |
| AC-003 | `brief-checks.test.ts`: an empty rules list is a warning at rules (3) | pass (3) |
| AC-004 | `brief-checks.test.ts`: a complete brief gives no brief finding (1) | pass (1) |
| AC-005 | `brief-structure.test.ts`: the brief checks are not part of analyzeStructure (3) | pass (3) |
| AC-006 | `brief-checks.test.ts`: brief findings come in the fixed order (2) | pass (2) |
| AC-007 | `review-request.test.ts`: the request carries the fixed review prompt, the brief and the pipeline config; the same config gives the same request text on two calls; fixed key order; no-brief config; a brief change changes the text (6) | pass (6) |
| AC-008 | `review-request.test.ts`: max_tokens is 8192; timeout is 60,000 ms per attempt; names the model and sends the fixed prompt as the system prompt (3) | pass (3) |
| AC-009 | `analyze.test.ts`: one analysis makes one review call, and a thrown call is not retried (1). `review-request.test.ts`: the review call sets no SDK retry; one review call makes one client call; a throwing call is not retried; callReview returns the text and stop reason (4) | pass (5) |
| AC-010 | `analyze.test.ts`: with no model the review is failed and the findings are still returned (1) | pass (1) |
| AC-011 | `review-reply.test.ts`: a reply that is not valid JSON fails with no review findings (5); a failed review gives each caller its own result (1) | pass (6) |
| AC-012 | `review-reply.test.ts`: a reply that is JSON but not an array fails with no review findings (6) | pass (6) |
| AC-013 | `analyze.test.ts`: a reply stopped at max_tokens gives a failed review, and the reply is not parsed (1) | pass (1) |
| AC-014 | `review-reply.test.ts`: an entry is kept only with a valid severity, subject and message (18); a kept entry keeps its text as the reply gives it (1) | pass (19) |
| AC-015 | `review-reply.test.ts`: a blocker entry is kept as a warning (4) | pass (4) |
| AC-016 | `review-reply.test.ts`: kept entries keep reply order and are capped at 10 (6) | pass (6) |
| AC-017 | `review-reply.test.ts`: an empty array gives status ok with no findings and dropped 0 (1) | pass (1) |
| AC-018 | `analyze.test.ts`: a failed review has dropped 0 (1) | pass (1) |
| AC-019 | `analyze.test.ts`: the result has the findings and a review with status, findings and dropped (1) | pass (1) |
| AC-020 | `analyze.test.ts`: a model call that throws, the error text reaching neither result nor log, a reply that is not JSON, and a reply that is not an array each give a failed review with the findings in full (4) | pass (4) |
| AC-021 | `analyze.test.ts`: a valid reply with entries gives ok; a valid empty reply gives ok with no entries; a reply whose every entry is dropped gives ok with the count (3) | pass (3) |
| AC-022 | `analyze.test.ts`: the config is equal before and after the call (1); a review entry carries only severity, subject and message (1) | pass (2) |
| AC-023 | `analyze.test.ts`: the structural findings are the analyzeStructure output, then the brief findings (1) | pass (1) |
| AC-024 | `analyze-privacy.test.ts`: two calls with different configs each return only their own findings (1); a later failing call does not change an earlier result (1); the analysis run in a temp folder leaves it unchanged (1) | pass (3) |
| AC-025 | `analyze-privacy.test.ts`: the sentinel idea appears in no log line on the success path (1) and on each failure path (5); the log lines carry the event and the status only (1) | pass (7) |
| AC-026 | `analyze-privacy.test.ts`: a thrown error whose message holds the sentinel is kept out of the log lines and the result (1) | pass (1) |

Gaps: none. Every `[auto]` criterion AC-001 to AC-026 has at least one passing test named with its `F-06 AC-###`.
Failures: none. Every F-06 test case in the verbose run passed; none skipped.
Scope in `features.md` F-06 (structural findings included, advice-only review, validation and cap, findings kept when the review fails, brief not stored or logged) is covered by AC-019, AC-023; AC-015, AC-021, AC-022; AC-009 to AC-014, AC-017, AC-018; AC-020; AC-024 to AC-026.

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
