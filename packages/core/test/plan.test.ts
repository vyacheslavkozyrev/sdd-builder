import { describe, expect, it } from 'vitest';
import { generate, InvalidConfigError, planGeneration, type StepDefinition } from '../src/index.js';
import { baseConfig, connection, workflow } from './fixtures.js';
import { fullTemplates } from './fixtures-templates.js';

// A custom step, because only a custom step can carry a description in a config:
// catalog steps are referenced by id, and the shared catalog has no description set.
const scan: StepDefinition = {
  id: 'scan',
  name: 'Scan',
  summary: '',
  kind: 'skill',
  origin: 'custom',
  required: false,
  consumes: [],
  produces: [],
  ruleTags: ['qa.md'],
  body: 'Scan the repo.',
  description: 'Scan the repository for risky code.',
};

describe('F-03 T011 planGeneration', () => {
  it('F-03 AC-016 one entry per output file, in the file-list order, with path, layout, description and ruleTags', () => {
    const config = baseConfig();
    const plan = planGeneration(config, fullTemplates());
    const { files } = generate(config, fullTemplates());

    expect(plan.map((entry) => entry.path)).toEqual(files.map((file) => file.path));
    expect(plan.map((entry) => entry.layout)).toEqual(files.map((file) => file.content));

    const implement = plan.find((entry) => entry.path === '.claude/agents/implement.md');
    expect(implement).toEqual({
      path: '.claude/agents/implement.md',
      layout: files.find((file) => file.path === '.claude/agents/implement.md')?.content,
      description: 'Write one task and its tests, run the checks, stage the change.',
      ruleTags: ['code.md', 'qa.md'],
    });

    const claude = plan.find((entry) => entry.path === 'CLAUDE.md');
    expect(claude).toEqual({ path: 'CLAUDE.md', layout: files.find((file) => file.path === 'CLAUDE.md')?.content, description: '', ruleTags: [] });

    const rule = plan.find((entry) => entry.path === '.claude/rules/code.md');
    expect(rule).toEqual({ path: '.claude/rules/code.md', layout: '# Code rules\n', description: '', ruleTags: [] });
  });

  it('F-03 AC-016 a step file carries its step\'s description, or the catalog summary when unset', () => {
    const config = baseConfig({
      customSteps: [scan],
      workflows: [...baseConfig().workflows, workflow('security', { steps: [{ stepId: 'scan', enabled: true }] })],
    });
    const plan = planGeneration(config, fullTemplates());

    const custom = plan.find((entry) => entry.path === '.claude/skills/scan/SKILL.md');
    expect(custom?.description).toBe('Scan the repository for risky code.');
    expect(custom?.ruleTags).toEqual(['qa.md']);

    const catalog = plan.find((entry) => entry.path === '.claude/commands/plan.md');
    expect(catalog?.description).toBe('Split the stories into ordered tasks, each with the criteria it covers.');
  });

  it('F-03 AC-016 a blank step description counts as unset and falls back to the summary', () => {
    const blank: StepDefinition = { ...scan, id: 'lint', description: '', summary: 'Lint the staged change.' };
    const config = baseConfig({
      customSteps: [blank],
      workflows: [...baseConfig().workflows, workflow('quality', { steps: [{ stepId: 'lint', enabled: true }] })],
    });
    const plan = planGeneration(config, fullTemplates());

    expect(plan.find((entry) => entry.path === '.claude/skills/lint/SKILL.md')?.description).toBe('Lint the staged change.');
  });

  it('F-03 AC-016 refuses an invalid configuration with the same error as generate', () => {
    const config = baseConfig({ connections: [...baseConfig().connections, connection('specify', 'nowhere')] });
    expect(() => planGeneration(config, fullTemplates())).toThrow(InvalidConfigError);
  });

  it('F-03 AC-016 a workflow command carries its workflow\'s description, or the empty string when unset', () => {
    const workflows = baseConfig().workflows.map((w) => (w.id === 'specify' ? { ...w, description: 'Turns an idea into an approved plan.' } : w));
    const plan = planGeneration(baseConfig({ workflows }), fullTemplates());

    expect(plan.find((entry) => entry.path === '.claude/commands/workflow-specify.md')?.description).toBe(
      'Turns an idea into an approved plan.',
    );
    expect(plan.find((entry) => entry.path === '.claude/commands/workflow-implement-cycle.md')?.description).toBe('');
  });

  it('F-03 AC-017 the same config gives the same plan (generate it twice and compare)', () => {
    const config = baseConfig({
      customSteps: [scan],
      workflows: [...baseConfig().workflows, workflow('security', { steps: [{ stepId: 'scan', enabled: true }] })],
    });
    const first = planGeneration(config, fullTemplates());
    const second = planGeneration(config, fullTemplates());
    expect(second).toEqual(first);
  });
});
