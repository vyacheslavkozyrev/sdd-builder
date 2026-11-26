import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { linkBlocks } from '../src/builder/blockLink.js';
import type { OutputName } from '../src/builder/blockArrows.js';

type Flow = model.Flow;
type Block = model.Block;

// A flow with the required fields only and the given blocks.
function flowWith(blocks: readonly Block[]): Flow {
  return {
    index: 0,
    id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
    name: 'plan',
    arguments: [],
    body: 'Do the work.',
    artifacts: [],
    approval: false,
    blocks,
  };
}

function start(id: string, next: string): Block {
  return { index: 0, id, kind: 'start', next };
}

function agent(id: string, next: string): Block {
  return { index: 0, id, kind: 'agent', name: id, description: 'Does a step.', arguments: [], next };
}

function condition(id: string, trueRoute: model.Route, falseRoute: model.Route): Block {
  return { index: 0, id, kind: 'condition', description: 'Tests pass.', true: trueRoute, false: falseRoute };
}

function end(id: string): Block {
  return { index: 0, id, kind: 'end', outcome: 'done', producedArtifact: 'Report' };
}

// Start, then an Agent, a Condition, a later Agent and an End, in arrow order.
// Columns: start 0, a1 1, c1 2, a2 3, e1 4.
function sampleFlow(): Flow {
  return flowWith([
    start('s1', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'),
    agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'),
    condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' }, { stop: true }),
    agent('69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'dc76d30c-c949-5210-9231-2848444c3d42'),
    end('dc76d30c-c949-5210-9231-2848444c3d42'),
  ]);
}

function reason(result: ReturnType<typeof linkBlocks>): string {
  if (result.ok) {
    throw new Error('expected a refusal');
  }
  return result.reason;
}

function flowOf(result: ReturnType<typeof linkBlocks>): Flow {
  if (!result.ok) {
    throw new Error(`expected an accepted link, got: ${result.reason}`);
  }
  return result.flow;
}

function blockOf(flow: Flow, id: string): Block {
  const found = flow.blocks.find((block) => block.id === id);
  if (found === undefined) {
    throw new Error(`no block ${id}`);
  }
  return found;
}

describe('F-12 AC-012 linkBlocks sets an output route to a block of the same flow', () => {
  it('sets an Agent next to a later block', () => {
    const flow = flowWith([start('s1', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'), agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', ''), agent('69c3afc7-4cfe-5c94-9ade-932204fe9cce', ''), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
    expect(blockOf(flowOf(linkBlocks(flow, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'next', '69c3afc7-4cfe-5c94-9ade-932204fe9cce')), 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')).toMatchObject({ kind: 'agent', next: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' });
  });

  it('sets a Start next to an Agent', () => {
    const flow = flowWith([start('s1', ''), agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', ''), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
    expect(blockOf(flowOf(linkBlocks(flow, 's1', 'next', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')), 's1')).toMatchObject({ next: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac' });
  });

  it('sets a Condition true route to a later block with no round limit', () => {
    const flow = flowWith([start('s1', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'), condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '' }, { stop: true }), agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', ''), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
    const linked = blockOf(flowOf(linkBlocks(flow, '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'true', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')), '41c27e6a-36d4-5f15-bbb3-31419251d0ef');
    expect(linked).toMatchObject({ true: { to: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac' } });
    expect(linked.kind === 'condition' && 'roundLimit' in linked.true).toBe(false);
  });

  it('does not change the input flow', () => {
    const flow = sampleFlow();
    const before = JSON.stringify(flow);
    linkBlocks(flow, '69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'next', 'dc76d30c-c949-5210-9231-2848444c3d42');
    expect(JSON.stringify(flow)).toBe(before);
  });
});

describe('F-12 AC-014 a Start links only to an Agent or a Condition', () => {
  it('refuses a Start to an End with the stories reason', () => {
    const flow = flowWith([start('s1', ''), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
    expect(reason(linkBlocks(flow, 's1', 'next', 'dc76d30c-c949-5210-9231-2848444c3d42'))).toBe('A Start links to an Agent or a Condition.');
  });
});

describe('F-12 AC-015 an output with an arrow and a drop on the block itself are refused', () => {
  it.each<[string, Flow, string, OutputName, string, string]>([
    ['an output that already has an arrow', sampleFlow(), 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'next', '69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'This block already has an arrow from this point.'],
    ['a Condition true output that already has an arrow', sampleFlow(), '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'true', '69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'This block already has an arrow from this point.'],
    ['a drop onto the block itself', sampleFlow(), 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'next', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'A block cannot link to itself.'],
  ])('refuses %s', (_name, flow, from, output, target, expected) => {
    expect(reason(linkBlocks(flow, from, output, target))).toBe(expected);
  });

  it('gives the self reason before the arrow reason when both apply', () => {
    expect(reason(linkBlocks(sampleFlow(), 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'next', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'))).toBe('A block cannot link to itself.');
  });

  it('accepts a link from an output that has no arrow yet', () => {
    const flow = flowWith([start('s1', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'), agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', ''), agent('69c3afc7-4cfe-5c94-9ade-932204fe9cce', ''), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
    expect(linkBlocks(flow, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'next', '69c3afc7-4cfe-5c94-9ade-932204fe9cce').ok).toBe(true);
  });
});

describe('F-12 AC-016 an Agent output and a true output link only to a later block', () => {
  it('refuses an Agent next to an earlier Agent', () => {
    const flow = flowWith([
      start('s1', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'),
      agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'),
      condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' }, { stop: true }),
      agent('69c3afc7-4cfe-5c94-9ade-932204fe9cce', ''),
      end('dc76d30c-c949-5210-9231-2848444c3d42'),
    ]);
    expect(reason(linkBlocks(flow, '69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'next', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'))).toBe('Only a false route can return to an earlier Agent.');
  });

  it('refuses a Condition true route to an earlier Agent', () => {
    const flow = flowWith([
      start('s1', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'),
      agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'),
      condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '' }, { stop: true }),
      end('dc76d30c-c949-5210-9231-2848444c3d42'),
    ]);
    expect(reason(linkBlocks(flow, '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'true', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'))).toBe('Only a false route can return to an earlier Agent.');
  });

});

describe('F-12 AC-017 a false route returns to an earlier Agent only', () => {
  it('accepts a false route to a later block with no round limit', () => {
    const flow = flowWith([start('s1', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'), condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '' }, { stop: true }), agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', ''), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
    expect(blockOf(flowOf(linkBlocks(flow, '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'false', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')), '41c27e6a-36d4-5f15-bbb3-31419251d0ef')).toMatchObject({ false: { to: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac' } });
  });

  it('accepts a false return to an earlier Agent with its round limit unset', () => {
    const flow = flowWith([
      start('s1', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'),
      agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'),
      condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' }, { stop: true }),
      agent('69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'dc76d30c-c949-5210-9231-2848444c3d42'),
      end('dc76d30c-c949-5210-9231-2848444c3d42'),
    ]);
    const linked = blockOf(flowOf(linkBlocks(flow, '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'false', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')), '41c27e6a-36d4-5f15-bbb3-31419251d0ef');
    expect(linked).toEqual(condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' }, { to: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac' }));
    expect(linked.kind === 'condition' && 'roundLimit' in linked.false).toBe(false);
  });

  it('refuses a false route to an earlier block that is not an Agent', () => {
    const flow = flowWith([
      start('s1', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'),
      agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'),
      condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' }, { stop: true }),
      condition('68c39d16-f241-5c87-ba5b-396054d60783', { to: '' }, { stop: true }),
      agent('69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'dc76d30c-c949-5210-9231-2848444c3d42'),
      end('dc76d30c-c949-5210-9231-2848444c3d42'),
    ]);
    expect(reason(linkBlocks(flow, '68c39d16-f241-5c87-ba5b-396054d60783', 'false', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'))).toBe('Only an Agent can be returned to.');
  });

  it('accepts a false route to an End that comes after the Condition in the arrow order', () => {
    const flow = flowWith([start('s1', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'), condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '' }, { stop: true }), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
    expect(blockOf(flowOf(linkBlocks(flow, '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'false', 'dc76d30c-c949-5210-9231-2848444c3d42')), '41c27e6a-36d4-5f15-bbb3-31419251d0ef')).toMatchObject({ false: { to: 'dc76d30c-c949-5210-9231-2848444c3d42' } });
  });

  it('F-12 AC-017 refuses a false route to an End the arrow order reaches before the Condition', () => {
    const flow = flowWith([start('s1', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'), condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: 'dc76d30c-c949-5210-9231-2848444c3d42' }, { to: '68c39d16-f241-5c87-ba5b-396054d60783' }), condition('68c39d16-f241-5c87-ba5b-396054d60783', { to: '' }, { stop: true }), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
    expect(reason(linkBlocks(flow, '68c39d16-f241-5c87-ba5b-396054d60783', 'false', 'dc76d30c-c949-5210-9231-2848444c3d42'))).toBe('Only an Agent can be returned to.');
  });

  it('refuses a false route to an earlier Condition', () => {
    const flow = flowWith([
      start('s1', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'),
      condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac' }, { stop: true }),
      agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', '68c39d16-f241-5c87-ba5b-396054d60783'),
      condition('68c39d16-f241-5c87-ba5b-396054d60783', { to: '' }, { stop: true }),
      end('dc76d30c-c949-5210-9231-2848444c3d42'),
    ]);
    expect(reason(linkBlocks(flow, '68c39d16-f241-5c87-ba5b-396054d60783', 'false', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'))).toBe('Only an Agent can be returned to.');
  });
});

describe('F-12 AC-018 a drop on a Start is refused', () => {
  it('refuses a link to a Start from a block that has an output', () => {
    expect(reason(linkBlocks(sampleFlow(), '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'false', 's1'))).toBe('A Start has no input point.');
  });

  it('refuses an Agent next to the Start, which has no input point', () => {
    const flow = flowWith([start('s1', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'), agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', ''), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
    expect(reason(linkBlocks(flow, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'next', 's1'))).toBe('A Start has no input point.');
  });
});

describe('F-12 AC-012 linkBlocks programmer errors throw', () => {
  it('throws for a block id the flow does not have', () => {
    expect(() => linkBlocks(sampleFlow(), 'missing', 'next', 'dc76d30c-c949-5210-9231-2848444c3d42')).toThrow(/has no block missing/);
    expect(() => linkBlocks(sampleFlow(), '69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'next', 'missing')).toThrow(/has no block missing/);
  });

  it('throws for an output the block does not have', () => {
    expect(() => linkBlocks(sampleFlow(), '69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'true', 'dc76d30c-c949-5210-9231-2848444c3d42')).toThrow(/has no true output/);
    expect(() => linkBlocks(sampleFlow(), 'dc76d30c-c949-5210-9231-2848444c3d42', 'next', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')).toThrow(/has no next output/);
  });
});
