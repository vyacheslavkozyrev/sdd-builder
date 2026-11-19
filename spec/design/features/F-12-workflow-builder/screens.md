# UX screens — Workflow builder (F-12)

Feature entry: `spec/documents/features.md` → F-12. The model is the draft `spec/documents/pipeline-schema.md` (section 7 holds the flow tab decisions of 2026-11-19); the frame is F-07 (`spec/design/features/F-07-ui-layout-template/`) and the flow tab's place is F-11 (`spec/design/features/F-11-pipeline-builder/`, screen 06).

Status: a **visual draft for finalising the pipeline schema**, redrawn on 2026-11-19 as a flow canvas. Six screens, not yet reviewed by `usability` and `visual`, and not approved. The open schema questions are listed below; each amber note names the question a drawing depends on.

Scope: step 3 of the wizard (Workflow), the flow tab of one flow (here `plan`). The flow is a canvas of blocks joined by arrows. Approval is a checkbox on the flow's panel in the Pipeline tab (F-11); the next flow is set there too. The flow tab has no flow-level checks: a check is a Condition on an arrow inside the flow.

## Decided by the owner (2026-11-19)

- The flow tab is a **canvas**, like the Pipeline tab. Start and End are circles; an Agent is a rounded box (name and one short description line); a Condition is a diamond on an arrow with two branches, **true** and **false**, and a short description of what it checks.
- **Start and End are kept.**
- **Checks are Conditions.** A pre-check is a Condition between Start and the first Agent; a check at the end is a Condition between the last Agent and End. There are **no flow-level checks**; the flow's checks are the Conditions in its tab.
- **The true branch goes to the next block.** It is not chosen; the screens show it read-only.
- **A false branch can return to any earlier Agent**, with a round limit shown on the arrow ("up to N rounds"). The limit is kept.
- **The toolbox floats** over the canvas, top-right, with **icon buttons** only (Agent, Condition, Link, Start, End); the names are tooltips.
- **No Move up or Move down.** The canvas orders the blocks by their arrows.
- Human approval stays a flow property (decision 38 in `pipeline-schema.md`).

## Layout grid and frame

Each SVG is 1280 wide and 1000 high; the caption gives the height.

- **Left panel** x 0–260, full height, white: wordmark at x 24, **New project** x 24–236 at y 72–112, the vertical stepper at x 40 (steps 1 and 2 done, step 3 current), **Prev** x 24–124 and **Next** x 136–236 at y H−72.
- **Tab row** y 24–56 from x 284: Pipeline, specify, ux, plan (selected), build, verify, complete, then **+**.
- **Canvas card** x 284–964, white, 12 px radius, from y 80 to H−68. The **toolbox** floats at the top-right of the card, x 732–940, y 96–140 (white, soft shadow, five 32 px icon buttons: Agent, Condition, Link, Start, End). The heading "plan" and the count "2 Agents, 2 Conditions" sit at the top-left, x 308. The flow is drawn on one row, centred on the card (its centre line is y 500): Start, pre-check, planner, reviewer, end check, End. A dashed arrow over the top is the return; a solid arrow under the row is the pre-check's false branch. The hint at the foot of the card (y H−92) says how to read the arrows.
- **Properties card** x 984–1256, white, same top and bottom. The title at y 118, the subtitle at y 136. Fields are 40 px high, 224 wide (rows of arguments and tools 192 wide, with the minus at x 1208); labels at 12 px muted.
- **Footer note** baseline H−35: "The work is not saved. It is lost when the browser is refreshed." at x 284; the caption "F-12 · screen N · step 3 of 4 · 1280 × H" right-aligned at x 1256.
- **Dialog** centred on the whole screen (x 440–840, y 392–560), with the whole screen dimmed behind it, the left panel and the tab row included.

## Visual style

The F-07 frame and F-11 look: Material Kit React (Devias IO, MIT licence; credit in `spec/documents/ui.md` §3.0 and `spec/documents/architecture.md` §5). Only the Material Kit colours are used: primary `#635BFF` (Next, the selected tab, the outline of an Agent box and of the Start circle, the return arrow); the selected block's outline `#635BFF` on tint `#ECF0FF`; page `#F0F4F8`; cards white with `#DDE7EE` borders; controls with `#CDD7E1` borders, 8 px radius; secondary buttons white with a border; text `#32383E` and `#636B74`; the Start outline `#635BFF` and the End outline `#32383E`, both circles on a white fill; a read-only field on `#F0F4F8`. True labels `#107569` (done green, text); false labels `#B84D05` (amber text, the same ink as the notes). Errors `#DE3024` (the refused field's border and text, and the Delete button fill). Amber notes `#B84D05` text on `#FFFAEA`. Font Inter, weights 400 and 500, on the 8 px grid.

## Legend

- **Rounded box with a name and a line of description:** an Agent. **Blue outline:** the selected block (tint `#ECF0FF`).
- **Diamond on an arrow:** a Condition. Its description sits above it (pre-check) or below it (end check), so that no arrow crosses the text.
- **Solid grey arrow:** the normal run order. **Dashed blue arrow:** a return, a false branch back to an earlier Agent; its round limit is written on it ("up to 3 rounds").
- **"true" (green) and "false" (amber):** the two branches of a Condition, at their outgoing arrows.
- **Circle on a white fill:** Start (blue outline, a play mark) and End (dark outline, a square mark). The two are told apart by their mark only; both are also toolbox buttons.
- **Toolbox icons:** rounded box = Agent; diamond = Condition; arrow = Link (joins two blocks with an arrow); circle with a play mark = Start; circle with a square = End. Names are tooltips only.
- **Read-only grey field** (True goes to): the next block, not chosen.
- **Field with a ▾:** a dropdown. **Field with − beside it:** a row of a list, with + above the list to add one.
- **Counter** under the body: characters used of 1000.
- **Red border and red text under a field:** a refused value and its reason, in the error style. The field keeps the saved value (as F-11 does); the reason names the refused value.
- **Delete block** (red) with "Asks first" beside it: a confirmation follows. On screens 01 to 06 it is pinned to the foot of the properties card (24 px above the card's bottom edge), as the Delete flow footer is on F-11's flow panel; on screen 05 the panel behind the dialog shows it in the same place.
- **Amber note:** a point of the draft that depends on an open schema question (its number is given in the note).

## Screens

| Screen | File | Shows | Covers |
|---|---|---|---|
| 01 | `01-flow-canvas.svg` | The canvas of plan with the toolbox: Start, pre-check, planner, reviewer, end check, End; the return arrow with "up to 3 rounds"; the pre-check's false arrow to End. End selected: outcome dropdown (done), produced artifact dropdown (plan.md), Delete block | The canvas grammar (circles, boxes, diamonds, branches, return); End properties |
| 02 | `02-agent-selected.svg` | The planner Agent selected: name, description, arguments rows, model, tools rows, body with the counter, Delete block | Agent properties; no move buttons; body at most 1000 characters |
| 03 | `03-condition-precheck-selected.svg` | The pre-check selected: what it checks ("The previous step is complete"), true goes to planner (read-only), false goes to End, stopped. No return, so no round limit | A Condition's description; true target fixed; a false branch that ends the flow |
| 04 | `04-condition-return-selected.svg` | The end check selected: what it checks ("The reviewer approves"), true goes to End (read-only), false goes to planner, round limit 3 rounds | A Condition's return target; the round limit kept |
| 05 | `05-delete-block-confirm.svg` | "Delete the planner block?" with "Are you sure you want to delete this block?" and "Its arrows are removed too.", Cancel and Delete (120 × 40), the whole screen dimmed | Delete asks first; the arrows go with the block |
| 06 | `06-agent-name-refused.svg` | The reviewer Agent selected with the name planner refused: error style, reason beneath, saved name kept, its box on the canvas keeps reviewer | Name unique among agents; a refused edit keeps the saved value |

## Drawings that differ from the brief or the schema

- Screen 01 selects End (not nothing) so that the End block's outcome and produced artifact are drawn on the canvas.
- The brief's example listed a check between planner and reviewer. Two Conditions are drawn instead: the pre-check and the end check, which carries the return. A check in the middle of the flow is possible in the model but is not drawn; say if the owner wants one.
- Screen 03: the pre-check's false branch ends the flow with the outcome "stopped" (End). The brief does not say what a false pre-check does; it is question 9.
- Screen 04: the round limit is a number field "3" with "rounds" beside it. The limit's range and default are question 10.
- Screen 05: the dialog is centred on the whole screen (x 440–840). The earlier draft centred it on the content area (x 570–970); the change follows the rule of the frame.
- Screen 06: the reason line sits 18 px under the name field, which leaves little space above the Description label. It is kept on the same grid as the other screens; `visual` may move it.
- Screen 01 shows Delete on End, enabled, as in the earlier draft (question 7).
- The Delete button is the Material Kit error colour `#DE3024`; F-11 used `#DE3024`. One colour is used for both now.
- The pipeline's arguments list (F-11) and the block arguments (F-12) are both drawn as rows (question 1).

## Schema questions

Each question is needed to finalise `spec/documents/pipeline-schema.md`. The screens draw the answer shown in the brief unless marked decided.

**Decided (2026-11-19):**

- **4. Links between blocks.** Decided: an Agent connects to another by an arrow; the flow's blocks are linked from Start to End (the schema's `next`). The screens draw the arrows.
- **Checks as Conditions, no flow-level checks, Start and End kept, the return limit kept, the toolbox with icons.** Decided; see the list above. Question 7 is only partly decided (below).

**Open:**

1. **Block arguments are rows.** The schema has `arguments` as one string on an Agent block (`blockAgent`). The screen draws rows with + and minus (id, required, hint, as the pipeline's arguments). Keep the string, or use argument rows?
2. **Agent tools as a list.** The schema has `tools` as a list of strings with no catalogue. The screen draws one row per tool, typed as free text. Is there a fixed list of tool names to pick from?
3. **Agent reads and writes.** Not in the schema and not drawn, as they are not in the brief. Does an agent block need them to declare what it reads and writes?
5. **The End block's produced artifact.** The schema stores a free string (up to 200 characters). The screen offers a dropdown of the flow's artifacts. Store the artifact's label (a rename breaks it) or an id on each artifact (the artifact has no id today)? Is "none" allowed?
6. **Scope of agent names.** The screen draws "unique among the pipeline's agents" (screen 06). Is the name unique across the whole pipeline or inside the flow? The rule is not in `pipeline-schema.md` section 3.
7. **Start and End, partly decided.** Start and End are kept. Still open: can a Start or End be deleted and added again (screens 01 and 05 leave Delete enabled on End, and the Start block is not drawn with a delete), and is one Start and one End per flow a rule?
8. **Agent blocks and a catalogue.** The brief says custom agents are Agent blocks. Is there a catalogue of built-in agents to pick from, or does every Agent block name its own agent? The screens assume the second.
9. **A false pre-check.** Screen 03 draws a false branch that ends the flow with the outcome stopped. Is that the rule, or may the false branch of a pre-check go to an Agent or be otherwise handled?
10. **The round limit.** Screen 04 draws a number of rounds (3) on the return arrow. What are the range and the default, and is the limit required on every false branch that returns?
11. **Deleting a block with arrows.** Screen 05 says the arrows are removed with the block. Or should the arrows be rewired (the block's predecessor to its successor)?
