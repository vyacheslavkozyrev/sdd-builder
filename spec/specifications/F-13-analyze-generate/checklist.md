# Manual checklist — Analyze and generate step (UI only) (F-13)

Two criteria are `[device]`: AC-030 (layout and states on desktop) and AC-031 (the 404 reply shown as text in a running browser). All other criteria are `[auto]` and are covered by passing tests (see the matrix in `progress.md` → Test Results).

Run in a desktop browser at 1280 × 800. Start the web app (`cd source/apps/web && npm run dev`) against the current server, which has no `/analyze` or `/generate` yet. Fill steps 1 and 2 with any valid brief, then go to step 4 (Analyze and generate). Compare with the approved screens in `spec/design/features/F-13-analyze-generate/` (`01-privacy-analyze-disabled.svg` and `02-privacy-ticked.svg`).

Limit on the current server: the analysis cannot finish, so it never turns green and Generate and download stays disabled with the reason "Run Analyze first". The Generate 404 reply cannot be clicked here; it is covered by the automated tests (AC-028) and is checked on device again after F-15 and F-16.

Edits are in memory only; reload the page to restore the empty step.

Record each result as `PASS` or `FAIL` in the Result line and in the Summary table, with a short note.

Status: COMPLETE. Both results PASS (the user, 2026-11-24).

---

## AC-030 `[device]` — the step matches the approved screens

1. On step 4 with the box unticked, look at the whole page at 1280 × 800.
2. Expected: the left panel is on the left (wordmark, New project, the stepper with Analyze and generate current, Prev enabled and Next disabled at the bottom). The content card sits to its right with two columns: Analyze on the left and Project preview on the right.
3. Expected: the footer note "The work is not saved. It is lost when the browser is refreshed." sits at the bottom of the grey area, and the caption "F-13 · step 4 of 4" sits at the bottom right.
4. Expected (state of screen 01): the privacy notice shows above the Analyze button with its checkbox unticked; Analyze is disabled and shows the reason "Tick the box to analyse"; "No analysis has run on this brief yet." shows in the Analyze column.
5. Expected: the project preview tree panel is drawn with the rule files marked. Show full tree is enabled; Generate and download is disabled with the reason "Run Analyze first".
6. Tick the privacy checkbox.
7. Expected (state of screen 02): Analyze is now enabled and shows as the primary button. Generate and download stays disabled with "Run Analyze first".
8. Untick the checkbox. Expected: Analyze is disabled again.
9. Compare the positions and spacing with `01-privacy-analyze-disabled.svg` and `02-privacy-ticked.svg`. Record any visible difference in the note (position, colour or wording).

Result: PASS Note: layout confirmed by the user at 1280 × 800 (2026-11-24).

---

## AC-031 `[device]` — the 404 reply shown as text

1. On step 4, with values entered in steps 1 and 2 (note the idea text and one stack field), tick the privacy checkbox.
2. Press Analyze.
3. Expected: a red error line beside Analyze reads as the status and text of the reply, with the 404 status shown ("Analysis could not run (404)…", or "network error" if the dev server refused the connection). No findings are listed.
4. Expected: the Analyze button is enabled again, the checkbox is still ticked, and the values on steps 1 and 2 are unchanged (go to step 1 and back to check).
5. Expected: Generate and download is disabled, with the reason "Run Analyze first" (the analysis did not turn green).
6. Press Analyze a second time. Expected: a second request is sent and the same error is shown again, with no change to the values.
7. Try to press Generate and download. Expected: it does not respond, because it is disabled. Record this as the expected limit of the current server (see the top of this checklist).

Result: PASS Note: 404 shown as text, values kept, Generate disabled as expected (2026-11-24).

---

## Summary

| Criterion | Tag | Result | Note |
| --------- | --- | ------ | ---- |
| AC-030 | `[device]` layout and states | PASS | user, 2026-11-24 |
| AC-031 | `[device]` 404 shown as text | PASS | user, 2026-11-24 |
