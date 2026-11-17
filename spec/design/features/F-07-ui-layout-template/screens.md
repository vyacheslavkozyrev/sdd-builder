# UX screens — UI layout template: header, footer, centre area (F-07)

Scope: the shared frame every screen uses: the header (logo wordmark and New project), the centre content area, and the footer note that the work is not saved. Desktop only. Wireframes in SVG: layout and content; colours and wording are placeholders.

Stories: `spec/specifications/F-07-ui-layout-template/stories.md` (14 criteria: 12 `[auto]`, 2 `[device]`).

## Layout grid

Header 0–56 (wordmark at x 24; New project button x 1120–1256 at 1280 wide, right-aligned to a 24 px gutter). Centre area x 24–1256, y 80–672 at 1280 wide (16 px below the header rule; 24 px side gutters). Footer 752–800 at 1280 wide, with the note at x 24. At the 1024 px minimum the centre area and footer keep the same margins and the button moves to the right gutter. At 1024 px the footer is 728–776 (48 px, note at y 756), above a 24 px scrollbar strip at 776–800 that appears only in a window narrower than 1024 px; the strip is an illustration.

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-frame-desktop.svg` | The frame at the 1280 × 800 reference: header with logo and New project, centre area, footer note | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-011 | Default; the centre area shows a placeholder, because the screen supplies the content (none in this frame) |
| 02 | `02-frame-minimum-width.svg` | The same frame at the 1024 px minimum width, with the horizontal scrollbar shown for a narrower window | AC-012, AC-006, AC-007, AC-004 | Minimum width; scrollbar present below 1024 px |

Criteria with no screen are not visual and are proved by tests: AC-009 and AC-010 (the frame style: width, minimum width, overflow), and AC-013 and AC-014 (Material UI markup).

## Decisions these screens take

1. **The header is the same on every screen.** Only New project is in it; there is no Demo button (AC-003).
2. **The footer is a note, not a control.** It holds no buttons or links (AC-005).
3. **The centre area is a slot.** The frame sets its size; the screen supplies the content (the wizard in F-08).
4. **Below 1024 px the page scrolls.** It does not reflow into a phone column (`ui.md` §7).

## Usability review

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| U-01 | The 1024 px frame drew the scrollbar with a caption that did not say it only appears below 1024 px, so it read as a state at the minimum width | minor | 02 | Caption now says the scrollbar appears only in a window narrower than 1024 px; the strip is an illustration |
| U-02 | The footer at 1024 px was 52 px tall and moved up, unlike the 48 px footer at 1280 px | minor | 02 | Footer set to 728–776 (48 px), note at y 756, same as the reference footer height |
| U-03 | The states column of screen 01 said "centre area empty", but the SVG shows placeholder text | minor | 01 | States text now says the centre area shows a placeholder for the screen's content |

Checked and found no change needed: every task (the frame is shown on all screens); controls and their states (New project is the only control, always enabled); footer holds no control (AC-005); one header and one footer on every screen; Demo absent (AC-003); the order of header, centre, footer; wording of the not-saved note; all 14 criteria appear in this file.

**Open points for the user**

1. **New project discards entered work without a warning.** The footer says the work is lost on refresh, but New project is one click away from every screen and the stories do not say what it does to a brief in progress. The handler is supplied by the caller (F-08). Options: (a) keep as is: New project starts over at once, as the stories say; (b) ask "Discard the current project?" before the handler runs when the wizard has any input (a story and AC change, and a new `[auto]` criterion). Not changed here: it needs a decision and a story change.

## Visual review

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| V-01 | The scrollbar caption ran under the scrollbar thumb, and both were the same grey (#94a3b8), so the words were lost where they overlapped | major | 02 | Thumb shortened to x 24–324 (300 px); caption moved to the right end of the strip and set to baseline y 792, clear of the thumb |
| V-02 | Caption text (#94a3b8) had about 2.3:1 contrast on white and on the scrollbar strip | minor | 01, 02 | `.caption` fill set to #64748b (about 5:1 on white, 4:1 on the strip); size and class unchanged |
| V-03 | The footer moves from 752–800 (1280 px) to 728–776 (1024 px), and the grid did not say so | minor | 02 (grid in `screens.md`) | Layout grid now gives the 1024 px footer position and the scrollbar strip at 776–800 |

Checked and found no change needed: header and footer are identical in position and style on both frames apart from the 1024 px footer move; New project sits at the right gutter (24 px) on both widths; text baselines are centred on the button and in the header and footer bars; the centre placeholder and the note fit inside their boxes at 13 px and 12 px; no element is drawn outside the canvas; colours follow the roles (blue for the action, grey for the note); the frame has no red, amber, teal or orange, which is right since it has no state. Rendered both SVGs in headless Chrome before and after the change; the desktop frame needed no change.

**Open points for the user**

1. **Scrollbar strip on screen 02.** The strip is drawn to show the minimum-width behaviour. Options: (a) keep it as an illustration with the caption (current); (b) remove the strip and keep only the caption, so the frame reads as a plain 1024 px window. Not changed here: it is a presentation choice for the owner.

## Approval

Approved by the user on 2026-11-17 as they are. Open point 1 (New project asks no confirmation) and open point 2 (scrollbar strip kept) are kept as drawn; the stories are unchanged.
