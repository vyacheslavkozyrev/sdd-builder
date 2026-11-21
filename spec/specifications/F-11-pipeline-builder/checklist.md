# Manual checklist — Pipeline builder (F-11)

Run in a desktop browser at 1280 × 800 unless a step says otherwise. Start the app, fill steps 1 and 2 with any valid brief, and go to step 3 (Workflow). The Pipeline tab opens with the default pipeline: six flows in one row (specify, ux, plan, build, verify, complete), arrows with no label, no toolbox.

Record each result as `PASS` or `FAIL` in the Result line and in the Summary table, with a short note. Edits are in memory only; reload the page to restore the default pipeline between checks.

Status: AWAITING CONFIRMATION (Verify run 2026-11-21: 45 of 45 criteria have passing automated tests; the entries below are the device checks).

---

## AC-006 `[device]` — the boxes in one row, inside the canvas, scrolling when wider

1. On step 3, on the Pipeline tab, look at the canvas card: six boxes in one row, each with its name.
2. Check the order: specify, ux, plan, build, verify, complete, left to right.
3. Click + in the tab row about seven times, so the row of boxes is wider than the canvas card.
4. Expected: the boxes stay in one row, in order, with the new flows after complete. The canvas stays inside the content area (it does not run under the properties card or the left panel). A horizontal scrollbar appears under the canvas, and scrolling it brings the far boxes into view.

Result: ______ Note: ______

---

## AC-008 `[device]` — arrows run from right point to left point, with no label and no gate

1. On the Pipeline tab with the default pipeline at 1280 × 800, look at the arrows between the six boxes.
2. Zoom in on one arrow, for example specify to ux.
3. Expected: each arrow starts at the small point on the right edge of its source box and ends at the small point on the left edge of its target box. Each arrow runs in one direction, from source to target.
4. Expected: no arrow shows any text, label, gate or mark. The arrow from complete has no outgoing arrow (complete has no next).
5. Add a flow with + and check that the new box has no outgoing arrow.

Result: ______ Note: ______

---

## AC-013 `[device]` — a link is made only by a drag between connection points

1. On the Pipeline tab, look over the whole screen (left panel, tab row, canvas, properties card) for any button, form field, menu or tool that creates a link between flows, such as a Connect button, a Connection tool or a next-flow field.
2. Expected: none exists. The Pipeline tab has no toolbox.
3. Click + to add a flow. Select the new flow box and read its panel.
4. Expected: the flow panel has no next-flow field and no link control.
5. Drag the new flow's box body (the middle of the box, not a point) onto the box `plan`.
6. Expected: the box moves with the drag and no arrow is created. Reload the page.

Result: ______ Note: ______

---

## AC-014 `[device]` — a refused drag shows its reason at the top centre, and draws no arrow

1. On the Pipeline tab with the default pipeline, drag from the small point on the right edge of `complete` onto the small point on the left edge of `specify`.
2. Expected: a message appears in the band at the top centre of the builder, starting with "Refused ·", and its reason says the link would close a loop. No arrow is drawn between complete and specify.
3. Drag from the small point on the right edge of `specify` (it already has an arrow to ux) onto the small point on the left edge of `plan`.
4. Expected: the band at the top centre shows "Refused ·" with a reason that names specify and says it already has an outgoing arrow. No new arrow is drawn.
5. Drag from the right point of `specify` onto empty canvas.
6. Expected: nothing is added and no arrow appears. Record what the band shows.

Result: ______ Note: ______

---

## AC-016 `[device]` — an arrow end moves by a drag; no picker, field or menu

1. On the Pipeline tab, click the arrow from specify to ux to select it. The properties card shows its source and target names.
2. Look at the properties card and the arrow's ends.
3. Expected: there is no picker, dropdown, text field or menu for the target or the source. The only controls are the names (read only) and the footer Delete connection.
4. Drag the arrow's end at the left edge of `ux` (the target end) onto the small point on the left edge of `plan`.
5. Expected: the arrow now ends at `plan`. The arrow from specify no longer ends at ux. Reload the page.

Result: ______ Note: ______

---

## AC-035 `[device]` — a blocker: red box and a notification at the top centre; a warning beside its item

Part A, blocker:

1. On the Pipeline tab, click + to add a flow. Its id is `flow-N`. It has no body, no incoming arrow and no outgoing arrow.
2. Expected: the new box has a red border and a light red background. A message starting with "Blocker ·" appears in the band at the top centre of the builder, in red. Its text is the analyzer's message (for example about the flow not being connected).
3. Expected: the other six boxes are not red.
4. Note in the Note field whether the body or name problem of the new flow also appears in the top band, or only in the list under the canvas titled "Not on a drawn item". Stories AC-035 says the band; AC-036 says the list. Record what you see; the owner decides.
5. Click the new flow box and click Delete flow, then Cancel. Expected: the flow stays and the red box stays.

Part B, warning (only if one can be produced):

6. If a flow or arrow shows an amber note starting with "Warning ·", check that the note sits beside the box or arrow it belongs to, not elsewhere on the canvas. If no warning appears in steps 1 to 5, record "no warning seen" in the Note; the warning placement is then checked with Layout 3 below.

Result: ______ Note: ______

---

## Layout 1 — the tab row and the white cards

1. On step 3 at 1280 × 800, look at the content area on the right of the left panel (the grey background).
2. Look at the tab row: it sits at the top of the content area and starts at the left edge of the canvas card. Pipeline is the first tab, the flow tabs follow, and + is after the last flow tab.
3. Look at the canvas card (the centre card) and the properties card (the right card). Both are white on the grey background.
4. Expected: the tab row runs the width of the content area, starting at the left edge of the canvas card; the canvas card and the properties card are white and do not blend into the grey background.
5. Note any difference from the approved screen 01 (tab row at the top; canvas card from x 284 to 964; properties card from x 984 to 1256 at 1280 wide).

Result: ______ Note: ______

---

## Layout 2 — no selection highlight on a selected flow or arrow

Note: as built (Task T022), a selected box and a selected arrow have no extra highlight; the approved screens show a blue outline on the selected flow and a blue arrow with handles. Confirm what is seen.

1. On the Pipeline tab, look at the default boxes and arrows with nothing selected. Note the look of a box border and an arrow.
2. Click the box `build`. Look at its border and the arrows near it.
3. Click the arrow from build to verify. Look at its colour and thickness.
4. Expected (as built): the selected box and the selected arrow look the same as the unselected ones; the properties card changes to that item's panel. Record whether the selection can be seen on the canvas at all.
5. Note: the normal box border is blue (the primary colour) in the build, while the screen legend says blue is the selected flow. Record if a normal box and a selected box look different.

Result: ______ Note: ______

---

## Layout 3 — placement of the warning notes

Note: as built (Task T022), the amber warning note sits at an approximate place beside its box, not at the exact place on the screens. Confirm where it sits.

1. Produce a warning as in AC-035 Part B. If none can be produced, record "not reproduced" and mark this entry from the AC-035 result.
2. Look at the note: it is beside the box or arrow it names, not over another box, and it does not cover the box's name.
3. Resize the window narrower and then back to 1280 × 800. Check the note stays beside its box.

Result: ______ Note: ______

---

## Layout 4 — the canvas card border

1. On step 3 at 1280 × 800, look at the edge of the canvas card (the centre card).
2. Expected: a white card with a thin light grey-blue border (1 px), rounded corners (about 12 px) and a soft shadow, the same as the properties card. The border is visible on the grey background.
3. Compare the canvas card's border and corners with the properties card's border and corners. They look the same.

Result: ______ Note: ______

---

## Summary

| Criterion | Tag | Automated tests | Result |
|---|---|---|---|
| AC-006 | device | Canvas.test.tsx, drawing.test.ts | ______ |
| AC-008 | device | drawing.test.ts | ______ |
| AC-013 | device | Canvas.test.tsx (no link control) | ______ |
| AC-014 | device | Canvas.test.tsx, MessageBand.test.tsx | ______ |
| AC-016 | device | Canvas.test.tsx | ______ |
| AC-035 | device | Canvas.test.tsx, MarkViews.test.tsx, MessageBand.test.tsx, PipelineStep.test.tsx, drawing.test.ts | ______ |
| Layout 1 | device (screen 01 layout) | none | ______ |
| Layout 2 | device (screen 01 layout) | none | ______ |
| Layout 3 | device (screen 01 layout) | none | ______ |
| Layout 4 | device (screen 01 layout) | none | ______ |
