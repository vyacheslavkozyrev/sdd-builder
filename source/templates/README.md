# Templates

Text files that describe the layout of a project and what each file should contain. The generator (`source/packages/core/src/pipeline/generate/`) fills their placeholders from the project config and fixes the file list. Templates are data: changing a template changes the output, not the generator code. Templates contain no scripts.

## Status of the shipped layouts

All the layouts below are in use. `base/manifest.json` lists the five base files with their output paths, in output order: `base/CLAUDE.md`, `base/process.md`, and the three files of `base/spec-template/` (`stories.md`, `plan.md`, `progress.md`). `claude-code/` holds the four layouts of the Claude Code files built from the config: `pipeline-command.md`, `command.md`, `agent.md` and `rule.md`. No layout uses an enabled section, and no layout uses a placeholder that the config does not fill. The `base/spec-template/` files have no placeholders.

The flat layouts (`flat/`, `workflows/`, `rules/` and `steps/`) were removed in F-07.

## Placeholders

A placeholder is `{{name}}`. The generator fills it from the values of its file: the base and agent and rule values in `values-agent.ts` (`baseValues`, `agentValues`, `ruleValues`), and the command values in `values-command.ts` (`flowValues`, `pipelineValues`). The Mermaid diagram comes from `mermaid.ts`. `render.ts` fills the placeholders in one pass. A placeholder with no value fails generation with an error that names it, and it is never left in the output.

| Placeholder | Used by | Value |
|---|---|---|
| `{{processList}}` | `base/CLAUDE.md`, `base/process.md` | The process as text: each flow of the pipeline in order, as `- Run the flow <id> (<name>)`, its steps indented under it, then the gate that follows it, if any, as a `- ` line |
| `{{processDiagram}}` | `base/process.md` | The Mermaid flowchart of the pipeline (`flowchart TD`, one node per flow, a decision node per gate), built by `mermaid.ts` |
| `{{commandList}}` | `base/CLAUDE.md`, `base/process.md`, `claude-code/pipeline-command.md` | The command files as a list: `.claude/commands/pipeline.md`, then one per flow of the pipeline in order |
| `{{agentList}}` | `base/CLAUDE.md` | The agent files as a list: one `- .claude/agents/<name>.md` per Agent block, in flow order |
| `{{ruleList}}` | `base/CLAUDE.md` | The rule files as a list: one `- .claude/rules/<id>.md: <title>` per `ProjectConfig.rules` entry, in config order |
| `{{argumentList}}` | `claude-code/pipeline-command.md` | The pipeline's arguments, one line each: the id in code, `required` or `optional`, and the hint when it has one |
| `{{pipelineStepList}}` | `claude-code/pipeline-command.md` | The flows and gates of the pipeline as numbered steps, in pipeline order: `Run the flow <id> (<name>)`, then the gate that follows the flow, if any (`Approval: <description>` or the check text) |
| `{{routeRules}}` | `claude-code/command.md` (the flow's back routes), `claude-code/pipeline-command.md` (the back routes of all flows) | One numbered rule per back route to an earlier block of the same flow: `On pass` or `On fail`, go back to the target block and run again from there; round limit N, or `no limit set`. A route that stops, or that goes forward, gives no rule |
| `{{flowId}}`, `{{flowName}}` | `claude-code/command.md` | The flow's id and name |
| `{{description}}` | `claude-code/command.md` | The flow's description, carried into the Purpose section |
| `{{description}}` | `claude-code/agent.md` | The Agent block's description, carried into the Purpose section |
| `{{ruleTags}}` | `claude-code/command.md`, `claude-code/agent.md` | The rule-set tags of the flow or the Agent block, comma-separated; `none` when there are none |
| `{{stepList}}` | `claude-code/command.md` | The blocks of the flow as numbered steps, in block order: `Start with the arguments <arguments>`, `Run the agent <name> with <arguments>: <description>`, `Approval: <description>`, `Check: <description> (type <type>)` with `, threshold N` for a check that sets one, or `End as <outcome>`, with `, producing <artifact>` when the End block names one |
| `{{name}}` | `claude-code/agent.md` | The Agent block's name; the file is `.claude/agents/<name>.md` |
| `{{frontmatterDescription}}` | `claude-code/agent.md` | The Agent block's description as one YAML value for the frontmatter. It is written as it is only when it starts with a letter or a digit, holds nothing but letters, digits, spaces and `_ , . ( ) ' / -`, does not end in a space, and is not a word YAML reads as a boolean, null or number; otherwise it is a double-quoted string (so a colon, a comment mark, a line break or any other character outside that set is quoted) |
| `{{optionalFrontmatter}}` | `claude-code/agent.md` | The `model:` line and the `tools:` line, each only when the Agent block sets it, each ending in a newline; empty otherwise |
| `{{bodySection}}` | `claude-code/agent.md` | The `## Instructions` section with the block's body, starting with a blank line; empty when the block has no body or only whitespace |
| `{{ruleTitle}}` | `claude-code/rule.md` | The rule's title, with each line break and the spaces around it replaced by one space, so the heading stays one line |
| `{{ruleText}}` | `claude-code/rule.md` | The rule's text, as given |

Rules for the values:

- A value is inserted as written and is never rendered again, so a value that holds `{{...}}` text (a rule's text, for example) comes out unchanged.
- The layouts hold no conditionals. A line that is set only sometimes is a value built in code that ends in a newline (or is empty), and the layout puts its placeholder at the start of a line: `{{optionalFrontmatter}}` sits before the closing `---` of the agent frontmatter, and `{{bodySection}}` sits on a line of its own.

## Claude Code layout (MVP)

This is the layout of the Claude Code output for the pipeline: one file per row, from the source named in it. Each source is rendered with the values of its file. The file list is sorted by path, in code-point order, whatever the order of the rules, or of the flows after the first (decision 35 in `architecture.md`). Two files with the same path throw `GenerationError`: a bug in the generator, not a refusal of the configuration (decision 23). A flow whose id is `pipeline` is a blocker in the config, because its command file would be `.claude/commands/pipeline.md` (decision 35).

| Output file | Source |
|---|---|
| `CLAUDE.md` | `base/CLAUDE.md` (manifest entry 1), rendered |
| `spec/documents/process.md` | `base/process.md` (manifest entry 2), rendered: the flows, blocks and gates as text, and the Mermaid diagram of the process |
| `spec/specifications/F-00-template/stories.md` | `base/spec-template/stories.md` (manifest entry 3) |
| `spec/specifications/F-00-template/plan.md` | `base/spec-template/plan.md` (manifest entry 4) |
| `spec/specifications/F-00-template/progress.md` | `base/spec-template/progress.md` (manifest entry 5) |
| `.claude/commands/pipeline.md` | `claude-code/pipeline-command.md`: the arguments, the flows and gates, the back routes, and the command files |
| `.claude/commands/<flow-id>.md` | `claude-code/command.md`, one per flow of the pipeline |
| `.claude/agents/<name>.md` | `claude-code/agent.md`, one per Agent block of a flow |
| `.claude/rules/<id>.md` | `claude-code/rule.md`, one per `ProjectConfig.rules` entry |

The LLM writes the content of the command and agent files at `/generate` from the planned text, their descriptions and their rule tags (`architecture.md` §3, step 5). No layout holds a script: the Claude Code output has no `scripts/` folder.

## Folders

```
source/templates/
  base/           the base files (CLAUDE.md, process.md, spec template) and manifest.json; in use
  claude-code/    the layouts of the pipeline's Claude Code files (pipeline command, flow command, agent, rule); in use
  pipeline/       default.json, the default pipeline config (data); in use
```

Cursor and Copilot are post-MVP. Their mapping is not planned yet; when the feature is specified, the mapping is confirmed against each tool's current documentation.

## Branch and gate text

The pipeline command and a flow's command write their steps and rules as numbered lines (`source/packages/core/src/pipeline/generate/values-command.ts`). A check step reads:

> 2. Check: <description> (type <type>, threshold <n>).

The threshold is written only for a check that sets one. A back route reads:

> 1. On fail, go back to `implement` and run again from there; round limit 2.

A back route with no round limit says "no limit set". A check with no back route on an outcome writes no rule for that outcome.
