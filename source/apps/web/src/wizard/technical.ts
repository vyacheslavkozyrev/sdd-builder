// The technical details step's text rules (F-10 AC-004, AC-006, AC-012 to
// AC-017, AC-019, AC-020). Pure functions: no React and no I/O. Lengths are
// counted in code points, as in project.ts. The single-line cut reuses
// limitToCodePoints and NAME_LIMIT from project.ts. The file name of a rule is
// core's rule (F-16 AC-029), so the wizard shows the name the generator writes.

import { pipeline } from '@sddbuilder/core';
import { codePointCount } from './project.js';

export const ARCHITECTURE_LIMIT = 5000;
export const RULE_DESCRIPTION_LIMIT = 1000;
export const RULE_LIMIT = 60;
export const RULE_ID_MAX_LENGTH = 60;

// The file name of a rule name, without the `.md`: core's rule (F-16 AC-029), read through the pipeline
// namespace. Core reads only the title, so the other fields of the rule are placeholders. A name with no
// letter or digit gives ''. The name is kept as typed (AC-014).
export function ruleId(name: string): string {
  return pipeline.ruleFileName({ index: 0, id: '', title: name, text: '' });
}

// The file the rule is written to, shown on the rule block (AC-014).
export function ruleFileLine(name: string): string {
  return `.claude/rules/${ruleId(name)}.md`;
}

export type RuleIdProblem = 'none' | 'no-letter-or-digit' | 'too-long';

// Why the file name of a name is refused in the wizard. The checks run in this order, and the first one that
// fails is the problem. The no-letter check is the analysis blocker too (F-16 AC-029); the wizard keeps the
// block, and the analysis reports it (F-14). A name with no letter or digit has no file name.
export function ruleIdProblem(name: string): RuleIdProblem {
  const id = ruleId(name);
  if (id === '') return 'no-letter-or-digit';
  if (codePointCount(id) > RULE_ID_MAX_LENGTH) return 'too-long';
  return 'none';
}

// The message shown in place of the file line, or undefined when the id is valid.
export function ruleIdProblemMessage(problem: RuleIdProblem): string | undefined {
  switch (problem) {
    case 'none':
      return undefined;
    case 'no-letter-or-digit':
      return 'Needs a letter or digit.';
    case 'too-long':
      return 'The id is longer than 60 characters.';
  }
}

// For each name, the 1-based number of the first other name that gives the same valid id, or undefined
// when the id is unique or refused. Names whose id is refused are never duplicates (AC-019). The list
// shows this number in the duplicate message of the block.
export function duplicateRuleNumbers(names: readonly string[]): ReadonlyArray<number | undefined> {
  const ids = names.map((name) => (ruleIdProblem(name) === 'none' ? ruleId(name) : undefined));
  return ids.map((id, index) => {
    if (id === undefined) return undefined;
    const first = ids.findIndex((other, position) => position !== index && other === id);
    return first === -1 ? undefined : first + 1;
  });
}

// A new rule block can be added while the list has fewer than 60 blocks (AC-012).
export function canAddRule(blockCount: number): boolean {
  return blockCount < RULE_LIMIT;
}
