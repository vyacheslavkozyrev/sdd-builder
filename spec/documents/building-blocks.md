# SDDBuilder — Building Blocks

Status: decided 2026-11-14 with the owner, revised the same day three times, and on 2026-11-15 (F-06: `review` is no longer a check type). The model has two levels of flow: the **pipeline** (the one flow that can contain other flows) and **flows** (which hold blocks only). Replaces the 2026-11-11 model (workflows as tabs of steps, nine node kinds). Not yet reflected in `source/packages/core` or in the feature specs; the features are re-specified after F-01 is reworked (`features.md`).

## Decisions

1. **Two levels, one nesting.** The **pipeline** is the top-level flow. It contains **flows** (child flows, one per phase or step of the process). A flow contains blocks only. A flow cannot contain another flow.
2. **The pipeline describes the process we built.** The default pipeline is the flow of `.claude/commands/pipeline.md`: specify, ux, plan, build (per task), verify, complete, with the approvals and checks between them (§4).
3. **Gates and checks sit between flows.** A Condition can sit on a Connection between two flows in the pipeline. It holds the next flow until it passes. An approval or a check between flows is a gate.
4. **Five block kinds inside a flow:** Start, Agent, Condition, Connection, End. In the pipeline there is one more kind, **Flow**, which holds a child flow.
5. **Agents run agents, never flows.** An Agent block runs an agent (`.claude/agents/<name>.md`). Only the pipeline runs flows.
6. **Scope is an attribute of an Agent block.** It says what the block repeats over: `project` (once), `feature` (for each feature in `features.md`), or `task` (for each task in `plan.md`). Start blocks carry the arguments.
7. **Arguments are on the pipeline's Start block:** name, required or optional, hint. They become the pipeline command's argument hint.
8. **A Condition has a fixed check type** (`approval`, `checks`, `diff-size`; `review` was removed on 2026-11-15, F-06: a review is an Agent block followed by a `checks` Condition). Its pass output and fail output are both wired. A fail output goes to the next block, back to an earlier block in the same flow (a retry), or, at pipeline level, to an earlier flow; or stops the process. A condition whose fail output stops is a quality gate.
9. **A Connection is a "runs after" link** between two blocks, or between two flows in the pipeline. It carries the artifact it hands over, as a label. A gate on a connection is a Condition placed on it.
10. **No cycles.** Flows and their connections form an acyclic order, except for retries of Conditions, which go back to an earlier block of the same flow or, at pipeline level, to an earlier flow.
11. **Rule sets are tags** on Agent blocks and on flows. They point at files in `.claude/rules/`.
12. **Round limits are optional and set by the user.** The framework sets no default. The analyzer warns when a retry has no limit, because each round can cost a model call.
13. **A disabled block or flow is left out.** Switched off (`enabled: false`), it is not checked, not drawn, not generated and not sent to review. It keeps its properties, so it can be switched back on.
14. **Human decisions are asked by the main session.** The pipeline command runs in the main session, so a Condition decided by a human is asked there, and so is the connection to the next flow when it waits for a person. Agents run as subagents and never ask questions.
15. **The development environment is not generated.** This repository's own `.claude/` (commands, agents, rules) is our working environment. A generated project gets the pipeline command, one command file per child flow, the agent files of its Agent blocks, the rule files from the brief, and the base files.
16. **Autosave is post-MVP** (F-20). The MVP keeps nothing between visits.

## 1. The Map tab

- The Map tab shows the **pipeline**: one diagram of its child flows, in order, left to right.
- Each flow is a node. It shows its name, its scope and its number of blocks.
- A Connection between two flows is drawn as an arrow with the artifact label. A Condition on that connection (a gate or a check) is drawn as a diamond on the arrow, with its pass and fail outputs.
- Selecting a flow opens its tab (below). Selecting a connection or a gate opens its property panel.
- The pipeline's own properties (name, description, arguments, model, tools, rule tags, body) are in a panel to the right of the diagram (decided 2026-11-15).
- A toolbox to the left of the diagram holds Connection, Approval and Check (decided 2026-11-15). Drag an Approval or a Check onto a connection between two flows. A tab row holds the Map tab, one tab per flow in order, and a + that adds a flow after the last tab.

## 2. Flow tabs

- Each child flow has its own tab. The tab shows the flow's blocks in order: Start, Agent, Condition, Connection, End.
- The tab's toolbox holds Start, Agent, Condition, Connection and End. A flow has one Start and at least one End.
- The header shows the flow's name, description and scope. The scope is set on its Agent blocks (§3).
- Selecting a block opens its property panel.

## 3. Blocks

| Block | What it is | Properties | Diagram shape | Generated as (Claude Code) |
|---|---|---|---|---|
| **Start** | Entry of a flow. Exactly one per flow (the pipeline's Start carries the arguments) | arguments (pipeline only: name, required, hint) | circle | the argument hint of the pipeline command |
| **Agent** | Runs an agent | name (file-safe, unique); description (when Claude should use it; required); scope (`project`, `feature`, `task`) with its iteration source; model (`haiku`, `sonnet`, `opus`, `inherit`); tools (allowed list); body (instructions); reads and writes (artifacts); rule tags | rounded rectangle, with an "agent" badge and the scope | `.claude/agents/<name>.md` with frontmatter (name, description, model, tools) and the body; a call in the flow's command file, repeated per scope |
| **Condition** | A check with a pass and a fail output. Sits in a flow, or on a connection between flows | check type (`approval`, `checks`, `diff-size`); description (what passing means); decided by (`human` or `agent`); threshold (`diff-size` only, lines); pass route; fail route (next, back to a block with an optional round limit, or stop) | diamond with two labelled outputs | a numbered rule in the command file of the flow, or in the pipeline command when it sits between flows |
| **Connection** | A "runs after" link between two blocks, or between two flows | artifact label (the file handed over) | arrow with a label | the handover named in the command file |
| **Flow** (pipeline only) | A child flow | name; description; scope of the flow (project, feature, task, set from its Agent blocks); enabled | rounded rectangle with a "flow" badge and its block count | `.claude/commands/<flow>.md`, called in order by the pipeline command |
| **End** | Exit of a flow (or of the pipeline). One or more | produced artifact (optional); outcome (`done` or `stopped`); description (optional) | circle | the last step of the command file |

Every block also has an **id** (stable, used by routes and by the self-check, F-10) and **enabled** (on or off).

## 4. The default pipeline

The default pipeline is the flow of `.claude/commands/pipeline.md`, written as flows. Its child flows, in order:

1. **specify** (flow). Agent `specify` (scope `feature`): drafts `stories.md`. Its questions are asked by the main session before it starts.
2. **ux** (flow). Agent `ux` (scope `feature`): draws the screens under `spec/design/features/`, from the stories. Its screens are approved before the plan is written.
3. **plan** (flow). Agent `plan` (scope `feature`): drafts `plan.md` from the stories and the approved screens.
4. **build** (flow). Per task (scope `task`, iteration `plan.md`): Agent `implement` → Agent `review` → Condition `checks` (description: "the review reports no blocker or warning"; fail back to `implement`) → Agent `test` → Condition `checks` (the check runs; fail back to `implement`) → Condition `diff-size` (400 lines; fail stops) → Agent `commit`. One commit per task.
5. **verify** (flow). Agent `verify` (scope `feature`, verify mode: every criterion covered).
6. **complete** (flow). Agent `complete` (scope `feature`): marks the feature complete and commits its spec folder.

Gates and checks between the flows:

| Between | Gate or check | Decided by | Fail |
|---|---|---|---|
| specify → ux | `approval` on the stories | human | back to specify |
| ux → plan | `approval` on the screens | human | back to ux |
| plan → build | `approval` on the plan | human | back to plan |
| build → verify | `checks`: all tasks committed and the check passes | agent | stop |
| verify → complete | `approval`: the manual checklist results | human | back to verify |

The pipeline's Start block takes the argument `feature-id` (required). The pipeline has no release flow: it does not release. A release flow can be added by the user.

Presets (F-09) are other starting pipelines; the default is the first.

## 5. Recommended MVP set

1. The Map tab: the pipeline as flows, with connections, gates and checks between them
2. Flow tabs: one per child flow, with Start, Agent, Condition, Connection and End
3. The toolbox per diagram, and property panels per block
4. Scope on Agent blocks; arguments on the pipeline's Start block
5. Conditions: three fixed check types; quality gates and branches; optional round limits; human approval
6. Rule-set tags on Agent blocks and flows
7. The default pipeline, as §4 lists it

Post-MVP: skills and scripts as blocks; custom agent blocks (F-14); presets (F-09); the artifact shape; notes.

## 6. Other recommendations

1. **Show the generated file for every block** in the property panel.
2. **Give every block, flow and argument a stable id.** Routes and the self-check (F-10) refer to them.
3. **Validate structure, not only content** (§7).
4. **Warn on unbounded retries.** A retry without a limit is allowed, but the analyzer flags it.

## 7. Structural rules (the analyzer, F-04)

- The pipeline has exactly one Start block and at least one End block; each child flow has exactly one Start and at least one End. The pipeline's own Start and End blocks must be enabled (the parser refuses a disabled one, F-06 amendment 7).
- Only the pipeline contains Flow blocks; a flow contains no Flow block (one nesting level).
- Every Connection joins two blocks of the same flow, or two flows of the pipeline.
- No cycle: the Connections of a flow, and the Connections of the pipeline, form no cycle. A back route is a Condition's retry, not a Connection (§10). A Connection that closes a cycle is a structural problem (F-06 amendment 6).
- Both outputs of every Condition are wired.
- Every block and every flow is reachable from the pipeline's Start.
- A back route goes to an earlier block of the same flow, or in the pipeline to an earlier flow. A back route in a child flow never leaves the flow.
- Every Agent block has a name that is file-safe and unique in the project, and a description.
- Argument names are unique.
- An Agent block with scope `task` or `feature` reads an iteration source that an upstream block produces.
- A retry with no round limit is a warning.
- Disabled blocks and flows are not checked.

## 8. Impact on the current documents

| Document | What changes |
|---|---|
| `spec/documents/idea.md` | the core concept and decisions: pipeline with flows, one nesting level, gates between flows |
| `spec/documents/architecture.md` | §3 generation (a file per flow, the pipeline command), §6 decisions, §8 output mapping, §9 gates between flows, §10 the Map tab and the flow tabs |
| `spec/documents/features.md` | F-01 to F-07, F-13 to F-15, F-18 re-scoped; F-09 presets; F-14 custom agents |
| `spec/documents/process.md` | the pipeline section lists its flows |
| `source/templates/README.md` | placeholders and layouts for the pipeline, flow and agent files |
| `CLAUDE.md` | the working rule on nesting |
| `source/packages/core/src/model.ts`, `catalog.ts` | the pipeline and flows; the five block kinds plus Flow; scope on the Agent block; the default pipeline |
| `spec/specifications/F-02` to `F-07`, `F-13` to `F-15`, `F-18` | built or specified on the previous model; re-specified after F-01 is reworked |

## 9. Open questions

1. **Required blocks in the pipeline.** Proposed: the approvals between flows, the check build → verify, and the diff-size guard inside build stay required; the rest can be removed or disabled.
2. **Flows outside the pipeline.** The owner's model puts every flow inside the pipeline. Confirm that no flow exists outside it.
