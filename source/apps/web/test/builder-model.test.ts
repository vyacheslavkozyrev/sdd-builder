import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { addBlock } from '../src/builder/blocks.js';
import { addFlow, nextFlowId, tabOrder } from '../src/builder/model.js';
import type { Pipeline } from '../src/builder/model.js';

type Flow = model.Flow;

// A flow with the required fields only. The id and the name are the ones given; the index is 0
// unless another is given (pipelineOf renumbers flows by position).
function flow(id: string, name: string = id, index?: number): Flow {
  return {
    index: index ?? 0,
    id,
    name,
    arguments: [],
    body: 'Do the work.',
    artifacts: [],
    approval: false,
    blocks: [],
  };
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

describe('F-11 AC-001 tab row order', () => {
  it('F-11 AC-001 an empty pipeline has the Pipeline tab only', () => {
    expect(tabOrder(pipelineOf())).toEqual([{ kind: 'pipeline' }]);
  });

  it.each([1, 3])('F-11 AC-001 the Pipeline tab is always first and present, with %i flow(s)', (count) => {
    const flows = Array.from({ length: count }, (_, i) => flow(`flow-${i + 1}`));
    const tabs = tabOrder(pipelineOf(...flows));
    expect(tabs).toHaveLength(count + 1);
    expect(tabs[0]).toEqual({ kind: 'pipeline' });
  });

  it('F-11 AC-001 the Pipeline tab comes first, then one tab per flow in pipeline order', () => {
    const tabs = tabOrder(pipelineOf(flow('plan'), flow('build'), flow('review')));
    expect(tabs).toEqual([
      { kind: 'pipeline' },
      { kind: 'flow', id: 'plan' },
      { kind: 'flow', id: 'build' },
      { kind: 'flow', id: 'review' },
    ]);
  });

  it('F-11 AC-001 the tab row follows the list order, not the ids in sorted order', () => {
    const tabs = tabOrder(pipelineOf(flow('zeta'), flow('alpha')));
    expect(tabs.slice(1)).toEqual([
      { kind: 'flow', id: 'zeta' },
      { kind: 'flow', id: 'alpha' },
    ]);
  });

  it('F-11 AC-001 the tab row does not change the pipeline it reads', () => {
    const before = pipelineOf(flow('plan'));
    const snapshot = JSON.stringify(before);
    tabOrder(before);
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('F-11 AC-003 flow id is the lowest free flow-N', () => {
  it.each([
    ['an empty pipeline', [], 'flow-1'],
    ['flow-1 taken by an id', [flow('flow-1')], 'flow-2'],
    ['flow-1 taken by a name only', [flow('build', 'flow-1')], 'flow-2'],
    ['flow-1 and flow-2 taken', [flow('flow-1'), flow('flow-2')], 'flow-3'],
    ['a gap: flow-1 and flow-3 taken', [flow('flow-1'), flow('flow-3')], 'flow-2'],
    ['flow-2 taken, flow-1 free', [flow('flow-2', 'Build')], 'flow-1'],
    ['a name flow-2 taken, flow-1 free', [flow('a', 'flow-2')], 'flow-1'],
    ['flow-01 is not flow-1', [flow('flow-01')], 'flow-1'],
    ['flow-x is not a number', [flow('flow-x')], 'flow-1'],
  ])('F-11 AC-003 with %s the next id is %s', (_label, flows, expected) => {
    expect(nextFlowId(pipelineOf(...flows))).toBe(expected);
  });

  it('F-11 AC-003 zero is never used, even in an empty pipeline', () => {
    expect(nextFlowId(pipelineOf())).not.toBe('flow-0');
  });
});

describe('F-11 AC-003 + appends an empty flow after the last one', () => {
  it('F-11 AC-003 the new flow is appended after the last flow', () => {
    const { pipeline } = addFlow(pipelineOf(flow('plan'), flow('build')));
    expect(pipeline.flows.map((f) => f.id)).toEqual(['plan', 'build', 'flow-1']);
  });

  it('F-11 AC-003 the new flow takes its id as its name', () => {
    const { pipeline, flowId } = addFlow(pipelineOf());
    const added = pipeline.flows[0];
    expect(added?.id).toBe('flow-1');
    expect(added?.name).toBe('flow-1');
    expect(flowId).toBe('flow-1');
  });

  it('F-11 AC-003 the new flow has no description, no arguments, a blank body, no blocks and no artifacts', () => {
    const { pipeline } = addFlow(pipelineOf(flow('plan')));
    const added = pipeline.flows[1];
    expect(added).toBeDefined();
    expect(added && 'description' in added).toBe(false);
    expect(added?.arguments).toEqual([]);
    expect(added?.body).toBe('');
    expect(added?.blocks).toEqual([]);
    expect(added?.artifacts).toEqual([]);
  });

  it('F-11 AC-003 the new flow has no outgoing next and no approval', () => {
    const { pipeline } = addFlow(pipelineOf(flow('plan')));
    const added = pipeline.flows[1];
    expect(added && 'next' in added).toBe(false);
    expect(added?.approval).toBe(false);
  });

  it('F-11 AC-003 the new flow gets an index after every existing one, so none repeats', () => {
    const existing: Pipeline = {
      ...pipelineOf(),
      flows: [flow('plan', 'plan', 0), flow('build', 'build', 4)],
    };
    const { pipeline } = addFlow(existing);
    expect(pipeline.flows[2]?.index).toBe(5);
  });

  it('F-11 AC-003 the new flow is the last tab and its id is reported to open the tab', () => {
    const { pipeline, flowId } = addFlow(pipelineOf(flow('plan')));
    expect(tabOrder(pipeline).at(-1)).toEqual({ kind: 'flow', id: flowId });
  });

  it('F-11 AC-003 two adds in a row give flow-1 then flow-2', () => {
    const first = addFlow(pipelineOf());
    const second = addFlow(first.pipeline);
    expect(second.flowId).toBe('flow-2');
    expect(second.pipeline.flows.map((f) => f.id)).toEqual(['flow-1', 'flow-2']);
  });

  it('F-11 AC-003 an add does not change the pipeline it was given', () => {
    const before = pipelineOf(flow('plan'));
    const snapshot = JSON.stringify(before);
    addFlow(before);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(before.flows).toHaveLength(1);
  });

  it('F-11 AC-003 an add keeps the pipeline fields and the existing flows as they were', () => {
    const existing = pipelineOf(flow('plan'));
    const { pipeline } = addFlow(existing);
    expect(pipeline.name).toBe('Demo');
    expect(pipeline.description).toBe('A demo pipeline.');
    expect(pipeline.flows[0]).toBe(existing.flows[0]);
  });
});

describe('F-12 AC-006 a flow created on the Pipeline tab starts with no blocks', () => {
  it('F-12 AC-006 the added flow has an empty block list', () => {
    const { pipeline } = addFlow(pipelineOf(flow('plan')));
    expect(pipeline.flows[1]?.blocks).toEqual([]);
  });

  it('F-12 AC-006 an added flow after a flow with blocks has no blocks of its own', () => {
    const planned = addBlock(flow('plan'), 'start', [flow('plan')]).flow;
    const { pipeline } = addFlow(pipelineOf(planned));
    expect(pipeline.flows[0]?.blocks).toHaveLength(1);
    expect(pipeline.flows[1]?.blocks).toEqual([]);
  });
});

describe('F-12 AC-049 each flow keeps its own blocks', () => {
  it('F-12 AC-049 adding a flow keeps the blocks of every flow before it', () => {
    const planned = addBlock(flow('plan'), 'start', [flow('plan')]).flow;
    const before = pipelineOf(planned, flow('build'));
    const { pipeline } = addFlow(before);
    expect(pipeline.flows[0]?.blocks).toBe(before.flows[0]?.blocks);
    expect(pipeline.flows[1]?.blocks).toBe(before.flows[1]?.blocks);
  });

  it('F-12 AC-049 a block added on a flow tab leaves the other flow\'s blocks unchanged', () => {
    const before = pipelineOf(flow('plan'), addBlock(flow('build'), 'start', [flow('build')]).flow);
    const after = {
      ...before,
      flows: before.flows.map((f) => (f.id === 'plan' ? addBlock(f, 'agent', before.flows).flow : f)),
    };
    expect(after.flows[0]?.blocks).toHaveLength(1);
    expect(after.flows[1]).toBe(before.flows[1]);
    expect(after.flows[1]?.blocks[0]?.kind).toBe('start');
  });
});

describe('F-16 AC-021 block ids are numbered across the pipeline', () => {
  it('F-16 AC-021 a second flow does not reuse the block-1 of the first flow', () => {
    const first = addBlock(flow('plan'), 'start', [flow('plan')]).flow;
    const second = addBlock(flow('build'), 'start', [first, flow('build')]).flow;
    expect(first.blocks[0]?.id).toBe('block-1');
    expect(second.blocks[0]?.id).toBe('block-2');
  });
});
