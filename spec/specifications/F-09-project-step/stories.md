# User Stories — Project step (F-09)

Feature entry: `spec/documents/features.md` → F-09
Requirements owned by this feature: the F-09 scope items in `features.md` (project name and idea, 5,000-character idea with a counter); `ui.md` §2 Step 1 — Project and §6 Limits; owner decisions of 2026-11-17: the project name is limited to 100 characters (code points, the same way the idea is counted), and the idea is trimmed at both ends when the configuration is built. `ui.md` §2 and §6 are updated in the build (name limit, idea trim rule).

## Out of Scope

- The analysis of a blank project name or idea: the analysis reports it (F-06, F-14). F-09 never blocks Next on content.
- A counter on the project name field. `ui.md` shows a counter for the idea only.
- Trimming the project name. The name is stored as typed, spaces kept (`ui.md` §2).
- Calling the Analyze API, building the whole configuration or the analyze and generate step (F-13, F-14, F-15, F-16). F-09 only provides the idea trim as a function the later step uses.
- The technical details step (F-10), the workflow builder (F-11, F-12).
- Any storage of the name or idea: no `localStorage`, `sessionStorage` or `indexedDB` (decision 13). Values last until the browser is refreshed.
- Phone and tablet layouts (decision 31).
- Changing the placeholder on steps 2, 3 and 4. They keep the F-08 placeholder line.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-09 AC-003`).

### US-001: Enter the project name

**As a** builder user
**I want to** type a name for my project on one line
**So that** the generated project has a name I chose.

**Requirements:** `features.md` F-09 (name is single-line, stored as typed, required but a blank name does not block Next); `ui.md` §2 Step 1; owner decision 100-character limit

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: the project name is a single-line text input (not a multi-line field), and pressing Enter in it does not add a line break (negative case).
- [ ] AC-002 `[auto]`: the name is stored as typed: leading spaces, trailing spaces and spaces-only text are kept in the wizard values (table-driven: `Demo`, `  Demo  `, `   ` each come back unchanged).
- [ ] AC-003 `[auto]`: typing or pasting past 100 code points keeps the first 100 code points (table-driven: 99 → 99, 100 → 100, 101 → 100; an emoji counts as one code point; a paste that crosses the limit keeps the characters up to 100 and drops the rest).
- [ ] AC-004 `[auto]`: an empty or spaces-only name does not disable Next on step 1 (negative case for the required name: the analysis reports it, not the wizard).

### US-002: Enter the idea with a counter

**As a** builder user
**I want to** describe my project in several lines with a visible limit
**So that** I know how much room I have left and the description stays within the limit.

**Requirements:** `features.md` F-09 (idea of 5,000 characters, counter); `ui.md` §2 Step 1 (idea, counter, paste past the limit); `ui.md` §6 Limits

#### Acceptance Criteria

- [ ] AC-005 `[auto]`: the idea is a multi-line text field, and pressing Enter adds a line break that is kept in the stored value.
- [ ] AC-006 `[auto]`: a counter under the idea shows `N / 5,000`, where N is the number of code points typed (table-driven: empty → `0 / 5,000`; `abc` → `3 / 5,000`; one emoji → `1 / 5,000`; exactly 5,000 code points → `5,000 / 5,000`).
- [ ] AC-007 `[auto]`: typing past 5,000 code points keeps the first 5,000 and drops the rest (negative case: the 5,001st code point is not stored and the counter stays `5,000 / 5,000`).
- [ ] AC-008 `[auto]`: pasting text that crosses the limit keeps the first code points up to 5,000 (table-driven: 4,990 stored + 20 pasted → 5,000 stored; 5,000 stored + any paste → unchanged). A paste never splits an emoji: a surrogate pair that would cross the limit is dropped whole (negative case).
- [ ] AC-009 `[auto]`: an empty or spaces-only idea does not disable Next on step 1 (negative case: the analysis reports it, not the wizard).

### US-003: The idea is trimmed when the configuration is built

**As a** builder user
**I want to** have stray spaces at the start and end of my idea removed before it is analysed or generated
**So that** the analysis and the generated files get the text I meant, while my typing in the field is not interrupted.

**Requirements:** `ui.md` §2 Step 1 and owner decision (trim when the configuration is built, not while typing); `ui.md` §6

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: the idea held in the wizard values keeps leading and trailing spaces exactly as typed; typing a space at the end of the idea leaves that space in the field and in the stored value (negative case: no trim while typing or on Next and Prev).
- [ ] AC-011 `[auto]`: the project-step function that returns the idea for the configuration trims leading and trailing whitespace, and returns an empty string for spaces-only text (table-driven: `  a b  ` → `a b`; `\n\tidea\n` → `idea`; `   ` → empty; internal line breaks are kept). The stored value is not changed by calling it.

### US-004: Step 1 shows the project fields and keeps them between steps

**As a** builder user
**I want to** see the name and idea fields on step 1 and find them again after moving through the wizard
**So that** I can go forward, go back and correct my project without retyping it.

**Requirements:** `features.md` F-09; `ui.md` §1.3 (step body below the stepper and buttons); F-08 AC-010 and AC-012 (values kept in memory, New project clears them); `ui.md` §2 Step 1 help text

#### Acceptance Criteria

- [ ] AC-012 `[auto]`: the step 1 body shows the project name field, the idea field and its counter, and no longer shows the F-08 placeholder line; steps 2, 3 and 4 still show the placeholder line (table-driven over the four steps).
- [ ] AC-013 `[auto]`: a name and an idea entered on step 1 are still present after Next, Prev and Next again, and after going to step 4 and back to step 1 (extends F-08 AC-010).
- [ ] AC-014 `[auto]`: New project clears the name and the idea, and the project step shows them empty again (extends F-08 AC-012; negative case: no value from the earlier project remains).
- [ ] AC-015 `[auto]`: the project step makes no call to `localStorage`, `sessionStorage`, `indexedDB` or `console` when the name or the idea changes (extends F-08 AC-011; decision 13).
- [ ] AC-016 `[device]`: the help text on step 1 matches the approved screen 01 (`spec/design/features/F-05-project-brief-form/01-wizard-project.svg`), and the name field, idea field and counter appear in the layout of that screen at a window of 1280 × 800 with no vertical page scroll.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| `features.md` F-09 project name, single line, stored as typed | AC-001, AC-002 |
| `features.md` F-09 name is required but a blank name does not block Next | AC-004 |
| owner decision: name limit 100 code points | AC-003 |
| `features.md` F-09 idea, multi-line | AC-005 |
| `features.md` F-09 idea limit 5,000 code points | AC-006, AC-007 |
| `features.md` F-09 counter `N / 5,000` | AC-006 |
| `features.md` F-09 paste past the limit keeps the first 5,000 | AC-008 |
| `ui.md` §2 idea and name: a blank idea does not block Next | AC-009 |
| owner decision: idea trimmed when the configuration is built | AC-010, AC-011 |
| `ui.md` §2 step 1 body replaces the F-08 placeholder | AC-012 |
| F-08 AC-010 values kept between steps (extended to name and idea) | AC-013 |
| F-08 AC-012 New project clears the values (extended) | AC-014 |
| `architecture.md` decision 13 memory only | AC-015 |
| `ui.md` §2 step 1 help text as approved screen 01 | AC-016 |
