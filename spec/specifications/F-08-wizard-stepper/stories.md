# User Stories — Wizard stepper (F-08)

Feature entry: `spec/documents/features.md` → F-08
Requirements owned by this feature: the F-08 scope items in `features.md` (four steps in a stepper that is not clickable, with done, current and to-do states; Prev and Next buttons beside it; Prev disabled on step 1; Next disabled on step 4; values kept in memory between steps); `ui.md` §1.1 (New project opens the wizard at step 1), §1.3 (wizard frame); `architecture.md` §5 (Material UI for the wizard, panels and buttons) and decision 32 (stepper not clickable, step 4 has no Next). Owner decisions of 2026-11-17: each step body shows its step title and a one-line placeholder; New project starts over at once (F-07 UX approval).

## Out of Scope

- The content of each step: the project name and idea (F-09), the technical details (F-10), the workflow builder on step 3 (F-11, F-12), and the analyze and generate step (F-13). F-08 shows a placeholder body only.
- Any field, counter or validation on a step. A blank project name, or any other content state, never blocks Next in F-08.
- A confirmation dialog before New project discards entered values. New project starts over at once.
- Saving the values anywhere: no `localStorage`, `sessionStorage` or `indexedDB` (decision 13). The values last only until the browser is refreshed.
- Navigation by clicking a step, by a keyboard shortcut or by a link. Navigation is by Prev and Next only (`ui.md` §1.3).
- The API calls of the analyze and generate step (F-14, F-15, F-16).
- The Demo button and presentation mode (F-23, post MVP).
- Phone and tablet layouts (decision 31).

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-08 AC-003`).

### US-001: Four steps in a stepper that is not clickable

**As a** builder user
**I want to** see the four wizard steps in order, each marked as done, current or to do
**So that** I always know where I am and what is left.

**Requirements:** `features.md` F-08 (four steps, not clickable); `ui.md` §1.3; architecture decision 32

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: the stepper shows four steps in this order with these titles: `Project`, `Technical details`, `Workflow`, `Analyze and generate`.
- [ ] AC-002 `[auto]`: the state of each step follows the current step. On step N, steps before N are done, step N is current and steps after N are to do (checked for N = 1, 2, 3 and 4, table-driven).
- [ ] AC-003 `[auto]`: the step titles are not buttons or links, and clicking a step title does not change the current step (negative case: no navigation by the stepper).

### US-002: Prev and Next move through the steps

**As a** builder user
**I want to** move back and forward with Prev and Next at the foot of the left panel, below the stepper
**So that** I can go through the four steps and correct an earlier one.

**Requirements:** `features.md` F-08 (Prev and Next buttons; Prev disabled on step 1; Next disabled on step 4); `ui.md` §1.3

#### Acceptance Criteria

- [ ] AC-004 `[auto]`: the Prev and Next buttons are at the foot of the left panel, below the vertical stepper, and the step body is rendered in the content area beside that panel (owner decision, 2026-11-18: the left-panel layout).
- [ ] AC-005 `[auto]`: Prev is disabled on step 1 and enabled on steps 2, 3 and 4 (table-driven).
- [ ] AC-006 `[auto]`: Next moves the wizard forward by exactly one step from each of steps 1, 2 and 3 (table-driven: 1 → 2, 2 → 3, 3 → 4).
- [ ] AC-007 `[auto]`: Next is shown disabled on step 4 and does not move the wizard past step 4 (negative case: it is not enabled; step 4 has no next step).
- [ ] AC-008 `[auto]`: Prev moves the wizard back by exactly one step (negative case: Prev on step 2 goes to step 1, and it does not clear the values).
- [ ] AC-009 `[auto]`: Next is never disabled by the content of the current step. In particular a blank project name does not block Next from step 1 (negative case for `ui.md` §2).

### US-003: Values are kept in memory between steps

**As a** builder user
**I want to** keep what I entered when I move between steps
**So that** going back and forth does not lose my work during the session.

**Requirements:** `features.md` F-08 (values kept in memory between steps); `architecture.md` decision 13 (browser memory only)

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: the wizard holds one values object in memory; a value set before moving forward is still present after Next, Prev and Next again, through all four steps.
- [ ] AC-011 `[auto]`: the wizard makes no call to `localStorage`, `sessionStorage`, `indexedDB` or `console` (negative case: decision 13 and the web app's privacy rules).

### US-004: New project starts the wizard again

**As a** builder user
**I want to** press New project at any time to start a new project
**So that** I can begin again from step 1 with no values from the earlier project.

**Requirements:** `ui.md` §1.1 (New project opens the wizard at step 1); F-07 UX approval (starts over at once)

#### Acceptance Criteria

- [ ] AC-012 `[auto]`: pressing New project from any step (including step 4) returns the wizard to step 1 at once, clears every value held in memory, and leaves Prev disabled and Next shown (negative case: no value from the earlier project remains).

### US-005: Placeholder step bodies and Material UI

**As a** developer
**I want to** have a body for each step that shows where the step is, built from Material UI
**So that** later features can replace each placeholder with its step content in the same place.

**Requirements:** `features.md` F-08; `architecture.md` §5 (Material UI for the wizard, panels and buttons); `ui.md` §1

#### Acceptance Criteria

- [ ] AC-013 `[auto]`: each step body shows the line `The content of this step is added in a later feature.` and no step title or step counter (the stepper names the step, AC-001), and shows no input field (negative case: F-08 adds no field).
- [ ] AC-014 `[auto]`: the stepper is a Material UI stepper (class `MuiStepper-root`), and the Prev and Next controls are Material UI buttons (class `MuiButton-root`).
- [ ] AC-015 `[device]`: at a window of 1280 × 800 the left panel shows the logo, New project (secondary button), the vertical stepper and Prev and Next at its foot; the step body is visible in the content area beside the panel, with no vertical page scroll.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| F-08 four steps in a stepper | AC-001, AC-002 |
| F-08 stepper not clickable | AC-003 |
| F-08 done, current and to-do states | AC-002 |
| F-08 Prev and Next at the foot of the left panel | AC-004, AC-014 |
| F-08 Prev disabled on step 1 | AC-005 |
| F-08 Next disabled on step 4 | AC-007 |
| F-08 values kept in memory between steps | AC-010, AC-011 |
| `ui.md` §1.1 New project opens the wizard at step 1 | AC-012 |
| `ui.md` §1.3 wizard frame (left panel, then content area) | AC-004, AC-013, AC-015 |
| `ui.md` §2 blank name does not block Next | AC-009 |
| `architecture.md` §5 Material UI | AC-014 |
| `architecture.md` decision 13 memory only | AC-011 |
| `architecture.md` decision 32 navigation and step 4 | AC-003, AC-007 |
