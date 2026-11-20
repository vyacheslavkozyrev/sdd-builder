# Manual checklist — UI layout template (F-07)

Covers the two `[device]` criteria in `stories.md`: AC-011 and AC-012. Compare against the wireframes in `spec/design/features/F-07-ui-layout-template/`: screen 01 (`01-frame-desktop.svg`) at 1280 × 800 and screen 02 (`02-frame-minimum-width.svg`) at 1024 px. The layout is a left panel (260 px wide) with the wordmark and New project, a centre card, and a footer note.

Only F-07 is in the build. The stepper, Prev and Next drawn in the screens are F-08 and must **not** appear yet. The centre card is empty until F-08 fills it.

## Before you start

1. In a terminal, run `npm run dev` in `source/apps/web` (or `npm run dev --workspace @sddbuilder/web` from `source`).
2. Open the URL Vite prints (default `http://localhost:5173`) in a desktop browser (Chrome or Safari).
3. Open the browser developer tools and turn on the device toolbar (responsive mode) so the window size can be set exactly. Set the zoom to 100%.

---

## AC-011 `[device]` — 1280 × 800: all three regions visible, no vertical scroll

Window: 1280 × 800. Compare with screen 01.

1. Set the viewport to 1280 × 800 (width 1280, height 800).
2. Reload the page.
3. Look at the left panel (the white column at the left edge, about 260 px wide). Expected: the `SDDBuilder` wordmark is at the top, and the `New project` button is below it, full width of the panel. No stepper, Prev or Next is shown (F-08).
4. Look at the grey area to the right of the panel. Expected: a white card with a thin border and rounded corners, with 24 px of grey space around its left, top and right edges. The card is empty.
5. Look at the bottom of the window. Expected: the footer note "The work is not saved. It is lost when the browser is refreshed." is visible below the card, on the grey area, and sits at the bottom edge of the window. It contains no button or link.
6. Scroll the page with the mouse wheel or trackpad, both up and down. Expected: the page does not scroll vertically. The left panel, card and footer all stay in view, with no vertical scrollbar.
7. Optional visual check (compare with screen 01): the panel is 260 px wide and the card starts 24 px from the panel edge.

Result: [ ] Pass  [ ] Fail

Notes: ______________________________________________

---

## AC-012 `[device]` — 1024 px wide: no overlap; narrower scrolls horizontally

Window: 1024 px wide (height 800 is fine). Compare with screen 02.

1. Set the viewport to 1024 px wide (height 800).
2. Reload the page.
3. Look at the layout. Expected: the left panel stays on the left at its full 260 px width, and the card and footer fill the rest of the window to the right. Nothing overlaps: the wordmark, New project, the card and the footer note are all separate and fully visible.
4. Check the `New project` button and the footer note. Expected: the button is still inside the left panel and its label is on one line. The footer note is still on one line in the grey area below the card.
5. Narrow the viewport to 1000 px wide, then to 800 px wide. Expected: the page scrolls horizontally (a horizontal scrollbar appears or the page can be scrolled sideways). The left panel does not collapse or move into a column, the layout does not reflow into a phone column, and nothing is clipped.
6. Set the viewport back to 1024 px. Expected: the horizontal scrollbar disappears and the layout is the same as in step 3.
7. Optional visual check (compare with screen 02): the card keeps 24 px margins on its right and top sides.

Result: [ ] Pass  [ ] Fail

Notes: ______________________________________________

---

## Sign-off

- AC-011: [ ] Pass  [ ] Fail
- AC-012: [ ] Pass  [ ] Fail
- Tester: the user (reported in chat)   Date: ____________
