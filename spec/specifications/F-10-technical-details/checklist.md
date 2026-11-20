# Manual Checklist — Technical details step (F-10)

Covers the `[device]` criterion of `stories.md` (AC-025). Run in Chrome, window 1280 × 800, on a fresh load of the app (start it with `npm run dev` in `/Users/vyacheslavkozyrev/Projects/SDDBuilder/source/apps/web`, then open the local address it prints).

**Open before running:** the owner's layout points in `spec/design/features/F-10-technical-details/screens.md` ("Open points for the user", points 1 to 3: inner scroll of the rule list, block height at three or more blocks, clipped 100-character name). The check records what the person sees; it does not decide these points.

---

## C-01 — AC-025: step 2 layout at 1280 × 800

Steps:
1. Open the app in a fresh load. On step 1 "Project", type a project name and a short idea, then press Next to reach step 2 "Technical details".
2. With the rule list empty, look at the first screen without scrolling. Expected: the language, framework, platform, build tool and test framework fields, the architecture field, and the rule list heading with the Add rule block button are all visible.
3. Scroll the page with the mouse wheel and with the arrow keys. Expected: the page does not scroll vertically.
4. Press Add rule block twice. In the first block's name field type `Code Style`. Expected: the file line shows `.claude/rules/code-style.md`.
5. In the second block's name field type `!!!`. Expected: the message "Needs a letter or digit." appears in place of the file name; the block is still there; the page does not scroll vertically.
6. Look at the two blocks on the first screen. Compare with `spec/design/features/F-10-technical-details/01-technical-values.svg` and `03-rule-duplicate-ids.svg`. Expected: stack and architecture fields on the left, the rule list on the right, the Add rule block control in the list header; colours and wording may differ.
7. Press Add rule block until there are three blocks. Expected: the rule list scrolls inside its own region; the stack and architecture fields and the page do not move.

Result (pass / fail; for screens.md points 1 to 3, write what was seen):

Pass / fail: **Pass** (the user, 2026-11-20, after the divider and column fixes: "ok, all AC pass").
Notes:

---

## Summary

| Item | Criterion | Result |
|---|---|---|
| C-01 | AC-025 (`[device]`) | Pass (2026-11-20) |
