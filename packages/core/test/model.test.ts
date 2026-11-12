import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Condition, ProjectConfig, StepDefinition, Workflow } from '../src/index.js';

describe('F-02 T002 model', () => {
  it('describes a workflow with ordered steps, a gate and a branch route', () => {
    const step: StepDefinition = {
      id: 'implement',
      name: 'Implement',
      summary: 'Write one task and its tests.',
      kind: 'agent',
      origin: 'catalog',
      required: true,
      consumes: ['plan.md'],
      produces: ['code'],
      ruleTags: ['typescript.md'],
    };
    const review: Condition = {
      id: 'review-clean',
      afterStepId: 'review',
      gate: { id: 'review', type: 'review', required: true },
      pass: { kind: 'next' },
      fail: { kind: 'step', stepId: 'implement' },
      roundLimit: 2,
    };
    const workflow: Workflow = {
      id: 'implement',
      name: 'Implement',
      scope: 'task',
      iterationSource: 'plan.md',
      enabled: true,
      steps: [{ stepId: 'implement', enabled: true }, { stepId: 'review', enabled: true }],
      conditions: [review],
    };
    const config: ProjectConfig = {
      schemaVersion: 1,
      name: 'Demo',
      idea: 'A demo project.',
      stack: { language: 'TypeScript' },
      architecture: { style: 'layered', modules: [] },
      codeRules: [],
      testRules: [],
      customSteps: [],
      workflows: [workflow],
      connections: [],
      targets: ['claude'],
    };

    expect(config.workflows[0]?.steps.map((s) => s.stepId)).toEqual(['implement', 'review']);
    expectTypeOf(review.fail).toEqualTypeOf<Condition['fail']>();
  });

  it('keeps a condition without a fail route representable, so validation can refuse it', () => {
    const unwired: Condition = {
      id: 'checks',
      afterStepId: 'test',
      gate: { id: 'checks', type: 'checks', required: true },
      pass: { kind: 'next' },
      fail: undefined,
    };
    expect(unwired.fail).toBeUndefined();
  });
});
