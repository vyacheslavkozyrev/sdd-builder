import { describe, expect, it } from 'vitest';
import { blockDrawingOf } from '../src/builder/blockDrawing.js';
import { dragPreview, movedCentre, pastSlop, settleDrop } from '../src/builder/blockDrag.js';
import type { DragState } from '../src/builder/blockDrag.js';
import type { Flow } from '../src/builder/model.js';
import type { Block } from '../src/builder/blockLink.js';

// The drag rules are pure: each drop is checked here without the DOM (the canvas tests cover the gestures).

const base: Flow = {
  index: 0,
  id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
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
    { index: 0, id: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', kind: 'start', next: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' },
    { index: 1, id: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', kind: 'agent', name: 'planner', description: '', arguments: [], next: '' },
    { index: 2, id: 'c2b443aa-3d75-5a54-8874-426073a3fc41', kind: 'agent', name: 'reviewer', description: '', arguments: [], next: '' },
    { index: 3, id: 'bf4df531-9a24-5612-8519-d9ed8b883586', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

// The Start has no arrow; the planner goes to the reviewer; the reviewer and the End are open.
const open: Flow = {
  ...base,
  blocks: [
    { index: 0, id: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', kind: 'start', next: '' },
    { index: 1, id: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'c2b443aa-3d75-5a54-8874-426073a3fc41' },
    { index: 2, id: 'c2b443aa-3d75-5a54-8874-426073a3fc41', kind: 'agent', name: 'reviewer', description: '', arguments: [], next: '' },
    { index: 3, id: 'bf4df531-9a24-5612-8519-d9ed8b883586', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

// start -> planner -> pre-check; the pre-check's true goes to End and its false returns to the planner.
const loop: Flow = {
  ...base,
  blocks: [
    { index: 0, id: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', kind: 'start', next: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' },
    { index: 1, id: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'c2b443aa-3d75-5a54-8874-426073a3fc41' },
    {
      index: 2,
      id: 'c2b443aa-3d75-5a54-8874-426073a3fc41',
      kind: 'condition',
      description: 'The reviewer approves',
      true: { to: 'bf4df531-9a24-5612-8519-d9ed8b883586' },
      false: { to: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', roundLimit: 3 },
    },
    { index: 3, id: 'bf4df531-9a24-5612-8519-d9ed8b883586', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

// The same pre-check with its true route empty, so a link from it is not refused for an existing arrow.
const loopOpenTrue: Flow = {
  ...base,
  blocks: [
    { index: 0, id: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', kind: 'start', next: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' },
    { index: 1, id: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'c2b443aa-3d75-5a54-8874-426073a3fc41' },
    { index: 2, id: 'c2b443aa-3d75-5a54-8874-426073a3fc41', kind: 'condition', description: 'Check', true: { to: '' }, false: { stop: true } },
    { index: 3, id: 'bf4df531-9a24-5612-8519-d9ed8b883586', kind: 'end', outcome: 'done', producedArtifact: '' },
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
    const result = settleDrop(chain, { kind: 'link', fromId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', output: 'next' }, { blockId: 'bf4df531-9a24-5612-8519-d9ed8b883586', output: null });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(blockOf(result.flow, '3c045e8c-3b6a-5804-b19c-75424d4e43aa')).toMatchObject({ next: 'bf4df531-9a24-5612-8519-d9ed8b883586' });
    }
    expect(blockOf(chain, '3c045e8c-3b6a-5804-b19c-75424d4e43aa')).toMatchObject({ next: '' });
  });
});

describe('F-12 AC-014 a Start links only to an Agent or a Condition', () => {
  it('F-12 AC-014 refuses a Start linked to an End with the reason', () => {
    expect(refusalOf({ kind: 'link', fromId: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', output: 'next' }, open, { blockId: 'bf4df531-9a24-5612-8519-d9ed8b883586', output: null })).toBe(
      'A Start links to an Agent or a Condition.',
    );
  });

  it('F-12 AC-014 accepts a Start linked to an Agent', () => {
    const result = settleDrop(open, { kind: 'link', fromId: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', output: 'next' }, { blockId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: null });
    expect(result?.ok).toBe(true);
  });
});

describe('F-12 AC-015 an output with an arrow and a drop on the block itself', () => {
  it('F-12 AC-015 refuses a second arrow from an output that already has one', () => {
    expect(refusalOf({ kind: 'link', fromId: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', output: 'next' }, chain, { blockId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: null })).toBe(
      'This block already has an arrow from this point.',
    );
  });

  it('F-12 AC-015 refuses a link from a block onto its own output point', () => {
    expect(refusalOf({ kind: 'link', fromId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: 'next' }, chain, { blockId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: 'next' })).toBe(
      'A block cannot link to itself.',
    );
  });
});

describe('F-12 AC-016 an Agent or a true route goes only forward', () => {
  it('F-12 AC-016 refuses an Agent that links back to an earlier block', () => {
    expect(refusalOf({ kind: 'link', fromId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: 'next' }, chain, { blockId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', output: null })).toBe(
      'Only a false route can return to an earlier Agent.',
    );
  });

  it('F-12 AC-016 refuses a true route that links back to an earlier Agent', () => {
    expect(refusalOf({ kind: 'link', fromId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: 'true' }, loopOpenTrue, { blockId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', output: null })).toBe(
      'Only a false route can return to an earlier Agent.',
    );
  });
});

describe('F-12 AC-017 a false route may return to an earlier Agent only', () => {
  it('F-12 AC-017 refuses a false route that returns to an earlier block which is not an Agent', () => {
    const flow: Flow = {
      ...base,
      blocks: [
        { index: 0, id: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', kind: 'start', next: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' },
        { index: 1, id: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', kind: 'condition', description: 'Early check', true: { to: 'c2b443aa-3d75-5a54-8874-426073a3fc41' }, false: { stop: true } },
        { index: 2, id: 'c2b443aa-3d75-5a54-8874-426073a3fc41', kind: 'condition', description: 'Late check', true: { to: 'bf4df531-9a24-5612-8519-d9ed8b883586' }, false: { stop: true } },
        { index: 3, id: 'bf4df531-9a24-5612-8519-d9ed8b883586', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    expect(refusalOf({ kind: 'link', fromId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: 'false' }, flow, { blockId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', output: null })).toBe(
      'Only an Agent can be returned to.',
    );
  });

  it('F-12 AC-017 a false route that returns to an earlier Agent is set with no round limit', () => {
    const flow: Flow = {
      ...base,
      blocks: [
        { index: 0, id: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', kind: 'start', next: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' },
        { index: 1, id: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'c2b443aa-3d75-5a54-8874-426073a3fc41' },
        { index: 2, id: 'c2b443aa-3d75-5a54-8874-426073a3fc41', kind: 'condition', description: 'Check', true: { to: 'bf4df531-9a24-5612-8519-d9ed8b883586' }, false: { stop: true } },
        { index: 3, id: 'bf4df531-9a24-5612-8519-d9ed8b883586', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    const result = settleDrop(flow, { kind: 'link', fromId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: 'false' }, { blockId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', output: null });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(blockOf(result.flow, 'c2b443aa-3d75-5a54-8874-426073a3fc41')).toMatchObject({ false: { to: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' } });
      expect(blockOf(result.flow, 'c2b443aa-3d75-5a54-8874-426073a3fc41')).toEqual({ ...blockOf(flow, 'c2b443aa-3d75-5a54-8874-426073a3fc41'), false: { to: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' } });
    }
  });
});

describe('F-12 AC-018 a drop on a block with no input point', () => {
  it('F-12 AC-018 refuses a drop on the Start with the reason', () => {
    expect(refusalOf({ kind: 'link', fromId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: 'next' }, open, { blockId: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', output: null })).toBe(
      'A Start has no input point.',
    );
  });
});

describe('F-12 AC-019 dragging an arrow end moves that end', () => {
  it('F-12 AC-019 moves the target end of an arrow onto another valid block', () => {
    const result = settleDrop(
      chain,
      { kind: 'target', arrow: { fromId: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', output: 'next', toId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' } },
      { blockId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: null },
    );
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(blockOf(result.flow, 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b')).toMatchObject({ next: 'c2b443aa-3d75-5a54-8874-426073a3fc41' });
    }
  });

  it('F-12 AC-019 refuses a target end moved onto the Start with the reason', () => {
    expect(
      refusalOf({ kind: 'target', arrow: { fromId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', output: 'next', toId: 'c2b443aa-3d75-5a54-8874-426073a3fc41' } }, open, {
        blockId: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b',
        output: null,
      }),
    ).toBe('A Start has no input point.');
  });

  it('F-12 AC-019 moves the source end of an arrow onto an output point and clears the old one', () => {
    const result = settleDrop(
      open,
      { kind: 'source', arrow: { fromId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', output: 'next', toId: 'c2b443aa-3d75-5a54-8874-426073a3fc41' } },
      { blockId: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', output: 'next' },
    );
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(blockOf(result.flow, 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b')).toMatchObject({ next: 'c2b443aa-3d75-5a54-8874-426073a3fc41' });
      expect(blockOf(result.flow, '3c045e8c-3b6a-5804-b19c-75424d4e43aa')).toMatchObject({ next: '' });
    }
  });

  it('F-12 AC-019 does nothing when a source end is dropped on a block body, not an output point', () => {
    expect(
      settleDrop(
        open,
        { kind: 'source', arrow: { fromId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', output: 'next', toId: 'c2b443aa-3d75-5a54-8874-426073a3fc41' } },
        { blockId: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', output: null },
      ),
    ).toBeNull();
  });
});

describe('F-12 AC-012 the line a drag draws while it moves', () => {
  const pointer = { x: 300, y: 200 };

  it('F-12 AC-012 draws a new link from its output point to the pointer', () => {
    const drawing = blockDrawingOf(chain);
    const port = drawing.ports.find((candidate) => candidate.blockId === '3c045e8c-3b6a-5804-b19c-75424d4e43aa' && candidate.role === 'next');
    expect(port).toBeDefined();
    expect(dragPreview(drawing, { kind: 'link', fromId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', output: 'next' }, pointer)).toEqual([
      { x: port?.x, y: port?.y },
      pointer,
    ]);
  });

  it('F-12 AC-019 draws a dragged target end from the source end of the arrow to the pointer', () => {
    const drawing = blockDrawingOf(chain);
    const arrow = drawing.arrows.find((candidate) => candidate.fromId === 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b');
    expect(arrow).toBeDefined();
    expect(
      dragPreview(drawing, { kind: 'target', arrow: { fromId: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', output: 'next', toId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' } }, pointer),
    ).toEqual([arrow?.points[0], pointer]);
  });

  it('F-12 AC-019 draws a dragged source end from the pointer to the target end of the arrow', () => {
    const drawing = blockDrawingOf(open);
    const arrow = drawing.arrows.find((candidate) => candidate.fromId === '3c045e8c-3b6a-5804-b19c-75424d4e43aa');
    const points = arrow?.points ?? [];
    expect(
      dragPreview(drawing, { kind: 'source', arrow: { fromId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', output: 'next', toId: 'c2b443aa-3d75-5a54-8874-426073a3fc41' } }, pointer),
    ).toEqual([pointer, points[points.length - 1]]);
  });

  it('F-12 AC-012 throws when a dragged arrow is not in the drawing', () => {
    expect(() =>
      dragPreview(blockDrawingOf(chain), { kind: 'target', arrow: { fromId: 'c2b443aa-3d75-5a54-8874-426073a3fc41', output: 'next', toId: 'bf4df531-9a24-5612-8519-d9ed8b883586' } }, pointer),
    ).toThrow('no next arrow from c2b443aa-3d75-5a54-8874-426073a3fc41');
  });
});

describe('F-12 AC-013 connection points by kind', () => {
  function portRoles(flow: Flow, blockId: string): string[] {
    return blockDrawingOf(flow)
      .ports.filter((port) => port.blockId === blockId)
      .map((port) => port.role);
  }

  it('F-12 AC-013 gives a Start one output and no input', () => {
    expect(portRoles(chain, 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b')).toEqual(['next']);
  });

  it('F-12 AC-013 gives an Agent an input and one output', () => {
    expect(portRoles(chain, '3c045e8c-3b6a-5804-b19c-75424d4e43aa')).toEqual(['input', 'next']);
  });

  it('F-12 AC-013 gives a Condition an input and a true and a false output', () => {
    expect(portRoles(loop, 'c2b443aa-3d75-5a54-8874-426073a3fc41')).toEqual(['input', 'true', 'false']);
  });

  it('F-12 AC-013 gives an End an input and no output', () => {
    expect(portRoles(loop, 'bf4df531-9a24-5612-8519-d9ed8b883586')).toEqual(['input']);
  });

  it('F-12 AC-013 places an output point where its arrow starts, so a false return leaves from the top', () => {
    const drawing = blockDrawingOf(loop);
    const arrow = drawing.arrows.find((candidate) => candidate.fromId === 'c2b443aa-3d75-5a54-8874-426073a3fc41' && candidate.output === 'false');
    const port = drawing.ports.find((candidate) => candidate.blockId === 'c2b443aa-3d75-5a54-8874-426073a3fc41' && candidate.role === 'false');
    expect(arrow?.isReturn).toBe(true);
    expect({ x: port?.x, y: port?.y }).toEqual(arrow?.points[0]);
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-23) a block moves only past the slop and inside the drawing', () => {
  it('does not count a pointer move of 3 px or less on both axes', () => {
    expect(pastSlop({ x: 10, y: 10 }, { x: 13, y: 7 })).toBe(false);
  });

  it('counts a pointer move beyond 3 px on either axis', () => {
    expect(pastSlop({ x: 10, y: 10 }, { x: 14, y: 10 })).toBe(true);
    expect(pastSlop({ x: 10, y: 10 }, { x: 10, y: 6 })).toBe(true);
  });

  it('moves the centre by the pointer move from the press', () => {
    const size = { halfWidth: 70, halfHeight: 36 };
    const bounds = { width: 1000, height: 560 };
    expect(movedCentre({ x: 100, y: 420 }, { x: 10, y: 10 }, { x: 50, y: 0 }, size, bounds)).toEqual({ x: 140, y: 410 });
  });

  it('keeps the block inside the drawing on every side', () => {
    const size = { halfWidth: 70, halfHeight: 36 };
    const bounds = { width: 1000, height: 560 };
    const origin = { x: 100, y: 420 };
    const grab = { x: 0, y: 0 };
    expect(movedCentre(origin, grab, { x: -900, y: -900 }, size, bounds)).toEqual({ x: 70, y: 36 });
    expect(movedCentre(origin, grab, { x: 900, y: 900 }, size, bounds)).toEqual({ x: 930, y: 524 });
  });
});
