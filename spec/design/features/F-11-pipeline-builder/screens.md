# UX screens — Pipeline builder (UI only) (F-11)

Feature entry: `spec/documents/features.md` → F-11. Stories: `spec/specifications/F-11-pipeline-builder/stories.md` (42 criteria: 37 `[auto]`, 5 `[device]`; approved 2026-11-17).

Scope: step 3 of the wizard (Workflow). The **Pipeline** tab is the first tab and cannot be removed; one tab per flow follows, and a **+** button after the last tab adds a flow. The canvas draws flows as boxes and connections as arrows; approvals and checks sit on the arrows, one gate per arrow. The flow tab's body is a placeholder until F-12. Desktop, 1280 × 800 inside the F-08 wizard frame (stepper row, card, footer). Wireframes in SVG: layout, content and states; colours and wording are placeholders.

The frame, the stepper and the footer are the F-08 and F-07 frame, drawn unchanged. The card holds three columns: the **toolbox** (left, 170 px), the **canvas** (centre, 738 px) and the **properties panel** (right, 262 px). The canvas clips its content at its edge; a strip under the row shows the rest of a row that does not fit.

Earlier drawing: `spec/design/features/F-06-visual-builder/` (Map tab, from the first builder concept). It is not reused: it has switch-off (decision 34 removed it), a Save button, and flow-tab screens that now belong to F-12.

## Layout grid

- **Header** 0–56, as F-07 (wordmark at x 24; New project at x 1120–1256).
- **Stepper row** y 80–140, as F-08. Step 3 is current.
- **Card** x 24–1256, y 152–736. Inside:
  - **Tab row** y 168–198, from x 40 to x 1240, with a line under it at y 206. The Pipeline tab is first; the + button follows the last tab.
  - **Toolbox** x 40–210, y 216–716.
  - **Canvas** x 226–964, y 216–716. Boxes are 100 × 76 px on a 160 px pitch; the gap after each box (60 px) holds the arrow and its gate. The artifact label sits above the gate; the gate's decider sits under the row.
  - **Properties panel** x 978–1240, y 216–716. Its footer, when there is one, is at y 680–708 (Delete), the same on every screen that has one.
- **Footer** 752–800, as F-07.

## Legend

- **Box with a name and a block count:** a flow, on the canvas. **Blue outline:** the selected flow. **Red outline:** a flow with a blocker mark.
- **Arrow with its artifact label above it:** a connection. **Blue arrow:** the selected connection.
- **Diamond:** a gate on an arrow (orange = not selected). Under the row: the gate's kind and its decider (`approval · human`, `checks · agent`).
- **Dashed arc, "closes a loop":** a connection that closes a loop among flows (a blocker).
- **Dashed blue box:** a drop target. **Dashed blue line:** a drag in progress.
- **Red box, "Blocker":** a structure mark with severity blocker. **Amber box, "Warning":** severity warning. Marks sit beside the item they name, or in **Not on a drawn item** when the item is not drawn on this tab.
- **Red text under a field:** a refused value, with its reason. The previous value is kept (the field shows the value that was refused).
- **Dimmed screen with a centred dialog:** a confirmation.

## Screens

| # | File | What it shows | Criteria shown | States shown |
|---|---|---|---|---|
| 01 | `01-pipeline-default.svg` | The Pipeline tab with the default pipeline: six flows in order and five gates on the arrows; the toolbox (Connection, Approval, Check); the Pipeline properties (name, description, arguments, model, tools, rule tags, body); the note that the pipeline cannot be removed; New project in the header | AC-001, AC-002, AC-004, AC-006 (device), AC-007, AC-008, AC-009, AC-011 (device, the canvas and the strip), AC-023, AC-024 (device), AC-025, AC-026, AC-041, AC-042 (New project is the restart control) | Default state after the wizard opens; the row runs past the canvas edge, so the strip shows the rest |
| 02 | `02-arrow-with-gate.svg` | The arrow build → verify selected, with its check gate: artifact label, source and target pickers, the gate's kind and description, a note that a failed check stops the process (no true or false output on this tab), Add approval and Add check refused, Remove gate, Delete connection | AC-008, AC-013, AC-015, AC-016, AC-019, AC-020, AC-021, AC-030 | A gate is present; a second gate is refused with its reason; Delete asks first |
| 03 | `03-add-gate-on-arrow.svg` | The arrow verify → complete with no gate (after Remove gate): a Check dragged from the toolbox onto it (dashed drop target); the gate form with Approval or Check, a description that is refused, the type `diff size`, and a threshold of 0 that is refused; the approval's description rule | AC-013, AC-017, AC-018, AC-022 (device) | Drop target shown; description refused; threshold refused |
| 04 | `04-flow-panel-connect.svg` | The flow plan selected: its name refused because build exists (the name stays plan), its description, arguments, model and body; the generated file; Connect to next flow with its picker of the other flows; the artifact label refused; the footer with Delete only (no switch-off) | AC-013, AC-014, AC-025, AC-026, AC-027, AC-029, AC-031, AC-034 | A name clash refused; the picker open; the label required; Delete only |
| 05 | `05-delete-flow-confirm.svg` | Delete flow plan: the confirmation names its two connections and their gates, and says what stays; Cancel and Delete flow. The whole screen is dimmed behind it, header and footer included | AC-031, AC-032 | Confirmation open |
| 06 | `06-structure-marks.svg` | Structure marks: a blocker beside plan (no End block); a loop arc from build back to plan with its blocker; the "Not on a drawn item" section with a block finding and a pipeline warning; the note that marks never block an edit and that brief problems are not shown here | AC-035, AC-036, AC-037, AC-038 | Blockers and a warning; marks listed; nothing selected |
| 07 | `07-add-flow.svg` | After +: flow-2 added, selected, empty and not connected to complete; its blocker mark (no Start and no End); its panel with the name, the generated file and Delete; the canvas scrolled to the end of the row | AC-003, AC-004, AC-026, AC-031 | A new empty flow; not connected; a blocker |
| 08 | `08-flow-tab-placeholder.svg` | The verify tab opened: its name and block count, and the placeholder that its blocks are built in F-12 | AC-001 (the tab order), AC-005 | Flow tab body is the placeholder |
| 09 | `09-properties-refused.svg` | Pipeline properties with two refused values: a repeated argument name (the row says which row uses it), and a body of 1,001 characters that is refused; the saved body stays in the field | AC-025, AC-027, AC-028 | Two refused values; the saved values are kept, the reason shows beneath each field |
| 10 | `10-repoint-arrow.svg` | The arrow ux → plan selected; its target end dragged onto build (dashed drop target and a dashed drag line); the panel keeps the label and the gate | AC-012 (device), AC-015 | Drag in progress |
| 11 | `11-no-flows.svg` | Every flow deleted: the tab row shows Pipeline and +; the canvas says there are no flows; "Not on a drawn item" lists the blocker "the pipeline has no flow"; the note that no edit is blocked | AC-033, AC-036, AC-037 | Empty canvas; the blocker; no edit blocked |

Criteria with no screen on purpose (proved by tests, not visual):

- AC-010: the saved config has no position key; the layout itself is shown on screen 01.
- AC-039: the marks equal `analyzeStructure` for the same config.
- AC-040: no network call and no storage.

## Decisions these screens take

1. **The Pipeline tab is the first tab and cannot be removed; + is the only control that adds a flow** (AC-001, AC-002, AC-004). Screen 01 has no remove control on the tab; screen 07 shows the + at the end of the row.
2. **The toolbox offers Connection, Approval and Check and nothing else** (`ui.md` §3.2). Start and End are not on this tab (screen 01).
3. **Boxes are placed automatically in pipeline order, left to right; positions are not saved** (owner decision, 2026-11-17). The row is wider than the canvas at 1280 px, so the canvas pans with a strip (open point 1).
4. **A flow's own properties are edited from its box**, with a footer that has Delete and no switch-off (owner decision; decision 34 for the switch-off).
5. **+ adds an empty flow** that has no blocks and no connection; the marks show what it still needs (owner decision; screen 07).
6. **Delete asks first and names what goes with it** (`ui.md` §3.4, §5; screens 02 and 05). A Remove gate needs no confirmation, because the arrow stays.
7. **One gate per arrow.** The second gate is refused after the click and the buttons stay enabled (screen 02; open point 5).
8. **A check on an arrow has no true or false output on this tab**; a failed check stops the process (`architecture.md` §9; screen 02).
9. **A connection's artifact label is required**, as on the flow tab (`ui.md` §4; screens 03 and 04).
10. **Marks are colour and text together:** red for a blocker, amber for a warning, next to the item they name; a blocker never blocks an edit (screen 06).
11. **A refused value keeps the previous value and gives the reason next to the field** (screens 02, 03, 04, 09).
12. **Flow ids are file-safe** (decision 18): the new flow is `flow-2`, not `Flow 2`. The stories were corrected to say so (AC-003 and AC-029).

## Open points for layout review

1. **Row width.** The six default flows need about 900 px in one row (100 px boxes and 60 px gaps), and the canvas is 738 px wide at 1280. The canvas pans with a strip, and screen 01 shows the cut. A wrap would break AC-009 (left to right), so it is not drawn. Is panning acceptable, or should the boxes be narrower?
2. **Gate labels.** The artifact sits above the gate and the decider under the row (as F-06). Should the artifact move under the row too?
3. **Refused second gate.** The buttons stay enabled and the refusal shows after the click (screen 02). Should they be disabled with the reason beside them, as F-08 does for Next on step 4?
4. **Remove gate without a confirmation** (screen 02), while Delete connection asks first (screens 02 and 05). Is that the right split?
5. **Flow id in the name field.** The new flow shows `flow-2` as its name, because the id is file-safe (decision 18). Should the name be free text with a separate id?
6. **Connect to next flow picker** floats over the canvas (screen 04). Should it open in place under the button instead?

## Usability review

Reviewed 2026-11-17 against `stories.md` (42 criteria) and the owner decisions above. 10 findings: 4 major, 6 minor. Every criterion from `stories.md` still appears in this file.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | Required fields are not marked: artifact label, flow name, gate description and threshold (`diff size`) | major | 02, 03, 04, 07 | Added `· required` to those labels; the empty artifact label on 04 shows the help text "what is handed over" |
| 2 | A refused body says "The text stays as it was" while the field shows the 1,001-character text | major | 09 | Reworded to "The last saved body stays." |
| 3 | The connection panel in its add-gate state has no Delete connection, so the destructive action is missing in that state and sits elsewhere than on screen 02 | major | 03 | Added the Delete connection footer at the same place as on 02; Add check moved up to make room; the approval note cut to one line |
| 4 | Connection has no instruction in the toolbox, so the only described way to make one is hidden in the flow panel | major | 01, 02, 03, 04, 05, 06, 07, 09, 10, 11 | Added the toolbox hint "Connection: select a flow, then Connect to next flow in its panel." (screen 08 has no toolbox) |
| 5 | The Check tool is drawn with the selected-item outline (blue = selected, per the legend) | minor | 03 | Drawn as a plain tool box |
| 6 | A flow body has no character counter, though AC-028 applies to flow bodies | minor | 04, 07 | Added the counter (35 and 0 of 1,000 characters) |
| 7 | "Nothing selected" shows only the pipeline's Name, not the rest of its panel (AC-025) | minor | 06 | Panel now shows the full pipeline fields, as on 01; the generated file is shown |
| 8 | Internal feature ID "(F-12)" in user-facing mark text | minor | 06, 07 | Now "Add one in the flow tab." and "Add both in the flow tab." |
| 9 | The repoint drag line starts at the top of plan, not at the arrow end being dragged | minor | 10 | The line starts at the target end of ux → plan |
| 10 | "+ above the tab row": the + sits in the tab row | minor | 11 | Now "Add one with + in the tab row." |

Checked and left as drawn: every control with its state (no disabled control is drawn without a hint); one primary action per step; Delete flow and Delete connection in the footer of their panels; no switch-off, Start or End on this tab; the confirmation names every connection and gate.

**Open points for the user**

1. **Placeholder names F-12 (screen 08).** AC-005 asks that the placeholder say its blocks are built in F-12, so the text is kept, and the user sees a feature ID. Options: (a) keep as the criterion is written; (b) change AC-005 to a plain line such as "Blocks are added in a later step" (story change, then the screen text follows).
2. **How a Connection is made by drag.** AC-013 and AC-014 say "by drag" but no gesture is defined, so the toolbox hint names only the button path. Options: (a) drag the Connection tool onto a flow box, then choose the target; (b) drag only an arrow end (repoint) and use the button for new connections; (c) button only in the MVP. Not drawn until chosen.
3. **Refused value in the field.** AC-027 says the previous value is kept, while screens 04 and 09 show the refused text in the field with the reason beside it. Options: (a) keep the refused text visible with the reason (as drawn; the saved value does not change); (b) revert the field to the saved value on refusal and show the reason beside it.
4. **Open points 1 to 6 above** are unchanged and still need a decision. Point 3 (second gate buttons stay enabled) is the one most affected by finding 1 and by AC-019.

## Visual review

Reviewed 2026-11-17 by the `visual` agent: layout, alignment, text fit, overlaps, type scale, contrast, colour roles and consistency across the 11 screens. Each SVG was rendered in headless Chrome before and after the changes (1280 × 800) and the text widths were checked against the estimates in the review rules. The frame, stepper, header, footer and divider are identical on every screen. 11 findings: 5 major, 6 minor. No criterion, story or screen content changed.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | Toolbox hint lines are wider than their 158 px text box (e.g. "Connection: select a flow,") | minor | 01–07, 09–11 | Rewrapped into the same five-line, three-group layout; the words are unchanged |
| 2 | Model and Tools fields are 24 px high; the other fields are 26 px | minor | 01, 04, 06, 07 | Set to 26 px |
| 3 | "Nothing selected": the subtitle and the Generates line run into the Name label | major | 06 | Panel fields from Name down moved 16 px; the Generates line moved to y 278 |
| 4 | Footer Delete sits at y 652 on 02 and 03 but at y 680 on 04 and 07 | major | 02, 03 | Delete connection moved to y 680 (28 px high), as on 04 and 07; its "Asks for confirmation" note moved above it (y 666); the grid line in this file updated to y 680–708 |
| 5 | The drop target on the arrow crosses the "criteria" label | major | 03 | Drop target cut to y 328–350, around the arrow only |
| 6 | The drop target on build hides the name of the flow it covers | major | 10 | Added "build" and "9 blocks" inside the drop target, at the box text positions |
| 7 | Mark text wider than its box: "Blocker · build back to plan is a loop" and "Blocker · flow-2 has no Start and no End" | major | 06, 07 | Mark boxes widened from 250 to 300 px |
| 8 | The strip thumb on the scrolled-to-end canvas runs past the track end (962 against 942) | minor | 07 | Thumb moved to end at the track end |
| 9 | The empty-canvas heading is centred 13 px left of the canvas centre | minor | 11 | Heading and its line moved to the canvas centre (x 595) |
| 10 | Empty line between "and their gates:" and the list in the dialog | minor | 05 | List and last line moved up 24 px |
| 11 | The artifact label on 04 touches the Connect to next flow button (no gap; about 20 px elsewhere) | minor | 04 | Artifact label group moved down 10 px |

Checked and left as drawn: the header, stepper, card, tab row, footer and divider on every screen; button and field styles; the canvas clip and the strip on 01, 02, 03, 04, 09 and 10; the red, amber, blue and orange roles in the legend; contrast of body and label text. Screen 08 has no toolbox or panel by design.

**Open points for the user**

1. **Text size 10 px.** The `tiny` class (10 px) is used for gate labels and deciders, hints, counters and the path line of each mark. It is not one of the set's classes; the smallest class in the set is `small` (11 px). Options: (a) move these to 11 px and widen the 60 px gap between boxes (the label `screens.md` needs about 66 px at 11 px), which changes the grid; (b) add a 10 px caption class to the set in this file and keep the current sizes. Not changed.
2. **Mark placement on screens 06 and 07.** The marks sit in the gaps below the row, not against the box they name (the text names the item). Options: (a) keep as drawn; (b) put each mark directly under its box, which moves the gate deciders in the same place. Not changed.
3. **Usability open points 1 to 6 still stand**, and the visual review adds none to them.

## Owner decisions, 2026-11-17

- **New connections by drag.** Drag the Connection tool from the toolbox onto the source flow, then onto the target flow; the artifact label is asked before the connection is added (screen 10 notes it; AC-012). The button path is Connect to next flow in the flow panel (screen 04; AC-014). Repointing an existing arrow end is by drag or by the arrow's panel (screen 10; AC-015).
- **Refused values revert to the saved value** (AC-027). The field shows the saved value, and the reason is shown beneath it. Screens 03, 04 and 09 were redrawn that way: the threshold reads "not set", the flow name stays `plan`, and the body keeps its 96 characters.
- **Argument rows (T013a).** Screen 09 now draws the row controls: Edit and Remove on each saved row, `+ Add` on the Arguments line, and Add and Cancel on an unsaved row. A refused edit keeps the saved row (its reason shows beneath it). The body limit reads `1000`, as in AC-028.
