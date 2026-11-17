# Implementation Plan — Project step (F-09)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [x] T001 [Web] Project text rules as pure functions: the name and idea limits in code points (100 and 5,000), truncation to the first N code points that never splits an emoji, the counter text `N / 5,000` with thousands separators, and the idea trim for the configuration (both ends, the stored value unchanged) — `source/apps/web/src/wizard/project.ts`, `source/apps/web/test/project.test.ts` — covers AC-003 (rule), AC-006 (counter text), AC-007 (rule), AC-008 (rule), AC-011
- [x] T002 [Web] Wizard values for the project step: `WizardValues` gains `name` and `idea` (empty strings initially); the update action merges them; Next and Prev keep them as typed (spaces kept, no trim); restart clears them. Updates the F-08 state tests that expect an empty values object — `source/apps/web/src/wizard/state.ts`, `source/apps/web/test/state.test.ts` — covers AC-002, AC-010, AC-013 (reducer), AC-014 (reducer)
- [ ] T003 [Web] Project step body: the name as a single-line Material UI text field with its required mark and help line, the idea as a multi-line text field with the counter `N / 5,000` and its help lines, both limited on change with the T001 rules (a paste is a change, so it is limited too) — `source/apps/web/src/wizard/ProjectStep.tsx`, `source/apps/web/test/ProjectStep.test.tsx` — covers AC-001, AC-003 (field), AC-005, AC-006 (display), AC-007 (field), AC-008 (field), AC-012 (fields shown), AC-015 (no storage or console call in the step), AC-016 (help text and layout: checked at Verify)
- [ ] T004 [Web] Wizard and app wiring: the wizard shows `ProjectStep` on step 1 and the F-08 placeholder body on steps 2 to 4; values and the update handler pass from `App` through `Wizard`; Next is never disabled by a blank name or idea; the privacy test covers the project step — `source/apps/web/src/wizard/Wizard.tsx`, `source/apps/web/src/App.tsx`, `source/apps/web/test/Wizard.test.tsx`, `source/apps/web/test/App.test.tsx`, `source/apps/web/test/wizard-privacy.test.ts` — covers AC-004, AC-009, AC-012 (step selection), AC-013 (wiring), AC-014 (wiring), AC-015 (privacy)
- [ ] T005 [Docs] `ui.md` §2 Step 1 and §6: the name limit of 100 code points and the rule that the idea is trimmed when the configuration is built, with the name having no counter — `spec/documents/ui.md` — covers AC-003, AC-011 (documented)

## Rationale

- **Order.** T001 is pure logic with no React, so its tests need nothing else, and every later task reads its limits and counter from it. T002 extends the wizard state the step reads and writes. T003 is the step body, built on T001 for its rules and on the value shape from T002. T004 wires the body into the wizard and the app root, so it comes after both. T005 is documentation, last, once the behaviour is in place.
- **Superseded placeholder.** F-08 AC-013 says every step body shows the placeholder line. F-09 AC-012 replaces it for step 1 only. T004 changes the F-08 wizard test for step 1 and keeps the placeholder test for steps 2 to 4. F-08's own spec is not edited; this note is the record.
- **Where the rules live.** The limits, the counter and the trim are web view-model logic in `source/apps/web/src/wizard/project.ts`, not in `core`. `core` has no project-step logic yet; the configuration built from these values comes with F-13 (Analyze and generate), which will call `ideaForConfig`. That keeps the dependency direction (`web` does not depend on `api`, and `core` stays free of UI concerns).
- **Libraries.** Only `@mui/material` is used, through `TextField` (already used by the F-07 and F-08 wizard code). No new dependency; no icon library. This matches `architecture.md` §5.
- **Testing without a DOM.** As in F-07 and F-08, the web package has no DOM test library. Component tests render with `react-dom/server` and check markup (text, Material UI classes, `multiline`); change behaviour is checked by finding the `TextField` element in the React element tree and calling its `onChange` with a fixed value, so paste and typing use the same path. No test uses the wall clock, the network or browser storage.
- **Counting.** Code points are counted with `Array.from`, so an emoji is one, and truncation slices by code points, so a surrogate pair is never split (AC-008 negative case).
- **Trim timing.** The stored idea keeps what was typed (AC-010); only `ideaForConfig` trims it, as decided with the owner on 2026-11-17. Trimming while typing would delete a space as it is typed, so it is not done in the field.
- **Open point carried into T003.** The name help line follows screen 01 as drawn, which adds the 100-character limit to the approved F-05 help line. AC-016 still says "as the approved screen". The owner's choice (amend AC-016, or restore the approved line) must be made before Verify; it changes one line of text in T003 and the wording of AC-016 only.
- **Scope.** No Analyze, no configuration build and no storage (F-13, F-14; decision 13). The placeholder body stays on steps 2 to 4 (F-10 to F-13 replace it).

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Web]` | `source/apps/web`: the project text rules, the wizard values, the project step body, the wizard and app wiring |
| `[Docs]` | Documentation changes required by the feature |
