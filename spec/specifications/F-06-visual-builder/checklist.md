# Manual Checklist — Visual builder: global map and workflow tabs (F-06)

Device criteria from `stories.md`: AC-019 and AC-036. Record the result in the line under each entry, then report the outcome to the caller.

## Setup (once)

1. Terminal: `cd /Users/vyacheslavkozyrev/Projects/SDDBuilder/apps/web && npm run dev` (Vite prints its address, normally `http://localhost:5173`).
2. Open that address in Chrome at a desktop window width of 1280 px or wider.
3. Click "Brief" in the top navigation, fill nothing, and click "Builder" in the same navigation. The builder opens with the reference process.

## AC-019 `[device]` Map shows all workflows without overlap; nodes can be dragged and connected

1. On the Builder view, look at the map.
2. Expected: every default workflow is a node on the map. No node overlaps another, and no node is cut off at the edge of the map area. Each node shows its name, scope, iteration source and counts.
3. Drag one node by its body to an empty area of the map.
4. Expected: the node moves with the pointer and stays where it is dropped.
5. Drag a connection from the handle of one workflow node to another workflow node that has no connection between them in that direction.
6. Expected: a new connection line appears between the two nodes, with no label and no gate.
7. Drag a connection from the second node back to the first (a cycle).
8. Expected: the connection is refused and a message says so. No new line appears.
9. Reload nothing. Switch to "Brief" and back to "Builder".
10. Expected: the map is drawn at full size (not blank or squashed), and the node positions from step 3 are kept.

Pass / fail: ______

## AC-036 `[device]` Inspector and workflow diagram are readable at desktop width; inspector opens beside the diagram

1. On the Builder view, click the "Specify" tab.
2. Expected: the diagram shows the steps of Specify in order, left to right, with the conditions drawn after their steps. Step names are readable, not cut off or overlapping.
3. Click the second step in the diagram.
4. Expected: the inspector opens to the right of the diagram, on the same row, not below it. Both are fully visible at this width with no horizontal scroll of the page.
5. Expected in the inspector: the step name, the files the step produces (or the text "no file generated"), and its rule-set tags (or none).
6. Click a different step in the diagram.
7. Expected: the inspector changes to show that step. Its layout stays the same.

Pass / fail: ______

## Supporting check for AC-004 (automated criterion, reload in the real browser)

AC-004 is `[auto]`, and the unit tests cover the reference start state. This check confirms the reload wiring in the page. It is not a device criterion.

1. On Builder, click "Specify", then remove one optional step in it, and add a new workflow named "Audit".
2. Reload the page (Cmd+R). Click "Builder" again.
3. Expected: the map shows the reference workflows only. "Audit" is gone, and the Specify tab has its reference steps again.

Pass / fail: ______
