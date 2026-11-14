# Templates

Text files that describe the layout of a project and what each file should contain. The generator fills their placeholders and fixes the file list; at generation the LLM writes the final content from these texts and the block descriptions. Templates are data: changing a template changes the output, not the generator code. Templates contain no scripts.

## Placeholders

| Placeholder | Value |
|---|---|
| `{{projectName}}` | `ProjectConfig.name` |
| `{{idea}}` | `ProjectConfig.idea` |
| `{{stack.language}}`, `{{stack.framework}}`, `{{stack.testFramework}}`, `{{stack.buildTool}}` | from `ProjectConfig.stack` |
| `{{architecture.style}}` | `ProjectConfig.architecture.style` (one text; no module list) |
| `{{process.diagram}}` | the Mermaid flowchart of each command's flow, in fenced `mermaid` blocks, rendered from the map |
| `{{rule.title}}`, `{{rule.body}}` | inside a rule layout: the title and the body of one rule block |
| `{{command.name}}`, `{{command.description}}` | inside the pipeline command layout: its file name (`pipeline`) and its description |
| `{{command.arguments}}` | the Start block's arguments as an argument hint and a list (name, required or optional, hint) |
| `{{agent.scope}}` | the scope of an Agent block with its iteration source (for example "for each task in plan.md") |
| `{{flow.name}}`, `{{flow.blocks}}` | inside a flow layout: its name and its enabled blocks as a numbered list in order |
| `{{pipeline.flows}}` | inside the pipeline layout: the child flows in order, with the gate or check on each connection between them |
| `{{command.blocks}}` | the enabled blocks as a numbered list in order; each Agent block names the agent it runs and its scope |
| `{{command.rules}}` | the conditions as numbered rules: the check, the pass route, the fail route, the round limit (or "no limit set") |
| `{{agent.name}}`, `{{agent.description}}`, `{{agent.model}}`, `{{agent.tools}}` | inside an agent layout: the frontmatter values of its Agent block |
| `{{agent.body}}` | the body of the agent, written by the user or by the LLM from the description |
| `{{#block:<id>}}…{{/block:<id>}}` | content kept only when that block is enabled |

Placeholders with no value fail the generation with a clear error; they are never left in the output.

## Layout

```
templates/
  base/           files every project gets (CLAUDE.md, process.md, spec template)
  commands/       one layout for the pipeline command file
  agents/         one layout for an agent file, filled per Agent block that runs an agent
  rules/          one layout for a rule file, filled per rule block; the content comes from the brief
  claude/         Claude Code file layout (the MVP target)
```

Cursor and Copilot are post-MVP. Their mapping is not planned yet; when the feature is specified, the mapping is confirmed against each tool's current documentation.

## Claude Code layout (MVP)

| Output file | Source |
|---|---|
| `CLAUDE.md` | `base/CLAUDE.md` |
| `spec/documents/process.md` | `base/process.md`, with the Mermaid view of each command's flow |
| `spec/specifications/F-00-template/*` | `base/spec-template/` |
| `.claude/commands/pipeline.md` | `commands/`, the pipeline: its arguments, its flows in order, and the gates and checks between them |
| `.claude/commands/<flow>.md` | `commands/`, one per child flow: its blocks in order, its agent calls, its conditions as numbered rules |
| `.claude/agents/<name>.md` | `agents/`, one per Agent block: frontmatter (name, description, model, tools) and the body |
| `.claude/rules/<title>.md` | `rules/`, one per rule block; referenced from the agents and commands that carry the tag |

Every file in the table is a layout the LLM fills at generation, except the values taken from the model. Skills and scripts are not generated in the MVP.

## Condition and handover text

A condition becomes a numbered rule in the command, for example:

> 2. After block 2 (Review): unless the review reports no blocker or warning, go back to block 1 (Implement), retrying at most 2 times; if the limit is reached, stop and report. Otherwise continue.

A condition with no round limit says so: "retrying until it passes (no limit set)". A quality gate becomes a stop rule: "unless the checks pass, stop and report." A connection carries its artifact as a handover line: "Hand over `plan.md` to the next block."

Where a concept has no native equivalent in a tool, the output says so in the generated `process.md` instead of inventing a feature.
