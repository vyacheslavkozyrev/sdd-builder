import type { AgentBlock } from '../model.js';
import { describeArgument, inlineText, linesOf, ruleTagsText } from './values-text.js';

// The values of an agent file layout (F-04, AC-003). `agentName` and `agentDescription` are inline. `agentModel` and
// `agentTools` are the optional frontmatter lines and `agentReads` and `agentWrites` the optional lines of the body;
// each starts with its own line break and is '' when the block has no such entry. `agentBody` is the paragraph of
// the block's body, and `agentArguments` one line per argument. `agentRuleTags` is the block's rule tags as one
// comma-separated list, `none` when there are none (F-05, AC-022). A layout writes each of them at the end of a line.
// The values are a pure function of the Agent block: the same block always gives the same text.
export function agentValues(agent: AgentBlock): Record<string, string> {
  return {
    agentName: agent.name,
    agentDescription: inlineText(agent.description),
    agentModel: agent.model === undefined ? '' : `\nmodel: ${agent.model}`,
    agentTools:
      agent.tools === undefined || agent.tools.length === 0
        ? ''
        : `\ntools: ${agent.tools.map(inlineText).join(', ')}`,
    agentReads: pathsLine('Reads', agent.reads),
    agentWrites: pathsLine('Writes', agent.writes),
    agentBody: agent.body ? `\n\n${agent.body}` : '',
    agentArguments: linesOf(agent.arguments.map((arg) => `- ${describeArgument(arg)}`)),
    agentRuleTags: ruleTagsText(agent.ruleTags),
  };
}

// A line naming the paths the agent reads or writes, '' when it names none.
function pathsLine(label: string, paths: readonly string[] | undefined): string {
  if (paths === undefined || paths.length === 0) return '';
  return `\n${label}: ${paths.map((path) => `\`${path}\``).join(', ')}`;
}
