import type { Argument, Rule, RuleTag } from '../model.js';
import { GenerationError } from './error.js';
import { ruleFileName } from './rule-file.js';

// The text helpers shared by the value builders (F-04, T006 and T007). A value of whole lines starts with its own line
// break and is '' when it has no lines (plan, "Decision used by the plan"), so a layout can write it at the end of a
// line and leave no blank line when it is empty.

// The lines of a value, each line one entry, with the line break before the first one; '' when there are none.
export function linesOf(lines: readonly string[]): string {
  return lines.length === 0 ? '' : `\n${lines.join('\n')}`;
}

// An inline value written inside a sentence or a heading or a frontmatter line: its line breaks become spaces, so a
// name or description that holds a line break cannot split the line it is written on.
export function inlineText(text: string): string {
  return text.replace(/\s*[\r\n]+\s*/g, ' ').trim();
}

export function describeArgument(arg: Argument): string {
  const kind = arg.required ? 'required' : 'optional';
  const hint = inlineText(arg.hint);
  return hint === '' ? `\`${arg.id}\` (${kind})` : `\`${arg.id}\` (${kind}, ${hint})`;
}

export function describeArguments(args: readonly Argument[]): string {
  return args.map(describeArgument).join(', ');
}

// The body of a flow or an Agent block, or the text of a rule, as a paragraph with its line breaks kept (F-05, AC-006,
// AC-020 and AC-024). The blank
// lines before the first text and the whitespace after the last text are dropped, so the paragraph starts with its own
// line break; '' when the body is blank, so a whitespace-only body counts as no body.
export function bodyText(body: string): string {
  const text = body.replace(/^(?:[ \t]*\r?\n)+/, '').trimEnd();
  return text === '' ? '' : `\n\n${text}`;
}

// The rule tags of a flow or an Agent block as one comma-separated list of the file names of their rules, in their order;
// `none` when there are none (F-05, AC-007 and AC-022; F-16, AC-029).
export function ruleTagsText(tags: readonly RuleTag[] | undefined, rules: readonly Rule[]): string {
  return tags === undefined || tags.length === 0 ? 'none' : tags.map((tag) => ruleFileOf(tag, rules)).join(', ');
}

// The file name of the rule a tag names, without the `.md` (F-16, AC-029). The config is checked before generation, so a
// tag that names no rule of the project is a programmer error.
export function ruleFileOf(tag: RuleTag, rules: readonly Rule[]): string {
  const rule = rules.find((candidate) => candidate.id === tag.ruleId);
  if (rule === undefined) throw new GenerationError(`the rule tag ${tag.ruleId} names no rule of the project`);
  return ruleFileName(rule);
}

// Each argument of a flow or the pipeline on its own line; `No arguments` when there are none (F-05, AC-008 and AC-001).
export function argumentsText(args: readonly Argument[]): string {
  return args.length === 0 ? '\nNo arguments' : linesOf(args.map((arg) => `- ${describeArgument(arg)}`));
}

// The tools as one comma-separated list in their order. The list is written plain when every tool name is a plain YAML
// scalar; otherwise the whole list is quoted, so that the frontmatter line stays one YAML string (F-05, AC-019).
export function yamlToolsText(tools: readonly string[]): string {
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
export function quotedText(text: string): string {
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(
      /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g,
      (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
    );
  return `"${escaped}"`;
}
