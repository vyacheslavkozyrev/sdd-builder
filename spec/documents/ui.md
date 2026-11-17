# SDDBuilder — UI requirements

Status: revised 2026-11-16 with the owner's decisions. Open items are listed in section 9. The block model is in `architecture.md` §6 (decisions 28 to 32); the default pipeline is in §11 and the structural rules in §12.

Scope: the MVP web app for **desktop browsers only**; reference size 1280 × 800. No mobile or tablet layout. Nothing the user enters is stored by the server, and nothing is kept after a browser refresh. The app is for internal use for now.

Look and feel: **Material UI** React components (recorded in `architecture.md` §5).

---

## 1. App layout

**1.1 Header** (top, full width)
- Left: logo.
- Right: **New project** (opens the wizard at step 1). **Demo**: deferred to the features list (section 9).

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
4. The analysis is **green** when it has run on the current configuration and finds **no blocker and no warning**. An `info` finding does not stop it.

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
- **Toolbox** (left, fixed width): **Connection**, **Approval**, **Check**.
- **Canvas** (centre, all remaining space): an interactive diagram in the style of Miro (pan, select, drag). Each flow is a box with its name and its block count. Flows have no Start or End on this tab.
- A **connection** is an arrow between two flows. Its ends can be repointed by dragging them to another flow.
- **Approval** and **Check** sit on an arrow between two flows, dragged from the toolbox onto the arrow:
  - **Approval** stops and waits for a person.
  - **Check** is decided by an agent. It has two outputs, true and false, and its type is `checks` (the check named in its description) or `diff size` (a threshold in lines).
  - One gate per arrow.
- **Keyboard and touch path**: select the arrow and use **Add approval** or **Add check** in its properties panel.
- **Properties panel** (right, fixed width): the pipeline's properties when nothing is selected (including its arguments, such as `feature-id`); the selected item's properties otherwise.

### 3.3 Flow tab
- **Toolbox** (left, fixed width): **Start**, **Agent**, **Approval**, **Check**, **Connection**, **End**. Start is disabled when the flow has one, with the reason shown.
- **Canvas** (centre): the flow's blocks as numbered boxes in order. The Start is first and the End is last. A Check has two labelled outputs, true and false.
- **Connection** links two blocks of the same flow. Its ends can be repointed by dragging them to another block.
- **Keyboard and touch path**: select a block and use **Link to next block** in its panel, then pick the target block.
- **Move up** and **Move down** for the selected block.
- **Properties panel** (right, fixed width): the selected block's properties, or the flow's when none is selected.

### 3.4 Property panels and footer
- Each panel shows the file the item generates and, where the item has them, its arguments.
- Footer of a block or flow: **Switch off** / **Switch on** (keeps every property; a switched-off item is shown muted and is not checked or generated), and **Delete**, which asks for confirmation and names the connections it removes.
- An edit that is refused keeps the previous value and says why, next to the field.

### 3.5 Structure marks
- A structural problem is shown beside the item it names, with its severity colour (blocker red, warning amber, info grey) and its message.
- A problem whose item is not drawn is listed under the Pipeline tab in a section "Not on a drawn item".
- Brief problems (name, idea, stack, rules) are not shown on the pipeline; they appear at Analyze.
- Marks never block an edit.

---

## 4. Blocks in the UI

| Block | Added on | Properties | Generated as |
|---|---|---|---|
| **Start** | Flow tab only (one per flow) | none | — |
| **Agent** | Flow tab | name (file-safe, unique in the project); description; arguments (what the agent works on, and the loop it runs in, as text); restrictions; model (`haiku`, `sonnet`, `opus`, `inherit`); body (at most **1,000 characters**) | `.claude/agents/<name>.md` |
| **Approval** | Pipeline tab (on an arrow between flows); flow tab (between blocks) | description (what the person approves). Stops and waits for a person. | A human-approval step in the command |
| **Check** | Pipeline tab (on an arrow between flows); flow tab (between blocks) | description (what passing means; required); type (`checks` or `diff size`); threshold (diff size only, a positive whole number); true output and false output, each going to the next block, back to an earlier block (with an optional round limit), or stopping | A numbered rule in the command |
| **Connection** | Pipeline tab (between flows); flow tab (between blocks) | artifact label (required, non-blank) | The hand-over named in the command |
| **End** | Flow tab only (one or more) | outcome (`done` or `stopped`); produced artifact (optional) | The last step of the flow's command |
| **Flow** | Pipeline tab, with **+** | name; description; arguments; model; body (at most **1,000 characters**) | `.claude/commands/<flow>.md` |
| **Pipeline** | Pipeline tab (properties panel) | name; description; arguments (name, required or optional, hint; `feature-id` in the default pipeline); model; tools; rule tags; body (at most **1,000 characters**) | `.claude/commands/pipeline.md` |

- Every block has a stable id. A switched-off block or flow is not checked and not generated.
- A block's **arguments** explain it in text, including the loop it runs in (for example "for each task in `plan.md`").

---

## 5. Interaction rules
- **Selection**: one item at a time. Its properties show in the right panel.
- **Adding**: a block is added after the selected block, or before the End when nothing is selected. The End stays last.
- **Every drag has a button path.** Gates use **Add approval** and **Add check** on the arrow's panel; links use **Link to next block** on the block's panel.
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
- The block model, the default pipeline and the structural rules: `architecture.md` §6, §11 and §12.
- The technology and the decisions: `architecture.md`.
- Presets: F-09, after the MVP.
- The text of the generated files: F-02 and F-03.

---

## 9. Decisions and deferred items

| # | Item | Status |
|---|---|---|
| D1 | The **Demo** button | Deferred: to be defined in the features list. |
| D2 | Body limit 1,000 characters for every body, agent bodies included | Decided 2026-11-16. |
| D3 | Connection is a toolbox item on both tabs; ends can be repointed | Decided 2026-11-16. |
| D4 | Start and End exist only on flow tabs; the pipeline's arguments are in its properties panel | Decided 2026-11-16. |
| D5 | Approval and Check are different blocks; Check has true and false outputs | Decided 2026-11-16. |
| D6 | No scope field; the loop (per feature, per task) is written in the arguments | Decided 2026-11-16. |
| D7 | Desktop only | Decided 2026-11-16. |
| D8 | Green means no blocker and no warning | Decided 2026-11-16. |
