import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { addBlock, canAddStart, nextBlockId } from '../src/builder/blocks.js';
import type { BlockKind } from '../src/builder/blocks.js';

type Flow = model.Flow;
type Block = model.Block;

// A flow with the required fields only and the given blocks.
function flowWith(id: string, blocks: readonly Block[] = []): Flow {
  return {
    index: 0,
    id,
    name: id,
    arguments: [],
    body: 'Do the work.',
    artifacts: [],
    approval: false,
    blocks,
  };
}

function startBlock(id: string, index: number): Block {
  return { index, id, kind: 'start', next: '' };
}

function endBlock(id: string, index: number): Block {
  return { index, id, kind: 'end', outcome: 'done', producedArtifact: '' };
}

describe('F-12 AC-002 adding a block', () => {
  it.each<BlockKind>(['agent', 'condition', 'end'])(
    'F-12 AC-002 adds one new %s block with no arrows to the flow',
    (kind) => {
      const before = flowWith('plan', [startBlock('block-1', 0)]);
      const result = addBlock(before, kind, [before]);
      expect(result.flow.blocks).toHaveLength(2);
      const added = result.flow.blocks[1];
      expect(added?.kind).toBe(kind);
      expect(added?.id).toBe(result.blockId);
    },
  );

  it('F-12 (no criterion: Verify device fix 2026-11-24) puts a non-End block before the flow\'s Ends and an End at the end', () => {
    const withEnd = flowWith('plan', [startBlock('block-1', 0), endBlock('block-2', 1)]);
    const condition = addBlock(withEnd, 'condition', [withEnd]);
    expect(condition.flow.blocks.map((block) => block.kind)).toEqual(['start', 'condition', 'end']);
    expect(condition.flow.blocks.map((block) => block.index)).toEqual([0, 1, 2]);
    expect(condition.flow.blocks[2]).toEqual({ ...withEnd.blocks[1], index: 2 });

    const end = addBlock(condition.flow, 'end', [condition.flow]);
    expect(end.flow.blocks.map((block) => block.kind)).toEqual(['start', 'condition', 'end', 'end']);
    expect(end.flow.blocks.map((block) => block.index)).toEqual([0, 1, 2, 3]);
  });

  it('F-12 AC-002 adds a Start to an empty flow', () => {
    const result = addBlock(flowWith('plan'), 'start', [flowWith('plan')]);
    expect(result.flow.blocks).toEqual([{ index: 0, id: 'block-1', kind: 'start', next: '' }]);
    expect(result.blockId).toBe('block-1');
  });

  it('F-12 AC-002 gives an Agent blank fields and an empty next', () => {
    const result = addBlock(flowWith('plan'), 'agent', [flowWith('plan')]);
    expect(result.flow.blocks[0]).toEqual({
      index: 0,
      id: 'block-1',
      kind: 'agent',
      name: '',
      description: '',
      arguments: [],
      next: '',
    });
  });

  it('F-12 AC-002 gives a Condition blank fields, an empty true route and a stop false route', () => {
    const result = addBlock(flowWith('plan'), 'condition', [flowWith('plan')]);
    expect(result.flow.blocks[0]).toEqual({
      index: 0,
      id: 'block-1',
      kind: 'condition',
      description: '',
      true: { to: '' },
      false: { stop: true },
    });
  });

  it('F-12 AC-002 gives an End the outcome done and no produced artifact', () => {
    const result = addBlock(flowWith('plan'), 'end', [flowWith('plan')]);
    expect(result.flow.blocks[0]).toEqual({
      index: 0,
      id: 'block-1',
      kind: 'end',
      outcome: 'done',
      producedArtifact: '',
    });
  });

  it('F-12 AC-002 adds an Agent before the flow\'s End, and the blocks take their positions as index', () => {
    const before = flowWith('plan', [startBlock('block-1', 0), endBlock('block-2', 4)]);
    const result = addBlock(before, 'agent', [before]);
    expect(result.flow.blocks.map((block) => block.id)).toEqual(['block-1', 'block-3', 'block-2']);
    expect(result.flow.blocks.map((block) => block.index)).toEqual([0, 1, 2]);
  });

  it('F-12 AC-002 does not change the flow it was given', () => {
    const before = flowWith('plan', [startBlock('block-1', 0)]);
    addBlock(before, 'end', [before]);
    expect(before.blocks).toHaveLength(1);
  });

  it('F-12 AC-003 throws for a second Start, a programmer error the toolbox prevents', () => {
    const before = flowWith('plan', [startBlock('block-1', 0)]);
    expect(() => addBlock(before, 'start', [before])).toThrow(/already has a Start/);
  });
});

describe('F-12 AC-003 Start is offered once per flow', () => {
  it.each<[string, readonly Block[], boolean]>([
    ['an empty flow', [], true],
    [
      'a flow with an Agent only',
      [{ index: 0, id: 'block-1', kind: 'agent', name: 'a', description: 'd', arguments: [], next: '' }],
      true,
    ],
    ['a flow with a Start', [startBlock('block-1', 0)], false],
    ['a flow with a Start and an End', [startBlock('block-1', 0), endBlock('block-2', 1)], false],
  ])('F-12 AC-003 canAddStart for %s is %s', (_label, blocks, expected) => {
    expect(canAddStart(flowWith('plan', blocks))).toBe(expected);
  });
});

describe('F-12 AC-004 block ids', () => {
  it.each<[string, readonly Block[], string]>([
    ['an empty flow', [], 'block-1'],
    ['block-1 taken', [startBlock('block-1', 0)], 'block-2'],
    ['block-2 taken and block-1 free', [endBlock('block-2', 0)], 'block-1'],
    ['block-1 and block-2 taken', [startBlock('block-1', 0), endBlock('block-2', 1)], 'block-3'],
    ['block-1 and block-3 taken', [startBlock('block-1', 0), endBlock('block-3', 1)], 'block-2'],
  ])('F-12 AC-004 gives the lowest free id for %s', (_label, blocks, expected) => {
    expect(nextBlockId([flowWith('plan', blocks)])).toBe(expected);
  });

  it('F-12 AC-004 a block id is unique within its flow after several adds', () => {
    let flow = flowWith('plan');
    for (const kind of ['agent', 'condition', 'end', 'agent'] as const) {
      flow = addBlock(flow, kind, [flow]).flow;
    }
    const ids = flow.blocks.map((block) => block.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['block-1', 'block-2', 'block-4', 'block-3']);
  });
});

describe('F-12 AC-005 adding a block stays in its flow', () => {
  it('F-12 AC-005 adds the block to its own flow and leaves the other flow unchanged', () => {
    const other = flowWith('review', [startBlock('block-1', 0), endBlock('block-2', 1)]);
    const target = flowWith('plan', [startBlock('block-1', 0)]);
    const added = addBlock(target, 'agent', [target, other]);
    expect(added.flow.id).toBe('plan');
    expect(added.blockId).toBe('block-3');
    expect(other.blocks).toEqual([startBlock('block-1', 0), endBlock('block-2', 1)]);
  });
});

// Every block id of the given flows, in order.
function idsOf(flows: readonly Flow[]): string[] {
  return flows.flatMap((flow) => flow.blocks.map((block) => block.id));
}

// The flows with the one of the given id replaced.
function withFlow(flows: readonly Flow[], next: Flow): Flow[] {
  return flows.map((flow) => (flow.id === next.id ? next : flow));
}

// The flows with a block of the kind added to the flow at the given position.
function addAt(flows: readonly Flow[], position: number, kind: BlockKind): Flow[] {
  return flows.map((flow, index) => (index === position ? addBlock(flow, kind, flows).flow : flow));
}

describe('F-16 AC-021 block ids are unique across the pipeline', () => {
  it('F-16 AC-021 gives a block added to a second flow an id no block of any flow has', () => {
    const specify = flowWith('specify', [startBlock('block-1', 0), endBlock('block-3', 1)]);
    const build = flowWith('build');
    const added = addBlock(build, 'agent', [specify, build]);
    expect(idsOf([specify, build])).not.toContain(added.blockId);
    expect(added.blockId).toBe('block-2');
  });

  it('F-16 AC-021 counts the ids of the flow itself when the flow list leaves it out', () => {
    const build = flowWith('build', [startBlock('block-1', 0)]);
    const other = flowWith('specify', [endBlock('block-2', 0)]);
    expect(addBlock(build, 'agent', [other]).blockId).toBe('block-3');
  });

  it('F-16 AC-021 keeps every block id unique after blocks are added to several flows', () => {
    let flows: Flow[] = [flowWith('plan'), flowWith('build'), flowWith('review')];
    for (const position of [0, 1, 2]) {
      flows = addAt(flows, position, 'start');
    }
    for (const position of [0, 1, 2]) {
      for (const kind of ['agent', 'condition'] as const) {
        flows = addAt(flows, position, kind);
      }
    }
    const ids = idsOf(flows);
    expect(ids).toHaveLength(9);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('F-16 AC-021 keeps every block id unique after a block is removed and another is added', () => {
    const plan = flowWith('plan', [startBlock('block-1', 0), endBlock('block-2', 1)]);
    const build = flowWith('build', [startBlock('block-3', 0)]);
    const removed: Flow = { ...plan, blocks: plan.blocks.filter((block) => block.id !== 'block-1') };
    const afterRemoval = [removed, build];
    const added = addBlock(build, 'agent', afterRemoval);
    expect(added.blockId).toBe('block-1');
    const after = withFlow(afterRemoval, added.flow);
    const ids = idsOf(after);
    expect(new Set(ids).size).toBe(ids.length);

    const next = addBlock(removed, 'agent', after);
    expect(next.blockId).toBe('block-4');
    const finalIds = idsOf(withFlow(after, next.flow));
    expect(new Set(finalIds).size).toBe(finalIds.length);
  });
});
