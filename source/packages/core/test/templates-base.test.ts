import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const BASE = join(REPO_ROOT, 'templates', 'base');
const SPEC_TEMPLATE = join(BASE, 'spec-template');
const F00_TEMPLATE = join(REPO_ROOT, '..', 'spec', 'specifications', 'F-00-template');
const SPEC_FILES = ['stories.md', 'plan.md', 'progress.md'];

function read(name: string): string {
  return readFileSync(join(BASE, name), 'utf8');
}

/** The level-2 headings of a Markdown text, in order. */
function sectionHeadings(text: string): string[] {
  return [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1] ?? '');
}

describe('F-03 T004 base layouts', () => {
  it('F-03 AC-001 the base CLAUDE.md and process.md layouts exist and are non-empty Markdown', () => {
    for (const name of ['CLAUDE.md', 'process.md']) {
      const text = read(name);
      expect(text.trim().length, name).toBeGreaterThan(0);
      expect(text.startsWith('# '), name).toBe(true);
    }
  });

  it('F-03 AC-001 the base CLAUDE.md has Overview, Layout, Working rules, Commands and agents, Rules, in that order', () => {
    expect(sectionHeadings(read('CLAUDE.md'))).toEqual([
      'Overview',
      'Layout',
      'Working rules',
      'Commands and agents',
      'Rules',
    ]);
  });
});

describe('F-03 T005 spec-template layouts', () => {
  it('F-03 AC-001 the spec-template layouts exist and are non-empty Markdown', () => {
    for (const name of SPEC_FILES) {
      const text = readFileSync(join(SPEC_TEMPLATE, name), 'utf8');
      expect(text.trim().length, name).toBeGreaterThan(0);
      expect(text.startsWith('# '), name).toBe(true);
    }
  });

  it('F-03 AC-004 each spec-template layout is byte-identical to the F-00 template', () => {
    for (const name of SPEC_FILES) {
      const layout = readFileSync(join(SPEC_TEMPLATE, name));
      const original = readFileSync(join(F00_TEMPLATE, name));
      expect(layout.length, name).toBe(original.length);
      for (let i = 0; i < original.length; i++) {
        if (layout[i] !== original[i]) {
          expect.fail(`${name} differs from the F-00 template at byte ${i}`);
        }
      }
    }
  });
});
