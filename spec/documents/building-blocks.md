# SDDBuilder — Building Blocks

Status: decided 2026-11-11 with the owner. Supersedes the earlier "container" wording. Not yet reflected in `packages/core` or in the F-02 stories; next step is to update the model and the stories to match.

## Decisions

1. **Two levels.** A **global map** shows the process as workflows connected to each other. Each **workflow** is one diagram on its own tab, with its steps in order.
2. **A workflow is a tab.** Adding a tab creates a workflow. Workflows do not nest.
3. **Scope is the iteration source.** A workflow runs once (project), for each feature in `features.md` (feature), or for each task in `plan.md` (task). Scope replaces the old scope field and the repeat rule.
4. **Skills are in the MVP**, next to commands and agents.
5. **Rule sets are a tag on a node.** Quality gates stay as separate condition nodes.
6. **No repeat by count**, not even after the MVP.
7. **Branching is in the MVP.** A condition has a pass output and a fail output. Each output goes to the next step, back to an earlier step in the same workflow (a retry), or stops the process.
8. **Retry round limits are optional and set by the user.** The framework sets no default. The analyzer warns when a retry has no limit, because each round can cost a model call.
9. **Connections on the map.** An edge means "runs after". An edge can be labelled with the artifact it hands over (for example `stories.md`, `plan.md`). The map has no cycles.
10. **Gates are in the MVP, on steps and on map connections.** A gate after a step sits inside the workflow. A gate on a connection holds the next workflow until it passes, for example an approval between Specify and Implement.
11. **Autosave is post-MVP** (F-20). The MVP keeps nothing between visits.

## 1. The two levels

### Global map

- One diagram per project. Nodes are workflows; each shows its name, its scope, its iteration source, and counts of its steps, gates and branches.
- A connection can carry a **gate**. The next workflow starts only when the gate passes; a failed gate keeps the work in the earlier workflow. Example: an approval between Specify and Implement.
- Edges connect workflows. An edge is labelled with the artifact it hands over, when there is one.
- **How an edge matches items.** Items form a chain: project contains features, a feature contains its tasks. An edge joins items through the parent they share:
  - Verify for feature F1 waits for the tasks of F1 only.
  - Implement for a task waits for the feature that produced it.
  - A project-scope workflow waits for all of its feature and task items.
- A workflow may carry a user-written `description` saying what the workflow does. Unset means none.
- Validation: the map has no cycles; each task workflow is fed by a feature workflow that produces its task list; each iteration source is produced by an upstream workflow; no workflow is unconnected.

### Workflow tab

- One diagram: an ordered sequence of steps, with conditions after steps, and branch arrows that go back to an earlier step.
- The header shows the scope and its iteration source, for example "Scope: task · for each task in plan.md".
- Rule tags sit on the nodes that use them.
- A step may carry a user-written `description` saying what the step should do. Unset (or empty), the catalog summary is used. The description is part of the input the LLM uses to write the step's file (F-07).

## 2. Node kinds (inside a workflow)

| # | Kind | What it is | Example | Runs | Diagram shape | Generated as (Claude Code) | MVP |
|---|---|---|---|---|---|---|---|
| 1 | **Start / End** | Entry and exit of a workflow | "Start task", "Task done" | — | circle | nothing (structure only) | ✅ |
| 2 | **Command** | A prompt the user invokes; runs in the main session and can ask the user | `/specify`, `/plan`, `/commit` | by the user | rounded rectangle | `.claude/commands/<name>.md` | ✅ |
| 3 | **Agent** | A subagent with its own context, tools and model, started by a command or a workflow step | `implement`, `review`, `test` | by a command or a step | rounded rectangle, "agent" badge | `.claude/agents/<name>.md` | ✅ |
| 4 | **Skill** | A capability the model picks up from its description | "write a stories file", "run a security scan" | by the model | rounded rectangle, "skill" badge | `.claude/skills/<name>/SKILL.md` | ✅ |
| 5 | **Script** | A deterministic command with an exit code; no model involved | format, build, `task-check.sh` | automatically | rectangle, monospace label | `scripts/<name>.sh`, called from a command | ✅ |
| 6 | **Condition** | A check with a pass and a fail output. Used as a quality gate (fail stops) or a branch (fail routes back). See §3 | approval, checks passed, review clean, diff ≤ 400 | automatically or by the user | diamond with two labelled outputs | text inside the command and in `process.md` | ✅ |
| 7 | **Rule set (tag)** | Coding or QA rules attached to a node as context. A tag, not a node | `typescript.md`, `qa.md` | when the node runs | small tag on the node | `.claude/rules/*.md`, referenced by the node's command | ✅ (as a tag) |
| 8 | **Artifact** | A file a step reads or writes | `stories.md`, `plan.md` | — | note on the arrow | the spec template | Post-MVP (names only in MVP) |
| 9 | **Note** | A comment for the reader, not generated | client-facing explanation | — | sticky note | nothing (or `process.md`) | Post-MVP |

### Rules for each kind

- **Command and agent are different.** A command is what the user starts; an agent is what a command or a step starts.
- **Script exists because a check should not cost a model call.**
- **Skill is separate from command** because the invocation differs: a command is typed, a skill is picked by the model. Claude Code and OpenSpec both have skills (`architecture.md` §8).
- **Rule set is a tag** so the diagram stays readable. The inspector lists the rule files.

## 3. Conditions and branching

Three things look alike; keep them apart:

| Type | When it is decided | Example | How it is set | Status |
|---|---|---|---|---|
| **Design-time include** | When the framework is generated | "Include e2e tests only if the project has a UI" | the `enabled` switch, set by the brief or a preset | MVP |
| **Quality gate** | When the process runs, after a step | "Commit only when the diff is at most 400 lines" | a condition whose fail output is stop | MVP |
| **Branch** | When the process runs, to choose where to go next | "Review found blockers: go back to implement; otherwise continue" | a condition with a pass and a fail output, each routed | MVP |

A **branch** reads the result of the step before the condition and sends the work to the matching output. Each output goes to one of three places:

- **Next step** in the workflow's order.
- **Back to an earlier step in the same workflow.** A retry. The round limit is optional; if the user sets none, the generated instructions say so ("retry until clean; no limit set").
- **Stop.** The process ends and the user sees why.

A **quality gate** is a branch whose fail output is stop, with no retry.

Branch rules:

- **Both outputs are wired.** An unwired output is a structural error.
- **Routes stay in the workflow.** A branch can route to a step in the same workflow or stop. It cannot jump to another workflow; cross-workflow flow is the map's job.
- **No unreachable steps.** A step no route can reach is a structural error.
- **Generated as explicit instructions.** The workflow command writes each branch as a numbered rule.

## 4. Example: the reference process

**Specify** (scope: feature, for each feature in `features.md`)

1. Define feature (command `/specify`, asks the user questions)
2. Refine (command; updates the stories after the user's answers)
3. Plan (command `/plan`), then approval gate: approved → next; changes requested → back to Refine (no limit set)
4. Output: `stories.md`, `plan.md`

**Implement** (scope: task, for each task in `plan.md`)

1. Implement (agent `implement`)
2. Code review (agent `review`) → branch: blockers → back to Implement; clean → next
3. Unit tests (script `task-check.sh`) → branch: fail → back to Implement; pass → next
4. End-to-end tests (script; design-time include, only if the project has an e2e suite) → same branch as unit tests
5. Commit (command `/commit`) → quality gate before the step: diff ≤ 400 lines; fail → stop
6. Output: one commit per task

**Verify** (scope: feature)

1. Verify (agent `test`, verify mode) → quality gate: every criterion covered

**Release** (scope: project)

1. Release (command; runs once after all features are verified)

### The map for this process

`Specify` → (stories.md, plan.md) → `Implement` → (commits) → `Verify`, matched per feature → `Release`, after all features are verified.

## 5. Recommended MVP set

1. The global map: workflows, scope, connections with artifact labels
2. Workflow tabs: one diagram per workflow
3. Start / End
4. Command
5. Agent
6. Skill
7. Script
8. Condition: quality gate and branch, with optional round limits
9. Rule set as a tag on a node

Post-MVP: Artifact as a shape, Note.

## 6. Other recommendations

1. **Show the generated file for every step** in the inspector. This links the diagram to the output and helps when you explain it to a client.
2. **Give every node and workflow a stable id.** Connections, branch routes and the self-check (F-10) refer to them.
3. **Human input is a condition, not a separate kind.** Approval is the first human input.
4. **Validate structure, not only content** (see §1 and §3): no cycles on the map, every iteration source produced upstream, every condition with both outputs wired, every step reachable. This extends the structural checks in F-04.
5. **Warn on unbounded retries.** A retry without a limit is allowed, but the analyzer flags it.

## 7. Impact on the current documents

| Document | What changes |
|---|---|
| `packages/core/src/model.ts` | `BlockDefinition` becomes a union of node kinds; workflows with scope and steps; map edges with artifact labels; conditions with pass and fail routes |
| `packages/core/src/catalog.ts` | the nine SDLC blocks become steps inside the Specify, Implement, Verify and Release workflows |
| `spec/specifications/F-02-generator-core/stories.md` | AC-001 to AC-004 assume a flat list of blocks; they must be rewritten for workflows and steps |
| `spec/documents/architecture.md` §10 | the diagram has two levels: the map and the workflow tabs |
| `spec/documents/features.md` | F-04 adds map validation; F-06 covers the map and the workflow tabs; F-14 custom steps; F-15 gates; F-18 the presentation shows the map |
| `design/mockups/` | the builder shows workflow tabs; a new global map screen |
| `templates/README.md` | a mapping row for each node kind and for the generated workflow command |

## 8. Open questions

None blocking. Round limits are the user's choice (decision 8). Confirm when the first workflow is specified: whether an edge may carry an artifact that no step writes explicitly (for example a file written by a skill).
