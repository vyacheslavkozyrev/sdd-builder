import type { Rule } from '../model.js';
import { bodyText, inlineText } from './values-text.js';

// The values of a rule file layout (F-04, AC-004; F-05, AC-024 and AC-025). `ruleId` and `ruleTitle` are inline.
// `ruleText` is the paragraph of the rule, kept with its line breaks and starting with its own blank line; '' when the
// rule has no text, or only blank lines, so the file ends after its heading or its text with one newline. The values
// are a pure function of the rule.
export function ruleValues(rule: Rule): Record<string, string> {
  return {
    ruleId: rule.id,
    ruleTitle: inlineText(rule.title),
    ruleText: bodyText(rule.text),
  };
}
