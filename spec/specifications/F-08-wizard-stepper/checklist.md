# Manual checklist — Wizard stepper (F-08)

Covers the one `[device]` criterion in `stories.md`: AC-015. Compare against the approved left-panel screens `spec/design/features/F-08-wizard-stepper/01-step-project.svg` (step 1) and `04-step-analyze-generate.svg` (step 4), and against the F-07 frame (left panel, content area, footer note).

## Before you start

1. In a terminal, run `npm run dev` in `source/apps/web` (or `npm run dev --workspace @sddbuilder/web` from `source`).
2. Open the URL Vite prints (default `http://localhost:5173`) in a desktop browser (Chrome or Safari).
3. Open the browser developer tools and turn on the device toolbar (responsive mode) so the window size can be set exactly. Set the zoom to 100%.

---

## AC-015 `[device]` — 1280 × 800: left panel with the stepper and Prev and Next, body in the content area, no vertical scroll

Window: 1280 × 800.

1. Set the viewport to 1280 × 800 (width 1280, height 800). Reload the page.
2. Look at the left panel (white, on the left side). Expected, from the top: the SDDBuilder logo and wordmark, then the New project button (white with a grey outline), then the vertical stepper with four steps in this order: Project, Technical details, Workflow, Analyze and generate.
3. On step 1, check the stepper states. Expected: Project has the current marker (violet number with a soft ring); Technical details, Workflow and Analyze and generate are to do (grey outlined numbers).
4. Look at the foot of the left panel. Expected: the Prev button (left, grey and disabled on step 1) and the Next button (right, enabled) sit side by side near the bottom of the panel, with their words inside, and nothing below them.
5. Look at the content area on the right of the panel. Expected: a white card that starts just below the top of the page and ends above the footer note. Inside the card, a sparkle mark in a light circle and the line "The content of this step is added in a later feature." are visible, centred. There is no step title and no input field in the card.
6. Look at the bottom of the grey area, below the card. Expected: the footer note "The work is not saved. It is lost when the browser is refreshed." is visible in full, with nothing cut off.
7. Click Next. Expected: the stepper marks Project as done (green circle with a white check mark) and Technical details as current. Prev and Next stay at the foot of the left panel. The card still fills the space without a vertical scrollbar.
8. Click Next twice more to reach step 4. Expected: Project and Technical details and Workflow are done; Analyze and generate is current. Next is shown greyed out (disabled) at the same place, and clicking it does nothing. Prev is enabled.
9. At step 4, scroll the page with the mouse wheel or trackpad, both up and down. Expected: the page does not scroll vertically. The header, the left panel, the card and the footer note all stay in view, and there is no vertical scrollbar on the page or in the content area.
10. Click Prev three times to return to step 1. Expected: Prev is grey and disabled, Next is enabled, and the layout is the same as in step 2.
11. Optional visual check (compare with screen 01): the first step marker sits about 164 px below the top of the page, the Prev and Next buttons sit about 32 px above the bottom of the page, and the card has a 24 px margin from the panel edge and from the right window edge.

Result: [x] Pass  [ ] Fail (confirmed by the user on 2026-11-20)

Notes: ______________________________________________
