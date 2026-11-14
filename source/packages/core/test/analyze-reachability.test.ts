import { describe, expect, it } from 'vitest';
import {
  reachabilityFindings,
  type AnalysisFinding,
  type Condition,
  type Gate,
  type ProjectConfig,
  type RouteTarget,
  type Workflow,
  type WorkflowStep,
} from '../src/index.js';
import { baseConfig, workflow } from './fixtures.js';

const on = (stepId: string): WorkflowStep => ({ stepId, enabled: true });
const off = (stepId: string): WorkflowStep => ({ stepId, enabled: false });
const NEXT: RouteTarget = { kind: 'next' };
const STOP: RouteTarget = { kind: 'stop' };
const to = (stepId: string): RouteTarget => ({ kind: 'step', stepId });

const gate = (id: string): Gate => ({ id, type: 'checks', required: false });

function cond(id: string, afterStepId: string, pass: RouteTarget, fail: RouteTarget | undefined): Condition {
  return { id, enabled: true, afterStepId, gate: gate(id), pass, fail };
}

function flow(id: string, steps: WorkflowStep[], conditions: Condition[] = [], enabled = true): Workflow {
  return workflow(id, { steps, conditions, enabled });
}

function configWith(...workflows: Workflow[]): ProjectConfig {
  return baseConfig({ workflows, connections: [] });
}

/** The finding AC-003 gives for a step no route reaches. */
function unreachable(workflowId: string, stepId: string): AnalysisFinding {
  return {
    severity: 'blocker',
    subject: `workflow "${workflowId}" step "${stepId}"`,
    message: `step "${stepId}" in workflow "${workflowId}" is unreachable`,
  };
}

const rows: { ac: 'AC-003' | 'AC-006'; name: string; workflows: Workflow[]; expected: AnalysisFinding[] }[] = [
  {
    ac: 'AC-003',
    name: 'a linear workflow with every step reachable gives none',
    workflows: [flow('w', [on('specify'), on('plan'), on('commit')])],
    expected: [],
  },
  {
    ac: 'AC-003',
    name: 'a step after a stop route is unreachable',
    workflows: [flow('w', [on('specify'), on('verify'), on('commit')], [cond('c1', 'verify', STOP, STOP)])],
    expected: [unreachable('w', 'commit')],
  },
  {
    ac: 'AC-003',
    name: 'an unwired fail output has no target and does not stop the walk',
    workflows: [flow('w', [on('specify'), on('verify'), on('commit')], [cond('c1', 'verify', NEXT, undefined)])],
    expected: [],
  },
  {
    ac: 'AC-003',
    name: 'a step reached only by a backward retry is reachable',
    workflows: [
      flow(
        'w',
        [on('specify'), on('plan'), on('verify')],
        [cond('c0', 'specify', to('verify'), STOP), cond('c1', 'verify', NEXT, to('plan'))],
      ),
    ],
    expected: [],
  },
  {
    ac: 'AC-003',
    name: 'a step with no route to it, not even a retry, is unreachable',
    workflows: [
      flow(
        'w',
        [on('specify'), on('plan'), on('verify')],
        [cond('c0', 'specify', to('verify'), STOP), cond('c1', 'verify', NEXT, STOP)],
      ),
    ],
    expected: [unreachable('w', 'plan')],
  },
  {
    ac: 'AC-003',
    name: 'several unreachable steps are listed in step order',
    workflows: [flow('w', [on('specify'), on('plan'), on('verify'), on('commit')], [cond('c1', 'specify', STOP, STOP)])],
    expected: [unreachable('w', 'plan'), unreachable('w', 'verify'), unreachable('w', 'commit')],
  },
  {
    ac: 'AC-003',
    name: 'a route to a step not in the workflow reaches nothing',
    workflows: [flow('w', [on('specify'), on('plan')], [cond('c1', 'specify', to('ghost'), STOP)])],
    expected: [unreachable('w', 'plan')],
  },
  {
    ac: 'AC-003',
    name: 'a step id listed twice is reported once',
    workflows: [flow('w', [on('specify'), on('plan'), on('plan')], [cond('c1', 'specify', STOP, STOP)])],
    expected: [unreachable('w', 'plan')],
  },
  {
    ac: 'AC-003',
    name: 'a step id is reachable through a later occurrence of the same id',
    workflows: [
      flow('w', [on('specify'), on('plan'), on('verify'), on('plan')], [cond('c0', 'specify', to('verify'), STOP)]),
    ],
    expected: [],
  },
  {
    ac: 'AC-003',
    name: 'a disabled workflow is not checked',
    workflows: [flow('w', [on('specify'), on('verify'), on('commit')], [cond('c1', 'verify', STOP, STOP)], false)],
    expected: [],
  },
  {
    ac: 'AC-003',
    name: 'only enabled workflows are checked, in workflow order',
    workflows: [
      flow('v', [on('specify'), on('verify'), on('commit')], [cond('c1', 'verify', STOP, STOP)], false),
      flow('w', [on('specify'), on('verify'), on('commit')], [cond('c1', 'verify', STOP, STOP)]),
      flow('x', [on('specify'), on('plan')], [cond('c2', 'specify', STOP, STOP)]),
    ],
    expected: [unreachable('w', 'commit'), unreachable('x', 'plan')],
  },
  {
    ac: 'AC-006',
    name: 'a disabled step between enabled ones is not checked and is skipped by next',
    workflows: [flow('w', [on('specify'), off('plan'), on('commit')])],
    expected: [],
  },
  {
    ac: 'AC-006',
    name: 'a disabled step is not followed as a step route',
    workflows: [flow('w', [on('specify'), off('plan'), on('commit')], [cond('c1', 'specify', STOP, to('plan'))])],
    expected: [unreachable('w', 'commit')],
  },
  {
    ac: 'AC-006',
    name: 'a condition on a disabled step does not reach later steps',
    workflows: [
      flow(
        'w',
        [on('specify'), off('plan'), on('commit')],
        [cond('c0', 'specify', STOP, undefined), cond('c1', 'plan', to('commit'), undefined)],
      ),
    ],
    expected: [unreachable('w', 'commit')],
  },
  {
    ac: 'AC-006',
    name: 'the entry is the first enabled step, even after a disabled one',
    workflows: [flow('w', [off('plan'), on('specify'), on('commit')])],
    expected: [],
  },
  {
    ac: 'AC-006',
    name: 'a workflow with no enabled step gives none',
    workflows: [flow('w', [off('plan'), off('commit')])],
    expected: [],
  },
];

describe('F-04 T004 reachability', () => {
  it.each(rows)('F-04 $ac $name', ({ workflows, expected }) => {
    expect(reachabilityFindings(configWith(...workflows))).toEqual(expected);
  });

  it('F-04 AC-003 gives the same findings in the same order on every call', () => {
    const config = configWith(
      flow('w', [on('specify'), on('plan'), on('verify')], [cond('c1', 'specify', STOP, STOP)]),
      flow('x', [on('specify'), on('commit')], [cond('c2', 'specify', STOP, STOP)]),
    );
    const first = reachabilityFindings(config);
    expect(first).toEqual([unreachable('w', 'plan'), unreachable('w', 'verify'), unreachable('x', 'commit')]);
    expect(reachabilityFindings(config)).toEqual(first);
  });

  it('F-06 AC-029 a switched-off condition is not a route, so the steps after its step stay reachable', () => {
    // With the condition on, its pass route stops the process and nothing after `specify` is reached.
    const disabled = { ...cond('c1', 'specify', STOP, undefined), enabled: false };
    const config = configWith(flow('w', [on('specify'), on('plan'), on('verify')], [disabled]));
    expect(reachabilityFindings(config)).toEqual([]);
  });

  it('F-06 AC-029 a switched-on condition with the same routes still cuts the process off', () => {
    const enabled = cond('c1', 'specify', STOP, undefined);
    const config = configWith(flow('w', [on('specify'), on('plan'), on('verify')], [enabled]));
    expect(reachabilityFindings(config)).toEqual([unreachable('w', 'plan'), unreachable('w', 'verify')]);
  });
});
