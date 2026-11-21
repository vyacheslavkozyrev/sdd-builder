import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { removeConnection } from '../src/builder/connect.js';
import type { Pipeline } from '../src/builder/connect.js';
import { arrowPanel } from '../src/builder/panel.js';

type Flow = model.Flow;

// A flow with the required fields only. `name` defaults to the id; `next` is set only when given.
function flow(id: string, next?: string, name: string = id): Flow {
  const base: Flow = {
    index: 0,
    id,
    name,
    description: `The ${name} step.`,
    arguments: [],
    body: `Do the ${name} work.`,
    artifacts: [{ label: `${id}.md`, template: 'output.md' }],
    approval: true,
    blocks: [],
  };
  return next === undefined ? base : { ...base, next };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((f, i) => ({ ...f, index: i })),
  };
}

function reasonOf(result: ReturnType<typeof removeConnection>): string {
  if (result.ok) {
    throw new Error('expected a refusal, got a changed pipeline');
  }
  return result.reason;
}

describe('F-11 AC-017 arrow panel shows the source and target names', () => {
  it.each([
    {
      name: 'flow names differ from their ids',
      pipeline: pipelineOf(flow('flow-1', 'flow-2', 'Plan the work'), flow('flow-2', undefined, 'Build it')),
      arrow: { source: 'flow-1', target: 'flow-2' },
      expected: { sourceName: 'Plan the work', targetName: 'Build it' },
    },
    {
      name: 'flow names equal their ids',
      pipeline: pipelineOf(flow('a', 'b'), flow('b')),
      arrow: { source: 'a', target: 'b' },
      expected: { sourceName: 'a', targetName: 'b' },
    },
    {
      name: 'the arrow is taken from the middle of a longer pipeline',
      pipeline: pipelineOf(flow('x'), flow('y', 'z', 'Review'), flow('z', undefined, 'Verify')),
      arrow: { source: 'y', target: 'z' },
      expected: { sourceName: 'Review', targetName: 'Verify' },
    },
  ])('$name', ({ pipeline, arrow, expected }) => {
    expect(arrowPanel(pipeline, arrow)).toEqual(expected);
  });

  it('F-11 AC-017 the panel data has only the two names and no field that edits them', () => {
    const panel = arrowPanel(pipelineOf(flow('a', 'b', 'Plan'), flow('b', undefined, 'Build')), {
      source: 'a',
      target: 'b',
    });
    expect(Object.keys(panel).sort()).toEqual(['sourceName', 'targetName']);
    expect(Object.isFrozen(panel)).toBe(true);
  });

  it('F-11 AC-017 reading the panel does not change the pipeline', () => {
    const pipeline = pipelineOf(flow('a', 'b', 'Plan'), flow('b', undefined, 'Build'));
    const before = structuredClone(pipeline);
    arrowPanel(pipeline, { source: 'a', target: 'b' });
    expect(pipeline).toEqual(before);
  });

  it.each([
    {
      name: 'the arrow names a source that is not a flow',
      pipeline: pipelineOf(flow('a', 'b'), flow('b')),
      arrow: { source: 'missing', target: 'b' },
    },
    {
      name: 'the arrow names a target that is not a flow',
      pipeline: pipelineOf(flow('a', 'b'), flow('b')),
      arrow: { source: 'a', target: 'missing' },
    },
    {
      name: 'the source has no next',
      pipeline: pipelineOf(flow('a'), flow('b')),
      arrow: { source: 'a', target: 'b' },
    },
    {
      name: 'the source points to another flow',
      pipeline: pipelineOf(flow('a', 'b'), flow('b'), flow('c')),
      arrow: { source: 'a', target: 'c' },
    },
  ])('F-11 AC-017 throws when $name', ({ pipeline, arrow }) => {
    expect(() => arrowPanel(pipeline, arrow)).toThrow(/no arrow from/);
  });
});

describe('F-11 AC-018 delete connection clears the source next only', () => {
  it('F-11 AC-018 sets the source next to none, so the key is absent', () => {
    const result = removeConnection(pipelineOf(flow('a', 'b'), flow('b')), 'a');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const source = result.pipeline.flows.find((f) => f.id === 'a');
    expect(source).toBeDefined();
    expect(source && 'next' in source).toBe(false);
    expect(source?.next).toBeUndefined();
  });

  it('F-11 AC-018 keeps the target flow and every other flow unchanged', () => {
    const before = pipelineOf(flow('a', 'b', 'Plan'), flow('b', 'c', 'Build'), flow('c', undefined, 'Verify'));
    const result = removeConnection(before, 'a');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.pipeline.flows;
    expect(after.find((f) => f.id === 'b')).toEqual(before.flows.find((f) => f.id === 'b'));
    expect(after.find((f) => f.id === 'c')).toEqual(before.flows.find((f) => f.id === 'c'));
  });

  it('F-11 AC-018 keeps every other field of the source flow', () => {
    const before = pipelineOf(flow('a', 'b', 'Plan'), flow('b'));
    const result = removeConnection(before, 'a');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sourceBefore = before.flows.find((f) => f.id === 'a');
    expect(sourceBefore).toBeDefined();
    if (sourceBefore === undefined) return;
    const { next: _removed, ...sourceWithout } = sourceBefore;
    expect(result.pipeline.flows.find((f) => f.id === 'a')).toEqual(sourceWithout);
  });

  it('F-11 AC-018 keeps the pipeline fields unchanged', () => {
    const before = pipelineOf(flow('a', 'b'), flow('b'));
    const result = removeConnection(before, 'a');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pipeline.name).toBe(before.name);
    expect(result.pipeline.description).toBe(before.description);
    expect(result.pipeline.arguments).toEqual(before.arguments);
    expect(result.pipeline.flows).toHaveLength(before.flows.length);
  });

  it('F-11 AC-018 does not change the input pipeline', () => {
    const before = pipelineOf(flow('a', 'b'), flow('b'));
    const snapshot = structuredClone(before);
    removeConnection(before, 'a');
    expect(before).toEqual(snapshot);
  });

  it('F-11 AC-018 after the removal the arrow panel no longer has an arrow to show', () => {
    const result = removeConnection(pipelineOf(flow('a', 'b'), flow('b')), 'a');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() => arrowPanel(result.pipeline, { source: 'a', target: 'b' })).toThrow(/no arrow from/);
  });

  it.each([
    {
      name: 'the source is not a flow of the pipeline',
      pipeline: pipelineOf(flow('a', 'b'), flow('b')),
      sourceId: 'missing',
      reason: 'the source "missing" is not a flow of this pipeline',
    },
    {
      name: 'the source has no next',
      pipeline: pipelineOf(flow('a'), flow('b')),
      sourceId: 'a',
      reason: 'flow "a" has no outgoing arrow to remove',
    },
  ])('F-11 AC-018 refuses with a reason when $name', ({ pipeline, sourceId, reason }) => {
    const before = structuredClone(pipeline);
    const result = removeConnection(pipeline, sourceId);
    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toBe(reason);
    expect(pipeline).toEqual(before);
  });

  it('F-11 AC-018 a refused removal leaves the pipeline equal to before', () => {
    const pipeline = pipelineOf(flow('a'), flow('b', 'a'));
    const before = structuredClone(pipeline);
    const result = removeConnection(pipeline, 'a');
    expect(result.ok).toBe(false);
    expect(pipeline).toEqual(before);
  });
});
