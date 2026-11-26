# SDDBuilder — UI requirements

Status: revised 2026-11-18 with the owner's F-11 decisions (listed in section 9 and consolidated in `spec/specifications/F-11-pipeline-builder/stories.md`). The flow model is `architecture.md` §6 decisions 38 and 39; the block model of decisions 28 to 32 is superseded where section 9 says so. The default pipeline is in §11 and the structural rules in §12.

Scope: the MVP web app for **desktop browsers only**; reference size 1280 × 800. No mobile or tablet layout. Nothing the user enters is stored by the server, and nothing is kept after a browser refresh. The app is for internal use for now.

Look and feel: **Material UI** React components (recorded in `architecture.md` §5).

---

## 1. App layout

The layout is the same on every screen (F-07, approved 2026-11-20): a white **left panel** of 260 px beside a grey **content area**. It is drawn in `spec/design/features/F-07-ui-layout-template/` and the wizard screens in `spec/design/features/F-08-wizard-stepper/`. There is no header bar and no full-width footer.

**1.1 Left panel** (full height, x 0–260, white, with a 1 px border on its right edge)
- Top: the logo mark (a 24 × 24 px rounded square in the primary colour) and the wordmark **SDDBuilder**, in one row.
- **New project** (secondary button, the width of the panel) opens the wizard at step 1 and starts over at once. The Demo button is not in the MVP; presentation mode and demo are post-MVP (F-23 in `features.md`).
- **Wizard stepper** (F-08), under New project: the four steps in order, vertical, each with its title. The steps are **not clickable**; navigation is by Prev and Next only. A step is **done** (a green check mark and a green title), **current** (a violet number with a soft ring and a violet title) or **to do** (an outlined grey number and a grey title).
- At the foot of the panel: **Prev** and **Next**, side by side, each with its word inside. **Prev** is disabled on step 1. **Next** is shown on every step and disabled on step 4 (step 4 has no next step); a disabled button keeps its place.

**1.2 Content area and footer note** (x 260–1280, grey)
- The screen content sits on a white card, 24 px from the panel edge and from the window's right edge, with a soft shadow.
- Below the card, 24 px under it, the footer note: "The work is not saved. It is lost when the browser is refreshed." It is shown on every screen. It is a note, not a control, and holds no button or link.

**1.3 Wizard frame** (after New project)
- The stepper, Prev and Next are in the left panel (§1.1). The step body is the white card of §1.2.
- Each step body shows a sparkle mark in a light circle and the line "The content of this step is added in a later feature." It shows no step title and no step counter (the stepper names the step), and no input field, until F-09 to F-13 replace it.
- **Prev** is disabled on step 1. **Next** is disabled on step 4 (step 4 has no next step). Next is never disabled by the content of a step (a blank project name does not block Next).

---

## 2. Wizard steps

### Step 1 — Project
- **Project name**: single-line text field, required. Limit **100 characters**, counted in code points (an emoji counts as one); typing or pasting past the limit keeps the first 100 characters. No counter is shown. Stored as typed; spaces only are kept. A blank name does not block Next; the analysis reports it.
- **Idea**: multi-line text field, required. Limit **5,000 characters**, counted in code points (an emoji counts as one). A counter shows `N / 5,000`. Typing or pasting past the limit keeps the first 5,000 characters. The stored idea keeps its spaces and line breaks as typed; when the configuration is built, the idea is trimmed of leading and trailing whitespace (internal line breaks are kept), and spaces only become an empty idea.
- Help text as on the approved screen 01.

### Step 2 — Technical details
- **Stack**: language (required); framework, platform, build tool and test framework (optional). Each is a single-line text field limited to **100 characters**, counted in code points (an emoji counts as one); typing or pasting past the limit keeps the first 100 characters.
- **Architecture**: multi-line text field, optional. Limit **5,000 characters**, counted in code points.
- **Rules** (a list of rule blocks):
  - Each block has a **name** (single line, limited to **100 characters**, counted and cut as in the stack fields), stored as the rule's `title`, and a **description** (multi-line), stored as its `text`. Each description is limited to **1,000 characters**.
  - Each block shows its file name `.claude/rules/<name>.md`, the name the generator writes (F-16 AC-029): the title in lower case, with each run of characters that is not a letter or digit replaced by one hyphen and the ends trimmed. `Testing!` gives `testing`; `Café` gives `café`; `2 tests` gives `2-tests`.
  - A name with no letter or digit (blank, spaces only, or only symbols) has no file name. The block shows "Needs a letter or digit." in place of the file name, and no file name.
  - A file name longer than 60 characters shows "The id is longer than 60 characters." in place of the file name.
  - If more than one of these applies, the first one listed above is shown. In each of these cases the block is kept as typed, and Next stays enabled; the analysis reports the no-letter case (F-16 AC-029).
  - **Add rule block** appends one empty block after the last one. **Remove block** removes that block only; the others keep their order.
  - At most **60** blocks. At 60, Add is disabled and the reason is shown beside it: "Limit reached: 60 of 60 rule blocks. Remove a block to add one."
  - Two blocks whose names give the same file name each show "Same file as rule block N. Both are kept.", N being the other block's number (F-16 AC-029).
  - The list starts empty. The app never adds a rule block by itself.

### Step 3 — Workflow
See section 3.

### Step 4 — Analyze and generate
Two areas on the step:

**Analyze block**
1. **Privacy notice** with a checkbox, above Analyze. Unticked at start. Analyze is disabled until it is ticked; unticking disables Analyze again. The notice says that the brief and the pipeline go to the model provider for review, and that the server does not store or log the brief (2026-11-24: the wording says "model provider"; screen 01).
2. **Analyze** calls `POST /analyze` (F-14) with the project configuration, once per press (2026-11-24). While it is pending, Analyze is disabled.
3. **Findings** are listed in the order the server returns them. Each shows its severity (`blocker`, `warning`, `info`), its subject and its message, as plain text. A review that is skipped or failed is an **error**, not a pass (2026-11-24, architecture decision 41): the note "The analysis did not finish. Analyze again." is shown beside the findings, the structural findings are still shown, and Generate stays disabled (screen 05). An error reply (400, 422, 429, 500, 502 or a network failure) is shown as text in an error box and the entered values are kept; a 422 lists every problem, one line per problem (screens 07 and 09).
4. The analysis is **green** when it has run on the current configuration, its review has completed, and it finds **no blocker and no warning**. An `info` finding does not stop it.
5. **Out of date** (2026-11-24, screen 10): after a change to the configuration, the earlier result is shown as not current, with the note "The project changed since the last analysis. Analyze again." Until Analyze runs again, the analysis is not green.

**Project preview**
- The file tree of the project: the files the project will get, in plan order. Files that come from rule blocks are marked. The tree is computed in the browser, without a request.
- One button, **Generate and download**: enabled only when the analysis is green and current. Its reason is shown beside it when it is disabled: "Run Analyze first", "Fix the blocker to generate", "Fix the warning to generate" or "Analysis failed. Analyze again to generate." (screens 01 to 05, 10 and 11). On press it calls `POST /generate` (F-15) (2026-11-24); while it is pending the button reads "Writing the files with the model…" with a progress line, and Analyze, the checkbox and Show full tree are disabled (screen 08). It saves the zip file `sddbuilder-project.zip`.
- Any change to a field, a rule block or the pipeline makes the analysis out of date. The button is disabled until Analyze runs again and is green.

---

## 3. Step 3 — Workflow builder

The screens are in `spec/design/features/F-11-pipeline-builder/` (10 screens, numbered 01 to 10). The rules are in `spec/specifications/F-11-pipeline-builder/stories.md`: its owner decisions at the top, its stories US-001 to US-008 and its requirement coverage. The flow model is `architecture.md` §6 decisions 38, 39 and 40, and `spec/documents/pipeline-schema.md`.

### 3.0 Layout and look
- The step uses the wizard frame of section 1.3, drawn as on screen 01: a white left panel (260 px) with the wordmark, **New project**, the vertical stepper and **Prev** and **Next** at its foot; the content area beside it is grey (`#F0F4F8`) with white cards. This replaces the header bar of section 1.1 on this step, and the footer note of section 1.2 sits inside the grey area, 24 px below the cards, with its caption.
- Inter font. Primary `#635BFF`. An 8 px grid. Controls have an 8 px radius; cards a 12 px radius.
- The look is adapted from **Material Kit React** by Devias IO (MIT licence, github.com/devias-io/material-kit-react). No code is copied and no package is added (`architecture.md` §5).
- The properties panels scroll. Their footer buttons (Delete flow, Delete connection, Save and similar) stay in place.
- The window height bounds this step (F-11 AC-006, layout points 1 to 3): the tab row sits on the grey area above the two white cards, with no white card behind it. The canvas card, which holds the Pipeline title and the hint above the canvas, and the properties card fill the height under the tab row. The page does not scroll vertically; only the content of the properties card scrolls.

### 3.1 Tab row
- Full width of the available space. The first tab is **Pipeline** (the whole process); it cannot be removed.
- One tab per **flow**, in pipeline order. A **+** button after the last tab is the only way to add a flow.
- A new flow gets a generated GUID **id**, fixed at creation and never typed or shown. Its **name** starts as `flow-N`, N the lowest positive number such that no flow is named `flow-N`. The name is free text, non-blank, and unique among the flow names; the Name field changes the name only. The name, not the id, names the generated file `.claude/commands/<flow file name>.md`, the name in lower case with each run of characters that is not a letter or digit replaced by one hyphen (F-16 AC-013). A name whose file name is `pipeline` is refused (`architecture.md` §12).

### 3.2 Pipeline tab
- **No toolbox.** The canvas takes all the space left of the properties card. The Connection, Approval and Check tools are removed; gates are not dropped on arrows.
- **Canvas:** each flow is a box with its name and its block count. The flows are laid out in one row, left to right, in pipeline order. Boxes are laid out automatically and no position is saved.
- **Arrows are the flow's `next`.** To set one, drag from the **right** connection point of the source flow to the **left** connection point of the target flow. This is the only way to set a `next`: there is no button, no next-flow field and no toolbox item (owner decision, 2026-11-18).
- **Linear.** A flow has at most one outgoing arrow. A drag that would give a second one is refused with its reason, shown at the top centre of the builder, and nothing is added. A link that would close a loop, including a flow to itself, is refused with its reason in the same place, and no loop is drawn.
- **Repoint** an arrow's end by dragging it onto another flow. The same refusals apply.
- **Arrows show no label and no mark.** Selecting an arrow opens the **connection panel**. It shows only the source and target, read-only, with the note that artifacts and approval are in the source flow's panel. Its footer has **Delete connection**, which asks first and removes only the link: the source's `next` is cleared, and both flows keep their other fields. Cancel keeps the arrow.
- **Properties panel** (right, fixed width): the pipeline's panel when nothing is selected; the flow's panel when a flow is selected; the connection panel when an arrow is selected. One item is selected at a time.
- **Flow panel**, fields in this order: the file it generates; **Name** (required, non-blank, unique among the flow names); **Description** (optional, at most 1000 characters); **Arguments** (optional; rows, each with a name that is typed and shown as the hint of at most 100 characters, and a required flag; the id is a generated GUID and is never typed or shown; each row has its own minus button, and **+** is in the title row; each row has a **required** checkbox beside its minus, which saves the flag through the parser; **+** adds one line with a text box and a required checkbox (unticked: a new argument starts unrequired), the line's text is the argument's name: the line is saved on blur or Enter with a new GUID id, the typed name as its hint and the flag the box shows; a name with no letter or digit stays open with the reason "Needs a letter or digit." beneath it; a blank line is discarded with no message; a saved name is edited in place); **Model** (`haiku`, `sonnet`, `opus`, `inherit`, or unset); **Body** (required, at most 1000 characters, with a counter "n / 1000"); then
  - **Outcome artifacts:** each has a **label** (one line, required, non-blank) and a **template** (several lines, may be empty, at most 5000 characters). The help text beneath the template reads: "The template is the starting structure of this artifact: the headings or fields its file must have. The agent fills them in. May be empty." Add, edit and remove; each artifact is edited and removed on its own row.
  - **Rule tags:** rows with a dropdown that offers only the rules of Technical details, each row with its own minus button, and **+** in the title row. A rule tag not in that list is refused.
  - **Human approval:** a checkbox. Ticked, the process stops for a person at the end of this flow.
  - **Footer:** **Delete flow**. The flow panel has no checks section and no next-flow field.
- **Pipeline panel**, fields in this order: name; description (optional, at most 1000 characters); arguments (rows as in the flow panel; `feature-id` is required in the default pipeline); model; tools; rule tags (as in the flow panel); body (optional, at most 1000 characters, with a counter "n / 1000"). The pipeline cannot be removed.
- **Delete flow** asks first and, once confirmed, removes the whole flow object: its artifacts, arguments, approval, rule tags, blocks and its own `next`. A flow that pointed to it loses that `next`; the other flows keep all their fields. The confirmation asks only "Are you sure you want to delete this flow?". Cancel keeps the flow and its selection.
- An edit that is refused keeps the saved value and shows the reason beneath the field (or the row). An add form shows what was typed.

### 3.3 Flow tab (F-12)
- The flow tab holds the flow's **blocks only**. Approval and artifacts are on the flow's panel, not here (`architecture.md` §6 decision 38). A check is a Condition block on this tab.
- **Toolbox:** a floating card at the top right of the canvas with four icon buttons, **Agent**, **Condition**, **Start** and **End**, each named by a tooltip. There is no Link, Move, Connection or Delete-flow control. **Start** is disabled while the flow has one, with the reason "This flow already has a Start block." shown beside the toolbox.
- **Adding:** a press adds one block of that kind to the flow and selects it; its panel opens. A new block gets a generated GUID id, never typed or shown. A new block has no arrows. A flow with no blocks shows "No blocks yet." on the canvas.
- **Arrows** are made by dragging from an output point (the right point of a block) to an input point (the left point) of another block of the same flow; there is no Link button. Outputs: Start one, Agent one, Condition two (true and false), End none. Inputs: Agent, Condition and End one each; Start none. A refused drop keeps the arrow as it was and shows its reason in the message band. Selecting an arrow opens its panel: the source and target, read-only, and **Delete connection**, which asks first and removes only that arrow.
- **Order:** the canvas places the blocks in the order of their arrows, from Start, and places the **End** after every other block. The order comes from the arrows: there are no Move up or Move down buttons.
- **Routes:** an Agent's output and a Condition's true output link only to a later block. A Condition's false output can link to a later block, or return to an earlier Agent: a return is drawn dashed and labelled "up to N rounds". "Later" and "earlier" are the arrow order from Start, with the End counted as a block (owner, 2026-11-24), the same order the analyzer and the drawing use. An output with no arrow means "No arrow yet" for an Agent or a true output, and "Stop the flow and ask the user" for a false output.
- **Delete block:** every block's panel has **Delete block**. It asks first and names the block and the number of arrows that will be removed. A confirmed delete removes the block and its arrows; a block that routed to it has that route cleared, and no arrow is rewired. The flow's Start cannot be deleted, and neither can its last End; each has its Delete control disabled with the reason (§4).
- **Switching tabs** keeps each flow's blocks and arrows, and the flow's own blocks never change when another flow is edited.
- **Structure marks:** a finding on a block or an arrow is shown on it, and the block's panel lists its findings. Marks never block an edit (§3.4).
- **Open points** (stated, not decided; see F-12 `progress.md`, "Open for approval" and the Task Log):
  - The reason for the last End's disabled Delete control: the stories (AC-043) say it is shown beside the control; the build shows it beneath the button.
  - Selection on a tab switch (AC-049): the stories say each flow keeps its own selection; the build clears the selection each time the tab changes.
  - The subtitle of the block-arrow panel ("An arrow only points one block to another.") is new wording, not in the stories or the approved screens.
  - The colour of a blocker on the canvas: amber, as a warning is, or red, as a blocker on a flow box is on the Pipeline tab.

### 3.4 Structure marks
- A **blocker on a flow** (for example a flow with no link, `architecture.md` §12) is shown as a red border and light red background on the flow's box. Its message is listed in the **error panel** (below). Blockers disable no control: editing, Delete flow, Delete connection, **+** and the drags stay available.
- A **warning** is shown beside the box or arrow it belongs to, with its message (amber), and is also listed in the error panel.
- The **error panel** sits in the header of the canvas card, on the right, so it covers no box while closed. It shows one counter for all blockers and warnings ("3 errors · 2 warnings"). A click opens the full list: each finding with its kind, its path and its message. The list closes on the next click.
- A problem whose item is not drawn (a block inside a flow, or the pipeline as a whole, or a flow missing its body) is listed in the error panel's list, in a section **Not on a drawn item**, with its path and message.
- Each mark is the analyzer's message (`analyzeStructure`, `architecture.md` §12); the builder adds no wording of its own.
- Brief problems (name, idea, stack, rules) are not shown on the Pipeline tab; they appear at Analyze.
- Marks never block an edit.

## 4. Blocks and flow properties in the UI

| Item | Added on | Properties | Generated as |
|---|---|---|---|
| **Start** | Flow tab only (one per flow) | none. Delete block is disabled with "A flow keeps its Start block." | — |
| **Agent** | Flow tab | name (file-safe; unique among the Agent names of the pipeline; a clash is refused "Another Agent already has this name."); description (required, not blank, at most **1000 characters**); arguments (rows as on the flow panel: name, required flag, hint); model (`haiku`, `sonnet`, `opus`, `inherit`); tools (rows, each removed with its minus, each listed once; amended 2026-11-24: there are no reads and writes rows); rule tags (rules of the project); body (required, not blank, at most **1000 characters**) | `.claude/agents/<name>.md` |
| **Condition** | Flow tab only (a check) | description (required, not blank, at most **1000 characters**); true route, read-only: "Next: <block>" or "No arrow yet"; false route, as text: "Stop the flow and ask the user" (no arrow, the default), "Goes to <block>" (a later block) or "Returns to <block>, up to N rounds" (an earlier Agent); round limit (an integer from 1 to 5, required, shown only for a return) | The check and its two routes in the flow's command |
| **End** | Flow tab only (one or more) | outcome (`done` or `stopped`, required; a new End starts with `done`); produced artifact (required: one of the flow's outcome artifacts; "none" is not offered; with no outcome artifact the field reads "Add an outcome artifact on the flow panel first."). Delete block is disabled on the flow's last End with "A flow keeps at least one End block." | The last step of the flow's command |
| **Flow** | Pipeline tab, with **+** | id (a generated GUID, never typed or shown; fixed); name (required, non-blank, unique; a new flow is named `flow-N`); description (optional, at most 1000 characters); arguments (optional; name, required flag, hint); model; body (required, at most **1000 characters**); outcome artifacts; rule tags; Human approval. No next-flow field: `next` is set by dragging (§3.2) | `.claude/commands/<flow file name>.md` |
| **Outcome artifact** | Flow panel | label (one line, required, non-blank); template (several lines, may be empty, at most 5000 characters) | The hand-over named in the flow's command |
| **Human approval** | Flow panel (a checkbox) | on or off. On: the process stops for a person at the end of the flow | A human-approval step at the end of the flow's command |
| **Connection** | Pipeline tab (an arrow between two flows) | none editable: the source and target are shown read-only; Delete connection removes the link. It is the flow's `next` | The order of the flows (how the generator writes it is set in the parser plan) |
| **Pipeline** | Pipeline tab (properties panel) | name; description (optional, at most 1000 characters); arguments (name, required flag, hint; `feature-id` in the default pipeline); model; tools; rule tags; body (optional, at most **1000 characters**) | `.claude/commands/pipeline.md` |

- Every block and every flow is checked and generated. There is no switch-off (`architecture.md` decision 34).
- An Agent's **arguments** are rows, as on the flow panel: a name, a required flag and a hint. The hint can say the loop the agent runs in (for example "for each task in `plan.md`").
- Approval is no longer a block: it is a checkbox on the flow (owner decision, 2026-11-18; `architecture.md` decision 38).
- Check is not a flow property at all. There is no checks list on the flow panel (owner decision, 2026-11-19 and 2026-11-20). A check is a Condition block on the flow tab, built in F-12 (`architecture.md` decision 40).

---

## 5. Interaction rules
- **Selection:** one item at a time. Its properties show in the right panel.
- **Adding a flow:** only with **+** on the tab row. **Adding a block:** the toolbox adds the block to the flow and selects it; the canvas then places the End last (§3.3).
- **Setting a next flow:** only by dragging a connection point onto another flow. There is no button path (owner decision, 2026-11-18; this replaces the button path of the earlier rules).
- **Refusals** are shown inline and keep the previous value. A link refused for a second outgoing arrow, a loop or a self-link is refused with its reason on the canvas, and nothing is added.
- **Delete** always asks for confirmation.
- **Structure marks never block an edit** (§3.4).

---

## 6. Limits (summary)

| Field | Limit |
|---|---|
| Project name | 100 characters (code points), single line, required |
| Idea | 5,000 characters (code points), required |
| Stack fields (all five: language, framework, platform, build tool, test framework) | 100 characters (code points), single line |
| Architecture | 5,000 characters (code points), optional |
| Rule block name | 100 characters (code points), single line |
| Rule block id | a generated GUID, never typed; the file name is derived from the name: starts with a letter, at most 60 characters; a refused name shows a message and does not block Next |
| Rule block description | 1,000 characters |
| Agent body | 1000 characters (code points) |
| Flow body | 1000 characters (code points), required |
| Flow description | 1000 characters (code points), optional |
| Pipeline body | 1000 characters (code points), optional |
| Pipeline description | 1000 characters (code points), optional |
| Flow name | non-blank, unique among the flow names |
| Argument hint (flow and pipeline) | 100 characters (code points) |
| Artifact label | one line, non-blank, required |
| Artifact template | 5000 characters (code points), may be empty |
| Rule blocks | 60 |

The body limit is written **1000** everywhere (owner decision, 2026-11-18; the stories of 2026-11-20 keep it for the flow and the pipeline). The parser counts code points.

---

## 7. Desktop only
- Reference layout 1280 × 800. Down to 1024 px wide the left panel keeps its 260 px and the content card takes the rest (F-07 screen 02). Narrower than 1024 px the page scrolls horizontally; it does not reflow into a phone column, and the left panel does not collapse. The app is not laid out for phones or tablets in the MVP.

---

## 8. What this document does not define
- The block model, the default pipeline and the structural rules: `architecture.md` §6, §11 and §12.
- The technology and the decisions: `architecture.md`.
- Presets: F-09, after the MVP.
- The text of the generated files: F-02 and F-03.

---

## 9. Decisions and deferred items

| # | Item | Status |
|---|---|---|
| D1 | The **Demo** button | Decided 2026-11-16: not shown until the demo feature exists (post MVP, F-23). |
| D2 | Body limit 1000 characters for every body, agent bodies included | Decided 2026-11-16; written **1000** everywhere from 2026-11-18. |
| D3 | Connection is a toolbox item on both tabs; ends can be repointed | Superseded 2026-11-18: no toolbox item. An arrow is set and repointed by dragging only (D13). |
| D4 | Start and End exist only on flow tabs; the pipeline's arguments are in its properties panel | Decided 2026-11-16; stands. |
| D5 | Approval and Check are different blocks; Check has true and false outputs | Superseded 2026-11-18: Approval is a checkbox on the flow and Check is free text on the flow; no true or false output (`architecture.md` decision 38). |
| D6 | No scope field; the loop (per feature, per task) is written in the arguments | Decided 2026-11-16; stands. |
| D7 | Desktop only | Decided 2026-11-16; stands. |
| D8 | Green means no blocker and no warning | Decided 2026-11-16; stands. |
| D9 | A flow is one JSON object (id, name, description, arguments, model, body, blocks, artifacts, checks, approval, next); there is no connection object | Decided 2026-11-18 (`architecture.md` decision 38). |
| D10 | The pipeline is linear (at most one `next` per flow); a link that closes a loop is refused with its reason | Decided 2026-11-18 (`architecture.md` decision 38). |
| D11 | A flow requires a name and a body; a flow must be connected unless the pipeline has one flow | Decided 2026-11-18 (`architecture.md` decision 39). |
| D12 | Arrows show no label; artifacts, checks and approval are in the flow's panel; the connection panel is read-only | Decided 2026-11-18. |
| D13 | `next` is set only by dragging the right connection point of a flow onto the left one of another flow; no button, no field, no toolbox | Decided 2026-11-18. |
| D14 | The Pipeline tab has no toolbox; gates are not dropped on arrows | Decided 2026-11-18. |
| D15 | Delete flow removes the whole flow; the flows that pointed to it lose that `next`; the confirmation asks "Are you sure you want to delete this flow?" | Decided 2026-11-18. |
| D16 | A flow with a blocker is red (border and light red background); its message is listed in the error panel (one counter, opened by a click, in the canvas card header); "Not on a drawn item" is a section inside that list. A refused drag or repoint stays one line at the top centre. | Decided 2026-11-18; the panel replaces the stacked band by Amendment 2026-11-21 (T025). |
| D17 | Layout after the Material Kit look (MIT, attribution in §3.0 and `architecture.md` §5); arguments and rule tags as rows with a minus button and **+** in the title row | Decided 2026-11-18. |
| D18 | Checks: "No checks yet." when a flow has none; a new flow is named `flow-N` | Decided 2026-11-18; amended 2026-11-25 (ids are GUIDs, F-16). |
| D19 | Screens: 10 screens, numbered 01 to 10 (`spec/design/features/F-11-pipeline-builder/screens.md`) | Decided 2026-11-18. |
| D20 | The `Connect to next flow` button, the next-flow field, the Connection tool and the picker of the earlier screens | Removed 2026-11-18 (D13). |
| D21 | The pipeline panel holds name, description, arguments, model, tools, rule tags and body (body optional); the stories follow the approved screens | Decided 2026-11-20 (user decision, option 1; US-008). |
| D22 | Rule tags are on the flow panel, after the outcome artifacts and before Human approval | Decided 2026-11-20 (owner decision; kept from 2026-11-18, item 11). |
| D23 | Delete connection is on the connection panel, after a confirmation; it removes only the link (the source's `next` is cleared), and Cancel keeps the arrow | Decided 2026-11-20 (owner decision 2026-11-18g; to be confirmed at approval). |
| D24 | Delete flow is in the flow panel footer, with the confirmation of D15; it removes the flow with its artifacts, arguments, approval, rule tags and blocks | Decided 2026-11-20. |
| D25 | No checks on the flow panel; a check is a Condition block on the flow tab (F-12) | Decided 2026-11-19 (screens, decision 17); the stories record it as 2026-11-20. The date is to be confirmed. |
