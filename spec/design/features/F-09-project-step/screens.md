# UX screens — Project name and idea (F-09)

Scope: step 1 of the wizard, the project name and the idea. Desktop only, 1280 × 800. Wireframes in SVG: layout, content and states; colours and wording are placeholders.

The frame is the approved F-08 left-panel frame (`spec/design/features/F-08-wizard-stepper/01-step-project.svg`): a 260 px white left panel with the wordmark, the secondary New project button, the vertical stepper (step 1 current) and Prev and Next at its foot, and a grey content area with one white card. There is no header bar. The step body has no title and no step pill: the stepper names the step, and the fields sit directly on the card.

Stories: `spec/specifications/F-09-project-step/stories.md` (16 criteria: 15 `[auto]`, 1 `[device]`).

Restyle of 2026-11-18: the header bar is replaced by the left panel, the screens use the F-08 frame and the Material Kit colours (primary #635BFF, page #F0F4F8, text #32383E, secondary text #636B74, borders #DDE7EE and #CDD7E1, secondary button white with a #CDD7E1 border), Inter, the 8 px grid. The fields follow the grid of F-11 screen 03. The content and the states are unchanged except Decision 8.

## Layout grid

Left panel: x 0–260 (white, 1 px border #DDE7EE at x 259), as F-08. Inside it, 24 px gutters:

- Wordmark row at y 24–48, New project at x 24–236, y 72–112 (as F-08).
- Vertical stepper at x 40 (node centres), from step 1 at y 164 to step 4 at y 356, a 64 px pitch, as F-08.
- Prev at x 24–124 and Next at x 136–236, y 728–768, 100 × 40 with 8 px radius, at the foot of the panel.

Content area: x 260–1280, grey #F0F4F8. The white card sits at x 284–1256 (24 px from the panel edge and from the right window edge), y 24–728, as F-08 and F-11 screen 03.

Inside the card, the content sits at x 308–1232 (24 px padding on every side of the card's content box):

- Field label baseline 12 px above the field top; field 40 px high (or 200 px for the idea box), 8 px radius, 924 px wide.
- Help line 20 px below the field (or box) bottom, 24 px between help lines.
- Next section label 40 px below the previous section's last help line; the name note on screen 03 replaces the name help line at the same position.
- The warning box on screen 03 sits 8 px below the idea box, with 34 px height and a 20 px gap to the help lines below it.
- Name label baseline y 64; name field y 76–116; name help y 136; idea label y 176; idea box y 188–388; counter baseline y 374 at x 1216 (end-aligned, inside the box); idea help lines y 408, 432, 456.

Footer note and caption sit inside the grey area, 24 px below the card: note at x 284, caption right-aligned at x 1256, baseline y 766, as F-08.

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-project-values.svg` | Step 1 with a name and an idea entered: the single-line name field with its help line, the multi-line idea field, the counter `127 / 5,000` and the help lines; Prev disabled; Next | AC-001, AC-002, AC-005, AC-006, AC-012, AC-016 | Values entered; Prev disabled; Next enabled |
| 02 | `02-project-blank.svg` | Step 1 with both fields empty: placeholder text, counter `0 / 5,000`, and a note that Next stays available and the analysis on step 4 reports the blank fields; Prev disabled; Next | AC-004, AC-005, AC-006, AC-009 | Blank name and idea; Prev disabled; Next enabled |
| 03 | `03-project-limit.svg` | Step 1 with the name at 100 characters and the idea at 5,000: the note that the name limit is reached, the counter `5,000 / 5,000` and the note that text past the limit is cut, also when pasted; Prev disabled; Next | AC-003, AC-005, AC-006, AC-007, AC-008 | Name at its limit; idea at its limit; Prev disabled; Next enabled |

Criteria with no screen are not visual. They are proved by tests:

- AC-010 and AC-011 (trim: the value keeps its spaces while typing; the configuration function trims them).
- AC-013 and AC-015 (values kept between steps; no storage call). The values are the ones on screen 01.
- AC-014 (New project clears the name and the idea). New project is the left-panel button on every screen.
- The placeholder line on steps 2 to 4 (F-08 AC-013) is on the F-08 screens.

## Decisions these screens take

1. **The F-08 left-panel frame, unchanged.** The left panel, the stepper, Prev and Next at its foot, the card and the footer note are the approved F-08 drawing. The step name is the stepper label "Project".
2. **Prev, not Back.** The F-08 stories and screens name the button Prev; these screens keep that name.
3. **Name and idea are required, but Next is never blocked.** Screen 02 shows Next enabled with empty fields and the analysis reporting them. The asterisk marks the required fields.
4. **The name shows its limit in its help line, and has no counter.** `ui.md` shows a counter for the idea only.
5. **The idea counter is `N / 5,000`,** counted in code points.
6. **Nothing is stored between visits.** The help line stays as drawn on the approved F-05 screen 01 (owner decision, 2026-11-15). The footer line is the F-07 note.
7. **Limit states are words, not a red error.** Reaching a limit is not a validation error, so the fields keep the neutral border and the amber note says what happens.
8. **Prev is disabled on step 1 on every screen.** Screens 02 and 03 drew Prev enabled before the restyle. That contradicted F-08 AC-005 (Prev disabled on step 1) and the approved F-08 frame, so the restyle corrects it. The notes say Next still works; Prev has no effect on step 1 either way.
9. **Status colours from the owner palette (2026-11-18).** The required asterisk is redOrange 600 #DE3024. The limit and blank notes are california 700 #B84D05 text; the idea note box is california 50 #FFFAEA with its #FCD34D outline, kept as drawn. The grey notes are unchanged. The screens draw no error text or error fill, so redOrange 50 #FEF3F2 is not used. The notes also say what happens in words, so they are not the only signal.

## Usability review

| Finding | Severity | Screen | What changed |
| --- | --- | --- | --- |
| U-01 The idea counter read `142 / 5,000`, but the sample idea is 127 code points, so the counter contradicted the text it counts | minor | 01 | Counter set to `127 / 5,000` (the sample text, with its line break counted as one) |
| U-02 The name limit note said "Further text is not kept", while the idea note and the name help line say text is cut; the idea note adds "also when pasted", which AC-008 covers | minor | 03 | Name note reads "100 characters: the limit is reached. Text past the limit is cut, also when pasted." |
| U-03 Screens 02 and 03 drew Prev enabled on step 1, contrary to F-08 AC-005 | major | 02, 03 | Prev drawn disabled with the F-08 hover text (Decision 8, restyle of 2026-11-18) |

Checked and found in order: the task path (name, idea, Next, Prev, New project) has a screen for each step; Prev is disabled on step 1 on every screen; Next is never disabled by the blank fields, and screen 02 says so; required fields carry the asterisk; the name limit is stated in its help line (screen 01) and in its note at the limit (screen 03); the 100-character sample on screen 03 counts exactly 100 code points; the action names (Prev, Next, New project) match the F-08 frame. No error ends in a dead end: the amber notes on screens 02 and 03 say what happens and that Next still works.

Not changed: the name help line on screen 01 differs from the approved F-05 wording. That needs an owner decision and is open point 1.

## Visual review

Checked from the SVG source and rendered in headless Chrome at 1280 × 800 (original and changed screens). Grid, panel, stepper, footer, type classes, contrast and the colour roles are consistent across the three screens; the left panel and the stepper are identical on every screen.

| Finding | Severity | Screen | What changed |
| --- | --- | --- | --- |
| V-01 The idea help lines sat 28 px below the idea box, while the name help line sat 20 px below its field, so the field-to-help gap differed within the form | minor | 01, 02, 03 | Idea help lines moved to 20 px below the box (on screen 03, below the warning box). The blank note on screen 02 moved up with them, keeping its 34 px step |
| V-02 `index.html` described screen 03 as "the text past the limit is not kept", while the screens say "cut" | minor | index.html | Wording changed to "cut" to match the screens and the notes |

Restyle checks (2026-11-18), on the left-panel frame:

| Check | Result |
| --- | --- |
| XML: all three SVGs pass `xmllint --noout` | Pass |
| Render: all three rendered in headless Chrome at 1280 × 800 | Pass; every text line sits inside its box or the card. The longest line, the name sample on screen 03, ends at x 910 inside the 1232 field edge |
| Text fit: wordmark, New project, stepper labels, field text, help lines, notes, footer note and caption | Fit |
| Grid: 24 px gutters, 24 px card padding, 8 px multiples in control heights and positions; the card matches F-08 at x 284–1256, y 24–728 | Pass |
| Frame: no header bar; the left panel, stepper, Prev and Next match F-08 screen 01 | Pass |

Not changed, and not findings: the amber note on screen 02 is a plain line while the idea note on screen 03 is in a box. That is a style choice for the owner (open point 2).

**Open points for the user**

Approved by the user on 2026-11-17 with the screens as drawn (header-bar frame). Points 1 and 2 were not answered at approval: they are kept as drawn and remain open for the owner before Verify. The left-panel restyle of 2026-11-18 is pending the owner's approval.

1. **Name help line versus AC-016.** AC-016 says the step 1 help text matches the approved F-05 screen 01. Screen 01 adds "Up to 100 characters; text past the limit is cut." to the name help line. Options:
   - a. Keep the limit in the help line and amend AC-016 to "the approved help text plus the 100-character limit" (recommended: the limit is visible before the user reaches it).
   - b. Restore the approved help line ("A short name. It appears as the project name in the generated CLAUDE.md.") and show the limit only on screen 03.
2. **Limit notes on screen 03.** The name note is an amber line and the idea note is an amber box. The blank note on screen 02 is an amber line. Options: (a) keep as drawn; (b) amber line for every note; (c) box for every note.
