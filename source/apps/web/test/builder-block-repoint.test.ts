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
// Columns: start 0, a1 1, c1 2, a2 3, e1 4. The false route of c1 is a stop.
function sampleFlow(): Flow {
  return flowWith([
    start('s1', 'a1'),
    agent('a1', 'c1'),
    condition('c1', { to: 'a2' }, { stop: true }),
    agent('a2', 'e1'),
    end('e1'),
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
    const flow = flowOf(repointBlockTarget(sampleFlow(), { fromId: 'c1', output: 'true', toId: 'a2' }, 'e1'));
    expect(blockOf(flow, 'c1')).toMatchObject({ kind: 'condition', true: { to: 'e1' }, false: { stop: true } });
    expect(flowArrows(flow).filter((arrow) => arrow.fromId === 'c1')).toEqual([
      expect.objectContaining({ fromId: 'c1', output: 'true', toId: 'e1' }),
    ]);
  });

  it('leaves the other arrows of the flow unchanged', () => {
    const before = sampleFlow();
    const flow = flowOf(repointBlockTarget(before, { fromId: 'c1', output: 'true', toId: 'a2' }, 'e1'));
    expect(blockOf(flow, 's1')).toEqual(blockOf(before, 's1'));
    expect(blockOf(flow, 'a1')).toEqual(blockOf(before, 'a1'));
    expect(blockOf(flow, 'a2')).toEqual(blockOf(before, 'a2'));
  });

  it('accepts a repoint onto the same target', () => {
    const before = sampleFlow();
    const flow = flowOf(repointBlockTarget(before, { fromId: 'a1', output: 'next', toId: 'c1' }, 'c1'));
    expect(blockOf(flow, 'a1')).toMatchObject({ kind: 'agent', next: 'c1' });
  });

  it('refuses a target that is the source block and keeps the flow as it was', () => {
    const before = sampleFlow();
    const snapshot = structuredClone(before);
    const result = repointBlockTarget(before, { fromId: 'a1', output: 'next', toId: 'c1' }, 'a1');
    expect(reason(result)).toBe('A block cannot link to itself.');
    expect(before).toEqual(snapshot);
  });

  it('refuses a target that has no input point, as the link rules do', () => {
    const result = repointBlockTarget(sampleFlow(), { fromId: 'a1', output: 'next', toId: 'c1' }, 's1');
    expect(reason(result)).toBe('A Start has no input point.');
  });

  it('refuses a return from an Agent output and keeps the flow as it was', () => {
    const before = sampleFlow();
    const snapshot = structuredClone(before);
    const result = repointBlockTarget(before, { fromId: 'a2', output: 'next', toId: 'e1' }, 'a1');
    expect(reason(result)).toBe('Only a false route can return to an earlier Agent.');
    expect(before).toEqual(snapshot);
  });

  it('refuses a return from a true output', () => {
    const result = repointBlockTarget(sampleFlow(), { fromId: 'c1', output: 'true', toId: 'a2' }, 'a1');
    expect(reason(result)).toBe('Only a false route can return to an earlier Agent.');
  });

  it('throws for an arrow that is not in the flow', () => {
    expect(() => repointBlockTarget(sampleFlow(), { fromId: 'a1', output: 'next', toId: 'e1' }, 'c1')).toThrow(
      /no next arrow from a1 to e1/,
    );
  });
});

describe('F-12 AC-019 repointing an arrow source moves its start through the link rules', () => {
  // Start to Agent a1, a1 to End e1; a2 has no route yet.
  function startFlow(): Flow {
    return flowWith([start('s1', 'a1'), agent('a1', 'e1'), agent('a2', ''), end('e1')]);
  }

  it('moves the arrow to a free output and clears the old output', () => {
    const flow = flowOf(repointBlockSource(startFlow(), { fromId: 'a1', output: 'next', toId: 'e1' }, 'a2', 'next'));
    expect(blockOf(flow, 'a1')).toMatchObject({ kind: 'agent', next: '' });
    expect(blockOf(flow, 'a2')).toMatchObject({ kind: 'agent', next: 'e1' });
    expect(blockOf(flow, 's1')).toMatchObject({ kind: 'start', next: 'a1' });
  });

  it('refuses a new source output that already has an arrow and keeps the flow as it was', () => {
    const before = sampleFlow();
    const snapshot = structuredClone(before);
    const result = repointBlockSource(before, { fromId: 'c1', output: 'true', toId: 'a2' }, 's1', 'next');
    expect(reason(result)).toBe('This block already has an arrow from this point.');
    expect(before).toEqual(snapshot);
  });

  it('refuses a Start source linked to an End, as the link rules do', () => {
    const result = repointBlockSource(startFlow(), { fromId: 'a1', output: 'next', toId: 'e1' }, 's1', 'next');
    expect(reason(result)).toBe('A Start links to an Agent or a Condition.');
  });

  it('throws when the new source output does not exist on its block', () => {
    expect(() => repointBlockSource(startFlow(), { fromId: 'a1', output: 'next', toId: 'e1' }, 'e1', 'next')).toThrow(
      /has no next output/,
    );
  });

  it('throws for an arrow that is not in the flow', () => {
    expect(() => repointBlockSource(startFlow(), { fromId: 'a2', output: 'next', toId: 'e1' }, 'a1', 'next')).toThrow(
      /no next arrow from a2 to e1/,
    );
  });
});

describe('F-12 AC-021 Delete connection clears the source output', () => {
  it('empties an Agent next', () => {
    const flow = removeBlockArrow(sampleFlow(), 'a1', 'next');
    expect(blockOf(flow, 'a1')).toMatchObject({ kind: 'agent', next: '' });
    expect(flowArrows(flow).some((arrow) => arrow.fromId === 'a1')).toBe(false);
  });

  it('empties a Start next', () => {
    const flow = removeBlockArrow(sampleFlow(), 's1', 'next');
    expect(blockOf(flow, 's1')).toMatchObject({ kind: 'start', next: '' });
  });

  it('empties a true route to no target', () => {
    const flow = removeBlockArrow(sampleFlow(), 'c1', 'true');
    expect(blockOf(flow, 'c1')).toMatchObject({ kind: 'condition', true: { to: '' } });
  });

  it('sets a false route to stop, so the false output reads as the default', () => {
    const flow = removeBlockArrow(
      flowWith([start('s1', 'c1'), condition('c1', { to: 'a1' }, { to: 'a1', roundLimit: 2 }), agent('a1', 'e1'), end('e1')]),
      'c1',
      'false',
    );
    expect(blockOf(flow, 'c1')).toMatchObject({ kind: 'condition', false: { stop: true } });
  });

  it('leaves the other arrows and blocks unchanged', () => {
    const before = sampleFlow();
    const flow = removeBlockArrow(before, 'a1', 'next');
    expect(blockOf(flow, 's1')).toEqual(blockOf(before, 's1'));
    expect(blockOf(flow, 'c1')).toEqual(blockOf(before, 'c1'));
    expect(blockOf(flow, 'a2')).toEqual(blockOf(before, 'a2'));
  });

  it('does not change its input', () => {
    const before = sampleFlow();
    const snapshot = structuredClone(before);
    removeBlockArrow(before, 'c1', 'true');
    expect(before).toEqual(snapshot);
  });

  it('throws for an End, which has no output', () => {
    expect(() => removeBlockArrow(sampleFlow(), 'e1', 'next')).toThrow(/has no next output/);
  });

  it('throws for a block the flow does not have', () => {
    expect(() => removeBlockArrow(sampleFlow(), 'ghost', 'next')).toThrow(/flow plan has no block ghost/);
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
    const flow = removeBlockArrow(sampleFlow(), 'c1', 'true');
    expect(flowArrows(flow).some((arrow) => arrow.fromId === 'c1' && arrow.output === 'true')).toBe(false);
  });
});
