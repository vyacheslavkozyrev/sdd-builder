# Templates

Text files that describe the layout of a project and what each file should contain. The generator fills their placeholders and fixes the file list; at generation the LLM writes the final content from these texts and the block descriptions. Templates are data: changing a template changes the output, not the generator code. Templates contain no scripts.

## Placeholders

| Placeholder | Value |
|---|---|
| `{{projectName}}` | `ProjectConfig.name` |
| `{{idea}}` | `ProjectConfig.idea` |
| `{{stack.language}}`, `{{stack.framework}}`, `{{stack.testFramework}}` | from `ProjectConfig.stack` |
| `{{modules}}` | rendered list of `ModuleSpec` |
| `{{process.diagram}}` | the Mermaid process flowchart, in a fenced `mermaid` block, rendered from the map; not rendered before F-18 |
| `{{codeRules}}`, `{{testRules}}` | rendered bullet lists |
| `{{workflow.name}}`, `{{workflow.id}}`, `{{workflow.scope}}` | inside a workflow command: its name, its id, and its scope with the iteration source (for example "for each task in plan.md") |
| `{{workflow.steps}}` | the enabled steps as a numbered list in tab order, each naming the file it generates |
| `{{workflow.rules}}` | the gate and branch rules as a numbered list: preconditions from map gates first, then rules after steps |
| `{{#step:<id>}}…{{/step:<id>}}` | content kept only when that step is enabled |

Placeholders with no value fail the generation with a clear error; they are never left in the output.

## Layout

```
source/templates/
  base/           files every project gets (CLAUDE.md, process.md, spec template)
  workflows/      one layout for the workflow command, filled per workflow
  steps/          one folder per step id: a layout for its command, agent, skill or script
  rules/          rule-file layouts (general, qa, code); the content comes from the brief
  claude/         Claude Code file layout (the MVP target)
```

Cursor and Copilot are post-MVP. Their mapping is not planned yet; when the feature is specified, the mapping is confirmed against each tool's current documentation.

## Claude Code layout (MVP)

| Output file | Source |
|---|---|
| `CLAUDE.md` | `base/CLAUDE.md` |
| `spec/documents/process.md` | `base/process.md`, text listing the flows, blocks and gates (the Mermaid view is F-18) |
| `spec/specifications/F-00-template/*` | `base/spec-template/` |
| `.claude/commands/workflow-<name>.md` | `workflows/`, one per workflow: calls its steps in order and writes its branches as numbered rules |
| `.claude/commands/<step>.md` | `steps/<id>/command.md` for each enabled command step |
| `.claude/agents/<name>.md` | `steps/<id>/agent.md` for each enabled agent step |
| `.claude/skills/<name>/SKILL.md` | `steps/<id>/skill.md` for each enabled skill step |
| `.claude/rules/<name>.md` | `rules/` layouts; referenced from the steps that carry the tag |
| `scripts/<name>.sh` | `steps/<id>/script.md`, a layout for each enabled script step; the LLM writes the script at generation |

Every file in the table above except `scripts/` is a layout the LLM fills at generation. Templates never contain a script.

## Branch and gate text

A branch becomes a numbered rule in the workflow command, for example:

> 2. After step 2 (Code review): unless the review reports no blocker or warning, go back to step 1 (Implement), retrying at most 2 times; if the limit is reached, stop and report. Otherwise continue.

A branch with no round limit says so: "retrying until it passes (no limit set)". A quality gate becomes a stop rule: "unless the checks pass, stop and report." A gate on a map connection becomes a precondition at the top of the downstream workflow: "Precondition: unless the output of Specify is approved by the user, stop and report."

Where a concept has no native equivalent in a tool, the output says so in the generated `process.md` instead of inventing a feature.
