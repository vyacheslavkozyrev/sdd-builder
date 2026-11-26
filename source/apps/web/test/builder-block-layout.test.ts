import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { blockLayout, countLine } from '../src/builder/blockLayout.js';

type Flow = model.Flow;
type Block = model.Block;

// A flow with the required fields only and the given blocks.
function flowWith(blocks: readonly Block[] = []): Flow {
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
    expect(order([agent('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', ''), end('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 1)])).toEqual(['b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa']);
  });

  it('F-12 AC-009 places a chain from Start in arrow order, whatever the list order', () => {
    const blocks = [
      end('c2b443aa-3d75-5a54-8874-426073a3fc41', 2),
      agent('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41', 1),
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'),
    ];
    expect(order(blocks)).toEqual(['b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41']);
  });

  it('F-12 AC-009 places the true branch before the false branch of a Condition', () => {
    const blocks = [
      end('bf4df531-9a24-5612-8519-d9ed8b883586', 3),
      agent('c2b443aa-3d75-5a54-8874-426073a3fc41', 'bf4df531-9a24-5612-8519-d9ed8b883586', 2),
      condition('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41', { to: 'bf4df531-9a24-5612-8519-d9ed8b883586' }, 1),
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa', 0),
    ];
    expect(order(blocks)).toEqual(['b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'bf4df531-9a24-5612-8519-d9ed8b883586']);
  });

  it('F-12 AC-009 does not repeat a block that a return arrow points back to', () => {
    const blocks = [
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'),
      agent('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41', 1),
      condition('c2b443aa-3d75-5a54-8874-426073a3fc41', 'bf4df531-9a24-5612-8519-d9ed8b883586', { to: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', roundLimit: 3 }, 2),
      end('bf4df531-9a24-5612-8519-d9ed8b883586', 3),
    ];
    expect(order(blocks)).toEqual(['b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'bf4df531-9a24-5612-8519-d9ed8b883586']);
  });

  it('F-12 AC-009 places blocks not reached from Start after the chain, in list order, and the End last', () => {
    const blocks = [
      agent('e16161f1-7b73-5ebe-9460-7b20e20c1910', ''),
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'),
      end('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 1),
      agent('bf4df531-9a24-5612-8519-d9ed8b883586', ''),
    ];
    expect(order(blocks)).toEqual(['b37d90e6-d1ca-536d-9a73-4137aeec6b9b', 'e16161f1-7b73-5ebe-9460-7b20e20c1910', 'bf4df531-9a24-5612-8519-d9ed8b883586', '3c045e8c-3b6a-5804-b19c-75424d4e43aa']);
  });

  it('F-12 AC-009 places the End after the blocks an arrow reaches past it, so no arrow runs through it', () => {
    // start -> planner -> End; the reviewer is open, so the planner's arrow to the reviewer would pass the End.
    const blocks = [
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'),
      agent('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'bf4df531-9a24-5612-8519-d9ed8b883586', 1),
      end('bf4df531-9a24-5612-8519-d9ed8b883586', 2),
      agent('c2b443aa-3d75-5a54-8874-426073a3fc41', '', 3),
    ];
    expect(order(blocks)).toEqual(['b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'bf4df531-9a24-5612-8519-d9ed8b883586']);
  });

  it('F-12 AC-009 keeps the order of several End blocks among themselves, after every other block', () => {
    // Arrow order: block-1, block-2, then the Condition's true End block-5 and false End block-3;
    // the unreached End block-4 follows in list order. The unreached Agent block-6 is listed before
    // the Ends, so it must still come before every End, reached or not.
    const blocks = [
      end('bf4df531-9a24-5612-8519-d9ed8b883586', 0),
      agent('f35c40c7-527e-5019-b871-442a62086a93', '', 1),
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'),
      condition('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'e16161f1-7b73-5ebe-9460-7b20e20c1910', { to: 'c2b443aa-3d75-5a54-8874-426073a3fc41' }, 2),
      end('c2b443aa-3d75-5a54-8874-426073a3fc41', 3),
      end('e16161f1-7b73-5ebe-9460-7b20e20c1910', 4),
    ];
    expect(order(blocks)).toEqual(['b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'f35c40c7-527e-5019-b871-442a62086a93', 'e16161f1-7b73-5ebe-9460-7b20e20c1910', 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'bf4df531-9a24-5612-8519-d9ed8b883586']);
  });

  it('F-12 AC-009 skips an arrow to a block that is not in the flow', () => {
    const blocks = [start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', 'e7e460f1-2436-540b-a6bb-31ed944a43fe'), end('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 1)];
    expect(order(blocks)).toEqual(['b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa']);
  });

  it('F-12 AC-009 gives the same columns for the same blocks', () => {
    const blocks = [
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'),
      condition('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41', { stop: true }, 1),
      agent('c2b443aa-3d75-5a54-8874-426073a3fc41', 'bf4df531-9a24-5612-8519-d9ed8b883586', 2),
      end('bf4df531-9a24-5612-8519-d9ed8b883586', 3),
      agent('e16161f1-7b73-5ebe-9460-7b20e20c1910', '', 4),
    ];
    expect(blockLayout(flowWith(blocks))).toEqual(blockLayout(flowWith(blocks)));
  });

  it('F-12 AC-009 gives each block its own column from 0 with no gaps', () => {
    const blocks = [start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'), end('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 1), agent('c2b443aa-3d75-5a54-8874-426073a3fc41', '', 2)];
    const columns = blockLayout(flowWith(blocks)).places.map((place) => place.column);
    expect(columns).toEqual([0, 1, 2]);
  });
});

describe('F-12 AC-010 the count line', () => {
  it('F-12 AC-010 counts the Agents and Conditions of the flow', () => {
    const blocks = [
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'),
      agent('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41', 1),
      condition('c2b443aa-3d75-5a54-8874-426073a3fc41', 'bf4df531-9a24-5612-8519-d9ed8b883586', { stop: true }, 2),
      agent('bf4df531-9a24-5612-8519-d9ed8b883586', 'e16161f1-7b73-5ebe-9460-7b20e20c1910', 3),
      condition('e16161f1-7b73-5ebe-9460-7b20e20c1910', '', { stop: true }, 4),
      end('f35c40c7-527e-5019-b871-442a62086a93', 5),
    ];
    const layout = blockLayout(flowWith(blocks));
    expect(layout.agents).toBe(2);
    expect(layout.conditions).toBe(2);
    expect(countLine(layout)).toBe('2 Agents, 2 Conditions');
  });

  it('F-12 AC-010 reads "0 Agents, 0 Conditions" with no Agent and no Condition', () => {
    expect(countLine(blockLayout(flowWith([start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', ''), end('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 1)])))).toBe(
      '0 Agents, 0 Conditions',
    );
    expect(countLine(blockLayout(flowWith()))).toBe('0 Agents, 0 Conditions');
  });
});
