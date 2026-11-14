# UX screens — Initial screen: the project wizard (F-05, with F-06 for step 3 and F-07 for step 4)

Scope: the **initial screen** of the app, as a four-step wizard. There is no Brief / Builder switch; the wizard is the whole flow. These screens are wireframes in SVG (layout, content and states; colours and wording are placeholders). Desktop, 1280 × 800.

Steps 1 and 2 are the brief form (F-05). Step 3 is the builder (F-06): the pipeline on the Map tab, placed inside the wizard. Step 4 analyzes the brief and generates the project (F-07 API, analysis from F-04).

## Screens

| # | File | Step | What it shows | States shown |
|---|---|---|---|---|
| 01 | `01-wizard-project.svg` | 1 of 4: Project name and idea | Project name; idea with a counter (8,000 max); Back off, Next | First step: Back disabled; empty fields are not stored between visits |
| 02 | `02-wizard-technical.svg` | 2 of 4: Technical details | Architecture style; language, framework, test framework, build tool; code rules as separate blocks, each showing the Markdown file it will become | Three rule blocks with their file names; Remove block; Add rule block; no modules section |
| 03 | `03-wizard-workflow.svg` | 3 of 4: Workflow | The pipeline on the Map tab: its six flows in order, the approvals and check between them; the tab row with + to add a flow; toolbox; property panel; Back and Next | The default pipeline as the starting point; Next opens step 4 |
| 04 | `04-wizard-analyze-generate.svg` | 4 of 4: Analyze and generate | Left: brief summary, privacy notice with a checkbox, Analyze, findings (warning, info). Right: Generate, the file tree the project gets (rule-block files marked), Download zip | Privacy checkbox ticked before Analyze; a warning finding; Generate before any output; Download zip disabled until generated |

## Decisions these screens take (for the user to check)

1. **Modules are removed.** The brief has no module list. The architecture is one style text.
2. **Each code rule block is one Markdown file.** A block has a title; the file name comes from the title (`rules/code-style.md`). The file is shown before the project is saved.
3. **Testing rules are also a block**, like the others.
4. **Four steps.** Step 4 is the only place where analysis and generation happen. Analysis runs before generation, and the privacy checkbox must be ticked before Analyze.
5. **Download zip** is enabled only after generation, and the zip holds exactly the tree shown.
6. **Nothing is stored between visits.** Reloading clears the wizard.

## Spec impact (not applied yet)

These screens change approved requirements. They need their own stories and plan changes before any code:

- **F-05 stories**: remove the module rows and their checks; code rules become rule blocks with a title and a body; the single form becomes the wizard; the Analyze gate and privacy notice move to step 4.
- **F-06 stories**: the builder is step 3 of the wizard, showing the pipeline on the Map tab: its flows in order, with the gates and checks between them, and a tab per flow with its blocks; the Brief / Builder switch (task T014) is replaced by the wizard flow.
- **Model (`packages/core`, F-01)**: `architecture.modules` is no longer entered; code rules become blocks with a title, a file name and a body. The analyzer's layer checks (F-04) then have nothing to check; decide whether to remove them or keep them optional.
- **Generator (F-02, F-03)**: one generated Markdown file per rule block, named from its title; the file list stays deterministic.
- **API (F-07)**: step 4 calls analyze, then generate, then the zip download.

## Open points for layout review

1. **Stepper.** Four steps above the card; the current one filled. Should completed steps be clickable to go back?
2. **Rule blocks.** The file name is shown on each block and again in the step 4 tree. Is that the right amount of repetition?
3. **Privacy.** The checkbox sits on step 4, next to Analyze, as before. Should the notice repeat at step 1, where the idea is first typed?
4. **Testing rules.** A block like the others. Keep, or make a fixed "Testing" block that cannot be removed?
5. **Findings.** Analysis findings are shown as the analyzer returns them. Should a warning link to the step where it can be fixed?
6. **Generate before analysis.** The screen allows Generate at any time. Should Generate wait for a completed analysis?
