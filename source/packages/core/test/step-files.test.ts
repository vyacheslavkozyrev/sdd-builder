import { describe, expect, it } from 'vitest';
import { renderStepFiles, templateSourceFromRecord, TemplateError, type StepDefinition } from '../src/index.js';
import { baseConfig, workflow } from './fixtures.js';

const templates = templateSourceFromRecord({
  'steps/implement/agent.md': '# Implement\nWrite the task for {{projectName}}.',
  'steps/code-review/agent.md': '# Code review',
  'steps/unit-tests/script.md': '# Unit tests\n\nRun the unit checks.',
  'steps/commit/command.md': '# Commit',
  'steps/plan/command.md': '# Plan',
  'steps/define-feature/command.md': '# Define feature',
  'steps/refine/command.md': '# Refine',
  'steps/verify/agent.md': '# Verify',
  'steps/release/command.md': '# Release',
  'rules/code.md': '# Code rules',
  'rules/qa.md': '# QA rules',
});

function pathsOf(files: { path: string }[]): string[] {
  return files.map((f) => f.path).sort();
}

describe('F-02 T014 step files', () => {
  it('F-02 AC-020 each enabled step writes the file its kind requires, and no others', () => {
    const files = renderStepFiles(baseConfig(), templates);
    const steps = pathsOf(files).filter((p) => !p.startsWith('.claude/rules/'));
    expect(steps).toEqual(
      expect.arrayContaining([
        '.claude/agents/implement.md',
        '.claude/agents/code-review.md',
        'scripts/unit-tests.sh',
        '.claude/commands/commit.md',
      ]),
    );
    expect(steps).not.toContain('scripts/e2e-tests.sh');
  });

  it('F-03 AC-008 a script step is rendered from its script.md layout to scripts/<id>.sh', () => {
    const file = renderStepFiles(baseConfig(), templates).find((f) => f.path === 'scripts/unit-tests.sh');
    expect(file?.content).toBe('# Unit tests\n\nRun the unit checks.');
  });

  it('F-02 AC-020 a skill step writes .claude/skills/<id>/SKILL.md, from a custom body', () => {
    const skill: StepDefinition = { id: 'scan', name: 'Scan', summary: '', kind: 'skill', origin: 'custom', required: false, consumes: [], produces: [], ruleTags: [], body: 'Scan the repo.' };
    const config = baseConfig({ customSteps: [skill], workflows: [...baseConfig().workflows, workflow('security', { steps: [{ stepId: 'scan', enabled: true }] })] });
    const file = renderStepFiles(config, templates).find((f) => f.path === '.claude/skills/scan/SKILL.md');
    expect(file?.content).toBe('Scan the repo.');
  });

  it('F-02 AC-021 a rule-set tag lists the rule file in the step and writes the rule file', () => {
    const files = renderStepFiles(baseConfig(), templates);
    const implement = files.find((f) => f.path === '.claude/agents/implement.md');
    expect(implement?.content).toContain('## Context rules\n- .claude/rules/code.md\n- .claude/rules/qa.md');
    expect(files.map((f) => f.path)).toEqual(expect.arrayContaining(['.claude/rules/code.md', '.claude/rules/qa.md']));
  });

  it('F-02 AC-021 a rule file missing from the templates is refused, naming the step and the rule', () => {
    const partial = templateSourceFromRecord({ ...Object.fromEntries(['steps/implement/agent.md', 'steps/code-review/agent.md', 'steps/unit-tests/script.md', 'steps/commit/command.md', 'steps/plan/command.md', 'steps/define-feature/command.md', 'steps/refine/command.md', 'steps/verify/agent.md', 'steps/release/command.md', 'rules/qa.md'].map((p) => [p, templates.get(p) ?? ''])) });
    expect(() => renderStepFiles(baseConfig(), partial)).toThrow(TemplateError);
    expect(() => renderStepFiles(baseConfig(), partial)).toThrow('steps/implement: rule file "code.md" is not in the templates');
  });

  it('F-02 AC-022 a step used in two workflows yields one file', () => {
    const config = baseConfig({ workflows: [...baseConfig().workflows, workflow('extra', { steps: [{ stepId: 'commit', enabled: true }] })] });
    const commits = renderStepFiles(config, templates).filter((f) => f.path === '.claude/commands/commit.md');
    expect(commits).toHaveLength(1);
  });

  it('F-02 AC-023 an enabled step with no template is refused, naming the step and the path', () => {
    const missing = templateSourceFromRecord({});
    expect(() => renderStepFiles(baseConfig(), missing)).toThrow('steps/define-feature/command.md: missing template for step "define-feature"');
  });
});
