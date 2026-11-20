// The technical details step's text rules (F-10 AC-004, AC-006, AC-012 to
// AC-017, AC-019, AC-020). Pure functions: no React and no I/O. Lengths are
// counted in code points, as in project.ts. The single-line cut reuses
// limitToCodePoints and NAME_LIMIT from project.ts.

export const ARCHITECTURE_LIMIT = 5000;
export const RULE_DESCRIPTION_LIMIT = 1000;
export const RULE_LIMIT = 60;
export const RULE_ID_MAX_LENGTH = 60;

// The rule id from a rule name: lower case, and each run of characters outside
// a–z and 0–9 becomes one hyphen. Leading and trailing hyphens are kept, so the
// id shows exactly what the name gave (AC-014).
export function ruleId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// The file the rule is written to, shown on the rule block (AC-014).
export function ruleFileLine(name: string): string {
  return `.claude/rules/${ruleId(name)}.md`;
}

export type RuleIdProblem = 'none' | 'no-letter-or-digit' | 'must-start-with-letter' | 'too-long';

// Why the derived id of a name is refused by the schema (`pipeline-schema.md`
// §2: lower-case letters, digits and hyphens, starting with a letter, at most
// 60 characters). The checks run in this order, and the first one that fails
// is the problem. The wizard keeps the block; the analysis reports it (F-14).
export function ruleIdProblem(name: string): RuleIdProblem {
  const id = ruleId(name);
  if (!/[a-z0-9]/.test(id)) return 'no-letter-or-digit';
  if (!/^[a-z]/.test(id)) return 'must-start-with-letter';
  if (id.length > RULE_ID_MAX_LENGTH) return 'too-long';
  return 'none';
}

// The message shown in place of the file line, or undefined when the id is valid.
export function ruleIdProblemMessage(problem: RuleIdProblem): string | undefined {
  switch (problem) {
    case 'none':
      return undefined;
    case 'no-letter-or-digit':
      return 'Needs a letter or digit.';
    case 'must-start-with-letter':
      return 'The id must start with a letter.';
    case 'too-long':
      return 'The id is longer than 60 characters.';
  }
}

// For each name, true when another name gives the same valid id. Names whose id
// is refused are never flagged as duplicates (AC-019).
export function duplicateRuleFlags(names: readonly string[]): boolean[] {
  const ids = names.map((name) => (ruleIdProblem(name) === 'none' ? ruleId(name) : undefined));
  const counts = new Map<string, number>();
  for (const id of ids) {
    if (id !== undefined) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return ids.map((id) => id !== undefined && (counts.get(id) ?? 0) > 1);
}

// A new rule block can be added while the list has fewer than 60 blocks (AC-012).
export function canAddRule(blockCount: number): boolean {
  return blockCount < RULE_LIMIT;
}
