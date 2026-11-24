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
    id: 'plan',
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
    start('s1', 'a1'),
    agent('a1', 'c1'),
    condition('c1', { to: 'a2' }, { stop: true }),
    agent('a2', 'e1'),
    end('e1'),
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
    const flow = flowWith([start('s1', 'a1'), agent('a1', ''), agent('a2', ''), end('e1')]);
    expect(blockOf(flowOf(linkBlocks(flow, 'a1', 'next', 'a2')), 'a1')).toMatchObject({ kind: 'agent', next: 'a2' });
  });

  it('sets a Start next to an Agent', () => {
    const flow = flowWith([start('s1', ''), agent('a1', ''), end('e1')]);
    expect(blockOf(flowOf(linkBlocks(flow, 's1', 'next', 'a1')), 's1')).toMatchObject({ next: 'a1' });
  });

  it('sets a Condition true route to a later block with no round limit', () => {
    const flow = flowWith([start('s1', 'c1'), condition('c1', { to: '' }, { stop: true }), agent('a1', ''), end('e1')]);
    const linked = blockOf(flowOf(linkBlocks(flow, 'c1', 'true', 'a1')), 'c1');
    expect(linked).toMatchObject({ true: { to: 'a1' } });
    expect(linked.kind === 'condition' && 'roundLimit' in linked.true).toBe(false);
  });

  it('does not change the input flow', () => {
    const flow = sampleFlow();
    const before = JSON.stringify(flow);
    linkBlocks(flow, 'a2', 'next', 'e1');
    expect(JSON.stringify(flow)).toBe(before);
  });
});

describe('F-12 AC-014 a Start links only to an Agent or a Condition', () => {
  it('refuses a Start to an End with the stories reason', () => {
    const flow = flowWith([start('s1', ''), end('e1')]);
    expect(reason(linkBlocks(flow, 's1', 'next', 'e1'))).toBe('A Start links to an Agent or a Condition.');
  });
});

describe('F-12 AC-015 an output with an arrow and a drop on the block itself are refused', () => {
  it.each<[string, Flow, string, OutputName, string, string]>([
    ['an output that already has an arrow', sampleFlow(), 'a1', 'next', 'a2', 'This block already has an arrow from this point.'],
    ['a Condition true output that already has an arrow', sampleFlow(), 'c1', 'true', 'a2', 'This block already has an arrow from this point.'],
    ['a drop onto the block itself', sampleFlow(), 'a1', 'next', 'a1', 'A block cannot link to itself.'],
  ])('refuses %s', (_name, flow, from, output, target, expected) => {
    expect(reason(linkBlocks(flow, from, output, target))).toBe(expected);
  });

  it('gives the self reason before the arrow reason when both apply', () => {
    expect(reason(linkBlocks(sampleFlow(), 'a1', 'next', 'a1'))).toBe('A block cannot link to itself.');
  });

  it('accepts a link from an output that has no arrow yet', () => {
    const flow = flowWith([start('s1', 'a1'), agent('a1', ''), agent('a2', ''), end('e1')]);
    expect(linkBlocks(flow, 'a1', 'next', 'a2').ok).toBe(true);
  });
});

describe('F-12 AC-016 an Agent output and a true output link only to a later block', () => {
  it('refuses an Agent next to an earlier Agent', () => {
    const flow = flowWith([
      start('s1', 'a1'),
      agent('a1', 'c1'),
      condition('c1', { to: 'a2' }, { stop: true }),
      agent('a2', ''),
      end('e1'),
    ]);
    expect(reason(linkBlocks(flow, 'a2', 'next', 'a1'))).toBe('Only a false route can return to an earlier Agent.');
  });

  it('refuses a Condition true route to an earlier Agent', () => {
    const flow = flowWith([
      start('s1', 'a1'),
      agent('a1', 'c1'),
      condition('c1', { to: '' }, { stop: true }),
      end('e1'),
    ]);
    expect(reason(linkBlocks(flow, 'c1', 'true', 'a1'))).toBe('Only a false route can return to an earlier Agent.');
  });

});

describe('F-12 AC-017 a false route returns to an earlier Agent only', () => {
  it('accepts a false route to a later block with no round limit', () => {
    const flow = flowWith([start('s1', 'c1'), condition('c1', { to: '' }, { stop: true }), agent('a1', ''), end('e1')]);
    expect(blockOf(flowOf(linkBlocks(flow, 'c1', 'false', 'a1')), 'c1')).toMatchObject({ false: { to: 'a1' } });
  });

  it('accepts a false return to an earlier Agent with its round limit unset', () => {
    const flow = flowWith([
      start('s1', 'a1'),
      agent('a1', 'c1'),
      condition('c1', { to: 'a2' }, { stop: true }),
      agent('a2', 'e1'),
      end('e1'),
    ]);
    const linked = blockOf(flowOf(linkBlocks(flow, 'c1', 'false', 'a1')), 'c1');
    expect(linked).toEqual(condition('c1', { to: 'a2' }, { to: 'a1' }));
    expect(linked.kind === 'condition' && 'roundLimit' in linked.false).toBe(false);
  });

  it('refuses a false route to an earlier block that is not an Agent', () => {
    const flow = flowWith([
      start('s1', 'a1'),
      agent('a1', 'c1'),
      condition('c1', { to: 'a2' }, { stop: true }),
      condition('c2', { to: '' }, { stop: true }),
      agent('a2', 'e1'),
      end('e1'),
    ]);
    expect(reason(linkBlocks(flow, 'c2', 'false', 'c1'))).toBe('Only an Agent can be returned to.');
  });

  it('accepts a false route to an End that comes after the Condition in the arrow order', () => {
    const flow = flowWith([start('s1', 'c1'), condition('c1', { to: '' }, { stop: true }), end('e1')]);
    expect(blockOf(flowOf(linkBlocks(flow, 'c1', 'false', 'e1')), 'c1')).toMatchObject({ false: { to: 'e1' } });
  });

  it('F-12 AC-017 refuses a false route to an End the arrow order reaches before the Condition', () => {
    const flow = flowWith([start('s1', 'c1'), condition('c1', { to: 'e1' }, { to: 'c2' }), condition('c2', { to: '' }, { stop: true }), end('e1')]);
    expect(reason(linkBlocks(flow, 'c2', 'false', 'e1'))).toBe('Only an Agent can be returned to.');
  });

  it('refuses a false route to an earlier Condition', () => {
    const flow = flowWith([
      start('s1', 'c1'),
      condition('c1', { to: 'a1' }, { stop: true }),
      agent('a1', 'c2'),
      condition('c2', { to: '' }, { stop: true }),
      end('e1'),
    ]);
    expect(reason(linkBlocks(flow, 'c2', 'false', 'c1'))).toBe('Only an Agent can be returned to.');
  });
});

describe('F-12 AC-018 a drop on a Start is refused', () => {
  it('refuses a link to a Start from a block that has an output', () => {
    expect(reason(linkBlocks(sampleFlow(), 'c1', 'false', 's1'))).toBe('A Start has no input point.');
  });

  it('refuses an Agent next to the Start, which has no input point', () => {
    const flow = flowWith([start('s1', 'a1'), agent('a1', ''), end('e1')]);
    expect(reason(linkBlocks(flow, 'a1', 'next', 's1'))).toBe('A Start has no input point.');
  });
});

describe('F-12 AC-012 linkBlocks programmer errors throw', () => {
  it('throws for a block id the flow does not have', () => {
    expect(() => linkBlocks(sampleFlow(), 'missing', 'next', 'e1')).toThrow(/has no block missing/);
    expect(() => linkBlocks(sampleFlow(), 'a2', 'next', 'missing')).toThrow(/has no block missing/);
  });

  it('throws for an output the block does not have', () => {
    expect(() => linkBlocks(sampleFlow(), 'a2', 'true', 'e1')).toThrow(/has no true output/);
    expect(() => linkBlocks(sampleFlow(), 'e1', 'next', 'a1')).toThrow(/has no next output/);
  });
});
