import type { Rule } from '../model.js';
import { fileNameOf } from './file-name.js';

// The file name of a rule's file, without the `.md` (F-16, AC-029): the rule's title, with the same rule as a flow name.
// The rule id is never used, since it is a GUID. Two rules with the same file name are a blocker in the analysis.
export function ruleFileName(rule: Rule): string {
  return fileNameOf(rule.title);
}
