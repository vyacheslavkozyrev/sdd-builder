import { describe, expect, it } from 'vitest';
import type { ProjectConfig } from '@sddbuilder/core';
import { buildGenerationPrompt } from '../src/generate/prompt.js';

const IDEA = 'A tool that turns a product idea into a spec-driven project framework.';

function sampleConfig(): ProjectConfig {
  return {
    schemaVersion: 1,
    name: 'Sample Project',
    idea: IDEA,
    stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
    architecture: {
      style: 'layered',
      modules: [{ name: 'core', layer: 0, responsibility: 'Domain rules', dependsOn: [] }],
      notes: 'Core has no I/O.',
    },
    codeRules: ['Validate input at the boundary.'],
    testRules: ['Use Vitest for unit tests.'],
    customSteps: [],
    workflows: [
      {
        id: 'implement-cycle',
        name: 'Implement',
        scope: 'task',
        iterationSource: 'plan.md',
        enabled: true,
        steps: [
          { stepId: 'implement', enabled: true },
          { stepId: 'unit-tests', enabled: true },
        ],
        conditions: [
          {
            id: 'tests-pass',
            enabled: true,
            afterStepId: 'unit-tests',
            gate: { id: 'tests-pass', type: 'checks', required: true },
            pass: { kind: 'next' },
            fail: { kind: 'step', stepId: 'implement' },
            roundLimit: 3,
          },
        ],
      },
    ],
    connections: [{ id: 'c1', from: 'specify', to: 'implement-cycle', artifact: 'plan.md' }],
    targets: ['claude'],
  };
}

function withFirstWorkflow(
  config: ProjectConfig,
  change: (workflow: ProjectConfig['workflows'][number]) => ProjectConfig['workflows'][number],
): ProjectConfig {
  return { ...config, workflows: config.workflows.map(change) };
}

describe('F-07 AC-008 generation prompt brief', () => {
  it('F-07 AC-008 leaves out a field of the config that is not part of the brief and process', () => {
    const extra = { ...sampleConfig(), serverNote: 'internal-only-value' } as ProjectConfig;

    const prompt = buildGenerationPrompt(extra, []);

    expect(prompt).not.toContain('internal-only-value');
    expect(prompt).not.toContain('serverNote');
  });

  it('F-07 AC-008 leaves out a switched-off condition', () => {
    const base = sampleConfig();
    const withOff = withFirstWorkflow(base, (workflow) => ({
      ...workflow,
      conditions: [
        ...workflow.conditions,
        {
          id: 'switched-off',
          enabled: false,
          afterStepId: 'unit-tests',
          gate: { id: 'g', type: 'checks', required: false },
          pass: { kind: 'next' },
          fail: undefined,
          roundLimit: 1,
        },
      ],
    }));

    const prompt = buildGenerationPrompt(withOff, []);

    expect(prompt).not.toContain('switched-off');
    expect(prompt).toBe(buildGenerationPrompt(base, []));
  });

  it('F-07 AC-008 writes a condition with its gate and its step route', () => {
    const prompt = buildGenerationPrompt(sampleConfig(), []);

    expect(prompt).toContain('"tests-pass"');
    expect(prompt).toContain('"kind": "step"');
    expect(prompt).toContain('"stepId": "implement"');
    expect(prompt).toContain('"roundLimit": 3');
  });

  it('F-07 AC-008 includes the workflow description only when the user wrote one', () => {
    const described = withFirstWorkflow(sampleConfig(), (workflow) => ({
      ...workflow,
      description: 'Runs one task at a time.',
    }));

    expect(buildGenerationPrompt(described, [])).toContain('Runs one task at a time.');
    expect(buildGenerationPrompt(sampleConfig(), [])).not.toContain('"description"');
  });

  it('F-07 AC-008 writes the gate of a connection that has one', () => {
    const base = sampleConfig();
    const gated = {
      ...base,
      connections: [
        {
          id: 'c1',
          from: 'specify',
          to: 'implement-cycle',
          artifact: 'plan.md',
          gate: { id: 'review-pass', type: 'review', required: true },
        },
      ],
    } as ProjectConfig;

    expect(buildGenerationPrompt(gated, [])).toContain('"id": "review-pass"');
    expect(buildGenerationPrompt(base, [])).not.toContain('"review-pass"');
  });
});
