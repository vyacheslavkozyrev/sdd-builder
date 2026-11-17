# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 16 criteria: 15 `[auto]`, 1 `[device]`; name limit 100 code points and idea trimmed when the configuration is built (owner decisions); approved by the user |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user; screens in `spec/design/features/F-09-project-step/` on the F-08 frame. Open: name help line vs AC-016, limit note styling (kept as drawn) |
| Plan     | ✅ Complete | 2026-11-17 | Approved by the user (5 tasks); name help line kept as drawn, AC-016 wording still to be settled before Verify |
| Build    | 🔄 In Progress |      | 1 of 5 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Project text rules as pure functions: 100 and 5,000 code-point limits, truncation that never splits an emoji, counter text, idea trim for the configuration | 0 blockers, 1 warning fixed (trim test could not fail; now idempotent), 1 suggestion fixed (paste-style name case) | task check passed: web 132, core 1017 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

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
