import { describe, expect, it } from 'vitest';
import {
  retryFindings,
  type AnalysisFinding,
  type Condition,
  type ProjectConfig,
  type RouteTarget,
  type Workflow,
  type WorkflowStep,
} from '../src/index.js';
import { baseConfig, workflow } from './fixtures.js';

const on = (stepId: string): WorkflowStep => ({ stepId, enabled: true });
const off = (stepId: string): WorkflowStep => ({ stepId, enabled: false });

/** A quality check after `afterStepId`; `roundLimit` is set only when given, so the field stays absent otherwise. */
function condition(id: string, afterStepId: string, fail: RouteTarget | undefined, roundLimit?: number): Condition {
  return {
    id,
    enabled: true,
    afterStepId,
    gate: { id: `${id}-gate`, type: 'checks', required: false },
    pass: { kind: 'next' },
    fail,
    ...(roundLimit === undefined ? {} : { roundLimit }),
  };
}

const retry = (stepId: string): RouteTarget => ({ kind: 'step', stepId });

/** A workflow of two enabled steps, `verify` then `implement`, with the given conditions. */
function flow(id: string, conditions: Condition[], overrides: Partial<Workflow> = {}): Workflow {
  return workflow(id, { steps: [on('implement'), on('verify')], conditions, ...overrides });
}

function configWith(workflows: Workflow[]): ProjectConfig {
  return baseConfig({ workflows, connections: [] });
}

/** The finding AC-005 gives for a retry with no round limit. */
function unlimited(workflowId: string, conditionId: string, stepId: string): AnalysisFinding {
  return {
    severity: 'warning',
    subject: `workflow "${workflowId}" condition "${conditionId}"`,
    message: `condition "${conditionId}" in workflow "${workflowId}" retries to "${stepId}" with no round limit (no limit set)`,
  };
}

const rows: { name: string; config: ProjectConfig; expected: AnalysisFinding[] }[] = [
  {
    name: 'a retry with no round limit gives one warning naming the condition and "no limit set"',
    config: configWith([flow('w', [condition('tests-pass', 'verify', retry('implement'))])]),
    expected: [unlimited('w', 'tests-pass', 'implement')],
  },
  {
    name: 'a retry with a round limit gives none',
    config: configWith([flow('w', [condition('tests-pass', 'verify', retry('implement'), 3)])]),
    expected: [],
  },
  {
    name: 'a fail route to next gives none',
    config: configWith([flow('w', [condition('tests-pass', 'verify', { kind: 'next' })])]),
    expected: [],
  },
  {
    name: 'a fail route to stop gives none (a quality gate, not a retry)',
    config: configWith([flow('w', [condition('tests-pass', 'verify', { kind: 'stop' })])]),
    expected: [],
  },
  {
    name: 'a fail route to a later step is not a retry and gives none',
    config: configWith([flow('w', [condition('tests-pass', 'implement', retry('verify'))])]),
    expected: [],
  },
  {
    name: 'a fail route to the step the condition follows is not a retry and gives none',
    config: configWith([flow('w', [condition('tests-pass', 'verify', retry('verify'))])]),
    expected: [],
  },
  {
    name: 'a condition after a step the workflow does not hold gives none (refusals report it)',
    config: configWith([flow('w', [condition('tests-pass', 'missing', retry('implement'))])]),
    expected: [],
  },
  {
    name: 'a condition with no fail route is not a retry and gives none',
    config: configWith([flow('w', [condition('tests-pass', 'verify', undefined)])]),
    expected: [],
  },
  {
    name: 'a retry on a condition after a disabled step is not checked',
    config: configWith([flow('w', [condition('tests-pass', 'verify', retry('implement'))], { steps: [on('implement'), off('verify')] })]),
    expected: [],
  },
  {
    name: 'a retry in a disabled workflow is not checked',
    config: configWith([flow('w', [condition('tests-pass', 'verify', retry('implement'))], { enabled: false })]),
    expected: [],
  },
  {
    name: 'a disabled workflow does not hide a retry in an enabled one',
    config: configWith([
      flow('off', [condition('a', 'verify', retry('implement'))], { enabled: false }),
      flow('on', [condition('b', 'verify', retry('implement'))]),
    ]),
    expected: [unlimited('on', 'b', 'implement')],
  },
];

describe('F-04 T006 retries', () => {
  it.each(rows)('F-04 AC-005 $name', ({ config, expected }) => {
    expect(retryFindings(config)).toEqual(expected);
  });

  it('F-04 AC-005 gives one finding per retry, in workflow and condition list order', () => {
    const config = configWith([
      flow('w1', [
        condition('first', 'verify', retry('implement')),
        condition('gate', 'verify', { kind: 'stop' }),
        condition('second', 'verify', retry('implement')),
      ]),
      flow('w2', [condition('third', 'verify', retry('implement'))]),
    ]);
    expect(retryFindings(config)).toEqual([
      unlimited('w1', 'first', 'implement'),
      unlimited('w1', 'second', 'implement'),
      unlimited('w2', 'third', 'implement'),
    ]);
  });

  it('F-04 AC-005 gives the same findings on every call for the same configuration', () => {
    const config = configWith([flow('w', [condition('tests-pass', 'verify', retry('implement'))])]);
    const first = retryFindings(config);
    expect(retryFindings(config)).toEqual(first);
    expect(first).toHaveLength(1);
  });
});
