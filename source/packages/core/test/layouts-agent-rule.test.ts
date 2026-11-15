import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const CLAUDE_CODE = join(REPO_ROOT, 'templates', 'claude-code');
const README = join(REPO_ROOT, 'templates', 'README.md');

/** Placeholders of the agent layout, as the README table names them (T004). */
const AGENT_PLACEHOLDERS = ['name', 'description', 'ruleTags'];

/** Placeholders of the rule layout, as the README table names them (T004). */
const RULE_PLACEHOLDERS = ['ruleTitle', 'ruleText'];

/** Flat-model placeholders that no pipeline layout may use (F-03 AC-001, AC-009). */
const FORBIDDEN = ['modules', 'codeRules', 'testRules', 'process.diagram', 'workflow.steps', 'workflow.rules'];

/** Every `{{name}}` in the text, in order of appearance. */
function placeholderNames(text: string): string[] {
  return [...text.matchAll(/\{\{([^{}\n]*)\}\}/g)].map((match) => match[1] ?? '');
}

/** The `##` headings of the text, in order of appearance, without the marker. */
function h2Headings(text: string): string[] {
  return [...text.matchAll(/^## (.+)$/gm)].map((match) => (match[1] ?? '').trim());
}

/** The placeholder names listed in the first column of the table in templates/README.md. */
function readmePlaceholders(text: string): Set<string> {
  const names = new Set<string>();
  const section = text.split(/^## Placeholders$/m)[1]?.split(/^## /m)[0] ?? '';
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    const firstCell = line.split('|')[1] ?? '';
    for (const match of firstCell.matchAll(/`\{\{([^`{}]+)\}\}`/g)) {
      if (match[1] !== undefined) names.add(match[1]);
    }
  }
  return names;
}

const AGENT_LAYOUT = readFileSync(join(CLAUDE_CODE, 'agent.md'), 'utf8');
const RULE_LAYOUT = readFileSync(join(CLAUDE_CODE, 'rule.md'), 'utf8');
const readme = readmePlaceholders(readFileSync(README, 'utf8'));

describe('F-03 T004 agent layout', () => {
  it('F-03 AC-010 the agent layout has the required ## headings exactly, in order: Purpose, Inputs, Outputs, Rules, Checks', () => {
    expect(h2Headings(AGENT_LAYOUT)).toEqual(['Purpose', 'Inputs', 'Outputs', 'Rules', 'Checks']);
  });

  it('F-03 AC-010 the agent layout has no front matter', () => {
    expect(AGENT_LAYOUT.startsWith('---')).toBe(false);
  });

  it('F-03 AC-010 the agent layout uses only its name, description and ruleTags placeholders, each listed in templates/README.md', () => {
    expect([...new Set(placeholderNames(AGENT_LAYOUT))].sort()).toEqual([...AGENT_PLACEHOLDERS].sort());
    for (const name of AGENT_PLACEHOLDERS) {
      expect(readme.has(name), `{{${name}}} is not in templates/README.md`).toBe(true);
    }
  });

  it('F-03 AC-010 the agent layout contains no forbidden flat placeholder', () => {
    for (const name of FORBIDDEN) {
      expect(placeholderNames(AGENT_LAYOUT), name).not.toContain(name);
    }
  });

  it('F-03 AC-010 guard: the heading reader used by the layout check counts ## headings only, in order, and ignores the # title and ### headings', () => {
    expect(h2Headings('# A\n\n## Purpose\n\n## Inputs\n\n## Outputs\n\n## Rules\n')).toEqual([
      'Purpose',
      'Inputs',
      'Outputs',
      'Rules',
    ]);
    expect(h2Headings('## Checks\n\n## Purpose\n')).toEqual(['Checks', 'Purpose']);
    expect(h2Headings('## Rules\n\n### Checks\n')).toEqual(['Rules']);
  });
});

describe('F-03 T004 rule layout', () => {
  it('F-03 AC-009 the rule layout carries the title and the text placeholders', () => {
    expect(RULE_LAYOUT).toContain('{{ruleTitle}}');
    expect(RULE_LAYOUT).toContain('{{ruleText}}');
  });

  it('F-03 AC-009 the rule layout has no forbidden placeholder and uses only its title and text placeholders', () => {
    const names = placeholderNames(RULE_LAYOUT);
    for (const name of FORBIDDEN) {
      expect(names, name).not.toContain(name);
    }
    expect([...new Set(names)].sort()).toEqual([...RULE_PLACEHOLDERS].sort());
  });

  it('F-03 AC-009 each rule placeholder is listed in templates/README.md', () => {
    for (const name of RULE_PLACEHOLDERS) {
      expect(readme.has(name), `{{${name}}} is not in templates/README.md`).toBe(true);
    }
  });

  it('F-03 AC-009 the title is the first line of the rule layout', () => {
    expect(RULE_LAYOUT.split('\n')[0]).toBe('# {{ruleTitle}}');
  });
});
