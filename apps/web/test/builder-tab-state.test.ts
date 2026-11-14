import { describe, expect, it } from 'vitest';
import type { Condition, Gate, RouteTarget, Workflow } from '@sddbuilder/core';
import { addTab, setConditionEnabled, tabsFor } from '../src/builder/tab-state.js';
import { startState } from '../src/builder/map-state.js';
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

function gate(id: string, required: boolean): Gate {
  return { id, type: 'checks', required };
}

function condition(
  id: string,
  required: boolean,
  fail: RouteTarget | undefined,
  extra: Partial<Condition> = {},
): Condition {
  return { id, enabled: true, afterStepId: 'implement', gate: gate(id, required), pass: { kind: 'next' }, fail, ...extra };
}

function workflow(id: string, conditions: Condition[]): Workflow {
  return {
    id,
    name: id,
    scope: 'task',
    iterationSource: 'plan.md',
    enabled: true,
    steps: [{ stepId: 'implement', enabled: true }],
    conditions,
  };
}

function stateOf(...workflows: Workflow[]): MapState {
  return { workflows, connections: [] };
}

function conditionOf(state: MapState, workflowId: string, conditionId: string): Condition {
  const found = state.workflows.find((w) => w.id === workflowId)?.conditions.find((c) => c.id === conditionId);
  if (!found) {
    throw new Error(`no condition ${conditionId} in ${workflowId}`);
  }
  return found;
}

describe('F-06 AC-020 tabs', () => {
  it('F-06 AC-020 gives exactly one tab per workflow, in map order', () => {
    const state = startState();
    const tabs = tabsFor(state.workflows);
    expect(tabs.map((t) => t.id)).toEqual(state.workflows.map((w) => w.id));
    expect(tabs).toHaveLength(state.workflows.length);
    expect(tabs[0]).toEqual({
      id: state.workflows[0]?.id,
      name: state.workflows[0]?.name,
      scope: state.workflows[0]?.scope,
    });
  });

  it('F-06 AC-020 gives no tabs for a map with no workflows', () => {
    expect(tabsFor([])).toEqual([]);
  });

  it('F-06 AC-020 adding a tab creates a workflow with no steps and one more tab', () => {
    const before = stateOf();
    const after = applied(addTab(before, 'Review', 'feature'));
    expect(after.workflows).toHaveLength(1);
    const created = after.workflows[0];
    expect(created).toMatchObject({ name: 'Review', scope: 'feature', steps: [], conditions: [], enabled: true });
    expect(tabsFor(after.workflows).map((t) => t.name)).toEqual(['Review']);
  });

  it('F-06 AC-020 refuses a blank tab name and leaves the tabs unchanged', () => {
    const before = startState();
    const message = refusedWith(addTab(before, '   ', 'task'));
    expect(message).toMatch(/name/);
    expect(before).toEqual(startState());
  });

  it('F-06 AC-020 refuses a tab name that duplicates an existing tab, ignoring case', () => {
    const state = stateOf(workflow('impl', []));
    expect(refusedWith(addTab(state, 'IMPL', 'task'))).toMatch(/already exists/);
    expect(state).toEqual(stateOf(workflow('impl', [])));
  });

  it('F-06 AC-020 throws for an unknown scope, as addWorkflow does', () => {
    expect(() => addTab(stateOf(), 'Review', 'epic' as never)).toThrow('Unknown scope: epic');
  });
});

describe('F-06 AC-029 switching gates and branch routes', () => {
  it('F-06 AC-029 switches a non-required gate off and sets enabled to false', () => {
    const state = stateOf(workflow('impl', [condition('lint', false, { kind: 'stop' })]));
    const after = applied(setConditionEnabled(state, 'impl', 'lint', false));
    expect(conditionOf(after, 'impl', 'lint').enabled).toBe(false);
  });

  it('F-06 AC-029 switches a branch route off and back on', () => {
    const state = stateOf(
      workflow('impl', [condition('retry', false, { kind: 'step', stepId: 'implement' })]),
    );
    const off = applied(setConditionEnabled(state, 'impl', 'retry', false));
    expect(conditionOf(off, 'impl', 'retry').enabled).toBe(false);
    const on = applied(setConditionEnabled(off, 'impl', 'retry', true));
    expect(conditionOf(on, 'impl', 'retry').enabled).toBe(true);
  });

  it('F-06 AC-029 switching on a condition that is already on keeps the state equal', () => {
    const state = stateOf(workflow('impl', [condition('lint', false, { kind: 'stop' })]));
    const after = applied(setConditionEnabled(state, 'impl', 'lint', true));
    expect(after).toEqual(state);
  });

  it('F-06 AC-029 leaves the input state unchanged after a switch', () => {
    const state = stateOf(workflow('impl', [condition('lint', false, { kind: 'stop' })]));
    applied(setConditionEnabled(state, 'impl', 'lint', false));
    expect(conditionOf(state, 'impl', 'lint').enabled).toBe(true);
  });

  it('F-06 AC-029 only changes the named condition in the named workflow', () => {
    const state = stateOf(
      workflow('impl', [condition('lint', false, { kind: 'stop' }), condition('types', false, { kind: 'stop' })]),
      workflow('plan', [condition('lint', false, { kind: 'stop' })]),
    );
    const after = applied(setConditionEnabled(state, 'impl', 'lint', false));
    expect(conditionOf(after, 'impl', 'types').enabled).toBe(true);
    expect(conditionOf(after, 'plan', 'lint').enabled).toBe(true);
  });

  it('F-06 AC-029 throws for an unknown workflow id', () => {
    expect(() => setConditionEnabled(stateOf(), 'nope', 'lint', false)).toThrow('Unknown workflow id: nope');
  });

  it('F-06 AC-029 throws for an unknown condition id', () => {
    const state = stateOf(workflow('impl', []));
    expect(() => setConditionEnabled(state, 'impl', 'nope', false)).toThrow(
      'Unknown condition id in workflow impl: nope',
    );
  });
});

describe('F-06 AC-030 required gates', () => {
  it('F-06 AC-030 refuses to switch a required gate off and leaves the state unchanged', () => {
    const state = stateOf(workflow('impl', [condition('review-clean', true, { kind: 'stop' })]));
    const message = refusedWith(setConditionEnabled(state, 'impl', 'review-clean', false));
    expect(message).toMatch(/required/);
    expect(conditionOf(state, 'impl', 'review-clean').enabled).toBe(true);
  });

  it('F-06 AC-030 refuses a required gate even when it is a branch route', () => {
    const state = stateOf(
      workflow('impl', [condition('checks-unit', true, { kind: 'step', stepId: 'implement' })]),
    );
    expect(refusedWith(setConditionEnabled(state, 'impl', 'checks-unit', false))).toMatch(/required/);
    expect(conditionOf(state, 'impl', 'checks-unit').enabled).toBe(true);
  });

  it('F-06 AC-030 allows switching a required gate on', () => {
    const state = stateOf(workflow('impl', [condition('review-clean', true, { kind: 'stop' }, { enabled: false })]));
    const after = applied(setConditionEnabled(state, 'impl', 'review-clean', true));
    expect(conditionOf(after, 'impl', 'review-clean').enabled).toBe(true);
  });

  it('F-06 AC-030 refuses the reference required gate in the default process', () => {
    const state = startState();
    const owner = state.workflows.find((w) => w.conditions.some((c) => c.id === 'diff-size'));
    if (!owner) {
      throw new Error('reference process has no diff-size gate');
    }
    expect(refusedWith(setConditionEnabled(state, owner.id, 'diff-size', false))).toMatch(/required/);
    expect(conditionOf(state, owner.id, 'diff-size').enabled).toBe(true);
  });

  it('F-06 AC-030 switches the reference non-required gate off', () => {
    const state = startState();
    const owner = state.workflows.find((w) => w.conditions.some((c) => c.id === 'criteria-covered'));
    if (!owner) {
      throw new Error('reference process has no criteria-covered gate');
    }
    const after = applied(setConditionEnabled(state, owner.id, 'criteria-covered', false));
    expect(conditionOf(after, owner.id, 'criteria-covered').enabled).toBe(false);
  });
});

describe('F-06 AC-031 round limits on branch routes', () => {
  it('F-06 AC-031 keeps the round limit when a branch route is switched off', () => {
    const state = stateOf(
      workflow('impl', [condition('checks-unit', false, { kind: 'step', stepId: 'implement' }, { roundLimit: 3 })]),
    );
    const after = applied(setConditionEnabled(state, 'impl', 'checks-unit', false));
    expect(conditionOf(after, 'impl', 'checks-unit')).toMatchObject({ enabled: false, roundLimit: 3 });
  });

  it('F-06 AC-031 restores the same round limit when the branch route is switched on again', () => {
    const state = stateOf(
      workflow('impl', [condition('checks-unit', false, { kind: 'step', stepId: 'implement' }, { roundLimit: 3 })]),
    );
    const off = applied(setConditionEnabled(state, 'impl', 'checks-unit', false));
    const on = applied(setConditionEnabled(off, 'impl', 'checks-unit', true));
    expect(conditionOf(on, 'impl', 'checks-unit')).toMatchObject({ enabled: true, roundLimit: 3 });
  });

  it('F-06 AC-031 keeps an absent round limit absent', () => {
    const state = stateOf(
      workflow('impl', [condition('checks-unit', false, { kind: 'step', stepId: 'implement' })]),
    );
    const after = applied(setConditionEnabled(state, 'impl', 'checks-unit', false));
    expect(conditionOf(after, 'impl', 'checks-unit')).not.toHaveProperty('roundLimit');
  });
});
