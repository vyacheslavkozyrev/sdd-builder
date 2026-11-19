# UX screens — Pipeline builder (UI only) (F-11)

Feature entry: `spec/documents/features.md` → F-11. Stories: `spec/specifications/F-11-pipeline-builder/stories.md`, with the decisions of 2026-11-17 and 2026-11-18 consolidated in its section "UX and model decisions 2026-11-18 (consolidated)". The model is `spec/documents/architecture.md` §6 decisions 38 and 39; the UI rules are `spec/documents/ui.md` §3.

Status: the 10 screens (`01-` to `10-` in this folder, with `index.html`) are the set the owner approved. They are not changed by this note. Where a drawing differs from a decision, it is listed under **Drawings that differ from the decisions**.

Scope: step 3 of the wizard (Workflow). The **Pipeline** tab is the first tab and cannot be removed; one tab per flow follows, and a **+** button after the last tab adds a flow. The Pipeline tab has **no toolbox**: the canvas draws flows as boxes in one row and the arrows between them, and a flow is linked only by dragging. Selecting a flow opens its panel (name, description, arguments, model, body, outcome artifacts, checks and Human approval). Selecting an arrow opens a read-only panel with its source and target. The flow tab's blocks are a placeholder until F-12. Wireframes in SVG; colours and wording are placeholders where the look is not yet final.

## Layout grid and frame

Each SVG is 1280 wide; its caption gives its height. The app reference is 1280 × 800.

- **Left panel** x 0–260, full height, white: wordmark at x 24, y 24–48; **New project** x 24–236, y 72–112; the vertical stepper at x 40 (step 3 current); **Prev** x 24–124 and **Next** x 136–236 at y 728–768.
- **Content area** x 260–1280, full height, background `#F0F4F8`.
- **Tab row** y 24–56, from x 284: Pipeline first, then one tab per flow, then **+**.
- **Canvas card** x 284–964, white, 12 px radius; flows in one row. A hint line at y 112 and 130.
- **Properties card** x 984–1256, white. The title at y 112 and the subtitle at y 130. The content between y 146 and 676 **scrolls** (a thumb on its right edge); the footer buttons stay at y 684–712.
- **Footer note** inside the content area, baseline y 781: "The work is not saved. It is lost when the browser is refreshed." at x 284; the caption "F-11 · screen N · step 3 of 4 · 1280 × H" right-aligned at x 1256.
- **Dialogs** are centred on the content area (centre x 770, y 400) and dim the whole screen, left panel and footer included.

## Visual style

Look adapted from **Material Kit React** by Devias IO (MIT licence, github.com/devias-io/material-kit-react). No code is copied; the look is taken from its layout and theme. Credit: `spec/documents/ui.md` §3.0 and `spec/documents/architecture.md` §5.

- Primary `#635BFF` (hover `#4E36F5`, tint `#ECF0FF`): primary buttons, the selected tab, the selected flow and arrow, the Next button.
- Page `#F0F4F8`; cards white with border `#DDE7EE` and a 12 px radius; controls (buttons, fields, tabs, chips, flow boxes) an 8 px radius.
- Text `#32383E` (primary) and `#636B74` (secondary and small). Danger `#F04438`; refused text `#DE3024` on `#FEF3F2`. Success `#15B79F` (done steps), `#0E9382` for their labels. Warning `#FB9C0C`, text `#DE7101`, tint `#FFFAEA`.
- Font: Inter, weights 400 and 500; headings 500. The SVGs name Inter first in their font stack.

## Legend

- **Box with a name and a block count:** a flow. **Blue outline:** the selected flow. **Red border and light red background:** a flow with a blocker.
- **Arrow with no label:** a flow's `next`. **Blue arrow with two dots at its ends:** the selected arrow; the dots are the handles to drag an end onto another flow. Arrows carry no text and no mark.
- **Small circles on a box's left and right edge:** the connection points. The next flow is set by dragging the right point of the source onto the left point of the target. **Dashed blue line:** a drag in progress. **Dashed red box:** a drop refused, with the reason beside it.
- **Connection panel:** the source and the target as read-only grey boxes ("Source · read only", "Target · read only"), with the note that artifacts, checks and approval are in the source flow's panel.
- **Outcome artifact row:** bold label, the first line of the template in grey, and Edit and Remove links on the name line. **Template text area:** several lines tall, with the help text beneath it: "The template is the starting structure of this artifact: the headings or fields its file must have. The agent fills them in. May be empty."
- **Check row:** the check's free text, with a Remove link on its own row. No type, no threshold. With no checks the list reads "No checks yet."
- **Checkbox "Human approval":** ticked, the process stops for a person at the end of this flow; unticked, it does not.
- **Red text under a field:** a refused value and its reason. An edit keeps the saved value in the field; an add form shows what was typed.
- **Scroll thumb** on the properties card's right edge: the panel holds more than its height. The footer does not scroll.
- **Blocker callout** (red, "Blocker"): a structure mark. **Amber** ("Warning"): a warning, beside the item it names.

## Screens

| # | File | What it shows | Proves (criteria) | State |
|---|---|---|---|---|
| 01 | `01-pipeline-default.svg` | The Pipeline tab with the default pipeline: six flows in one row (specify, ux, plan, build, verify, complete), arrows with no label; no toolbox, the canvas takes its space; the pipeline properties (`feature-id` required, body 96 of 1,000); New project in the left panel | AC-001, AC-002, AC-004, AC-006 (device), AC-007, AC-008, AC-009, AC-011 (device), AC-041, AC-042, AC-047 (no toolbox), AC-048 (no label on arrows) | Default state after the wizard opens |
| 02 | `02-connection-selected.svg` | An arrow (build to verify) selected: the panel shows only Source and Target, read-only; the arrow's two ends carry handles (drag to repoint); the hint that artifacts, checks and approval are in the source flow's panel; footer Delete connection | AC-015 (ends repointed by drag), AC-016 (asks first), AC-025 (connection panel), AC-048 (no label; no artifact, check or approval field on the arrow) | Arrow selected; read-only |
| 03 | `03-flow-properties.svg` | The flow panel of verify: name, description, arguments, model, body (48 of 1000 characters); Outcome artifacts with one saved artifact (checklist.md, its template); Checks (1) with one saved check; Human approval ticked; footer Delete flow | AC-025 (flow panel), AC-043 (artifact with label and template), AC-045 (approval checkbox), AC-046 (check as text), AC-048 | Flow selected; panel scrolled |
| 04 | `04-delete-flow-confirm.svg` | The panel of plan with Checks (0) "No checks yet." and Human approval unticked; the confirmation "Delete flow plan?" with the text "Are you sure you want to delete this flow?", Cancel and Delete flow. The whole screen is dimmed behind it | AC-031 (delete asks first), AC-032 (the whole flow object goes) | Confirmation open |
| 05 | `05-add-flow.svg` | After **+**: flow-2 added, selected, with no blocks, not connected. The canvas is scrolled to the end of the row. Its blocker "flow-2 is not connected" with the hint "Connect it by dragging from its point to another flow". Its panel: name flow-2, description (optional), body (required, "No body yet.", 0 of 1000), Outcome artifacts, "No checks yet.", Human approval, Delete flow | AC-003 (new flow; tab order, open point 1), AC-004, AC-026, AC-031. The picker of AC-014 is not drawn: the next flow is set by drag | New empty flow; blocker |
| 06 | `06-flow-tab-placeholder.svg` | The verify tab opened: its name and block count, and the placeholder that its blocks are built in F-12. The card spans the content area, as the flow tab has no properties panel | AC-001 (tab order), AC-005 (placeholder; wording as AC-005 has it) | Flow tab placeholder |
| 07 | `07-properties-refused.svg` | Pipeline properties with two refused values: a repeated argument name (the reason names row 1, "feature-id is used by row 1. Not saved."); a body of 1,001 characters refused, while the field keeps the saved body (96 characters) and the counter shows its length | AC-025, AC-027 (refused values keep the saved value), AC-028 (body limit) | Two refused values; the reasons beneath each field |
| 08 | `08-connection-point-drag.svg` | The flow panel of complete with Checks (0) and Human approval unticked. A drag from complete's right connection point to specify's left one (dashed blue line). The drop on specify is refused: "Refused · this would close a loop. The flow would point back to an earlier flow." Nothing is added | AC-012 (connection-point drag between flows), the loop refusal of decision 38 (no AC yet, see Open points) | Drag refused; nothing added |
| 09 | `09-no-flows.svg` | Every flow deleted: the tab row shows Pipeline and +; the canvas says "No flows yet. Add one with + in the tab row."; the blocker "the pipeline has no flow" with "Add a flow with + to continue."; the pipeline properties, which cannot be removed | AC-033 (empty canvas), AC-036 (the blocker), AC-037 (no edit blocked) | Empty canvas; the blocker; no edit blocked |
| 10 | `10-artifact-edit-refused.svg` | The flow panel of plan with its artifact in edit: the label is cleared and refused ("Refused: the label is required."), the field keeps the saved label plan.md; the template is a multi-line text area with the help text beneath it; Cancel and Save in the footer | AC-043 (label required), AC-044 (a refused edit keeps the saved values; the reason beneath the field) | Edit form; refused edit |

Criteria with no screen, proved by tests: AC-010 (the saved configuration has no position key), AC-039 (the marks equal the analyzer's findings), AC-040 (no network call and no storage), AC-030 (one selected item at a time).

Superseded criteria, not drawn: AC-013, AC-017, AC-018 and AC-019 (the connection's label, the approval description, the check's type and threshold, the gate on an arrow), AC-021, AC-022, AC-023 (the toolbox and drop of a gate), the label parts of AC-014 to AC-016, and the toolbox parts of AC-012 and AC-024. AC-020 still applies: a check has no true or false output.

## Decisions these screens take

1. **The Pipeline tab has no toolbox**; the canvas takes its space (screen 01).
2. **Arrows show no label and no mark** (screens 01, 02, 08).
3. **A connection's panel shows only its source and target, read-only** (screen 02).
4. **A flow's panel holds the outcome artifacts, the checks and the Human approval checkbox** (screens 03, 04, 05, 08, 10). The panel scrolls, with its footer fixed.
5. **The next flow is set only by dragging a connection point** (screens 05, 08). No Connect button, no next-flow field, no Connection tool.
6. **Linear flow:** at most one outgoing arrow per flow. A second one is refused with its reason (the drag, not drawn here).
7. **No loops:** a drag that would close a loop is refused with its reason, and nothing is added (screen 08).
8. **Repoint by drag only** (screen 02).
9. **Blockers:** a flow with a blocker is red (border and light red background); its message is a notification at the top centre of the builder; "Not on a drawn item" stays a list under the canvas for items not drawn (decision of 2026-11-18f). The drawings place blockers as callouts (see Drawings that differ).
10. **Delete flow asks "Are you sure you want to delete this flow?"** and removes the flow with its artifacts, checks, approval and next. Flows that pointed to it lose that next (screen 04).
11. **Arguments and rule tags** are rows with a minus button, with **+** in the title row (screens 01, 07).
12. **Template help text** reads: "The template is the starting structure of this artifact: the headings or fields its file must have. The agent fills them in. May be empty." (screen 10).
13. **Body limit 1000 characters**, counted in code points (screens 03, 07). See the counter point below.
14. **"No checks yet."** is kept when a flow has no checks (screens 04, 05, 08, 10).
15. **Flow ids:** a new flow is `flow-N`, N the first number not used as another flow's id or name; its name starts as its id (screen 05).
16. **Structure of the screens:** 10 screens, numbered 01 to 10. The earlier numbers 04, 06, 12 and 14 are removed.

## Open points

These three are not decided by the owner.

1. **The tab after + (AC-003, screen 05).** AC-003 says the new flow's tab is selected at once. As drawn, the Pipeline tab stays open and flow-2 is selected on the canvas. Options: (a) keep it as drawn and change AC-003 to "the new flow is selected"; (b) select the flow-2 tab after + as AC-003 says, and draw that tab with its placeholder (screen 06 pattern), redrawing screen 05.
2. **Input height in the flow panel (screens 03 to 05, 07, 08, 10).** The flow panel uses 26 px inputs at a 46 px rhythm; screen 01 and the pipeline panel use 34 px at 56 px. Options: (a) keep 26 px, so more of the form fits the scroll window (as drawn); (b) use 34 px in every panel and accept a shorter visible form.
3. **Body counter on a refused body (screen 07). Decided: "1000".** The counter and the refusal are to read "1000" (no thousands separator) on every screen. Screens 01 and 09 read "1,000" and the refusal on 07 reads "the limit is 1,000". Not redrawn here; see Drawings that differ.

## Drawings that differ from the decisions

These are not changed here, because the screens are approved. The owner decides whether they are redrawn.

- **Blockers as callouts.** Screens 05 ("Blocker · flow-2 is not connected.") and 09 ("Blocker · the pipeline has no flow.") draw the blocker as a callout in the canvas. Decision 9 (2026-11-18f) puts the message at the top centre of the builder, with the flow box in red.
- **Body counter.** See open point 3.
- **Approval wording.** "Human approval: the process stops here for a person." (screens 03, 04, 05, 08, 10). Decision 1 says the process stops "at the end of this flow"; the wording should say so.
- **Delete connection (screen 02).** The footer's Delete connection removes an arrow. The owner's decisions do not say how a `next` is removed; this needs a decision.
- **Delete dialog heading (screen 04).** The heading "Delete flow plan?" is an extra line; decision 10 asks only "Are you sure you want to delete this flow?".

## Gaps not in the three open points

- The refusal of a loop has no acceptance criterion yet. AC-035 still says a loop is drawn and shown as a blocker after the drop; it needs rewording to match decision 7.
- Screen 06 and AC-005 name F-12 in the placeholder. The wording is for the owner (earlier open point).
- The 10 px hint text, the colour contrast of the done-step and warning text, and the border tone of fields and buttons were open points of the earlier reviews. They are not carried here; they are in git history (this folder up to commit `9f02b98`).
