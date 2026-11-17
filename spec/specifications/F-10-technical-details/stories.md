# User Stories — Technical details step (F-10)

Feature entry: `spec/documents/features.md` → F-10
Requirements owned by this feature: the F-10 scope items in `features.md` (language required; framework, platform, build tool and test framework; architecture text of at most 5,000 characters; rule blocks with a name and a description of at most 1,000 characters, each showing its file name, at most 60 blocks; duplicate ids flagged; the list starts empty); `ui.md` §2 Step 2 — Technical details and §6 Limits; owner decisions of 2026-11-17: the stack fields are free text, every single-line stack field and a rule block's name are limited to 100 characters (code points), and a rule name that gives no id is kept with a message and never blocks Next.

Counting and kept-as-typed rules follow the project's settled decisions: lengths are counted in code points (an emoji counts as one); the architecture text is kept as submitted, not trimmed (`architecture.md` decision 37); the `ui.md` §2 counter is for the idea only.

## Out of Scope

- The analysis of the content: a blank language, a duplicate id, an id that breaks the id rule and a blank project brief are reported by the analysis (F-06, F-14). F-10 never blocks Next on content.
- Preset lists for the stack fields. They are free text (owner decision).
- Calling the Analyze API, building the configuration and writing the rule list into it (F-13, F-14, F-15). F-10 holds the values and the pure functions the later steps use.
- Rule-set tags on agents and flows (F-11, F-12).
- Reordering rule blocks. Only Add and Remove are specified (`ui.md` §2).
- Any storage of a value: no `localStorage`, `sessionStorage` or `indexedDB` (decision 13). Values last until the browser is refreshed.
- The project step (F-09, done), the workflow builder (F-11, F-12) and the analyze and generate step (F-13).
- Phone and tablet layouts (decision 31).
- Changing the placeholder on steps 3 and 4.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-10 AC-003`).

### US-001: Enter the stack

**As a** builder user
**I want to** name the language, framework, platform, build tool and test framework of my project
**So that** the generated rules and commands use the tools I actually work with.

**Requirements:** `features.md` F-10 (language required; four optional stack fields); `ui.md` §2 Step 2 Stack; owner decision 100-character limit on single-line fields

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: the five stack fields (language, framework, platform, build tool, test framework) are single-line text inputs, and pressing Enter in any of them does not add a line break (negative case).
- [ ] AC-002 `[auto]`: language is marked required, and an empty or spaces-only language does not disable Next on step 2 (table-driven: `` and `   ` both leave Next enabled; the analysis reports them, F-14).
- [ ] AC-003 `[auto]`: each stack field is stored as typed, spaces kept (table-driven: `TypeScript`, `  Node  `, `   ` each come back unchanged in the wizard values for their field).
- [ ] AC-004 `[auto]`: each single-line stack field keeps the first 100 code points typed or pasted (table-driven: 99 → 99, 100 → 100, 101 → 100; an emoji counts as one; a paste that crosses the limit keeps the characters up to 100 and drops the rest).

### US-002: Enter the architecture text

**As a** builder user
**I want to** describe the architecture of my project in several lines
**So that** the generated rules follow the structure I have in mind.

**Requirements:** `features.md` F-10 (architecture text of at most 5,000 characters); `ui.md` §2 Step 2 Architecture; `architecture.md` decision 37 (kept as submitted)

#### Acceptance Criteria

- [ ] AC-005 `[auto]`: the architecture text is a multi-line field: pressing Enter adds a line break that is kept in the stored value; no counter is shown (the counter is for the idea only, `ui.md` §2); an empty architecture does not disable Next (optional field, negative case).
- [ ] AC-006 `[auto]`: typing or pasting past 5,000 code points keeps the first 5,000 (table-driven: 4,999 + 2 typed → 5,000 stored; 5,000 stored + any paste → unchanged; a surrogate pair that would cross the limit is dropped whole, negative case).
- [ ] AC-007 `[auto]`: the architecture text is kept as typed: leading and trailing spaces and line breaks stay in the stored value, and moving to another step or calling the configuration function does not trim it (negative case: no trim, `architecture.md` decision 37).

### US-003: Add and remove rule blocks

**As a** builder user
**I want to** add rule blocks and remove the ones I do not need
**So that** the project gets exactly the code rules I define, and no rule I did not add.

**Requirements:** `features.md` F-10 (the list starts empty; at most 60 blocks); `ui.md` §2 Step 2 Rules (Add, Remove, order, limit); `ui.md` §5 (Delete always asks for confirmation)

#### Acceptance Criteria

- [ ] AC-008 `[auto]`: the rule list starts empty on a new project; no rule block is added by the app itself (table-driven: a fresh wizard, after Next and Prev, after going to step 4 and back: zero blocks).
- [ ] AC-009 `[auto]`: Add rule block appends one empty block after the last one; the blocks before it keep their order (table-driven: 0 → 1 block; 1 → 2 blocks; the new block is last).
- [ ] AC-010 `[auto]`: Remove on a block removes that block only and keeps the other blocks in their order (negative case: removing the middle of three blocks keeps the first and the last in place and in order).
- [ ] AC-011 `[auto]`: Remove asks for confirmation first; Cancel keeps the block unchanged; Confirm removes it (negative case: no block is removed without confirmation).
- [ ] AC-012 `[auto]`: at 60 blocks Add rule block is disabled and no 61st block is added; at 59 blocks Add is enabled (table-driven: 59 enabled, 60 disabled).

### US-004: Name each rule block and see its file name

**As a** builder user
**I want to** give each rule a name and see the file it will become
**So that** I know which file the rule is written to, and I can fix a name that gives no usable file.

**Requirements:** `features.md` F-10 (rule block name; each shows its file name); `ui.md` §2 Step 2 Rules (name, file name `.claude/rules/<id>.md`, id derivation); owner decisions: name limit 100 characters, and a name that gives no id is kept with a message, never blocking Next

#### Acceptance Criteria

- [ ] AC-013 `[auto]`: the rule name is a single-line input (Enter adds no line break) limited to 100 code points, with the same cut as AC-004 (table-driven: 100 → 100, 101 → 100).
- [ ] AC-014 `[auto]`: the file name line shows `.claude/rules/<id>.md`, where the id is the name in lower case with each run of characters outside `a–z` and `0–9` replaced by one hyphen (table-driven: `Code Style` → `code-style`; `Naming & Tests!` → `naming-tests-`; `  Rule  2 ` → `-rule-2-`).
- [ ] AC-015 `[auto]`: a name with no letter or digit (blank, spaces only, or only symbols such as `!!!`) shows a message in place of the file name saying it needs a letter or digit; the block is kept as typed, no file name is shown, and Next stays enabled (negative case).
- [ ] AC-016 `[auto]`: the file name line changes as the name is typed (table-driven: typing `A` then `Ab` shows `a` then `ab`); an id that starts with a hyphen, such as `-rule-2-`, is shown as derived and is not blocked in the wizard (the analysis reports it, F-14).

### US-005: Flag duplicate rule ids and limit the description

**As a** builder user
**I want to** see when two rules would write the same file, and keep each description within its limit
**So that** no rule file is overwritten by accident and each description stays within 1,000 characters.

**Requirements:** `features.md` F-10 (duplicate ids flagged; description of at most 1,000 characters); `ui.md` §2 Step 2 Rules (duplicate message, both kept as entered; description limit); `ui.md` §6

#### Acceptance Criteria

- [ ] AC-017 `[auto]`: two blocks whose names give the same id both show a duplicate-id message and both are kept as entered (table-driven: `Code Style` and `code style` → both flagged; `Code Style` and `Code-Style` → both flagged; a unique id → no message). Removing one of the two clears the message on the other (negative case: no message stays on a block that is now unique).
- [ ] AC-018 `[auto]`: the rule description is a multi-line field: Enter adds a line break kept in the stored value; typing or pasting past 1,000 code points keeps the first 1,000 (table-driven: 999 → 999, 1,000 → 1,000, 1,001 → 1,000; an emoji counts as one).

### US-006: Step 2 shows the technical details and keeps the values

**As a** builder user
**I want to** see the technical details on step 2 and find them again after moving through the wizard
**So that** I can go back and correct my stack, architecture and rules without retyping them.

**Requirements:** `features.md` F-10; F-08 AC-010 and AC-012 (values kept in memory, New project clears them); F-09 AC-013, AC-014 and AC-015 (the same rules for the project step); `ui.md` §1.3

#### Acceptance Criteria

- [ ] AC-019 `[auto]`: the step 2 body shows the five stack fields, the architecture field and the rule list with its Add rule block control, and no longer shows the F-08 placeholder line; step 1 still shows the F-09 body, and steps 3 and 4 still show the placeholder line (table-driven over the four steps).
- [ ] AC-020 `[auto]`: step 2 values (stack, architecture, and each rule block's name and description, in order) are still present after Next, Prev and Next again, and after going to step 4 and back to step 2 (table-driven over the fields).
- [ ] AC-021 `[auto]`: New project clears every step 2 value, including the rule list, and step 2 shows the stack and architecture fields empty and the rule list empty again (negative case: no value from the earlier project remains).
- [ ] AC-022 `[auto]`: the technical details step makes no call to `localStorage`, `sessionStorage`, `indexedDB` or `console` when a value changes (extends F-09 AC-015; decision 13).
- [ ] AC-023 `[device]`: at a window of 1280 × 800 the step 2 fields and the Add rule block control are visible on the first screen, and the page does not scroll vertically with the list empty; a person judges the layout with two or more rule blocks shown, against the approved screens (UX step).

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| `features.md` F-10 language required | AC-002 |
| `features.md` F-10 framework, platform, build tool, test framework (optional, single-line) | AC-001, AC-003 |
| owner decision: single-line stack fields and rule names limited to 100 code points | AC-004, AC-013 |
| `features.md` F-10 architecture text of at most 5,000 characters | AC-005, AC-006, AC-007 |
| `features.md` F-10 rule block name and description | AC-013, AC-018 |
| `features.md` F-10 description of at most 1,000 characters | AC-018 |
| `features.md` F-10 each rule block shows its file name | AC-014, AC-015, AC-016 |
| `features.md` F-10 at most 60 rule blocks | AC-012 |
| `features.md` F-10 duplicate ids flagged | AC-017 |
| `features.md` F-10 the list starts empty | AC-008 |
| `ui.md` §2 Step 2 Add rule block and Remove block, order kept | AC-009, AC-010, AC-011 |
| `ui.md` §5 Delete asks for confirmation | AC-011 |
| `ui.md` §2 Step 2 step body and layout | AC-019, AC-023 |
| F-08 AC-010 and F-09 AC-013 values kept between steps | AC-020 |
| F-08 AC-012 and F-09 AC-014 New project clears the values | AC-021 |
| `architecture.md` decision 13 memory only | AC-022 |
| `architecture.md` decision 37 architecture text kept as submitted | AC-007 |
