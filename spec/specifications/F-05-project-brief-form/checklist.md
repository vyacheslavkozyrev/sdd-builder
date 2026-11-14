# Manual Checklist — Project brief form (F-05)

Device criteria from `stories.md`: AC-025 and AC-026. Record the result in the line under each entry, then report the outcome to the caller.

## Setup (once)

1. Terminal 1: `cd /Users/vyacheslavkozyrev/Projects/SDDBuilder/apps/api && npm start` (API on port 3000; `PORT` unset).
2. Terminal 2: `cd /Users/vyacheslavkozyrev/Projects/SDDBuilder/apps/web && npm run dev` (Vite prints its address, normally `http://localhost:5173`).
3. Open that address in Chrome. Open DevTools (Cmd+Option+I).

## AC-025 `[device]` Reloading the page clears the brief and the privacy checkbox

1. Type `Hourly Tracker` in Project name. Type any text in Idea.
2. Under Stack, type `TypeScript` in Language. Under Architecture, type `Layered` in Style.
3. Click "+ Add module". Type `core` in its name and `0` in its layer.
4. Under Code rules, click "+ Add rule" and type one rule. Tick "I understand, send the brief for review".
5. Confirm the Analyze button is enabled and the checkbox is ticked.
6. Reload the page (Cmd+R).
7. Expected: Project name, Idea, Language, Style, the module row and the rule are all empty. The checkbox "I understand, send the brief for review" is unticked. Analyze is disabled. Progress shows Idea and Stack and Modules as incomplete.
8. Optional: in DevTools, Application tab, check Local Storage and Session Storage for this address. Both are empty.

Pass / fail: ______

## AC-026 `[device]` Phone width: 16px side gutter, no horizontal scroll, section order

1. In DevTools, turn on the device toolbar (Cmd+Shift+M). Set the width to 360 px. Reload.
2. Expected: the "1. Idea" heading starts 16 px from the left edge of the screen (check with the computed padding on the page). Text does not run to the screen edge.
3. Expected: no horizontal scrollbar at the bottom of the page. Scroll sideways with two fingers or Shift+scroll and confirm the page does not move sideways.
4. Type a long word of about 100 letters into Idea, and a long module name. Expected: no horizontal scroll appears; the text wraps or the field scrolls inside itself.
5. Scroll from the top to the bottom. Expected order: "1. Idea", "2. Stack", "3. Architecture", "4. Code rules", "5. Test rules", then the "Before you analyze" notice with the checkbox, then the Analyze button, then the Progress panel. The "Other problems to fix" section appears only when a problem has no field of its own.
6. Repeat steps 2 to 5 with the width set to 390 px.
7. Order decided by the user (2026-11-13): the progress panel comes last, after Analyze, as in `design/mockups/02-brief.svg` and as built. AC-026 wording updated to match.

Pass / fail: ______

## Also seen during this run (not separate criteria)

These behaviours are wired in the UI and tested at the logic level only (see `progress.md`, Test Results). Confirm them while doing AC-025 and AC-026:

- Analyze stays disabled until the checkbox is ticked and the brief is valid (AC-015, AC-016, AC-017).
- "+ Add module" adds one row, and "Remove module N" removes it (AC-009, AC-011). "+ Add rule" and "Remove rule N" work the same way (AC-012).

Pass / fail: ______
