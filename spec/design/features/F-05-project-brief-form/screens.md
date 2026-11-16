# UX screens — Project wizard: frame, name and idea, workflow host (F-05)

Scope: the wizard frame (four steps, stepper, Back and Next), step 1 (name and idea), and the Map tab of step 3, where the builder (F-06) is hosted. Steps 2 and 4 have their own screens: F-21 (`spec/design/features/F-21-wizard-technical-details/`) and F-22 (`spec/design/features/F-22-wizard-analyze-generate/`). Desktop, 1280 × 800. Wireframes in SVG: layout, content and states; colours and wording are placeholders.

Stories: `spec/specifications/F-05-project-brief-form/stories.md` (14 criteria).

## Layout grid

Shared with F-21 and F-22: top bar 0–56; stepper in four equal columns; card x 40–1240, y 152–776; content x 72–1208, y 248–684; footer divider y 700; footer buttons y 716–756. Back is at the footer's left edge; the action is at its right edge.

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-wizard-project.svg` | Step 1: name and idea, both required; the counter inside the idea box; Back disabled on step 1 with a note that Back is available from step 2; Next | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-014 | First step; nothing stored between visits |
| 02 | `02-wizard-workflow.svg` | Step 3, Map tab: the tab row with Map first, one tab per flow in order, and a + that adds a flow after the last tab; the pipeline's canvas with gates on the arrows; the pipeline properties beside it; Next | AC-010, AC-011, AC-003, AC-014 | The default pipeline; Map tab active; Next opens step 4 |

Criteria with no screen are not visual: AC-012 and AC-013 (static checks on the web source) are covered by tests.

The flow tab and its toolbox are F-06's screen: `spec/design/features/F-06-visual-builder/06-flow-tab-toolbox.svg`.

## Decisions these screens take

1. **Four steps, navigated by Back and Next.** The stepper shows progress and is not clickable.
2. **Name and idea are required.** Next is never blocked by an empty field; Analyze (F-22) reports it.
3. **Nothing is stored between visits.** Reloading clears the wizard.
4. **The Map tab is the first tab.** The + on the tab row adds a flow. A toolbox to the left of the diagram holds Connection, Approval and Check; an Approval or a Check is dragged onto a connection. The pipeline's properties are to the right. Each flow opens in its own tab, where the toolbox lists every block kind (F-06 screen).
5. **Privacy notice on step 4 only** (F-22).

## Review history

On 2026-11-15 the wizard set (then one feature) was reviewed by the `usability` and `visual` agents and their findings were applied. The findings and their record stay in git history; the set was split into F-05, F-21 and F-22 afterwards.

## Usability review

Reviewed on 2026-11-15 (second pass, after the Map-tab correction) against `stories.md`, the decisions above and the default pipeline (`source/templates/pipeline/default.json`, `building-blocks.md` §4). Walked each task: fill name and idea → Next → Map tab → Next, and Back on each step. The gate types on screen 02 match the default pipeline: approval on specify → ux, ux → plan and plan → build (the dashed line), checks on build → verify, approval on verify → complete.

| Finding | Severity | Screen | What changed |
|---|---|---|---|
| The gates on the canvas have no label. A user cannot tell which diamond asks a person to approve and which runs an automatic check, without matching colours to the toolbox | minor | 02 | Added a small label on each gate: "Approval" on specify → ux, ux → plan, plan → build and verify → complete; "Check" on build → verify (existing `gateSmall` class, placed in the 60 px gaps and above the dashed line) |

Counts: 0 blocker, 0 major, 1 minor. Criteria are unchanged; every criterion in `stories.md` still appears in this file. Checked and kept: Back disabled on step 1 with the note on what turns it on; both required fields marked and their help says what goes in; Next never disabled (AC-005); the stepper is not clickable (AC-003); the same Back and Next positions and names on steps 1 and 3; the footer hint on step 3 says Analyze reports pipeline problems (AC-011); the wording "Flow n of 6" matches the six flows.

### Open points for the user

1. **Gates and checks need dragging (major, screen 02).** The toolbox says "Drag onto a connection", and no other way to place an Approval or a Check is drawn or written. A keyboard or touch user has no drawn route. Options: (a) keep drag and add a keyboard route in F-06 (for example, select a connection, then choose Add approval or Add check from its panel); (b) accept drag only and say so in F-06. This is F-06's interaction rule, so it is not changed on the screen.
2. **Storage line on step 1 (minor, screen 01).** The line "Nothing is stored between visits. Reloading clears the wizard." is Decision 3 above. `stories.md` lists "a privacy notice on step 1" as decided against. Confirm the line is the storage fact the owner wants on step 1 and not a privacy notice. Options: (a) keep it as a help line (current); (b) move it to step 4 with the F-22 privacy notice; (c) remove it and keep only the Decision 3 behaviour.

## Visual review

Reviewed on 2026-11-15 by the `visual` agent (second pass, after the Map-tab correction) against the grid above and the set as a whole. Both screens were rendered in headless Chrome at 1280 × 800 before and after the edits, and checked by eye; the SVGs were checked for well-formedness with `xmllint`.

| Finding | Severity | Screen | What changed |
|---|---|---|---|
| The three-column diagram sits 20 px from the canvas edge on the left and 44 px on the right; the gutters are 16 px to the Toolbox and 24 px to the Pipeline box | minor | 02 | Canvas widened from 604 to 612 px (16 px gutters on both sides). The diagram moved 16 px right, so it sits 36 px from each canvas edge |
| Toolbox text sits low in each 66 px node: 16 px above, 6 px below | minor | 02 | Icon, label and both lines moved up 5 px in each node: 11 px above and below |
| Gate labels are 10 px, a size outside the type scale | minor | 02 | `.gateSmall` set to 11 px (the `small` size). Labels still fit the 60 px gaps |
| Disabled Back colour in the style block of 02 is still `#94a3b8` (about 2.3:1), so the block differs from 01 | minor | 02 | `.bt-disabled` set to `#64748b` as on 01. The class is not used on 02, but the style blocks now match |
| Footer note starts at x 200 on baseline 741; 01 uses x 204 on 740.5 | minor | 02 | Note moved to x 204, y 740.5 |
| The counter sits 16 px in from the idea box edge; the text sits 12 px in | minor | 01 | Counter moved from x 1192 to x 1196 |

Counts: 0 blocker, 0 major, 6 minor. Criteria are unchanged; every criterion in `stories.md` still appears in this file.

Checked and kept: the Toolbox copy fits (the rendered width is narrower than a 6.6 px-per-character estimate, so no wording changed); Back and Next sit at the same coordinates on 01 and 02; the stepper, top bar, card header and divider are identical; the gate and check shapes match the toolbox.

Not changed: the tab widths differ (Map is 84 px, the others 96 px) because each tab is sized to its label; the wireframe captions use a light grey (`#94a3b8`), which is annotation, not UI text; the 15 px brand in the top bar is one class shared by both screens.

### Open points for the user

1. **Approval gates and rule-file colour (screen 02, and the rule chips on F-22).** Approval gates are orange (`#ea580c`). The colour roles give orange to rule files, so the two read as the same colour; a user can tell them apart only by shape. `screens.md` has no colour legend to check this against. Options: (a) keep orange for approvals and give rule files another hue; (b) draw approval gates in blue, the action colour, with an outline; (c) keep the current colours and accept the overlap. This is an owner decision on the colour roles, so the screen is not changed.

## Owner decisions (2026-11-15)

The owner approved the UX on 2026-11-15 and decided the three open points from the reviews:

1. **Gates and checks.** Drag stays the main route. A select-then-add route (choose a connection, then Add approval or Add check) is added in F-06, as its interaction rule.
2. **Storage line on step 1.** The line "Nothing is stored between visits. Reloading clears the wizard." stays as a help line on step 1.
3. **Colour clash.** Approval gates stay orange. Rule-file chips change from orange to violet (`#8b5cf6`), in the screens of F-21 and F-22.

No open points remain for F-05.
