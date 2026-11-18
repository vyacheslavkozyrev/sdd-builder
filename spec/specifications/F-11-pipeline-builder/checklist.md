# Manual checklist — Pipeline builder (F-11)

Run in a desktop browser at 1280 × 800 unless a step says otherwise. Open the app, fill steps 1 and 2 with any valid brief, and go to step 3 (the workflow step). The Pipeline tab opens with the default pipeline.

Record each result as `PASS` or `FAIL` with a short note. The caller collects the results.

Status: AWAITING CONFIRMATION (verify re-run after T019 and T020, 2026-11-17)

---

## AC-006 `[device]` — the tab row spans the available width

1. On step 3, look at the tab row (the line of tabs under the stepper).
2. Resize the browser window wider and narrower, from about 1280 to about 1920 px and back.
3. Observe the tab row's left and right ends at each width.

Expected: Pipeline is the first tab, the + button follows the last flow tab, and the row runs from the left edge of the card to its right edge at every width. The row is not centred and does not stop at a fixed width.

Result: ______ Note: ______

---

## AC-008 `[device]` — connections are drawn as visible arrows (added at re-verify)

The automated tests prove the arrow data (source, target, label, gate). They cannot prove that the arrows are drawn, so check it on screen.

1. Open step 3 on the Pipeline tab with the default pipeline, at 1280 × 800.
2. Look at the canvas: each flow is a box, and each connection is a line with an arrowhead from the right side of one box to the left side of the next box.
3. Read the label on each arrow.
4. Expected: every connection of the default pipeline has a visible arrow with an arrowhead, pointing to the target flow. Each arrow shows its artifact label. No arrow is hidden behind a box or outside the canvas. A gate, if the arrow has one, appears in its label.
5. Click the arrow from `build` to `verify`.
6. Expected: the arrow turns blue and is thicker, and the properties panel shows its artifact label and its gate.

Result: ______ Note: ______

---

## AC-011 `[device]` — pan, one selection, box drag, drag kept until the next layout

1. On the Pipeline tab, drag an empty part of the canvas to the left and right.
2. Expected: the canvas pans and the boxes move together.
3. Click the box `build`. Then click the arrow from `build` to `verify`.
4. Expected: only one item is selected at a time. The properties panel shows the item you clicked last.
5. Drag the box `plan` down by about 100 px and release it.
6. Expected: `plan` stays where you dropped it. The other boxes do not move.
7. Click + in the tab row to add a flow.
8. Expected: the canvas is laid out again, and `plan` goes back to its automatic place in the row, left to right.

Result: ______ Note: ______

---

## AC-012 `[device]` — repoint an arrow end by drag; connect by drag between connection points, or by the Connection tool

Part A, repoint an arrow end:

1. On the Pipeline tab, click the arrow from `build` to `verify` to select it.
2. Drag its end at the `verify` box (the arrowhead end, on the left side of `verify`) onto the box `plan`.
3. Expected: the arrow now ends at `plan`. Its artifact label and its gate (if any) stay the same. A dashed drop target shows on the box while dragging.
4. Click the arrow again to select it. Drag its start end (on the right side of its source box) onto a box that is neither its source nor its target and that has no outgoing arrow of its own.
5. Expected: the arrow now starts at that box, and its label and gate stay as they were. If the box already has an outgoing arrow, the drop is refused with the reason and the arrow does not move.
6. Reload the page to restore the default pipeline before Part B. (Edits are in memory only.)

Part B, connect by drag between connection points:

7. Click + to add a new flow (its id is `flow-N`). It has no outgoing arrow.
8. Drag from the small point on the right side of the new flow's box to the point on the left side of `verify`.
9. Expected: a request for the artifact label appears.
10. Type only spaces and press the confirm button.
11. Expected: the request refuses the blank label with a reason. No arrow is added.
12. Type a label such as `notes.md` and confirm.
13. Expected: an arrow from the new flow to `verify` appears with the label `notes.md` on it.
14. Drag from the right point of the new flow's box (it already has an outgoing arrow now) to the left point of `plan`.
15. Expected: a label request appears. Type `x.md` and confirm.
16. Expected: the request is refused with the reason that the flow already has an arrow (a flow holds one outgoing arrow). Cancel; no arrow is added.

Part C, connect by the Connection tool (toolbox path):

16. Click + to add another flow. It has no outgoing arrow.
17. Drag the Connection tool from the left toolbox onto this new flow's box, then drag the Connection tool again onto `verify`.
18. Expected: a request for the artifact label appears, and a note says "Connection: drop it on the next flow, or on empty canvas to cancel."
19. Type `plan.md` and confirm.
20. Expected: an arrow from the new flow to `verify` appears with the label `plan.md` on it.

Result: ______ Note: ______

---

## AC-022 `[device]` — Approval or Check dropped on an arrow adds the gate; elsewhere adds nothing

1. On the Pipeline tab, select an arrow that has no gate. If it has one, click **Remove gate** in its panel first.
2. Drag **Check** from the left toolbox over the arrow.
3. Expected: the arrow shows a dashed drop target while the Check is over it.
4. Release it on the arrow. Enter a description (for example `tests pass`) and confirm.
5. Expected: the arrow now shows a check gate, and the panel shows it.
6. Remove the gate with **Remove gate**. Then drag **Approval** onto a flow box and release it there.
7. Expected: nothing is added. No gate form opens and no arrow changes.
8. Drag **Approval** onto an empty part of the canvas and release it.
9. Expected: nothing is added.

Result: ______ Note: ______

---

## AC-024 `[device]` — the three-column layout at 1280 × 800

1. Set the browser window to 1280 × 800 (or close to it) and open step 3 on the Pipeline tab.
2. Look at the left column: the toolbox with Connection, Approval and Check.
3. Look at the centre: the canvas with the boxes.
4. Look at the right column: the properties panel for the pipeline.
5. Click a box, then an arrow, then nothing. Watch the right column each time.
6. Resize the window narrower and then back to 1280 × 800.

Expected: at 1280 × 800 the toolbox is on the left with a fixed width (about 170 px), the canvas takes the centre (the rest of the space), and the properties panel is on the right with a fixed width (about 260 px). The two side columns do not change width when the selection changes or when the window is resized; only the canvas changes.

Result: ______ Note: ______

---

## AC-037 — requested for this check by the caller; stories.md tags it `[auto]`

This check is not counted as a device criterion. It is listed here because the caller asked for it. It proves the same thing as the `[auto]` tests, on screen.

1. On the Pipeline tab, click **Delete** on the flow `build` and confirm. This leaves blockers in the structure marks.
2. Expected: the structure marks show at least one blocker, and the canvas shows the mark beside the item it names.
3. With the blocker showing, click + in the tab row.
4. Expected: + is enabled and adds a flow. The marks update.
5. With the blocker showing, click **Delete** on another flow (for example `verify`) and cancel the confirmation.
6. Expected: **Delete** is enabled, and cancel changes nothing.

Result: ______ Note: ______

---

## Summary

| Criterion | Tag | Result |
|---|---|---|
| AC-006 | device | ______ |
| AC-008 | auto (visible arrows checked on screen) | ______ |
| AC-011 | device | ______ |
| AC-012 | device | ______ |
| AC-022 | device | ______ |
| AC-024 | device | ______ |
| AC-037 | auto (checked on screen at the caller's request) | ______ |
