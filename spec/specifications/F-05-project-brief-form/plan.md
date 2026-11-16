# Implementation Plan — Project wizard: frame, name and idea, workflow host (F-05)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose. Deletions count as changed lines, so the removal of old code is split into tasks of at most 400 lines.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [x] T001 [Web] Wizard state: four steps, Back and Next, values kept between steps — `source/apps/web/src/wizard/state.ts`, `source/apps/web/test/wizard-state.test.ts` — covers AC-001, AC-002, AC-004, AC-005
- [x] T002 [Web] Name and idea state: name stored as typed, idea capped at 8,000 characters with the counter — `source/apps/web/src/wizard/name-idea.ts`, `source/apps/web/test/wizard-name-idea.test.ts` — covers AC-007, AC-008, AC-009
- [x] T003 [Web] Stepper and footer view model: done, current and todo steps; no click target on the stepper; Next hidden on step 4 — `source/apps/web/src/wizard/view.ts`, `source/apps/web/test/wizard-view.test.ts` — covers AC-002, AC-003
- [x] T004 [Web] Wizard screen and App wiring: stepper, footer, step 1 form, placeholders for steps 2 and 4, the flat builder kept at step 3 until F-06, Brief/Builder switch removed — `source/apps/web/src/wizard/Wizard.tsx`, `source/apps/web/src/wizard/NameIdeaStep.tsx`, `source/apps/web/src/wizard/StepPlaceholder.tsx`, `source/apps/web/src/App.tsx`, `source/apps/web/src/styles.css` — covers AC-001, AC-014 (`[device]`: checked against the screens)
- [x] T005 [Web] Remove the flat brief validation tests — `source/apps/web/test/brief-validation.test.ts`, `source/apps/web/test/brief-placement.test.ts` — covers none (removal)
- [x] T006 [Web] Remove the flat brief config tests — `source/apps/web/test/brief-config.test.ts` — covers none (removal)
- [x] T007 [Web] Remove the flat brief dependency and gate tests — `source/apps/web/test/brief-depends.test.ts`, `source/apps/web/test/brief-gate.test.ts` — covers none (removal)
- [x] T008 [Web] Remove the flat brief form components (BriefForm, ModuleRows, RuleList) — `source/apps/web/src/brief/BriefForm.tsx`, `source/apps/web/src/brief/ModuleRows.tsx`, `source/apps/web/src/brief/RuleList.tsx` — covers none (removal)
- [ ] T009 [Web] Remove the flat placement logic (amendment 4: only this file now; nothing imports it) — `source/apps/web/src/brief/placement.ts` — covers none (removal)
- [ ] T010 [Web] Remove the remaining flat brief files (Messages, PrivacyGate, state, privacy, counter) — `source/apps/web/src/brief/Messages.tsx`, `source/apps/web/src/brief/PrivacyGate.tsx`, `source/apps/web/src/brief/state.ts`, `source/apps/web/src/brief/privacy.ts` — covers none (removal; amendment 3: `counter.ts` moved to `source/apps/web/src/wizard/counter.ts` and stays)
- [ ] T011 [Web] Remove the flat analyze request tests — `source/apps/web/test/analyze-request.test.ts` — covers none (removal; F-22 rebuilds analyze)
- [ ] T012 [Web] Remove the flat analyze result tests — `source/apps/web/test/analyze-result.test.ts` — covers none (removal)
- [ ] T013 [Web] Remove the flat analyze panel and logic — `source/apps/web/src/analyze/AnalysisPanel.tsx`, `source/apps/web/src/analyze/in-flight.ts`, `source/apps/web/src/analyze/request.ts`, `source/apps/web/src/analyze/result.ts` — covers none (removal)
- [ ] T013a [Web] Remove the remaining flat brief logic (amendment 4, after T013 removes the importers): `source/apps/web/src/brief/validate.ts`, `source/apps/web/src/brief/to-config.ts`, `source/apps/web/src/brief/progress.ts`, `source/apps/web/src/brief/gate.ts` — covers none (removal)
- [ ] T014 [Web] Privacy and storage static tests: no brief content in console or storage calls, no provider key or variable name in the web source — `source/apps/web/test/wizard-privacy.test.ts` — covers AC-006, AC-012, AC-013
- [ ] T015 [Docs] Architecture web row describes the wizard frame and its steps (F-05, F-21, F-22) and the builder hosted at step 3 (F-06) — `spec/documents/architecture.md` — covers none
- [ ] T016 [Web] Step 3 hosts the F-06 builder on its Map tab, starting from the default pipeline; the pipeline is kept in the wizard state for step 4 — `source/apps/web/src/wizard/WorkflowStep.tsx`, `source/apps/web/src/wizard/Wizard.tsx`, `source/apps/web/test/wizard-workflow-host.test.ts` — covers AC-010, AC-011. **Blocked until F-06 is complete.**

## Rationale

**Why this order.** The state and the logic come first (T001–T003): they have no UI, so they are tested with Vitest, as the architecture asks for `source/apps/web`. The screen (T004) binds them, and the flat brief form is still in place while the new screen is built. The removal (T005–T013) comes after the new screen no longer imports the old code, and each deletion task removes tests before the source they import, so every commit stays green. Deletions are grouped so that no task exceeds 400 changed lines. T014 and T015 follow the features they check. T016 is last, because it needs F-06.

**Unmet prerequisite.** F-06 (visual builder) is not complete. Its Map tab is what step 3 shows, so T016 covers AC-010 and AC-011 and must wait for F-06. Until then, step 3 keeps the existing flat builder (`source/apps/web/src/builder/`), which F-06 replaces. The flat model stays in core until F-06 rebuilds the builder, as decision 19 says. This feature removes only the flat brief and analyze code, because F-05 is its last consumer.

**Steps 2 and 4 are not built here.** Step 2 is F-21 and step 4 is F-22. T004 gives them placeholders, so the frame's four steps and their navigation (AC-001, AC-002) can be proven. Their values are kept in the wizard state (AC-004), so the state has room for them, but F-21 and F-22 define those fields and their tests.

**Architecture constraints.** `source/apps/web` depends on `core` for types and constants only (architecture §1). Browser state lives in React memory only (decision 13): T014 checks this statically, and T001 proves a new mount starts empty. No library beyond those in architecture §5 is added: React, Vite and Vitest are already in the workspace. Components are not tested in the DOM (architecture §5, Tests): T004 is checked by hand against the approved screens (AC-014, `[device]`).

**Layer tags.** Tasks use `[Web]` for `source/apps/web` and `[Docs]` for documentation, as architecture §3 names the modules. The Layer Tags table was not changed, as `/plan` requires; `[Web]` is in use here, so add it to that table when the plan is approved if you agree.

**Test names.** Every test that proves a criterion names it (`F-05 AC-003 …`), and each test file is listed with its task. Removal tasks name no criterion, because they delete tests of the old flat code.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Docs]` | Documentation changes required by the feature |

Add layer tags matching the modules in `architecture.md` §3.
