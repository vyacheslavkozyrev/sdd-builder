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
4. **The Map tab is the first tab, with no block toolbox.** The + on the tab row adds a flow. Each flow opens in its own tab, where the toolbox lists every block kind (F-06 screen).
5. **Privacy notice on step 4 only** (F-22).

## Review history

On 2026-11-15 the wizard set (then one feature) was reviewed by the `usability` and `visual` agents and their findings were applied. The findings and their record stay in git history; the set was split into F-05, F-21 and F-22 afterwards.

## Open points for the owner

- **Gate on the Map tab.** The Map tab has no toolbox, so how a gate or check is added to a connection is open. Decide it in F-06's specify.
- **Pipeline properties.** Screen 02 puts them beside the diagram; `building-blocks.md` §1 says above. Confirm which.
