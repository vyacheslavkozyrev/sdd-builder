# UX screens — Visual builder: the Map tab and the flow tabs (F-06)

Scope: the builder is step 3 of the project wizard (`design/features/F-05-project-brief-form/`). The model is in `spec/documents/building-blocks.md`: the **pipeline** is the one flow that contains other flows (one nesting level); a **flow** contains blocks only; gates and checks sit between flows. Desktop, 1280 × 800. Wireframes in SVG; colours and wording are placeholders.

The tab row is the same on every screen: **Map** (the pipeline), one tab per flow, and **+** to add a flow.

## Legend

- **Rounded box:** a flow (on the Map tab) or an Agent block (in a flow). Under an Agent, its scope.
- **Diamond on an arrow:** a gate or check between flows, or a Condition inside a flow. The label is the check and who decides (`· human` is a decision the main session asks).
- **Pill:** a Connection, with the artifact it hands over.
- **Circles:** Start and End.
- **Orange arc, "fail: back":** a retry to an earlier block or flow. **"fail: stop":** a fail that ends the pipeline.
- **Thick outline:** required (cannot be removed or switched off).
- **Dashed grey:** switched off.

## Screens

| # | File | What it shows | States shown |
|---|---|---|---|
| 01 | `01-map-pipeline.svg` | Map tab: the pipeline's six flows in order (specify, ux, plan, build, verify, complete), with the approvals and the check between them | The pipeline selected: its properties, its flow count and gates |
| 02 | `02-map-gate.svg` | Map tab: the check between build and verify selected | The check's type, decider, description and routes (pass to verify, fail stops) |
| 03 | `03-flow-agent.svg` | Flow tab `build`: the `implement` agent selected | Its scope (per task), model, tools, reads and writes, rule tags, generated file |
| 04 | `04-flow-condition.svg` | Flow tab `build`: the `review` condition selected | Round limit "none set", with a warning that each round costs a model call |
| 05 | `05-flow-states.svg` | Flow tab `build`: refusals and a switched-off block | `implement` cannot be removed (two retries route to it); a flow cannot be added inside a flow; `diff-size` is required; `test` is switched off (dashed) |

## Decisions these screens take

1. **The Map tab is the pipeline.** Its nodes are flows, and the arrows between them are connections. Gates and checks sit on those arrows.
2. **Each flow has its own tab.** Its blocks are Start, Agent, Condition, Connection and End; the toolbox shows only these.
3. **One nesting level.** The pipeline's toolbox offers Flow; a flow's toolbox does not. A flow cannot hold a flow (screen 05).
4. **Gates between flows are the phase approvals and the check** of `pipeline.md`: approval after specify, ux and plan; checks between build and verify; the manual checklist between verify and complete.
5. **Scope is on each Agent block** (per feature, per task), so the build flow repeats its agents per task.

## Open points for layout review

1. **Two rows on the Map tab.** The six flows wrap after plan. Is that the right reading order, or should the map run in a single row with a horizontal scroll?
2. **Gate labels.** The artifact handed over is under each diamond (for example `stories.md`), and the decision is above it. Should the artifact sit on the arrow instead?
3. **Refusal of a nested flow.** The refusal is shown as a message in the panel (screen 05). Should the toolbox hide Flow in flow tabs instead of refusing a drop?
4. **Required markers.** Approvals between flows and the diff-size guard are required (thick outline). Confirm, as in `building-blocks.md` §9, question 1.
5. **Clarifying questions.** The main session asks them before each agent starts, and the answers are handed over as an artifact. That Connection is not drawn yet; it is added when the flows are re-specified.

## Archive

`archive-single-pipeline/` holds the earlier screens, where the whole pipeline was one diagram of blocks. `archive-flat-model/` holds the tab-based screens of the flat model. Both are history.
