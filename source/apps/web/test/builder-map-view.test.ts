import { describe, expect, it } from 'vitest';
import type { Condition, Gate, MapConnection, RouteTarget, Workflow, WorkflowStep } from '@sddbuilder/core';
import { edgeText, mapEdges, mapNodes } from '../src/builder/map-view.js';

function gate(type: Gate['type'] = 'checks'): Gate {
  return { id: `${type}-gate`, type, required: true };
}

function condition(
  id: string,
  afterStepId: string,
  fail: RouteTarget | undefined,
  enabled = true,
): Condition {
  return { id, enabled, afterStepId, gate: gate(), pass: { kind: 'next' }, fail };
}

function step(stepId: string, enabled = true): WorkflowStep {
  return { stepId, enabled };
}

function workflow(overrides: Partial<Workflow> & Pick<Workflow, 'id'>): Workflow {
  return {
    name: overrides.id,
    scope: 'feature',
    iterationSource: 'features.md',
    enabled: true,
    steps: [],
    conditions: [],
    ...overrides,
  };
}

const STOP: RouteTarget = { kind: 'stop' };
const BACK: RouteTarget = { kind: 'step', stepId: 'plan' };

describe('F-06 AC-005 map node shows name, scope, iteration source and counts', () => {
  it('F-06 AC-005 shows the name, scope and iteration source of each workflow', () => {
    const nodes = mapNodes([
      workflow({ id: 'spec', name: 'Specify', scope: 'feature', iterationSource: 'features.md' }),
      workflow({ id: 'build', name: 'Build', scope: 'task', iterationSource: 'plan.md' }),
      workflow({ id: 'setup', name: 'Setup', scope: 'project', iterationSource: 'project' }),
    ]);
    expect(nodes).toEqual([
      expect.objectContaining({ id: 'spec', name: 'Specify', scope: 'feature', iterationSource: 'features.md' }),
      expect.objectContaining({ id: 'build', name: 'Build', scope: 'task', iterationSource: 'plan.md' }),
      expect.objectContaining({ id: 'setup', name: 'Setup', scope: 'project', iterationSource: 'project' }),
    ]);
  });

  it('F-06 AC-005 counts enabled steps, gates and branch routes', () => {
    const nodes = mapNodes([
      workflow({
        id: 'build',
        steps: [step('a'), step('b'), step('c')],
        conditions: [
          condition('g1', 'a', STOP),
          condition('g2', 'b', STOP),
          condition('r1', 'b', BACK),
          condition('p1', 'c', undefined),
        ],
      }),
    ]);
    expect(nodes[0]).toMatchObject({ stepCount: 3, gateCount: 2, routeCount: 1 });
  });

  it('F-06 AC-005 a workflow with no steps or conditions shows zero counts', () => {
    const nodes = mapNodes([workflow({ id: 'empty' })]);
    expect(nodes[0]).toMatchObject({ stepCount: 0, gateCount: 0, routeCount: 0 });
  });

  it('F-06 AC-005 a condition with an unwired fail output is neither a gate nor a route', () => {
    const nodes = mapNodes([
      workflow({ id: 'w', steps: [step('a')], conditions: [condition('c', 'a', undefined)] }),
    ]);
    expect(nodes[0]).toMatchObject({ gateCount: 0, routeCount: 0 });
  });

  it('F-06 AC-005 keeps the order of the workflows given', () => {
    const nodes = mapNodes([workflow({ id: 'z' }), workflow({ id: 'a' })]);
    expect(nodes.map((n) => n.id)).toEqual(['z', 'a']);
  });

  it('F-06 AC-005 returns no nodes for no workflows', () => {
    expect(mapNodes([])).toEqual([]);
  });
});

describe('F-06 AC-006 disabled steps and conditions are not counted', () => {
  it('F-06 AC-006 a disabled step does not count its conditions', () => {
    const nodes = mapNodes([
      workflow({
        id: 'w',
        steps: [step('a'), step('b', false)],
        conditions: [condition('g1', 'a', STOP), condition('g2', 'b', STOP), condition('r1', 'b', BACK)],
      }),
    ]);
    expect(nodes[0]).toMatchObject({ stepCount: 1, gateCount: 1, routeCount: 0 });
  });

  it('F-06 AC-006 a disabled condition is not counted, even on an enabled step', () => {
    const nodes = mapNodes([
      workflow({
        id: 'w',
        steps: [step('a')],
        conditions: [condition('g1', 'a', STOP, false), condition('r1', 'a', BACK, false)],
      }),
    ]);
    expect(nodes[0]).toMatchObject({ stepCount: 1, gateCount: 0, routeCount: 0 });
  });

  it('F-06 AC-006 a condition whose step is not in the workflow is not counted', () => {
    const nodes = mapNodes([
      workflow({ id: 'w', steps: [step('a')], conditions: [condition('g1', 'missing', STOP)] }),
    ]);
    expect(nodes[0]).toMatchObject({ gateCount: 0 });
  });

  it('F-06 AC-006 a disabled workflow still shows its enabled counts', () => {
    const nodes = mapNodes([
      workflow({ id: 'w', enabled: false, steps: [step('a')], conditions: [condition('g1', 'a', STOP)] }),
    ]);
    expect(nodes[0]).toMatchObject({ stepCount: 1, gateCount: 1 });
  });
});

describe('F-06 AC-007 connection artifact label', () => {
  const base = { id: 'c', from: 'a', to: 'b' };

  it('F-06 AC-007 shows the artifact label of a connection', () => {
    const edges = mapEdges([{ ...base, artifact: 'plan.md' }]);
    expect(edges[0]).toMatchObject({ label: 'plan.md' });
  });

  it('F-06 AC-007 shows no label for a connection without an artifact', () => {
    const edges = mapEdges([base]);
    expect(edges[0]).toMatchObject({ label: null });
  });

  it('F-06 AC-007 shows no label for a blank artifact', () => {
    const edges = mapEdges([{ ...base, artifact: '   ' }]);
    expect(edges[0]).toMatchObject({ label: null });
  });

  it('F-06 AC-007 trims the label shown', () => {
    const edges = mapEdges([{ ...base, artifact: '  features.md ' }]);
    expect(edges[0]).toMatchObject({ label: 'features.md' });
  });
});

describe('F-06 AC-008 connection gate type', () => {
  const base = { id: 'c', from: 'a', to: 'b' };

  it.each(['approval', 'checks', 'review', 'diff-size'] as const)(
    'F-06 AC-008 shows the gate type %s of a connection with a gate',
    (type) => {
      const connection: MapConnection = { ...base, gate: gate(type) };
      expect(mapEdges([connection])[0]).toMatchObject({ gateType: type });
    },
  );

  it('F-06 AC-008 shows no gate type for a connection without a gate', () => {
    expect(mapEdges([base])[0]).toMatchObject({ gateType: null });
  });

  it('F-06 AC-008 keeps the connection ids, ends and the order given', () => {
    const edges = mapEdges([
      { id: 'x', from: 'p', to: 'q', artifact: 'plan.md', gate: gate('review') },
      { id: 'y', from: 'q', to: 'r' },
    ]);
    expect(edges).toEqual([
      { id: 'x', from: 'p', to: 'q', label: 'plan.md', gateType: 'review' },
      { id: 'y', from: 'q', to: 'r', label: null, gateType: null },
    ]);
  });

  it('F-06 AC-008 returns no edges for no connections', () => {
    expect(mapEdges([])).toEqual([]);
  });
});

describe('F-06 AC-007 AC-008 edge text on the map', () => {
  const base = { id: 'c', from: 'a', to: 'b' };

  it('F-06 AC-007 AC-008 joins the artifact label and the gate type', () => {
    const [edge] = mapEdges([{ ...base, artifact: 'plan.md', gate: gate('review') }]);
    expect(edgeText(edge!)).toBe('plan.md · review');
  });

  it('F-06 AC-007 shows only the label when there is no gate', () => {
    const [edge] = mapEdges([{ ...base, artifact: 'plan.md' }]);
    expect(edgeText(edge!)).toBe('plan.md');
  });

  it('F-06 AC-008 shows only the gate type when there is no label', () => {
    const [edge] = mapEdges([{ ...base, gate: gate('diff-size') }]);
    expect(edgeText(edge!)).toBe('diff-size');
  });

  it('F-06 AC-007 AC-008 is empty for a connection with neither label nor gate', () => {
    const [edge] = mapEdges([{ ...base, artifact: '  ' }]);
    expect(edgeText(edge!)).toBe('');
  });
});
