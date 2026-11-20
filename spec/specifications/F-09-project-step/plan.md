# Implementation Plan — Project step (F-09)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [x] T001 [Web] Project text rules as pure functions: the code-point count, truncation to the first N code points that never splits a surrogate pair (limits 100 for the name, 5,000 for the idea), the counter text `N / 5,000` with the thousands separator, and `ideaForConfig` (trims both ends, keeps internal line breaks, spaces-only gives an empty string, the stored value is not changed) — `source/apps/web/src/wizard/project.ts`, `source/apps/web/test/project.test.ts` — covers AC-003 (rule), AC-006 (counter text), AC-007 (rule), AC-008 (rule), AC-011

- [ ] T002 [Web] Wizard values for the project step: `WizardValues` gains `name` and `idea` (empty strings at start); a `setValues` action merges one or both fields as typed (no trim, spaces kept); Next and Prev keep the values; restart clears them. Extends the F-08 state tests — `source/apps/web/src/wizard/state.ts`, `source/apps/web/test/state.test.ts` — covers AC-002 (reducer), AC-010 (reducer), AC-013 (reducer), AC-014 (reducer)

- [ ] T003 [Web] Project step body: `ProjectStep` with the name as a single-line Material UI `TextField` (required mark, help line `Up to 100 characters; text past the limit is cut. It appears as the project name in the generated CLAUDE.md.`, no counter), and the idea as a multi-line `TextField` with the counter `N / 5,000` and its help lines (`Describe what the product does and who uses it. Leave out how it is built.`, `Nothing is stored between visits. Reloading clears the wizard.`, `Up to 5,000 characters. Text past the limit is cut.`). Both fields are limited on every change with the T001 rules, so a paste is limited too. The help strings are exported constants that the test compares with the rendered text. The layout uses the getter `getProjectStepStyles(theme)` in `source/apps/web/src/wizard/projectStepStyles.ts` — `source/apps/web/src/wizard/ProjectStep.tsx`, `source/apps/web/src/wizard/projectStepStyles.ts`, `source/apps/web/test/ProjectStep.test.tsx` — covers AC-001, AC-003 (field), AC-005, AC-006 (display), AC-007 (field), AC-008 (field), AC-012 (fields shown), AC-015 (no storage or console call in the step), AC-016 (help text constants), AC-017 (layout, checked at Verify)

- [ ] T004 [Web] Wizard wiring: `StepBody` takes the step and shows `ProjectStep` on step 1 and the F-08 placeholder on steps 2 to 4; `App` holds the values in the reducer and passes them and the update handler down; Next is never disabled by a blank name or idea; the privacy test scans the project step. Updates the F-08 step-body and app tests that expect the placeholder on step 1 — `source/apps/web/src/App.tsx`, `source/apps/web/src/wizard/StepBody.tsx`, `source/apps/web/test/StepBody.test.tsx`, `source/apps/web/test/App.test.tsx`, `source/apps/web/test/wizard-privacy.test.ts` — covers AC-004, AC-009, AC-012 (step selection), AC-013 (wiring), AC-014 (wiring), AC-015 (privacy scan)

## Rationale

- **Starting point.** Commit `58ef413` removed the F-02 to F-13 code "to start the build over". The earlier F-09 code (`d19905f` to `e97faaa`) is in history and may be read with `git show <sha>:<path>` as a reference, but the tasks write the files again against the current F-08 wizard (`state.ts`, `steps.ts`, `StepBody.tsx`, `WizardStepper.tsx`, `WizardNav.tsx`, `App.tsx`).
- **Order.** T001 is pure logic with no React, and T002 to T004 read its limits and counter. T002 extends the state the step reads and writes. T003 is the step body, built on T001 and on the value shape of T002. T004 wires it into `App` and `StepBody`, so it comes last. Only the layer `[Web]` is touched: `core` and `api` have no project-step logic in this feature (the configuration is built by F-13).
- **Where the rules live.** The limits, the counter and the trim are view-model logic in `source/apps/web/src/wizard/project.ts`, as the stories put them. The configuration built from them comes with F-13, which will call `ideaForConfig`. This keeps `web` free of `api` and `core` free of UI.
- **Documents already current.** `ui.md` §2 and §6 and `features.md` F-09 already state the 100-character name limit, the idea trim and the name without a counter (commits `846e914` and `78b62d2`, still in the tree). No documentation task is needed.
- **Libraries.** Only `@mui/material` (`TextField`, already used by the F-08 wizard code). No new dependency, as `architecture.md` §5 allows.
- **Testing without a DOM.** As in F-07 and F-08, the web package has no DOM test library. Component tests render with `react-dom/server` and check markup and the exported help constants; change behaviour is checked by finding the `TextField` in the React element tree and calling its `onChange` with a fixed value, so typing and paste take the same path. No test uses the wall clock, the network or browser storage.
- **Counting.** Code points are counted with `Array.from`, so an emoji is one; truncation slices by code points, so a surrogate pair is never split (AC-008 negative case).
- **Trim timing.** The stored idea keeps what was typed (AC-010); only `ideaForConfig` trims it, as decided with the owner on 2026-11-17. Trimming while typing would delete a typed space, so the field does not trim.
- **Help text.** The name help line is the approved screen 01 text as drawn (owner answer, 2026-11-20). It is checked by an `[auto]` test (AC-016); the layout is a `[device]` check (AC-017) for the manual checklist.
- **Styles.** Per `.claude/rules/web-styling.md`: no inline `sx` or `style` objects, the layout comes from `getProjectStepStyles(theme)`, and colours come from the palette.
- **Coverage.** Every `[auto]` criterion (AC-001 to AC-016) is named by a task that has its test; AC-017 is `[device]` and is covered by T003.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Web]` | `source/apps/web`: the project text rules, the wizard values, the project step body, the wizard and app wiring |
| `[Docs]` | Documentation changes required by the feature (none needed: already current) |
