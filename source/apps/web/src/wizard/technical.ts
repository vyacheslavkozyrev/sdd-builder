// The technical details step's text rules (F-10 AC-004, AC-006, AC-012, AC-013,
// AC-014, AC-015, AC-017, AC-018). Pure functions: no React and no I/O. Lengths
// are counted in code points, as in project.ts. The stored text is never changed
// here; only the limits and the derived file names and flags are computed.

import { limitToCodePoints } from './project.js';

export const SINGLE_LINE_LIMIT = 100;
export const ARCHITECTURE_LIMIT = 5000;
export const RULE_DESCRIPTION_LIMIT = 1000;
export const RULE_BLOCK_LIMIT = 60;

// Keeps the first 100 code points of a single-line field or a rule name.
export function limitSingleLine(text: string): string {
  return limitToCodePoints(text, SINGLE_LINE_LIMIT);
}

// Keeps the first 5,000 code points of the architecture text.
export function limitArchitecture(text: string): string {
  return limitToCodePoints(text, ARCHITECTURE_LIMIT);
}

// Keeps the first 1,000 code points of a rule description.
export function limitRuleDescription(text: string): string {
  return limitToCodePoints(text, RULE_DESCRIPTION_LIMIT);
}

// The id of a rule block: the name in lower case, with each run of characters
// outside a–z and 0–9 replaced by one hyphen (ui.md §2).
export function ruleIdFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// True when the name gives an id with a letter or digit. A blank name, spaces
// only, or only symbols gives no usable file name (AC-015).
export function hasLetterOrDigit(name: string): boolean {
  return /[a-z0-9]/.test(ruleIdFromName(name));
}

// For each name, true when its id is shared with another name that has a
// letter or digit. Both blocks of a clash are flagged; names without a usable
// id are never flagged as duplicates (AC-017). The names are not changed.
export function duplicateIdFlags(names: readonly string[]): boolean[] {
  const counts = new Map<string, number>();
  for (const name of names) {
    if (!hasLetterOrDigit(name)) continue;
    const id = ruleIdFromName(name);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return names.map((name) => {
    if (!hasLetterOrDigit(name)) return false;
    return (counts.get(ruleIdFromName(name)) ?? 0) > 1;
  });
}

// The Add rule block control is enabled below the limit of 60 blocks (AC-012).
export function canAddRule(blockCount: number): boolean {
  return blockCount < RULE_BLOCK_LIMIT;
}
