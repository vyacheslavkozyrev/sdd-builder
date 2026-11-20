# UX screens — UI layout template: left panel, content area, footer (F-07)

Scope: the shared frame every screen uses: the left panel (logo wordmark, New project, the vertical stepper, Prev and Next at its foot), the grey content area beside it with the centre slot, and the footer note that the work is not saved. Desktop only. Wireframes in SVG: layout and content; the step names are the wizard's (`ui.md` §1.3, drawn as on the F-11 reference screen 01).

Stories: `spec/specifications/F-07-ui-layout-template/stories.md` (14 criteria: 12 `[auto]`, 2 `[device]`).

Restyle of 2026-11-18: the header bar is replaced by the left panel of F-11 screen 01. The frame follows the F-11 reference: Inter, Material Kit colours (primary #635BFF, page #F0F4F8, text #32383E, secondary text #636B74, borders #DDE7EE and #CDD7E1), white cards with a soft shadow and 12 px radius, 8 px radius for controls, the 8 px grid.

## Layout grid

Left panel: x 0–260 (white, 1 px border #DDE7EE at x 259). Inside it, 24 px gutters: wordmark row at y 24–48 (logo square 24 × 24 at x 24, wordmark at x 58); New project at x 24–236, y 72–112 (secondary button: white fill, 1 px #CDD7E1 border, #32383E text, 8 px radius; owner decision of 2026-11-18); stepper from y 146 (step 1 ring) to y 368; Prev at x 24–124 and Next at x 136–236, both 40 px high.

Content area: x 260–1280 (grey #F0F4F8). The white card sits at x 284–1256 (24 px from the panel edge and from the right window edge), y 24–728 at 1280 × 800. The footer note and caption sit inside the grey area, 24 px below the card: note at x 284, caption right-aligned at x 1256, baseline y 766.

Minimum width, 1024 px: the left panel keeps 260 px (it does not collapse; the stepper and both buttons keep their positions). The content area takes the rest: card x 284–1000 (716 px), y 24–680. Prev and Next move up to y 680–720 to clear the scrollbar strip. Note and caption sit at baseline y 716, the caption right-aligned at x 1000. The frame is 1024 × 768; the scrollbar strip at y 744–768 spans the full width.

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-frame-desktop.svg` | The frame at the 1280 × 800 reference: left panel with the wordmark, New project, the stepper and Prev and Next; the content card; the footer note and caption | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-011 | Default: step 1 current, Prev disabled (step 1), Next enabled; the card shows a placeholder, because the screen supplies the content (none in this frame) |
| 02 | `02-frame-minimum-width.svg` | The same frame at the 1024 px minimum width, with the left panel at 260 px and the content card taking the rest; the scrollbar strip shown for a narrower window | AC-012, AC-006, AC-007, AC-004 | Minimum width; scrollbar present below 1024 px |

Criteria with no screen are not visual and are proved by tests: AC-009 and AC-010 (the frame style: width, minimum width, overflow), and AC-013 and AC-014 (Material UI markup).

## Decisions these screens take

1. **The left panel is the same on every screen.** It holds the wordmark and New project in F-07. The stepper and Prev and Next are F-08 and are drawn here only to show their place. There is no Demo button (AC-003).
2. **Prev and Next belong to the wizard.** They are drawn here at step 1 (Prev disabled) only to show where they sit at the foot of the panel; their behaviour is F-08 (`ui.md` §1.3).
3. **The footer is a note, not a control.** It holds no buttons or links (AC-005).
4. **The content area is a slot.** The frame sets its size; the screen supplies the content (the wizard in F-08, or another screen).
5. **Below 1024 px the page scrolls.** It does not reflow into a phone column, and the left panel does not collapse (`ui.md` §7).

## Restyle checks (2026-11-18)

| Check | Result |
|---|---|
| XML: both SVGs pass `xmllint --noout` | Pass |
| Render: both SVGs rendered in headless Chrome at 1280 × 800 and 1024 × 768 | Pass; every text line sits inside its box |
| Text fit: wordmark in the 260 px panel, step labels up to "Analyze and generate", the card placeholder, the footer note and caption, the scrollbar caption | Fit; the scrollbar caption ends at x 1000 and starts clear of the thumb (ends at x 324) |
| Grid: 24 px gutters, 8 px multiples in control heights and positions | Pass |
| Colour roles: purple for the action and the current step, grey for secondary text, border colours for controls | Pass; no red, amber or teal (the frame has no state beyond the disabled Prev) |

## Open points for the user

1. **New project discards entered work without a warning.** The footer says the work is lost on refresh, but New project is one click away from every screen and the stories do not say what it does to a brief in progress. The handler is supplied by the caller (F-08). Options: (a) keep as is: New project starts over at once, as the stories say; (b) ask "Discard the current project?" before the handler runs when the wizard has any input (a story and AC change, and a new `[auto]` criterion). Not changed here: it needs a decision and a story change.
2. **Scrollbar strip on screen 02.** The strip is drawn to show the minimum-width behaviour. Options: (a) keep it as an illustration with the caption (current); (b) remove the strip and keep only the caption, so the frame reads as a plain 1024 px window. Not changed here: it is a presentation choice for the owner.
3. **Stories wording after the restyle.** AC-001 and US-001 still say "the header renders … in its left region" and "New project … in its right region", and the requirement coverage names the header. The design now has no header bar: the wordmark and New project are both in the left panel. The stories are not changed here; they need the owner's wording (for example "the left panel renders the wordmark and New project") before the next implementation of F-07.

## Approval

The restyle of 2026-11-18 (left panel) was approved by the user on 2026-11-20, together with the amended stories. The header layout approved on 2026-11-17 is superseded.

Resolved on 2026-11-20 by the user: point 1 kept (New project starts over at once); point 2 kept (scrollbar strip stays as an illustration); point 3 resolved by the amended stories (the wordmark and New project are in the left panel). In F-07 the panel holds only the wordmark and New project; the stepper and Prev and Next shown in the screens are added by F-08.
