# Manual checklist — Workflow builder (F-12)

Run in a desktop browser at 1280 × 800. Start the web app (`cd source/apps/web && npm run dev`), fill steps 1 and 2 with any valid brief, and go to step 3 (Workflow). The Pipeline tab opens with the default pipeline; each flow has its own tab in the tab row (Specify, UX, Plan, Build, Verify, Complete). Use the Build tab for the Condition check, since it is the only Condition in the default pipeline.

Edits are in memory only; reload the page to restore the default pipeline between checks.

Record each result as `PASS` or `FAIL` in the Result line and in the Summary table, with a short note.

Status: AWAITING CONFIRMATION (Verify run 2026-11-23: 50 of 53 criteria have passing automated tests; AC-007, AC-008 and AC-012 are device checks, and their geometry and gesture logic is covered by automated tests; see `progress.md`, Test Results).

---

## AC-007 `[device]` — the shapes of the blocks

1. On step 3, open the Specify tab. Look at the canvas: a circle at the left (Start), a rounded box in the middle (the Agent `specify`), a circle at the right (End).
2. Expected: the Start circle has the primary outline. The End circle has the dark text outline. The Agent box shows its name `specify` and one line of its description, "Drafts stories.md.".
3. Click the `specify` box. Expected: the box gets the primary outline on a light tint, and its panel opens on the right.
4. Open the Build tab. Find the Condition diamond `build-check`, between the Agent `build-test` and the Agent `build-commit`.
5. Expected: its description ("the build shows 0 errors, 0 warnings, 0 lint errors and all tests pass") sits above the diamond, readable, and does not overlap the arrows.
6. Click `build-implement` on the Build tab. In its panel, type a description of about 150 characters and leave the field.
7. Expected: the box still shows one line of its description, cut with an ellipsis at the right edge of the box, and does not grow.
8. Make the false route of `build-check` a return: drag from its false output point to `build-implement` (as in AC-012, steps 3 and 4), then set its round limit to 3 in its panel.
9. Expected: the Condition's description now sits below the diamond, not above it, because its false route returns to an earlier Agent.

Result: ______ Note: ______

---

## AC-008 `[device]` — arrows, labels and the return

1. On the Build tab with the default pipeline, look at the arrow from `build-implement` to `build-review`.
2. Expected: a solid line from the small point on the right edge of `build-implement` to the small point on the left edge of `build-review`, with no label.
3. Look at the two outputs of `build-check`. Expected: the true output is labelled "true" and goes to `build-commit`, solid. The false output is labelled "false" and, in the default pipeline, has no arrow (it stops the flow).
4. Make the return as in AC-007, step 8 (false output of `build-check` to `build-implement`, round limit 3).
5. Expected: the false arrow is dashed, it runs back to `build-implement`, and it is labelled "up to 3 rounds". The dashed line stays clear of the boxes.
6. Drag the end of the dashed arrow from `build-implement` to `build-test` (an earlier Agent of the same flow).
7. Expected: the arrow is still dashed, still labelled "up to 3 rounds", and now ends at `build-test`. It still reads as a return.
8. Drag the end of the same arrow to `build-commit` (a later block).
9. Expected: the arrow is now solid, the "up to 3 rounds" label is gone, and the "false" label remains. The round limit no longer shows on the Condition's panel.
10. Create a return with no round limit: drag the false output of `build-check` to `build-implement` and do not set a limit. Expected: the arrow is dashed and has no "up to" label (a return with no limit has no label on the canvas). Its Condition's panel shows the route as incomplete.
11. If an amber mark sits on that arrow or on the Condition, check that it does not hide the "false" label or the Condition's description. Record in the note any overlap you see (it was not checked by eye in the build).

Result: ______ Note: ______

---

## AC-012 `[device]` — linking by dragging from a point to a point

1. On the Build tab, press the Agent button in the toolbox at the top right of the canvas. Expected: a new block `block-N` appears, selected, with no arrows, and its panel opens.
2. Click the empty canvas to clear the selection. Find the small point on the right edge of `block-N` (the output) and the small point on the left edge of the End block (the input).
3. Press the mouse on the output point of `block-N`, drag across the canvas towards the End block, then release on the input point of the End block.
4. Expected: while you drag, an arrow follows the pointer from the output point. On release, a solid arrow from `block-N` to the End block is drawn and stays. Repeat with a trackpad (press with one finger, move, lift) and confirm the same result.
5. Press the mouse on the output point of `build-implement`, drag, and release on the empty canvas (not on a block).
6. Expected: no arrow is added, `build-implement` keeps its arrow, and no message is shown.
7. Press the mouse on the output point of `build-implement`, drag, and release on the body of `build-review` (not on its input point).
8. Expected: no arrow is added or changed; the output of `build-implement` keeps its arrow.
9. Press the mouse on the left point (input) of `build-review` and drag.
10. Expected: no link starts; nothing moves and no arrow is added.
11. Press the mouse on the output point of `build-implement`, drag, and release on the input point of `build-review` (the arrow already exists).
12. Expected: the message band shows "This block already has an arrow from this point." The existing arrow stays as it was.

Result: ______ Note: ______

---

## Summary

| Criterion | Tag | Result | Note |
| --------- | --- | ------ | ---- |
| AC-007 | `[device]` shapes | | |
| AC-008 | `[device]` arrows and labels | | |
| AC-012 | `[device]` drag gesture | | |
