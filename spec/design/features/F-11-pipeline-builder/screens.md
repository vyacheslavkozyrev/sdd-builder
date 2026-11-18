# UX screens — Pipeline builder (UI only) (F-11)

Feature entry: `spec/documents/features.md` → F-11. Stories: `spec/specifications/F-11-pipeline-builder/stories.md` (42 criteria plus the amendment of 2026-11-17, AC-043 to AC-048). Screens redrawn after the amendment (2026-11-17, owner): connections carry artifacts and checks and a Human approval checkbox; arrows have no label; the Pipeline tab has no toolbox.

Scope: step 3 of the wizard (Workflow). The **Pipeline** tab is the first tab and cannot be removed; one tab per flow follows, and a **+** button after the last tab adds a flow. The canvas draws flows as boxes and connections as arrows. A connection's artifacts, checks and Human approval are in its properties panel; the arrow itself shows no label and no mark. The flow tab's body is a placeholder until F-12. Desktop, 1280 × 800 inside the F-08 wizard frame (stepper row, card, footer). Wireframes in SVG: layout, content and states; colours and wording are placeholders.

The frame, the stepper and the footer are the F-08 and F-07 frame, drawn unchanged. The card keeps its three-column grid, but on the Pipeline tab the toolbox column is gone: the canvas takes its space (x 40–964), and the properties column stays at its width (x 978–1240).

Earlier drawing: `spec/design/features/F-06-visual-builder/` (Map tab, from the first builder concept). It is not reused.

Earlier set (before the amendment): in git history at HEAD, this folder's 01 to 11 with the toolbox and the gate on each arrow. Its reviews are not repeated here.

## Layout grid

- **Header** 0–56, as F-07 (wordmark at x 24; New project at x 1120–1256).
- **Stepper row** y 80–140, as F-08. Step 3 is current.
- **Card** x 24–1256, y 152–736. Inside:
  - **Tab row** y 168–198, from x 40 to x 1240, with a line under it at y 206. The Pipeline tab is first; the + button follows the last tab (x 597.6 after the default six flows; x 676 after flow-2 on screen 07).
  - **Canvas** x 40–964, y 216–716 on the Pipeline tab (no toolbox). Boxes are 100 × 76 px on a 160 px pitch from x 52; six boxes (900 px) fit in one row, so no strip is drawn. A seventh box needs the canvas to scroll (screen 07 shows the end of the row).
  - **Properties panel** x 978–1240, y 216–716. Its footer, when there is one, is at y 680–708: Delete flow or Delete connection on the item's panel, and Cancel with the save action on an add or edit form (the same place).
- **Footer** 752–800, as F-07.

## Legend

- **Box with a name and a block count:** a flow, on the canvas. **Blue outline:** the selected flow. **Red outline:** a flow with a blocker mark.
- **Arrow with no label:** a connection. **Blue arrow:** the selected connection. Arrows carry no text and no gate mark (amendment; AC-048).
- **Dashed red arc:** a connection that closes a loop among flows (a blocker).
- **Small circles on a box's left and right edge:** the connection points. **Dashed blue line:** a drag in progress from one connection point to another. **Dashed blue box:** a drop target.
- **Artifact row:** bold label, first line of the template in grey, and **Edit** and **Remove** links.
- **Check row:** bold description, a type chip (`checks` or `diff size`) and the threshold, with a **Remove** link on its own row.
- **Checkbox "Human approval":** ticked, the process stops for a person at this connection; unticked, it does not.
- **Red text under a field:** a refused value, with its reason. An edit keeps the saved value in the field; an add form shows what was typed (blank when empty).
- **Dimmed screen with a centred dialog:** a confirmation.
- **Red box, "Blocker":** a structure mark with severity blocker. **Amber box, "Warning":** severity warning. Marks sit beside the item they name, or in **Not on a drawn item** when the item is not drawn on this tab.

## Screens

| # | File | What it shows | Criteria shown | States shown |
|---|---|---|---|---|
| 01 | `01-pipeline-default.svg` | The Pipeline tab with the default pipeline: six flows in order, five arrows with no label; no toolbox, the canvas takes its space; the Pipeline properties; New project in the header | AC-001, AC-002, AC-004, AC-006 (device), AC-007, AC-008, AC-009, AC-011 (device), AC-024 (device; toolbox part superseded: canvas centre, properties right), AC-041, AC-042, AC-047, AC-048 (arrows with no label) | Default state after the wizard opens; the row fits the canvas |
| 02 | `02-connection-selected.svg` | Connection build → verify selected: no Source or Target fields (the arrow shows its ends, owner decision); Artifacts (2) with a label and a template line per artifact, Edit, Remove and + Add artifact; Checks (1) with its row, Remove and + Add check; Human approval unticked; footer Delete connection | AC-016 (asks first), AC-025 (connection panel), AC-015 (no panel picker; the ends are shown on the arrow, open point 8), AC-043, AC-044 (edit and remove shown), AC-045, AC-046 (rows, remove, add), AC-047, AC-048 (panel shows the artifacts, checks and checkbox) | Connection with artifacts and a check; approval off |
| 03 | `03-add-check.svg` | Add check form in the panel: Description required, refused blank; Type `diff size`; Threshold not set, refused; the reason under each field; no true or false output in the form; the saved check row and the artifact names above the form; Cancel and Add check in the footer | AC-046 (refusals and the reason beside each), AC-018 (the table, `diff size` threshold), AC-020 (no output choice), AC-046 (not added) | Two refused fields; nothing added; the saved check stays in view |
| 04 | `04-flow-panel-connect.svg` | Flow plan selected: Name refused because build is used (the name stays plan); description, arguments, model and body with its counter; Connect to next flow disabled with its reason, because plan already has its next flow (one outgoing per flow); footer Delete flow | AC-014 (one outgoing per flow, refused), AC-025, AC-026, AC-027, AC-029, AC-031 (Delete asks), AC-034 (no switch-off) | A name clash refused; connect disabled with reason |
| 05 | `05-delete-flow-confirm.svg` | Delete flow plan: the confirmation names its connections with their artifacts, checks and approval flags; Cancel and Delete flow. The whole screen is dimmed behind it, header and footer included | AC-031, AC-032 | Confirmation open |
| 06 | `06-structure-marks.svg` | Structure marks: a loop arc from build back to plan with its blocker; a blocker beside plan (no End block); the Not on a drawn item section with a block finding and a block warning; the note that marks never block an edit | AC-035, AC-036, AC-037, AC-038 | Blockers and a warning; nothing selected |
| 07 | `07-add-flow.svg` | After +: flow-2 added, selected, empty and not connected; its blocker (no Start and no End); its panel with the name, the generated file, Connect to next flow with the picker of the other flows open, and Delete flow; the canvas scrolled to the end of the row | AC-003, AC-004, AC-014 (picker of the other flows), AC-026, AC-031 | New empty flow; picker open; blocker |
| 08 | `08-flow-tab-placeholder.svg` | The verify tab opened: its name and block count, and the placeholder that its blocks are built in F-12. Unchanged from the approved set | AC-001 (the tab order), AC-005 | Flow tab body is the placeholder |
| 09 | `09-properties-refused.svg` | Pipeline properties with two refused values: a repeated argument name (the reason names row 1), with Edit and Remove on the saved row; Add argument and Cancel in the footer, as on the other add forms; a body of 1,001 characters refused; the field shows the saved body (96 characters), and its counter sits on the Body line. Model, tools and rule tags as on screen 01 | AC-025, AC-027, AC-028 | Two refused values; the saved values are kept, the reason shows beneath each field |
| 10 | `10-connection-point-drag.svg` | Connection points on each flow's edges. A drag from complete's right connection point to specify's left one (dashed blue line, drop target on specify); the drop closes a loop, so the mark shows after the drop; the new connection starts with no artifacts or checks | AC-012 (connection-point drag between flows; the Connection tool is removed), AC-035 (loop mark, as on 06) | Drag in progress |
| 11 | `11-no-flows.svg` | Every flow deleted: the tab row shows Pipeline and +; the canvas says there are no flows; Not on a drawn item lists the blocker "the pipeline has no flow"; the note that no edit is blocked | AC-033, AC-036, AC-037 | Empty canvas; the blocker; no edit blocked |
| 12 | `12-artifact-form.svg` | Artifact form (add) in the connection's panel, below the saved artifacts (name, Edit and Remove on one line): Label required, refused blank, not added; Template several lines, may be empty; Cancel and Add artifact in the footer | AC-043 (blank label refused; not added; template may be empty and span lines) | Add form; label refused |
| 13 | `13-artifact-edit-refused.svg` | Artifact edit: the label is cleared, refused; the field keeps the saved label, the reason is shown beneath; Remove is the link in the form's header, beside its title; Cancel and Save in the footer | AC-044 (refused edit keeps the saved values, reason beneath), AC-043 (required label) | Edit form; refused edit; Remove on the item's own form |
| 14 | `14-human-approval.svg` | Human approval ticked on verify → complete: the checkbox on, with what it means both ways; no checks yet (empty state with + Add check); the arrow shows no label | AC-045 (on and off, only the flag changes), AC-046 (empty state, any number of checks), AC-048 | Approval on; no checks |

Criteria with no screen on purpose (proved by tests, not visual):

- AC-010: the saved config has no position key; the layout itself is shown on screen 01.
- AC-039: the marks equal `analyzeStructure` for the same config.
- AC-040: no network call and no storage.
- AC-030: one selected item at a time; each panel screen (02, 04, 07, 01) shows one selected item, and the test proves the rest.

Superseded criteria (the amendment; not drawn, not tested): AC-013 (the connection's label: replaced by AC-043), AC-017 (approval with a description: replaced by AC-045), AC-018 and AC-019 and AC-021 (one gate per arrow, gate removal: replaced by AC-046), AC-022 (drop of a gate or a Connection onto the canvas: no toolbox), AC-023 (the toolbox contents: replaced by AC-047), the label parts of AC-014 to AC-016, and the toolbox parts of AC-012 and AC-024. AC-020 still applies (no true or false output; screens 02 and 03).

## Decisions these screens take

1. **The Pipeline tab has no toolbox; the canvas takes its space** (AC-047; screen 01). Start and End are not on this tab. The row of six boxes fits the canvas, so no strip is drawn.
2. **Arrows show no label and no gate mark** (AC-048; screens 01, 02, 14). A connection's artifacts, checks and approval flag are read from its panel.
3. **A connection's panel lists its artifacts, its checks and its Human approval checkbox** (screens 02 and 14). Each artifact row shows its label and a line of its template; each check has its own row with a Remove link.
4. **Add check and Add artifact open an add form in the panel**; the form's Cancel and save sit in the footer place (y 680–708), the same place as Delete on the other panels (screens 03, 09, 12, 13). Each add or edit form lists the saved rows of its list above it, so the user sees what exists.
5. **Refused values:** in an edit, the field keeps the saved value and the reason sits beneath it (screen 13; owner decision, AC-027); in an add form, the field shows what was typed, or stays blank, with the reason beneath (screens 03, 12).
6. **A new connection carries no artifacts and no checks, and Human approval is off** (screens 10, 14). The Connect to next flow button and the connection-point drag both create it this way (AC-014 and AC-012 as amended).
7. **One outgoing connection per flow.** A flow that already has its next flow shows Connect to next flow disabled, with the reason (screen 04). The picker on screen 07 lists every other flow; flow-2 is not listed (no self-connection). A choice that closes a loop is allowed and shows as a blocker (screen 06).
8. **Checks have no true or false output on this tab** (AC-020): the check form and its rows have no output field (screens 02, 03).
9. **A connection's panel has no Source flow or Target flow fields** (owner decision): the arrow shows its ends, and the panel lists only the artifacts, the checks and the Human approval checkbox (screens 02, 03, 12, 13, 14). The drag between flows is from one flow's connection point to another's (screen 10).
10. **Marks are colour and text together** (red blocker, amber warning), next to the item they name; a blocker never blocks an edit (screen 06).
11. **Delete asks first and names what goes with it** (screens 02, 05). Delete on a flow and on a connection both ask.
12. **Flow ids are file-safe** (decision 18): the new flow is `flow-2` (screen 07).

## Open points for layout review

1. **Arrows show no sign of approval or checks.** AC-048 says arrows show no label, and this set draws no mark either, so a person sees which connection stops for approval or has checks only by selecting it. Options: (a) keep: the panel is the only place; (b) add a small non-text icon per flag on the arrow (an icon to choose; not a label). Not drawn until decided.
2. **Connect to next flow disabled, or refused after the click** (screen 04). The button is drawn disabled with the reason, as F-08 does for Next on step 4. The old set left the question open; the amendment keeps the one-outgoing rule. Confirm the disabled form.
3. **New flow tab selected at once (AC-003) or not** (screen 07). AC-003 says the new flow's tab is selected at once, but this set keeps the Pipeline tab open with flow-2 selected in the panel. Which one? The tab row already draws flow-2 (not selected) after complete, with the + moved after it.
4. **A drag that closes a loop** (screen 10). The drop is drawn and then the loop shows as a blocker (AC-035). Should a drop that closes a loop be refused instead? The stories allow it.
5. **Flow id in the name field** (screens 04, 07). The new flow shows `flow-2` as its name, because the id is file-safe (decision 18). Should the name be free text with a separate id?
6. **Connect picker floats over the canvas** (screen 07). Should it open in place under the button instead?
7. **Text size 10 px** (visual review of the previous set, open point 1) still stands: the `tiny` class is used for the chips, hints and mark paths.
8. **Repointing a connection's end without a panel picker** (AC-015, owner decision). The panel no longer has Source flow or Target flow, so an end is moved only by dragging it onto another flow (not drawn in this set; screen 10 draws a new connection). Confirm the drag is the only repoint path, and that AC-015 is reworded from the panel to the drag.

## Amendment: core model change needed (open point, decision needed before the plan)

The amendment changes the shape of a connection. Today a connection holds one artifact label and at most one gate (approval or check). The amendment needs a connection to hold:

- a list of artifacts, each with a one-line label (required) and a template (may be empty and span lines);
- a list of checks, each with a description (required), a type (`checks` or `diff size`) and a threshold for `diff size` only;
- a Human approval flag (on or off), in place of the approval gate.

The label on the connection and the single gate go away. This changes the core model and so `architecture.md` §6 decision 33 (gate types in the schema), the core parser, the structural analyzer (the one-gate rule, the gate findings) and the generator. None of this is decided in this set. A recorded decision in `architecture.md` §5 is needed before `/plan F-11`, because the plan's tasks depend on the new shape. The screens show the new shape only; they do not settle the schema.

## Owner decisions, 2026-11-17

- **New connections by drag.** The drag between flows is from one flow's connection point to another's (screen 10; AC-012 as amended). The button path is Connect to next flow in the source flow's panel (screen 04; AC-014). Repointing an existing connection's end is by dragging the end onto another flow (AC-015 as amended by the owner decision; the panel has no picker; open point 8).
- **Refused values revert to the saved value** (AC-027). The field shows the saved value and the reason is beneath it (screens 09, 13). An add form shows what was typed (screens 03, 12).
- **Argument rows (T013a).** Screen 09 draws the row controls: Edit and Remove on each saved row, `+ Add` on the Arguments line, and Add and Cancel on an unsaved row. A refused edit keeps the saved row (its reason shows beneath it). The body limit reads `1000`, as in AC-028.
- **Flow name and id, the Connect button and the delete confirmation** as in the approved set: the name is not the id (AC-029), Delete flow asks first and names what goes with it (AC-031).

## Usability review

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

## Usability review (after the owner change)

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

## Visual review

## Visual review (after the amendment)

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

## Coverage check

Checked 2026-11-17 after the amendment, the owner change (no Source or Target fields) and both reviews.

- Every criterion AC-001 to AC-048 is named in this file: as shown on a screen (the table above), as proved by tests (the lists of criteria with no screen), or as superseded (the amendment's list).
- AC-043 to AC-048 each have a screen: AC-043 and AC-044 on 12 and 13 (and 02); AC-045 on 02 and 14; AC-046 on 02, 03 and 14; AC-047 on 01; AC-048 on 01, 02 and 14.
- Still-valid UI criteria with a screen: AC-001 to AC-009 and AC-011 on 01, 07 and 08; AC-012 on 10; AC-014 on 04 and 07; AC-015 open (no panel picker, see open point 8); AC-016 on 02; AC-020 on 02 and 03; AC-024 on 01; AC-025 to AC-034 on 01, 02, 04, 05, 07, 09 and 11; AC-035 to AC-039 on 06 (AC-039 by tests); AC-040 to AC-042 on 01 and 11 (AC-040 by tests).
- Device criteria: AC-006, AC-011 and AC-024 on 01; AC-012 on 10; AC-048 on 02 and 14. Each goes into the manual checklist at Verify.
- Every SVG passes xmllint --noout (14 files, 08 unchanged).

Gaps left open for the owner: AC-015 (repoint with no panel picker, open point 8), the empty artifacts state on a new connection (usability open point 1), and the 10 px text size (visual open point 1).

