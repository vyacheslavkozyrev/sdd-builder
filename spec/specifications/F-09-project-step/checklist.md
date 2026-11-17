# Manual Checklist — Project step (F-09)

Covers the `[device]` criteria of `stories.md`. Run in Chrome, window 1280 × 800, on a fresh load of the app.

**Open before running:** the owner decision on the name help line (`progress.md` Deferred Findings; `screens.md` open point 1). Step 2 decides which text is expected. The build shows the 100-character limit in the name help line.

---

## C-01 — AC-016: step 1 layout and help text at 1280 × 800

Steps:
1. Open the app. Confirm the wizard is on step 1 "Project".
2. Look at the card under the stepper. Confirm the name field (label, single line, with the asterisk), then the idea box with its counter at the bottom right, then the help lines under the idea box, then the storage line.
3. Compare the layout with `spec/design/features/F-09-project-step/01-project-values.svg` (name label and input, idea label and box, help lines in the same order and position).
4. Read the name help line. Expected: `Up to 100 characters; text past the limit is cut. It appears as the project name in the generated CLAUDE.md.` (the current build). If the owner chose option b in `screens.md` open point 1, expected: `A short name. It appears as the project name in the generated CLAUDE.md.`
5. Read the three idea help lines. Expected: `Describe what the product does and who uses it. Leave out how it is built.`, then `Nothing is stored between visits. Reloading clears the wizard.`, then `Up to 5,000 characters. Text past the limit is cut.`
6. Type `Demo` in the name and a short idea. Confirm the counter reads `N / 5,000` with the right count.
7. Scroll the page with the mouse wheel and the keyboard. Expected: the page does not scroll vertically; the name, idea, counter and help lines all fit at 1280 × 800.

Result (pass / fail, and note the help text seen):

Pass / fail: pass

Notes: help text seen is the current build: "Up to 100 characters; text past the limit is cut. It appears as the project name in the generated CLAUDE.md." Reported by the user on 2026-11-17.

---

## Summary

| Item | Criterion | Result |
|---|---|---|
| C-01 | AC-016 (`[device]`) | pass |

All items pass. Verify is complete.
