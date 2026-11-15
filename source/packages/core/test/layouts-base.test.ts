import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const BASE = join(REPO_ROOT, 'templates', 'base');
const README = join(REPO_ROOT, 'templates', 'README.md');

/** Placeholders the flat base layouts used and the pipeline base layouts must not (F-03 AC-001). */
const FORBIDDEN = ['modules', 'codeRules', 'testRules', 'process.diagram'];

/** The placeholders the pipeline base layouts may use: the values the pipeline config fills (T002). */
const ALLOWED = ['projectName', 'idea', 'stack.language', 'processList', 'commandList', 'agentList', 'ruleList'];

/** Every file under `templates/base/`, as a path relative to it and its text, in sorted order. */
function baseLayouts(dir = BASE, prefix = ''): Array<{ path: string; text: string }> {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap((entry) => {
      const full = join(dir, entry.name);
      const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) return baseLayouts(full, path);
      return [{ path, text: readFileSync(full, 'utf8') }];
    });
}

/** Every `{{name}}` in the text, in order of appearance. */
function placeholderNames(text: string): string[] {
  return [...text.matchAll(/\{\{([^{}\n]*)\}\}/g)].map((match) => match[1] ?? '');
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

/** Findings for a layout: each placeholder that is forbidden, or that is not one of the allowed names. */
function forbiddenFindings(path: string, text: string): string[] {
  return placeholderNames(text)
    .filter((name) => FORBIDDEN.includes(name) || !ALLOWED.includes(name))
    .map((name) => `${path}: placeholder "{{${name}}}" is not allowed in a base layout`);
}

describe('F-03 T002 base layouts for the pipeline', () => {
  const layouts = baseLayouts();
  const readme = readmePlaceholders(readFileSync(README, 'utf8'));

  it('F-03 AC-001 the base layouts exist: CLAUDE.md, process.md and the three spec-template files', () => {
    expect(layouts.map((layout) => layout.path)).toEqual([
      'CLAUDE.md',
      'process.md',
      'spec-template/plan.md',
      'spec-template/progress.md',
      'spec-template/stories.md',
    ]);
  });

  it('F-03 AC-001 no base layout contains {{modules}}, {{codeRules}}, {{testRules}} or {{process.diagram}}', () => {
    const findings = layouts.flatMap((layout) =>
      FORBIDDEN.filter((name) => placeholderNames(layout.text).includes(name)).map(
        (name) => `${layout.path}: contains forbidden placeholder "{{${name}}}"`,
      ),
    );
    expect(findings).toEqual([]);
  });

  it('F-03 AC-001 every placeholder in a base layout is one the pipeline fills, and each is listed in templates/README.md', () => {
    expect(readme.size).toBeGreaterThan(0);
    for (const layout of layouts) {
      expect(forbiddenFindings(layout.path, layout.text), layout.path).toEqual([]);
      for (const name of placeholderNames(layout.text)) {
        expect(readme.has(name), `${layout.path}: {{${name}}} is not in templates/README.md`).toBe(true);
      }
    }
  });

  it('F-03 AC-001 the check reports a forbidden or unknown placeholder in a sample layout', () => {
    expect(forbiddenFindings('sample.md', 'Modules: {{modules}} and {{nope}}')).toEqual([
      'sample.md: placeholder "{{modules}}" is not allowed in a base layout',
      'sample.md: placeholder "{{nope}}" is not allowed in a base layout',
    ]);
  });

  it('F-03 AC-001 the three new list placeholders are listed in the placeholder table of templates/README.md', () => {
    for (const name of ['commandList', 'agentList', 'ruleList']) {
      expect(readme.has(name), name).toBe(true);
    }
  });
});
