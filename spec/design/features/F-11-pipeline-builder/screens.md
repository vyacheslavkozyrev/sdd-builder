# UX screens — Pipeline builder (UI only) (F-11)

Feature entry: `spec/documents/features.md` → F-11. Stories: `spec/specifications/F-11-pipeline-builder/stories.md` (42 criteria, the amendment of 2026-11-17 (AC-043 to AC-048) and the decisions of 2026-11-18). Redrawn on 2026-11-18 after the decisions: **a connection only points one flow to another; the outcome artifacts, the checks and the Human approval checkbox belong to the source flow and are edited in the flow's panel.**

Scope: step 3 of the wizard (Workflow). The **Pipeline** tab is the first tab and cannot be removed; one tab per flow follows, and a **+** button after the last tab adds a flow. The canvas draws flows as boxes and connections as arrows. Arrows carry no label and no mark. Selecting a flow opens its flow panel (name, description, arguments, model, body, the next flow, then Artifacts, Checks and Human approval). Selecting an arrow opens the connection panel, which shows only its source and target. The flow tab's body is a placeholder until F-12. Desktop, 1280 × 800 in the frame approved on screen 01 (left panel with the stepper; content area with the tabs, the cards and the footer note). Wireframes in SVG: layout, content and states; colours and wording are placeholders.

Restyled on 2026-11-18 to the Material Kit look (see **Visual style** below). The restyle changes colours, type, radii and the template text area only; the layout, the functions and the other content are as before.

The frame is the one of screen 01 (see **Layout grid** and **Frame change**). On the Pipeline tab the toolbox is gone: the canvas takes its space (x 284–964), and the properties card sits beside it (x 984–1256).

Earlier drawings: `spec/design/features/F-06-visual-builder/` (Map tab, from the first builder concept). It is not reused. The set before the 2026-11-18 redraw is in git history (this folder at commit `6413fa3`).

## Layout grid

Frame of 2026-11-18 (the frame change, below): the approved frame of screen 01. The header bar is gone.

- **Left panel** x 0–260, full height, white, divider at x 259: wordmark at x 24, y 24–48; **New project** x 24–236, y 72–112; the vertical stepper at x 40 (y 164 to 360; step 3 current); **Prev** x 24–124 and **Next** x 136–236 at y 728–768.
- **Content area** x 260–1280, full height, background nevada 100 `#f0f4f8`. Everything below sits inside it.
- **Tab row** y 24–56, from x 284. The Pipeline tab is first; the **+** button follows the last tab (x 841.6 after the default six flows; x 915.6 after flow-2 on screen 07).
- **Canvas card** x 284–964, y 80–732. Flows in a row at y 380–456; the hint line at y 112 and 130.
- **Properties card** x 984–1256, y 80–732. The title is at y 112 and the subtitle at y 130. The content between y 146 and 676 **scrolls** (a thumb on its right edge, x 1248); the footer buttons stay at y 684–712.
- **Footer note** inside the content area, baseline y 781: "The work is not saved. It is lost when the browser is refreshed." at x 284; the caption "F-11 · screen N · step 3 of 4 · 1280 × 800" right-aligned at x 1256.
- **Dialogs** are centred on the content area (centre x 770, y 400).

## Frame change (2026-11-18)

The owner approved the frame of screen 01. Screens 02 to 14 were moved to it: the header bar and the stepper row above the card are gone; the stepper is in the left panel; Prev and Next are at the foot of the left panel; the footer is no longer a bar (its note and caption sit inside the grey content area). The canvas and the properties panel are re-laid into the two cards of screen 01 (canvas x 284–964, properties x 984–1256), so the flows sit in a row of six boxes at 80 px with 30 px arrows. The panel content and its text, states and functions are unchanged; the properties panel is 20 px wider than before and its scroll region is taller. Screen 08 keeps its own placeholder text, centred in one card that spans the content area (x 284–1256), since the flow tab has no properties panel.

Checked in the SVG source (coordinates, the clip windows and the footer positions) in the usability pass of the frame change, see the section **Usability review (2026-11-18, frame change)**; no PNG was rendered for it. Screen 01 is the reference and was not changed by this pass.

## Visual style (restyle of 2026-11-18)

Look adapted from **Material Kit React** by Devias IO (MIT licence, github.com/devias-io/material-kit-react). No code is copied; the look is taken from its layout and its theme.

Palette, from the repo's `src/styles/theme/colors.ts` and `color-schemes.ts` (light scheme):

- **Primary** neonBlue 500 `#635bff` (hover 600 `#4e36f5`, tint 50 `#ecf0ff`). Primary buttons, the selected tab, the selected flow and the selected connection, the Next button.
- **Page** (the content area) nevada 100 `#f0f4f8`; the left panel is white. **Cards and panels** white, border nevada 200 `#dde7ee`, corner radius 12 px. **Controls** (buttons, fields, tabs, chips, flow boxes) corner radius 8 px.
- **Text:** nevada 700 `#32383e` for primary text, nevada 500 `#636b74` for secondary text and small text (second pass, below).
- **Secondary buttons** white with a nevada 300 `#cdd7e1` border. **Danger** redOrange 500 `#f04438`; refused text redOrange 600 `#de3024`, tint 50 `#fef3f2`.
- **Success** kepple 500 `#15b79f` (the done steps' circles and bars; second pass), kepple 600 `#0e9382` for the done steps' labels (text contrast), tint 50 `#f0fdfa`. **Warning** california 500 `#fb9c0c`, text 600 `#de7101`, tint 50 `#fffaea`.
- **Font:** Inter (repo's `typography.ts`), weights 400 and 500 only; headings 500. The SVGs name Inter in their font stack and load it from Google Fonts when online; otherwise the system font is used.

The frame (left panel, content area, footer note and caption) is the same on every screen, as on screen 01. Only the palette and the radii changed in the restyle; the frame changed in the frame change of 2026-11-18.

### Second pass (2026-11-18, the restyle made visible)

The first pass was too subtle to read, so the second pass changes these, in all 14 screens and the shared frame. Positions, sizes, text and weights are unchanged, so no text was moved or resized.

1. **Page** nevada 100 `#f0f4f8` behind white cards (header, card, footer); unchanged in value, now the reference for the others.
2. **Card shadow:** the card (x 24–1256, y 152–736) uses a filter `feDropShadow` with dy 1, blur (stdDeviation) 1.5, flood `#32383e` at opacity 0.16. This is the 0 1 3 soft shadow of the Material Kit card style; the old shadow (dy 6, blur 10, opacity 0.08) was removed. The shadow is faint on purpose; raise the opacity if it still does not read.
3. **Primary buttons** (New project, Add check, Add artifact, Save, Add argument, Next): filled `#635bff`, white text weight 500, radius 8. Unchanged in value; the selected tab and the Next circle use the same fill.
4. **Secondary buttons** (Cancel, + Add artifact, + Add check, Connect to next flow, and the + tab button): white with a `#cdd7e1` border and `#32383e` text (was `#636b74` / the accent for the + sign).
5. **Tabs:** the selected tab filled `#635bff` with white text; unselected tabs **white** (was `#f0f4f8`) with a `#dde7ee` border, text `#32383e` (was `#555e68`).
6. **Card top accent bar:** flat `#635bff` (the bar was already flat; no gradient is used anywhere in the set).
7. **Stepper:** done steps' circles and bars `#15b79f`; the current step `#635bff` (its label too, was `#4e36f5`); to-do steps' circles and bars `#cdd7e1` (the bar was `#dde7ee`).
8. **Text:** primary `#32383e`; secondary and small text `#636b74` (small was `#555e68`); headings weight 500. Every SVG's font stack starts with Inter, then `system-ui, -apple-system, "Segoe UI", sans-serif`.
9. **Accent text and links** (Edit, Remove, the Cancel links, the + on the tab row's button is the one exception: it is secondary, see 4) use `#635bff` (was `#4e36f5`; the hover shade is no longer used in the drawings).

Text that no longer fits: none. No size, position or weight changed, so the text in every box is laid out as before. The done-step labels stay `#0e9382` (not `#15b79f`) because 12 px text in the lighter green is below readable contrast on white.

## Legend

- **Box with a name and a block count:** a flow, on the canvas. **Blue outline:** the selected flow. **Red outline:** a flow with a blocker mark.
- **Arrow with no label:** a connection. **Blue arrow with two dots at its ends:** the selected connection; the dots are the handles to drag an end onto another flow. Arrows carry no text and no mark.
- **Dashed red arc:** a loop among flows that reaches the file (structure mark, the safety net of architecture §12).
- **Small circles on a box's left and right edge:** the connection points. **Dashed blue line:** a drag in progress from one connection point to another. **Dashed blue box:** a drop target; **dashed red box:** a drop refused.
- **Connection panel:** the source and the target, as read-only grey boxes ("Source · read only", "Target · read only"). Nothing to edit.
- **Next flow line:** "Next flow: X" in bold, with "To change it, drag the arrow's end." It replaces **Connect to next flow** on a flow that already has an outgoing arrow.
- **Connect to next flow:** a button on a flow with no outgoing arrow, with the line "Choose the flow to connect to."
- **Artifact row:** bold label, first line of the template in grey, and **Edit** and **Remove** links on the name line.
- **Template text area:** a box several lines tall (screens 12, 13), with the help text beneath it: "The template is the starting structure of this artifact: the headings or fields its file must have. The agent fills them in. May be empty." The label field stays a one-line field.
- **Check row:** bold description, a type chip (`checks` or `diff size`) and the threshold, with a **Remove** link on its own row.
- **Checkbox "Human approval":** ticked, the process stops for a person; unticked, it does not. It belongs to the flow.
- **Red text under a field:** a refused value, with its reason. An edit keeps the saved value in the field; an add form shows what was typed (blank when empty).
- **Scroll thumb** on the panel's right edge: the panel holds more than its height; the footer does not scroll.
- **Dimmed screen with a centred dialog:** a confirmation.
- **Red box, "Blocker":** a structure mark with severity blocker. **Amber box, "Warning":** severity warning. Marks sit beside the item they name, or in **Not on a drawn item** when the item is not drawn on this tab.

## Screens

| # | File | What it shows | Criteria shown | States shown |
|---|---|---|---|---|
| 01 | `01-pipeline-default.svg` | The Pipeline tab with the default pipeline: six flows in order, five arrows with no label; no toolbox, the canvas takes its space; the Pipeline properties; New project in the left panel | AC-001, AC-002, AC-004, AC-006 (device), AC-007, AC-008, AC-009, AC-011 (device), AC-024 (device; toolbox part superseded), AC-041, AC-042, AC-047, AC-048 (arrows with no label) | Default state after the wizard opens |
| 02 | `02-connection-selected.svg` | A connection (build → verify) selected: the panel shows **only** Source and Target as read-only text, with the hint that its artifacts, checks and Human approval are in the source flow's panel; the arrow's two ends carry handles (drag to repoint); footer Delete connection | AC-016 (asks first), AC-025 (connection panel), AC-015 (ends shown; repoint by drag, open point 3), AC-048 (arrow with no label; the panel has no artifact, check or approval field) | Connection selected; read-only |
| 03 | `03-flow-properties.svg` | Flow build, scrolled to Checks: the saved check row (its own Remove), then the New check form: Description required and refused blank; Type `diff size`; Threshold not set, refused; the reason under each field; no true or false output; Cancel and Add check in the footer | AC-046 (refusals and the reason beside each; not added; each row removed on its own), AC-018 (the table; `diff size` threshold), AC-020 (no output choice) | Two refused fields; nothing added; the saved check stays in view |
| 04 | `04-delete-flow-confirm.svg` | Delete flow plan: the confirmation says the flow's artifacts, checks and Human approval flag go with it, and that the arrows ux → plan and plan → build are removed; ux and build keep their own; Cancel and Delete flow. The whole screen is dimmed behind it, left panel and footer included | AC-031, AC-032 | Confirmation open |
| 05 | `05-add-flow.svg` | After +: flow-2 added, selected, empty and not connected; its blocker (no Start and no End); its panel with the name, the generated file, Connect to next flow (offered: flow-2 has no outgoing arrow) with the picker of the other flows open (its Cancel closes it), and Delete flow; the canvas scrolled to the end of the row | AC-003, AC-004, AC-014 (picker of the other flows), AC-026, AC-031 | New empty flow; picker open; blocker |
| 06 | `06-flow-tab-placeholder.svg` | The verify tab opened: its name and block count, and the placeholder that its blocks are built in F-12. The placeholder text is unchanged from the approved set; the card spans the content area (x 284–1256), as the tab has no properties panel | AC-001 (the tab order), AC-005 | Flow tab body is the placeholder |
| 07 | `07-properties-refused.svg` | Pipeline properties with two refused values: a repeated argument name (the reason names row 1), with Edit and Remove on the saved row; Add argument and Cancel in the footer; a body of 1,001 characters refused; the field shows the saved body (96 characters), and its counter sits on the Body line | AC-025, AC-027, AC-028 | Two refused values; the saved values are kept, the reason shows beneath each field |
| 10 | `10-connection-point-drag.svg` | Connection points on each flow's edges. A drag from complete's right connection point to specify's left one (dashed blue line). The drop target on specify is dashed red, labelled "Refused: would close a loop", and a red mark at the foot of the canvas gives the reason; nothing is added | AC-012 (connection-point drag between flows; the Connection tool is removed); the loop refusal of the 2026-11-18 decision (no AC yet, open point 4) | Drag refused; nothing added |
| 09 | `09-no-flows.svg` | Every flow deleted: the tab row shows Pipeline and +; the canvas says there are no flows; Not on a drawn item lists the blocker "the pipeline has no flow"; the note that no edit is blocked | AC-033, AC-036, AC-037 | Empty canvas; the blocker; no edit blocked |
| 10 | `10-artifact-edit-refused.svg` | Flow build, Artifacts: the edit form of stories.md; the label is cleared and refused; the field keeps the saved label, the reason is shown beneath; the template is a multi-line text area with its help text; Remove is the link in the form's header, beside its title; Cancel and Save in the footer; architecture.md saved below | AC-044 (refused edit keeps the saved values; reason beneath), AC-043 (required label) | Edit form; refused edit; Template text area with the help text beneath it; Remove on the item's own form |

Criteria with no screen on purpose (proved by tests, not visual):

- AC-010: the saved config has no position key; the layout itself is shown on screen 01.
- AC-039: the marks equal `analyzeStructure` for the same config.
- AC-040: no network call and no storage.
- AC-030: one selected item at a time; each panel screen (02, 04, 07, 14, 03, 12, 13) shows one selected item, and the test proves the rest.

Superseded criteria (not drawn, not tested): AC-013 (the connection's label: replaced by AC-043), AC-017 (approval with a description: replaced by AC-045), AC-018 and AC-019 and AC-021 (one gate per arrow, gate removal: replaced by AC-046), AC-022 (drop of a gate or a Connection onto the canvas: no toolbox), AC-023 (the toolbox contents: replaced by AC-047), the label parts of AC-014 to AC-016, and the toolbox parts of AC-012 and AC-024. AC-020 still applies (no true or false output; screens 03 and 14).

Owner decision 2026-11-18 (flow-owned): AC-043 to AC-046 and AC-048 name "the connection's properties". They are drawn on the **flow's** panel (screens 03, 12, 13, 14), as the decision says; the stories' wording of these criteria is for the owner to update (open point 1).

## Decisions these screens take

1. **The Pipeline tab has no toolbox; the canvas takes its space** (AC-047; screen 01). Start and End are not on this tab.
2. **Arrows show no label and no mark** (AC-048; screens 01, 02, 14). The arrow carries nothing.
3. **A connection's panel shows only its source and target, read-only** (screen 02). It has no artifact, check or approval field. The ends are repointed by dragging them (AC-015 as amended).
4. **A flow's panel holds the outcome artifacts, the checks and the Human approval checkbox** (screens 03, 12, 13, 14). The flow panel scrolls: its fields first, then Artifacts, Checks and Human approval (open point 2).
5. **Add check, Add artifact and Save sit in the footer at y 680**, the same place as Delete on the other panels. Each add or edit form lists the saved rows of its list above it.
6. **Refused values:** in an edit, the field keeps the saved value and the reason sits beneath it (screen 13; AC-044 and AC-027); in an add form, the field shows what was typed, or stays blank, with the reason beneath (screens 03, 12).
7. **Linear flow.** A flow with an outgoing arrow shows the Next flow line, not Connect to next flow (screen 04). Only a flow with no outgoing arrow (screen 07: flow-2) offers the button and its picker. The picker lists every other flow, flow-2 excepted.
8. **No loops.** A drag (screen 10) or a Connect choice that would close a loop is refused with its reason, and nothing is added. The structure mark of screen 06 remains for a loop that reaches the file.
9. **Repoint by drag only** (screens 02, 10): an end is moved by dragging it onto another flow; the panel has no picker.
10. **Checks have no true or false output** (AC-020): the check form and its rows have no output field (screens 03, 14).
11. **Marks are colour and text together** (red blocker, amber warning), next to the item they name; a blocker never blocks an edit (screen 06).
12. **Delete asks first and names what goes with it** (screens 02, 05). Delete on a flow and on a connection both ask. A flow's artifacts, checks and approval go with it; the other flows keep theirs.
13. **Flow ids are file-safe** (decision 18): the new flow is `flow-2` (screen 07).
14. **A new flow or connection carries no artifacts and no checks, and Human approval is off.** The empty list has no empty-state line (decision of 2026-11-18); a flow with no checks shows "No checks yet." (screen 14).
15. **The artifact template is a multi-line text area** (owner decision, 2026-11-18 restyle), with the owner's help text beneath it (screens 12, 13). The label stays a one-line field.

## Open points for layout review

1. **Stories wording (decision 2026-11-18, flow-owned).** AC-043 to AC-046 and AC-048 still say "the connection's properties" and "connection". The screens draw them on the flow's panel. The owner updates the criteria text in `stories.md`; no screen changes.
2. **The flow panel scrolls (screens 03, 04, 12, 13, 14).** The flow's fields and its outcome sections do not fit one 464 px panel. Options: (a) keep the scroll, as drawn, with the footer fixed; (b) collapse the flow fields into one section; (c) a separate screen for the outcome part. Needs an owner choice before the plan.
3. **Repoint cue.** The two handles at the ends of the selected arrow are the only cue that an end can be dragged (AC-015 as reworded). Options: (a) keep the handles only; (b) add a line, such as "Drag an end onto another flow to move it." Confirm the drag is the only repoint path.
4. **Loop refusal has no acceptance criterion.** The decision of 2026-11-18 refuses a loop with its reason and adds nothing (screen 10), but AC-035 still says a loop is drawn and shown as a blocker after the drop. Needs an AC for the refusal and a decision on AC-035 (superseded, or kept for the structure mark of screen 06 only).
5. **Human approval on the flow (owner assumption, confirmed on screen 14).** The checkbox sits with the flow's checks and artifacts, and it is read as "the process stops for a person" at the end of that flow. Owner to confirm that the stop is at the end of the flow, not before it.
6. **Deleting a flow (screen 05).** The dialog says the flow's own artifacts, checks and approval go with it and its two arrows are removed, and the neighbouring flows keep theirs. Owner to confirm.
7. **Arrows show no sign of approval or checks.** AC-048 says arrows show no label, and no mark is drawn either, so a person sees a flow's approval or checks only by selecting the flow. Options: (a) keep; (b) a small non-text icon on the source flow's arrow (an icon to choose). Not drawn until decided.
8. **Text size 10 px** (visual review, carried): the `tiny` class carries the chips, hints and mark paths. Not changed.
9. **Screen 08 wording** (AC-005 names F-12 in the placeholder): carried from the earlier set; owner decision on the wording.
10. **Screens not approved yet (style only).** The owner has not approved the restyled screens of 2026-11-18. The restyle changes the look (see **Visual style**) and the template text area; the layout and the functions are as before. Approval is needed before `/plan F-11`.

## Amendment: core model change needed (open point, decision needed before the plan and before code)

The 2026-11-18 decision moves the outcome data to the flow. The stored model changes: **a flow holds `artifacts` (each with a one-line `label` and a `template`), `checks` and `approval`; a connection holds only its target.** This supersedes, for the connection, the label and the gate of `architecture.md` §6 decision 33 and the one-gate rule of the structural analyzer, and it changes the core parser, the structural analyzer (the gate findings) and the generator. None of this is decided in the code. An architecture decision (`architecture.md` §5) is needed before code and before `/plan F-11`, because the plan's tasks depend on the new shape. The screens show the new shape only; they do not settle the schema.

## Owner decisions, 2026-11-17 and 2026-11-18

- **New connections by drag.** The drag between flows is from one flow's connection point to another's (screen 10). The button path is Connect to next flow in the source flow's panel, offered only when the flow has no outgoing arrow (screens 04, 07; AC-014).
- **Refused values revert to the saved value** (AC-027). The field shows the saved value and the reason is beneath it (screens 09, 13). An add form shows what was typed (screens 03, 12).
- **Argument rows (T013a).** Screen 09 draws the row controls: Edit and Remove on each saved row, `+ Add argument` on the Arguments line, and Add and Cancel on an unsaved row. A refused edit keeps the saved row (its reason shows beneath it). The body limit reads `1000`, as in AC-028.
- **Flow name and id, the Connect button and the delete confirmation** as in the approved set: the name is not the id (AC-029), Delete flow asks first and names what goes with it (AC-031).
- **2026-11-18:** arrows show no label; artifacts, checks and Human approval belong to the flow; linear flow (no second outgoing arrow); no loops (refused with reason); repoint by drag only; a new artifact list is empty with no empty-state line; the model change is open point "Amendment" above.

## Usability review (after the 2026-11-18 redraw)

Reviewed on 2026-11-18 against `stories.md` (AC-001 to AC-048, the amendment of 2026-11-17 and the decisions of 2026-11-18) and the decisions above. Every screen was read as SVG source. Changed in this pass: 01, 05, 07, 09, 10, 12, 13 and the caption of 07 in `index.html`. Checked and left as drawn: 02, 03, 04, 06, 08, 11, 14.

Checked and found right: the connection panel shows only Source and Target, read-only, and Delete connection asks first (02); a refused value keeps the saved value and shows its reason beneath the field (03, 04, 09, 13); Connect to next flow is not offered on a flow with an outgoing arrow, and the Next flow line replaces it (04); a refused loop drag adds nothing (10); the arrows carry no label (01, 02, 14); Delete flow asks first and names what goes with it (05); the footer sits at y 680 in every panel, with one primary action (Add check, Add artifact, Save, Delete flow); the structure marks never block an edit (06, 11).

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | The picker of Connect to next flow has no Cancel. Once it is open, the only way out is to choose a flow, so it is a dead end (checklist 4). | major | 07 | A Cancel link sits at the picker's header, beside its title. The picker stays where it is (open point 1). |
| 2 | The refused loop drag gives the reason but not a way to continue: the user does not learn which flow is a valid target. | minor | 10 | The second line now reads "Drop it on a flow that does not lead back to complete. Nothing is added." |
| 3 | The row is scrolled to flow-2, so the arrow from specify to ux runs off the left edge of the canvas and is not drawn. The row shows boxes with a missing arrow. | minor | 07 | The arrow's visible stub (x -8 to 52) is drawn, as on screen 01. |
| 4 | The Artifacts heading says (1), but two artifact rows (the edit form for stories.md and architecture.md) are drawn. | minor | 13 | The count is (2), as on screen 12. |
| 5 | The template field shows sample text in ink, as if typed, and its help line reads "Shown as typed; kept as is.", which is implementation wording. | minor | 12 | The sample text is grey, as a placeholder; the implementation line is removed. The help line "Several lines. The template may be empty." stays. |
| 6 | The UI hint text refers to wireframe screen numbers ("screens 3, 12 to 14", "as on screen 1"). Those are for the reviewer, not the user. | minor | 01, 09 | Reworded to the user's words, with no screen numbers. |
| 7 | The delete dialog says "Human approval flag"; the checkbox is labelled "Human approval". | minor | 05 | "Its artifacts, its checks and its Human approval go with it:" |
| 8 | The screen table in this file says the red refusal mark sits below the canvas. It sits at the foot of the canvas (y 620 to 672, inside the canvas at 216 to 716). | minor | 10 (table row) | The table row says "at the foot of the canvas". The drawing is unchanged. |

Counts: 1 major, 7 minor. Caption of 07 in `index.html` now names the picker's Cancel.

**Open points for the user (from this review)**

1. **Where the picker opens.** On screen 07 the picker opens on the canvas (x 600 to 830, y 446 to 614), away from its button in the flow panel and from flow-2's box. Options: (a) keep it on the canvas, now with Cancel, as drawn; (b) move the list into the flow panel under the button. In (b) the panel scrolls, and the Artifacts, Checks and Human approval parts move down.
2. **Which flows the picker offers.** Screen 07 lists every other flow, including flows that already have an incoming arrow (ux already has one, from specify). The decisions forbid a second outgoing arrow and say nothing about a second incoming arrow. Options: (a) allow it (a join); (b) leave out flows that already have an incoming arrow, to keep a single chain; (c) offer them and refuse the choice with its reason, as for a loop.
3. **Empty states.** The decision of 2026-11-18 says an empty list has no empty-state line. Yet a flow with no checks shows "No checks yet." (screens 04, 07, 14), and an empty artifacts list shows nothing. Options: (a) keep "No checks yet." for checks only; (b) remove it, so both lists are silent when empty.
4. **The + button while a form is open.** On screens 03, 12 and 13 "+ Add check" or "+ Add artifact" in the list heading stays enabled while an add or edit form is open. What a click does is not decided. Options: (a) close the open form and open a new one; (b) draw the heading button disabled while a form is open, with the footer as the way out; (c) ignore the click while a form is open.
5. **What goes in the template field.** The help line says "Several lines. The template may be empty." It does not say what a template is. The owner states in one line what the template holds, so the help text can say it. No wording is drafted here, because it defines what the artifact is.
6. **"Does not stop here".** The unticked line of Human approval ("Unticked, the process does not stop here.", screens 03, 04, 07, 12, 13, 14) does not say where the process would stop. This is part of layout open point 5 (the stop is at the end of the flow). Not changed; wording waits for that answer.

## Visual review (after the 2026-11-18 redraw)

Reviewed on 2026-11-18 after the usability review above: screens 01, 02, 03, 04, 05, 07, 09, 10, 12, 13 and 14 (06 and 11 hint text only, 08 unchanged). Each SVG was read as source and rendered in headless Chrome at 1280 × 800; the scroll content was checked against the panel clip (x 978 to 1240, y 278 to 672) and the footer at y 680. Every changed file passes `xmllint --noout`.

Checked and kept: the frame, header, stepper, tab row and footer (y 752 to 800) on every screen; the canvas (x 40 to 964) and the panel (x 978 to 1240); the footer buttons at y 680 on 03, 04, 07, 09, 13 and 14, the Cancel button at x 990 and the action at the right edge (x 1108 to 1228); the dialog buttons of 05 at the 30 px inset; the scroll thumb on the panel's right edge (x 1234) on 03, 04, 07, 12, 13 and 14, clear of the content (content ends at x 1228); the clipped content above and below the scroll window, which is cut at the window edges as a scroll position should be; the colour roles (blue action, red blocker and refusal, the dashed red drop target); the contrast of the 10 px grey text on white; the type scale (no inline font sizes, only the classes of the set). Text widths were checked against the rendered PNG, because the 6.6 px-per-character estimate runs wider than the rendered font for most lines: a line is counted as too wide only where the render crosses a box or panel edge.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | The footer's Add artifact button ran from x 1108 to 1236, past the right edge (x 1228) of the footer buttons on 03, 09 and 13, and into the panel's padding beside the scroll track. | major | 12 | Button width 120 (x 1108 to 1228); label centred at x 1168, as Add check on 03 and Save on 13. |
| 2 | The drop target's label "Refused: would close a loop" ran past the dashed red box (box right edge x 160, text to about x 230) and crossed its border. | major | 10 | The label sits under the drop target, at x 44 and baseline y 418, in the empty canvas below specify. The dashed box (y 292 to 400) and the refusal mark at the foot of the canvas are unchanged. |
| 3 | The clip path `panelClip` was defined twice in each file that scrolls. Duplicate ids are invalid, and a reader or a tool may pick the wrong one. | minor | 02, 03, 04, 05, 07, 12, 13, 14 | The second, identical definition is removed. The drawing is unchanged. |

Counts: 2 major, 1 minor. No blocker. Drawing changed on 10 and 12; the duplicate-id fix alone changed 02, 03, 04, 05, 07, 13 and 14. Screens 01, 09 and 14 had no visual finding of their own (14 only gets the id fix). The index.html captions stay correct; no caption changed.

**Open points for the user (from this review)**

1. **Where the refused-drop label goes (screen 10, finding 2).** The label now sits under the drop target, outside its dashed box. Options: (a) keep it there, as drawn; (b) keep it inside the box, in two lines ("Refused:" and "would close a loop"), which needs the box to be a little taller (it ends at y 400 and the specify box ends at y 376, so the room is there).
2. **Length of the refusal line on screen 13.** "A label is required. The saved label stays." renders inside the panel (its end at x 1216, edge 1228), but by the 6.6 px-per-character estimate it is wider than the panel. Options: (a) keep the wording, as it fits in the render; (b) shorten it to "Label required. The saved label stays." The wording is for the owner to choose; the screen is not changed.

## Usability review (2026-11-18 restyle)

Reviewed on 2026-11-18 after the Material Kit restyle (palette, Inter, radii 8 and 12 px) and the multi-line template area on screens 12 and 13. Each SVG was read as source and checked with `xmllint --noout` (all 14 pass). Checked against `stories.md` (AC-001 to AC-048) and the decisions above. Layout, functions and content were not changed; the palette was not changed (owner's constraint).

Checked and found right: the template area on 12 and 13 is a multi-line field with its label one line, the owner's help text sits beneath it, and the refused blank label (12) and the kept saved label (13) are as AC-043 and AC-044 state; the primary action of each footer keeps its place (y 680) and its name; the Remove links sit on their own items; the Pipeline tab's selected state (white on blue) and the blue action buttons keep 4.7:1; the grey text (10 px and 12 px, nevada 500 and 600) keeps 5.4:1 on white.

Note: no renderer was available in this environment, so the Inter widths were not measured on a rendered page. The width of the new help text lines was estimated (about 6 px per character at 11 px).

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | The template help text is 10 px grey, the smallest text in the set, and it is the text the user reads to write a template. | minor | 12, 13 | Set at 11 px (the `small` class), rewrapped to five lines at 13 px line spacing; the owner's wording is unchanged. Screens 12 and 13 keep their layout: no element moves. |
| 2 | The white label of the Delete flow button (redOrange 500 `#F04438`, 13 px) is 3.8:1 on its fill, below the 4.5:1 for text. | major | 05 | Not changed (palette fixed). Open point 1. |
| 3 | The done-step labels (kepple 600 `#0E9382`, 12 px) are 3.8:1 on white and 3.5:1 on the page. The stepper's progress reads weakest in the text that names the steps. | major | Stepper, all 14 screens | Not changed (palette fixed). Open point 1. |
| 4 | The warning text (california 600 `#DE7101`, 11 px) is 3.3:1 on white. The word "Warning" is the only text cue beside the amber mark. | minor | 06 | Not changed (palette fixed). Open point 1. |
| 5 | The field and secondary-button borders (`#CDD7E1`, 1.5 px) are 1.5:1 on white, and the tab edges (`#DDE7EE`) are 1.25:1. A field or a Cancel button can read as plain text. | major | All screens with fields or buttons | Not changed (palette fixed). Open point 2. |

Counts: 3 major, 2 minor. Fixed: 1 (finding 1, on 12 and 13). Not changed: 4, held by the palette constraint (open points 1 and 2).

**Open points for the user (from this review)**

1. **Contrast of the colour text (findings 2, 3, 4).** Options: (a) keep the palette as it is; (b) use the palette's darker tones for the text that fails: redOrange 600 `#DE3024` for the Delete flow button (4.6:1 with white), a darker kepple for the done-step labels, and a darker california for the warning text. The owner picks the exact tones; the palette is not changed here.
2. **Border of fields, secondary buttons and tabs (finding 5).** Options: (a) keep the light borders, as drawn (the labels still say what each control is); (b) use a darker neutral border for fields and buttons (a control boundary of at least 3:1 is the usual target), and keep the light tab edge only with the blue selected tab. Owner picks the tone.
3. **Text size of the hints (carried from the visual review, open point 8).** The help text of 12 and 13 is now 11 px; every other hint and mark path stays at 10 px. Options: (a) keep the mix; (b) move all `tiny` text to 11 px set-wide, then check every line's width in a rendered page (not done here: no renderer).

## Visual review (2026-11-18 restyle)

Reviewed on 2026-11-18 after the Material Kit restyle and the usability review above. Every SVG was checked as source, and the 14 screens were rendered in headless Chrome at 1280 × 800 and read as PNG; text widths were read from the render, not from the 6.6 px-per-character estimate. Every changed file passes `xmllint --noout`. The palette, the Inter weights, the radii (8 for controls, 12 for cards) and the grid were checked against the restyle note above and kept.

Checked and kept: the frame, header, stepper, tab row and footer on every screen; the footer buttons at y 680 on the panel screens, with Cancel at x 990 and the action at the right edge (x 1108 to 1228); the scroll thumb on the panel's right edge (x 1234); the colour roles (blue action, red blocker and refusal, amber warning, teal done steps); the type classes (no inline font sizes). The field and button borders, the done-step labels and the Delete flow label keep the contrast findings of the usability review (its open points 1 and 2); no palette tone is changed here. On 07 the empty gap under the Name field is the slot where the name refusal of screen 04 appears; it is kept so the fields below do not move when the refusal shows.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | The template help text does not fit its box. At 11 px its five lines run past the bottom border of the New artifact form; the last line, "May be empty.", sits below the border. | major | 12 | The form box is 16 px taller (232 to 248). The content below it (Checks, Human approval) moves down 16 px, so each gap stays as drawn. The help text and its wording are unchanged. |
| 2 | Same overflow in the Edit artifact form: "May be empty." sits below the border of the form. | major | 13 | The form box is 16 px taller (232 to 248), and the rows below it (architecture.md, Checks) move down 16 px. The help text and its wording are unchanged. |
| 3 | The loop blocker mark sits 2 px above the canvas hint line ("Flows in pipeline order ..."); its bottom border nearly touches the text. | minor | 06 | The mark moves right (x 500 to 600, text x 510 to 610), clear of the hint line. Its height and y are unchanged. |
| 4 | The ring of the placeholder on the verify tab is `#9CA7FF`, a tint that is not in the palette. | minor | 08 | The ring is the primary `#635BFF` at 50 % opacity. The drawing is unchanged. |
| 5 | The drop target on 10 has a corner radius of 10, which is outside the set (8 for controls and flows, 12 for cards). | minor | 10 | Radius 8. The box and its position are unchanged. |

Counts: 2 major, 3 minor, 5 fixed. No blocker. Changed: 06, 08, 10, 12, 13. The other nine screens are unchanged. No text is left outside its box after the fixes (screens 12 and 13 were re-rendered and read). Scroll thumbs on 12 and 13 were not resized for the 16 px of added content (a change under 2 px in the thumb's length).

**Open points for the user (from this review)**

1. **Place of the loop blocker (screen 06, finding 3).** The mark now sits to the upper right of the arc, beside build's top edge, not over the arc's start at plan. Options: (a) keep it there, as drawn; (b) keep it over the arc and shorten or move the hint line so the mark has room at x 500 to 800.
2. **Gap under the Name field (screen 07).** The gap is the reserved slot for the name refusal of screen 04. Options: (a) keep the reserved slot, so the fields below do not move when a refusal shows; (b) close the gap, and let the refusal line push the fields down when it shows.

## Usability review (2026-11-18, frame change)

Reviewed on 2026-11-18 after the frame change: screens 02 to 14 moved to the frame of screen 01 (left panel with the stepper, content area from x 284, tab row, canvas card x 284–964, properties card x 984–1256, footer note and caption inside the content area; no header bar). Screen 01 is the reference and was not changed. Each task was walked from the first step to the last against `stories.md` (AC-001 to AC-048, the amendment and the decisions of 2026-11-18): add a flow, connect flows, add a check, add and edit an artifact, tick Human approval, delete a flow, the empty set, the marks, the refused values. Checked in the SVG source and in the dialog and scroll coordinates only; no PNG was rendered (the visual review does that).

Checked and found right: the frame of 02 to 14 matches 01 (wordmark, New project, the stepper at x 40, Prev and Next at y 728–768, the content area from x 284, the tab row at y 24–56, the canvas and properties cards, the footer note and caption at baseline 781); the footer buttons sit at y 684–712 on every panel and form; the scrolled panels (03, 04, 07, 12, 13, 14) clip at y 146–676 and keep the title and the subtitle above the scroll window; the dialog on 05 is centred on the content area (x 770, y 400) with its buttons 30 px in from the edge; refused values keep the saved value and show the reason beneath (09, 13) or show the typed value with the reason beneath (03, 12); Connect to next flow is not drawn on 04 (the Next flow line replaces it) and is offered on 07 only (flow-2 has no outgoing arrow); no arrow carries a label (01, 02, 06, 07, 09 to 14); Delete flow and Delete connection ask first (02, 04, 05, 07, 14); the marks on 06 and 11 block nothing and the refused drop on 10 adds nothing; the action names match across the set (Add check, Add artifact, Add argument, Save, Cancel, Remove, Edit, Delete flow, Delete connection, Connect to next flow).

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | The flow's Name is required (AC-029: non-blank), but its label did not say so; the other required fields are marked "· required". | minor | 03, 04, 07, 12, 13, 14 | The label reads "Name · required" in each flow panel. The pipeline's own Name is not changed: the stories set no rule for it. |
| 2 | The picker's six flows are bare text, so they do not look like choices to pick. | minor | 07 | Each flow sits in a row box of the set's `box` style (20 px rows, 22 px apart) inside the picker. Text, position and picker size are unchanged. |
| 3 | AC-003 says the new flow's tab is selected at once. Screen 07 keeps the Pipeline tab selected, with flow-2 selected on the canvas. | major | 07 | Not changed: the criterion or the screen must change first (open point 1). |
| 4 | The captions and table rows still describe the old frame or the approved set: "New project in the header", "header and footer included", and "Unchanged from the approved set" for screen 08. | minor | index.html (08); screens.md (table rows 01, 05, 08; Frame change) | The wording now matches the frame: New project in the left panel, the dim covers the left panel and the footer, and screen 08 has one card across the content area. No drawing changed for this item. |

Counts: 1 major, 3 minor. Changed: 03, 04, 07, 12, 13, 14 (finding 1), 07 (finding 2), index.html (finding 4). Not changed: 01 (reference), 02, 05, 06, 08, 09, 10, 11 (no finding).

**Open points for the user (from this review)**

1. **The tab after + (screen 07, finding 3; AC-003).** AC-003 says the new flow's tab is selected at once. As drawn, the Pipeline tab stays open and flow-2 is selected on the canvas. Options: (a) keep it as drawn and change AC-003 to "the new flow is selected"; (b) select the flow-2 tab after + as AC-003 says, and draw that tab with its placeholder (screen 08 pattern); the new flow's name and file are then reached from the Pipeline tab, and screen 07 is redrawn. The owner picks; the screen is not changed here.
2. **Carried open points.** The picker's place on the canvas (2026-11-18 usability review, open point 1) and the other open points of the earlier reviews stand; they are not asked again here.

## Visual review (2026-11-18, frame change)

Reviewed on 2026-11-18 after the frame change and the usability edits: screens 02 to 14 (screen 01 is the reference and was not changed; 08 has no finding). Each SVG was read as source and rendered in headless Chrome at 1280 × 800 (renders in the review scratch folder, not in the spec); every changed file passes `xmllint --noout`. Text widths were checked on the render. After the changes no text crosses a box, a panel or the card edge.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | The pipeline properties panel was drawn in a compressed layout (26 px inputs at a 46 px rhythm, 10 px hints, the subtitle close to the first label). Screen 01 draws the same panel with 34 px inputs at a 56 px rhythm and 11 px text. | major | 06, 10, 11 | The panel is screen 01's block, the same text and the same positions. |
| 2 | The same compressed layout on 09 (argument row, editing field and body) left the top of the panel cramped. | major | 09 | Laid out on the 01 rhythm (34 px inputs, 56 px steps); the text and the states are unchanged. |
| 3 | The connection point's drag arc ran through the "specify" and the "complete" labels. | major | 10 | The arc's control points are raised to y 250 (`M938 418 C950 250 296 250 308 418`); the end points are unchanged, and the arc clears both labels. |
| 4 | The panel content and the footer buttons ran to x 1242: a 14 px inset on the right against 20 px on the left, and 6 px past the field edge of screen 01 (x 1236). | minor | 02, 03, 04, 05, 07, 09, 12, 13, 14 | Panel fields, boxes, dividers, the Add and Save buttons, and the Edit and Remove links move in 6 px (width 232, right edge 1236; the link and the Save label move with them). The scroll track at x 1248 keeps 12 px clear. |
| 5 | The arrow from the hidden flow started at x 278, over the card's left border. | minor | 07 | The canvas clip is inset to x 292 (`canvasClip`). |
| 6 | Secondary button labels were 11 px beside 13 px primary labels in one footer (Cancel and Save). | minor | 03, 04, 05, 07, 09, 12, 13, 14 | `btnT` is 13 px, as the primary labels. "+ Add artifact" and "+ Add check" still fit their 128 px buttons. |
| 7 | The panel subtitle "Generates …" was 10 px on the flow panels and 11 px on screen 01. | minor | 02 to 14 (panels) | The subtitle uses the `small` class (11 px), as screen 01. |

Counts: 3 major, 4 minor, no blocker. Findings per screen: 02 (2), 03 (3), 04 (3), 05 (3), 06 (1), 07 (4), 09 (3), 10 (2), 11 (1), 12 (3), 13 (3), 14 (3); 01 and 08 (0). Changed: 02 to 07, 09 to 14 (all but 01 and 08).

Checked and kept: the frame (left panel, stepper, Prev and Next, the tab row, the card positions and the footer note and caption) on every screen; the footer buttons at y 684 on the panels; the scroll windows (x 978 to 1240, y 146 to 676); the 13 refusal line "A label is required. The saved label stays." ends at about x 1230, inside the 1236 edge (tight, but it fits); the 07 gap between Name and Description is the reserved error line (as on 04), kept so the layout does not move when an error shows; the 13 Human approval text is cut at the scroll window's lower edge, a scroll position; the dashed drop target and its label on 10; colour roles (blue action and progress, red blockers and refusals, amber warnings, teal checks); the type scale (only the classes of the set).

**Open points for the user (from this review)**

1. **Input height in the flow panels (02 to 07, 09, 12 to 14).** The flow panels use 26 px inputs at a 46 px rhythm; screen 01 and the pipeline panel use 34 px at 56 px. Options: (a) keep 26 px, so more of the form fits the scroll window (as drawn); (b) use 34 px in every panel and accept a shorter visible form.
2. **The 10 px hint text (`tiny`).** About 40 lines use it (character counts, "Asks first", rule chips, the "Ticked:" explanations). The type scale in this file names no 10 px step. Options: (a) name 10 px as a hint step of the scale; (b) move these lines to 11 px (`small`), which needs room where a line ends near the panel edge.
3. **The body count on 09.** The counter reads "96 / 1,000 characters" while the error says "1,001 characters: the limit is 1,000. The saved body stays." Options: (a) the counter shows the typed length ("1,001 / 1,000"), and the error says the saved body (96 characters) stays; (b) the counter keeps the saved length and the error names the typed length only. The owner chooses the wording; the screen is not changed here.

## History: the set before the 2026-11-18 redraw

The reviews below record the set before the 2026-11-18 redraw (the connection carried the artifacts, checks and approval). They stay as the record; the screens above replace the drawings they describe.


## Usability review (2026-11-17, before the redraw)

Review of 2026-11-17 against `stories.md` (AC-001 to AC-048, with the amendment). Walked the tasks: add a flow; connect flows; add and edit an artifact; add a check; tick Human approval; delete a flow and a connection; read the marks. 4 major and 2 minor findings; 5 changed screens (03, 06, 09, 12, 13) and one decision line in this file (07). The index caption for 13 is updated to match.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | While an add or edit form is open, the saved rows of its list are not drawn: the counts (Artifacts (2), Checks (1)) stood alone, so the user could not see what exists and could duplicate a value. | major | 03, 12, 13 | The saved rows are drawn above the form: artifact rows with name, Edit and Remove on one line (13 and 12); on 03 the artifacts as a one-line name list and the saved check as a row with its type chip and Remove. The form takes the lower part of the panel. |
| 2 | The refused body was shown with the typed text in the field, while the reason beneath said "The saved body stays". This breaks decision 5 and AC-027. | major | 09 | The field shows the saved body (two lines, as on screen 01); the two reason lines stay beneath it; the 96 / 1,000 counter moved to the Body line. |
| 3 | Remove sat in the footer of the artifact edit form, beside Save, not with the artifact it affects (rule 5). | major | 13 | Remove is a link in the edit form's header, beside its title. The footer is Cancel and Save, in the same places as the add forms on 03 and 12. |
| 4 | The amber mark said "Warning · pipeline: rule tags are empty". Screen 01 shows the tags general and qa, so the screens contradicted each other; and the analyzer raises no such warning (architecture §12 has no pipeline rule-tag warning). | major | 06 | Replaced by "Warning · build: block 4 (test) retries with no round limit", path `flows.build.blocks[3]`, which architecture §12 gives as a warning. |
| 5 | The argument add form had Add and Cancel in the list column, while the other add forms have their action in the footer; the header link read "+ Add" for an "Add argument" action; and the footer line "The pipeline cannot be removed" was in the footer strip, where the action sits. | minor | 09 | Add argument and Cancel moved to the footer (y 680) at the places used on 03, 12 and 13. The link reads "+ Add argument". The footer line is dropped here; it stays on screens 01 and 06. |
| 6 | Decision 7 in this file said the picker "lists only flows that can be reached", but the picker lists every other flow. | minor | 07 (this file) | The decision line now says the picker lists every other flow, flow-2 excepted; the SVG is unchanged. |

Checked and kept: the tab row (flow-2 is drawn on 07), the frame, stepper and footer, the three-column grid, the Remove links of the connection and flow panels, the disabled Connect with its reason (04), the delete confirmations (02, 05), the marks (06, 11), the drag (10), and the Human approval checkbox (14). No owner decision changed.

**Open points for the user**

1. **Placeholder names F-12 (screen 08).** AC-005 asks for a one-line placeholder that "its blocks are built in F-12", and the screen follows it, so a user sees a spec id. Options: (a) keep the wording as AC-005 has it (the screen is a wireframe); (b) change AC-005 to a plain sentence such as "The blocks are built in the next step" and keep F-12 in the specification only. Needs an owner decision on the wording of AC-005.
2. The seven open points under "Open points for layout review" above still stand. Point 3 now has the layout fact: flow-2 is drawn on the tab row but not selected, with the Pipeline tab open.

## Usability review (2026-11-17, after the owner change; before the redraw)

Review of 2026-11-17 of the five changed screens (02, 03, 12, 13, 14) against `stories.md` (AC-043 to AC-048; AC-015 as reworded in open point 8 of "Open points for layout review") and this file. The owner's change is drawn: no Source flow or Target flow fields; the panel middle is moved up (group offset −92); the footer stays at y 680. Walked: add an artifact with a blank label; edit an artifact and clear its label; add a check with a blank description and no threshold; tick and untick Human approval; find how to repoint an arrow's end; read the panel of a connection with artifacts, checks and approval on or off.

Counts: 1 major, 5 minor (4 changed, 1 not changed). 5 screens changed (02, 03, 12, 13, 14).

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | With the owner change the Source and Target fields are gone, so the only way to repoint an arrow's end is to drag it (AC-015 as reworded, AC-012). Nothing on the selected arrow shows that its ends can be dragged, so a person cannot find the repoint. | major | 02, 03, 12, 13, 14 | The selected arrow shows two connection-point handles at its ends, drawn as on screen 10 at the box edges. The drag stays the only repoint path; open point 2 below asks whether the hint also needs words. |
| 2 | The line under the panel title, "build → verify, shown with no label", describes the drawing, not the connection. The user is not meant to see the drawing rules. | minor | 02, 03, 12, 13, 14 | "From build to verify" (02, 03, 12, 13); "From verify to complete" (14). |
| 3 | The canvas hint names artifacts and checks only. Human approval is also in the panel (AC-048). | minor | 02, 03, 12, 13, 14 | Hint now reads "Select an arrow to edit its artifacts, checks and Human approval." |
| 4 | With Human approval unticked (02) only the ticked meaning is shown. AC-045 requires on and off, and screen 14 shows both meanings. | minor | 02 | Added the unticked meaning under the ticked line: "Unticked, the process does not stop here." |
| 5 | The threshold help says "a positive whole number" but not that the threshold applies to `diff size` only (AC-046). The refusal does not say why the field is needed. | minor | 03 | Refusal: "Threshold is required for diff size."; help line under it: "A whole number above 0; not for checks.". The form box is 10 px taller (ends at y 590, above the footer at 680); "Not added until both are valid." moved to y 670. |
| 6 | A connection with no artifacts (a new connection, decision 6) has no empty state in the artifacts list. Screen 14 draws the empty checks list, but no drawn screen shows Artifacts (0). | minor | none of the five | Not changed: drawing it needs a screen outside these five files, or a decision. See open point 1. |

Checked and kept: the footer at y 680 on all five (Delete connection on 02 and 14; Cancel with Add check, Add artifact or Save on 03, 12, 13); the primary action names ("Add check", "Add artifact", "Save", "Delete connection"), matching the list buttons "+ Add check" and "+ Add artifact"; Remove beside the item it affects (artifact rows, the check row, the header of the edit form on 13); the refused values and their reasons (03, 12, 13, with the saved label kept on 13, AC-044); the add-form rows of the list above each form (12 and 13 show the saved artifacts, 03 shows the artifact names and the saved check); the empty checks state on 14; the frame, stepper, tab row and the canvas boxes, unchanged.

**Open points for the user**

1. **Empty artifacts state (finding 6).** A new connection starts with no artifacts (decision 6), and no screen shows that. Options: (a) keep as is: the heading "Artifacts (0)" and "+ Add artifact" show that the list is empty; (b) add an empty line such as "No artifacts on this connection yet." (as the checks list does) and draw it on a new screen. Needs a choice of the owner before the screen set is changed.
2. **Repoint cue (finding 1).** The handles at the ends of the selected arrow are a drawn cue, not a word. Options: (a) keep the handles only; (b) add a line to the panel or the canvas hint, such as "Drag an arrow's end onto another flow to move it." Open point 8 of "Open points for layout review" still stands: confirm that the drag is the only repoint path.

## Visual review (2026-11-17, after the amendment; before the redraw)

Review of 2026-11-17 of the set 01 to 07 and 09 to 14 after the amendment and the owner change (no Source or Target flow fields; panel middle moved up 92 px; footer at y 680). Screen 08 checked for consistency only (unchanged). Rendered in headless Chrome at 1280 × 800 and checked against the coordinates; all 13 SVGs are well-formed (`xmllint --noout`). Screens 01 and 11 had no findings.

Counts: 11 findings, 3 major and 8 minor. 11 screens changed (02, 03, 04, 05, 06, 07, 09, 10, 12, 13, 14). Behaviour, criteria and owner decisions are unchanged.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| 1 | The saved check row ran its Remove link past the check box edge (x 1190 to 1233, box ends 1228), beside the chip row. The legend and screen 02 draw Remove on its own row. | major | 03 | Saved check box 64 px tall, as on 02: title, chip row, then Remove on its own row. The New check block moved down 24 px to keep its 8 px gap. |
| 2 | The artifact rows on 02 and 14 were 56 px tall with Edit and Remove on a third line; on 12 and 13 the same row is 36 px with the links on the name line. The same control looked two ways. | major | 02, 14 | Rows on 02 and 14 use the 12 and 13 form (36 px, name and links on one line, description under it). The + Add artifact button is 22 px tall (y 374 to 396) so it no longer touches the first row. The panel below moved up to match. |
| 3 | The check row's Remove link sat 6 px above the bottom edge of its box on 02. | minor | 02 | Check box 64 px tall; Remove 10 px above its bottom edge; the Checks heading, the check box and Human approval moved to match. |
| 4 | The flow panel's label pitch was 42 px below Description, against 48 px on 01 and 07. Arguments and Model labels sat 10 px under the field above (16 px elsewhere). | minor | 04 | Labels and fields from Arguments down moved to the 48 px pitch. Body, the counter, Connect to next flow and its two lines move down 18 px; the Delete flow footer stays at y 680. |
| 5 | Cancel and Delete flow touched the dialog's right edge (dialog ends x 940, the button ends there too), while the left text padding is 30 px. | major | 05 | Cancel at x 670 and Delete flow at x 792; both end 30 px inside the dialog, as the text does on the left. |
| 6 | The loop blocker sat 2 px inside the canvas top edge and 4 px above the hint line. | minor | 06 | Mark moved to x 500, y 222 (30 px tall), right of the hint line and clear of the arc. |
| 7 | The flow-2 blocker touched the canvas right edge (x 964) and did not line up with the flow-2 box (right edge 952). | minor | 07 | Mark at x 652 to 952, its right edge on the flow-2 box; text moved to x 664. |
| 8 | The scroll strip and its note sat 2 to 4 px above the canvas bottom edge (note baseline 712, edge 716). | minor | 07 | Strip at y 684 to 692; note baseline 704. |
| 9 | A 58 px empty gap sat between the argument hint and the Body block: empty space between controls, not at the bottom. | minor | 09 | Body block (label, box, counter, the two refusal lines) moved up 24 px. The empty space now sits above the footer. |
| 10 | The Drop to connect label sat 2 px from the bottom edge of the drop target. | minor | 10 | Drop target 108 px tall (y 292 to 400); label baseline 392. |
| 11 | Edit and Remove on the artifact rows ended on the box edge (x 1226 of 1228), and the Remove in the edit form header did too. | minor | 02, 12, 13, 14 | Edit at x 1148 and Remove at x 1178 on every artifact row, so Remove ends at x 1218, inside the inner padding. On 13 the form header Remove also starts at x 1178. |

**Checked and kept:** the frame, the header, the stepper, the tab row and the footer (y 752 to 800) on every screen; the card and the three columns (canvas x 40 to 964, panel x 978 to 1240); the footer buttons at y 680 on every panel and form; the Human approval checkbox and its two meanings (02, 14); the colour roles (blue action, red blocker, amber warning, blue-tint info, orange rule files), with the text beside each mark; text fit in the chips, the boxes and the buttons; no element drawn outside the card or the canvas; screen 08 matches the set (header, stepper, tab row, card, footer).

**Open points for the user**

1. **Text size 10 px (carried from the previous set).** The `tiny` class (10 px, grey) carries the chips, the hints and the mark paths; it is the most used class in the set. Not changed. Options: (a) keep 10 px, as the wireframes are read at full size; (b) move the hints and the mark paths to the 11 px `small` class, which needs wider chips and one more line per hint in the 238 px panel column.
2. **Loop mark position (screen 06, finding 6).** The mark now sits at the top right of the canvas, clear of the hint line. Options: (a) keep it there, as drawn; (b) put the text on the arc's peak, with a gap in the dashed line for the text.

## Coverage check (2026-11-17, before the redraw)

Checked 2026-11-17 after the amendment, the owner change (no Source or Target fields) and both reviews.

- Every criterion AC-001 to AC-048 is named in this file: as shown on a screen (the table above), as proved by tests (the lists of criteria with no screen), or as superseded (the amendment's list).
- AC-043 to AC-048 each have a screen: AC-043 and AC-044 on 12 and 13 (and 02); AC-045 on 02 and 14; AC-046 on 02, 03 and 14; AC-047 on 01; AC-048 on 01, 02 and 14.
- Still-valid UI criteria with a screen: AC-001 to AC-009 and AC-011 on 01, 07 and 08; AC-012 on 10; AC-014 on 04 and 07; AC-015 open (no panel picker, see open point 8); AC-016 on 02; AC-020 on 02 and 03; AC-024 on 01; AC-025 to AC-034 on 01, 02, 04, 05, 07, 09 and 11; AC-035 to AC-039 on 06 (AC-039 by tests); AC-040 to AC-042 on 01 and 11 (AC-040 by tests).
- Device criteria: AC-006, AC-011 and AC-024 on 01; AC-012 on 10; AC-048 on 02 and 14. Each goes into the manual checklist at Verify.
- Every SVG passes xmllint --noout (14 files, 08 unchanged).

Gaps left open for the owner: AC-015 (repoint with no panel picker, open point 8), the empty artifacts state on a new connection (usability open point 1), and the 10 px text size (visual open point 1).

