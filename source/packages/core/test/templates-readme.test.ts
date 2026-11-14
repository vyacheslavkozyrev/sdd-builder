import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STEP_CATALOG, getCatalogStep, type StepDefinition, type StepKind } from '../src/index.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const TEMPLATES = join(REPO_ROOT, 'templates');
const README = join(TEMPLATES, 'README.md');

/** Layout file names under `steps/<id>/`, and the step kind each one is for. */
const LAYOUT_KINDS: ReadonlyMap<string, StepKind> = new Map<string, StepKind>([
  ['command.md', 'command'],
  ['agent.md', 'agent'],
  ['skill.md', 'skill'],
  ['script.md', 'script'],
]);

/** `steps/<id>/<file>`: the source pattern of the per-step layouts. */
const STEP_SOURCE = /^steps\/<id>\/([\w.-]+)$/;

/**
 * Output rows exempt from the source check, matched by the exact output cell. The skill row needs a
 * layout only once a catalog skill step exists: AC-008 requires a layout for each catalog step of a
 * kind, and the catalog has no skill step today. The test "the skill row is exempt only while the
 * catalog has no skill step" fails when one is added, so the exemption is removed with it.
 */
const EXEMPT_OUTPUTS: readonly string[] = ['.claude/skills/<name>/SKILL.md'];

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
 * Findings for one row of the layout table. A per-step source must exist under `root` for every
 * catalog step of its kind; any other source must exist as a file, or as a directory when it ends
 * with `/`.
 */
function layoutFindings(
  row: LayoutRow,
  root: string = TEMPLATES,
  catalog: readonly StepDefinition[] = DEFAULT_STEP_CATALOG,
): string[] {
  if (EXEMPT_OUTPUTS.includes(row.output)) return [];

  const stepSource = row.source.match(STEP_SOURCE);
  if (stepSource !== null) {
    const file = stepSource[1] ?? '';
    const kind = LAYOUT_KINDS.get(file);
    if (kind === undefined) return [`${row.output}: source "${row.source}" is not a known layout file`];
    const kindSteps = catalog.filter((step) => step.kind === kind);
    if (kindSteps.length === 0) return [`${row.output}: no catalog step of kind ${kind} for "${row.source}"`];
    return kindSteps
      .map((step) => `steps/${step.id}/${file}`)
      .filter((source) => entryKind(root, source) !== 'file')
      .map((source) => `${row.output}: source "${source}" is missing`);
  }

  if (row.source.includes('<')) return [`${row.output}: source "${row.source}" has an unknown placeholder`];
  if (row.source.endsWith('/')) {
    return entryKind(root, row.source) === 'dir' ? [] : [`${row.output}: directory "${row.source}" is missing`];
  }
  return entryKind(root, row.source) === 'file' ? [] : [`${row.output}: source "${row.source}" is missing`];
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

  it('F-03 AC-029 every source in the Claude Code layout table exists under templates/, or is a scripts/ output from a script.md layout', () => {
    const findings = rows.flatMap((row) => layoutFindings(row));
    expect(findings).toEqual([]);
  });

  it('F-03 AC-029 the skill row is exempt only while the catalog has no skill step', () => {
    expect(DEFAULT_STEP_CATALOG.filter((step) => step.kind === 'skill')).toEqual([]);
    expect(EXEMPT_OUTPUTS).toEqual(['.claude/skills/<name>/SKILL.md']);
    expect(rows.map((row) => row.output)).toContain('.claude/skills/<name>/SKILL.md');
  });

  it('F-03 AC-029 the skill exemption covers only the skill row, not another skill output', () => {
    expect(layoutFindings({ output: '.claude/skills/<name>/SKILL.md', source: 'steps/<id>/skill.md' }, TEMPLATES, [])).toEqual([]);
    expect(layoutFindings({ output: '.claude/skills/<name>/NOTES.md', source: 'steps/<id>/skill.md' }, TEMPLATES, [])).toEqual([
      '.claude/skills/<name>/NOTES.md: no catalog step of kind skill for "steps/<id>/skill.md"',
    ]);
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

  it('F-03 AC-029 a per-step row is reported when no catalog step of its kind has the layout', () => {
    const row = { output: '.claude/agents/<name>.md', source: 'steps/<id>/agent.md' };
    expect(layoutFindings(row, TEMPLATES, [])).toEqual([
      '.claude/agents/<name>.md: no catalog step of kind agent for "steps/<id>/agent.md"',
    ]);
    const deployOnly = [{ ...getCatalogStep('implement'), id: 'deploy' }];
    expect(layoutFindings(row, TEMPLATES, deployOnly)).toEqual([
      '.claude/agents/<name>.md: source "steps/deploy/agent.md" is missing',
    ]);
  });

  it('F-03 AC-029 a per-step row names each catalog step of the kind that lacks the layout', () => {
    const row = { output: '.claude/agents/<name>.md', source: 'steps/<id>/agent.md' };
    const implement = getCatalogStep('implement');
    const withSecondAgent = [implement, { ...implement, id: 'deploy' }];
    expect(layoutFindings(row, TEMPLATES, withSecondAgent)).toEqual([
      '.claude/agents/<name>.md: source "steps/deploy/agent.md" is missing',
    ]);
  });

  it('F-03 AC-029 a scripts/ row is reported when a script step has no script.md layout', () => {
    const row = { output: 'scripts/<name>.sh', source: 'steps/<id>/script.md' };
    const withMissingScript = [{ ...getCatalogStep('unit-tests'), id: 'deploy' }];
    expect(layoutFindings(row, TEMPLATES, withMissingScript)).toEqual([
      'scripts/<name>.sh: source "steps/deploy/script.md" is missing',
    ]);
    expect(layoutFindings(row)).toEqual([]);
  });

  it('F-03 AC-029 a source that names an unknown layout file or placeholder is reported', () => {
    expect(layoutFindings({ output: 'x', source: 'steps/<id>/notes.md' })).toEqual([
      'x: source "steps/<id>/notes.md" is not a known layout file',
    ]);
    expect(layoutFindings({ output: 'x', source: 'steps/<id>/constructor' })).toEqual([
      'x: source "steps/<id>/constructor" is not a known layout file',
    ]);
    expect(layoutFindings({ output: 'x', source: 'base/<name>.md' })).toEqual([
      'x: source "base/<name>.md" has an unknown placeholder',
    ]);
  });
});
