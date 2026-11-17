# SDDBuilder — Features

Status: updated 2026-11-16 from the owner's draft. Every feature is **Not started**. Each feature gets its own specification (stories, screens, plan) when it is started, in the order below. The IDs are the build order: MVP first, then post MVP.

Numbering: the **Draft** column gives the number in the owner's draft. "Added" marks a feature the documents require for the MVP but the draft does not list; it is to be confirmed.

---

## 1. Review

1. **Items 1 to 8 are "UI only".** The UI needs the pipeline model, the checks, the generator and the analyzer behind it, so these are added as F-02 to F-06 (to confirm).
2. **Demo.** The draft puts "Demo for users" after the MVP (F-24). `ui.md` §1.1 has a Demo button in the MVP header. One of them must change; open point 1.
3. **Presentation mode.** The draft calls it "Presentation web site" and puts it after the MVP (F-23). `idea.md` lists presentation mode as MVP. I followed the draft; open point 2.
4. **Download and Generate.** The draft has "Generate and Download API" as one item, which fits the stateless design (a zip is returned by the request that makes it). No separate download API.
5. **Abuse, cost and privacy controls** are moved to post MVP (F-17), as the owner decided. The public service must not be opened to the internet until F-17 is built; internal use is not affected.
6. **Output formats** that `idea.md` lists as next (Spec Kit, OpenSpec, presets, the self-check, the share link, skills and scripts) are not in the draft. Not added.

---

## 2. MVP

| ID | Title | Draft | Depends on |
|---|---|---|---|
| F-01 | Project scaffolding: workspaces, TypeScript strict, Vitest, the task check script | 1 | — |
| F-02 | Pipeline model and the default pipeline: `ProjectConfig`, flows, blocks, the parser, the default pipeline data | added | F-01 |
| F-03 | Structural checks: the rules of `architecture.md` §12, shared by the builder and the analyzer | added | F-02 |
| F-04 | Generator core: the pipeline to a file tree, deterministic paths, the check of the model's reply | added | F-02 |
| F-05 | Claude Code templates: commands, agents, rules, base files, the process diagram in `process.md` | added | F-04 |
| F-06 | Analyzer: structural findings plus the LLM review (advice only), server side | added | F-03, F-05 |
| F-07 | UI layout template: header (logo, New project), app footer (not saved), centre area | 2 | F-01 |
| F-08 | Wizard stepper (UI only): four steps, Prev and Next buttons, the stepper is not clickable | 3 | F-07 |
| F-09 | Project step (UI only): name and idea (5,000 characters, counter) | 4 | F-08 |
| F-10 | Technical details step (UI only): stack, architecture, rules as blocks | 5 | F-08 |
| F-11 | Pipeline builder (UI only): the Pipeline tab, flow tabs and +, the Pipeline toolbox, the live structure marks | 6 | F-02, F-03, F-07, F-08 |
| F-12 | Workflow builder (UI only): a flow tab, its blocks, properties, custom agents, switch off and delete | 7 | F-11 |
| F-13 | Analyze and generate step (UI only): privacy notice, Analyze block, project preview, Generate and download button | 8 | F-09, F-10, F-12 |
| F-14 | Analyze API: `POST /analyze` takes the configuration, returns the findings | 9 | F-06 |
| F-15 | Generate and Download API: `POST /generate` takes the configuration, returns the zip | 10 | F-04, F-05, F-14 |
| F-16 | API and UI integration: the step sends the configuration, shows findings, generates and downloads | 11 | F-13, F-14, F-15 |

---

## 3. Post MVP

| ID | Title | Draft | Depends on |
|---|---|---|---|
| F-17 | Abuse, cost and privacy controls: rate limit, input caps, daily ceiling, no brief in logs (moved from the MVP) | added | F-14 |
| F-18 | Pipeline import and export (JSON) | 12 | F-16 |
| F-19 | Cursor target | 13 | F-05 |
| F-20 | Copilot target | 14 | F-05 |
| F-21 | Projects list (needs storage; decided with F-18) | 15 | F-18 |
| F-22 | Browser-local autosave | 16 | F-16 |
| F-23 | Presentation web site | 17 | F-11, F-05 |
| F-24 | Demo for users | 18 | F-16 |
| F-25 | Deployment | 19 | F-16 |

---

## 4. Open points
1. **Demo.** Post-MVP (draft) or in the MVP header (`ui.md` §1.1)?
2. **Presentation mode.** Post-MVP (draft) or MVP (`idea.md`)?
3. **Added MVP items F-02 to F-06.** Confirm they belong in the MVP.
4. **Deployment.** Post-MVP in the draft. Is internal use (the current plan) served without it?
