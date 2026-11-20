import type { AgentBlock, ProjectConfig } from '../model.js';
import { processDiagram } from './mermaid.js';
import { inlineText, linesOf } from './values-text.js';

// The values of the base layouts (F-04, AC-037, AC-038): the process, the commands, the agents and the rules of the
// project, each as a list built in code, one line per item, empty when there are none, and the Mermaid process diagram
// (F-05, AC-030 to AC-033). A base layout writes each of them at the end of a line, as the flow and pipeline layouts
// do. The values are a pure function of the config: the same config always gives the same text, and the items come in
// the order of the config (flows in pipeline order, agents in the order of their flows).
export function baseValues(config: ProjectConfig): Record<string, string> {
  const flows = config.pipeline.flows;
  const agents = flows
    .flatMap((flow) => flow.blocks)
    .filter((block): block is AgentBlock => block.kind === 'agent');

  return {
    processDiagram: processDiagram(config.pipeline),
    processList: linesOf(flows.map((flow) => item(`\`${flow.id}\``, inlineText(flow.description ?? '')))),
    commandList: linesOf([
      item('`.claude/commands/pipeline.md`', ''),
      ...flows.map((flow) => item(`\`.claude/commands/${flow.id}.md\``, '')),
    ]),
    agentList: linesOf(
      agents.map((block) => item(`\`.claude/agents/${block.name}.md\``, inlineText(block.description))),
    ),
    ruleList: linesOf(config.rules.map((rule) => item(`\`.claude/rules/${rule.id}.md\``, inlineText(rule.title)))),
  };
}

// One list item: a bullet with its label, and its text after a colon when the text is not empty.
function item(label: string, text: string): string {
  return text === '' ? `- ${label}` : `- ${label}: ${text}`;
}
