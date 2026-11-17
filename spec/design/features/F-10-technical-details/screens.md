# UX screens — Technical details step (F-10)

Scope: step 2 of the wizard, the technical details: the stack, the architecture text and the rule blocks. Desktop only, 1280 × 800. Wireframes in SVG: layout, content and states; colours and wording are placeholders.

The frame is the approved F-08 wizard stepper (`spec/design/features/F-08-wizard-stepper/`) with the F-09 step 1 values as they are: the F-07 header and footer, the stepper row with Prev and Next beside it, and the full-width step card. Step 2 is the current node. The step body has no title and no step pill: the stepper names the step.

Stories: `spec/specifications/F-10-technical-details/stories.md` (23 criteria: 22 `[auto]`, 1 `[device]`).

## Layout grid

As F-08 and F-09. Header 0–56 (F-07). Stepper row on the page background, y 80–140, centred on y 100: Prev at (72, 100), Next at (1208, 100), four nodes at x 220, 500, 780 and 1060. Step card x 24–1256, y 152–736, with the accent rule across its top. Footer 752–800 (F-07).

Inside the card the card is split in two columns with a divider at x 640:

- **Left column, x 72–620: the stack and the architecture.** Stack label at y 186. Language and Framework on the first row (y 216–252), Platform and Build tool on the second (y 284–320), Test framework on the third (y 352–388). The stack notes at y 404 and y 420. Architecture label at y 456, box at y 464–584, its note at y 604.
- **Right column, x 660–1208: the rule blocks.** Heading at y 186, its help line at y 206. The list region is x 660–1208, y 228–656 and scrolls when it holds more blocks than fit. Each rule block is a card of 200 px (x 672–1196): caption and Remove at its top, Name at +52, the file line at +110 (and +124 when it wraps), the message line at +128, Description at +152, the description box at +158.
- **Add rule block** at x 960–1208, y 668–704, at the right end of the list.

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-technical-values.svg` | Step 2 with the five stack fields, the architecture text and two rule blocks filled in: the name, the file line `.claude/rules/<id>.md`, the description; Prev and Next enabled | AC-001, AC-003, AC-005, AC-014, AC-016, AC-018, AC-019, AC-023 | Values entered; two blocks; Add enabled |
| 02 | `02-technical-blank.svg` | Step 2 with the fields empty and the list empty: the language is blank with the note that Next stays enabled; the list says no block is added by the app; Add enabled | AC-002, AC-008, AC-009, AC-019, AC-023 | Blank language; list empty; Add enabled |
| 03 | `03-rule-duplicate-ids.svg` | Two rule blocks whose names give the same file (`Code Style` and `code style`): each shows the duplicate-id message and both are kept | AC-014, AC-017 | Two blocks with the same id |
| 04 | `04-rule-remove-confirm.svg` | Screen 01 with the confirmation over the step: "Remove rule block 1?", Cancel and Remove (the same name as the block's Remove control); the note that rule block 2 keeps its place | AC-010, AC-011 | Confirmation open |
| 05 | `05-rule-limit.svg` | The list at 60 rule blocks: Add rule block disabled, with the reason "Limit reached: 60 of 60 rule blocks. Remove a block to add one." beside it; a scroll indicator on the list | AC-012 | Limit reached; Add disabled with a reason |
| 06 | `06-limits-and-no-id.svg` | The name at its 100-character limit (the input clips the text at its edge and the file line wraps), the description limit in its label line, the architecture limit in its note, and a second block named `!!!` with the message "Name needs a letter or digit. No file name is written." | AC-004, AC-006, AC-013, AC-015, AC-018 | Name at its limit; description limit stated; no-id block; Next enabled |

Criteria with no screen are not visual. They are proved by tests:

- AC-007 (the architecture text is kept as typed, with no trim).
- AC-020 (step 2 values kept between steps) and AC-021 (New project clears them). Screen 02 is the state New project returns to.
- AC-022 (no storage or console call). The footer line on every screen is the F-07 note.

The placeholder line on steps 1, 3 and 4 is not drawn here: step 1 is F-09 and steps 3 and 4 keep F-08.

## Decisions these screens take

1. **The F-08 frame, unchanged.** Stepper, Prev and Next, card and footer are the approved F-08 drawing; only the step-2 node is current. Prev is enabled on step 2.
2. **Two columns in the card.** The stack and the architecture sit on the left, the rule blocks on the right, so the fields and the first rule blocks fit at 1280 × 800 without a page scroll (AC-023). The list scrolls inside its own region; the page does not.
3. **Language is required, but Next is never blocked.** Screen 02 shows Next enabled with a blank language and the note that the analysis reports it (owner decision and the F-09 pattern).
4. **The limit notes are words, not a red error.** The 100-character name, the 1,000-character description and the 5,000-character architecture state their limit in their help text, and say text past the limit is cut. There is no counter on any of these fields: `ui.md` §2 gives a counter for the idea only.
5. **A rule name that gives no id is kept.** Screen 06 shows the message in place of the file name and no error colour; the block is kept and Next stays enabled.
6. **Remove asks first.** Screen 04 is the confirmation. `ui.md` §5 says "Delete always asks for confirmation"; the dialog follows it.
7. **Add disabled at 60 is explained.** Screen 05 keeps the control visible, disabled, and states the reason beside it, so the limit is not a dead end.
8. **The file line is the derived id.** `ui.md` §2 gives the id rule: the name in lower case, with each run of characters outside `a–z` and `0–9` replaced by one hyphen. Screen 01 shows `code-style` for `Code Style`; screen 06 shows the derived name of the 100-character sample, wrapped over two lines.

## Usability review

| Finding | Severity | Screen | What changed |
|---|---|---|---|
| The limit reason ran under the disabled Add rule block button (text from x 660 crossed the button at x 960) | major | 05 | The reason is now two lines right-aligned to x 944, beside the button, with the same words |
| The no-id block showed a file line ("File: none until…") and a message line; AC-015 asks for the message in place of the file name | major | 06 | The message now sits in the file-name line; the extra file line and the second message line are removed |
| The Remove button in the confirmation said "Remove block", the block's control says "Remove" (one action, one name) | minor | 04 | The confirm button reads "Remove"; the table row above is updated to match |
| "Duplicate id:" is internal wording in the duplicate message | minor | 03 | Both messages now read "Same file as rule block N. Both are kept." |
| "Next stays available" describes the control, not the user's choice | minor | 02 | Reads "You can still go on; the analysis reports it." |
| "The app adds no rule block by itself" is an internal note | minor | 02 | Reads "Nothing is added until you add one." |

Checked and kept: the stack, architecture and rule fields have a label, a required mark where the stories require it, and a help line that matches the stories; Next is enabled on screens 02 and 06 as the owner decided; Remove sits on its block; the disabled Add at 60 has its reason beside it; the step body fits the grid of the approved F-08 frame.

**Open points for the user**

No new open points from this review. The layout points 1 to 3 above (inner scroll, block height, name clipping) stay with the owner.
## Visual review

Checked from the SVG coordinates and by rendering all six screens in headless Chrome at 1280 × 800.

| Finding | Severity | Screen | What changed |
|---|---|---|---|
| The Remove buttons ended 20 px short of the input's right edge (x 1160 against 1180), off the block's 16 px inner margin | minor | 01, 03, 04, 05, 06 | Remove moved to x 1092–1180, the input's right edge; its label moved with it |
| The "Rule block N" captions sat 3 px above the centre of their Remove button | minor | 01, 03, 04, 05, 06 | Caption baselines moved down 3 px (y 263 and 475), centred on the button |
| "Stack" and "Rule blocks" had the same weight and size as the field labels, so the section level did not show | minor | 01–06 | New `section` class in the style block (13 px, bold, the card text colour) on the two headings; the class is the set's section heading |
| The description limit note ran into the "Description" label (x 762, the label ends near x 763) | minor | 06 | Note moved to x 778 on both blocks |
| The confirm title used a one-off 16 px font size | minor | 04 | Title uses the `brand` class (15 px, bold), so the size is in the set |
| The confirm buttons ended 20 px from the dialog's right edge against a 24 px text margin on the left | minor | 04 | Cancel and Remove moved 4 px left, to end at x 856 (24 px margin) |
| The list's scroll indicator touched the right edge of the rule block cards (x 1196) | minor | 05 | Indicator moved to x 1200, 4 px clear of the cards |

Checked and kept: header, stepper, Prev and Next, card, divider and footer are the same drawing on all six screens (the style block is identical in every file); the footer caption carries the screen number; text widths fit their boxes at the stated sizes; contrast of the body, label and warning text is readable on white; the disabled Add rule block keeps its reason beside it; the empty space on screen 01 and 06 sits below the architecture note, not between controls; the amber warning colour is the only colour for the duplicate and no-id messages, and the text says the state too.

**Open points for the user**

1. **Colour of the Remove confirm button (screen 04).** It is red. The colour roles give red to blockers, and the removal is a destructive action, not a blocker. Options: (a) keep red for the destructive action, (b) use the blue action colour, with the word "Remove" carrying the meaning, (c) use a neutral button with a red word. Option (a) needs no change; (b) and (c) change the button on screen 04 only.
2. **Section heading class (all screens).** `section` is a new class in the style block. Options: (a) keep it, as drawn, (b) use the existing field-label class at the same weight as the labels, which is what the screens had before this review.

## Open points for layout review

1. **Rule list scrolls inside the card.** The list holds its own scroll region, and the page stays at 1280 × 800 without a vertical scroll. Owner check: is an inner scroll acceptable, or should the card grow with the list?
2. **Rule block height.** Each block is 200 px, so two blocks fill the list region. A layout with three or more blocks on one screen would need smaller blocks; the screens show the scroll instead.
3. **Name clipping (screen 06).** The 100-character name is clipped at the input's edge, as a real text input shows it. Owner check: is a clipped name acceptable, or should the input wrap?
