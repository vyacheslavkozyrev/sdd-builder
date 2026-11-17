# Implementation Plan — Wizard stepper (F-08)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [x] T001 [Web] Step model as pure functions: the four step titles, the state of each step for a current step (done, current, to do), and the Prev and Next rules (Prev disabled on step 1, Next absent on step 4, Next never blocked by content) — `source/apps/web/src/wizard/steps.ts`, `source/apps/web/test/steps.test.ts` — covers AC-001, AC-002, AC-005, AC-006, AC-007, AC-009
- [x] T002 [Web] Wizard state reducer: the current step and the in-memory values; Next and Prev keep the values; restart returns to step 1 with the initial values; no storage or console call in the wizard source — `source/apps/web/src/wizard/state.ts`, `source/apps/web/test/state.test.ts`, `source/apps/web/test/wizard-privacy.test.ts` — covers AC-008, AC-010, AC-011, AC-012 (logic)
- [x] T003 [Web] Stepper and navigation: a Material UI stepper (not clickable, no handler), with the four titles and their states; round Prev and Next Material UI buttons, each with a caption and an inline arrow icon, on one row beside the stepper; Prev disabled on step 1; Next not rendered on step 4 — `source/apps/web/src/wizard/WizardStepper.tsx`, `source/apps/web/test/WizardStepper.test.tsx` — covers AC-001, AC-002, AC-003, AC-004 (row), AC-005, AC-007, AC-014
- [x] T004 [Web] Step body and wizard panel: the body shows the placeholder line only and no input; the wizard renders the stepper row first and the body below it, filling the centre area — `source/apps/web/src/wizard/StepBody.tsx`, `source/apps/web/src/wizard/Wizard.tsx`, `source/apps/web/test/Wizard.test.tsx` — covers AC-004 (order), AC-013, AC-015 (device: the row and the body fill the window; checked at Verify)
- [x] T005 [Web] Application screen wiring: `App` holds the reducer state; the screen renders the wizard inside the F-07 frame; New project dispatches restart; the F-07 centre placeholder text is removed — `source/apps/web/src/App.tsx`, `source/apps/web/test/App.test.tsx` — covers AC-012 (wiring), AC-008 (F-07 regression kept)
- [x] T006 [Web] Amendment 2026-11-17: Next is shown disabled on step 4 (was hidden). Next keeps its place on every step; disabled on step 4 and does not move past it. Update the step model rule, the stepper and the wizard tests — `source/apps/web/src/wizard/steps.ts`, `source/apps/web/src/wizard/WizardStepper.tsx`, `source/apps/web/test/steps.test.ts`, `source/apps/web/test/WizardStepper.test.tsx`, `source/apps/web/test/Wizard.test.tsx` — covers AC-007 (amended), AC-004

## Rationale

- **Order.** T001 is the pure step model with no React, so its tests need nothing else. T002 is the state reducer over the step model; it holds the values and the restart, and it is the place the storage and privacy rule is checked. T003 is the stepper and buttons, built on T001 for the states and the Prev and Next rules. T004 composes T003 with the placeholder body and sets the order of the panel and the body. T005 is the application root, which uses the reducer from T002 and the wizard from T004, so it comes last.
- **Values.** In F-08 the values object is empty. It is typed in `state.ts` as an empty interface that F-09 and F-10 extend with their fields. No `core` model change: the flat `ProjectConfig` and the pipeline model are the business of their own features (`architecture.md` §5, decision 19).
- **Libraries.** Only `@mui/material` (already pinned by F-07 T001) is used. The stepper and buttons come from it. The Prev and Next arrows are inline SVG, because no icon library is listed in `architecture.md` §5; adding one needs the user's approval.
- **Testing without a DOM.** The web package has no DOM test library. As in F-07, component tests render with `react-dom/server` and check the markup for text, order and Material UI class names (`MuiStepper-root`, `MuiButton-root`). Click behaviour (New project, Prev, Next) is checked by finding the element in the React element tree and invoking its handler with a spy, not by dispatching events. AC-003 and AC-007 are negative checks on the markup and the element tree.
- **Device criterion.** AC-015 (one row at 1280 × 800, no vertical scroll) is `[device]` and is not a task. The row and the body are built by T003 and T004; the check is part of the manual checklist at Verify.
- **Scope.** No step content (F-09, F-10, F-11, F-12, F-13). The step bodies are placeholders only. No Demo button, no storage, no clickable steps.
- **Reducer over state.** Restart and Prev and Next go through one reducer, so the rules are tested once in T002 and the screen in T005 only wires them.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Web]` | `source/apps/web`: the wizard step model, state, stepper, body, screen wiring |
| `[Docs]` | Documentation changes required by the feature |

No `[Docs]` task: the behaviour matches `ui.md` §1.3 and §2, so no document changes.
