# Manual checklist — UI layout template (F-07)

Covers the two `[device]` criteria in `stories.md`: AC-011 and AC-012. Compare against the wireframes in `spec/design/features/F-07-ui-layout-template/screens.md` (screen 01 for 1280 × 800, screen 02 for 1024 px).

## Before you start

1. In a terminal, run `npm run dev` in `source/apps/web` (or `npm run dev --workspace @sddbuilder/web` from `source`).
2. Open the URL Vite prints (default `http://localhost:5173`) in a desktop browser (Chrome or Safari).
3. Open the browser developer tools and turn on the device toolbar (responsive mode) so the window size can be set exactly. Set the zoom to 100%.

---

## AC-011 `[device]` — 1280 × 800: all three regions visible, no vertical scroll

Window: 1280 × 800.

1. Set the viewport to 1280 × 800 (width 1280, height 800).
2. Reload the page.
3. Look at the top bar. Expected: the `SDDBuilder` wordmark is at the left and the `New project` button is at the right, inside the header bar.
4. Look at the middle of the page. Expected: the centre area is visible below the header, with its placeholder text. Nothing from the centre area is cut off.
5. Look at the bottom of the window. Expected: the footer note ("…not saved… lost when the browser is refreshed") is visible and sits at the bottom edge of the window.
6. Scroll the page with the mouse wheel or trackpad, both up and down. Expected: the page does not scroll vertically; the header, centre area and footer all stay in view with no vertical scrollbar.
7. Optional visual check (compare with screen 01): the header and footer are about 56 px and 48 px high, and the centre area has 24 px side margins.

Result: [x] Pass  [ ] Fail

Notes: ______________________________________________

---

## AC-012 `[device]` — 1024 px wide: one column, no overlap; narrower scrolls horizontally

Window: 1024 px wide (height 800 is fine).

1. Set the viewport to 1024 px wide (height 800).
2. Reload the page.
3. Look at the layout. Expected: the header, the centre area and the footer are stacked in one column, from top to bottom: header, centre area, footer. No element overlaps another.
4. Check the `New project` button and the footer note. Expected: the button is still at the right side of the header, and the footer note is still on one line inside the footer bar.
5. Narrow the viewport to 1000 px wide, then to 800 px wide. Expected: the page scrolls horizontally (a horizontal scrollbar appears or the page can be scrolled sideways). The layout does not reflow into a narrow phone column and nothing is clipped.
6. Set the viewport back to 1024 px. Expected: the horizontal scrollbar disappears and the layout is the same as in step 3.
7. Optional visual check (compare with screen 02): the footer is about 48 px high at 1024 px.

Result: [x] Pass  [ ] Fail

Notes: ______________________________________________

---

## Sign-off

- AC-011: [x] Pass  [ ] Fail
- AC-012: [x] Pass  [ ] Fail
- Tester: the user (reported in chat)   Date: 2026-11-17
