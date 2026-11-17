# UX screens — Project name and idea (F-09)

Scope: step 1 of the wizard, the project name and the idea. Desktop only, 1280 × 800. Wireframes in SVG: layout, content and states; colours and wording are placeholders.

The frame is the approved F-08 wizard stepper (`spec/design/features/F-08-wizard-stepper/`): the F-07 header and footer, the stepper row with the round Prev and Next buttons beside it, and the full-width step card. The step body has no title and no step pill: the stepper names the step, and the fields sit directly on the card.

Stories: `spec/specifications/F-09-project-step/stories.md` (16 criteria: 15 `[auto]`, 1 `[device]`).

## Layout grid

As F-08. Header 0–56 (F-07). Stepper row on the page background, y 80–140, centred on y 100: Prev at (72, 100), Next at (1208, 100), four nodes at x 220, 500, 780 and 1060. Step card x 24–1256, y 152–736, with the accent rule across its top. Footer 752–800 (F-07).

Inside the card the fields use the content margins x 72–1208: the name label at y 200, the name input at y 210–250, the idea label at y 310, the idea box at y 320–520, and the help lines below it.

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-project-values.svg` | Step 1 with a name and an idea entered: the single-line name field with its help line, the multi-line idea field, the counter `127 / 5,000`, the help line and the storage line; Prev disabled; Next | AC-001, AC-002, AC-005, AC-006, AC-012, AC-016 | Values entered; Prev disabled; Next enabled |
| 02 | `02-project-blank.svg` | Step 1 with both fields empty: placeholder text, counter `0 / 5,000`, and a note that Next stays available and the analysis on step 4 reports the blank fields; Prev enabled; Next | AC-004, AC-006, AC-009 | Blank name and idea; Next enabled |
| 03 | `03-project-limit.svg` | Step 1 with the name at 100 characters and the idea at 5,000: the note that the name limit is reached, the counter `5,000 / 5,000` and the note that text past the limit is cut, also when pasted | AC-003, AC-006, AC-007, AC-008 | Name at its limit; idea at its limit; Next enabled |

Criteria with no screen are not visual. They are proved by tests:

- AC-010 and AC-011 (trim: the value keeps its spaces while typing; the configuration function trims them).
- AC-013 and AC-015 (values kept between steps; no storage call). The values are the ones on screen 01.
- AC-014 (New project clears the name and the idea). New project is the F-07 header control on every screen.
- The placeholder line on steps 2 to 4 (F-08 AC-013) is on the F-08 screens.

## Decisions these screens take

1. **The F-08 frame, unchanged.** The stepper, Prev and Next, the card and the footer are the approved F-08 drawing. The step name is the stepper label "Project".
2. **Prev, not Back.** The F-08 stories and screens name the button Prev; these screens keep that name.
3. **Name and idea are required, but Next is never blocked.** Screen 02 shows Next enabled with empty fields and the analysis reporting them. The asterisk marks the required fields.
4. **The name shows its limit in its help line, and has no counter.** `ui.md` shows a counter for the idea only.
5. **The idea counter is `N / 5,000`,** counted in code points.
6. **Nothing is stored between visits.** The help line stays as drawn on the approved F-05 screen 01 (owner decision, 2026-11-15). The footer line is the F-07 note.
7. **Limit states are words, not a red error.** Reaching a limit is not a validation error, so the fields keep the neutral border and the amber note says what happens.

## Usability review

| Finding | Severity | Screen | What changed |
| --- | --- | --- | --- |
| U-01 The idea counter read `142 / 5,000`, but the sample idea is 127 code points, so the counter contradicted the text it counts | minor | 01 | Counter set to `127 / 5,000` (the sample text, with its line break counted as one) |
| U-02 The name limit note said "Further text is not kept", while the idea note and the name help line say text is cut; the idea note adds "also when pasted", which AC-008 covers | minor | 03 | Name note reads "100 characters: the limit is reached. Text past the limit is cut, also when pasted." |

Checked and found in order: the task path (name, idea, Next, Prev, New project) has a screen for each step; Prev is disabled on step 1 with the F-08 hover text; Next is never disabled by the blank fields, and screen 02 says so; required fields carry the asterisk; the name limit is stated in its help line (screen 01) and in its note at the limit (screen 03); the 100-character sample on screen 03 counts exactly 100 code points; the action names (Prev, Next, New project) match the F-08 frame. No error ends in a dead end: the amber notes on screens 02 and 03 say what happens and that Next still works.

Not changed: the name help line on screen 01 differs from the approved F-05 wording. That needs an owner decision and is open point 1.

## Visual review

Checked from the SVG source and rendered in headless Chrome at 1280 × 800 (original and changed screens). Grid, header, stepper, footer, type classes, contrast and the colour roles are consistent across the three screens; the header, stepper and footer are identical on every screen apart from the Prev state.

| Finding | Severity | Screen | What changed |
| --- | --- | --- | --- |
| V-01 The idea help lines sat 28 px below the idea box, while the name help line sat 20 px below its field, so the field-to-help gap differed within the form | minor | 01, 02, 03 | Idea help lines moved to 20 px below the box (on screen 03, below the warning box). The blank note on screen 02 moved up with them, keeping its 34 px step |
| V-02 `index.html` described screen 03 as "the text past the limit is not kept", while the screens say "cut" | minor | index.html | Wording changed to "cut" to match the screens and the notes |

Not changed, and not findings: the amber note on screen 02 is a plain line while the idea note on screen 03 is in a box. That is a style choice for the owner (open point 2).

**Open points for the user**

Approved by the user on 2026-11-17 with the screens as drawn. Points 1 and 2 were not answered at approval: they are kept as drawn and remain open for the owner before Verify.

1. **Name help line versus AC-016.** AC-016 says the step 1 help text matches the approved F-05 screen 01. Screen 01 adds "Up to 100 characters; text past the limit is cut." to the name help line. Options:
   - a. Keep the limit in the help line and amend AC-016 to "the approved help text plus the 100-character limit" (recommended: the limit is visible before the user reaches it).
   - b. Restore the approved help line ("A short name. It appears as the project name in the generated CLAUDE.md.") and show the limit only on screen 03.
2. **Limit notes on screen 03.** The name note is an amber line and the idea note is an amber box. The blank note on screen 02 is an amber line. Options: (a) keep as drawn; (b) amber line for every note; (c) box for every note.
