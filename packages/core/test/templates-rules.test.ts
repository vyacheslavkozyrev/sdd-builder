import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const RULES_DIR = join(REPO_ROOT, 'templates', 'rules');
const RULE_SECTIONS: Record<string, string[]> = {
  'general.md': ['Scope', 'Code', 'Architecture', 'Documentation'],
  'qa.md': ['Tests travel with the code', 'Where tests live', 'Naming criteria', 'What to test'],
  'code.md': ['Naming', 'Structure', 'Examples', 'Errors'],
};

/** The text of a rule layout, read from the repository root. */
function ruleText(file: string): string {
  return readFileSync(join(RULES_DIR, file), 'utf8');
}

/** The level-2 headings of a Markdown text, in order. */
function sectionHeadings(text: string): string[] {
  return [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1] ?? '');
}

/** How many times a literal string occurs in a text. */
function occurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('F-03 T010 rule layouts', () => {
  it('F-03 AC-013 the rule layouts exist with their sections', () => {
    expect(readdirSync(RULES_DIR).sort()).toEqual(Object.keys(RULE_SECTIONS).sort());
    for (const [file, sections] of Object.entries(RULE_SECTIONS)) {
      expect(sectionHeadings(ruleText(file)), `${file}: section headings`).toEqual(sections);
    }
  });

  it('F-03 AC-014 code.md holds the codeRules and testRules placeholders, each once', () => {
    const text = ruleText('code.md');
    expect(occurrences(text, '{{codeRules}}'), 'codeRules occurrences').toBe(1);
    expect(occurrences(text, '{{testRules}}'), 'testRules occurrences').toBe(1);
  });

  it('F-03 AC-014 no rule layout contains a code sample (fence, inline code or indented block)', () => {
    for (const file of Object.keys(RULE_SECTIONS)) {
      const text = ruleText(file);
      expect(text.includes('```'), `${file}: backtick code fence`).toBe(false);
      expect(text.includes('~~~'), `${file}: tilde code fence`).toBe(false);
      expect(text.includes('`'), `${file}: inline code span`).toBe(false);
      expect(/^(?: {4}|\t)/m.test(text), `${file}: indented code block`).toBe(false);
    }
  });
});
