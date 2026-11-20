import type { Argument, RuleTag } from '../model.js';

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

// The rule tags of a flow or an Agent block as one comma-separated list in their order; `none` when there are none
// (F-05, AC-007 and AC-022).
export function ruleTagsText(tags: readonly RuleTag[] | undefined): string {
  return tags === undefined || tags.length === 0 ? 'none' : tags.map((tag) => tag.ruleId).join(', ');
}
