# Manual Checklist — Technical details step (F-10)

Covers the `[device]` criteria of `stories.md`. Run in Chrome, window 1280 × 800, on a fresh load of the app (start it with `npm run dev` in `/Users/vyacheslavkozyrev/Projects/SDDBuilder/source/apps/web`, then open the local address it prints).

**Open before running:** the owner's layout points in `spec/design/features/F-10-technical-details/screens.md` ("Open points for layout review", points 1 to 3: inner scroll of the rule list, block height at three or more blocks, clipped 100-character name) and the owner decision on the rule name help line (`progress.md` Deferred Findings). The check below records what the owner sees; it does not decide these points.

---

## C-01 — AC-023: step 2 layout at 1280 × 800

Steps:
1. Open the app. On step 1 "Project", type a project name and a short idea, then press Next to reach step 2 "Technical details".
2. With the rule list empty, look at the first screen. Confirm the language, framework, platform, build tool and test framework fields, the architecture field, and the rule list heading with the Add rule block button are all visible without scrolling.
3. Scroll the page with the mouse wheel and the keyboard. Expected: the page does not scroll vertically; the stack and architecture fields stay on the left, the rule list on the right.
4. Press Add rule block twice. Expected: two rule blocks appear, each with name, file line, description and Remove; the page still does not scroll vertically.
5. Look at the two rule blocks on the first screen. Expected: the rule list scrolls inside its own region (a scroll indicator appears on the list) when it holds more blocks than fit; the page does not.
6. Press Add rule block until there are three blocks. Expected: the third block is reached by scrolling inside the list only; the stack and architecture fields do not move.
7. Compare with `spec/design/features/F-10-technical-details/01-technical-values.svg` (two columns in one card, stack and architecture left, rule blocks right, Add rule block control in the list header). Expected: the same arrangement; colours and wording may differ.
8. In the first rule block's name field, type a name of 100 or more characters. Expected: the text is cut at 100 characters; a long name may be clipped at the input's edge (owner point 3). Note whether the clipping is acceptable.

Result (pass / fail, and what the owner saw for the inner scroll, block height at three blocks and name clipping):

Pass / fail: **Pass** (recorded from the user's answer, 2026-11-17).

Notes: The user reported the layout as passing. The user did not answer owner points 1 to 3 one by one, so they stay as drawn in `screens.md` for the owner to decide later.

---

## Summary

| Item | Criterion | Result |
|---|---|---|
| C-01 | AC-023 (`[device]`) | Pass (2026-11-17) |
