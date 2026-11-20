# Template placeholders

Layouts are text with `{{name}}` placeholders. F-05 adds them to this folder; `source/packages/core` renders them (F-04) and the generator writes the result. A change to a layout changes what users download.

## Rendering

- Every `{{name}}` is replaced in one pass. A value is copied as written and is not rendered again, so a value that holds `{{...}}` text stays as it is.
- A name with no value is a template error: rendering throws and names the placeholder and the file path.
- An opening `{{` with no closing `}}` is a template error too.
- The values of each layout are built in code (`source/packages/core/src/pipeline/generate/values-*.ts`), not read from a file. A layout holds only the names listed below.

## Line breaks

- A value of whole lines or a paragraph starts with its own line break. It is empty when it has no lines. These are `flowArguments`, `flowSteps`, `flowConditions`, `flowApproval`, `pipelineArguments`, `pipelineFlows`, `pipelineModel`, `pipelineTools`, `pipelineBody`, `agentModel`, `agentTools`, `agentReads`, `agentWrites`, `agentBody`, `agentArguments`, `ruleText`, `processList`, `commandList`, `agentList` and `ruleList`.
- Write such a placeholder at the end of a line, with no line break after it, so an empty value leaves no blank line.
- An inline value (`flowId`, `flowName`, `flowDescription`, `pipelineName`, `pipelineDescription`, `agentName`, `agentDescription`, `ruleId`, `ruleTitle`) is written inside a sentence, a heading or a frontmatter line, never alone on a line. Its line breaks become spaces.

## Value names

Flow command (`flow` layout):

| Name | Content |
|---|---|
| `flowId` | the flow's id (inline) |
| `flowName` | the flow's name (inline) |
| `flowDescription` | the flow's description (inline, empty if none) |
| `flowArguments` | one line per argument |
| `flowSteps` | one numbered line per Agent block, in walk order |
| `flowConditions` | one numbered rule per Condition, with its true and false routes as sub-lines |
| `flowApproval` | the approval paragraph; empty when the flow's approval is off |

Pipeline command (`pipeline` layout):

| Name | Content |
|---|---|
| `pipelineName` | the pipeline's name (inline) |
| `pipelineDescription` | the pipeline's description (inline) |
| `pipelineModel` | the frontmatter line `model: …`; empty if none |
| `pipelineTools` | the frontmatter line `tools: …`; empty if none |
| `pipelineBody` | the paragraph of the pipeline's body; empty if none |
| `pipelineArguments` | one line per argument |
| `pipelineFlows` | one numbered line per flow, in pipeline order, with its id, its description and whether the process stops for a person at its end |

Agent file (`agent` layout):

| Name | Content |
|---|---|
| `agentName` | the agent's name |
| `agentDescription` | the agent's description (inline) |
| `agentModel` | the frontmatter line `model: …`; empty if none |
| `agentTools` | the frontmatter line `tools: …`; empty if none |
| `agentReads` | the line `Reads: …` naming the paths the agent reads; empty if none |
| `agentWrites` | the line `Writes: …` naming the paths the agent writes; empty if none |
| `agentBody` | the paragraph of the agent's body; empty if none |
| `agentArguments` | one line per argument |

Rule file (`rule` layout):

| Name | Content |
|---|---|
| `ruleId` | the rule's id |
| `ruleTitle` | the rule's title (inline) |
| `ruleText` | the rule's paragraph; empty if none |

Base files (base layouts, listed in `source/templates/base/manifest.json`, which F-05 adds):

| Name | Content |
|---|---|
| `processList` | one bullet per flow, in pipeline order: its id and its description if it has one |
| `commandList` | one bullet per command file: `pipeline.md` and one file per flow |
| `agentList` | one bullet per Agent block: its agent file and its description if it has one |
| `ruleList` | one bullet per rule: its rule file and its title |

`processDiagram` (the Mermaid view of the process) is not supplied yet: it belongs to F-05. A base layout that names it fails rendering until F-05 adds it.
