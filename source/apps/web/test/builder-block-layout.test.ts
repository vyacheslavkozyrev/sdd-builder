import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { blockLayout, countLine } from '../src/builder/blockLayout.js';

type Flow = model.Flow;
type Block = model.Block;

// A flow with the required fields only and the given blocks.
function flowWith(blocks: readonly Block[] = []): Flow {
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

function start(id: string, next: string, index = 0): Block {
  return { index, id, kind: 'start', next };
}

function agent(id: string, next: string, index = 0): Block {
  return { index, id, kind: 'agent', name: id, description: '', arguments: [], next };
}

function condition(
  id: string,
  trueTo: string,
  falseRoute: { to: string } | { to: string; roundLimit: number } | { stop: true },
  index = 0,
): Block {
  return { index, id, kind: 'condition', description: 'Check.', true: { to: trueTo }, false: falseRoute };
}

function end(id: string, index = 0): Block {
  return { index, id, kind: 'end', outcome: 'done', producedArtifact: '' };
}

// The block ids in column order.
function order(blocks: readonly Block[]): string[] {
  return blockLayout(flowWith(blocks)).places.map((place) => place.blockId);
}

describe('F-12 AC-006 an empty flow', () => {
  it('F-12 AC-006 gives no places for a flow with no blocks', () => {
    const layout = blockLayout(flowWith());
    expect(layout.places).toEqual([]);
    expect(layout.agents).toBe(0);
    expect(layout.conditions).toBe(0);
  });
});

describe('F-12 AC-009 block order on the canvas', () => {
  it('F-12 AC-009 lists the blocks in list order when the flow has no Start', () => {
    expect(order([agent('block-1', ''), end('block-2', 1)])).toEqual(['block-1', 'block-2']);
  });

  it('F-12 AC-009 places a chain from Start in arrow order, whatever the list order', () => {
    const blocks = [
      end('block-3', 2),
      agent('block-2', 'block-3', 1),
      start('block-1', 'block-2'),
    ];
    expect(order(blocks)).toEqual(['block-1', 'block-2', 'block-3']);
  });

  it('F-12 AC-009 places the true branch before the false branch of a Condition', () => {
    const blocks = [
      end('block-4', 3),
      agent('block-3', 'block-4', 2),
      condition('block-2', 'block-3', { to: 'block-4' }, 1),
      start('block-1', 'block-2', 0),
    ];
    expect(order(blocks)).toEqual(['block-1', 'block-2', 'block-3', 'block-4']);
  });

  it('F-12 AC-009 does not repeat a block that a return arrow points back to', () => {
    const blocks = [
      start('block-1', 'block-2'),
      agent('block-2', 'block-3', 1),
      condition('block-3', 'block-4', { to: 'block-2', roundLimit: 3 }, 2),
      end('block-4', 3),
    ];
    expect(order(blocks)).toEqual(['block-1', 'block-2', 'block-3', 'block-4']);
  });

  it('F-12 AC-009 places blocks not reached from Start after the chain, in list order', () => {
    const blocks = [
      agent('block-5', ''),
      start('block-1', 'block-2'),
      end('block-2', 1),
      agent('block-4', ''),
    ];
    expect(order(blocks)).toEqual(['block-1', 'block-2', 'block-5', 'block-4']);
  });

  it('F-12 AC-009 skips an arrow to a block that is not in the flow', () => {
    const blocks = [start('block-1', 'block-9'), end('block-2', 1)];
    expect(order(blocks)).toEqual(['block-1', 'block-2']);
  });

  it('F-12 AC-009 gives the same columns for the same blocks', () => {
    const blocks = [
      start('block-1', 'block-2'),
      condition('block-2', 'block-3', { stop: true }, 1),
      agent('block-3', 'block-4', 2),
      end('block-4', 3),
      agent('block-5', '', 4),
    ];
    expect(blockLayout(flowWith(blocks))).toEqual(blockLayout(flowWith(blocks)));
  });

  it('F-12 AC-009 gives each block its own column from 0 with no gaps', () => {
    const blocks = [start('block-1', 'block-2'), end('block-2', 1), agent('block-3', '', 2)];
    const columns = blockLayout(flowWith(blocks)).places.map((place) => place.column);
    expect(columns).toEqual([0, 1, 2]);
  });
});

describe('F-12 AC-010 the count line', () => {
  it('F-12 AC-010 counts the Agents and Conditions of the flow', () => {
    const blocks = [
      start('block-1', 'block-2'),
      agent('block-2', 'block-3', 1),
      condition('block-3', 'block-4', { stop: true }, 2),
      agent('block-4', 'block-5', 3),
      condition('block-5', '', { stop: true }, 4),
      end('block-6', 5),
    ];
    const layout = blockLayout(flowWith(blocks));
    expect(layout.agents).toBe(2);
    expect(layout.conditions).toBe(2);
    expect(countLine(layout)).toBe('2 Agents, 2 Conditions');
  });

  it('F-12 AC-010 reads "0 Agents, 0 Conditions" with no Agent and no Condition', () => {
    expect(countLine(blockLayout(flowWith([start('block-1', ''), end('block-2', 1)])))).toBe(
      '0 Agents, 0 Conditions',
    );
    expect(countLine(blockLayout(flowWith()))).toBe('0 Agents, 0 Conditions');
  });
});
