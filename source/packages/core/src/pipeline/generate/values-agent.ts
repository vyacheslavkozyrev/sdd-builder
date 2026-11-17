// The placeholder values of an agent file, a rule file and the base files (source/templates/README.md,
// Placeholders; architecture.md §6 decision 35). The lists are built from the config in its own order: agents in
// flow order, rules in config order, the process as the flows of the pipeline in order with their steps under
// them. Pure: the config is read, never changed.

import type { Agent, Pipeline, ProjectConfig, Rule } from '../model.js';
import type { PlaceholderValues } from './render.js';
import { commandList, pipelineSteps, stepList, tagList } from './values-command.js';

// The values of an agent file: its name, description and rule tags.
export function agentValues(agent: Agent): PlaceholderValues {
  return {
    name: agent.name,
    description: agent.description,
    ruleTags: tagList(agent.ruleTags),
  };
}

// The values of a rule file: its title and text.
export function ruleValues(rule: Rule): PlaceholderValues {
  return { ruleTitle: rule.title, ruleText: rule.text };
}

// The values of the base files: the lists of the process, the command files, the agent files and the rule files.
export function baseValues(config: ProjectConfig): PlaceholderValues {
  return {
    processList: processList(config.pipeline),
    commandList: commandList(config.pipeline),
    agentList: agentList(config),
    ruleList: ruleList(config),
  };
}

// The process as text: each flow in pipeline order, with its steps indented under it, then the gate that follows
// it, if any.
function processList(pipeline: Pipeline): string {
  return pipeline.flows
    .flatMap((flow) => {
      const [flowLine = '', ...gateLines] = pipelineSteps(flow);
      return [
        `- ${flowLine}`,
        ...stepList(flow).split('\n').map((line) => `  ${line}`),
        ...gateLines.map((line) => `- ${line}`),
      ];
    })
    .join('\n');
}

// The agent files as a list: one per Agent block of a flow, in flow order.
function agentList(config: ProjectConfig): string {
  return config.pipeline.flows
    .flatMap((flow) =>
      flow.blocks.flatMap((block) => (block.kind === 'agent' ? [`- .claude/agents/${block.name}.md`] : [])),
    )
    .join('\n');
}

// The rule files as a list: one per rule in config order, with its title.
function ruleList(config: ProjectConfig): string {
  return config.rules.map((rule) => `- .claude/rules/${rule.id}.md: ${rule.title}`).join('\n');
}
