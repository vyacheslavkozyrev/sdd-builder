# Implementation Plan — Wizard stepper (F-08)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Re-planned 2026-11-20 after the 2026-11-19 reset of the Build phase. The earlier F-08 tasks are no longer in the tree (the F-07 frame was rebuilt since), so every task below is new. The stories (`stories.md`, approved 2026-11-20), the approved screens (`spec/design/features/F-08-wizard-stepper/`) and the F-07 frame are the sources.

## Tasks

- [x] T001 [Web] Step model as pure functions: the four step titles (`Project`, `Technical details`, `Workflow`, `Analyze and generate`), the state of each step for a given current step (done, current, to do), and the Prev and Next enabled flags for a step (Prev disabled on step 1; Next disabled on step 4). The functions take only the step number, so no value can block Next — `source/apps/web/src/wizard/steps.ts`, `source/apps/web/test/steps.test.ts` — covers AC-001, AC-002, AC-005, AC-007, AC-009
- [x] T002 [Web] Wizard state reducer: `{ step, values }` with an empty values object type that F-09 and F-10 extend. Next moves forward by exactly one step up to step 4 and does nothing on step 4; Prev moves back by exactly one step down to step 1; both keep the values. New project (restart) returns to step 1 with the initial values. No `localStorage`, `sessionStorage`, `indexedDB` or `console` call in `src/wizard` — `source/apps/web/src/wizard/state.ts`, `source/apps/web/test/state.test.ts`, `source/apps/web/test/wizard-privacy.test.ts` — covers AC-006, AC-007 (reducer), AC-008, AC-010, AC-011, AC-012 (reducer)
- [x] T003 [Web] Palette and stepper: add the done colours to `source/apps/web/src/theme.ts` first (`success.main` `#15B79F`, `success.dark` `#107569`, the Material Kit kepple 500 and 600 of the approved screens). Then a vertical Material UI `Stepper` (class `MuiStepper-root`) with four `StepLabel`s, no `StepButton`, no `onClick`, and a custom step icon: a number in an outlined circle (to do), a violet number with a soft ring (current), a green circle with a white check-mark path (done). Labels are plain text, not buttons or links. Styles come from `getWizardStepperStyles(theme)` in `source/apps/web/src/wizard/wizardStyles.ts`, read with `useTheme()` — `source/apps/web/src/theme.ts`, `source/apps/web/src/wizard/WizardStepper.tsx`, `source/apps/web/src/wizard/wizardStyles.ts`, `source/apps/web/test/WizardStepper.test.tsx` — covers AC-001, AC-002, AC-003, AC-014 (stepper)
- [x] T004 [Web] Prev and Next buttons: two Material UI `Button`s (class `MuiButton-root`), side by side, 100 × 40 px, 8 px radius, each with its word inside (`Prev`, `Next`). Prev is disabled on step 1; Next is shown on every step and disabled on step 4, keeping its place. Enabled buttons call `onPrev` or `onNext`; disabled ones call nothing. The component takes the enabled flags from T001 — `source/apps/web/src/wizard/WizardNav.tsx`, `source/apps/web/src/wizard/wizardStyles.ts` (added getter `getWizardNavStyles`), `source/apps/web/test/WizardNav.test.tsx` — covers AC-005, AC-007 (markup and element tree), AC-014 (buttons)
- [x] T005 [Web] Left panel slots: `LeftPanel` takes an optional stepper slot below New project and an optional navigation slot pinned to the foot of the panel (the panel is a flex column; the foot slot sits at the bottom). With no slots the panel renders exactly as F-07 (logo, wordmark, New project, no other button) — `source/apps/web/src/layout/LeftPanel.tsx`, `source/apps/web/src/layout/layoutStyles.ts`, `source/apps/web/test/LeftPanel.test.tsx` — covers AC-004 (left panel order: stepper above, Prev and Next at the foot); F-07 `LeftPanel.test.tsx` and `LeftPanel.click.test.tsx` stay green
- [x] T006 [Web] Step body: a placeholder card body for the current step, shown in the centre area of the frame. It holds a sparkle mark (inline SVG) in a light circle, the line `The content of this step is added in a later feature.`, and no step title, no step counter and no input. It fills the height of the white card and centres its content — `source/apps/web/src/wizard/StepBody.tsx`, `source/apps/web/src/wizard/wizardStyles.ts` (added getter `getStepBodyStyles`), `source/apps/web/test/StepBody.test.tsx` — covers AC-004 (body in the content area), AC-013, AC-015 (style part: the body fills the card; the one-screen check is manual)
- [x] T007 [Web] Application wiring: `App` holds the wizard state with `useReducer` over the T002 reducer; `AppFrame` passes the stepper and the navigation to `LeftPanel` and the step body to the centre area; New project dispatches restart; the F-07 comment that New project does nothing until F-08 is removed — `source/apps/web/src/App.tsx`, `source/apps/web/src/layout/AppFrame.tsx`, `source/apps/web/test/App.test.tsx`, `source/apps/web/test/AppFrame.test.tsx` — covers AC-012 (wiring), AC-006 (wired), F-07 AC-006 to AC-008 regression kept (the frame still renders left panel, centre area, footer in order)

## Rationale

- **Order.** T001 is the pure step model with no React, so it is tested alone and every later task reads its rules. T002 is the reducer over the model; it holds the values and the restart and is the place the storage and privacy rule is checked. T003 adds the palette first, as the styling rule requires, and then the stepper that uses it. T004 is the Prev and Next buttons, which read the T001 flags. T005 gives the left panel its two slots, so the stepper and buttons have a place to go without changing what F-07 renders on its own. T006 is the step body in the centre area. T007 wires the reducer into `App` and the slots into `AppFrame`, so it comes last.
- **Values.** In F-08 the values object is empty. It is typed in `state.ts` as an empty object type that F-09 and F-10 extend with their fields. No `core` model change (`architecture.md` §5, decision 19).
- **Libraries.** Only `@mui/material` (pinned by F-07 T001) and `react` are used. The stepper, `StepLabel`, `Button` and the palette come from them. The check mark and the sparkle are inline SVG, because no icon library is listed in `architecture.md` §5; adding one needs the user's approval.
- **Styling.** Each component reads its style from a getter that takes the theme (`get<Name>Styles(theme)`, `.claude/rules/web-styling.md`). The F-08 getters live in `wizardStyles.ts`; shared shapes (the outlined button, the card) come from `common.ts`. The done green is the only new palette value.
- **Testing without a browser.** Click tests use the jsdom setup that `LeftPanel.click.test.tsx` already uses (`// @vitest-environment jsdom`); markup tests use `react-dom/server` as F-07 does. AC-003, AC-007 and AC-014 are checked on the markup and on the element tree (the handler of the disabled Next is absent or disabled). Each test names its criterion (`F-08 AC-003 …`).
- **Device criterion.** AC-015 (the left panel, the stepper, Prev and Next, and the body fit the 1280 × 800 window with no vertical scroll) is `[device]`. T006 and T007 build its style part; the window check is in the manual checklist at Verify.
- **Scope.** No step content (F-09 to F-13). Step bodies are placeholders only. No Demo button, no storage, no clickable steps. Navigation is by Prev and Next only.
- **Flags over content.** Next's enabled state depends only on the step number, so no field added by F-09 to F-13 can block it (AC-009). Those features extend the values, not the flags.
- **Checklist.** `checklist.md` still describes the old horizontal row (`Prev` round, the stepper between the buttons). It is rewritten for the left-panel layout during Verify, before the device check, so it does not describe the wrong screen.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Web]` | `source/apps/web`: the wizard step model, state, stepper, navigation, body, screen wiring |
| `[Docs]` | Documentation changes required by the feature |

No `[Docs]` task: `ui.md` §1 and §7 were updated to the approved left-panel layout in the spec commit `66c4eeb`, before planning, so the behaviour matches the documents.
