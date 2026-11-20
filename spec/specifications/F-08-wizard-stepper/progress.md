# Progress — Wizard stepper (F-08)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | re-specified after the 2026-11-19 reset: 15 criteria, 14 `[auto]`, 1 `[device]`; approved by the user as written |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user (Prev kept; placeholder line visible until F-09 to F-13); screens in `spec/design/features/F-08-wizard-stepper/` |
| Plan     | ✅ Complete | 2026-11-20 | Approved by the user; re-planned after the reset: 7 tasks, all `[Web]` |
| Build    | 🔄 In Progress |  | 3 of 7 tasks committed |
| Verify   | ⏳ Pending |  | reset 2026-11-19: to be re-specified from the final schema and architecture |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

_The rows below are the 2026-11-17 build, superseded by the reset of 2026-11-19. The re-planned tasks (T001 to T007 of 2026-11-20) are logged from their commits below these rows._

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Step model as pure functions: titles, states, Prev/Next rules | 0 blockers, 0 warnings, 2 suggestions fixed | task check passed: api 57, web 51, core 1017 |
| T002 | Wizard state reducer: step and in-memory values, restart, privacy check | 0 blockers, 4 warnings fixed (weak test patches) | task check passed: api 57, web 60, core 1017 |
| T003 | Material UI stepper (not clickable) and round Prev/Next buttons with arrows | 0 blockers, 2 warnings fixed (weak tests), 1 suggestion fixed (shared nav styles) | task check passed: api 57, web 83, core 1017 |
| T004 | Placeholder step body and the stepper-then-body wizard panel | 0 blockers, 1 warning fixed (conditional Next test), 1 suggestion fixed (unique gradient id) | task check passed: api 57, web 101, core 1017 |
| T005 | Application root: reducer state, wizard in the frame, New project restarts, F-07 placeholder removed; AppFrame centre area as a flex column (approved deviation) | 0 blockers, 1 warning fixed (App test mock now runs the recorded reducer and checks it is wizardReducer; a wrong New project wiring fails), 1 suggestion fixed (AC-015 test name marks the style part only); deviation reviewed against F-07 AC-006 to AC-010, no regression | task check passed: api 57, web 110, core 1017 |
| T006 | Next is shown disabled on step 4 (amendment to AC-007); Next kept in place on every step | 0 blockers, 0 warnings, 1 suggestion fixed | task check passed: api 57, web 114, core 1017 |
| T001 (2026-11-20) | Step model as pure functions: titles, done/current/to-do states, Prev and Next flags | 0 blockers, 2 warnings fixed (AC-009 weak tests), 2 suggestions fixed (casts) | task check passed: api 45, web 74, core 1208 |
| T002 (2026-11-20) | Wizard state reducer: step and values, Next and Prev one step, restart, privacy scan | 0 blockers, 1 warning fixed (marker fixture typed as empty values), 1 suggestion fixed (weak input-unchanged assertion) | task check passed: api 45, web 106, core 1208 |
| T003 (2026-11-20) | Palette success colours and vertical MUI stepper (not clickable), states, per-node title for screen readers | 0 blockers, 4 warnings fixed (label size, node title U-03, connector colour, ring as in the SVG), 1 suggestion fixed (redundant disabled prop) | task check passed: api 45, web 128, core 1208 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T003 (documentation, for the owner): `spec/design/features/F-08-wizard-stepper/screens.md` gives the to-do node outline as `#DDE7EE`, but the approved SVG and the implementation use `#CDD7E1` (grey[300). The SVG is the reference; screens.md wording is to be corrected by the owner.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Verify re-run on 2026-11-17 on `main`, clean tree, all six tasks committed (T006 is the AC-007 amendment: Next shown disabled on step 4). `source/scripts/task-check.sh` passed: typecheck clean in api, web and core; tests api 57, web 114, core 1017 (1188 total), 0 failing.

| Criterion | Tag | Covering tests (names contain the criterion) | Result |
|---|---|---|---|
| AC-001 | auto | `steps.test.ts` AC-001; `WizardStepper.test.tsx` AC-001 | Covered |
| AC-002 | auto | `steps.test.ts` AC-002 (×4 table plus one-current check); `WizardStepper.test.tsx` AC-002 (table) | Covered |
| AC-003 | auto | `WizardStepper.test.tsx` AC-003 (×3: no title as button or link; no stepper click handler) | Covered |
| AC-004 | auto | `Wizard.test.tsx` AC-004 (×4: order, Prev and Next above body); `WizardStepper.test.tsx` AC-004 (one row) | Covered |
| AC-005 | auto | `steps.test.ts` AC-005 (table, plus programmer-error case); `WizardStepper.test.tsx` AC-005 (table) | Covered |
| AC-006 | auto | `steps.test.ts` AC-006 (1→2, 2→3, 3→4); `WizardStepper.test.tsx` AC-006 (×3, plus Prev); `App.test.tsx` AC-006 | Covered |
| AC-007 | auto | `steps.test.ts` AC-007 (×2: disabled on 4, enabled on 1–3); `WizardStepper.test.tsx` AC-007 (step 4 Next disabled; Next enabled on 1–3, table; Next in the same place on every step); `Wizard.test.tsx` AC-007 (step 4 Next disabled above the body) | Covered |
| AC-008 | auto | `steps.test.ts` AC-008 (×2); `state.test.ts` AC-008 (×2); `App.test.tsx` AC-008 | Covered |
| AC-009 | auto | `steps.test.ts` AC-009 | Covered |
| AC-010 | auto | `state.test.ts` AC-010 (×2) | Covered |
| AC-011 | auto | `wizard-privacy.test.ts` AC-011 (no `localStorage`, `sessionStorage`, `indexedDB` or `console` in `src/wizard`) | Covered |
| AC-012 | auto | `state.test.ts` AC-012 (×4); `App.test.tsx` AC-012 (×5) | Covered |
| AC-013 | auto | `Wizard.test.tsx` AC-013 (×5: placeholder line, no repeated title, no counter, no input) | Covered |
| AC-014 | auto | `WizardStepper.test.tsx` AC-014 (×2: `MuiStepper-root`, `MuiButton-root`) | Covered |
| AC-015 | device | `AppFrame.test.tsx` AC-015 covers the style part only (flex column); the one-row and no-scroll check is manual | Pending: `checklist.md` |

Gaps among `[auto]` criteria: none. Scope in `features.md` (F-08: four steps in a stepper that is not clickable; done, current and to-do states; Prev and Next beside it; Prev disabled on step 1; Next shown disabled on step 4; values kept in memory) is covered by AC-001 to AC-014 as in the Requirement Coverage table.

Manual checklist: `spec/specifications/F-08-wizard-stepper/checklist.md` (AC-015 at 1280 × 800, one step at a time through the four steps). Outcome: passed by the user on 2026-11-17.

Document note (not a gap): `screens.md` still records an open "story conflict" on AC-013 and shows Approval as pending. `stories.md` AC-013 already carries the 2026-11-17 amendment (placeholder line only), and the progress log records the UX as approved. The caller may want the screens file brought in line.

---

## Amendments

### Amendment — 2026-11-17 (AC-007, after Verify)
**Changed**: `stories.md` AC-007 and `ui.md` §1.3, `features.md` F-08, `architecture.md` decision 32, screens 04 and their notes: on step 4 Next is shown disabled, not hidden. The user reported the vanished Next button on the last step and asked for a disabled one.
**Reason**: The user's report on the built app; the disabled Next keeps the row still and shows the step is the last.
**Impact**: new task T006 at the end of `plan.md`; Verify is re-run after it and AC-015 is checked again.

### Amendment — 2026-11-17 (AC-013)
**Changed**: `stories.md` AC-013: the step body shows the placeholder line only (no step title or counter); the step title is shown in the stepper (AC-001). Made by the user's decision during UX, before the screens were approved.
**Reason**: The user removed the step pill and the body title from the card; the stepper names the step.
**Impact**: None on tasks. The implementation must not render a title or counter in the step body.

### Deviation — 2026-11-17 (T005, layout)
**Changed**: `source/apps/web/src/layout/AppFrame.tsx` (layout only): the centre area `<main>` is a flex column (`display: flex`, `flexDirection: column`), so the wizard fills the height between the header and the footer. Test added in `source/apps/web/test/AppFrame.test.tsx` (F-08 AC-015).
**Reason**: AppFrame's `<main>` is a block element, so the wizard's `flexGrow` did nothing; the approved screens need the card to span the full centre height (`spec/design/features/F-08-wizard-stepper/screens.md`, decision 4).
**Plan**: T005 covers `App.tsx` and `App.test.tsx` only; this change is outside that list and is needed for the approved screens.
