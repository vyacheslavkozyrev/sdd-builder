import type { AgentBlock, Flow, ProjectConfig } from '../model.js';
import { flowChain, processDiagram } from './mermaid.js';
import { flowValues } from './values-flow.js';
import { inlineText, linesOf } from './values-text.js';

// The values of the base layouts (F-04, AC-037, AC-038): the process, the commands, the agents and the rules of the
// project, each as a list built in code, one line per item, empty when there are none, and the Mermaid process diagram
// (F-05, AC-030 to AC-033). A base layout writes each of them at the end of a line, as the flow and pipeline layouts
// do. The values are a pure function of the config: the same config always gives the same text, and the items come in
// the order of the config (flows in the order of their `next` links, agents in the order of their flows).
export function baseValues(config: ProjectConfig): Record<string, string> {
  const flows = config.pipeline.flows;
  const agents = flows
    .flatMap((flow) => flow.blocks)
    .filter((block): block is AgentBlock => block.kind === 'agent');

  return {
    processDiagram: processDiagram(config.pipeline),
    processFlows: linesOf(flowChain(flows).map(processItem)),
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

// The approval sentences of a flow in the process list: the same two sentences the pipeline command uses in
// `pipelineFlows` (F-05, AC-029). A flow with no approval says that the process does not stop at its end.
const STOPS_AT_FLOW = 'The process stops for a person at the end of this flow.';
const DOES_NOT_STOP_AT_FLOW = 'The process does not stop at the end of this flow.';

// One flow of the process list (F-05, AC-029): a bullet with its name and id, then its description and its approval
// sentence on the same line, and its conditions and retry routes under it, indented. The names, the description and
// the conditions are the text the flow command uses (`flowValues`).
function processItem(flow: Flow): string {
  const values = flowValues(flow);
  const text = (name: string): string => values[name] ?? '';
  const label = `${text('flowName')} (\`${flow.id}\`)`;
  const approval = flow.approval ? STOPS_AT_FLOW : DOES_NOT_STOP_AT_FLOW;
  const summary = [text('flowDescription'), approval].filter((part) => part !== '').join(' ');
  const conditions = text('flowConditions') === '' ? [] : text('flowConditions').slice(1).split('\n');
  const indented = conditions.map((line) => `  ${line}`);
  return [item(label, summary), ...(indented.length === 0 ? [] : ['  Conditions:', ...indented])].join('\n');
}

// One list item: a bullet with its label, and its text after a colon when the text is not empty.
function item(label: string, text: string): string {
  return text === '' ? `- ${label}` : `- ${label}: ${text}`;
}
