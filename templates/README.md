# Templates

Text files the generator renders into a project. Templates are data: changing a template changes the output, not the generator code.

## Placeholders

| Placeholder | Value |
|---|---|
| `{{projectName}}` | `ProjectConfig.name` |
| `{{idea}}` | `ProjectConfig.idea` |
| `{{stack.language}}`, `{{stack.framework}}`, `{{stack.testFramework}}` | from `ProjectConfig.stack` |
| `{{modules}}` | rendered list of `ModuleSpec` |
| `{{codeRules}}`, `{{testRules}}` | rendered bullet lists |
| `{{workflow.name}}`, `{{workflow.steps}}`, `{{workflow.branches}}` | inside a workflow command: its name, its ordered steps, and its branch rules with their round limits (or "no limit set") |
| `{{#step:<id>}}…{{/step:<id>}}` | content kept only when that step is enabled |

Placeholders with no value fail the generation with a clear error; they are never left in the output.

## Layout

```
templates/
  base/           files every project gets (CLAUDE.md, process.md, spec template, checks script)
  workflows/      one template for the workflow command, filled per workflow
  steps/          one folder per step id: command, agent, skill or script text
  rules/          rule files by stack (general, qa, language-specific)
  claude/         Claude Code file layout (the MVP target)
```

Cursor and Copilot are post-MVP. Their mapping is not planned yet; when the feature is specified, the mapping is confirmed against each tool's current documentation.

## Claude Code layout (MVP)

| Output file | Source |
|---|---|
| `CLAUDE.md` | `base/CLAUDE.md` |
| `spec/documents/process.md` | `base/process.md`, with the Mermaid view of the process |
| `spec/specifications/F-00-template/*` | `base/spec-template/` |
| `.claude/commands/workflow-<name>.md` | `workflows/`, one per workflow: calls its steps in order and writes its branches as numbered rules |
| `.claude/commands/<step>.md` | `steps/<id>/command.md` for each enabled command step |
| `.claude/agents/<name>.md` | `steps/<id>/agent.md` for each enabled agent step |
| `.claude/skills/<name>/SKILL.md` | `steps/<id>/skill.md` for each enabled skill step |
| `.claude/rules/<name>.md` | `rules/` by stack; referenced from the steps that carry the tag |
| `scripts/<name>.sh` | `steps/<id>/script.sh` for each enabled script step |

## Branch and gate text

A branch becomes a numbered rule in the workflow command, for example:

> 2. Code review. If the review reports a blocker and fewer than 2 retries have been made, go back to step 1. If the limit is reached, stop. If the review is clean, go to step 3.

A branch with no round limit says so: "retry until clean; no limit set". A quality gate becomes a stop rule: "if the check fails, stop and report."

Where a concept has no native equivalent in a tool, the output says so in the generated `process.md` instead of inventing a feature.
