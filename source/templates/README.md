# Templates

Text files that describe the layout of a project and what each file should contain. The generator (`source/packages/core/src/pipeline/generate/`) fills their placeholders from the project config and fixes the file list. Templates are data: changing a template changes the output, not the generator code. Templates contain no scripts.

## Status of the shipped templates

The base templates in `base/` use only placeholders the pipeline config fills: `base/CLAUDE.md` and `base/process.md` are rewritten for the pipeline (F-03 T002). The flat base templates still have `{{modules}}`, `{{codeRules}}`, `{{testRules}}` and `{{process.diagram}}`; they live in `flat/base/`, a legacy copy that the flat `generate` in `source/packages/core/src/generate.ts` reads. The pipeline `generate` fails on a placeholder with no value, and names it.

## Placeholders

The values come from `ProjectConfig`, in `source/packages/core/src/pipeline/generate/render.ts` and `base-files.ts`.

| Placeholder | Value |
|---|---|
| `{{projectName}}` | `ProjectConfig.name` |
| `{{idea}}` | `ProjectConfig.idea` |
| `{{stack.language}}` | `ProjectConfig.stack.language` (required) |
| `{{stack.framework}}`, `{{stack.platform}}`, `{{stack.buildTool}}`, `{{stack.testFramework}}` | the optional stack value, only when the key is present in the config; a template that uses it when the key is absent fails generation |
| `{{processList}}` | the process as text, built from the selection: each enabled pipeline block in order, and under each enabled flow its enabled blocks in order |
| `{{commandList}}` | the command files as a list: `pipeline.md`, then one per enabled child flow in pipeline order; built from the selection, so a disabled flow is not listed |
| `{{agentList}}` | the agent files as a list: one per enabled Agent block of an enabled flow, in flow order |
| `{{ruleList}}` | the rule files as a list: one per `ProjectConfig.rules` entry, with its title |
| `{{flowId}}`, `{{flowName}}` | `claude-code/command.md` (a flow's command file): the flow's id and name |
| `{{description}}` | `claude-code/command.md`: the description of the flow, carried into the Purpose section |
| `{{ruleTags}}` | `claude-code/command.md`: the rule-set tags of the flow, as a comma-separated list; `none` when the flow has no tags |
| `{{stepList}}` | `claude-code/command.md`: the enabled blocks of the flow as numbered steps, in block order; built by `command-layouts.ts` |
| `{{routeRules}}` | `claude-code/command.md` and `claude-code/pipeline-command.md`: one numbered rule per back route of an enabled check, naming its target block and round limit (`no limit set` when the limit is absent); an outcome with no back route gives no rule; built by `command-layouts.ts` |
| `{{argumentList}}` | `claude-code/pipeline-command.md`: the arguments of the pipeline Start block, one line each with its required flag; built by `command-layouts.ts` |
| `{{pipelineStepList}}` | `claude-code/pipeline-command.md`: the enabled flows and checks of the pipeline as numbered steps, in pipeline order; built by `command-layouts.ts` |
| `{{name}}` | `claude-code/agent.md`: the agent's name, from its Agent block; the file is `.claude/agents/<name>.md` |
| `{{description}}` | `claude-code/agent.md`: the description of the Agent block, carried into the Purpose section |
| `{{ruleTags}}` | `claude-code/agent.md`: the rule-set tags of the Agent block, as a comma-separated list; `none` when the block has no tags |
| `{{ruleTitle}}` | `claude-code/rule.md`: the title of the rule entry in `ProjectConfig.rules` |
| `{{ruleText}}` | `claude-code/rule.md`: the text of the rule entry in `ProjectConfig.rules` |
| `{{process.diagram}}` | flat base only, not filled by the pipeline config; the Mermaid view comes with F-18 (see the status above) |
| `{{modules}}`, `{{codeRules}}`, `{{testRules}}` | flat base only, not filled by the pipeline config (see the status above) |
| `{{workflow.name}}`, `{{workflow.id}}`, `{{workflow.scope}}` | the flat workflow layout in `workflows/`; the pipeline config does not fill them |
| `{{workflow.steps}}`, `{{workflow.rules}}` | the flat workflow layout in `workflows/`; the pipeline config does not fill them |
| `{{#step:<id>}}…{{/step:<id>}}` | the flat layout only: the pipeline renderer does not read it and fails generation on it |
| Section `#enabled:<id>` … `/enabled:<id>`, placed between double curly braces | the section: content kept only when the block or flow with that id is enabled in the selection; a child block of a disabled flow is not enabled |

Section rules:

- Sections are not nested. A nested, mismatched or unclosed section marker fails generation.
- An `enabled:<id>` section whose id matches no block or flow is removed, with its content, without an error.
- Placeholders are replaced after the sections. A placeholder with no value fails generation with a clear error; it is never left in the output.

## Files the generator writes

These are the files F-02 writes for a pipeline config. The flow, pipeline, agent and rule files are built in code from the config, so they have no template file.

| Output file | Source |
|---|---|
| `CLAUDE.md` | `base/CLAUDE.md`, rendered |
| `spec/documents/process.md` | `base/process.md`, rendered |
| `spec/specifications/F-00-template/*` | each file under `base/spec-template/`, rendered |
| `.claude/commands/<flow-id>.md` | one per enabled child flow: its enabled blocks as numbered steps, in block order |
| `.claude/commands/pipeline.md` | the arguments, then the enabled flows and checks in pipeline order as numbered steps, then a numbered rule for each back route |
| `.claude/agents/<name>.md` | one per enabled Agent block in an enabled flow; its description is the text (stub text until F-07 writes the content) |
| `.claude/rules/<id>.md` | one per `ProjectConfig.rules` entry; its title and text from the config |

The files come out sorted by path. Two files with the same path refuse the generation.

## Claude Code layout (MVP)

This is the target layout for the Claude Code output, owned by F-03. F-02 writes the files in "Files the generator writes" above, not these rows: its `CLAUDE.md`, `process.md` and spec-template rows come from the templates, and its agent and rule files come from the config, not from the `steps/` and `rules/` layouts below. The flow and pipeline command files are not in this table yet. The workflow command, step command, skill and script rows come with F-03.

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

Every file in this table except `scripts/` is a layout the LLM fills at generation. Templates never contain a script.

## Folders

```
source/templates/
  base/           files every project gets (CLAUDE.md, process.md, spec template), for the pipeline
  flat/base/      the base files of the flat model, kept as a legacy copy for the flat generator
  pipeline/       default.json, a sample pipeline config (data)
  rules/          rule-file layouts of the flat model (general, qa, code); F-02 takes rule text from the config instead
  workflows/      the flat workflow layout; replaced by F-03
  steps/          the flat step layouts, one folder per step id; replaced by F-03
```

Cursor and Copilot are post-MVP. Their mapping is not planned yet; when the feature is specified, the mapping is confirmed against each tool's current documentation.

## Branch and gate text

The pipeline command writes each check as a numbered step in its Steps section, and each back route as a numbered rule in its Rules section (`source/packages/core/src/pipeline/generate/rules-text.ts`). For example, a check step:

> 2. Check review, decided by agent (`review`).

and a back route rule:

> 1. On fail, go back to `implement` and run again from there; round limit 2.

A back route with no round limit says "no limit set". A check with no back route on an outcome writes no rule for that outcome.
