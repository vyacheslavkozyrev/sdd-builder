import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import {
  emptyOutputText,
  removeBlockArrow,
  repointBlockSource,
  repointBlockTarget,
} from '../src/builder/blockLink.js';
import type { LinkResult } from '../src/builder/blockLink.js';
import { flowArrows } from '../src/builder/blockArrows.js';

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
// Columns: start 0, a1 1, c1 2, a2 3, e1 4. The false route of c1 is a stop.
function sampleFlow(): Flow {
  return flowWith([
    start('17977090-a0e8-5c79-99a4-761c80d9d2a0', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'),
    agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'),
    condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' }, { stop: true }),
    agent('69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'dc76d30c-c949-5210-9231-2848444c3d42'),
    end('dc76d30c-c949-5210-9231-2848444c3d42'),
  ]);
}

function reason(result: LinkResult): string {
  if (result.ok) {
    throw new Error('expected a refusal');
  }
  return result.reason;
}

function flowOf(result: LinkResult): Flow {
  if (!result.ok) {
    throw new Error(`expected an accepted change, got: ${result.reason}`);
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

describe('F-12 AC-019 repointing an arrow target moves the end through the link rules', () => {
  it('moves a true route to another later block and clears the old target', () => {
    const flow = flowOf(repointBlockTarget(sampleFlow(), { fromId: '41c27e6a-36d4-5f15-bbb3-31419251d0ef', output: 'true', toId: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' }, 'dc76d30c-c949-5210-9231-2848444c3d42'));
    expect(blockOf(flow, '41c27e6a-36d4-5f15-bbb3-31419251d0ef')).toMatchObject({ kind: 'condition', true: { to: 'dc76d30c-c949-5210-9231-2848444c3d42' }, false: { stop: true } });
    expect(flowArrows(flow).filter((arrow) => arrow.fromId === '41c27e6a-36d4-5f15-bbb3-31419251d0ef')).toEqual([
      expect.objectContaining({ fromId: '41c27e6a-36d4-5f15-bbb3-31419251d0ef', output: 'true', toId: 'dc76d30c-c949-5210-9231-2848444c3d42' }),
    ]);
  });

  it('leaves the other arrows of the flow unchanged', () => {
    const before = sampleFlow();
    const flow = flowOf(repointBlockTarget(before, { fromId: '41c27e6a-36d4-5f15-bbb3-31419251d0ef', output: 'true', toId: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' }, 'dc76d30c-c949-5210-9231-2848444c3d42'));
    expect(blockOf(flow, '17977090-a0e8-5c79-99a4-761c80d9d2a0')).toEqual(blockOf(before, '17977090-a0e8-5c79-99a4-761c80d9d2a0'));
    expect(blockOf(flow, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')).toEqual(blockOf(before, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'));
    expect(blockOf(flow, '69c3afc7-4cfe-5c94-9ade-932204fe9cce')).toEqual(blockOf(before, '69c3afc7-4cfe-5c94-9ade-932204fe9cce'));
  });

  it('accepts a repoint onto the same target', () => {
    const before = sampleFlow();
    const flow = flowOf(repointBlockTarget(before, { fromId: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', output: 'next', toId: '41c27e6a-36d4-5f15-bbb3-31419251d0ef' }, '41c27e6a-36d4-5f15-bbb3-31419251d0ef'));
    expect(blockOf(flow, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')).toMatchObject({ kind: 'agent', next: '41c27e6a-36d4-5f15-bbb3-31419251d0ef' });
  });

  it('refuses a target that is the source block and keeps the flow as it was', () => {
    const before = sampleFlow();
    const snapshot = structuredClone(before);
    const result = repointBlockTarget(before, { fromId: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', output: 'next', toId: '41c27e6a-36d4-5f15-bbb3-31419251d0ef' }, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac');
    expect(reason(result)).toBe('A block cannot link to itself.');
    expect(before).toEqual(snapshot);
  });

  it('refuses a target that has no input point, as the link rules do', () => {
    const result = repointBlockTarget(sampleFlow(), { fromId: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', output: 'next', toId: '41c27e6a-36d4-5f15-bbb3-31419251d0ef' }, '17977090-a0e8-5c79-99a4-761c80d9d2a0');
    expect(reason(result)).toBe('A Start has no input point.');
  });

  it('refuses a return from an Agent output and keeps the flow as it was', () => {
    const before = sampleFlow();
    const snapshot = structuredClone(before);
    const result = repointBlockTarget(before, { fromId: '69c3afc7-4cfe-5c94-9ade-932204fe9cce', output: 'next', toId: 'dc76d30c-c949-5210-9231-2848444c3d42' }, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac');
    expect(reason(result)).toBe('Only a false route can return to an earlier Agent.');
    expect(before).toEqual(snapshot);
  });

  it('refuses a return from a true output', () => {
    const result = repointBlockTarget(sampleFlow(), { fromId: '41c27e6a-36d4-5f15-bbb3-31419251d0ef', output: 'true', toId: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' }, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac');
    expect(reason(result)).toBe('Only a false route can return to an earlier Agent.');
  });

  it('throws for an arrow that is not in the flow', () => {
    expect(() => repointBlockTarget(sampleFlow(), { fromId: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', output: 'next', toId: 'dc76d30c-c949-5210-9231-2848444c3d42' }, '41c27e6a-36d4-5f15-bbb3-31419251d0ef')).toThrow(
      /no next arrow from cc968016-8ddb-5a20-94ad-2b6f1f4b5fac to dc76d30c-c949-5210-9231-2848444c3d42/,
    );
  });
});

describe('F-12 AC-019 repointing an arrow source moves its start through the link rules', () => {
  // Start to Agent a1, a1 to End e1; a2 has no route yet.
  function startFlow(): Flow {
    return flowWith([start('17977090-a0e8-5c79-99a4-761c80d9d2a0', 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac'), agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'dc76d30c-c949-5210-9231-2848444c3d42'), agent('69c3afc7-4cfe-5c94-9ade-932204fe9cce', ''), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
  }

  it('moves the arrow to a free output and clears the old output', () => {
    const flow = flowOf(repointBlockSource(startFlow(), { fromId: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', output: 'next', toId: 'dc76d30c-c949-5210-9231-2848444c3d42' }, '69c3afc7-4cfe-5c94-9ade-932204fe9cce', 'next'));
    expect(blockOf(flow, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')).toMatchObject({ kind: 'agent', next: '' });
    expect(blockOf(flow, '69c3afc7-4cfe-5c94-9ade-932204fe9cce')).toMatchObject({ kind: 'agent', next: 'dc76d30c-c949-5210-9231-2848444c3d42' });
    expect(blockOf(flow, '17977090-a0e8-5c79-99a4-761c80d9d2a0')).toMatchObject({ kind: 'start', next: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac' });
  });

  it('refuses a new source output that already has an arrow and keeps the flow as it was', () => {
    const before = sampleFlow();
    const snapshot = structuredClone(before);
    const result = repointBlockSource(before, { fromId: '41c27e6a-36d4-5f15-bbb3-31419251d0ef', output: 'true', toId: '69c3afc7-4cfe-5c94-9ade-932204fe9cce' }, '17977090-a0e8-5c79-99a4-761c80d9d2a0', 'next');
    expect(reason(result)).toBe('This block already has an arrow from this point.');
    expect(before).toEqual(snapshot);
  });

  it('refuses a Start source linked to an End, as the link rules do', () => {
    const result = repointBlockSource(startFlow(), { fromId: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', output: 'next', toId: 'dc76d30c-c949-5210-9231-2848444c3d42' }, '17977090-a0e8-5c79-99a4-761c80d9d2a0', 'next');
    expect(reason(result)).toBe('A Start links to an Agent or a Condition.');
  });

  it('throws when the new source output does not exist on its block', () => {
    expect(() => repointBlockSource(startFlow(), { fromId: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', output: 'next', toId: 'dc76d30c-c949-5210-9231-2848444c3d42' }, 'dc76d30c-c949-5210-9231-2848444c3d42', 'next')).toThrow(
      /has no next output/,
    );
  });

  it('throws for an arrow that is not in the flow', () => {
    expect(() => repointBlockSource(startFlow(), { fromId: '69c3afc7-4cfe-5c94-9ade-932204fe9cce', output: 'next', toId: 'dc76d30c-c949-5210-9231-2848444c3d42' }, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'next')).toThrow(
      /no next arrow from 69c3afc7-4cfe-5c94-9ade-932204fe9cce to dc76d30c-c949-5210-9231-2848444c3d42/,
    );
  });
});

describe('F-12 AC-021 Delete connection clears the source output', () => {
  it('empties an Agent next', () => {
    const flow = removeBlockArrow(sampleFlow(), 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'next');
    expect(blockOf(flow, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')).toMatchObject({ kind: 'agent', next: '' });
    expect(flowArrows(flow).some((arrow) => arrow.fromId === 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac')).toBe(false);
  });

  it('empties a Start next', () => {
    const flow = removeBlockArrow(sampleFlow(), '17977090-a0e8-5c79-99a4-761c80d9d2a0', 'next');
    expect(blockOf(flow, '17977090-a0e8-5c79-99a4-761c80d9d2a0')).toMatchObject({ kind: 'start', next: '' });
  });

  it('empties a true route to no target', () => {
    const flow = removeBlockArrow(sampleFlow(), '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'true');
    expect(blockOf(flow, '41c27e6a-36d4-5f15-bbb3-31419251d0ef')).toMatchObject({ kind: 'condition', true: { to: '' } });
  });

  it('sets a false route to stop, so the false output reads as the default', () => {
    const flow = removeBlockArrow(
      flowWith([start('17977090-a0e8-5c79-99a4-761c80d9d2a0', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'), condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac' }, { to: 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', roundLimit: 2 }), agent('cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'dc76d30c-c949-5210-9231-2848444c3d42'), end('dc76d30c-c949-5210-9231-2848444c3d42')]),
      '41c27e6a-36d4-5f15-bbb3-31419251d0ef',
      'false',
    );
    expect(blockOf(flow, '41c27e6a-36d4-5f15-bbb3-31419251d0ef')).toMatchObject({ kind: 'condition', false: { stop: true } });
  });

  it('leaves the other arrows and blocks unchanged', () => {
    const before = sampleFlow();
    const flow = removeBlockArrow(before, 'cc968016-8ddb-5a20-94ad-2b6f1f4b5fac', 'next');
    expect(blockOf(flow, '17977090-a0e8-5c79-99a4-761c80d9d2a0')).toEqual(blockOf(before, '17977090-a0e8-5c79-99a4-761c80d9d2a0'));
    expect(blockOf(flow, '41c27e6a-36d4-5f15-bbb3-31419251d0ef')).toEqual(blockOf(before, '41c27e6a-36d4-5f15-bbb3-31419251d0ef'));
    expect(blockOf(flow, '69c3afc7-4cfe-5c94-9ade-932204fe9cce')).toEqual(blockOf(before, '69c3afc7-4cfe-5c94-9ade-932204fe9cce'));
  });

  it('does not change its input', () => {
    const before = sampleFlow();
    const snapshot = structuredClone(before);
    removeBlockArrow(before, '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'true');
    expect(before).toEqual(snapshot);
  });

  it('throws for an End, which has no output', () => {
    expect(() => removeBlockArrow(sampleFlow(), 'dc76d30c-c949-5210-9231-2848444c3d42', 'next')).toThrow(/has no next output/);
  });

  it('throws for a block the flow does not have', () => {
    expect(() => removeBlockArrow(sampleFlow(), 'f3e6232e-93aa-572e-b8f6-2aa47177dd3d', 'next')).toThrow(/flow ea3211a4-b64b-5204-9451-6fe12fd7c655 has no block f3e6232e-93aa-572e-b8f6-2aa47177dd3d/);
  });
});

describe('F-12 AC-020 the read-only meaning of an output with no arrow', () => {
  it('reads a false output with no arrow as stop and ask the user', () => {
    expect(emptyOutputText('false')).toBe('Stop the flow and ask the user');
  });

  it('reads a true output and a next output with no arrow as no arrow yet', () => {
    expect(emptyOutputText('true')).toBe('No arrow yet');
    expect(emptyOutputText('next')).toBe('No arrow yet');
  });

  it('leaves the true output with no arrow after Delete connection, so it reads as no arrow yet', () => {
    const flow = removeBlockArrow(sampleFlow(), '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'true');
    expect(flowArrows(flow).some((arrow) => arrow.fromId === '41c27e6a-36d4-5f15-bbb3-31419251d0ef' && arrow.output === 'true')).toBe(false);
  });
});
