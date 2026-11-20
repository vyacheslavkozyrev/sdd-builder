import type { AgentBlock } from '../model.js';
import {
  bodyText,
  describeArgument,
  inlineText,
  linesOf,
  quotedText,
  ruleTagsText,
  yamlToolsText,
} from './values-text.js';

// The values of an agent file layout (F-04, AC-003). `agentName` is inline. `agentDescription` is the description as a
// quoted YAML string (F-05, AC-017), and `agentPurpose` the same description as plain inline text for the Purpose
// section, so it shows no quotes. `agentModel` and `agentTools` are the optional frontmatter lines. `agentReads` and
// `agentWrites` are the optional Reads and Writes sections of the body, each a level 2 heading with one artifact label
// per line in the block's order (F-05, AC-021); each starts with its own blank line and is '' when the block's list is
// empty or absent. `agentTools` is quoted when YAML would break on a tool name (F-05, AC-019). `agentBody` is the
// Instructions section, its heading and the paragraph of the block's body, and '' when the body is blank
// (F-05, AC-020). `agentArguments` is one line per argument. `agentRuleTags` is the block's rule tags as one
// comma-separated list, `none` when there are none (F-05, AC-022). A layout writes each of them at the end of a line.
// The values are a pure function of the Agent block: the same block always gives the same text.
export function agentValues(agent: AgentBlock): Record<string, string> {
  return {
    agentName: agent.name,
    agentDescription: quotedText(inlineText(agent.description)),
    agentPurpose: inlineText(agent.description),
    agentModel: agent.model === undefined ? '' : `\nmodel: ${agent.model}`,
    agentTools:
      agent.tools === undefined || agent.tools.length === 0 ? '' : `\ntools: ${yamlToolsText(agent.tools)}`,
    agentReads: artifactSection('Reads', agent.reads),
    agentWrites: artifactSection('Writes', agent.writes),
    agentBody: instructionsText(agent.body ?? ''),
    agentArguments: linesOf(agent.arguments.map((arg) => `- ${describeArgument(arg)}`)),
    agentRuleTags: ruleTagsText(agent.ruleTags),
  };
}

// The Instructions section of the agent file: a level 2 heading and the body paragraph. '' when the body is blank or
// missing, so a block without instructions has no such section (F-05, AC-020).
function instructionsText(body: string): string {
  const text = bodyText(body);
  return text === '' ? '' : `\n\n## Instructions${text}`;
}

// A Reads or Writes section: a level 2 heading and one artifact label per line, '' when the list is empty or absent
// (F-05, AC-021).
function artifactSection(heading: string, labels: readonly string[] | undefined): string {
  if (labels === undefined || labels.length === 0) return '';
  return `\n\n## ${heading}${linesOf(labels.map((label) => `- \`${inlineText(label)}\``))}`;
}
