# Progress — Wizard stepper (F-08)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 15 criteria: 14 `[auto]`, 1 `[device]`; step bodies are a placeholder per step (user decision); approved by the user |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user (Prev kept; placeholder line visible until F-09 to F-13); screens in `spec/design/features/F-08-wizard-stepper/` |
| Plan     | ✅ Complete | 2026-11-17 | Approved by the user (5 tasks; no new library, arrows as inline SVG) |
| Build    | ✅ Complete | 2026-11-17 | 5 of 5 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Step model as pure functions: titles, states, Prev/Next rules | 0 blockers, 0 warnings, 2 suggestions fixed | task check passed: api 57, web 51, core 1017 |
| T002 | Wizard state reducer: step and in-memory values, restart, privacy check | 0 blockers, 4 warnings fixed (weak test patches) | task check passed: api 57, web 60, core 1017 |
| T003 | Material UI stepper (not clickable) and round Prev/Next buttons with arrows | 0 blockers, 2 warnings fixed (weak tests), 1 suggestion fixed (shared nav styles) | task check passed: api 57, web 83, core 1017 |
| T004 | Placeholder step body and the stepper-then-body wizard panel | 0 blockers, 1 warning fixed (conditional Next test), 1 suggestion fixed (unique gradient id) | task check passed: api 57, web 101, core 1017 |
| T005 | Application root: reducer state, wizard in the frame, New project restarts, F-07 placeholder removed; AppFrame centre area as a flex column (approved deviation) | 0 blockers, 1 warning fixed (App test mock now runs the recorded reducer and checks it is wizardReducer; a wrong New project wiring fails), 1 suggestion fixed (AC-015 test name marks the style part only); deviation reviewed against F-07 AC-006 to AC-010, no regression | task check passed: api 57, web 110, core 1017 |

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

### Deviation — 2026-11-17 (T005, layout)
**Changed**: `source/apps/web/src/layout/AppFrame.tsx` (layout only): the centre area `<main>` is a flex column (`display: flex`, `flexDirection: column`), so the wizard fills the height between the header and the footer. Test added in `source/apps/web/test/AppFrame.test.tsx` (F-08 AC-015).
**Reason**: AppFrame's `<main>` is a block element, so the wizard's `flexGrow` did nothing; the approved screens need the card to span the full centre height (`spec/design/features/F-08-wizard-stepper/screens.md`, decision 4).
**Plan**: T005 covers `App.tsx` and `App.test.tsx` only; this change is outside that list and is needed for the approved screens.
