# SDDBuilder — Idea

Status: draft for review. Reflects the decisions of 2026-11-11 (see §Decisions).

Note on screens: the files in `design/mockups/` are **wireframes**. They show layout, content and states. They are not the final UI, and colours, fonts and icons are placeholders.

## Summary

A web service where a developer designs a spec-driven development (SDD) process for a project and downloads it as a ready project structure: instruction files, spec templates, commands, agents, skills, scripts and rules for Claude Code.

The user does two things in the browser:

1. **Designs the process.** A global map connects workflows (for example Specify, Implement, Verify, Release). Each workflow has its own tab, with its steps, quality gates and branches in order.
2. **Describes the project.** Idea, tech stack, architecture, code rules and test rules.

The service checks both and produces the framework. The user downloads a zip.

## Problem

The working process in the ComEd and PhotoSync projects works: one task at a time, implement → review → test → commit, with traceability from requirement to commit. Setting it up in a new project is manual: about 20 files that reference each other by path, with project-specific details (build commands, module layers, forbidden words) hardcoded in them. Each new project starts from copy-paste, and the copy drifts.

Consultants who sell such a process to clients also draw it by hand, often in a separate diagram tool, and then build the setup from that drawing. The builder should be that diagram.

## Users

| User | Goal | Notes |
|---|---|---|
| Solo developer or small team using Claude Code | Start a project with a working SDD process in minutes | The main user of the MVP |
| Consultant or agency lead who sells an SDD process to clients | Show the process as a diagram, agree it with the client, then set it up | Uses the builder's presentation mode as a sales tool |
| Team already using GitHub Spec Kit or OpenSpec | Keep their tool and get our process and gates | Reached through the planned compatible outputs (post-MVP) |

## Core concept

1. **Workflows.** A workflow is one diagram on its own tab, with an ordered sequence of steps. Workflows do not nest. Each has a scope that says what it repeats over: once per project, for each feature, or for each task in the plan.
2. **Global map.** One diagram per project that connects workflows. A connection means "runs after", can carry an artifact it hands over (for example `plan.md`), and can carry a gate.
3. **Steps.** Command, agent, skill, script, and custom steps. Rule sets attach to steps as tags.
4. **Quality gates and branches.** A condition has a pass and a fail output. A gate's fail stops the process; a branch's fail can route back to an earlier step, with an optional round limit set by the user.
5. **Project brief.** Free text for the idea. Structured fields for stack, architecture modules and layers, code rules and test rules.
6. **Analysis, in two layers.**
   - *Structural checks (deterministic):* required steps present, module layers respect the dependency direction, the workflow rules (no cycles on the map, every input produced upstream, both outputs of each condition wired, every step reachable), and a warning on retries with no round limit.
   - *Semantic review (LLM, advice only):* gaps in the idea, rules that contradict each other or the stack, test rules that name tools outside the stack, and suggested steps.
7. **Generation.** Renders the framework from the brief and the process into a file tree. The LLM writes the final commands, agents, skills, scripts and rules from the high-level description of each block; the generator fixes the file layout and the process structure and checks the model's reply.
8. **Download.** One zip with the project structure, ready to unpack into a repository.

## Product direction

- **MVP:** Claude Code target only. Global map and workflow tabs in the builder, with a presentation mode. Steps (command, agent, skill, script), quality gates, branches, custom steps, rule-set tags. Brief form. Structural checks plus LLM review. Zip download. Anonymous and stateless: nothing is kept between visits.
- **Next (order to confirm):** GitHub Spec Kit and OpenSpec outputs; presets (Light, Standard, Full); a self-check of the generated project (every path a command names must exist).
- **Post-MVP:** save, import and export of projects (F-08); a read-only share link for clients (F-19); browser-local autosave (F-20).
- **Later:** Cursor and Copilot targets, accounts, a gallery of shared configurations.

## My assessment

**What is strong**

- The process is the valuable part, and two real projects already use it. The service packages proven practice rather than inventing one.
- The process is data (workflows, steps, gates, the brief), so the output is reproducible and easy to version.
- Claude Code's native model (commands, subagents, skills, rules, `CLAUDE.md`) maps well to the steps.
- The builder is also the sales tool: the diagram that is agreed with a client is the same one that generates the setup.

**Risks to design for**

1. **Too heavy for a new project.** The reference process has nine commands, three agents and a 400-line diff guard. A new user should get a Light preset first; the full set is the Full preset. Presets matter as much as the builder.
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
4. **Custom steps.** Users can write their own steps (command, agent, skill or script). They are always optional, so required steps stay fixed.
5. **Compatible outputs.** We support GitHub Spec Kit and OpenSpec layouts, so teams keep their tool and get our process and gates. Planned after the MVP (`architecture.md` §8).
6. **Gates are in the MVP and configurable.** Four fixed types: approval, checks, review, diff size. Users set thresholds and place gates on steps and on map connections. No user-written check commands in generated projects.
7. **The builder is the process diagram.** The global map and the workflow tabs are the main views. The presentation mode shows the map to a client. No Miro step and no image export in the MVP.
8. **Workflows.** A workflow is one tab. Adding a tab creates a workflow. Workflows do not nest. Scope (project, feature, task) is the iteration source, not a separate field.
9. **Branching is in the MVP.** A condition has a pass and a fail output. A fail can route back to an earlier step in the same workflow, or stop. Round limits are optional and set by the user; the analyzer warns when a retry has none.
10. **Skills are in the MVP.** Rule sets are tags on steps, not nodes.
11. **Autosave, save, import, export and the share link are post-MVP.** The MVP keeps nothing between visits; the brief screen says so.

## Open questions

1. **Analyzer model and daily budget.** Deferred by the owner. Decide before F-04 is built and before launch.
2. **Map artifacts.** Whether a connection may carry an artifact that no step writes explicitly (for example a file written by a skill). To confirm when the first workflow is specified (`building-blocks.md` §8).
