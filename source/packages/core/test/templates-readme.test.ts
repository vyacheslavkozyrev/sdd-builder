import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const TEMPLATES = join(REPO_ROOT, 'templates');
const README = join(TEMPLATES, 'README.md');

/** One row of the "Claude Code layout (MVP)" table: the output cell and the source cell. */
interface LayoutRow {
  output: string;
  source: string;
}

/** The text of the first backtick-quoted span in a table cell. */
function firstCode(cell: string): string {
  const match = cell.match(/`([^`]+)`/);
  if (match?.[1] === undefined) throw new Error(`no backtick-quoted path in cell "${cell}"`);
  return match[1];
}

/**
 * The rows of the Claude Code layout table in templates/README.md, in order. Only the section under
 * that heading is read. Inside it, every line starting with `|` is the header, the separator or a
 * two-cell row; any other row throws, so a row can never be skipped without failing.
 */
export function layoutRows(text: string): LayoutRow[] {
  const section = text.split(/^## Claude Code layout \(MVP\)$/m)[1]?.split(/^## /m)[0] ?? '';
  const rows: LayoutRow[] = [];
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    const [output = '', source = '', ...extra] = cells;
    if (output === 'Output file') continue;
    if (extra.length > 0 || source === '') throw new Error(`layout row is not two cells: "${line}"`);
    rows.push({ output: firstCode(output), source: firstCode(source) });
  }
  return rows;
}

/** 'file' or 'dir' for a path under root, or undefined when it does not exist. */
function entryKind(root: string, path: string): 'file' | 'dir' | undefined {
  const full = join(root, path);
  if (!existsSync(full)) return undefined;
  return statSync(full).isDirectory() ? 'dir' : 'file';
}

/**
 * Findings for one row of the layout table. A source must exist under `root` as a file, or as a
 * directory when it ends with `/`.
 */
function layoutFindings(row: LayoutRow): string[] {
  if (row.source.includes('<')) return [`${row.output}: source "${row.source}" has an unknown placeholder`];
  if (row.source.endsWith('/')) {
    return entryKind(TEMPLATES, row.source) === 'dir' ? [] : [`${row.output}: directory "${row.source}" is missing`];
  }
  return entryKind(TEMPLATES, row.source) === 'file' ? [] : [`${row.output}: source "${row.source}" is missing`];
}

describe('F-03 T016 Claude Code layout table in templates/README.md', () => {
  const rows = layoutRows(readFileSync(README, 'utf8'));

  it('F-03 AC-029 the table is read: every row has an output and a source', () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.output).not.toBe('');
      expect(row.source).not.toBe('');
    }
  });

  it('F-03 AC-029 the parser reads only the Claude Code layout table', () => {
    const text = [
      '## Placeholders',
      '',
      '| Placeholder | Value |',
      '|---|---|',
      '| `{{projectName}}` | `ProjectConfig.name` |',
      '',
      '## Claude Code layout (MVP)',
      '',
      '| Output file | Source |',
      '|---|---|',
      '| `CLAUDE.md` | `base/CLAUDE.md` |',
      '',
      '## Branch and gate text',
      '',
      '| Output file | Source |',
      '|---|---|',
      '| `other.md` | `base/other.md` |',
    ].join('\n');
    expect(layoutRows(text)).toEqual([{ output: 'CLAUDE.md', source: 'base/CLAUDE.md' }]);
  });

  it('F-03 AC-029 the parser throws on a row it cannot read instead of skipping it', () => {
    const text = [
      '## Claude Code layout (MVP)',
      '',
      '| Output file | Source |',
      '|---|---|',
      '| CLAUDE.md | base/CLAUDE.md |',
    ].join('\n');
    expect(() => layoutRows(text)).toThrow('no backtick-quoted path');
    const threeCells = ['## Claude Code layout (MVP)', '', '| `a` | `b` | `c` |'].join('\n');
    expect(() => layoutRows(threeCells)).toThrow('is not two cells');
  });

  it('F-03 AC-029 every source in the Claude Code layout table exists under templates/', () => {
    const findings = rows.flatMap((row) => layoutFindings(row));
    expect(findings).toEqual([]);
  });

  it('F-03 AC-029 a row whose concrete source is missing is reported', () => {
    const row = { output: 'CLAUDE.md', source: 'base/missing.md' };
    expect(layoutFindings(row)).toEqual(['CLAUDE.md: source "base/missing.md" is missing']);
  });

  it('F-03 AC-029 a row whose directory source is missing or is a file is reported', () => {
    expect(layoutFindings({ output: 'x', source: 'no-such-dir/' })).toEqual([
      'x: directory "no-such-dir/" is missing',
    ]);
    expect(layoutFindings({ output: 'x', source: 'base/CLAUDE.md/' })).toEqual([
      'x: directory "base/CLAUDE.md/" is missing',
    ]);
  });

  it('F-03 AC-029 a source that holds an unknown placeholder is reported', () => {
    expect(layoutFindings({ output: 'x', source: 'base/<name>.md' })).toEqual([
      'x: source "base/<name>.md" has an unknown placeholder',
    ]);
  });
});
