# Manual checklist — Wizard stepper (F-08)

Covers the one `[device]` criterion in `stories.md`: AC-015. Compare against `spec/design/features/F-08-wizard-stepper/screens.md` (screen 01 for step 1, screen 04 for step 4).

## Before you start

1. In a terminal, run `npm run dev` in `source/apps/web` (or `npm run dev --workspace @sddbuilder/web` from `source`).
2. Open the URL Vite prints (default `http://localhost:5173`) in a desktop browser (Chrome or Safari).
3. Open the browser developer tools and turn on the device toolbar (responsive mode) so the window size can be set exactly. Set the zoom to 100%.

---

## AC-015 `[device]` — 1280 × 800: stepper, Prev and Next on one row, body below with no vertical scroll

Window: 1280 × 800.

1. Set the viewport to 1280 × 800 (width 1280, height 800). Reload the page.
2. Look at the top of the centre area, just below the header. Expected: the Prev button (round, with a left arrow and the word "Prev" under it) is at the left, the four step labels (Project, Technical details, Workflow, Analyze and generate) are in the middle, and the Next button (round, with a right arrow and the word "Next" under it) is at the right. All of them are on one row.
3. Look at the area below that row. Expected: a white card with a coloured rule across its top and a sparkle mark with the line "The content of this step is added in a later feature." is visible. The card starts just below the row and ends just above the footer. Nothing is cut off.
4. Click Next. Expected: the stepper row stays on one row, Prev and Next stay in the same place, and the card still fills the space below the row without a vertical scrollbar.
5. Click Next twice more to reach step 4. Expected: the row is still on one row. Next is greyed out (disabled) at the right of the row, in the same place as on steps 1 to 3, and clicking it does nothing. Prev is still at the left and enabled. The card is still visible below the row.
6. At step 4, scroll the page with the mouse wheel or trackpad, both up and down. Expected: the page does not scroll vertically. The header, the row, the card and the footer all stay in view, and there is no vertical scrollbar.
7. Click Prev three times to return to step 1. Expected: Prev is grey and disabled on step 1, Next is shown, and the layout is the same as in step 2.
8. Optional visual check (compare with screen 01): the row sits about 80 to 140 px below the top of the page, the card runs 16 px below the row to 16 px above the footer, and the card spans the full width between the 24 px side margins.

Result: [ ] Pass  [ ] Fail

Notes: ______________________________________________
