// F-03 AC-020, AC-021: checkReply against the plan from the real planGeneration with the default config and the real
// templates. Text that holds the `##` headings of its layout gives no finding, and a missing heading gives one finding that
// names the heading and the path. Text that mentions SDDBuilder's own paths gives one finding that names the path. A heading
// is matched by its exact text (trimmed); only the heading lines are checked, not their bodies.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { checkReply, planGeneration, type PipelinePlanEntry } from '../src/pipeline/index.js';
import { templateSourceFromRecord } from '../src/template-source.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
const TEMPLATES = join(REPO_ROOT, 'templates');
const SPECIFY_AGENT = '.claude/agents/specify.md';
const FLOW_COMMAND = '.claude/commands/specify.md';
const CLAUDE_MD = 'CLAUDE.md';
const PROCESS_MD = 'spec/documents/process.md';

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

/** The `##` heading texts of a planned file's layout, in layout order. */
function headingsOf(layout: string): string[] {
  return layout
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.slice(3).trim());
}

/** The layout of the planned file at the given path. */
function layoutOf(plan: readonly PipelinePlanEntry[], path: string): string {
  const entry = plan.find((planned) => planned.path === path);
  if (entry === undefined) throw new Error(`no planned file at ${path}`);
  return entry.layout;
}

/** Text that holds exactly the given headings, each on its own line, with no body under them. */
function headingsText(headings: readonly string[]): string {
  return `${headings.map((heading) => `## ${heading}`).join('\n\n')}\n`;
}

/** A reply that maps every planned path to text holding exactly the `##` headings of its layout. */
function headingsReply(plan: readonly PipelinePlanEntry[]): Record<string, unknown> {
  return Object.fromEntries(plan.map((entry) => [entry.path, headingsText(headingsOf(entry.layout))]));
}

/** A reply with the given path's text replaced. */
function withText(plan: readonly PipelinePlanEntry[], path: string, text: unknown): Record<string, unknown> {
  return { ...headingsReply(plan), [path]: text };
}

describe('F-03 AC-020: a required ## heading missing from the text', () => {
  it('F-03 AC-020 gives no findings when the text holds exactly the layout headings of every planned file', () => {
    const plan = defaultPlan();
    expect(checkReply(plan, headingsReply(plan))).toEqual([]);
  });

  it('F-03 AC-020 gives no findings when the headings have no body under them', () => {
    const plan = defaultPlan();
    expect(checkReply(plan, withText(plan, SPECIFY_AGENT, headingsText(headingsOf(layoutOf(plan, SPECIFY_AGENT)))))).toEqual(
      [],
    );
  });

  it('F-03 AC-020 lists the real agent layout headings: Purpose, Inputs, Outputs, Rules and Checks', () => {
    const plan = defaultPlan();
    expect(headingsOf(layoutOf(plan, SPECIFY_AGENT))).toEqual(['Purpose', 'Inputs', 'Outputs', 'Rules', 'Checks']);
  });

  it.each([
    [SPECIFY_AGENT, 'Checks'],
    [SPECIFY_AGENT, 'Purpose'],
    [FLOW_COMMAND, 'Steps'],
    [CLAUDE_MD, 'Working rules'],
    [PROCESS_MD, 'Gates and checks'],
  ])('F-03 AC-020 gives one finding that names the heading and the path when %s lacks "## %s"', (path, heading) => {
    const plan = defaultPlan();
    const headings = headingsOf(layoutOf(plan, path)).filter((name) => name !== heading);
    expect(headings.length).toBeLessThan(headingsOf(layoutOf(plan, path)).length);
    expect(checkReply(plan, withText(plan, path, headingsText(headings)))).toEqual([
      `file "${path}" is missing the heading "## ${heading}"`,
    ]);
  });

  it('F-03 AC-020 gives one finding per missing heading when several are missing', () => {
    const plan = defaultPlan();
    expect(checkReply(plan, withText(plan, SPECIFY_AGENT, '## Purpose\n'))).toEqual([
      `file "${SPECIFY_AGENT}" is missing the heading "## Inputs"`,
      `file "${SPECIFY_AGENT}" is missing the heading "## Outputs"`,
      `file "${SPECIFY_AGENT}" is missing the heading "## Rules"`,
      `file "${SPECIFY_AGENT}" is missing the heading "## Checks"`,
    ]);
  });

  it('F-03 AC-020 gives one finding per missing heading for each planned file that lacks one, in plan order', () => {
    const plan = defaultPlan();
    const reply = { ...headingsReply(plan), [SPECIFY_AGENT]: '# nothing\n', [CLAUDE_MD]: 'text only\n' };
    const lacking = plan.filter((entry) => entry.path === SPECIFY_AGENT || entry.path === CLAUDE_MD);
    expect(checkReply(plan, reply)).toEqual(
      lacking.flatMap((entry) =>
        headingsOf(entry.layout).map((heading) => `file "${entry.path}" is missing the heading "## ${heading}"`),
      ),
    );
  });

  it.each([
    ['a different case', '## purpose\n'],
    ['a heading with other words', '## Purpose and scope\n'],
    ['a heading line with three hashes', '### Purpose\n'],
    ['a heading that is not at the start of its line', 'Text ## Purpose\n'],
    ['a heading with no space after the hashes', '##Purpose\n'],
  ])('F-03 AC-020 gives one finding for the Purpose heading when the text has %s and no exact heading', (_label, line) => {
    const plan = defaultPlan();
    const others = headingsOf(layoutOf(plan, SPECIFY_AGENT)).filter((name) => name !== 'Purpose');
    expect(checkReply(plan, withText(plan, SPECIFY_AGENT, `${line}${headingsText(others)}`))).toEqual([
      `file "${SPECIFY_AGENT}" is missing the heading "## Purpose"`,
    ]);
  });

  it.each([
    ['extra spaces after the hashes', '##   Purpose\n'],
    ['trailing spaces after the heading text', '## Purpose   \n'],
    ['a carriage return at the end of the line', '## Purpose\r\n'],
  ])('F-03 AC-020 gives no finding for the Purpose heading with %s, since the exact heading text is present', (_label, heading) => {
    const plan = defaultPlan();
    const headings = headingsOf(layoutOf(plan, SPECIFY_AGENT)).filter((name) => name !== 'Purpose');
    const text = `${heading}${headingsText(headings)}`;
    expect(checkReply(plan, withText(plan, SPECIFY_AGENT, text))).toEqual([]);
  });

  it('F-03 AC-020 gives a finding that names the heading when only a different case is present', () => {
    const plan = defaultPlan();
    const headings = headingsOf(layoutOf(plan, SPECIFY_AGENT)).filter((name) => name !== 'Checks');
    const text = `${headingsText(headings)}## checks\n`;
    expect(checkReply(plan, withText(plan, SPECIFY_AGENT, text))).toEqual([
      `file "${SPECIFY_AGENT}" is missing the heading "## Checks"`,
    ]);
  });
});

describe('F-03 AC-021: text that mentions SDDBuilder own paths', () => {
  it.each([
    ['SDDBuilder', 'Built with SDDBuilder.\n'],
    ['source/apps/web', 'See source/apps/web/src for the wizard.\n'],
    ['source/apps/api', 'The API lives in source/apps/api.\n'],
    ['source/packages/core', 'Logic in source/packages/core/src.\n'],
  ])('F-03 AC-021 gives one finding that names the path when the text mentions %s', (reference, body) => {
    const plan = defaultPlan();
    const text = `${headingsText(headingsOf(layoutOf(plan, CLAUDE_MD)))}${body}`;
    expect(checkReply(plan, withText(plan, CLAUDE_MD, text))).toEqual([
      `file "${CLAUDE_MD}" still refers to "${reference}"`,
    ]);
  });

  it('F-03 AC-021 gives one finding that names every reference when the text mentions several', () => {
    const plan = defaultPlan();
    const text = `${headingsText(headingsOf(layoutOf(plan, CLAUDE_MD)))}SDDBuilder and source/apps/web and source/apps/api.\n`;
    expect(checkReply(plan, withText(plan, CLAUDE_MD, text))).toEqual([
      `file "${CLAUDE_MD}" still refers to "SDDBuilder", "source/apps/web", "source/apps/api"`,
    ]);
  });

  it('F-03 AC-021 gives one finding that names the path when the reference is in a body, not a heading', () => {
    const plan = defaultPlan();
    expect(checkReply(plan, withText(plan, SPECIFY_AGENT, '## Purpose\n\nSDDBuilder runs this.\n'))).toEqual([
      ...headingsOf(layoutOf(plan, SPECIFY_AGENT))
        .filter((name) => name !== 'Purpose')
        .map((name) => `file "${SPECIFY_AGENT}" is missing the heading "## ${name}"`),
      `file "${SPECIFY_AGENT}" still refers to "SDDBuilder"`,
    ]);
  });

  it.each([
    ['a lowercase name', 'sddbuilder is not named here.\n'],
    ['a name with a space', 'SDD Builder is not named here.\n'],
    ['a plain source/apps path', 'The app is under source/apps.\n'],
    ['a different package', 'See source/packages/cli.\n'],
    ['a generic word', 'A spec-driven development process.\n'],
  ])('F-03 AC-021 gives no finding for text with %s', (_label, body) => {
    const plan = defaultPlan();
    const text = `${headingsText(headingsOf(layoutOf(plan, CLAUDE_MD)))}${body}`;
    expect(checkReply(plan, withText(plan, CLAUDE_MD, text))).toEqual([]);
  });

  it('F-03 AC-021 gives no finding for a generic reply that mentions no reference', () => {
    const plan = defaultPlan();
    expect(checkReply(plan, headingsReply(plan))).toEqual([]);
  });
});
