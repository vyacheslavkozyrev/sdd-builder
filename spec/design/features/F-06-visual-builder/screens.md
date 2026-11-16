# UX screens — Visual builder: the Map tab, flow tabs, gates and custom agents (F-06)

Feature entry: `spec/documents/features.md` → F-06. Stories: `spec/specifications/F-06-visual-builder/stories.md` (approved 2026-11-15).

Scope: the builder is step 3 of the project wizard (`spec/design/features/F-05-project-brief-form/`). The Map tab is the pipeline: one flow that contains child flows (one nesting level); a flow contains blocks only; gates and checks sit on the arrows between flows. Desktop, 1280 × 800. Wireframes in SVG; colours and wording are placeholders.

The tab row is the same on every screen: **Map** (the pipeline), one tab per flow, and **+** to add a flow after the last tab.

Panel footers: the same action sits in the same place on every panel. **Switch off** and **Delete** are the footer of a block, a flow and a custom agent (bottom of the right column). Move up and Move down are in the left column under "Selected block", disabled where the order rule applies.

## Legend

- **Box with a name, scope and block count:** a flow, on the Map tab.
- **Rounded box:** an Agent block in a flow, with its scope.
- **Diamond:** a Condition: a gate or check on an arrow between flows, or a Condition inside a flow. Under it (or inside it, in a flow), its kind and who decides (`· human` is a decision the main session asks; `agent` is an agent decision).
- **Arrow with a label under the gap:** a Connection; the artifact it hands over is the second label.
- **Circles:** Start and End. The number above a block is its order in the flow (#1 to #9).
- **Orange arc, "fail: back":** a retry to an earlier block of the same flow. **"fail: stop":** a fail that ends the process.
- **Blue outline:** the selected item. **Dashed grey:** switched off. **Red outline or red chip:** a structure mark or a refused value. **Dashed blue box:** a drop target.

## Screens

| # | File | What it shows | Criteria shown | States shown |
|---|---|---|---|---|
| 01 | `01-map-pipeline.svg` | Map tab, default pipeline: six flows in order, five gates, pipeline properties | AC-001 to AC-006, AC-041, AC-042; AC-045 on reload | Default state; nothing selected but the pipeline panel |
| 02 | `02-map-connection-gate.svg` | Map tab: a connection selected (it already has an approval), a Check dragged over it | AC-008, AC-010 (the same drop target takes an Approval), AC-011, AC-012 | Drop target shown; the gate on the arrow is named in the panel; Add approval and Add check in the panel |
| 03 | `03-map-check-panel.svg` | Map tab: a Check selected (type `checks`) | AC-011, AC-013 (the threshold help line), AC-014, AC-016 | Type `checks`, decided by agent, description, routes; review refused as a type; back route hint |
| 04 | `04-map-marks.svg` | Map tab with structure marks | AC-009, AC-022, AC-034, AC-036, AC-037 | Flow with no End, cycle, unwired gate route; marks listed; edit kept |
| 05 | `05-flow-build.svg` | Flow tab build, nothing selected | AC-017, AC-018, AC-019, AC-020, AC-023, AC-024 | Blocks #1 to #9 in order; flow toolbox; Move up and Move down disabled (no selection); flow panel with its generated file, Switch off and Delete |
| 06 | `06-flow-agent-panel.svg` | Flow tab build: implement selected | AC-019, AC-023 to AC-026, AC-028, AC-030 | Name, description, scope with iteration source, model, tools, reads and writes, rule tags, body cap, generated file; Move up disabled (Start stays first); Switch off and Delete |
| 07 | `07-flow-condition.svg` | Flow tab build: review selected | AC-015, AC-016, AC-021, AC-040 | Round limit not set, with the unbounded-retry warning and the entry rule; route choices limited to this flow |
| 08 | `08-custom-agent-refusals.svg` | Flow tab ux: custom agent with refused values | AC-018, AC-024, AC-026, AC-027 (file-safe part), AC-029, AC-030 | Three refused values; a second Start refused by the toolbox; the full agent panel (model, tools, rule tags, generated file); Switch off and Delete, no Save |
| 09 | `09-switch-off-and-delete.svg` | Flow tab build: commit selected for deletion; test switched off | AC-032, AC-033, AC-034, AC-035 | Dashed off block (test) with its properties kept; confirmation dialog over the whole screen; refused Start deletion (a separate state, drawn with the dialog) |
| 10 | `10-pipeline-arguments.svg` | Map tab: pipeline arguments | AC-042 | A repeated argument name refused, with the row and the fix |
| 11 | `11-map-check-diff-size.svg` | Map tab: a check with type diff-size selected | AC-011, AC-013 | Threshold field with a refused value (0) and its rule; the other type; the same panel as 03 |

Criteria with no screen on purpose: AC-038 (the structural rules are shared core code; no visual), AC-039 (a mark never refuses an edit; shown by 04 as a mark, not a block), AC-043 and AC-044 (host interface and no server calls; no visual), AC-031 (the generated file content; the panel shows the file path, see 05 and 06).

Criteria with no drawn refused state yet: AC-007 (a repeated flow id), AC-025 (a repeated rule tag), AC-027 (an agent name another agent already uses). See the open points.

## Decisions these screens take

1. **The Map tab is the pipeline.** Its nodes are flows, its arrows are connections, and gates and checks sit on the arrows.
2. **The Map toolbox offers Connection, Approval and Check** (decided 2026-11-15). Approval is decided by a person. A Check is `checks` (decided by an agent) or `diff-size` (a line threshold). Review is not a check type.
3. **Inside a flow, a Condition has three check types:** approval, checks and diff-size. The review of build is a `checks` Condition whose description is "the review reports no blocker or warning": review is an Agent block, and the Condition after it checks its result. This replaces the `review` gate type of `building-blocks.md` §3 and §9.
4. **Placement:** a gate is dragged onto an arrow (screen 02), and a select-then-add route in the connection's panel gives the same result. Keyboard and touch users use the buttons.
5. **Structure marks are live** (screen 04) and never refuse an edit. Values the model cannot hold are refused at entry (screens 08, 10 and 11).
6. **Switched off and delete** (screen 09): a switched-off item stays in place with its properties; a delete asks first and leaves routes to it unwired and marked.
7. **Scope is on each Agent block** (screen 06), so the build flow repeats its agents per task.
8. **Edits are applied as they are made.** A custom agent has no Save button, as no other panel has one (screens 06 and 08). A refused value is not applied until it is fixed.

## Open points for layout review

1. **Map layout.** The six flows run in one row across the canvas, with the gates in the gaps. Is one row readable at 1280 wide, or should the Map wrap?
2. **Gate labels.** The decider is above the artifact under each diamond (for example `stories.md`). Should the artifact sit on the arrow instead?
3. **Build flow layout.** Nine blocks in two rows, with the wrap arrow from #5 to #6. Is that clearer than a single column?
4. **Check on the Map with diff-size.** Screen 11 draws the Map check with the `diff-size` type and its threshold; screen 03 draws `checks`. Confirm that the Map Check offers both types, as the stories say.
5. **Required items.** Approvals between flows and the required blocks are not visually marked on this set. Confirm that the required markers of `building-blocks.md` §9 are not needed for the MVP.

## Usability review

Review by the `usability` agent, 2026-11-15. Walked: US-001 to US-009 through screens 01 to 11 (default pipeline, adding and gating, flow build, agent and condition panels, refusals, switch off and delete, arguments).

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | The connection panel said "No gate on this arrow yet", but the diagram shows an approval on that arrow (every arrow of the default pipeline has a gate). | major | 02 | The panel names the gate on the arrow (approval · human, plan.md); the header and the panel note say so. The question of two gates on one arrow is open point A. |
| 2 | The threshold of a `diff-size` check (AC-013) was not drawn anywhere; the Map check showed only `checks`. | major | 03, 11 | New screen 11: the Map check with type `diff-size`, a threshold field, a refused value (0) and its rule. Screen 03 gets the threshold help line. |
| 3 | A back route on a Map gate had no drawn help: the user picks the target and the round limit, and the panel did not say so (AC-014, AC-015). | minor | 03 | Hint line under the fail route: "back: pick an earlier flow and an optional round limit". |
| 4 | The structure mark "route to ux is unwired" said that ux was deleted, but ux is drawn; a route inside a flow cannot point to another flow (AC-021), so the stated cause could not happen. | major | 04 | The mark sits on the gate specify → ux ("fail route unwired"), and its text says the back target was deleted. The mark names the gate, not the flow's tab. AC-022 added to the criteria shown. |
| 5 | The flow panel said "the command file of the flow is shown in its panel", but no generated file was shown (AC-024). | major | 05 | The flow panel shows "Generates .claude/commands/build.md" under its title; the note under it is removed. |
| 6 | Move up and Move down were not drawn anywhere (AC-019). | major | 05, 06 | Left column, "Selected block": Move up and Move down. Disabled on 05 (no selection); on 06 Move up is disabled because Start stays first. |
| 7 | The agent panel did not show reads and writes, which building-blocks §3 lists as an Agent property (AC-023 asks for the §3 list). | major | 06 | "Reads and writes" box: reads plan.md, writes code, tests and the staged change. |
| 8 | The custom agent panel did not show model, tools, rule tags or the generated file (AC-024, AC-026). | major | 08 | Model, allowed tools, rule tags and "Generates .claude/agents/<name>.md" added. Refused values listed in one box. |
| 9 | The custom agent had a Save button; no other panel has one, and the stories have no save step for a block (edits apply as they are made). | major | 08 | Footer replaced by Switch off and Delete, the same as screen 06. "Save is off" note removed. Open point B asks whether a Save is wanted. |
| 10 | The delete dialog was for commit, but the right panel showed the switched-off test agent: the panel and the selection disagreed. | major | 09 | The right panel is commit (the selected block and the dialog's target). The switched-off test is described in a box with "Select test and press Switch on". |
| 11 | The "off" label was drawn under commit, which is on, and test had no label. | major | 09 | The "off" label moved to test. |
| 12 | The modal dimming covered the canvas only; the right panel behind the dialog was not dimmed. | minor | 09 | The dim layer covers the whole screen. |
| 13 | Switch on sat in a different place from the footer of screen 06. | minor | 09 | Footer as in screen 06: Switch off and Delete at the bottom of the right column. |
| 14 | The flow panel showed "Enabled: on" as a chip, with no Switch off or Delete, while agents had them. | minor | 05 | Footer Switch off and Delete on the flow panel; the chip is removed. |
| 15 | The `review` Condition was labelled "review · agent": the legend says a diamond shows its kind, and this one is `checks`. | minor | 05, 06, 09 | The diamond shows its name, then "checks" and "agent". |
| 16 | The round limit field said "none set" and did not say what to enter (AC-015). | minor | 07 | "none set: empty for no limit; else 1 or more". |
| 17 | Errors named the field but not the fix, and one did not name the row: the duplicate argument (10) and the body length (08). The second Start refusal did not sit on the Start. | minor | 08, 10 | 10: "Row 2: name already used. Rename it." 08: each refusal gives the fix; the Start box in the toolbox is marked red. |
| 18 | The delete dialog said "Delete agent commit?", and the refusal did not say that it is a refusal. | minor | 09 | "Delete commit?"; the refusal text starts with "Refused:". |

Totals: 0 blockers, 10 major, 8 minor. Screens changed: 02, 03, 04, 05, 06, 07, 08, 09, 10; screen 11 added.

**Open points for the user**

A. **Two gates on one arrow.** Every arrow of the default pipeline has a gate (screen 01), so a connection that gets a Check or an Approval from the panel (screen 02) already has one. Options: (1) one gate per connection; the panel's buttons then replace the gate, and the drag replaces it after a confirmation; (2) several gates on one connection, run in the order they were added; (3) a new flow is the only place to add a gate, so the panel offers no buttons on a gated connection. The stories do not decide this. Screen 02 currently shows the gate and keeps the buttons, which fits option 2 only.

B. **Save for a custom agent.** Screen 08 now uses no Save, like the other panels. Options: (1) edits apply as they are made (the current set); (2) a Save button applies the whole agent panel at once and Cancel reverts it. The stories say nothing about a save step for a block. Decide before Plan.

C. **Panels not drawn for Start, End and the connection inside a flow.** AC-023 asks each panel to list the properties of building-blocks §3 (Start: arguments for the pipeline only; End: produced artifact, outcome, description; Connection: artifact label). Options: (1) draw one panel each on a screen in the next pass; (2) accept the flow panel and the connection label as enough for the MVP, and record it in the review.

D. **Refused states not drawn.** AC-007 (a flow id that repeats or is not file-safe), AC-025 (a repeated rule tag) and AC-027 (an agent name another agent already uses) have no refused state on any screen. Options: (1) draw them on screen 08 (agent) and 10 (flow id on a new tab) in the next pass; (2) accept the criteria as covered by the tests only, and say so in the review.

E. **Diff-size on the Map.** Screen 11 draws it. Confirm that the Map Check offers both types (open point 4 of the layout review above).

## Visual review

Review by the `visual` agent, 2026-11-15. Rendered all 11 screens in headless Chrome at 1280 × 800 and checked the coordinates in the source. Checked: grid and margins, alignment, text fit in boxes, overlaps, type classes, contrast, colour roles, consistency of the top bar, stepper, card header, footer and Move controls across the set, and balance.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | The connection panel said the gate on plan → build is shown in the diagram, but the arrow had no diamond; the drop target covered the place where it should be. | major | 02 | The approval diamond and its two labels are drawn on the selected arrow, inside the dashed drop target. The panel note reads "Selected. Its gate is shown on the arrow." |
| 2 | The Map Check chip sat on the gate labels under plan → build (overlap); a leader line pointed at the label, not at the target. | minor | 02 | The chip moved below the labels (y 302) and the leader line is removed. |
| 3 | Toolbox hint text ran past the card edge (x 196). | minor | 01, 02, 05 | Re-wrapped at about 22 characters per line, inside the 148 px column. |
| 4 | The connection panel note ran to the card edge. | minor | 02 | Shortened to "Selected. Its gate is shown on the arrow." |
| 5 | The dashed cycle path (y 160) touched the canvas subtitle. | minor | 04 | The path runs at y 170 and its label at y 166; clear of the subtitle. |
| 6 | Colour role mismatch: the canvas drew the cycle and unwired marks in red, but the panel cards used amber. The legend says red for a structure mark. | minor | 04 | Both mark cards use the alert style (red) with red text, as on the canvas. See open point V1. |
| 7 | Move up and Move down were drawn as enabled, with no block selected. Screens.md says both are disabled with no selection. | major | 05 | Both buttons disabled. |
| 8 | The Move buttons were two 72 px boxes: "Move down" at 13 px touched the edges, "Move up" at 10 px did not match it. | minor | 05, 06, 07, 08, 09 | One column of full-width buttons (148 px), both at 13 px; a disabled label is grey. Hints under them re-wrapped. |
| 9 | A selected block had no Selected block section, so Move up and Move down were not drawn (the set puts them there for every selection). | major | 07, 08, 09 | Section added. 07: both enabled (review is #4). 08: Move up disabled (the agent follows Start), Move down enabled. 09: Move up enabled, Move down disabled (End follows commit). |
| 10 | The Condition panel had no footer. Switch off and Delete are the footer of every block. | major | 07 | Footer added at the same place as on 05, 06, 08 and 09. |
| 11 | Footer buttons sat 8 px above the card bottom; the side margins are 16 px. | minor | 05, 06, 07, 08, 09 | Footer moved to y 642 (16 px bottom margin). |
| 12 | The review diamond showed "review / agent" on 07; 05, 06 and 09 show "review / checks / agent". | minor | 07 | Added the "checks" line at the same positions as 05. |
| 13 | The delete dialog was off centre (x 340–740 on a 1280 screen) and its buttons sat 10 px from the right edge, against 20 px on the left. | minor | 09 | Dialog centred on the screen (x 440–840, y 320–480); buttons inset 20 px. |
| 14 | The refused-Start bar sat 18 px inside the canvas, off the 16 px content margin. | minor | 09 | Bar set to x 228–932 (16 px in from the canvas edge). |
| 15 | The card header read "Pipeline arguments"; the pipeline card is "Pipeline properties" on 01. | minor | 10 | Header is "Pipeline properties" with the Generates line, as on 01. The rows sit under an "Arguments" label. |
| 16 | The "required" chip sat 6 px from the row edge. | minor | 10 | Moved in to 12 px from the edge. |
| 17 | The warning box text in the Check panel touched the bottom edge of its box. | minor | 11 | Box height 52 → 64, as on 03. |

Totals: 0 blockers, 4 major, 13 minor (17 findings). Screens changed: 01, 02, 04, 05, 06, 07, 08, 09, 10, 11. Screens 03 needed no change.

Checked and left as drawn: the six flows fit one row at 1280 px with room to spare (layout open point 1); the top bar, tab row and card positions are identical on all 11 screens; the diagram and panel colour roles follow the legend.

**Open points for the user (visual)**

V1. **Colour of structure marks.** The legend makes a mark red, but a mark never refuses an edit (AC-039), and red is for blockers. Options: (1) keep red for every mark, as drawn now; (2) amber for marks and red only for refused values. Option 2 changes the legend and screens 04 and 08 (the Map marks and the refusal box).

V2. **Tiny text (10 px).** Gate labels, hints and the Move hints use the 10 px class. Options: (1) keep 10 px, which keeps the Map dense; (2) raise it to 11 px, which fits the gate labels (124 px apart) but needs the toolbox hints and the Map footer re-wrapped on every screen.

V3. **Toolbox position on a refused Start (08).** The refusal text under the Start item pushes Agent, Condition, Connection and End down by 58 px, so the toolbox moves when the error shows. Options: (1) keep the shift, as drawn; (2) keep the toolbox fixed and show the refusal under the list or in the canvas.

Open point A (two gates on one arrow) is the one that changes screen 02 most; its visual answer depends on the owner's choice there, and the diamond on the plan → build arrow is drawn for option 2 only.
