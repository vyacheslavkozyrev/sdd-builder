// F-03 AC-016, AC-017, AC-018, AC-019: checkReply against the plan from the real planGeneration with the default config and
// the real templates. A reply that maps every planned path to text and no other path gives no findings; a missing planned
// path, a path not in the plan, an unsafe path and a leftover marker each give one finding that names the path.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { checkReply, planGeneration, type PipelinePlanEntry } from '../src/pipeline/index.js';
import { templateSourceFromRecord } from '../src/template-source.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const TEMPLATES = join(REPO_ROOT, 'templates');
const PIPELINE_COMMAND = '.claude/commands/pipeline.md';
const SPECIFY_AGENT = '.claude/agents/specify.md';
const FLOW_COMMAND = '.claude/commands/specify.md';
const CLAUDE_MD = 'CLAUDE.md';

/** The real layouts the plan reads: the base files, the spec template files and the four command, agent and rule layouts. */
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

/** The plan for the default config with the real templates. The plan is built fresh, so no test changes another's input. */
function defaultPlan(): PipelinePlanEntry[] {
  return planGeneration(structuredClone(defaultProjectConfig), realTemplates());
}

/** A reply that maps every planned path to plain text. */
function fullReply(plan: readonly PipelinePlanEntry[]): Record<string, unknown> {
  return Object.fromEntries(plan.map((entry) => [entry.path, `# ${entry.path}\n\nWritten text.\n`]));
}

/** A reply with the given path's text replaced. */
function withText(plan: readonly PipelinePlanEntry[], path: string, text: unknown): Record<string, unknown> {
  return { ...fullReply(plan), [path]: text };
}

/** A reply with the given path removed. */
function withoutPath(plan: readonly PipelinePlanEntry[], path: string): Record<string, unknown> {
  const reply = fullReply(plan);
  delete reply[path];
  return reply;
}

describe('F-03 AC-016: a reply that maps every planned path to text', () => {
  it('F-03 AC-016 gives no findings when it maps every planned path to text and no other path', () => {
    const plan = defaultPlan();
    expect(checkReply(plan, fullReply(plan))).toEqual([]);
  });

  it('F-03 AC-016 gives no findings for an empty plan and an empty reply', () => {
    expect(checkReply([], {})).toEqual([]);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a string', 'text'],
    ['a number', 42],
    ['an array', []],
    ['an array of paths', ['CLAUDE.md']],
  ])('F-03 AC-016 gives one finding, and does not throw, when the reply is %s', (_label, reply) => {
    const findings = checkReply(defaultPlan(), reply);
    expect(findings).toEqual(['reply must be an object mapping file paths to text']);
  });
});

describe('F-03 AC-017: a planned path missing from the reply', () => {
  it.each([[PIPELINE_COMMAND], [SPECIFY_AGENT], [FLOW_COMMAND], [CLAUDE_MD]])(
    'F-03 AC-017 gives one finding that names %s when it is missing from the reply',
    (path) => {
      const plan = defaultPlan();
      expect(plan.map((entry) => entry.path)).toContain(path);
      expect(checkReply(plan, withoutPath(plan, path))).toEqual([`planned file "${path}" is missing from the reply`]);
    },
  );

  it('F-03 AC-017 gives one finding per planned path when the reply is empty', () => {
    const plan = defaultPlan();
    const findings = checkReply(plan, {});
    expect(findings).toHaveLength(plan.length);
    expect(findings).toEqual(plan.map((entry) => `planned file "${entry.path}" is missing from the reply`));
  });

  it.each([['null', null], ['a number', 7], ['an object', { text: 'x' }]])(
    'F-03 AC-017 gives one finding that says the planned path has no text, not that it is missing, when its value is %s',
    (_label, value) => {
      const plan = defaultPlan();
      expect(checkReply(plan, withText(plan, SPECIFY_AGENT, value))).toEqual([
        `file "${SPECIFY_AGENT}" in the reply has no text`,
      ]);
    },
  );
});

describe('F-03 AC-018: a path that is not in the plan', () => {
  it.each([
    ['an absolute path', '/etc/CLAUDE.md', 'it must be relative'],
    ['a Windows drive path', 'C:/projects/CLAUDE.md', 'it must be relative'],
    ['a path with ".." at the start', '../outside.md', 'it must not contain ".."'],
    ['a path with ".." in the middle', '.claude/../../escape.md', 'it must not contain ".."'],
    ['a path with a backslash', '.claude\\agents\\specify.md', 'it must use forward slashes'],
  ])('F-03 AC-018 gives one finding that names the path and says it is unsafe for %s', (_label, path, reason) => {
    const plan = defaultPlan();
    expect(checkReply(plan, withText(plan, path, 'text'))).toEqual([`file path "${path}" is unsafe: ${reason}`]);
  });

  it('F-03 AC-018 gives one finding that names a safe path that is not in the plan', () => {
    const plan = defaultPlan();
    expect(checkReply(plan, withText(plan, 'notes/extra.md', 'text'))).toEqual([
      'file "notes/extra.md" in the reply is not in the plan',
    ]);
  });

  it('F-03 AC-018 gives one finding for an unsafe path with several faults, naming the first fault found', () => {
    const plan = defaultPlan();
    expect(checkReply(plan, withText(plan, '/../etc\\CLAUDE.md', 'text'))).toEqual([
      'file path "/../etc\\CLAUDE.md" is unsafe: it must be relative',
    ]);
  });
});

describe('F-03 AC-019: text with a template or enabled-step marker', () => {
  it.each([
    ['{{', 'Intro {{ placeholder'],
    ['}}', 'closing }} only'],
    ['#enabled:', 'Intro\n#enabled: flow-a\n'],
    ['/enabled:', 'Intro\n/enabled: flow-a\n'],
  ])('F-03 AC-019 gives one finding that names the path when the text contains %s', (marker, text) => {
    const plan = defaultPlan();
    expect(checkReply(plan, withText(plan, SPECIFY_AGENT, text))).toEqual([
      `file "${SPECIFY_AGENT}" still contains "${marker}"`,
    ]);
  });

  it('F-03 AC-019 gives one finding that names both markers when the text contains both', () => {
    const plan = defaultPlan();
    expect(checkReply(plan, withText(plan, CLAUDE_MD, '{{ a }} and {{ b }}'))).toEqual([
      `file "${CLAUDE_MD}" still contains "{{", "}}"`,
    ]);
  });

  it.each([
    ['a single brace', 'a { b } c'],
    ['enabled without a marker prefix', 'enabled: true\nenabled: false'],
    ['a marker-like word with another prefix', '#disabled: flow-a\n'],
    ['a marker with a space before the colon', '#enabled : flow-a'],
  ])('F-03 AC-019 gives no findings for text with %s', (_label, text) => {
    const plan = defaultPlan();
    expect(checkReply(plan, withText(plan, SPECIFY_AGENT, text))).toEqual([]);
  });
});
