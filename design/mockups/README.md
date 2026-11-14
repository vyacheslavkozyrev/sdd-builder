# MVP screen mockups

> **Superseded (2026-11-14).** These screens show the flat model (workflows as tabs of steps, a global map of workflows). The model is now commands and blocks (`spec/documents/building-blocks.md`), and the screens are in `design/features/`: the wizard in `F-05-project-brief-form/` and the map and command tabs in `F-06-visual-builder/`. Keep these files only as history.

**These are wireframes, not the final UI.** They show layout, content and states, drawn before any code. Colours, fonts, icons and wording are placeholders and will change.

Open `index.html` in a browser to see all screens together, or open each SVG directly.

| File | Screen | Features it covers |
|---|---|---|
| `07-map.svg` | Global map: workflows and their connections | F-06, F-18 |
| `01-builder.svg` | One workflow tab (Implement): steps, gates, branches, inspector | F-06, F-04 |
| `02-brief.svg` | Brief form with privacy notice | F-05 |
| `03-presentation.svg` | Read-only presentation of the global map | F-18 |
| `04-custom-block.svg` | Custom step editor | F-14 |
| `05-generate.svg` | File tree preview, summary, download | F-07, F-02, F-03 |
| `06-states.svg` | Rate limit, invalid configuration, LLM unavailable, empty brief | F-13, F-04, F-05 |

## Decisions these mockups assume

- **Two levels.** The global map connects workflows. Each workflow is one tab with its steps in order. Adding a tab creates a workflow.
- **Scope is the iteration source**, shown on each workflow: project (runs once), feature (for each feature in `features.md`), task (for each task in `plan.md`).
- **No nesting.** A workflow never contains another workflow.
- **Connections mean "runs after".** Labels show the artifact handed over. A feature connection matches items through the feature they share; a project connection waits for all items below it.
- **Branches** have a pass and a fail output. A fail output can route back to an earlier step in the same workflow. Round limits are optional and default to "none set".
- **Quality gates** are conditions whose fail output stops the process. A gate can also sit on a map connection and hold the next workflow until it passes (for example, the approval between Specify and Implement).
- **Rule tags** sit on nodes; the inspector lists the files.
- **Nothing is saved between visits in the MVP.** Reloading the page clears the work, as stated on screen 02. Browser-local autosave is post-MVP (F-20).

## Open points for layout review

1. Is the inspector on the right the right place on the workflow tab and on the map, or should it open over the diagram?
2. Is the presentation view enough for client conversations, or does it need a title slide?

Resolved since the last review: gates are in the MVP (F-15), and they appear on the map as well as in the workflow tabs. Browser-local autosave is post-MVP (F-20).

## Notes

- Text uses an example project, "Demo project", and "Hourly Tracker". These are placeholders.
- Renders were checked for overlaps in a preview tool, which crops the right edge. Open the SVGs in a browser for the true scale.
