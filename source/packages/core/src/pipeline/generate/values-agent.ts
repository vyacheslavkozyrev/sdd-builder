import type { AgentBlock, Rule } from '../model.js';
import { argumentsText, bodyText, inlineText, quotedText, ruleTagsText, yamlToolsText } from './values-text.js';

// The values of an agent file layout (F-04, AC-003). `agentName` is inline. `agentDescription` is the description as a
// quoted YAML string (F-05, AC-017), and `agentPurpose` the same description as plain inline text for the Purpose
// section, so it shows no quotes. `agentModel` and `agentTools` are the optional frontmatter lines. `agentTools` is
// quoted when YAML would break on a tool name (F-05, AC-019). `agentBody` is the
// Instructions section, its heading and the paragraph of the block's body, and '' when the body is blank
// (F-05, AC-020). `agentArguments` is one line per argument, `No arguments` when there are none, as in the flow and
// pipeline layouts (F-05, AC-008 and AC-001). `agentRuleTags` is the block's rule tags as one
// comma-separated list of their rules' file names, `none` when there are none (F-05, AC-022; F-16, AC-029). `rules` are
// the project's rules, which the tags name. A layout writes each of them at the end of a line.
// The values are a pure function of the Agent block: the same block always gives the same text.
export function agentValues(agent: AgentBlock, rules: readonly Rule[] = []): Record<string, string> {
  return {
    agentName: agent.name,
    agentDescription: quotedText(inlineText(agent.description)),
    agentPurpose: inlineText(agent.description),
    agentModel: agent.model === undefined ? '' : `\nmodel: ${agent.model}`,
    agentTools:
      agent.tools === undefined || agent.tools.length === 0 ? '' : `\ntools: ${yamlToolsText(agent.tools)}`,
    agentBody: instructionsText(agent.body ?? ''),
    agentArguments: argumentsText(agent.arguments),
    agentRuleTags: ruleTagsText(agent.ruleTags, rules),
  };
}

// The Instructions section of the agent file: a level 2 heading and the body paragraph. '' when the body is blank or
// missing, so a block without instructions has no such section (F-05, AC-020).
function instructionsText(body: string): string {
  const text = bodyText(body);
  return text === '' ? '' : `\n\n## Instructions${text}`;
}
