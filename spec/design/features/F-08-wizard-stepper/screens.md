# UX screens — Wizard stepper (F-08)

Scope: the wizard stepper (four steps, not clickable, with done, current and to-do states) in the left panel, vertical, under New project; the Prev and Next buttons at the foot of the left panel; and the step body (a placeholder card) in the grey content area, shown for each of the four steps. Desktop only. Wireframes in SVG: layout and content; colours and wording are placeholders. The left panel, the content area and the footer note are the F-07 frame (`spec/design/features/F-07-ui-layout-template/`), and the screens follow its approved left-panel restyle.

Stories: `spec/specifications/F-08-wizard-stepper/stories.md` (15 criteria: 14 `[auto]`, 1 `[device]`). AC-004 and AC-015 still fix the horizontal layout; see "Stories conflict" below.

Restyle of 2026-11-18: the stepper row above the card is replaced by the vertical stepper in the left panel, and Prev and Next move to the foot of the panel. The screens use the F-07 frame: Inter, Material Kit colours (primary #635BFF, page #F0F4F8, text #32383E, secondary text #636B74, borders #DDE7EE and #CDD7E1), a white card with a soft shadow and 12 px radius, 8 px radius for controls, the 8 px grid.

## Layout grid

Left panel: x 0–260 (white, 1 px border #DDE7EE at x 259), as F-07. Inside it, 24 px gutters:

- Wordmark row at y 24–48, New project at x 24–236, y 72–112 (as F-07).
- **Vertical stepper** at x 40 (node centres), from step 1 at y 164 to step 4 at y 356, a 64 px pitch. Nodes have radius 12; the current step has a ring of radius 18. Labels start at x 64 on the node's centre line (baseline cy + 4). Connecting lines of 2 px run between the nodes, from 20 px below one node's centre to 20 px above the next (y 184–208, 248–272, 312–336), so they clear the current step's ring.
- **Prev** at x 24–124, y 728–768, and **Next** at x 136–236, y 728–768, both 100 × 40 with 8 px radius and their words inside. They sit at the foot of the panel, 32 px above the bottom edge.

Content area: x 260–1280 (grey #F0F4F8). The white card sits at x 284–1256 (24 px from the panel edge and from the right window edge), y 24–728 at 1280 × 800. The step body is a placeholder inside the card: a sparkle mark in a light circle (centre 770, 340, radius 44) and the placeholder line (baseline y 410). No title, no step pill and no inner container: the stepper in the left panel names the step (change of 2026-11-17).

Footer note and caption sit inside the grey area, 24 px below the card: note at x 284, caption right-aligned at x 1256, baseline y 766, as F-07.

Done and to-do states use the F-07 colours with one addition: the done node is a success green #1F9D6B with a white check mark (a stroke path, not a glyph); the done label is #1F7A55 (about 5.4:1 on white). This colour is new to the F-07 palette; see Decision 6.

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-step-project.svg` | Step 1 of 4: Project current; steps 2 to 4 to do; Prev disabled, Next enabled at the foot of the panel; card with the placeholder line | AC-001, AC-002 (step 1), AC-004 (Prev and Next in the panel, body in the content area), AC-005 (Prev disabled on step 1), AC-013, AC-015 (device), AC-012 (New project above the stepper) | Step 1: Prev disabled, Next enabled, no done step |
| 02 | `02-step-technical-details.svg` | Step 2 of 4: Project done (check mark); Technical details current; Workflow and Analyze and generate to do; Prev and Next enabled | AC-002 (step 2), AC-005 (Prev enabled on step 2), AC-006 (Next from step 2), AC-008 (Prev goes back), AC-013 | Step 2: one done step, Prev enabled, Next enabled |
| 03 | `03-step-workflow.svg` | Step 3 of 4: Project and Technical details done; Workflow current; Analyze and generate to do; Prev and Next enabled | AC-002 (step 3), AC-006 (Next from step 3), AC-013 | Step 3: two done steps, Prev enabled, Next enabled |
| 04 | `04-step-analyze-generate.svg` | Step 4 of 4: Project, Technical details and Workflow done; Analyze and generate current; Prev enabled; Next shown disabled (grey, as Prev on step 1) | AC-002 (step 4), AC-005 (Prev enabled on step 4), AC-007 (Next disabled on step 4), AC-013 | Step 4: three done steps, Prev enabled, Next disabled |

Criteria with no screen are not visual and are proved by tests:

- AC-006 from steps 1 and 2 is also shown by the Next control on screens 01 and 02; the step change itself is tested.
- AC-009 (Next is never disabled by step content; a blank name does not block Next): behaviour, tested. No field exists in F-08, so no state shows a disabled Next.
- AC-010 (values held in memory across steps) and AC-011 (no storage or console calls): not visual, tested.
- AC-012 (New project resets to step 1 and clears the values): the button is on every screen; the reset is behaviour, tested. Screen 01 is the reset result.
- AC-014 (Material UI markup): tested.

## Decisions these screens take

1. **The stepper shows state without controls.** A step is a node and a label, with no button or link. Done steps show a check mark on a green node and a green label; the current step has a violet node with a soft ring and a violet label; to-do steps are white nodes with a grey outline and a grey label. Shape and text carry the state, not colour alone. Navigation is by Prev and Next only (AC-003, `ui.md` §1.3).
2. **The stepper is vertical in the left panel, under New project.** It is the same panel as F-07 and holds no other control. Prev and Next are at the foot of the panel, each with its word inside the button (the restyle of 2026-11-18 replaces the round icon buttons beside a horizontal stepper).
3. **Next is shown disabled on step 4.** It keeps its place so the foot of the panel does not move; it is grey and cannot be pressed (AC-007).
4. **The content area is a slot for the step body.** The card fills the grey area beside the panel, from the top to the footer note. All step content sits on the white card; there is no inner coloured container (change of 2026-11-17).
5. **Step bodies are placeholders.** Each body shows a decorative sparkle mark and the line "The content of this step is added in a later feature." It has no title and no step pill (change of 2026-11-17: the stepper names the step). The body holds no field, so F-08 adds no input. The real content comes in F-09, F-10, F-11, F-12 and F-13. AC-013 was amended on 2026-11-17 to match (see the note below).
6. **Colour roles.** Violet (#635BFF, the F-07 primary) is the brand, the current step, and the primary button. Success green (#1F9D6B node, #1F7A55 label) marks done steps; it is the one colour added to the F-07 palette for this feature, and the check mark on it is a graphic, not text. To-do labels are #636B74 (F-07 secondary text). Grey (#F0F4F8 fill, #9FA6AD text, #DDE7EE outline) is for to-do nodes, disabled buttons and the disabled Next. Owner to confirm the green (see Open points).
7. **New project is the F-07 control and is unchanged on every screen.** It is the primary button at the top of the left panel and starts the wizard again at step 1 (AC-012). No confirmation is drawn, as approved in F-07 (open point 1 of F-07).

## Restyle checks (2026-11-18)

| Check | Result |
|---|---|
| XML: all four SVGs pass `xmllint --noout` | Pass |
| Render: all four rendered in headless Chrome at 1280 × 800 | Pass; every text line sits inside its box. The stepper labels end before x 200 (the panel's text limit is 236); Prev, Next and the New project label sit inside their buttons |
| Text fit: wordmark, New project, step labels up to "Analyze and generate", the placeholder line, the footer note and the caption | Fit |
| Grid: 24 px gutters, 8 px multiples in control heights and positions; the card matches F-07 at x 284–1256, y 24–728 | Pass |
| States: step 1 has no done step and Prev disabled; step 4 has Next disabled; each step has exactly one current step | Pass |

## Usability review

Reviewed 2026-11-17 against `stories.md` and the owner decisions of that date (on the previous horizontal layout). Three findings, all changed in the SVGs; no blocker. The restyle of 2026-11-18 keeps the captions and hover texts from these findings: each button carries its word, and each step node carries a title with its step and state.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| U-01 | Prev and Next had no words; the arrow was the only label, against the rule that labels say the action | major | 01, 02, 03, 04 | Superseded 2026-11-18: Prev and Next are buttons with their words inside |
| U-02 | The disabled Prev on step 1 gave a developer note as its hover text ("disabled on step 1") and no user-facing reason | minor | 01 | Hover text reads "Prev is not available on step 1"; enabled Prev and Next say what they do |
| U-03 | The stepper states (done, current, to do) were carried by colour, the check mark and the ring only; a screen reader or a hover gets no state | minor | 01, 02, 03, 04 | Each step node has a text title with its step and state, e.g. "Technical details: current step", "Project: done", "Workflow: to do" |

**Open points for the user (from 2026-11-17, still open)**

1. **Button name: "Back" or "Prev".** The request says Back; the stories (AC-004 to AC-008), `features.md` F-08 and `ui.md` §1.3 name the button Prev. The screens keep Prev. Options: (a) keep Prev (current); (b) rename to Back and change the names in `features.md`, `ui.md` and `stories.md`, then the labels in the SVGs.
2. **Placeholder line visible to users.** AC-013 requires the line "The content of this step is added in a later feature." It shows to end users if the build ships before F-09 to F-13 replace it. Options: (a) keep it until each step has content (current plan); (b) add a build-only switch that hides it in production (needs an AC-013 change).
3. **Two filled primary buttons per screen.** New project is a violet filled button at the top of the panel; Next is a violet filled button at the foot of the panel. Both are primary in the same panel. Options: (a) keep both (current); (b) make New project an outline button, which changes the approved F-07 frame.

## Visual review

Reviewed 2026-11-17 on the previous horizontal layout. Six findings, all changed in the SVGs; no blocker. Findings V-01 to V-06 are superseded by the restyle of 2026-11-18, which uses the F-07 colours and grid; V-01 (to-do label contrast) and V-04 (check mark contrast) still hold in the new colours: the to-do label is #636B74 on white, and the check is white on #1F9D6B.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| V-01 | To-do step labels were light grey (#94a3b8) on the pale background, about 2.5:1 for 12 px text | major | 01, 02, 03 | Superseded 2026-11-18: to-do labels are #636B74 on white |
| V-02 | The stepper row sat 20 px left of the card centre | minor | 01, 02, 03, 04 | Superseded 2026-11-18: the stepper is vertical in the panel |
| V-03 | The disabled Prev caption (#94a3b8) was about 2.5:1 | minor | 01 | Superseded 2026-11-18: the disabled Prev text is #9FA6AD on #F0F4F8, shown as a disabled button. Owner may ask for a darker value (see Open points) |
| V-04 | The white check on the emerald done node was about 2.5:1 | minor | 02, 03, 04 | Superseded 2026-11-18: the check is a graphic on #1F9D6B |
| V-05 | The accent rule's square ends stood out past the card's rounded corners | minor | 01, 02, 03, 04 | Superseded 2026-11-18: the accent rule is removed; the card follows the F-07 frame |
| V-06 | The style and defs blocks differed between the screens | minor | 01, 02, 03, 04 | Kept: the same style block and defs on all four screens |

**Open points for the user (from 2026-11-17, still open)**

1. **Two primary hues.** Superseded: both primary buttons are now the F-07 violet in the same panel; see usability open point 3.
2. **Button captions "Prev" and "Back".** Covered by usability open point 1.

## Stories conflict (2026-11-18 restyle)

The stories were written for a stepper in a row above the step body. The stories do not use the word "header", but these criteria fix the horizontal layout and now conflict with the left-panel layout (the wording is not changed here; the owner decides):

- **AC-004** `[auto]`: "the Prev and Next buttons are in the wizard panel beside the stepper, and the step body is rendered below that panel." Conflicts: Prev and Next are at the foot of the left panel, and the step body is beside the panel in the content area, not below it.
- **AC-015** `[device]`: "at a window of 1280 × 800 the stepper, Prev and Next are on one row with Prev and Next beside the stepper, and the step body is visible below them with no vertical page scroll." Conflicts: the stepper is vertical, Prev and Next are stacked at the foot of the panel, and the body is not below them. The "no vertical page scroll" part still holds (the frame fits 1280 × 800).
- **`stories.md` requirement row "ui.md §1.3 wizard frame (panel, then body)"** (line 112): the order of panel and body changes from above-and-below to beside.

Criteria that still hold in the new layout, as worded: AC-001 (four steps in order with their titles; it names no position), AC-002, AC-003, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011, AC-012 (Prev disabled and Next shown after New project, as on screen 01), AC-013 (the body and the placeholder line, no position) and AC-014 (Material UI markup; no position). US-001 names no position either. The header-row wording in the request is not in the stories, so no story text needs to change for it.

## Change of 2026-11-17 (step pill and body title removed)

The user asked to remove the "STEP N OF 4" pill and the body title ("Project" and the other step names) from the card on all four screens. The stepper above still names each step, so the card keeps only the placeholder line. Both reviews were already run on the screens before this change; the change removes elements and moves the placeholder up, and it was checked for well-formedness only.

**Story conflict, resolved 2026-11-17.** AC-013 required each step body to show the title of its step. The user chose to amend it: the stepper shows the title, and the body shows the placeholder line only. The amendment is recorded in `progress.md`.

## Approval

Approved by the user on 2026-11-17 for the horizontal layout, with Prev kept as the button name and the placeholder line visible until F-09 to F-13 replace it. The restyle of 2026-11-18 to the left-panel frame is not yet approved. Open points 1 to 3 and the stories conflict above are open.
