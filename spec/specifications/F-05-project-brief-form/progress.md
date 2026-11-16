# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-15 | Stories approved by the user, then split on 2026-11-15 into F-05 (frame, step 1, step 3 host, privacy: 14 criteria), F-21 (step 2: 10 criteria) and F-22 (step 4: 15 criteria). Criteria renumbered per feature. Decisions carried over: Generate waits for an analysis with no blockers; privacy notice on step 4 only; testing rules an ordinary block; stepper by Back and Next only; findings as plain text; file tree from core `planGeneration`; optional `architecture` string in the config (needs its `architecture.md` §5 record before the plan). Depends on F-06 for step 3 (AC-010, AC-011) |
| UX       | ✅ Complete | 2026-11-15 | Approved by the user. Reviewed by the `usability` and `visual` agents; the three open points decided (drag plus a select-then-add route in F-06; storage line kept on step 1; approval gates orange, rule chips violet) |
| Plan     | ✅ Complete | 2026-11-15 | Approved by the user before any code is written; 16 tasks (T001–T016); T016 blocked until F-06 is complete |
| Build    | 🔄 In Progress | 2026-11-15 | 3 of 16 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Wizard state: four steps, Back and Next, values kept between steps | reviewed: 0 blockers, 0 warnings, 0 suggestions | task check passed (exit 0), 1371 tests |
| T002 | Name and idea state: name stored as typed; idea capped at 8,000 code points with the counter `N / 8,000` (amendment 1: separator; amendment 2: code points, the server too) | reviewed: 0 blockers, 1 warning resolved by the owner (code points; F-04 amendment 16), 1 suggestion fixed; 1 deferred (counter loop shared with brief/counter.ts) | task check passed (exit 0), 1376 tests |
| T003 | Stepper and footer view model: done, current and todo steps with no click target; Back disabled on step 1; Next hidden on step 4 | reviewed: 0 blockers, 0 warnings, 0 suggestions | task check passed (exit 0), 1376 tests |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T002 `source/packages/core/src/code-points.ts` and `source/apps/web/src/brief/counter.ts` (`codePointLength`) (SUGGESTION): the same code-point loop is in two packages. Not shared: a shared export would add to core's public API, which the owner did not ask for; revisit if a third caller appears.
- T002 `source/apps/web/src/wizard/name-idea.ts:19-21` (WARNING, RESOLVED 2026-11-16): `setIdea` cut by UTF-16 code units and could leave a lone surrogate. Owner decision (Amendment 2): AC-008 counts code points; `setIdea` now keeps the first 8,000 code points and never splits a pair. Tests: `F-05 AC-008` in `wizard-name-idea.test.ts`.
- T002 `source/packages/core/src/limits.ts` and `source/packages/core/src/pipeline/caps.ts` (WARNING, RESOLVED 2026-11-16): the core cap checks counted `config.idea.length` (UTF-16 units), while the form counts code points (AC-008). Owner decision, 2026-11-16: the server cap counts code points too, so the form and the server agree; both checks now use `source/packages/core/src/code-points.ts`, and the 8,000 limit is unchanged. Recorded in F-04 Amendment 16 (F-04 AC-021 and `architecture.md` §12 say code points). Tests: `F-13 AC-013` in `source/packages/core/test/limits.test.ts` and `F-04 AC-021` in `source/packages/core/test/pipeline-caps.test.ts`, including an emoji and an 8,000-code-point emoji idea.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment 1 — 2026-11-16
**Changed**: `stories.md` AC-008: the counter reads `8,000 / 8,000` with a thousands separator, as the approved screen 01 draws it.
**Reason**: AC-008 said `8000 / 8000`, but the approved screen shows `142 / 8,000`. Approved by the user on 2026-11-16 (keep the screen's format).
**Impact**: T002 (the counter helper groups thousands) and its test.

### Amendment 2 — 2026-11-16
**Changed**: `stories.md` AC-008 counts the idea in code points (a surrogate pair counts as one character; a cut never splits a pair), replacing JavaScript string length. The 8,000 cap and the separator wording stay. `INPUT_CAPS.ideaCharacters` stays 8000.
**Reason**: Owner decision, 2026-11-16. A cut by UTF-16 units could leave a lone surrogate at the end of the idea.
**Impact**: T002 `source/apps/web/src/wizard/name-idea.ts` and its test. Also, to keep the form on one unit: `source/apps/web/src/brief/counter.ts` (the counter), `source/apps/web/src/brief/validate.ts` (the idea cap), and their tests in `brief-validation.test.ts`. The core checks in `source/packages/core` (F-13 AC-013, F-04 AC-021) were open and now count code points too (RESOLVED 2026-11-16; see Deferred Findings).

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
