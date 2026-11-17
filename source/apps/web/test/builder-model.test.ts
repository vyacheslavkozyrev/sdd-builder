import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import { addFlow, boxes, connections, nextFlowId, tabRow } from '../src/builder/model.js';

type Pipeline = pipeline.Pipeline;
type Block = pipeline.Block;
type Flow = pipeline.Flow;
type Gate = pipeline.Gate;

function blocks(count: number): Block[] {
  return Array.from({ length: count }, (_, i): Block => ({
    id: `b${i}`,
    kind: 'approval',
    description: 'Approve the step.',
  }));
}

function flow(id: string, blockCount = 0, extra: Partial<Flow> = {}): Flow {
  return { id, name: `Name ${id}`, description: '', arguments: '', blocks: blocks(blockCount), ...extra };
}

function config(flows: Flow[]): Pipeline {
  return { name: 'pipeline', description: '', arguments: [], flows };
}

describe('F-11 AC-001 tab row', () => {
  it('F-11 AC-001 puts the Pipeline tab first, then one tab per flow in pipeline order', () => {
    const tabs = tabRow(config([flow('specify'), flow('plan'), flow('build')]));
    expect(tabs).toEqual([
      { kind: 'pipeline' },
      { kind: 'flow', id: 'specify', name: 'Name specify' },
      { kind: 'flow', id: 'plan', name: 'Name plan' },
      { kind: 'flow', id: 'build', name: 'Name build' },
    ]);
  });

  it('F-11 AC-001 shows only the Pipeline tab when there is no flow', () => {
    expect(tabRow(config([]))).toEqual([{ kind: 'pipeline' }]);
  });
});

describe('F-11 AC-003 next flow id', () => {
  const cases: ReadonlyArray<readonly [string, string[], string]> = [
    ['no flow yet', [], 'flow-2'],
    ['only the first flow', ['specify'], 'flow-2'],
    ['flow-2 taken', ['specify', 'flow-2'], 'flow-3'],
    ['flow-2 and flow-3 taken', ['flow-2', 'flow-3'], 'flow-4'],
    ['a gap is filled', ['flow-3'], 'flow-2'],
    ['flow-2 taken, flow-3 free', ['flow-2', 'flow-4'], 'flow-3'],
  ];

  for (const [label, ids, expected] of cases) {
    it(`F-11 AC-003 gives ${expected} when ${label}`, () => {
      expect(nextFlowId(config(ids.map((id) => flow(id))))).toBe(expected);
    });
  }

  it('F-11 AC-003 skips a number that another flow uses as its name', () => {
    const renamed = { ...flow('specify'), name: 'flow-2' };
    expect(nextFlowId(config([renamed]))).toBe('flow-3');
  });

  it('F-11 AC-003 gives a file-safe id in every case', () => {
    const fileSafe = /^[a-z][a-z0-9-]*$/;
    const sets: string[][] = [[], ['specify'], ['flow-2'], ['flow-2', 'flow-3', 'flow-4']];
    for (const ids of sets) {
      expect(nextFlowId(config(ids.map((id) => flow(id))))).toMatch(fileSafe);
    }
  });
});

describe('F-11 AC-003 add flow', () => {
  it('F-11 AC-003 adds one flow with no blocks and no connection, with the next id', () => {
    const before = config([flow('specify', 2, { connectedTo: { to: 'plan', label: 'spec' } })]);
    const { pipeline: after, flowId } = addFlow(before);

    expect(flowId).toBe('flow-2');
    expect(after.flows).toHaveLength(2);
    const added = after.flows[1];
    expect(added).toEqual({ id: 'flow-2', name: 'flow-2', description: '', arguments: '', blocks: [] });
    expect(added).not.toHaveProperty('connectedTo');
  });

  it('F-11 AC-003 appends the new flow after the existing ones', () => {
    const { pipeline: after } = addFlow(config([flow('specify'), flow('flow-2')]));
    expect(after.flows.map((f) => f.id)).toEqual(['specify', 'flow-2', 'flow-3']);
  });

  it('F-11 AC-003 gives the new flow a name that no other flow has when a flow is named flow-2', () => {
    const renamed = { ...flow('specify'), name: 'flow-2' };
    const { pipeline: after, flowId } = addFlow(config([renamed]));
    const added = after.flows[1];
    expect(flowId).toBe('flow-3');
    expect(added?.name).toBe('flow-3');
    expect(after.flows.filter((f) => f.name === 'flow-3')).toHaveLength(1);
  });

  it('F-11 AC-003 does not change the pipeline it is given', () => {
    const before = config([flow('specify', 1)]);
    const snapshot = JSON.stringify(before);
    addFlow(before);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('F-11 AC-007 flow boxes', () => {
  const cases: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [1, 1],
    [5, 5],
  ];

  for (const [blockCount, expected] of cases) {
    it(`F-11 AC-007 shows ${expected} for a flow with ${blockCount} blocks`, () => {
      const [box] = boxes(config([flow('specify', blockCount)]));
      expect(box).toEqual({ id: 'specify', name: 'Name specify', blockCount: expected });
    });
  }

  it('F-11 AC-007 gives one box per flow, in pipeline order', () => {
    const result = boxes(config([flow('a', 0), flow('b', 3)]));
    expect(result.map((box) => box.id)).toEqual(['a', 'b']);
    expect(result.map((box) => box.blockCount)).toEqual([0, 3]);
  });
});

describe('F-11 AC-008 connections', () => {
  it('F-11 AC-008 draws each connection from its source flow to its target flow with its label', () => {
    const result = connections(
      config([
        flow('specify', 1, { connectedTo: { to: 'plan', label: 'spec.md' } }),
        flow('plan', 1, { connectedTo: { to: 'build', label: 'plan.md' } }),
        flow('build', 1),
      ]),
    );
    expect(result).toEqual([
      { source: 'specify', target: 'plan', label: 'spec.md', gate: undefined },
      { source: 'plan', target: 'build', label: 'plan.md', gate: undefined },
    ]);
  });

  it('F-11 AC-008 carries the gate of a connection with the arrow', () => {
    const gate: Gate = { kind: 'approval', description: 'The user approves the spec.' };
    const [arrow] = connections(
      config([flow('specify', 0, { connectedTo: { to: 'plan', label: 'spec.md', gate } })]),
    );
    expect(arrow?.gate).toEqual(gate);
  });

  it('F-11 AC-008 draws no arrow for a flow without a connection', () => {
    expect(connections(config([flow('specify'), flow('plan')]))).toEqual([]);
  });
});
