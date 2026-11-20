# Manual Checklist — Project step (F-09)

Covers the `[device]` criterion of `stories.md` (AC-017). AC-016 is `[auto]` now and is no longer in this checklist. Run in Chrome, window 1280 × 800, on a fresh load of the app (no earlier values in the wizard).

**Owner decisions taken (2026-11-20)** — both points are settled, nothing to confirm before running:

1. **Name limit note (screen 03):** plain amber text, as drawn. The idea limit note keeps its box.
2. **Idea help lines:** three lines, as on screen 01 (AC-016 amended to match).

---

## C-01 — AC-017: step 1 layout at 1280 × 800 and the limit notes

Steps:
1. Open the app at 1280 × 800. Confirm the wizard is on step 1 "Project".
2. Look at the card under the stepper. Confirm the order: name label with the asterisk and the name field, then the idea label and the idea box, then the idea counter `0 / 5,000` at the bottom right of the box, then the name help line, then the three idea help lines, then the storage line. Compare with `spec/design/features/F-09-project-step/01-project-values.svg` (same fields, same order, same positions).
3. Type `Demo` in the name field. Confirm the name help line stays visible.
4. Type exactly 100 characters in the name field (for example `a` repeated 100 times). Expected: the name help line is replaced by the name limit note `100 characters: the limit is reached. Text past the limit is cut, also when pasted.` in amber. Compare its look with screen 03 (`spec/design/features/F-09-project-step/03-project-limit.svg`). Answer point 1 above is what this look must match.
5. Clear the name. Expected: the name help line is back.
6. Click into the idea box and paste a text of exactly 5,000 characters (for example 50 lines of 100 characters each). Expected: the counter reads `5,000 / 5,000`; the idea limit note `The idea is at the limit of 5,000 characters. Text past it is cut, also when pasted.` shows in its amber note box, and the three idea help lines stay below the box. Compare with screen 03.
7. Paste 20 more characters into the idea box. Expected: the text does not grow past 5,000; the counter still reads `5,000 / 5,000`.
8. Scroll the page with the mouse wheel and the keyboard (Page Down, arrow keys) with the limit note showing. Expected: the page does not scroll vertically; the name, idea, counter, notes and help lines all fit inside the window at 1280 × 800.
9. Compare the step 1 layout with screen 01 at 1280 × 800 once more with both fields empty. Expected: no overlap of the help lines with the idea box or the footer.

Result (pass / fail, and what was seen for steps 4 and 6):

Pass / fail: pass (user, 2026-11-20)

Notes: the user reported pass for C-01 on 2026-11-20.

---

## Summary

| Item | Criterion | Result |
|---|---|---|
| C-01 | AC-017 (`[device]`) | pass (user, 2026-11-20) |

Owner decisions of 2026-11-20 are settled (see the top of this file).
