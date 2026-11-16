# User Stories — Project wizard step 2: technical details and code rules (F-21)

Feature entry: `spec/documents/features.md` → F-21
Screens: `spec/design/features/F-21-wizard-technical-details/` (`screens.md`, two SVG wireframes: the step and its rule-block states).
Split from F-05 on 2026-11-15; the criteria were carried over from the approved F-05 stories and renumbered. Criterion IDs restart in each feature.
Requirements owned by this feature: none yet

## Out of Scope

- The wizard frame, the stepper, Back and Next (F-05).
- The text of the generated files, and where the architecture text is used in them (F-03). This feature only puts the values into the config.
- The analyzer's checks on these fields and on the rule list (F-04).
- A module list. The brief has none (owner decision).
- Browser tests. Logic is tested with Vitest; the layout is checked by hand against the screens (AC-010).

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-21 AC-003`).

### US-001: Stack and architecture

**As a** user
**I want to** describe the architecture and the technology the project uses
**So that** the generated project knows what it is built with.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The language, framework, platform, build tool and test framework fields map to `stack.language`, `stack.framework`, `stack.platform`, `stack.buildTool` and `stack.testFramework`. An empty optional field is left out of the config, not sent as an empty string.
- [ ] AC-002 `[auto]`: The architecture style text maps to an optional `architecture` string in the config. A blank value is left out. The core parser accepts an absent `architecture` and a string, and refuses any other type with a problem at its path (the decision is recorded in `architecture.md` §5 before the code depends on it; the generator's use of it is F-03).

---

### US-002: Code rules as rule blocks

**As a** user
**I want to** write each code rule as its own block, with a title and a body
**So that** each rule becomes its own file the project can read.

**Requirements:** none yet

#### Acceptance Criteria

- [ ] AC-003 `[auto]`: "Add rule block" appends one block with an empty title and body after the last block. "Remove block" removes only that block and keeps the order of the others.
- [ ] AC-004 `[auto]`: Each rule block shows its file name as `.claude/rules/<id>.md`. The id is the title lowercased, each run of characters outside `a`–`z` and `0`–`9` replaced by one hyphen, and leading and trailing hyphens removed (`Code style` gives `code-style`; `Testing!` gives `testing`). A title that gives an empty id shows "no file name". A table test covers these cases.
- [ ] AC-005 `[auto]`: Two rule blocks whose titles give the same id both show a duplicate-id message. The form keeps both blocks as entered and does not rename them. Analyze reports the duplicate as a blocker at the rule's path (negative case).
- [ ] AC-006 `[auto]`: The list holds at most 60 rule blocks. At 60, "Add rule block" is disabled; the 61st block cannot be added by any path (boundary, 59 and 60 in a table test).
- [ ] AC-007 `[auto]`: The config's `rules` list has one entry per block, in screen order, with `id` (the derived id), `title` and `text` (the body). A block with a blank title stays in the list, so Analyze reports it, and the form does not drop it.
- [ ] AC-008 `[auto]`: Step 2 starts with no rule blocks. No block is fixed: a block titled "Testing" can be removed like any other, and the form never adds one by itself (owner decision: the testing rules are an ordinary block).
- [ ] AC-009 `[auto]`: Editing a block's title changes the file name shown on that block and in the step 4 tree. Editing the title does not change the body.
- [ ] AC-010 `[device]`: At 1280 × 800 step 2 matches the approved screens in `spec/design/features/F-21-wizard-technical-details/`: the stack fields with the required language, the architecture field, the rule blocks with their file names, Add rule block at the top of the list, and the states listed in `screens.md`.

---

## Requirement Coverage

Scope items are the step 2 items of F-21 in `spec/documents/features.md`.

| Requirement | Covered by |
|---|---|
| Scope 1: Architecture style; language, framework, test framework, build tool (and platform) | AC-001, AC-002 |
| Scope 2: Code rules as rule blocks, one Markdown file each; no module list | AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009 |
| Screens for step 2 and its rule states (`screens.md`) | AC-010 |
