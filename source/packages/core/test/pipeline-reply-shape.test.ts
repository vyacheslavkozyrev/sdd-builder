// F-03 AC-022, AC-023: checkReply on a reply of any shape and its findings' order. A reply that is not an object, or that
// maps a path to a value that is not a string, gives findings and does not throw. The findings are sorted by path and then
// by message, and the same reply against the same plan gives the same list, whatever the order of the reply's keys or of
// the plan's entries.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { checkReply, planGeneration, type PipelinePlanEntry } from '../src/pipeline/index.js';
import { templateSourceFromRecord } from '../src/template-source.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const TEMPLATES = join(REPO_ROOT, 'templates');
const SPECIFY_AGENT = '.claude/agents/specify.md';
const CLAUDE_MD = 'CLAUDE.md';
const NOT_AN_OBJECT = 'reply must be an object mapping file paths to text';

/** The real layouts the plan reads: base files, spec template files, and the command, agent and rule layouts. */
function realTemplates() {
  const read = (path: string): string => readFileSync(join(TEMPLATES, path), 'utf8');
  const records: Record<string, string> = {
    'base/CLAUDE.md': read('base/CLAUDE.md'),
    'base/process.md': read('base/process.md'),
    'claude-code/agent.md': read('claude-code/agent.md'),
    'claude-code/command.md': read('claude-code/command.md'),
    'claude-code/pipeline-command.md': read('claude-code/pipeline-command.md'),
    'claude-code/rule.md': read('claude-code/rule.md'),
  };
  for (const name of readdirSync(join(TEMPLATES, 'base', 'spec-template'))) {
    records[`base/spec-template/${name}`] = read(`base/spec-template/${name}`);
  }
  return templateSourceFromRecord(records);
}

/** The plan for the default config with the real templates, built fresh so no test changes another's input. */
function defaultPlan(): PipelinePlanEntry[] {
  return planGeneration(structuredClone(defaultProjectConfig), realTemplates());
}

/** A small plan with known layouts: two files, one with headings in a non-sorted order. */
function smallPlan(): PipelinePlanEntry[] {
  return [
    { path: CLAUDE_MD, layout: '## Rules\n## Purpose\n', description: '', ruleTags: [] },
    { path: SPECIFY_AGENT, layout: '## Purpose\n', description: '', ruleTags: [] },
  ];
}

/** The `##` heading lines of a layout, each followed by a blank line, so the text holds the layout's headings. */
function headingBlock(layout: string): string {
  return layout
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => `${line}\n\n`)
    .join('');
}

/** A reply that maps every planned path to plain text with the layout's `##` headings. */
function fullReply(plan: readonly PipelinePlanEntry[]): Record<string, unknown> {
  return Object.fromEntries(
    plan.map((entry) => [entry.path, `# ${entry.path}\n\n${headingBlock(entry.layout)}Written text.\n`]),
  );
}

/** The same entries in the reverse order of their keys. */
function reversedKeys(reply: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(reply).reverse());
}

/** The same entries with the first key moved to the end. */
function rotatedKeys(reply: Record<string, unknown>): Record<string, unknown> {
  const [first, ...rest] = Object.entries(reply);
  return Object.fromEntries(first === undefined ? [] : [...rest, first]);
}

describe('F-03 AC-022: a reply that is not an object', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
    ['a string', 'CLAUDE.md text'],
    ['a number', 42],
    ['zero', 0],
    ['a boolean', true],
    ['an empty array', []],
    ['an array of paths', [CLAUDE_MD]],
  ])('F-03 AC-022 gives one finding, and does not throw, when the reply is %s', (_label, reply) => {
    for (const plan of [smallPlan(), defaultPlan()]) {
      expect(() => checkReply(plan, reply)).not.toThrow();
      expect(checkReply(plan, reply)).toEqual([NOT_AN_OBJECT]);
    }
  });
});

describe('F-03 AC-022: a reply that maps a path to a value that is not a string', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a number', 7],
    ['a boolean', false],
    ['an object', { text: 'x' }],
    ['an array', ['x']],
  ])('F-03 AC-022 gives one finding naming the planned path, and does not throw, when its value is %s', (_label, value) => {
    const plan = smallPlan();
    expect(() => checkReply(plan, { [CLAUDE_MD]: '## Rules\n## Purpose\n', [SPECIFY_AGENT]: value })).not.toThrow();
    expect(checkReply(plan, { [CLAUDE_MD]: '## Rules\n## Purpose\n', [SPECIFY_AGENT]: value })).toEqual([
      `file "${SPECIFY_AGENT}" in the reply has no text`,
    ]);
  });

  it.each([
    ['a path not in the plan', 'notes/extra.md', `file "notes/extra.md" in the reply is not in the plan`],
    ['an absolute path', '/etc/passwd', 'file path "/etc/passwd" is unsafe: it must be relative'],
    ['a path with a backslash', 'a\\b.md', 'file path "a\\b.md" is unsafe: it must use forward slashes'],
  ])('F-03 AC-022 gives one finding naming %s, and does not throw, when its value is not a string', (_label, path, finding) => {
    const plan = smallPlan();
    const reply = { ...fullReply(plan), [path]: 9 };
    expect(() => checkReply(plan, reply)).not.toThrow();
    expect(checkReply(plan, reply)).toEqual([finding]);
  });
});

describe('F-03 AC-023: findings are sorted by path and then by message', () => {
  it('F-03 AC-023 sorts findings across paths by path, not by plan order or reply order', () => {
    const reply = {
      [CLAUDE_MD]: 'text with no headings\n',
      [SPECIFY_AGENT]: null,
      '/x.md': 'text',
      'notes/extra.md': 'text',
    };
    expect(checkReply(smallPlan(), reply)).toEqual([
      `file "${SPECIFY_AGENT}" in the reply has no text`,
      'file path "/x.md" is unsafe: it must be relative',
      `file "${CLAUDE_MD}" is missing the heading "## Purpose"`,
      `file "${CLAUDE_MD}" is missing the heading "## Rules"`,
      'file "notes/extra.md" in the reply is not in the plan',
    ]);
  });

  it('F-03 AC-023 sorts the findings of one path by message, not by the order of the layout headings', () => {
    const plan = smallPlan();
    const findings = checkReply(plan, { [CLAUDE_MD]: 'text\n', [SPECIFY_AGENT]: '## Purpose\n' });
    expect(findings).toEqual([
      `file "${CLAUDE_MD}" is missing the heading "## Purpose"`,
      `file "${CLAUDE_MD}" is missing the heading "## Rules"`,
    ]);
  });

  it.each([
    ['the reply in order', (reply: Record<string, unknown>) => reply],
    ['the reply with its keys reversed', reversedKeys],
    ['the reply with its first key moved to the end', rotatedKeys],
  ])('F-03 AC-023 gives the same sorted findings for %s', (_label, reorder) => {
    const plan = smallPlan();
    const reply = { [SPECIFY_AGENT]: null, '/x.md': 'a', [CLAUDE_MD]: 'no headings', 'notes/extra.md': 'b' };
    expect(checkReply(plan, reorder(reply))).toEqual([
      `file "${SPECIFY_AGENT}" in the reply has no text`,
      'file path "/x.md" is unsafe: it must be relative',
      `file "${CLAUDE_MD}" is missing the heading "## Purpose"`,
      `file "${CLAUDE_MD}" is missing the heading "## Rules"`,
      'file "notes/extra.md" in the reply is not in the plan',
    ]);
  });

  it('F-03 AC-023 gives the same sorted findings when the plan lists its entries in the reverse order', () => {
    const reply = { [CLAUDE_MD]: 'no headings', [SPECIFY_AGENT]: null };
    expect(checkReply([...smallPlan()].reverse(), reply)).toEqual(checkReply(smallPlan(), reply));
  });

  it('F-03 AC-023 gives the same findings when the same reply is checked twice against the same plan', () => {
    const plan = defaultPlan();
    const reply = { ...fullReply(plan), [CLAUDE_MD]: 'SDDBuilder text {{ x }}', 'notes/extra.md': 'text' };
    const first = checkReply(plan, reply);
    expect(first.length).toBeGreaterThan(0);
    expect(checkReply(plan, reply)).toEqual(first);
  });

  it('F-03 AC-023 gives the same findings for a reply whose keys are shuffled against the default plan', () => {
    const plan = defaultPlan();
    const reply = { ...fullReply(plan), [SPECIFY_AGENT]: 'no headings', 'notes/extra.md': 'text', '/x.md': 'text' };
    const expected = checkReply(plan, reply);
    expect(checkReply(plan, reversedKeys(reply))).toEqual(expected);
    expect(checkReply(plan, rotatedKeys(reply))).toEqual(expected);
  });
});
