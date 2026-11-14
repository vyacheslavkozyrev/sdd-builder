import { describe, expect, it } from 'vitest';
import type { Condition, Gate, RouteTarget, Workflow, WorkflowStep } from '@sddbuilder/core';
import { addStep, moveStep, removeStep, setStepEnabled } from '../src/builder/step-state.js';
import type { EditResult, MapState } from '../src/builder/map-state.js';

/** Unwraps a successful edit; fails the test with the refusal message otherwise. */
function applied(result: EditResult): MapState {
  if (!result.ok) {
    throw new Error(`expected the edit to apply, got refusal: ${result.message}`);
  }
  return result.state;
}

function refusedWith(result: EditResult): string {
  if (result.ok) {
    throw new Error('expected the edit to be refused');
  }
  return result.message;
}

function gate(id: string): Gate {
  return { id, type: 'checks', required: true };
}

function condition(id: string, afterStepId: string, pass: RouteTarget, fail: RouteTarget | undefined): Condition {
  return { id, enabled: true, afterStepId, gate: gate(id), pass, fail };
}

function step(stepId: string, enabled = true): WorkflowStep {
  return { stepId, enabled };
}

/** A one-workflow state. Catalog steps: plan, implement, code-review, commit are required; e2e-tests and release are not. */
function stateOf(steps: WorkflowStep[], conditions: Condition[] = []): MapState {
  const workflow: Workflow = {
    id: 'impl',
    name: 'Implement',
    scope: 'task',
    iterationSource: 'plan.md',
    enabled: true,
    steps,
    conditions,
  };
  return { workflows: [workflow], connections: [] };
}

function stepIds(state: MapState, workflowId = 'impl'): string[] {
  const workflow = state.workflows.find((w) => w.id === workflowId);
  if (!workflow) {
    throw new Error(`no workflow ${workflowId}`);
  }
  return workflow.steps.map((s) => s.stepId);
}

function workflowOf(state: MapState, workflowId = 'impl'): Workflow {
  const workflow = state.workflows.find((w) => w.id === workflowId);
  if (!workflow) {
    throw new Error(`no workflow ${workflowId}`);
  }
  return workflow;
}

describe('F-06 AC-021 add a catalog step', () => {
  it('F-06 AC-021 appends the added step at the end of the list, enabled', () => {
    const state = stateOf([step('plan'), step('implement')]);
    const next = applied(addStep(state, 'impl', 'release'));
    expect(workflowOf(next).steps).toEqual([step('plan'), step('implement'), step('release', true)]);
  });

  it('F-06 AC-021 adds to an empty workflow as the only step, enabled', () => {
    const next = applied(addStep(stateOf([]), 'impl', 'e2e-tests'));
    expect(workflowOf(next).steps).toEqual([step('e2e-tests', true)]);
  });

  it('F-06 AC-021 leaves the caller state unchanged after a successful add', () => {
    const state = stateOf([step('plan')]);
    const before = structuredClone(state);
    applied(addStep(state, 'impl', 'release'));
    expect(state).toEqual(before);
  });
});

describe('F-06 AC-022 refuse a step the workflow already has', () => {
  it('F-06 AC-022 refuses a step already in the list and does not change it', () => {
    const state = stateOf([step('plan'), step('implement')]);
    const before = structuredClone(state);
    const result = addStep(state, 'impl', 'plan');
    expect(refusedWith(result)).toContain('already');
    expect(state).toEqual(before);
  });

  it('F-06 AC-022 refuses a step that is in the list but switched off', () => {
    const state = stateOf([step('plan', false)]);
    const message = refusedWith(addStep(state, 'impl', 'plan'));
    expect(message).toContain('already');
    expect(stepIds(state)).toEqual(['plan']);
  });
});

describe('F-06 AC-023 move a step up or down', () => {
  const list = [step('plan'), step('implement'), step('code-review'), step('commit')];

  it.each([
    ['implement', 'up', ['implement', 'plan', 'code-review', 'commit']],
    ['implement', 'down', ['plan', 'code-review', 'implement', 'commit']],
    ['code-review', 'up', ['plan', 'code-review', 'implement', 'commit']],
    ['commit', 'up', ['plan', 'implement', 'commit', 'code-review']],
  ] as const)('F-06 AC-023 moves %s %s by swapping with its neighbour', (stepId, direction, expected) => {
    const next = moveStep(stateOf(list), 'impl', stepId, direction);
    expect(stepIds(next)).toEqual([...expected]);
  });

  it('F-06 AC-023 moving the first step up changes nothing', () => {
    const state = stateOf(list);
    const next = moveStep(state, 'impl', 'plan', 'up');
    expect(stepIds(next)).toEqual(['plan', 'implement', 'code-review', 'commit']);
    expect(next).toEqual(state);
  });

  it('F-06 AC-023 moving the last step down changes nothing', () => {
    const state = stateOf(list);
    const next = moveStep(state, 'impl', 'commit', 'down');
    expect(stepIds(next)).toEqual(['plan', 'implement', 'code-review', 'commit']);
    expect(next).toEqual(state);
  });

  it('F-06 AC-023 a single-step list does not move in either direction', () => {
    const state = stateOf([step('plan')]);
    expect(moveStep(state, 'impl', 'plan', 'up')).toEqual(state);
    expect(moveStep(state, 'impl', 'plan', 'down')).toEqual(state);
  });

  it('F-06 AC-023 moving keeps each step enabled flag with the step', () => {
    const state = stateOf([step('plan'), step('implement', false)]);
    const next = moveStep(state, 'impl', 'implement', 'up');
    expect(workflowOf(next).steps).toEqual([step('implement', false), step('plan')]);
  });
});

describe('F-06 AC-024 moving keeps conditions attached', () => {
  it('F-06 AC-024 a condition keeps its afterStepId when its step moves', () => {
    const gateAfterPlan = condition('approve-plan', 'plan', { kind: 'next' }, { kind: 'step', stepId: 'plan' });
    const gateAfterCommit = condition('commit-gate', 'commit', { kind: 'next' }, { kind: 'stop' });
    const state = stateOf([step('plan'), step('implement'), step('commit')], [gateAfterPlan, gateAfterCommit]);

    const moved = moveStep(state, 'impl', 'plan', 'down');
    const workflow = workflowOf(moved);
    expect(stepIds(moved)).toEqual(['implement', 'plan', 'commit']);
    expect(workflow.conditions).toEqual([gateAfterPlan, gateAfterCommit]);
    expect(workflow.conditions.map((c) => c.afterStepId)).toEqual(['plan', 'commit']);
  });
});

describe('F-06 AC-025 remove a non-required step', () => {
  it('F-06 AC-025 removes the step and the conditions placed after it, and keeps the others', () => {
    const afterE2e = condition('checks-e2e', 'e2e-tests', { kind: 'next' }, { kind: 'stop' });
    const afterPlan = condition('approve-plan', 'plan', { kind: 'next' }, { kind: 'stop' });
    const state = stateOf([step('plan'), step('e2e-tests'), step('commit')], [afterE2e, afterPlan]);

    const result = applied(removeStep(state, 'impl', 'e2e-tests'));
    const workflow = workflowOf(result);
    expect(stepIds(result)).toEqual(['plan', 'commit']);
    expect(workflow.conditions).toEqual([afterPlan]);
  });

  it('F-06 AC-025 removes a non-required step that has no conditions', () => {
    const result = applied(removeStep(stateOf([step('plan'), step('release')]), 'impl', 'release'));
    expect(stepIds(result)).toEqual(['plan']);
  });

  it('F-06 AC-025 a condition that routes back to the removed step is removed with it, not blocking', () => {
    const selfLoop = condition('checks-e2e', 'e2e-tests', { kind: 'next' }, { kind: 'step', stepId: 'e2e-tests' });
    const state = stateOf([step('plan'), step('e2e-tests')], [selfLoop]);

    const result = applied(removeStep(state, 'impl', 'e2e-tests'));
    expect(stepIds(result)).toEqual(['plan']);
    expect(workflowOf(result).conditions).toEqual([]);
  });

  it('F-06 AC-025 leaves the caller state unchanged after a successful removal', () => {
    const state = stateOf([step('plan'), step('release')]);
    const before = structuredClone(state);
    applied(removeStep(state, 'impl', 'release'));
    expect(state).toEqual(before);
  });
});

describe('F-06 AC-026 refuse removal of a step a route points to', () => {
  it('F-06 AC-026 refuses while a fail route points to the step, naming the route', () => {
    const branch = condition('checks-e2e', 'commit', { kind: 'next' }, { kind: 'step', stepId: 'e2e-tests' });
    const state = stateOf([step('plan'), step('e2e-tests'), step('commit')], [branch]);
    const before = structuredClone(state);

    const message = refusedWith(removeStep(state, 'impl', 'e2e-tests'));
    expect(message).toContain('checks-e2e');
    expect(message).toContain('fail');
    expect(state).toEqual(before);
  });

  it('F-06 AC-026 refuses while a pass route points to the step, naming the pass output', () => {
    const branch = condition('checks-e2e', 'plan', { kind: 'step', stepId: 'release' }, { kind: 'stop' });
    const state = stateOf([step('plan'), step('release')], [branch]);

    const message = refusedWith(removeStep(state, 'impl', 'release'));
    expect(message).toContain('pass');
    expect(message).toContain('checks-e2e');
    expect(stepIds(state)).toEqual(['plan', 'release']);
  });

  it('F-06 AC-026 refuses while a switched-off condition still routes to the step', () => {
    const branch = {
      ...condition('checks-e2e', 'plan', { kind: 'next' }, { kind: 'step', stepId: 'release' }),
      enabled: false,
    };
    const state = stateOf([step('plan'), step('release')], [branch]);
    expect(refusedWith(removeStep(state, 'impl', 'release'))).toContain('checks-e2e');
  });
});

describe('F-06 AC-027 required steps cannot be removed', () => {
  it.each(['define-feature', 'plan', 'implement', 'commit'])(
    'F-06 AC-027 refuses to remove the required step %s and leaves the state unchanged',
    (stepId) => {
      const state = stateOf([step('define-feature'), step('plan'), step('implement'), step('commit')]);
      const before = structuredClone(state);
      const message = refusedWith(removeStep(state, 'impl', stepId));
      expect(message).toContain('required');
      expect(state).toEqual(before);
    },
  );

  it('F-06 AC-027 refuses a required step even when conditions after it could be removed with it', () => {
    const afterPlan = condition('approve-plan', 'plan', { kind: 'next' }, { kind: 'stop' });
    const state = stateOf([step('plan')], [afterPlan]);
    expect(refusedWith(removeStep(state, 'impl', 'plan'))).toContain('required');
    expect(workflowOf(state).conditions).toEqual([afterPlan]);
  });
});

describe('F-06 AC-028 switch a step off and on', () => {
  it('F-06 AC-028 switching a step off keeps it in the list marked off', () => {
    const state = stateOf([step('plan'), step('e2e-tests'), step('commit')]);
    const next = setStepEnabled(state, 'impl', 'e2e-tests', false);
    expect(workflowOf(next).steps).toEqual([step('plan'), step('e2e-tests', false), step('commit')]);
  });

  it('F-06 AC-028 switching a step on again restores it at the same position', () => {
    const state = stateOf([step('plan'), step('e2e-tests'), step('commit')]);
    const off = setStepEnabled(state, 'impl', 'e2e-tests', false);
    const on = setStepEnabled(off, 'impl', 'e2e-tests', true);
    expect(stepIds(on)).toEqual(['plan', 'e2e-tests', 'commit']);
    expect(workflowOf(on).steps).toEqual(workflowOf(state).steps);
  });

  it('F-06 AC-028 switching a step off keeps its conditions', () => {
    const afterE2e = condition('checks-e2e', 'e2e-tests', { kind: 'next' }, { kind: 'stop' });
    const state = stateOf([step('plan'), step('e2e-tests')], [afterE2e]);
    const next = setStepEnabled(state, 'impl', 'e2e-tests', false);
    expect(workflowOf(next).conditions).toEqual([afterE2e]);
  });
});

describe('F-06 unknown ids in step edits', () => {
  const state = stateOf([step('plan'), step('commit')]);

  it('F-06 AC-021 throws for an unknown catalog step id on add', () => {
    expect(() => addStep(state, 'impl', 'no-such-step')).toThrow('Unknown catalog step id');
  });

  it('F-06 AC-021 throws for an unknown workflow id on add', () => {
    expect(() => addStep(state, 'missing', 'release')).toThrow('Unknown workflow id');
  });

  it('F-06 AC-023 throws for a step that is not in the workflow on move', () => {
    expect(() => moveStep(state, 'impl', 'release', 'up')).toThrow('Unknown step id in workflow impl');
  });

  it('F-06 AC-023 throws for an unknown direction on move', () => {
    expect(() => moveStep(state, 'impl', 'plan', 'sideways' as 'up')).toThrow('Unknown direction');
  });

  it('F-06 AC-025 throws for a step that is not in the workflow on remove', () => {
    expect(() => removeStep(state, 'impl', 'release')).toThrow('Unknown step id in workflow impl');
  });

  it('F-06 AC-028 throws for a step that is not in the workflow on switch', () => {
    expect(() => setStepEnabled(state, 'impl', 'release', false)).toThrow('Unknown step id in workflow impl');
  });

  it('F-06 AC-028 throws for an unknown workflow id on switch', () => {
    expect(() => setStepEnabled(state, 'missing', 'plan', false)).toThrow('Unknown workflow id');
  });
});
