# UX screens — Wizard stepper (F-08)

Scope: the wizard stepper (four steps, not clickable, with done, current and to-do states), the round Prev and Next buttons beside it, and the step body that fills the centre area, shown for each of the four steps. Desktop only. Wireframes in SVG: layout and content; colours and wording are placeholders. The header and footer are the F-07 frame, drawn unchanged.

Stories: `spec/specifications/F-08-wizard-stepper/stories.md` (15 criteria: 14 `[auto]`, 1 `[device]`).

## Layout grid

- **Header** 0–56, as F-07 (wordmark at x 24; New project at x 1120–1256 at 1280 wide).
- **Stepper row** on the page background, outside any card, y 80–140. It is centred on y 100:
  - Prev: round button, centre (72, 100), radius 20 (x 52–92). Left of the stepper.
  - Next: round button, centre (1208, 100), radius 20 (x 1188–1228). Right of the stepper. Disabled (grey) on step 4.
  - Four step nodes on y 100, centres at x 220, 500, 780 and 1060, radius 12. The row is centred on x 640, so the gap from Prev to the first node and from the last node to Next is the same (110 px each side). The current step has a ring of radius 18 around it. Labels sit centred under each node on y 132.
  - Connecting lines on y 100 run from 22 px right of one node to 22 px left of the next (x 242–478, 522–758, 802–1038).
- **Step card** x 24–1256, y 152–736. It fills the centre area in full width, from 16 px below the stepper row to 16 px above the footer. Inside: a coloured accent rule across the top (y 152–158, clipped to the card's rounded corners). All content sits directly on the white card: the placeholder sparkle (centre 640, 410) and the placeholder line (y 490). No step pill, no title and no inner container; the stepper above names the step (change of 2026-11-17).
- **Footer** 752–800, as F-07 (note at x 24).

## Screens

| # | File | What it shows | Criteria it proves | States shown |
|---|---|---|---|---|
| 01 | `01-step-project.svg` | Step 1 of 4: Project current; the other three steps to do; Prev disabled (grey) on the left; Next shown on the right; card with the placeholder line | AC-001, AC-002 (step 1), AC-003, AC-004 (Prev and Next beside the stepper, body below), AC-005 (Prev disabled on step 1), AC-013, AC-014, AC-015 (device), AC-012 (New project in the header) | Step 1: Prev disabled, Next enabled, no done step |
| 02 | `02-step-technical-details.svg` | Step 2 of 4: Project done (check mark); Technical details current; Workflow and Analyze and generate to do; Prev and Next enabled | AC-002 (step 2), AC-005 (Prev enabled on step 2), AC-006 (Next from step 2), AC-008 (Prev goes back), AC-013 | Step 2: one done step, Prev enabled, Next enabled |
| 03 | `03-step-workflow.svg` | Step 3 of 4: Project and Technical details done; Workflow current; Analyze and generate to do; Prev and Next enabled | AC-002 (step 3), AC-006 (Next from step 3), AC-013 | Step 3: two done steps, Prev enabled, Next enabled |
| 04 | `04-step-analyze-generate.svg` | Step 4 of 4: Project, Technical details and Workflow done; Analyze and generate current; Prev enabled; Next shown disabled (grey, as Prev on step 1) | AC-002 (step 4), AC-005 (Prev enabled on step 4), AC-007 (Next not rendered on step 4), AC-013 | Step 4: three done steps, Prev enabled, Next disabled |

Criteria with no screen are not visual and are proved by tests:

- AC-006 from steps 1 and 2 is also shown by the Next control on screens 01 and 02; the step change itself is tested.
- AC-009 (Next is never disabled by step content; a blank name does not block Next): behaviour, tested. No field exists in F-08, so no state shows a disabled Next.
- AC-010 (values held in memory across steps) and AC-011 (no storage or console calls): not visual, tested.
- AC-012 (New project resets to step 1 and clears the values): the button is on every screen; the reset is behaviour, tested. Screen 01 is the reset result.
- AC-014 (Material UI markup): tested.

## Decisions these screens take

1. **The stepper shows state without controls.** A step is a node and a label, with no button or link. Done steps show a check mark on a green gradient node and a green label; the current step has an indigo node with a soft ring and a bold label; to-do steps are white nodes with a grey outline and a light grey label. Shape and text carry the state, not colour alone. Navigation is by Prev and Next only (AC-003, `ui.md` §1.3).
2. **Prev and Next are round icon buttons beside the stepper, on one row with it, each with its word under it.** Prev, with a left arrow and the caption "Prev", is on the left; Next, with a right arrow and the caption "Next", is on the right (the user's request). Prev is a white round button with an indigo outline when enabled and a grey disabled button on step 1. Next is a filled indigo-violet round button. The buttons sit outside the card, so the stepper is no longer inside a container.
3. **Next is shown disabled on step 4.** It keeps its place so the row does not move; it is grey and cannot be pressed (AC-007).
4. **The card fills the centre area.** It spans the full width and all the height between the header and the footer, so no space is left unused (the user's request). All step content sits on the white card; there is no inner coloured container (change of 2026-11-17).
5. **Step bodies are placeholders.** Each body shows a decorative sparkle mark and the line "The content of this step is added in a later feature." It has no title and no step pill (change of 2026-11-17: the stepper names the step). The body holds no field, so F-08 adds no input. The real content comes in F-09, F-10, F-11, F-12 and F-13. AC-013 was amended on the same day to match (see the note below).
6. **Colour roles.** Indigo (#4f46e5) and violet (#7c3aed) are the brand and the current step and the primary buttons. Emerald to teal (#059669 to #0d9488) marks done steps; the white check on it reaches about 3.8:1. To-do labels are slate (#475569), not light grey, so they stay readable. The accent rule runs indigo, violet, pink. The page has a soft indigo-to-white background; the card has a soft indigo shadow. Grey is for to-do and disabled states only.
7. **New project is the F-07 header control and is unchanged on every screen.** It starts the wizard again at step 1 (AC-012). No confirmation is drawn, as approved in F-07. Its colour is the F-07 blue; the header and footer are not restyled in this change.

## Usability review

Reviewed 2026-11-17 against `stories.md` and the owner decisions above. Three findings, all changed in the SVGs; no blocker. Every criterion still appears in this file, and all four SVGs are well-formed.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| U-01 | Prev and Next had no words; the arrow was the only label, against the rule that labels say the action | major | 01, 02, 03, 04 | A caption "Prev" sits under the Prev circle and "Next" under the Next circle, on the label line (y 132). The Prev caption is grey on step 1, like the disabled button. Layout and positions of the row are unchanged |
| U-02 | The disabled Prev on step 1 gave a developer note as its hover text ("disabled on step 1") and no user-facing reason | minor | 01 | Hover text reads "Prev is not available on step 1"; the enabled Prev and Next hover texts say what they do ("go to the previous step", "go to the next step") |
| U-03 | The stepper states (done, current, to do) were carried by colour, the check mark and the ring only; a screen reader or a hover gets no state | minor | 01, 02, 03, 04 | Each step node has a text title with its step and state, e.g. "Technical details: current step", "Project: done", "Workflow: to do" |

**Open points for the user**

1. **Button name: "Back" or "Prev".** The request says Back; the stories (AC-004 to AC-008), `features.md` F-08 and `ui.md` §1.3 name the button Prev. The icons and the new captions carry the direction either way. The usability review prefers the plain word Back (wording rule). Options: (a) keep Prev in the stories and the captions (current); (b) rename to Back and change the names in `features.md`, `ui.md` and `stories.md`, then the captions in the SVGs.
2. **Placeholder line visible to users.** AC-013 requires the line "The content of this step is added in a later feature." It shows to end users if the build ships before F-09 to F-13 replace it. Options: (a) keep it until each step has content (current plan); (b) add a build-only switch that hides it in production (needs an AC-013 change).
3. **Two filled primary buttons per screen.** New project is a blue filled button in the F-07 header; Next is an indigo-violet filled button in the stepper row. Both look primary, and the owner decision 7 keeps the F-07 blue. Options: (a) keep both as they are (current, owner decision 7); (b) make New project an outline button in the header, which changes the approved F-07 frame.

## Visual review

Reviewed 2026-11-17 on the four SVGs after the usability changes. Six findings, all changed in the SVGs; no blocker. The four files share one style block and one defs block, and all four are well-formed. Screens 01 and 03 were rendered in headless Chrome after the change; screens 02 and 04 differ only by the same coordinate and style edits and were checked from the source.

| # | Finding | Severity | Screen | What changed |
|---|---|---|---|---|
| V-01 | To-do step labels were light grey (#94a3b8) on the pale background, about 2.5:1 for 12 px text | major | 01, 02, 03 | To-do labels are slate #475569. Node and number colours are unchanged |
| V-02 | The stepper row sat 20 px left of the card centre: 90 px from Prev to the first node, 130 px from the last node to Next | minor | 01, 02, 03, 04 | Nodes, their labels, their check or number marks and the connecting lines moved 20 px right (centres 220, 500, 780, 1060). Gaps are 110 px on both sides |
| V-03 | The disabled Prev caption (#94a3b8) was about 2.5:1 | minor | 01 | Caption is #64748b. The disabled circle and arrow stay grey, so the state still shows |
| V-04 | The white check on the emerald done node was about 2.5:1 | minor | 02, 03, 04 | Done gradient darkened to #059669 to #0d9488 (about 3.8:1), still emerald to teal. Decision 6 updated |
| V-05 | The accent rule's square ends stood out past the card's 16 px rounded corners | minor | 01, 02, 03, 04 | Accent rule clipped to the card shape (`clipPath` `cardClip`) |
| V-06 | The style and defs blocks differed between the four screens, so the same classes were defined differently | minor | 01, 02, 03, 04 | Same style block and defs on all four screens; classes unused on a screen are kept so the set is identical |

**Open points for the user**

1. **Two primary hues in the top-right and the stepper row.** New project is the F-07 blue (#2563eb) and Next is the indigo-violet brand gradient. Both are filled primary buttons in different hues. Options: (a) keep both (current, owner decision 7); (b) make Next the F-07 blue, which gives one primary hue in the stepper row and matches the header; (c) restyle New project to the indigo brand, which changes the approved F-07 frame. This is the same question as usability open point 3; the visual choice is the hue.
2. **Button captions "Prev" and "Back".** Covered by usability open point 1. The captions are drawn as "Prev" and would change with that decision.

## Change of 2026-11-17 (step pill and body title removed)

The user asked to remove the "STEP N OF 4" pill and the body title ("Project" and the other step names) from the card on all four screens. The stepper above still names each step, so the card keeps only the placeholder line. Both reviews were already run on the screens before this change; the change removes elements and moves the placeholder up, and it was checked for well-formedness only.

**Story conflict, resolved 2026-11-17.** AC-013 required each step body to show the title of its step. The user chose to amend it: the stepper shows the title, and the body shows the placeholder line only. The amendment is recorded in `progress.md`.

## Approval

Approved by the user on 2026-11-17, with Prev kept as the button name and the placeholder line visible until F-09 to F-13 replace it.
