# UX screens — Project wizard step 2: technical details and code rules (F-21)

Scope: step 2 of the wizard. The frame, the stepper and Back and Next are F-05's (`spec/design/features/F-05-project-brief-form/`). Desktop, 1280 × 800. Wireframes in SVG: layout, content and states; colours and wording are placeholders.

Stories: `spec/specifications/F-21-wizard-technical-details/stories.md` (10 criteria).

## Layout grid

Shared with F-05 and F-22: top bar 0–56; stepper in four equal columns; card x 40–1240, y 152–776; content x 72–1208, y 248–684; footer divider y 700; footer buttons y 716–756. Back at the footer's left edge; the action at its right edge.

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-wizard-technical.svg` | Left: architecture style (optional); language (required, marked), framework, platform (empty, left out), build tool, test framework. Right: code rule blocks, each with its title, its file name chip, its body and Remove; Add rule block at the top of the list | AC-001, AC-002, AC-003, AC-004, AC-007, AC-008, AC-009, AC-010 | Blocks with content (the list starts empty; these show blocks the user added); an empty optional field; Add rule block enabled |
| 02 | `02-wizard-rule-states.svg` | Left: what Analyze reports for the rule states, and how to fix each. Right: two blocks with the same file name (both marked); a block with no title (`no file name`); the list at its limit, with Add rule block disabled | AC-004, AC-005, AC-006, AC-010 | Duplicate file name; no file name; limit reached (60 of 60) |

## Decisions these screens take

1. **Modules are removed.** The brief has no module list. The architecture is one text field.
2. **Each code rule block is one Markdown file** under `.claude/rules/`, named from the title's id (`.claude/rules/code-style.md`, AC-004).
3. **Testing rules are an ordinary block**, like the others. Nothing is fixed.
4. **A blank title is reported at Analyze**, not blocked at the form (AC-007).

## Open points for the owner

- **Decision 2 wording.** Confirm that the rule file path is `.claude/rules/code-style.md`, as AC-004 says.
