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
  - Each block shows its file name `.claude/rules/<id>.md`. The id is the name in lower case, with each run of characters outside `a–z` and `0–9` replaced by one hyphen.
  - A name with no letter or digit (blank, spaces only, or only symbols) gives no id. The block shows "Needs a letter or digit." in place of the file name, and no file name.
  - An id that does not start with a letter (for example `2 tests` gives `2-tests`) shows "The id must start with a letter." in place of the file name.
  - An id longer than 60 characters shows "The id is longer than 60 characters." in place of the file name.
  - If more than one of these applies, the first one listed above is shown. In each of these cases the block is kept as typed, and Next stays enabled; the analysis reports it.
  - **Add rule block** appends one empty block after the last one. **Remove block** removes that block only; the others keep their order.
  - At most **60** blocks. At 60, Add is disabled and the reason is shown beside it: "Limit reached: 60 of 60 rule blocks. Remove a block to add one."
  - Two blocks whose names give the same id both show a duplicate-id message; both are kept as entered.
  - The list starts empty. The app never adds a rule block by itself.

### Step 3 — Workflow
See section 3.

### Step 4 — Analyze and generate
Two areas on the step:

**Analyze block**
1. **Privacy notice** with a checkbox, above Analyze. Unticked at start. Analyze is disabled until it is ticked; unticking disables Analyze again.
2. **Analyze** sends the project configuration once. While it is pending, Analyze is disabled.
3. **Findings** are listed in the order the server returns them. Each shows its severity (`blocker`, `warning`, `info`), its subject and its message, as plain text. A review that is skipped or failed is noted beside the findings; the structural findings are still shown. An error (400, 422, 429, 500, 502 or a network failure) is shown as text and the entered values are kept; a 422 lists every problem.
4. The analysis is **green** when it has run on the current configuration and finds **no blocker and no warning**. An `info` finding does not stop it.

**Project preview**
- The file tree of the project: the files the project will get, in plan order. Files that come from rule blocks are marked. The tree is computed in the browser, without a request.
- One button, **Generate and download**: enabled only when the analysis is green. It generates the project and saves the zip file `sddbuilder-project.zip`.
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
- A new flow gets an **id** `flow-N`, N the first number not used as another flow's id or name. Its **name** starts as its id. The id is file-safe, is fixed at creation, and names the generated file `.claude/commands/<id>.md`. The id `pipeline` is refused (`architecture.md` §12). The name is free text, non-blank, and unique among the flow names; the Name field changes the name only.

### 3.2 Pipeline tab
- **No toolbox.** The canvas takes all the space left of the properties card. The Connection, Approval and Check tools are removed; gates are not dropped on arrows.
- **Canvas:** each flow is a box with its name and its block count. The flows are laid out in one row, left to right, in pipeline order. Boxes are laid out automatically and no position is saved.
- **Arrows are the flow's `next`.** To set one, drag from the **right** connection point of the source flow to the **left** connection point of the target flow. This is the only way to set a `next`: there is no button, no next-flow field and no toolbox item (owner decision, 2026-11-18).
- **Linear.** A flow has at most one outgoing arrow. A drag that would give a second one is refused with its reason, shown at the top centre of the builder, and nothing is added. A link that would close a loop, including a flow to itself, is refused with its reason in the same place, and no loop is drawn.
- **Repoint** an arrow's end by dragging it onto another flow. The same refusals apply.
- **Arrows show no label and no mark.** Selecting an arrow opens the **connection panel**. It shows only the source and target, read-only, with the note that artifacts and approval are in the source flow's panel. Its footer has **Delete connection**, which asks first and removes only the link: the source's `next` is cleared, and both flows keep their other fields. Cancel keeps the arrow.
- **Properties panel** (right, fixed width): the pipeline's panel when nothing is selected; the flow's panel when a flow is selected; the connection panel when an arrow is selected. One item is selected at a time.
- **Flow panel**, fields in this order: the file it generates; **Name** (required, non-blank, unique among the flow names); **Description** (optional, at most 1000 characters); **Arguments** (optional; rows, each with an id that is file-safe and unique within the flow, a required flag and a hint of at most 100 characters; each row has its own minus button, and **+** is in the title row; each row has a **required** checkbox beside its minus, which saves the flag through the parser; **+** adds one line with a text box and a required checkbox (unticked: a new argument starts unrequired), which is saved when its id is accepted on blur or Enter, with the id as its hint and the flag the box shows, and a blank line is discarded; a saved id is edited in place); **Model** (`haiku`, `sonnet`, `opus`, `inherit`, or unset); **Body** (required, at most 1000 characters, with a counter "n / 1000"); then
  - **Outcome artifacts:** each has a **label** (one line, required, non-blank) and a **template** (several lines, may be empty, at most 5000 characters). The help text beneath the template reads: "The template is the starting structure of this artifact: the headings or fields its file must have. The agent fills them in. May be empty." Add, edit and remove; each artifact is edited and removed on its own row.
  - **Rule tags:** rows with a dropdown that offers only the rules of Technical details, each row with its own minus button, and **+** in the title row. A rule tag not in that list is refused.
  - **Human approval:** a checkbox. Ticked, the process stops for a person at the end of this flow.
  - **Footer:** **Delete flow**. The flow panel has no checks section and no next-flow field.
- **Pipeline panel**, fields in this order: name; description (optional, at most 1000 characters); arguments (rows as in the flow panel; `feature-id` is required in the default pipeline); model; tools; rule tags (as in the flow panel); body (optional, at most 1000 characters, with a counter "n / 1000"). The pipeline cannot be removed.
- **Delete flow** asks first and, once confirmed, removes the whole flow object: its artifacts, arguments, approval, rule tags, blocks and its own `next`. A flow that pointed to it loses that `next`; the other flows keep all their fields. The confirmation asks only "Are you sure you want to delete this flow?". Cancel keeps the flow and its selection.
- An edit that is refused keeps the saved value and shows the reason beneath the field (or the row). An add form shows what was typed.

### 3.3 Flow tab (F-12)
- The flow tab holds the flow's **blocks only**. Approval, checks and artifacts are on the flow's panel, not here (`architecture.md` §6 decision 38).
- Toolbox: **Start**, **Agent**, **End**. Start is disabled when the flow has one, with the reason shown. The Connection tool is not on this tab.
- Blocks run in order. The Start is first and the End last. The tab is built in F-12; until then it shows the placeholder of screen 06.
- **Move up** and **Move down** for the selected block. Delete asks first.

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
| **Start** | Flow tab only (one per flow) | none | — |
| **Agent** | Flow tab | name (file-safe, unique in the project); description; arguments (what the agent works on, and the loop it runs in, as text); restrictions; model (`haiku`, `sonnet`, `opus`, `inherit`); body (at most **1000 characters**) | `.claude/agents/<name>.md` |
| **End** | Flow tab only (one or more) | outcome (`done` or `stopped`); produced artifact (optional; how it relates to the flow's outcome artifacts is for F-12 to settle) | The last step of the flow's command |
| **Flow** | Pipeline tab, with **+** | id (file-safe, fixed); name (required, non-blank, unique); description (optional, at most 1000 characters); arguments (optional; id, required flag, hint); model; body (required, at most **1000 characters**); outcome artifacts; rule tags; Human approval. No next-flow field: `next` is set by dragging (§3.2) | `.claude/commands/<id>.md` |
| **Outcome artifact** | Flow panel | label (one line, required, non-blank); template (several lines, may be empty, at most 5000 characters) | The hand-over named in the flow's command |
| **Human approval** | Flow panel (a checkbox) | on or off. On: the process stops for a person at the end of the flow | A human-approval step at the end of the flow's command |
| **Connection** | Pipeline tab (an arrow between two flows) | none editable: the source and target are shown read-only; Delete connection removes the link. It is the flow's `next` | The order of the flows (how the generator writes it is set in the parser plan) |
| **Pipeline** | Pipeline tab (properties panel) | name; description (optional, at most 1000 characters); arguments (id, required flag, hint; `feature-id` in the default pipeline); model; tools; rule tags; body (optional, at most **1000 characters**) | `.claude/commands/pipeline.md` |

- Every block and every flow is checked and generated. There is no switch-off (`architecture.md` decision 34).
- A block's **arguments** explain it in text, including the loop it runs in (for example "for each task in `plan.md`").
- Approval is no longer a block: it is a checkbox on the flow (owner decision, 2026-11-18; `architecture.md` decision 38).
- Check is not a flow property at all. There is no checks list on the flow panel (owner decision, 2026-11-19 and 2026-11-20). A check is a Condition block on the flow tab, built in F-12 (`architecture.md` decision 40).

---

## 5. Interaction rules
- **Selection:** one item at a time. Its properties show in the right panel.
- **Adding a flow:** only with **+** on the tab row. **Adding a block:** a block is added after the selected block, or before the End when nothing is selected. The End stays last.
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
| Rule block id | derived from the name: starts with a letter, at most 60 characters; a refused id shows a message and does not block Next |
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
| D18 | Checks: "No checks yet." when a flow has none; a new flow is `flow-N` with its name starting as its id | Decided 2026-11-18. |
| D19 | Screens: 10 screens, numbered 01 to 10 (`spec/design/features/F-11-pipeline-builder/screens.md`) | Decided 2026-11-18. |
| D20 | The `Connect to next flow` button, the next-flow field, the Connection tool and the picker of the earlier screens | Removed 2026-11-18 (D13). |
| D21 | The pipeline panel holds name, description, arguments, model, tools, rule tags and body (body optional); the stories follow the approved screens | Decided 2026-11-20 (user decision, option 1; US-008). |
| D22 | Rule tags are on the flow panel, after the outcome artifacts and before Human approval | Decided 2026-11-20 (owner decision; kept from 2026-11-18, item 11). |
| D23 | Delete connection is on the connection panel, after a confirmation; it removes only the link (the source's `next` is cleared), and Cancel keeps the arrow | Decided 2026-11-20 (owner decision 2026-11-18g; to be confirmed at approval). |
| D24 | Delete flow is in the flow panel footer, with the confirmation of D15; it removes the flow with its artifacts, arguments, approval, rule tags and blocks | Decided 2026-11-20. |
| D25 | No checks on the flow panel; a check is a Condition block on the flow tab (F-12) | Decided 2026-11-19 (screens, decision 17); the stories record it as 2026-11-20. The date is to be confirmed. |
