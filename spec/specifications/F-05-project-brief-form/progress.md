# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-15 | Stories approved by the user, then split on 2026-11-15 into F-05 (frame, step 1, step 3 host, privacy: 14 criteria), F-21 (step 2: 10 criteria) and F-22 (step 4: 15 criteria). Criteria renumbered per feature. Decisions carried over: Generate waits for an analysis with no blockers; privacy notice on step 4 only; testing rules an ordinary block; stepper by Back and Next only; findings as plain text; file tree from core `planGeneration`; optional `architecture` string in the config (needs its `architecture.md` §5 record before the plan). Depends on F-06 for step 3 (AC-010, AC-011) |
| UX       | ✅ Complete | 2026-11-15 | Approved by the user. Reviewed by the `usability` and `visual` agents; the three open points decided (drag plus a select-then-add route in F-06; storage line kept on step 1; approval gates orange, rule chips violet) |
| Plan     | ✅ Complete | 2026-11-15 | Approved by the user before any code is written; 16 tasks (T001–T016); T016 blocked until F-06 is complete |
| Build    | 🔄 In Progress | 2026-11-15 | 1 of 16 tasks committed |
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

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment 1 — 2026-11-16
**Changed**: `stories.md` AC-008: the counter reads `8,000 / 8,000` with a thousands separator, as the approved screen 01 draws it.
**Reason**: AC-008 said `8000 / 8000`, but the approved screen shows `142 / 8,000`. Approved by the user on 2026-11-16 (keep the screen's format).
**Impact**: T002 (the counter helper groups thousands) and its test.

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
