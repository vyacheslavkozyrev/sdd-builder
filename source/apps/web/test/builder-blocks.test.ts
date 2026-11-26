import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { addBlock, canAddStart } from '../src/builder/blocks.js';
import type { BlockKind } from '../src/builder/blocks.js';

type Flow = model.Flow;
type Block = model.Block;

// A lower-case GUID in the 8-4-4-4-12 form (F-16 AC-027).
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Fixed GUIDs for the fixtures: flows and the blocks that exist before an add.
const PLAN = 'ea3211a4-b64b-5204-9451-6fe12fd7c655';
const BUILD = 'a0c3aad4-8765-5b23-8df5-7c03d481233c';
const REVIEW = '3220de8a-cda2-5056-9296-97da044f7176';
const SPECIFY = '2d8eebb4-9a34-5eae-ae8d-88813520de08';
const START = 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b';
const END = '3c045e8c-3b6a-5804-b19c-75424d4e43aa';
const THIRD = 'c2b443aa-3d75-5a54-8874-426073a3fc41';

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
      const before = flowWith(PLAN, [startBlock(START, 0)]);
      const result = addBlock(before, kind);
      expect(result.flow.blocks).toHaveLength(2);
      const added = result.flow.blocks[1];
      expect(added?.kind).toBe(kind);
      expect(added?.id).toBe(result.blockId);
    },
  );

  it('F-12 (no criterion: Verify device fix 2026-11-24) puts a non-End block before the flow\'s Ends and an End at the end', () => {
    const withEnd = flowWith(PLAN, [startBlock(START, 0), endBlock(END, 1)]);
    const condition = addBlock(withEnd, 'condition');
    expect(condition.flow.blocks.map((block) => block.kind)).toEqual(['start', 'condition', 'end']);
    expect(condition.flow.blocks.map((block) => block.index)).toEqual([0, 1, 2]);
    expect(condition.flow.blocks[2]).toEqual({ ...withEnd.blocks[1], index: 2 });

    const end = addBlock(condition.flow, 'end');
    expect(end.flow.blocks.map((block) => block.kind)).toEqual(['start', 'condition', 'end', 'end']);
    expect(end.flow.blocks.map((block) => block.index)).toEqual([0, 1, 2, 3]);
  });

  it('F-12 AC-002 adds a Start to an empty flow', () => {
    const result = addBlock(flowWith(PLAN), 'start');
    expect(result.flow.blocks).toEqual([{ index: 0, id: result.blockId, kind: 'start', next: '' }]);
    expect(result.blockId).toMatch(GUID);
  });

  it('F-12 AC-002 gives an Agent blank fields and an empty next', () => {
    const result = addBlock(flowWith(PLAN), 'agent');
    expect(result.flow.blocks[0]).toEqual({
      index: 0,
      id: result.blockId,
      kind: 'agent',
      name: '',
      description: '',
      arguments: [],
      next: '',
    });
  });

  it('F-12 AC-002 gives a Condition blank fields, an empty true route and a stop false route', () => {
    const result = addBlock(flowWith(PLAN), 'condition');
    expect(result.flow.blocks[0]).toEqual({
      index: 0,
      id: result.blockId,
      kind: 'condition',
      description: '',
      true: { to: '' },
      false: { stop: true },
    });
  });

  it('F-12 AC-002 gives an End the outcome done and no produced artifact', () => {
    const result = addBlock(flowWith(PLAN), 'end');
    expect(result.flow.blocks[0]).toEqual({
      index: 0,
      id: result.blockId,
      kind: 'end',
      outcome: 'done',
      producedArtifact: '',
    });
  });

  it('F-12 AC-002 adds an Agent before the flow\'s End, and the blocks take their positions as index', () => {
    const before = flowWith(PLAN, [startBlock(START, 0), endBlock(END, 4)]);
    const result = addBlock(before, 'agent');
    expect(result.flow.blocks.map((block) => block.id)).toEqual([START, result.blockId, END]);
    expect(result.flow.blocks.map((block) => block.index)).toEqual([0, 1, 2]);
  });

  it('F-12 AC-002 does not change the flow it was given', () => {
    const before = flowWith(PLAN, [startBlock(START, 0)]);
    addBlock(before, 'end');
    expect(before.blocks).toHaveLength(1);
  });

  it('F-12 AC-003 throws for a second Start, a programmer error the toolbox prevents', () => {
    const before = flowWith(PLAN, [startBlock(START, 0)]);
    expect(() => addBlock(before, 'start')).toThrow(/already has a Start/);
  });
});

describe('F-12 AC-003 Start is offered once per flow', () => {
  it.each<[string, readonly Block[], boolean]>([
    ['an empty flow', [], true],
    [
      'a flow with an Agent only',
      [{ index: 0, id: START, kind: 'agent', name: 'a', description: 'd', arguments: [], next: '' }],
      true,
    ],
    ['a flow with a Start', [startBlock(START, 0)], false],
    ['a flow with a Start and an End', [startBlock(START, 0), endBlock(END, 1)], false],
  ])('F-12 AC-003 canAddStart for %s is %s', (_label, blocks, expected) => {
    expect(canAddStart(flowWith(PLAN, blocks))).toBe(expected);
  });
});

describe('F-16 AC-027 a new block id is a generated GUID', () => {
  it('F-16 AC-027 gives a new block a lower-case GUID id, whatever its kind', () => {
    for (const kind of ['start', 'agent', 'condition', 'end'] as const) {
      expect(addBlock(flowWith(PLAN), kind).blockId).toMatch(GUID);
    }
  });

  it('F-16 AC-027 a block id stays unique within its flow after several adds', () => {
    let flow = flowWith(PLAN);
    for (const kind of ['agent', 'condition', 'end', 'agent'] as const) {
      flow = addBlock(flow, kind).flow;
    }
    const ids = flow.blocks.map((block) => block.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(GUID);
    }
  });
});

describe('F-12 AC-005 adding a block stays in its flow', () => {
  it('F-12 AC-005 adds the block to its own flow and leaves the other flow unchanged', () => {
    const other = flowWith(REVIEW, [startBlock(START, 0), endBlock(END, 1)]);
    const target = flowWith(PLAN, [startBlock(START, 0)]);
    const added = addBlock(target, 'agent');
    expect(added.flow.id).toBe(PLAN);
    expect(added.blockId).toMatch(GUID);
    expect(added.flow.blocks.map((block) => block.id)).toEqual([START, added.blockId]);
    expect(other.blocks).toEqual([startBlock(START, 0), endBlock(END, 1)]);
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
  return flows.map((flow, index) => (index === position ? addBlock(flow, kind).flow : flow));
}

describe('F-16 AC-021 block ids are unique across the pipeline', () => {
  it('F-16 AC-021 gives a block added to a second flow an id no block of any flow has', () => {
    const specify = flowWith(SPECIFY, [startBlock(START, 0), endBlock(END, 1)]);
    const build = flowWith(BUILD);
    const added = addBlock(build, 'agent');
    expect(idsOf([specify, build])).not.toContain(added.blockId);
    expect(added.blockId).toMatch(GUID);
  });

  it('F-16 AC-021 keeps every block id unique after blocks are added to several flows', () => {
    let flows: Flow[] = [flowWith(PLAN), flowWith(BUILD), flowWith(REVIEW)];
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
    const plan = flowWith(PLAN, [startBlock(START, 0), endBlock(END, 1)]);
    const build = flowWith(BUILD, [startBlock(THIRD, 0)]);
    const removed: Flow = { ...plan, blocks: plan.blocks.filter((block) => block.id !== START) };
    const added = addBlock(build, 'agent');
    const after = withFlow([removed, build], added.flow);
    const ids = idsOf(after);
    expect(new Set(ids).size).toBe(ids.length);

    const next = addBlock(removed, 'agent');
    const finalIds = idsOf(withFlow(after, next.flow));
    expect(new Set(finalIds).size).toBe(finalIds.length);
    expect(finalIds).toContain(next.blockId);
  });
});

describe('F-16 AC-027 block ids after adds to several flows and a removal', () => {
  it('F-16 AC-027 block ids stay unique and GUID-shaped after adds to several flows and a removal', () => {
    let flows: Flow[] = [flowWith(PLAN), flowWith(BUILD), flowWith(REVIEW)];
    flows = addAt(flows, 0, 'start');
    flows = addAt(flows, 1, 'start');
    flows = addAt(flows, 2, 'agent');
    flows = addAt(flows, 0, 'agent');
    flows = withFlow(flows, { ...flows[0]!, blocks: flows[0]!.blocks.slice(1) });
    flows = addAt(flows, 0, 'condition');
    const ids = idsOf(flows);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(GUID);
    }
  });
});
