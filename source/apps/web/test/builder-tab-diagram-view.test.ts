import { describe, expect, it } from 'vitest';
import { DEFAULT_WORKFLOWS, getCatalogStep } from '@sddbuilder/core';
import type { Condition, Workflow } from '@sddbuilder/core';
import { conditionNodeId, stepNodeId, tabDiagram } from '../src/builder/tab-diagram-view.js';

function workflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'w',
    name: 'Workflow',
    scope: 'feature',
    iterationSource: 'features.md',
    enabled: true,
    steps: [],
    conditions: [],
    ...overrides,
  };
}

function condition(overrides: Partial<Condition> = {}): Condition {
  return {
    id: 'c1',
    enabled: true,
    afterStepId: 'plan',
    gate: { id: 'g1', type: 'approval', required: false },
    pass: { kind: 'next' },
    fail: { kind: 'stop' },
    ...overrides,
  };
}

describe('F-06 AC-036 diagram lists the steps of the workflow in order', () => {
  it('F-06 AC-036 draws one step node per workflow step, left to right, in list order', () => {
    const model = tabDiagram(
      workflow({
        steps: [
          { stepId: 'define-feature', enabled: true },
          { stepId: 'plan', enabled: true },
          { stepId: 'implement', enabled: true },
        ],
      }),
    );
    expect(model.nodes.map((node) => node.stepId)).toEqual(['define-feature', 'plan', 'implement']);
    expect(model.nodes.map((node) => node.column)).toEqual([0, 1, 2]);
    expect(model.nodes.map((node) => node.label)).toEqual([
      getCatalogStep('define-feature').name,
      getCatalogStep('plan').name,
      getCatalogStep('implement').name,
    ]);
  });

  it('F-06 AC-036 joins each step to the next one with a sequence edge', () => {
    const model = tabDiagram(
      workflow({
        steps: [
          { stepId: 'define-feature', enabled: true },
          { stepId: 'plan', enabled: true },
        ],
      }),
    );
    expect(model.edges).toEqual([
      {
        id: `sequence:${stepNodeId('define-feature')}>${stepNodeId('plan')}`,
        from: stepNodeId('define-feature'),
        to: stepNodeId('plan'),
        kind: 'sequence',
        label: null,
      },
    ]);
  });

  it('F-06 AC-036 places each condition right after the step it follows', () => {
    const model = tabDiagram(
      workflow({
        steps: [
          { stepId: 'define-feature', enabled: true },
          { stepId: 'plan', enabled: true },
        ],
        conditions: [condition({ id: 'c1', afterStepId: 'define-feature', gate: { id: 'g1', type: 'checks', required: false } })],
      }),
    );
    expect(model.nodes.map((node) => node.id)).toEqual([
      stepNodeId('define-feature'),
      conditionNodeId('c1'),
      stepNodeId('plan'),
    ]);
    expect(model.nodes.map((node) => node.column)).toEqual([0, 1, 2]);
    expect(model.nodes[1]?.label).toBe('checks gate');
    expect(model.nodes[1]?.stepId).toBeNull();
  });

  it('F-06 AC-036 keeps the order of several conditions after one step', () => {
    const model = tabDiagram(
      workflow({
        steps: [{ stepId: 'plan', enabled: true }],
        conditions: [
          condition({ id: 'first', gate: { id: 'g1', type: 'review', required: false } }),
          condition({ id: 'second', gate: { id: 'g2', type: 'diff-size', required: false } }),
        ],
      }),
    );
    expect(model.nodes.map((node) => node.id)).toEqual([
      stepNodeId('plan'),
      conditionNodeId('first'),
      conditionNodeId('second'),
    ]);
  });

  it('F-06 AC-036 returns an empty diagram for a workflow with no steps', () => {
    expect(tabDiagram(workflow())).toEqual({ nodes: [], edges: [] });
  });
});

describe('F-06 AC-036 diagram shows switched-off steps and conditions as off', () => {
  it('F-06 AC-036 marks a switched-off step in its label and keeps it in place', () => {
    const model = tabDiagram(
      workflow({
        steps: [
          { stepId: 'define-feature', enabled: true },
          { stepId: 'plan', enabled: false },
        ],
      }),
    );
    expect(model.nodes[1]).toMatchObject({ enabled: false, label: `${getCatalogStep('plan').name} (off)` });
    expect(model.nodes[1]?.column).toBe(1);
  });

  it('F-06 AC-036 marks a switched-off condition in its label', () => {
    const model = tabDiagram(
      workflow({
        steps: [{ stepId: 'plan', enabled: true }],
        conditions: [condition({ enabled: false, gate: { id: 'g1', type: 'approval', required: false } })],
      }),
    );
    expect(model.nodes[1]).toMatchObject({ enabled: false, label: 'approval gate (off)' });
  });
});

describe('F-06 AC-036 diagram draws branch routes for enabled conditions only', () => {
  const steps = [
    { stepId: 'implement', enabled: true },
    { stepId: 'code-review', enabled: true },
  ];

  it('F-06 AC-036 draws a fail route back to an earlier step as a labelled route edge', () => {
    const model = tabDiagram(
      workflow({
        steps,
        conditions: [
          condition({
            id: 'c1',
            afterStepId: 'code-review',
            pass: { kind: 'next' },
            fail: { kind: 'step', stepId: 'implement' },
          }),
        ],
      }),
    );
    const route = model.edges.find((edge) => edge.kind === 'route');
    expect(route).toEqual({
      id: `route:${conditionNodeId('c1')}>${stepNodeId('implement')}:fail`,
      from: conditionNodeId('c1'),
      to: stepNodeId('implement'),
      kind: 'route',
      label: 'fail',
    });
  });

  it('F-06 AC-036 draws a pass route to a step as a route edge labelled pass', () => {
    const model = tabDiagram(
      workflow({
        steps,
        conditions: [condition({ afterStepId: 'implement', pass: { kind: 'step', stepId: 'code-review' }, fail: { kind: 'stop' } })],
      }),
    );
    expect(model.edges.filter((edge) => edge.kind === 'route').map((edge) => edge.label)).toEqual(['pass']);
  });

  it('F-06 AC-036 draws no route edge for a switched-off condition', () => {
    const model = tabDiagram(
      workflow({
        steps,
        conditions: [
          condition({
            afterStepId: 'code-review',
            enabled: false,
            fail: { kind: 'step', stepId: 'implement' },
          }),
        ],
      }),
    );
    expect(model.edges.some((edge) => edge.kind === 'route')).toBe(false);
  });

  it('F-06 AC-036 draws no route edge for a stop or next route', () => {
    const model = tabDiagram(
      workflow({
        steps,
        conditions: [condition({ afterStepId: 'code-review', pass: { kind: 'next' }, fail: { kind: 'stop' } })],
      }),
    );
    expect(model.edges.some((edge) => edge.kind === 'route')).toBe(false);
  });

  it('F-06 AC-036 draws no route edge to a step that is not in the workflow', () => {
    const model = tabDiagram(
      workflow({
        steps,
        conditions: [condition({ afterStepId: 'code-review', fail: { kind: 'step', stepId: 'define-feature' } })],
      }),
    );
    expect(model.edges.some((edge) => edge.kind === 'route')).toBe(false);
  });

  it('F-06 AC-036 does not draw a condition whose step is not in the workflow', () => {
    const model = tabDiagram(
      workflow({
        steps: [{ stepId: 'plan', enabled: true }],
        conditions: [condition({ id: 'orphan', afterStepId: 'define-feature' })],
      }),
    );
    expect(model.nodes.map((node) => node.id)).toEqual([stepNodeId('plan')]);
  });
});

describe('F-06 AC-036 diagram of the reference process', () => {
  it('F-06 AC-036 draws every step of each reference workflow once, in its list order', () => {
    for (const reference of DEFAULT_WORKFLOWS) {
      const model = tabDiagram(reference);
      const stepIds = model.nodes.filter((node) => node.kind === 'step').map((node) => node.stepId);
      expect(stepIds).toEqual(reference.steps.map((step) => step.stepId));
    }
  });
});
