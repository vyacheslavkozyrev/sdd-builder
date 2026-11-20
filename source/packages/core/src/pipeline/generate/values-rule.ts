import type { Rule } from '../model.js';
import { inlineText } from './values-text.js';

// The values of a rule file layout (F-04, AC-004). `ruleId` and `ruleTitle` are inline. `ruleText` is the paragraph of
// the rule, starting with its own blank line and '' when the rule has no text. The values are a pure function of the
// rule.
export function ruleValues(rule: Rule): Record<string, string> {
  return {
    ruleId: rule.id,
    ruleTitle: inlineText(rule.title),
    ruleText: rule.text === '' ? '' : `\n\n${rule.text}`,
  };
}
