# Template placeholders

Layouts are text with `{{name}}` placeholders. F-05 adds them to this folder; `source/packages/core` renders them (F-04) and the generator writes the result. A change to a layout changes what users download.

## Rendering

- Every `{{name}}` is replaced in one pass. A value is copied as written and is not rendered again, so a value that holds `{{...}}` text stays as it is.
- A name with no value is a template error: rendering throws and names the placeholder and the file path.
- An opening `{{` with no closing `}}` is a template error too.
- The values of each layout are built in code (`source/packages/core/src/pipeline/generate/values-*.ts`), not read from a file. A layout holds only the names listed below.

## Line breaks

- A whole-line value (a list, a frontmatter line, a section or a paragraph of the body) starts with its own line break. It is empty when it has no lines. These are `flowArguments`, `flowArtifacts`, `flowBody`, `flowSteps`, `flowConditions`, `flowApproval`, `pipelineModel`, `pipelineTools`, `pipelineBody`, `pipelineArguments`, `pipelineFlows`, `agentModel`, `agentTools`, `agentBody`, `agentArguments`, `ruleText`, `processFlows`, `commandList`, `agentList` and `ruleList`.
- Write such a placeholder right after the text it follows on its line, with no line break after it, so an empty value leaves no blank line. Several of them may follow each other on one line: the `description:` line of `pipeline.md` ends with `pipelineModel` and `pipelineTools`, and the `## Arguments` line of `agent.md` ends with `agentArguments`. Each brings its own line break, and the line ends after the last one.
- An inline value (`flowName`, `flowDescriptionYaml`, `flowRuleTags`, `pipelineName`, `pipelineDescriptionYaml`, `agentName`, `agentDescription`, `ruleTitle`) is written inside a sentence, a heading or a frontmatter line, never alone on a line. Its line breaks become spaces (`agentName` is a file-safe name, so it never holds one).
- A description may stand alone on its own line under its heading (owner decision 2026-11-19, option a): `flowDescription`, `pipelineDescription` and `agentPurpose`. Their line breaks also become spaces. `flowDescription` and `pipelineDescription` are empty when there is no description (an agent always has one, since a blank agent description is refused). In `pipeline.md` and `agent.md` the body value follows the description on the same template line; it brings its own line break, so the description still stands on a line of its own.
- Two values are written on a line of their own and are not whole-line values: `agentRuleTags` under `## Rule tags`, and `processDiagram` inside the Mermaid fence. Neither starts with a line break. Both are never empty (`none` for no rule tags; a process always has a flow), so no blank line results.

## Value names

Flow command (`flow` layout):

| Name | Content |
|---|---|
| `flowName` | the flow's name (inline) |
| `flowDescriptionYaml` | the flow's description as a double-quoted YAML string, for the `description:` frontmatter line; `""` if none |
| `flowDescription` | the flow's description, standing alone under `## Purpose`; empty if none |
| `flowRuleTags` | the flow's rule tags, comma-separated in their order; `none` if there are none |
| `flowBody` | the paragraph of the flow's body, under `## Context`, with its line breaks; empty when the body is blank or missing |
| `flowArguments` | one line per argument; `No arguments` when there are none |
| `flowArtifacts` | each artifact as a level 3 heading with its label and its template text; `No artifacts` when the flow has none |
| `flowSteps` | every block of the flow's route, in walk order: the Start first, the End last; one numbered line per block, a Condition with its true and false routes as sub-lines |
| `flowConditions` | one numbered rule per Condition, with its true and false routes as sub-lines |
| `flowApproval` | the approval paragraph; empty when the flow's approval is off |

Pipeline command (`pipeline` layout):

| Name | Content |
|---|---|
| `pipelineName` | the pipeline's name (inline) |
| `pipelineDescriptionYaml` | the pipeline's description as a double-quoted YAML string, for the `description:` frontmatter line |
| `pipelineDescription` | the pipeline's description, standing alone under `## Purpose` |
| `pipelineModel` | the frontmatter line `model: …`; empty if none |
| `pipelineTools` | the frontmatter line `tools: …`, the list quoted when YAML would break on a tool name; empty if none |
| `pipelineBody` | the paragraph of the pipeline's body, under `## Purpose`; empty when the body is blank or missing |
| `pipelineArguments` | one line per argument; `No arguments` when there are none |
| `pipelineFlows` | one numbered line per flow, in the order of the `next` links from the first flow, with its id and, when it has one, its description; a flow with approval on is followed by its own numbered line that stops for the person (the last flow's line says the approval is at the end of the process) |

Agent file (`agent` layout):

| Name | Content |
|---|---|
| `agentName` | the agent's name (inline) |
| `agentDescription` | the agent's description as a double-quoted YAML string, for the `description:` frontmatter line |
| `agentPurpose` | the agent's description as plain text, standing alone under `## Purpose` (no quotes) |
| `agentModel` | the frontmatter line `model: …`; empty if none |
| `agentTools` | the frontmatter line `tools: …`, the list quoted when YAML would break on a tool name; empty if none |
| `agentBody` | the `## Instructions` heading and the paragraph of the agent's body; empty when the body is blank or missing |
| `agentArguments` | one line per argument; `No arguments` when there are none |
| `agentRuleTags` | the agent's rule tags, comma-separated in their order, under `## Rule tags`; `none` if there are none |

Rule file (`rule` layout):

| Name | Content |
|---|---|
| `ruleTitle` | the rule's title, in the level 1 heading (inline) |
| `ruleText` | the paragraph of the rule, under the heading, with its line breaks; empty when the text is missing or blank |

Base files (base layouts, listed in `source/templates/base/manifest.json`, which gives each base layout's output path):

| Name | Content |
|---|---|
| `processFlows` | one bullet per flow, in the order of the `next` links: its name and id, then its description and its approval sentence on the same line, then its conditions and retry routes indented under `Conditions:` |
| `commandList` | one bullet per command file: `pipeline.md` and then one file per flow |
| `agentList` | one bullet per Agent block: its agent file and its description if it has one |
| `ruleList` | one bullet per rule: its rule file and its title |
| `processDiagram` | the Mermaid flowchart of the process, written alone on its line inside the `mermaid` fence of `process.md` (described below) |

`processDiagram` is the Mermaid flowchart of the process, written alone on its line inside the `mermaid` fence in `process.md`. The first line is `flowchart`, then one node per flow in `next` order (ids `F1`, `F2` and so on, labelled with the flow's name, with ` approval` at the end of the label when approval is on), then one unlabelled edge per `next` link. A line break in a flow name becomes a space, and a double quote, a square bracket, a brace, a pipe or a hash is written as a Mermaid entity code. Conditions and retry routes are not drawn.

## Claude Code layout

Each layout file and the path it writes. The paths of the flow, agent and rule files come from the flow ids, agent names and rule ids of the config; the base paths come from `source/templates/base/manifest.json`.

| Layout file | Output path |
|---|---|
| `claude-code/pipeline.md` | `.claude/commands/pipeline.md` |
| `claude-code/flow.md` | `.claude/commands/<flow id>.md`, one per flow |
| `claude-code/agent.md` | `.claude/agents/<agent name>.md`, one per Agent block |
| `claude-code/rule.md` | `.claude/rules/<rule id>.md`, one per rule |
| `base/CLAUDE.md` | `CLAUDE.md` |
| `base/process.md` | `spec/documents/process.md` |
| `base/spec-template/stories.md` | `spec/specifications/F-00-template/stories.md` |
| `base/spec-template/plan.md` | `spec/specifications/F-00-template/plan.md` |
| `base/spec-template/progress.md` | `spec/specifications/F-00-template/progress.md` |
