# UX screens — Technical details step (F-10)

Scope: step 2 of the wizard, the technical details: the stack, the architecture text and the rule blocks. Desktop only, 1280 × 800. Wireframes in SVG: layout, content and states; colours and wording are placeholders.

The frame is the approved F-09 left-panel frame (`spec/design/features/F-09-project-step/01-project-values.svg`): the 260 px left panel with the logo, the secondary New project button, the vertical stepper, and Prev and Next at the foot of the panel; the grey content area with one white card. There is no header bar. Step 2 is the current node and Project shows done (check). Prev is enabled on step 2. The step body has no title and no step pill: the stepper names the step.

Stories: `spec/specifications/F-10-technical-details/stories.md` (23 criteria: 22 `[auto]`, 1 `[device]`).

## Layout grid

As F-09 (and F-11 screen 03 for the card and the content grid).

- **Left panel** x 0–260, white, 1 px border at x 259. Wordmark at y 24–48; New project x 24–236, y 72–112 (secondary button). Vertical stepper at x 40, node centres at y 164, 228, 292 and 356 (step 2 at y 228, ring r 18). Prev x 24–124 and Next x 136–236, y 728–768, both enabled.
- **Content area** x 260–1280, grey `#F0F4F8`.
- **Card** x 284–1256, y 24–728, white, 12 px radius. The content box is x 308–1232, y 48–704 (24 px padding).
- **Left column, x 308–740: the stack and the architecture.** Section label "Stack" baseline y 62. Field labels 12 px above their 40 px fields. Two fields per row, 208 px wide, at x 308 and x 532; rows with field tops at y 104, 176 and 248 (Language and Framework, Platform and Build tool, Test framework). Stack help lines at baselines y 308 and 328. Architecture label baseline y 368, box x 308–740, y 380–500, help line at y 520.
- **Divider** x 772, y 48–704.
- **Right column, x 788–1232: the rule blocks.** Section label "Rule blocks" baseline y 62 with the add button at its right (a 28 × 28 `+` at x 1204–1232, y 48–76, outline in primary), help line at y 82. The list region is y 96–648 and scrolls when it holds more blocks than fit. Each rule block is a white card 444 px wide (x 788–1232) with 16 px inner padding; blocks are 12 px apart. Inside a block (top T): caption baseline T+30 and the remove button (a 28 × 28 `−` at x 1188–1216, y T+12) at its top; Name label baseline T+56, name field T+68–T+108; file line baseline T+128 (+16 per extra line); Description label baseline D, field D+12 to D+52, where D is the file line's last baseline plus 28. Block height is D+68 − T: 224 px for a plain block, 260 px when a message box sits under the file line, 240 px when the file line wraps or the message replaces it.
- **Scroll indicator** x 1238–1242, y 96–648 (track and thumb), 4 px clear of the card's content box.
- **Add rule block** is the `+` in the section title row (see above). When it is disabled at the limit, its reason sits beside it in a note box x 872–1172, y 36–68, two lines. The list has no button at its foot.
- **Footer note** at x 284, baseline y 766, and the caption right-aligned at x 1256, baseline y 766: "F-10 · screen N · step 2 of 4 · 1280 × 800" (as F-09).
- **Dialogs** are centred on the content area (centre x 770, y 400) and dim the whole screen, left panel and footer included.

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-technical-values.svg` | Step 2 with the five stack fields, the architecture text and two rule blocks filled in: the name, the file line `.claude/rules/<id>.md`, the description; Prev and Next enabled | AC-001, AC-003, AC-005, AC-014, AC-016, AC-018, AC-019, AC-023 | Values entered; two blocks; Add enabled |
| 02 | `02-technical-blank.svg` | Step 2 with the fields empty and the list empty: the language is blank with the note that Next stays enabled; the list says nothing is added until the user adds one; Add enabled | AC-002, AC-008, AC-009, AC-019, AC-023 | Blank language; list empty; Add enabled |
| 03 | `03-rule-duplicate-ids.svg` | Two rule blocks whose names give the same file (`Code Style` and `code style`): each shows the duplicate-id message and both are kept | AC-014, AC-017 | Two blocks with the same id |
| 04 | `04-rule-remove-confirm.svg` | Screen 01 with the compact confirmation over the step, as F-11 04: 400 px wide, title "Remove rule block 1?", one muted line "Are you sure you want to remove this rule block?", and Cancel and Remove as a centred pair of 120 × 40 buttons (Remove in danger `#DE3024`); the stack and the blocks stay visible behind the dim | AC-010, AC-011 | Confirmation open |
| 05 | `05-rule-limit.svg` | The list at 60 rule blocks: the `+` in the section title row disabled, with the reason "Limit reached: 60 of 60 rule blocks. Remove a block to add one." beside it; a scroll indicator on the list | AC-012 | Limit reached; Add disabled with a reason |
| 06 | `06-limits-and-no-id.svg` | The name at its 100-character limit (the input clips the text at its edge and the file line wraps), the description limit in its label line, the architecture limit in its note, and a second block named `!!!` with the message "Name needs a letter or digit. No file name is written." | AC-004, AC-006, AC-013, AC-015, AC-018 | Name at its limit; description limit stated; no-id block; Next enabled |

Criteria with no screen are not visual. They are proved by tests:

- AC-007 (the architecture text is kept as typed, with no trim).
- AC-020 (step 2 values kept between steps) and AC-021 (New project clears them). Screen 02 is the state New project returns to.
- AC-022 (no storage or console call). The footer line on every screen is the F-07 note.

The placeholder line on steps 1, 3 and 4 is not drawn here: step 1 is F-09 and steps 3 and 4 keep F-08.

## Decisions these screens take

1. **The F-09 left-panel frame.** The header bar is removed, as in F-09. The stepper, Prev and Next, card and footer follow the approved F-09 drawing; only the step-2 node is current, Project shows done, and Prev is enabled on step 2.
2. **Two columns in the card.** The stack and the architecture sit on the left, the rule blocks on the right, so the fields and the first rule blocks fit at 1280 × 800 without a page scroll (AC-023). The list scrolls inside its own region; the page does not. The height stays 800: the content fits.
3. **Language is required, but Next is never blocked.** Screen 02 shows Next enabled with a blank language and the note that the analysis reports it (owner decision and the F-09 pattern).
4. **The limit notes are words, not a red error.** The 100-character name, the 1,000-character description and the 5,000-character architecture state their limit in their help text, and say text past the limit is cut. There is no counter on any of these fields: `ui.md` §2 gives a counter for the idea only.
5. **A rule name that gives no id is kept.** Screen 06 shows the message in the place of the file name, in an amber note box; the block is kept and Next stays enabled.
6. **Remove asks first.** Screen 04 is the confirmation. `ui.md` §5 says "Delete always asks for confirmation"; the dialog follows it. Its Remove button uses the danger colour `#DE3024`, as F-11 04. The rule block's `−` button opens this confirmation.
7. **Add disabled at 60 is explained.** Screen 05 keeps the `+` visible, disabled, and states the reason in a note box beside it, so the limit is not a dead end. Add and remove follow the F-11 pattern: `+` on the section title, `−` on each block's title row (owner decision).
8. **The file line is the derived id.** `ui.md` §2 gives the id rule: the name in lower case, with each run of characters outside `a–z` and `0–9` replaced by one hyphen. Screen 01 shows `code-style` for `Code Style`; screen 06 shows the derived name of the 100-character sample, wrapped over two lines (the break now falls after `per-`, so the second line starts `file-`).
9. **Palette only.** Primary `#635BFF` for the current step, Next and the Add outline; done `#15B79F` with its label `#107569`; text `#32383E` and `#636B74`; required mark `#DE3024`; the amber notes are `#B84D05` on `#FFFAEA` (the duplicate, no-id and limit messages, and the blank-language note); the disabled Add and Prev use `#F0F4F8` with a `#DDE7EE` border. Font Inter.

## Restyle review (left-panel frame)

The drawings were replaced with the F-09 frame; the earlier usability and visual reviews applied to the header-bar drawings and are superseded. This pass checked the new drawings:

- Every SVG is well-formed (xmllint) and renders in headless Chrome at 1280 × 800 without a clipped frame.
- Every text line sits inside its box at its stated size: the stack and architecture text, the help lines, the file lines (the file line of the 100-character name wraps to two lines), the notes and the dialog text.
- The two columns share the section line at y 62 and the help line at y 82; the `−` buttons and the block captions are centred on each other; the scroll track sits inside the card.
- Text that does not fit its field is clipped at the field edge, not wrapped: the 100-character name on screen 06 and its long description (the description is cut after "Test each new f", one line, as a single-line field shows it).

**Open points for the user**

1. **Rule list scrolls inside the card.** The list holds its own scroll region, and the page stays at 1280 × 800 without a vertical scroll. Owner check: is an inner scroll acceptable, or should the card grow with the list?
2. **Rule block height.** Each plain block is 224 px, so two blocks fill the list region and a third shows partly. Blocks with a message are taller (260 px on screen 03). A layout with more blocks on one screen would need smaller blocks; the screens show the scroll instead.
3. **Name and description clipping (screen 06).** The 100-character name and the long description are clipped at the field's edge, as a real text input shows them. Owner check: is a clipped name and description acceptable, or should the inputs wrap?
4. **Blank-language note (screen 02).** The note pushes the architecture block 40 px down on that screen only. Owner check: is that shift acceptable, or should the note sit inside the stack block?
