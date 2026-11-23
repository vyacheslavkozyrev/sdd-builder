# UX screens — Workflow builder (F-12)

Feature entry: `spec/documents/features.md` → F-12. Stories: `spec/specifications/F-12-workflow-builder/stories.md` (9 stories, 53 criteria, approved 2026-11-23). The frame and the look are F-07 and F-11 (`spec/design/features/F-07-ui-layout-template/`, `spec/design/features/F-11-pipeline-builder/`).

Status: **approved by the user** on 2026-11-23, as drawn (the version before the usability and visual reviews). Fourteen screens. They replace the 2026-11-19 draft, which showed Condition-era flow tab details that the stories changed (Move buttons, a Link tool). Wireframes: layout, content and states only; colours, fonts and wording are placeholders.

Scope: step 3 of the wizard, the flow tab of one flow (here `plan`). The canvas holds the flow's blocks: Start, Agent, Condition and End. Arrows are drawn by dragging from one point to another, as on the Pipeline tab (F-11). Order comes from the arrows; there are no Move buttons. Each block has its own panel on the right.

## Decided by the stories (2026-11-23)

- Condition blocks are in F-12. The toolbox holds four icons: Agent, Condition, Start, End (no Link).
- Start is disabled while the flow has one, with the reason beside the toolbox.
- A flow keeps its Start. A flow keeps at least one End. Their Delete controls are disabled with the reason.
- The true route of a Condition is read-only (set by its arrow). The false route is one of three texts: stop (no arrow), goes to a later block, or returns to an earlier Agent with a round limit of 1 to 5.
- A refused drop or edit shows its reason in the message band (drops) or beneath the field (edits). A refused edit keeps the saved value.
- Panels are for one block at a time. Delete asks first and names what goes with the block.

## Layout grid and frame

Each SVG is 1280 wide and 1060 high.

- **Left panel** x 0–260, full height, white: wordmark, **New project**, the vertical stepper (step 3 current), **Prev** x 24–124 and **Next** x 136–236 at y 988.
- **Tab row** y 24–56 from x 284: Pipeline, specify, ux, **plan** (selected), build, verify, complete, then **+**.
- **Canvas card** x 284–964, white, 12 px radius, y 80–992. Heading "plan" and the count line at x 308 (y 112 and 130). The **toolbox** floats at the top right of the card, x 764–940, y 96–140. The refusal band sits under the count line, x 308, y 146–174. The reason for a disabled toolbox button sits under the toolbox, right-aligned at x 940, y 160.
- **Properties card** x 984–1256, white, y 80–992. Title y 118, subtitle y 136. Fields are 40 high, 224 wide (rows and chips 192 or 72–96 wide). The footer Delete button is at y 944–984, the disabled reason just above it at y 920.
- **Footer note** baseline y 1025: "The work is not saved. It is lost when the browser is refreshed." Caption at x 1256: "F-12 · screen N · step 3 of 4 · 1280 × 1060".
- **Dialog** x 440–840, y 392–560, centred on the whole screen, with the whole screen dimmed behind it (screens 07 and 14).

## Visual style

F-07 and F-11 look (Material Kit React colours as used there). Primary `#635BFF` (Next, the selected tab, the outline of the selected block, the return arrow); selected block on tint `#ECF0FF`; page `#F0F4F8`; cards white with `#DDE7EE` borders; controls with `#CDD7E1` borders, 8 px radius; text `#32383E` and `#636B74`. True labels `#107569` (green text); false labels `#B84D05` (amber text); errors `#BB241A` (refused field border and text, the message band, the Delete button fill); amber marks `#B84D05` text on `#FFFAEA`. Font Inter, weights 400 and 500, 8 px grid.

## Legend

- **Circle, blue outline:** Start. **Circle, dark outline:** End.
- **Rounded box with a name and a line of description:** an Agent.
- **Diamond with its description above it:** a Condition on an arrow. Its true arrow is labelled "true" (green); its false arrow is labelled "false" (amber). A false output with no arrow is labelled "false · stop".
- **Solid grey arrow:** a normal route. **Dashed blue arrow:** a return to an earlier Agent, labelled "up to N rounds".
- **Blue outline on a tint:** the selected block or arrow.
- **Red dashed line:** a drag that the flow refuses.
- **Amber box:** a structure mark (a finding on a block).
- **Grey disabled button with a reason:** a control that the flow refuses now; the reason is written beside it.

## Screens

| No. | File | What it shows | Criteria it proves |
|---|---|---|---|
| 01 | `01-flow-canvas.svg` | The flow tab with its blocks and arrows, nothing selected. Start disabled with its reason. | AC-001, AC-003, AC-007, AC-008, AC-009, AC-010, AC-011 (empty panel), AC-013, AC-017, AC-020 |
| 02 | `02-agent-selected.svg` | Agent panel: Name, Description, Arguments, Model, Tools, Reads, Writes, Rule tags, Body with counter, Delete block. | AC-002 (new Agent opens its panel), AC-022, AC-023, AC-024, AC-025, AC-026, AC-027, AC-028, AC-039 |
| 03 | `03-agent-name-refused.svg` | Name refused: another Agent has the name; the saved name stays. | AC-023 |
| 04 | `04-condition-selected.svg` | Condition panel: Description, read-only True route, False route text, round limit. | AC-030, AC-031, AC-032, AC-033, AC-039 |
| 05 | `05-round-limit-refused.svg` | Round limit 7 refused beneath the field. | AC-033, AC-050 |
| 06 | `06-link-refused.svg` | A drag from a non-false output back to an earlier Agent; the band states the reason. | AC-016, AC-019 (refused drop keeps the arrow), AC-015 (same band pattern), AC-018 (same band pattern) |
| 07 | `07-delete-block-confirm.svg` | Delete block confirmation for the reviewer: names the block and its two arrows; routes are cleared, not rewired. | AC-039, AC-040, AC-041 |
| 08 | `08-start-selected.svg` | Start panel: Delete block disabled with "A flow keeps its Start block."; toolbox Start disabled. | AC-042, AC-003 |
| 09 | `09-end-selected.svg` | End panel: Outcome (done, stopped), Produced artifact from the flow's artifacts, Delete block disabled with "A flow keeps at least one End block.". | AC-035, AC-036, AC-043 |
| 10 | `10-end-no-artifacts.svg` | End panel on a flow with no outcome artifacts: the field is empty and says to add one on the flow panel first. | AC-036 (empty case) |
| 11 | `11-flow-empty.svg` | A flow with no blocks: "No blocks yet.", count "0 Agents, 0 Conditions", Start enabled. | AC-006, AC-001 (Start enabled) |
| 12 | `12-structure-marks.svg` | An unlinked Agent "writer" with its findings on the canvas and in the panel; the panel is read-only. | AC-045, AC-047, AC-048 |
| 13 | `13-arrow-selected.svg` | Arrow panel: source and target read-only, Delete connection. | AC-011, AC-021 |
| 14 | `14-delete-connection-confirm.svg` | Delete connection confirmation: the arrow is removed, both blocks keep their properties. | AC-021 |

## Criteria with no screen

These are proved by tests, or by the same pattern as a screen. The checklist (`[device]`) covers the rest.

- AC-004 (ids), AC-005 (other flows unchanged), AC-014 (Start to End refused: band text as 06), AC-029 (Agent edits keep arrows), AC-034 (forward route has no round field: the panel of 04 with a later target), AC-037 (artifact removal refused: the F-11 flow panel, its screen 10 of F-11), AC-038 (more than one End), AC-044, AC-046 (the blocked flow box is on the Pipeline tab, F-11), AC-049 to AC-053 (state, tabs, memory only).
- AC-012, AC-007, AC-008 are `[device]`: the drag, the shapes and the arrow styles are checked on the drawn screens 01 and 06 in a real browser.

## Decisions taken with the approval (2026-11-23)

These open points were not reviewed separately; the approved screens show the drawn option for each, and the plan follows it.

1. **Last End.** Delete on an End is disabled with its reason only when it is the flow's last End (screen 09).
2. **Round limit.** The round field sits under the false route (screen 04).
3. **Structure marks.** The marks sit on the block (canvas) and as a read-only list in the Agent panel (screen 12).
4. **Empty flow.** "No blocks yet." in the canvas middle, with no hint line beside the toolbox (screen 11).
5. **Return arrow entry.** The return ends on the bottom edge of the Agent (screens 01 to 14). The browser check of AC-008 confirms it.
6. **Name.** The Agent name is file-safe and unique (AC-023), as drawn, and not marked required on the screen; the plan treats a blank name as refused.
7. **Reads and Writes.** As drawn, these are chips without an add or remove control. Rule tags have + and − as drawn. The approved screens do not show how to add or remove a Reads or Writes label, so the plan must add that control, in the Rule tags pattern, to meet AC-026.
8. **Dialogs.** Confirmations are centred on the screen (screens 07 and 14).
