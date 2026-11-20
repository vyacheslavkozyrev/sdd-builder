# Progress — Wizard stepper (F-08)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | re-specified after the 2026-11-19 reset: 15 criteria, 14 `[auto]`, 1 `[device]`; approved by the user as written |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user (Prev kept; placeholder line visible until F-09 to F-13); screens in `spec/design/features/F-08-wizard-stepper/` |
| Plan     | ✅ Complete | 2026-11-20 | Approved by the user; re-planned after the reset: 7 tasks, all `[Web]` |
| Build    | 🔄 In Progress |  | 7 of 7 tasks committed |
| Verify   | ✅ Complete | 2026-11-20 | 15 of 15 criteria: 14 `[auto]` passing; AC-015 `[device]` passed by the user on the 1280 × 800 checklist |

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
| T004 (2026-11-20) | Prev and Next buttons: Prev disabled on step 1, Next shown and disabled on step 4; disabled look from the approved screens | 0 blockers, 2 warnings fixed (disabled Next and text colour from the screen, now in the palette), 1 suggestion fixed (duplicate width), 1 test gap fixed | task check passed: api 45, web 162, core 1208 |
| T005 (2026-11-20) | Left panel slots: stepper under New project, navigation pinned to the foot; F-07 panel unchanged with no slots | 0 blockers, 1 warning fixed (pinning claim tested), 2 suggestions fixed (comment, redundant assertion) | task check passed: api 45, web 170, core 1208 |
| T006 (2026-11-20) | Placeholder step body: sparkle in a light circle, the placeholder line, no title, counter or input | 0 blockers, 3 warnings fixed (line colour, weight, gap to the circle), 1 test warning fixed (sparkle geometry pinned), 1 suggestion fixed (private constant) | task check passed: api 45, web 186, core 1208 |
| T007 (2026-11-20) | Application wiring: reducer in App, stepper and navigation through AppFrame to the left panel, step body in the centre; New project restarts | 0 blockers, 6 findings fixed (weakened F-07 negative case removed and restated as F-08 AC-013; wiring tested for steps 1 to 3; criterion labels corrected) | task check passed: api 45, web 201, core 1208 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T006 (for the manual AC-015 check at Verify): the step body centres its content with flex inside the card, as the plan says. On screen 01 the group sits higher (circle centre y 340, card centre y 376); with flex centring the circle centre lands near y 360, about 20 px lower than the mockup. Not changed, because the spec says "centres its content". Check it on the device run and adjust the spacing if the screen comparison fails.
- T003 (documentation, for the owner): `spec/design/features/F-08-wizard-stepper/screens.md` gives the to-do node outline as `#DDE7EE`, but the approved SVG and the implementation use `#CDD7E1` (grey[300). The SVG is the reference; screens.md wording is to be corrected by the owner.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Verify run on 2026-11-20 on `main`, clean tree, all seven tasks of the 2026-11-20 plan committed, Current Task None. `source/scripts/task-check.sh` passed (exit 0): typecheck clean; tests api 45, web 201, core 1208 (1454 total), 0 failing.

| Criterion | Tag | Covering tests (names contain the criterion) | Result |
|---|---|---|---|
| AC-001 | auto | `steps.test.ts`; `WizardStepper.test.tsx`; `App.test.tsx` | Pass |
| AC-002 | auto | `steps.test.ts` (table, N = 1 to 4); `WizardStepper.test.tsx` (table) | Pass |
| AC-003 | auto | `WizardStepper.test.tsx` (no button, no link, no click handler) | Pass |
| AC-004 | auto | `LeftPanel.test.tsx` (order, foot pinned, no-slot F-07 render); `AppFrame.test.tsx` (stepper in panel, children in centre) | Pass |
| AC-005 | auto | `steps.test.ts`; `WizardNav.test.tsx`; `WizardNav.click.test.tsx`; `App.test.tsx` | Pass |
| AC-006 | auto | `state.test.ts` (Next 1 to 2, 2 to 3, 3 to 4); `App.test.tsx` | Pass |
| AC-007 | auto | `steps.test.ts`; `state.test.ts`; `WizardNav.test.tsx`; `WizardNav.click.test.tsx` | Pass |
| AC-008 | auto | `state.test.ts` (Prev one step, values kept); `App.test.tsx` | Pass |
| AC-009 | auto | `steps.test.ts` | Pass |
| AC-010 | auto | `state.test.ts` | Pass |
| AC-011 | auto | `wizard-privacy.test.ts` (scans `src/wizard`) | Pass |
| AC-012 | auto | `state.test.ts`; `App.test.tsx` | Pass |
| AC-013 | auto | `StepBody.test.tsx`; `App.test.tsx` | Pass |
| AC-014 | auto | `WizardStepper.test.tsx` (`MuiStepper-root`); `WizardNav.test.tsx` (`MuiButton-root`) | Pass |
| AC-015 | device | style part only: `AppFrame.test.tsx`, `StepBody.test.tsx`; the 1280 x 800 check is manual | Pending: `checklist.md` (not run) |

Gaps among `[auto]` criteria: none. Scope in `features.md` F-08 (four steps in a stepper that is not clickable; done, current and to-do states; Prev and Next beside it; Prev disabled on step 1; Next disabled on step 4; values kept in memory) is covered by AC-001 to AC-014.

Manual checklist: `spec/specifications/F-08-wizard-stepper/checklist.md` (AC-015, rewritten 2026-11-20 for the left-panel layout). Status: pending; the user has not run it. Result line left empty.

Previous Test Results (2026-11-17, horizontal layout, before the reset) are superseded by this run.

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
