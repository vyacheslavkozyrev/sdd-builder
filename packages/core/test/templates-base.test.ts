import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const BASE = join(import.meta.dirname, '..', '..', '..', 'templates', 'base');

function read(name: string): string {
  return readFileSync(join(BASE, name), 'utf8');
}

/** The level-2 headings of a Markdown text, in order. */
function sectionHeadings(text: string): string[] {
  return [...text.matchAll(/^## (.+)$/gm)].map((match) => match[1] ?? '');
}

/** The text under one level-2 heading, up to the next one. */
function sectionBody(text: string, heading: string): string | undefined {
  const start = text.indexOf(`\n## ${heading}\n`);
  if (start === -1) return undefined;
  const rest = text.slice(start + heading.length + 5);
  const next = rest.search(/^## /m);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('F-03 T004 base layouts', () => {
  it('F-03 AC-001 the base CLAUDE.md and process.md layouts exist and are non-empty Markdown', () => {
    for (const name of ['CLAUDE.md', 'process.md']) {
      const text = read(name);
      expect(text.trim().length, name).toBeGreaterThan(0);
      expect(text.startsWith('# '), name).toBe(true);
    }
  });

  it('F-03 AC-002 the base CLAUDE.md has Overview, Layout, Working rules, Commands and agents, Rules, in that order', () => {
    expect(sectionHeadings(read('CLAUDE.md'))).toEqual([
      'Overview',
      'Layout',
      'Working rules',
      'Commands and agents',
      'Rules',
    ]);
  });

  it('F-03 AC-003 the process.md layout has a Process diagram section that holds the diagram placeholder', () => {
    const text = read('process.md');
    expect(sectionHeadings(text)).toContain('Process diagram');
    expect(sectionBody(text, 'Process diagram')).toContain('{{process.diagram}}');
  });
});
