import type { AgentBlock } from '../model.js';
import { bodyText, describeArgument, inlineText, linesOf, ruleTagsText } from './values-text.js';

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
      agent.tools === undefined || agent.tools.length === 0 ? '' : `\ntools: ${toolsText(agent.tools)}`,
    agentReads: artifactSection('Reads', agent.reads),
    agentWrites: artifactSection('Writes', agent.writes),
    agentBody: instructionsText(agent.body ?? ''),
    agentArguments: linesOf(agent.arguments.map((arg) => `- ${describeArgument(arg)}`)),
    agentRuleTags: ruleTagsText(agent.ruleTags),
  };
}

// The tools as one comma-separated list in their order. The list is written plain when every tool name is a plain YAML
// scalar; otherwise the whole list is quoted, so that the frontmatter line stays one YAML string (F-05, AC-019).
function toolsText(tools: readonly string[]): string {
  const names = tools.map(inlineText);
  const list = names.join(', ');
  return names.every(isPlainYamlScalar) ? list : quotedText(list);
}

// Whether YAML reads the text as a plain scalar of its own: it does not start with an indicator character, a digit, a
// sign or a dot (YAML reads those as numbers), does not end with a colon, holds no `: ` or ` #` and no control
// character, is not empty, and is not a word YAML reads as another type.
function isPlainYamlScalar(text: string): boolean {
  if (text === '' || /^(?:true|false|yes|no|on|off|null|~)$/i.test(text)) return false;
  return !/^[\s\-?:,[\]{}#&*!|>'"%@`+.\d]|[\s:]$|: |\s#|[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(text);
}

// A double-quoted YAML string: the backslashes and the quotes inside the text are escaped, and so are the control
// characters and the line and paragraph separators, which a YAML double-quoted string cannot hold as they are.
function quotedText(text: string): string {
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(
      /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g,
      (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
    );
  return `"${escaped}"`;
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
