# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-12 | Stories approved by the user; 21 criteria (20 `[auto]`, 1 `[device]`). |
| Plan     | ✅ Complete | 2026-11-12 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-12 | 12 of 15 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Record analyzer decisions in architecture §4 and §6 (decision 10) | 0 blockers, 1 warning fixed (missing severities for AC-010, AC-011), 1 suggestion deferred (idea.md budget line) | 26 files, 174 passed |
| T002 | AnalysisResult becomes { findings, review }; AnalysisReview type | 0 blockers, 2 warnings fixed (test moved to F-04 block; non-tautological assertions), 2 suggestions deferred | 26 files, 175 passed |
| T003 | refusalFindings: validateConfig problems as blocker findings with subject and message | 0 blockers, 1 warning fixed (subject regex limited to known label kinds), 2 suggestions fixed | 27 files, 208 passed |
| T004 | reachabilityFindings: unreachable enabled steps as blockers; disabled steps and workflows skipped | 0 blockers, 1 warning fixed (duplicate step ids keyed by id), 3 suggestions fixed | 28 files, 225 passed |
| T005 | inputFindings: step inputs with no producer upstream or in the iteration source as warnings | 0 blockers, 1 warning fixed (repeated step ids keyed by step and input), 2 suggestions fixed | 29 files, 246 passed |
| T006 | retryFindings: backward fail routes with no round limit as warnings | 0 blockers, 1 warning fixed (forward and self routes are not retries), 2 suggestions fixed | 30 files, 259 passed |
| T007 | briefFindings: required fields, empty optional fields, layer rule, unknown dependsOn | 0 blockers, 0 warnings, 3 suggestions fixed (duplicate tests removed), 2 suggestions deferred | 31 files, 284 passed |
| T008 | customStepFindings: custom steps placed in no enabled workflow as warnings | 0 blockers, 1 warning fixed (comment on clashing ids corrected; edge test added), 0 suggestions | 32 files, 292 passed |
| T009 | analyzeStructure: fixed concatenation, severity then subject then message, no mutation | 0 blockers, 2 warnings fixed (test fixture trimmed; severity row exercises the rank), 1 suggestion fixed, 1 suggestion deferred (info untested) | 33 files, 300 passed |
| T010 | checkReview: reply check, blocker to warning, drop and count invalid entries, failed for non-array | 0 blockers, 1 warning fixed (non-criterion test separated), 3 suggestions fixed | 34 files, 331 passed |
| T011 | apps/api setup: tsconfig, typecheck and test scripts, vitest, smoke test | 0 blockers, 0 warnings, 1 suggestion fixed (smoke assertion), 2 suggestions deferred | 34 files, 331 passed |
| T012 | buildReviewPrompt: fixed instructions and the brief and process in a fixed key order | 0 blockers, 2 warnings fixed (workflow description picked; ambient test uses process.env), 0 suggestions fixed, 1 suggestion deferred (blocker in reply format) | 34 files, 331 passed |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `spec/documents/idea.md:88` (T001 review): the open question "Analyzer model and daily budget" still says the model is deferred, but the default model is now recorded in `architecture.md` §4. Not changed here because T001 names only `architecture.md` and `plan.md`; the owner should narrow the open question to the daily budget.
- `packages/core/src/model.ts` (`AnalysisReview`, T002 review): `status: 'failed'` with non-empty `findings` or `dropped` is not excluded by the type; a discriminated union would enforce it. Not applied because the plan and `architecture.md` §6 decision 10 fix the literal shape `{ status, findings, dropped }`; enforce the failed-state convention in T010 and T013 tests (AC-013, AC-018).
- `spec/specifications/F-04-analyzer/stories.md:20` (T002 review): the story says the shape change is recorded in `architecture.md` §5; T001 recorded it in §4 and §6 decision 10. Not changed here because T002 names only the core files; the owner should align the wording.
- `packages/core/src/analyze/brief.ts` (`dependencyFindings`, T007 review): two modules with the same name make `dependsOn` resolve to the first one only, and no check reports the duplicate name. Not applied because AC-007 to AC-010 do not cover module names and no task in the plan checks them; the owner should add a module-name check to a plan task.
- `packages/core/src/analyze/brief.ts` (`dependencyFindings`, T007 review): a `dependsOn` entry repeated in one module gives the same finding twice. Not applied because AC-009 and AC-010 do not say how repeats are reported; the owner should decide whether repeats are one finding.
- `packages/core/src/analyze/index.ts` (`SEVERITY_RANK`, T009 review): the `info` rank is untested, and no planned task emits an `info` finding (`plan.md` names none, and AC-002 only requires that a valid configuration adds none). `analyzeStructure` cannot return `info` yet, so no test can reach that rank through the public API. Not applied because a test would need an info-producing check the plan does not have; the owner should add one to a plan task or amend AC-012, and that task must test info ordering.
- `apps/api/tsconfig.json` (T011 review): `plan.md` T011 says `rootDir src`, but the smoke test sits in `test/`, and with `rootDir src` tsc fails with TS6059. The staged file uses `rootDir "."`, the same as `packages/core/tsconfig.json`. Not changed because the plan wording is inconsistent with its own include; the owner should amend T011 to `rootDir "."`.
- `apps/api/package.json` (T011 review): `packages/core` has `@types/node` as a dev dependency and `apps/api` does not. The smoke test needs no Node types and `plan.md` T011 lists only Vitest. Not added here; the task that first uses Node globals (`process.env` in T014, or `fs`-free code in T013) should add `@types/node` to match core.

- `apps/api/src/review/prompt.ts` (`REVIEW_INSTRUCTIONS`, T012 review): the reply format lets the model send `severity: 'blocker'` while the task says the review is advice only. Not changed because `checkReview` (T010) accepts `blocker` and downgrades it to `warning`, so the three severities match the reply check exactly; removing `blocker` from the prompt is a change to the reply contract that the owner should decide in T013 or by amending AC-016.

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
