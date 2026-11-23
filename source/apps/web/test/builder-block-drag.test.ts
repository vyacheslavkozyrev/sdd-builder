import { describe, expect, it } from 'vitest';
import { blockDrawingOf } from '../src/builder/blockDrawing.js';
import { dragPreview, settleDrop } from '../src/builder/blockDrag.js';
import type { DragState } from '../src/builder/blockDrag.js';
import type { Flow } from '../src/builder/model.js';
import type { Block } from '../src/builder/blockLink.js';

// The drag rules are pure: each drop is checked here without the DOM (the canvas tests cover the gestures).

const base: Flow = {
  index: 0,
  id: 'plan',
  name: 'plan',
  arguments: [],
  body: '',
  artifacts: [],
  approval: false,
  blocks: [],
};

// start -> planner -> End, and an unlinked reviewer. The planner's next is empty.
const chain: Flow = {
  ...base,
  blocks: [
    { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
    { index: 1, id: 'block-2', kind: 'agent', name: 'planner', description: '', arguments: [], next: '' },
    { index: 2, id: 'block-3', kind: 'agent', name: 'reviewer', description: '', arguments: [], next: '' },
    { index: 3, id: 'block-4', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

// The Start has no arrow; the planner goes to the reviewer; the reviewer and the End are open.
const open: Flow = {
  ...base,
  blocks: [
    { index: 0, id: 'block-1', kind: 'start', next: '' },
    { index: 1, id: 'block-2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'block-3' },
    { index: 2, id: 'block-3', kind: 'agent', name: 'reviewer', description: '', arguments: [], next: '' },
    { index: 3, id: 'block-4', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

// start -> planner -> pre-check; the pre-check's true goes to End and its false returns to the planner.
const loop: Flow = {
  ...base,
  blocks: [
    { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
    { index: 1, id: 'block-2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'block-3' },
    {
      index: 2,
      id: 'block-3',
      kind: 'condition',
      description: 'The reviewer approves',
      true: { to: 'block-4' },
      false: { to: 'block-2', roundLimit: 3 },
    },
    { index: 3, id: 'block-4', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

// The same pre-check with its true route empty, so a link from it is not refused for an existing arrow.
const loopOpenTrue: Flow = {
  ...base,
  blocks: [
    { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
    { index: 1, id: 'block-2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'block-3' },
    { index: 2, id: 'block-3', kind: 'condition', description: 'Check', true: { to: '' }, false: { stop: true } },
    { index: 3, id: 'block-4', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

function blockOf(flow: Flow, id: string): Block {
  const block = flow.blocks.find((candidate) => candidate.id === id);
  if (block === undefined) {
    throw new Error(`no block ${id}`);
  }
  return block;
}

function refusalOf(drag: DragState, flow: Flow, drop: { readonly blockId: string; readonly output: 'next' | 'true' | 'false' | null }): string {
  const result = settleDrop(flow, drag, drop);
  if (result === null || result.ok) {
    throw new Error('expected a refusal');
  }
  return result.reason;
}

describe('F-12 AC-012 a drop on a block links the output', () => {
  it('F-12 AC-012 links the output of the dragged point to the block the drop lands on', () => {
    const result = settleDrop(chain, { kind: 'link', fromId: 'block-2', output: 'next' }, { blockId: 'block-4', output: null });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(blockOf(result.flow, 'block-2')).toMatchObject({ next: 'block-4' });
    }
    expect(blockOf(chain, 'block-2')).toMatchObject({ next: '' });
  });
});

describe('F-12 AC-014 a Start links only to an Agent or a Condition', () => {
  it('F-12 AC-014 refuses a Start linked to an End with the reason', () => {
    expect(refusalOf({ kind: 'link', fromId: 'block-1', output: 'next' }, open, { blockId: 'block-4', output: null })).toBe(
      'A Start links to an Agent or a Condition.',
    );
  });

  it('F-12 AC-014 accepts a Start linked to an Agent', () => {
    const result = settleDrop(open, { kind: 'link', fromId: 'block-1', output: 'next' }, { blockId: 'block-3', output: null });
    expect(result?.ok).toBe(true);
  });
});

describe('F-12 AC-015 an output with an arrow and a drop on the block itself', () => {
  it('F-12 AC-015 refuses a second arrow from an output that already has one', () => {
    expect(refusalOf({ kind: 'link', fromId: 'block-1', output: 'next' }, chain, { blockId: 'block-3', output: null })).toBe(
      'This block already has an arrow from this point.',
    );
  });

  it('F-12 AC-015 refuses a link from a block onto its own output point', () => {
    expect(refusalOf({ kind: 'link', fromId: 'block-3', output: 'next' }, chain, { blockId: 'block-3', output: 'next' })).toBe(
      'A block cannot link to itself.',
    );
  });
});

describe('F-12 AC-016 an Agent or a true route goes only forward', () => {
  it('F-12 AC-016 refuses an Agent that links back to an earlier block', () => {
    expect(refusalOf({ kind: 'link', fromId: 'block-3', output: 'next' }, chain, { blockId: 'block-2', output: null })).toBe(
      'Only a false route can return to an earlier Agent.',
    );
  });

  it('F-12 AC-016 refuses a true route that links back to an earlier Agent', () => {
    expect(refusalOf({ kind: 'link', fromId: 'block-3', output: 'true' }, loopOpenTrue, { blockId: 'block-2', output: null })).toBe(
      'Only a false route can return to an earlier Agent.',
    );
  });
});

describe('F-12 AC-017 a false route may return to an earlier Agent only', () => {
  it('F-12 AC-017 refuses a false route that returns to an earlier block which is not an Agent', () => {
    const flow: Flow = {
      ...base,
      blocks: [
        { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
        { index: 1, id: 'block-2', kind: 'condition', description: 'Early check', true: { to: 'block-3' }, false: { stop: true } },
        { index: 2, id: 'block-3', kind: 'condition', description: 'Late check', true: { to: 'block-4' }, false: { stop: true } },
        { index: 3, id: 'block-4', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    expect(refusalOf({ kind: 'link', fromId: 'block-3', output: 'false' }, flow, { blockId: 'block-2', output: null })).toBe(
      'Only an Agent can be returned to.',
    );
  });

  it('F-12 AC-017 a false route that returns to an earlier Agent is set with no round limit', () => {
    const flow: Flow = {
      ...base,
      blocks: [
        { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
        { index: 1, id: 'block-2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'block-3' },
        { index: 2, id: 'block-3', kind: 'condition', description: 'Check', true: { to: 'block-4' }, false: { stop: true } },
        { index: 3, id: 'block-4', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    const result = settleDrop(flow, { kind: 'link', fromId: 'block-3', output: 'false' }, { blockId: 'block-2', output: null });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(blockOf(result.flow, 'block-3')).toMatchObject({ false: { to: 'block-2' } });
      expect(blockOf(result.flow, 'block-3')).toEqual({ ...blockOf(flow, 'block-3'), false: { to: 'block-2' } });
    }
  });
});

describe('F-12 AC-018 a drop on a block with no input point', () => {
  it('F-12 AC-018 refuses a drop on the Start with the reason', () => {
    expect(refusalOf({ kind: 'link', fromId: 'block-3', output: 'next' }, open, { blockId: 'block-1', output: null })).toBe(
      'A Start has no input point.',
    );
  });
});

describe('F-12 AC-019 dragging an arrow end moves that end', () => {
  it('F-12 AC-019 moves the target end of an arrow onto another valid block', () => {
    const result = settleDrop(
      chain,
      { kind: 'target', arrow: { fromId: 'block-1', output: 'next', toId: 'block-2' } },
      { blockId: 'block-3', output: null },
    );
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(blockOf(result.flow, 'block-1')).toMatchObject({ next: 'block-3' });
    }
  });

  it('F-12 AC-019 refuses a target end moved onto the Start with the reason', () => {
    expect(
      refusalOf({ kind: 'target', arrow: { fromId: 'block-2', output: 'next', toId: 'block-3' } }, open, {
        blockId: 'block-1',
        output: null,
      }),
    ).toBe('A Start has no input point.');
  });

  it('F-12 AC-019 moves the source end of an arrow onto an output point and clears the old one', () => {
    const result = settleDrop(
      open,
      { kind: 'source', arrow: { fromId: 'block-2', output: 'next', toId: 'block-3' } },
      { blockId: 'block-1', output: 'next' },
    );
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(blockOf(result.flow, 'block-1')).toMatchObject({ next: 'block-3' });
      expect(blockOf(result.flow, 'block-2')).toMatchObject({ next: '' });
    }
  });

  it('F-12 AC-019 does nothing when a source end is dropped on a block body, not an output point', () => {
    expect(
      settleDrop(
        open,
        { kind: 'source', arrow: { fromId: 'block-2', output: 'next', toId: 'block-3' } },
        { blockId: 'block-1', output: null },
      ),
    ).toBeNull();
  });
});

describe('F-12 AC-012 the line a drag draws while it moves', () => {
  const pointer = { x: 300, y: 200 };

  it('F-12 AC-012 draws a new link from its output point to the pointer', () => {
    const drawing = blockDrawingOf(chain);
    const port = drawing.ports.find((candidate) => candidate.blockId === 'block-2' && candidate.role === 'next');
    expect(port).toBeDefined();
    expect(dragPreview(drawing, { kind: 'link', fromId: 'block-2', output: 'next' }, pointer)).toEqual([
      { x: port?.x, y: port?.y },
      pointer,
    ]);
  });

  it('F-12 AC-019 draws a dragged target end from the source end of the arrow to the pointer', () => {
    const drawing = blockDrawingOf(chain);
    const arrow = drawing.arrows.find((candidate) => candidate.fromId === 'block-1');
    expect(arrow).toBeDefined();
    expect(
      dragPreview(drawing, { kind: 'target', arrow: { fromId: 'block-1', output: 'next', toId: 'block-2' } }, pointer),
    ).toEqual([arrow?.points[0], pointer]);
  });

  it('F-12 AC-019 draws a dragged source end from the pointer to the target end of the arrow', () => {
    const drawing = blockDrawingOf(open);
    const arrow = drawing.arrows.find((candidate) => candidate.fromId === 'block-2');
    const points = arrow?.points ?? [];
    expect(
      dragPreview(drawing, { kind: 'source', arrow: { fromId: 'block-2', output: 'next', toId: 'block-3' } }, pointer),
    ).toEqual([pointer, points[points.length - 1]]);
  });

  it('F-12 AC-012 throws when a dragged arrow is not in the drawing', () => {
    expect(() =>
      dragPreview(blockDrawingOf(chain), { kind: 'target', arrow: { fromId: 'block-3', output: 'next', toId: 'block-4' } }, pointer),
    ).toThrow('no next arrow from block-3');
  });
});

describe('F-12 AC-013 connection points by kind', () => {
  function portRoles(flow: Flow, blockId: string): string[] {
    return blockDrawingOf(flow)
      .ports.filter((port) => port.blockId === blockId)
      .map((port) => port.role);
  }

  it('F-12 AC-013 gives a Start one output and no input', () => {
    expect(portRoles(chain, 'block-1')).toEqual(['next']);
  });

  it('F-12 AC-013 gives an Agent an input and one output', () => {
    expect(portRoles(chain, 'block-2')).toEqual(['input', 'next']);
  });

  it('F-12 AC-013 gives a Condition an input and a true and a false output', () => {
    expect(portRoles(loop, 'block-3')).toEqual(['input', 'true', 'false']);
  });

  it('F-12 AC-013 gives an End an input and no output', () => {
    expect(portRoles(loop, 'block-4')).toEqual(['input']);
  });

  it('F-12 AC-013 places an output point where its arrow starts, so a false return leaves from the top', () => {
    const drawing = blockDrawingOf(loop);
    const arrow = drawing.arrows.find((candidate) => candidate.fromId === 'block-3' && candidate.output === 'false');
    const port = drawing.ports.find((candidate) => candidate.blockId === 'block-3' && candidate.role === 'false');
    expect(arrow?.isReturn).toBe(true);
    expect({ x: port?.x, y: port?.y }).toEqual(arrow?.points[0]);
  });
});
