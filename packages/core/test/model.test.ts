import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  AnalysisFinding,
  AnalysisResult,
  AnalysisReview,
  Condition,
  ProjectConfig,
  StepDefinition,
  Workflow,
} from '../src/index.js';

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
      ruleTags: ['code.md'],
    };
    const review: Condition = {
      id: 'review-clean',
      enabled: true,
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

  it('F-03 T001 lets a workflow and a step omit their description, and keeps one when given', () => {
    const plain: StepDefinition = {
      id: 'review',
      name: 'Review',
      summary: 'Check the diff.',
      kind: 'agent',
      origin: 'catalog',
      required: true,
      consumes: [],
      produces: [],
      ruleTags: [],
    };
    const described: StepDefinition = { ...plain, id: 'review-2', description: 'Check the diff against the plan.' };
    const bareWorkflow: Workflow = {
      id: 'plan',
      name: 'Plan',
      scope: 'feature',
      iterationSource: 'features.md',
      enabled: true,
      steps: [],
      conditions: [],
    };
    const describedWorkflow: Workflow = { ...bareWorkflow, description: 'Plans each feature.' };

    expect('description' in plain).toBe(false);
    expect(described.description).toBe('Check the diff against the plan.');
    expect('description' in bareWorkflow).toBe(false);
    expect(describedWorkflow.description).toBe('Plans each feature.');
  });

  it('keeps a condition without a fail route representable, so validation can refuse it', () => {
    const unwired: Condition = {
      id: 'checks',
      enabled: true,
      afterStepId: 'test',
      gate: { id: 'checks', type: 'checks', required: true },
      pass: { kind: 'next' },
      fail: undefined,
    };
    expect(unwired.fail).toBeUndefined();
  });

});

describe('F-04 T002 analysis result shape', () => {
  it('F-04 T002 keeps structural findings and the LLM review as separate parts of the result', () => {
    const finding: AnalysisFinding = { severity: 'warning', subject: 'workflow "plan"', message: 'No steps.' };
    const review: AnalysisReview = { status: 'failed', findings: [], dropped: 2 };
    const result: AnalysisResult = { findings: [finding], review };

    expect(Object.keys(result).sort()).toEqual(['findings', 'review']);
    expect(Object.keys(review).sort()).toEqual(['dropped', 'findings', 'status']);
    expect(result.findings).toEqual([finding]);
    expect(result.review.dropped).toBe(2);
    expectTypeOf(result.review.status).toEqualTypeOf<'ok' | 'failed' | 'skipped'>();
    expectTypeOf(result.review.dropped).toEqualTypeOf<number>();
    expectTypeOf(result.review.findings).toEqualTypeOf<AnalysisFinding[]>();
    expectTypeOf<AnalysisResult>().toEqualTypeOf<{ findings: AnalysisFinding[]; review: AnalysisReview }>();
  });
});
