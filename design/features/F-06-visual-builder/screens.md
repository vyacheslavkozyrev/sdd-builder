# UX screens — Visual builder: global map (F-06)

Scope of this approval: the **global map layout** only (screen 01). The workflow tab and the other states come after this layout is approved.

Layout rework. The first build followed the MVP wireframes in `design/mockups/07-map.svg`; that is a reference only. This layout replaces it for the map. It is a wireframe in SVG: layout, content and states are shown, colours and wording are placeholders.

Format: SVG, 1280 × 800 (desktop). Desktop is the target for this feature (AC-036).

## Screen

| # | File | What it shows | Criteria it shows or proves | States shown |
|---|---|---|---|---|
| 01 | `01-map.svg` | Global map with the reference process; nothing selected; legend; selection panel on the right | AC-001, AC-004, AC-005, AC-006, AC-007, AC-008, AC-012, AC-019 `[device]` | Default; counts on each workflow node; artifact label on a connection; a gate shown by its badge (legend); drag from a handle to connect |

## Coverage

Every map criterion of `stories.md` that a person sees is on screen 01:

- AC-001 (reference process), AC-004 (a new session starts from it): the four nodes and their connections.
- AC-005 and AC-006 (node name, scope, iteration source, counts): each node.
- AC-007 (artifact label): `plan.md` and `checklist.md` on the lines. AC-008 (gate on a connection): the legend's gate badge; the connection editor (02) shows it on a line.
- AC-012 (connect by dragging from a handle): the handles and the legend line.
- AC-019 `[device]` (layout, no overlap, drag, connect): screen 01 is the layout to check in the browser.

Not on this screen, and drawn later with the other states: AC-009 to AC-011 and AC-013 to AC-018 (screens 02, 03, 06, 07). AC-002 and AC-003 are about the data and storage rules, not about a view; they are checked by the automated tests. AC-032 is the model rule, with no screen.

## Drafts for later (not for approval yet)

`02-map-connection.svg` to `07-map-refused-link.svg` are drafts of the next screens. They are kept in the folder and will be re-checked after this layout is approved. The workflow tab (`04-tab.svg`, `05-tab-states.svg`) is part of the same rework and is also not yet for approval.

## Open points for layout review

1. **Canvas and selection panel.** The map takes the left part of the page, and the right panel holds the selected workflow or connection. Is a fixed right panel right, or should the editor float over the canvas?
2. **Legend on the canvas.** The legend sits at the bottom left of the canvas and explains lines, gates and handles. Should it be a collapsed help control instead?
3. **Node content.** Each node shows its name, scope, iteration source and counts (steps, gates, routes). Is that the right amount for a node at 200 px wide?
4. **Gate shown on the line.** A gate appears as an orange badge on the connection, under the artifact label. The reference process has no gate, so the default map shows the badge only in the legend.
5. **Width.** The layout is drawn for 1280 px. A narrower desktop width would need the panel to move below the canvas; say whether that is needed for the MVP.
6. **Words.** "Artifact handed over", "gate", "runs after" and "Selected" are the labels on this screen. Check them against the wording you want users to see.
