# Progress — Analyze and generate step (UI only) (F-13)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-24 | 5 stories, 31 criteria: 29 `[auto]`, 2 `[device]`; approved by the user. Decision 41 governs (failed or skipped review is an error); F-13 makes the real calls to `/analyze` and `/generate` (404 shown as text until F-14, F-15) |
| UX       | ✅ Complete | 2026-11-24 | Approved by the user; 11 screens in `spec/design/features/F-13-analyze-generate/`. Usability and visual reviews skipped at the owner's request (2026-11-24) |
| Plan     | ✅ Complete | 2026-11-24 | Approved by the user; 14 tasks (T001 to T014), all `[Web]` except the docs task T014 |
| Build    | 🔄 In Progress | 2026-11-24 | 5 of 14 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Project configuration from the wizard state: `buildProjectConfig` (schemaVersion 2, idea trimmed, rules as `{index, id, title, text}`, pipeline held) | 0 blockers, 1 warning fixed (type-only import), 0 suggestions | task check passed: api 45, web 1705, core 1217 |
| T002 | Analysis state and the green rule: `analysisState.ts` (not run, pending, result, error with the configuration key; `isGreen`, `isOutOfDate`) | 0 blockers, 1 warning fixed (AC-019 test covered only the pipeline description; now flow name and body too), 1 suggestion fixed (line length) | task check passed: api 45, web 1732, core 1217 |
| T003 | Reason Generate is disabled: `generateDisabledReason` in AC-017 order (not run, out of date or pending: "Run Analyze first"; blocker; warning; failed or skipped review) | 0 blockers, 0 warnings, 0 suggestions (round 1) | task check passed: api 45, web 1751, core 1217 |
| T004 | Request client: `postJson` with `Accept: application/json`, outcomes ok, http-error and network-error (status number or null, as the T002 error state) | 0 blockers, 0 warnings, 0 suggestions fixed (1 suggestion deferred: no client timeout, see Deferred Findings) | task check passed: api 45, web 1766, core 1217 |
| T005 | Replies and messages: `parseAnalysisReply` (refuses anything outside the result shape), `errorMessage` (status sentence, network error), `problemLines` (one line per 422 problem) | 0 blockers, 0 warnings, 1 suggestion fixed (test line wrapped to length, round 1) | task check passed: api 45, web 1805, core 1217 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/apps/web/src/analyze/request.ts:26` (T004) — SUGGESTION: `postJson` sets no client-side timeout, so a hung `/analyze` keeps the state pending. Not applied: plan T004 fixes the signature `postJson(path, body, fetchFn)` and AC-010 sets no timeout; the LLM call timeout belongs to the API (F-14). Revisit with T011 or F-14.

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
