import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STEP_CATALOG,
  generate,
  GenerationError,
  InvalidConfigError,
  planGeneration,
  stepFilePath,
  type ProjectConfig,
  type StepDefinition,
  type TemplateSource,
} from '../src/index.js';
import { baseConfig, connection, workflow } from './fixtures.js';
import { fullTemplates } from './fixtures-templates.js';

/** The error an action throws. Fails the test when the action returns normally. */
function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('expected the action to throw');
}

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

  it('F-03 AC-018 a disabled step has no entry, and a required step always has one', () => {
    const withScan = (enabled: boolean): ProjectConfig =>
      baseConfig({
        customSteps: [scan],
        workflows: [...baseConfig().workflows, workflow('security', { steps: [{ stepId: 'scan', enabled }] })],
      });
    const withE2e = (enabled: boolean): ProjectConfig =>
      baseConfig({
        workflows: baseConfig().workflows.map((w) =>
          w.id === 'implement-cycle' ? { ...w, steps: w.steps.map((s) => (s.stepId === 'e2e-tests' ? { ...s, enabled } : s)) } : w,
        ),
      });
    const pathsOf = (config: ProjectConfig): string[] => planGeneration(config, fullTemplates()).map((entry) => entry.path);

    // Positive controls: enabled, the same steps do get entries, so the paths below are not vacuous.
    expect(pathsOf(withScan(true))).toContain('.claude/skills/scan/SKILL.md');
    expect(pathsOf(withE2e(true))).toContain('scripts/e2e-tests.sh');

    // Disabled: no entry for the custom scan step or the catalog e2e-tests step.
    const paths = pathsOf(withScan(false));
    expect(paths).not.toContain('.claude/skills/scan/SKILL.md');
    expect(pathsOf(withE2e(false))).not.toContain('scripts/e2e-tests.sh');

    // Required: every required catalog step has an entry in the default configuration.
    const required = DEFAULT_STEP_CATALOG.filter((step) => step.required);
    expect(required.length).toBeGreaterThan(0);
    for (const step of required) {
      expect(paths).toContain(stepFilePath(step));
    }
  });

  it('F-03 AC-018 a required step cannot be disabled, so the planner never omits it', () => {
    const workflows = baseConfig().workflows.map((w) =>
      w.id === 'specify' ? { ...w, steps: w.steps.map((s) => (s.stepId === 'plan' ? { ...s, enabled: false } : s)) } : w,
    );
    const error = captureError(() => planGeneration(baseConfig({ workflows }), fullTemplates()));
    expect(error).toBeInstanceOf(InvalidConfigError);
    expect(error).toMatchObject({ problems: ['workflow "specify": required step "plan" is disabled'] });
  });

  it('F-03 AC-019 an invalid configuration throws InvalidConfigError naming the problem, and returns no plan', () => {
    const config = baseConfig({ connections: [...baseConfig().connections, connection('specify', 'nowhere')] });
    const error = captureError(() => planGeneration(config, fullTemplates()));
    expect(error).toBeInstanceOf(InvalidConfigError);
    expect(error).toMatchObject({ problems: ['connection "specify-nowhere": unknown workflow "nowhere"'] });
  });

  it('F-03 AC-020 an enabled step with no layout in the templates fails with an error that names the step id', () => {
    const templates = fullTemplates();
    const withoutPlanLayout: TemplateSource = {
      get: (path: string) => (path === 'steps/plan/command.md' ? undefined : templates.get(path)),
    };
    const error = captureError(() => planGeneration(baseConfig(), withoutPlanLayout));
    expect(error).toBeInstanceOf(GenerationError);
    expect(error).toMatchObject({ problems: ['steps/plan/command.md: missing template for step "plan"'] });
  });
});
