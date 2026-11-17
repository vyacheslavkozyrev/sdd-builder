# Progress — Wizard stepper (F-08)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 15 criteria: 14 `[auto]`, 1 `[device]`; step bodies are a placeholder per step (user decision); approved by the user |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user (Prev kept; placeholder line visible until F-09 to F-13); screens in `spec/design/features/F-08-wizard-stepper/` |
| Plan     | ✅ Complete | 2026-11-17 | Approved by the user (5 tasks; no new library, arrows as inline SVG) |
| Build    | ⏳ Pending  |      | 0 of 5 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment — 2026-11-17 (AC-013)
**Changed**: `stories.md` AC-013: the step body shows the placeholder line only (no step title or counter); the step title is shown in the stepper (AC-001). Made by the user's decision during UX, before the screens were approved.
**Reason**: The user removed the step pill and the body title from the card; the stepper names the step.
**Impact**: None on tasks. The implementation must not render a title or counter in the step body.
