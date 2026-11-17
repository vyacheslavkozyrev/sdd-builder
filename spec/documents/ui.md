# SDDBuilder — UI requirements

Status: revised 2026-11-16 with the owner's decisions. Items marked **OPEN** are not decided and are listed in section 9. The block model and the default pipeline are in `building-blocks.md`; this document does not repeat them.

Scope: the MVP web app for **desktop browsers only**; reference size 1280 × 800. No mobile or tablet layout. Nothing the user enters is stored by the server, and nothing is kept after a browser refresh.

Look and feel: **Material UI** React components (decision recorded in `architecture.md` §5).

---

## 1. App layout

**1.1 Header** (top, full width)
- Left: logo.
- Right: **New project** (opens the wizard at step 1), **Demo** (**OPEN**, section 9, D1).

**1.2 App footer** (bottom, full width)
- Annotation: the work is not saved and is lost when the browser is refreshed. Shown on every screen.

**1.3 Wizard frame** (after New project)
- **Wizard steps panel** (top of the wizard, full width): the four steps in order, each with its title and state (done, current, to do). Beside the steps, **Prev** and **Next** buttons. The steps themselves are **not clickable**; navigation is by Prev and Next only.
- **Prev** is disabled on step 1. **Next** is hidden on step 4 (step 4 has no next step).
- Below the panel: the step body.

---

## 2. Wizard steps

### Step 1 — Project
- **Project name**: single-line text field, required. Stored as typed; spaces only are kept. A blank name does not block Next; the analysis reports it.
- **Idea**: multi-line text field, required. Limit **5,000 characters**, counted in code points (an emoji counts as one). A counter shows `N / 5,000`. Typing or pasting past the limit keeps the first 5,000 characters.
- Help text as on the approved screen 01.

### Step 2 — Technical details
- **Stack**: language (required); framework, platform, build tool and test framework (optional).
- **Architecture**: multi-line text field, optional. Limit **5,000 characters**, counted in code points.
- **Rules** (a list of rule blocks):
  - Each block has a **name** (single line) and a **description** (multi-line). Each description is limited to **1,000 characters**.
  - Each block shows its file name `.claude/rules/<id>.md`. The id is the name in lower case, with each run of characters outside `a–z` and `0–9` replaced by one hyphen.
  - **Add rule block** appends one empty block after the last one. **Remove block** removes that block only; the others keep their order.
  - At most **60** blocks; Add is disabled at 60.
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
4. The analysis is **green** when it has run on the current configuration and has **no blocker** (warnings do not stop it; **OPEN** D8 asks to confirm).

**Project preview**
- The file tree of the project: the files the project will get, in plan order. Files that come from rule blocks are marked. The tree is computed in the browser, without a request.
- One button, **Generate and download**: enabled only when the analysis is green. It generates the project and saves the zip file `sddbuilder-project.zip`.
- Any change to a field, a rule block or the pipeline makes the analysis out of date. The button is disabled until Analyze runs again and is green.

---

## 3. Step 3 — Workflow builder

### 3.1 Tab row
- Full width of the available space (not centred, not a fixed width).
- The first tab is **Pipeline** (the whole process). It cannot be removed.
- One tab per **flow** (a child flow of the pipeline), in pipeline order.
- A **+** button after the last tab adds a flow. Flows are added only this way.

### 3.2 Pipeline tab
- **Toolbox** (left, fixed width): **Approval** and **Check**.
- **Canvas** (centre, all remaining space): an interactive diagram in the style of Miro (pan, select, drag, link). Each flow is a box with its name and its block count.
- A **connection** between two flows is an arrow. A connection is made by linking one flow to the next on the canvas.
- A gate sits on an arrow between two flows:
  - **Approval**: a person decides.
  - **Check**: an agent decides. Its type is `checks` (the check named in its description) or `diff size` (a threshold in lines).
  - One gate per arrow.
- **Placing a gate**: drag Approval or Check from the toolbox onto an arrow. A drop target appears on the arrow while dragging. The keyboard and touch path is the arrow's properties panel, with the buttons **Add approval** and **Add check**.
- **Properties panel** (right, fixed width): the pipeline's properties when nothing is selected; the selected item's properties otherwise.

### 3.3 Flow tab
- **Toolbox** (left, fixed width): **Start**, **Agent**, **Approval**, **Check**, **End**. Start is disabled when the flow has one, with the reason shown.
- **Canvas** (centre): the flow's blocks as numbered boxes in order. The Start is first and the End is last. A check has two outputs, pass and fail, shown as labelled ports.
- Blocks are linked by drawing a connection from one block's output to the next block's input. The keyboard and touch path is the selected block's panel, with the button **Link to next block**, which then asks for the target block.
- **Move up** and **Move down** for the selected block.
- **Properties panel** (right, fixed width): the selected block's properties, or the flow's when none is selected.

### 3.4 Property panels and footer
- Each panel shows the file the item generates and, where the item has them, its arguments.
- Footer of a block or flow: **Switch off** / **Switch on** (keeps every property; a switched-off item is shown muted and is not checked or generated), and **Delete**, which asks for confirmation and names the connections it removes.
- An edit that is refused keeps the previous value and says why, next to the field.

### 3.5 Structure marks
- A structural problem is shown beside the item it names, with its severity colour (blocker red, warning amber, info grey) and its message.
- A problem whose item is not drawn (for example a pipeline with no End) is listed under the Pipeline tab in a section "Not on a drawn item".
- Brief problems (name, idea, stack, rules) are not shown on the pipeline; they appear at Analyze.
- Marks never block an edit.

---

## 4. Blocks in the UI

| Block | Added on | Properties | Generated as |
|---|---|---|---|
| **Start** | Flow tab (one per flow) | none on a flow. The pipeline's Start carries the arguments (below). | — |
| **Agent** | Flow tab | name (file-safe, unique in the project); description; arguments (what the agent works on, and its scope, written as text); restrictions; model (`haiku`, `sonnet`, `opus`, `inherit`); body (at most **1,000 characters**) | `.claude/agents/<name>.md` |
| **Approval** | Pipeline tab (between flows); flow tab (between blocks) | description (what the person approves). Decided by a person. | A human-approval step in the command |
| **Check** | Pipeline tab (between flows); flow tab (between blocks) | description (what passing means; required); type (`checks` or `diff size`); threshold (diff size only, a positive whole number); pass output and fail output, each going to the next block, back to an earlier block (with an optional round limit), or stopping | A numbered rule in the command |
| **End** | Flow tab (one or more) | outcome (`done` or `stopped`); produced artifact (optional) | The last step of the flow's command |
| **Flow** | Pipeline tab, with **+** | name; description; arguments; model; body (at most **1,000 characters**) | `.claude/commands/<flow>.md` |
| **Pipeline** | Pipeline tab (properties panel) | name; description; arguments (name, required or optional, hint); model; tools; rule tags; body (at most **1,000 characters**) | `.claude/commands/pipeline.md` |

- The pipeline's arguments include `feature-id` (required) in the default pipeline.
- Every block has a stable id. A switched-off block or flow is not checked and not generated.
- A block's **arguments** explain it in text, including the loop it runs in (for example "for each task in `plan.md`"). Proposed under D6.

---

## 5. Interaction rules
- **Selection**: one item at a time. Its properties show in the right panel.
- **Adding**: a block is added after the selected block, or before the End when nothing is selected. The End stays last.
- **Every drag has a button path.** Placing a gate uses the buttons **Add approval** and **Add check** on the arrow's panel; linking blocks uses **Link to next block** on the block's panel.
- **Refusals** are shown inline and keep the previous value.
- **Delete** always asks for confirmation.
- **Reversible**: switching off is undone by switching on.

---

## 6. Limits (summary)

| Field | Limit |
|---|---|
| Project name | single line, required |
| Idea | 5,000 characters (code points), required |
| Architecture | 5,000 characters (code points), optional |
| Rule block description | 1,000 characters |
| Agent body | 1,000 characters |
| Flow body | 1,000 characters |
| Pipeline body | 1,000 characters |
| Rule blocks | 60 |

---

## 7. Desktop only
- Reference layout 1280 × 800. The app is not laid out for phones or tablets in the MVP.

---

## 8. What this document does not define
- The block model, the default pipeline and the structural rules: `building-blocks.md`.
- The architecture, the technology and the decisions: `architecture.md`.
- Presets: F-09, after the MVP.
- The text of the generated files: F-02 and F-03.

---

## 9. Open decisions

| # | Question | Conflict or gap |
|---|---|---|
| D1 | What does the **Demo** button do, and is it in the MVP? | Deferred: to be defined in the features list. |
| D2 | Body limit 1,000 characters for every body, agent bodies included. | Decided 2026-11-16: 1,000 for every body. Supersedes the 4,000 agent cap of F-06 AC-030. |
| D3 | Connections are drawn between blocks (no connection block in the toolbox). Confirm. | The approved F-06 design put Connection in the toolbox. |
| D4 | Does the pipeline's own Start and End appear on the Pipeline tab? | The approved design shows flows and gates only. |
| D5 | Is a **Check** the same thing as the approved Condition? Check types are `checks` and `diff size`. | The approved design allowed `approval` as a check type; here Approval is its own block. |
| D6 | How does a command know to run per feature or per task, now that there is no scope field? | Decided 2026-11-16: no scope rule in the model. The flow's and the agent's arguments say "for each feature" or "for each task", and the command text is written from them (architecture decision 7). The analysis no longer checks that a task-scoped agent reads a plan. |
| D7 | Phone or tablet layout. | Decided out of scope: desktop only. Confirm. |
| D8 | Is "green" = no blocker, or no blocker and no warning? | Current reading: no blocker. |
