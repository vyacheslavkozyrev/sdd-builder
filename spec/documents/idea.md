# SDDBuilder — Idea

Status: draft for review. Reflects the decisions up to 2026-11-16 (see §Decisions); the model of commands and blocks is in `building-blocks.md`, and the user interface is in `ui.md`.

Note on screens: the files in `spec/design/features/` are **wireframes**. They show layout, content and states. They are not the final UI, and colours, fonts and icons are placeholders.

## Summary

A web service where a developer designs a spec-driven development (SDD) process for a project and downloads it as a ready project structure: instruction files, spec templates, commands, agents and rules for Claude Code.

The user does two things in the browser:

1. **Designs the process.** The process is one pipeline on the Pipeline tab: its flows in order, with the gates and checks between them. Each flow has its own tab with its blocks (start, agents, conditions, connections and end).
2. **Describes the project.** A four-step wizard: the idea, the technical details (architecture, tech stack, code rules), the workflow (the builder), and analyze, then generate and download.

The service checks both and produces the framework. The user downloads a zip.

## Problem

The working process in the ComEd and PhotoSync projects works: one task at a time, implement → review → test → commit, with traceability from requirement to commit. Setting it up in a new project is manual: about 20 files that reference each other by path, with project-specific details (build commands, forbidden words) hardcoded in them. Each new project starts from copy-paste, and the copy drifts.

Consultants who sell such a process to clients also draw it by hand, often in a separate diagram tool, and then build the setup from that drawing. The builder should be that diagram.

## Users

| User | Goal | Notes |
|---|---|---|
| Solo developer or small team using Claude Code | Start a project with a working SDD process in minutes | The main user of the MVP |
| Consultant or agency lead who sells an SDD process to clients | Show the process as a diagram, agree it with the client, then set it up | Uses the builder's presentation mode as a sales tool |
| Team already using GitHub Spec Kit or OpenSpec | Keep their tool and get our process and gates | Reached through the planned compatible outputs (post-MVP) |

## Core concept

1. **The pipeline.** The process is one pipeline on the Pipeline tab. It contains flows, one nesting level: a flow contains blocks, and an Agent block runs an agent, never a flow.
2. **Blocks.** A flow contains five kinds of block: **Start**, **Agent** (runs an agent; has a name, a description, arguments that also say what it works on and its scope, restrictions, a model and a body), **Approval** (a person decides), **Check** (an agent decides: checks or diff size; a pass output and a fail output), and **End**. Connections link blocks and flows and carry the artifact they hand over.
3. **Pipeline tab.** The pipeline's flows in order, with the connections, approvals and checks between them. Each flow has its own tab; a + button adds a flow.
4. **Quality gates and branches.** A condition's fail output stops the process (a gate) or goes back to an earlier block in the same command (a branch), with an optional round limit set by the user.
5. **The default pipeline.** The process the owner uses today: specify, ux and plan, each with a human approval; build for each task (implement, review, test, commit); verify; complete.
6. **Project brief.** Free text for the idea. Structured fields for the architecture style, the tech stack and the code rules; each rule block becomes its own Markdown file.
7. **Analysis, in two layers.**
   - *Structural checks (deterministic):* one start per command, every connection joins two blocks of the same command, both outputs of each condition wired, every block reachable, no cycles in the map or in the calls, and a warning on a retry with no round limit.
   - *Semantic review (LLM, advice only):* gaps in the idea, rules that contradict each other or the stack, test rules that name tools outside the stack, and suggested blocks.
8. **Generation.** Renders the framework from the brief and the process into a file tree. The LLM writes the final commands, agents and rules from the description of each block; the generator fixes the file layout and the process structure and checks the model's reply.
9. **Generate and download.** One button, enabled once the analysis has no blocker. It produces one zip with the project structure, ready to unpack into a repository.

## Product direction

- **MVP:** Claude Code target only, desktop browsers only. The Pipeline tab with the pipeline, with a presentation mode. Blocks (start, agent, approval, check, end), quality gates, branches, custom agents. The four-step wizard. Structural checks plus LLM review. Zip download. Anonymous and stateless: nothing is kept between visits.
- **Next (order to confirm):** GitHub Spec Kit and OpenSpec outputs; presets (other starting pipelines); a self-check of the generated project (every path a command names must exist).
- **Post-MVP:** save, import and export of projects (F-08); a read-only share link for clients (F-19); browser-local autosave (F-20); skills and scripts as blocks.
- **Later:** Cursor and Copilot targets, accounts, a gallery of shared configurations.

## My assessment

**What is strong**

- The process is the valuable part, and two real projects already use it. The service packages proven practice rather than inventing one.
- The process is data (commands, blocks, gates, the brief), so the output is reproducible and easy to version.
- Claude Code's native model (commands, subagents, rules, `CLAUDE.md`) maps directly onto commands and blocks.
- The builder is also the sales tool: the diagram that is agreed with a client is the same one that generates the setup.

**Risks to design for**

1. **Too heavy for a new project.** The default pipeline has six phases, several agents and a 400-line diff guard. A new user should get a lighter pipeline first; the full one is the default. Presets matter as much as the builder.
2. **LLM cost and abuse.** An anonymous service that calls a paid model can be drained by one script. Rate limits, input caps and a daily spending ceiling are part of the MVP (F-13).
3. **Privacy of the brief.** The brief goes to the model provider during analysis. The user must be told this before they submit, and the server must not store or log brief content.
4. **LLM output is advice, not truth.** Findings are shown to the user and never edit the process automatically. If the model is down, the structural checks still run.
5. **Generated paths drift from generated files.** The reference projects have `test-docs.sh` for exactly this. The generator must check its own output (F-10).
6. **Stack commands are not generic.** The references hardcode `swift format`, `swift build`, `xcodebuild`. Stack-specific checks must come from the stack choice, not from a fixed template.
7. **Competition.** Similar open-source SDD kits exist (GitHub Spec Kit, OpenSpec, BMAD, Agent OS) and several Claude Code scaffolders. The differentiators are the visual process design, the gates and branches, and the LLM-checked brief. See [market-research.md](market-research.md). Re-check the competitors before public launch.
8. **Unbounded retries.** A retry with no round limit is allowed, but each round can cost a model call. The analyzer warns about it.

## Decisions

1. **Target.** Claude Code only in the MVP. GitHub Spec Kit and OpenSpec outputs come right after the MVP. Cursor and Copilot are later.
2. **Analyzer.** Structural checks plus an LLM review, server-side only. The LLM advises and never edits the process.
3. **Hosting.** Anonymous and stateless. No accounts, no server-side storage. Nothing is kept between visits in the MVP.
4. **Custom blocks.** Users can write their own agents. They are always optional, so required blocks stay fixed.
5. **Compatible outputs.** We support GitHub Spec Kit and OpenSpec layouts, so teams keep their tool and get our process and gates. Planned after the MVP (`architecture.md` §8).
6. **Gates are in the MVP and configurable.** Fixed types: approval (a person decides), checks and diff size (an agent decides). Review is an Agent block, not a gate type. Users set thresholds and place gates between blocks and between flows. No user-written check commands in generated projects.
7. **The builder is the process diagram.** The Pipeline tab is the main view. The presentation mode shows the map to a client. No Miro step and no image export in the MVP.
8. **One nesting level.** Only the pipeline contains flows. An Agent block has no scope field: its scope is written in its arguments (2026-11-16).
9. **Blocks are five kinds:** start, agent, approval, check, end; connections link them. Skills and scripts are not block kinds in the MVP.
10. **Branching is in the MVP.** A condition has a pass and a fail output. A fail can route back to an earlier block in the same command, or stop. Round limits are optional and set by the user; the analyzer warns when a retry has none.
11. **The default pipeline** is the flow of `pipeline.md`, written as flows (`building-blocks.md` §4).
12. **Four-step wizard.** Project name and idea; technical details, with code rules as one file per rule block and no module list; workflow (the builder); analyze and generate. No Brief / Builder switch.
13. **Autosave, save, import, export and the share link are post-MVP.** The MVP keeps nothing between visits; the wizard says so.

14. **Text limits (2026-11-16).** Every body text is at most 1,000 characters. The idea and the architecture text are at most 5,000 characters (`architecture.md` decision 28).
15. **Desktop only, with Material UI (2026-11-16).** No phone or tablet layout in the MVP. The UI uses Material UI components (`architecture.md` decision 31).
16. **Wizard navigation and step 4 (2026-11-16).** The stepper is not clickable; Prev and Next are buttons beside it. Step 4 has an analyze block and a project preview, with one Generate and download button (`architecture.md` decision 32).

## Open questions

1. **Analyzer model and daily budget.** Deferred by the owner. Decide before F-04 is built and before launch.
2. **Required blocks in the default pipeline.** Proposed: the approvals and the diff-size gate stay required. To confirm in `building-blocks.md` §9.
3. **Interactive phases.** Resolved 2026-11-14: the pipeline runs in the main session and asks; agents never ask (`building-blocks.md` §4, decision 13).
4. **Agent body length.** 1,000 characters for every body, or more for agents (`ui.md` D2).
5. **How scope is expressed without a field.** The argument text must say when an agent runs (per task, per feature); the generator and the analysis need a rule for it (`ui.md` D6).
