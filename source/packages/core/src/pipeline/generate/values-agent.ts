// The placeholder values of an agent file, a rule file and the base files (source/templates/README.md,
// Placeholders; architecture.md §6 decision 35). The lists are built from the config in its own order: agents in
// flow order, rules in config order, the process as the flows of the pipeline in order with their steps under
// them. Pure: the config is read, never changed.

import type { Agent, Pipeline, ProjectConfig, Rule } from '../model.js';
import type { PlaceholderValues } from './render.js';
import { processDiagram } from './mermaid.js';
import { commandList, pipelineSteps, stepList, tagList } from './values-command.js';

// The values of an agent file: its name, description and rule tags, the optional frontmatter lines (model and tools)
// and the body section. A line that the block does not set is left out entirely, not written empty.
export function agentValues(agent: Agent): PlaceholderValues {
  return {
    name: agent.name,
    description: agent.description,
    ruleTags: tagList(agent.ruleTags),
    optionalFrontmatter: optionalFrontmatter(agent),
    bodySection: bodySection(agent),
  };
}

// The model and tools lines of the frontmatter, each ending in a newline; empty when the block sets neither.
function optionalFrontmatter(agent: Agent): string {
  const modelLine = agent.model !== undefined ? `model: ${agent.model}\n` : '';
  const toolsLine = agent.tools !== undefined && agent.tools.length > 0 ? `tools: ${agent.tools.join(', ')}\n` : '';
  return `${modelLine}${toolsLine}`;
}

// The Instructions section with the block's body, ending in a newline; empty when the block has no body (a body of
// only whitespace counts as no body).
function bodySection(agent: Agent): string {
  return agent.body !== undefined && agent.body.trim() !== '' ? `## Instructions\n\n${agent.body}\n` : '';
}

// The values of a rule file: its title and text.
export function ruleValues(rule: Rule): PlaceholderValues {
  return { ruleTitle: rule.title, ruleText: rule.text };
}

// The values of the base files: the lists of the process, the command files, the agent files and the rule files,
// and the Mermaid diagram of the process.
export function baseValues(config: ProjectConfig): PlaceholderValues {
  return {
    processList: processList(config.pipeline),
    processDiagram: processDiagram(config.pipeline),
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
