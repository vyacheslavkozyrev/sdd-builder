import { describe, expect, it } from 'vitest';
import { blockDrawingOf, cutText, drawingHeight, pathOf } from '../src/builder/blockDrawing.js';
import type { Flow } from '../src/builder/model.js';

// The drawing is pure geometry, so these tests check its numbers with no DOM.

const emptyFlow: Flow = {
  index: 0,
  id: 'plan',
  name: 'plan',
  arguments: [],
  body: '',
  artifacts: [],
  approval: false,
  blocks: [],
};

// start -> planner (agent) -> end check (condition): true to End, false back to the planner (a return of 3 rounds).
const loopFlow: Flow = {
  ...emptyFlow,
  blocks: [
    { index: 0, id: 'b1', kind: 'start', next: 'b2' },
    { index: 1, id: 'b2', kind: 'agent', name: 'planner', description: 'Writes the plan', arguments: [], next: 'b3' },
    {
      index: 2,
      id: 'b3',
      kind: 'condition',
      description: 'The reviewer approves',
      true: { to: 'b4' },
      false: { to: 'b2', roundLimit: 3 },
    },
    { index: 3, id: 'b4', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ],
};

// start -> pre-check (condition): true to the agent, false forward to End.
const forwardFalseFlow: Flow = {
  ...emptyFlow,
  blocks: [
    { index: 0, id: 'b1', kind: 'start', next: 'b2' },
    { index: 1, id: 'b2', kind: 'condition', description: 'The brief is complete', true: { to: 'b3' }, false: { to: 'b4' } },
    { index: 2, id: 'b3', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'b4' },
    { index: 3, id: 'b4', kind: 'end', outcome: 'stopped', producedArtifact: '' },
  ],
};

describe('F-12 AC-006 (data) an empty flow has no drawing', () => {
  it('F-12 AC-006 (data) gives no blocks, no arrows and no width for a flow with no blocks', () => {
    const drawing = blockDrawingOf(emptyFlow);
    expect(drawing.blocks).toEqual([]);
    expect(drawing.arrows).toEqual([]);
    expect(drawing.width).toBe(0);
    expect(drawing.height).toBe(drawingHeight);
  });
});

describe('F-12 AC-009 (data) blocks are placed in arrow order and the same input gives the same drawing', () => {
  it('F-12 AC-009 (data) places the blocks left to right in the order of their arrows from Start', () => {
    const drawing = blockDrawingOf(loopFlow);
    expect(drawing.blocks.map((block) => block.blockId)).toEqual(['b1', 'b2', 'b3', 'b4']);
    expect(drawing.blocks.map((block) => block.cx)).toEqual([46, 166, 294, 374]);
  });

  it('F-12 AC-009 (data) gives an identical drawing for the same flow and selection', () => {
    const selection = { kind: 'block', blockId: 'b2' } as const;
    expect(blockDrawingOf(loopFlow, selection)).toEqual(blockDrawingOf(loopFlow, selection));
  });

  it('F-12 AC-009 (data) puts an unreached block after the chain and before the End, in list order', () => {
    const flow: Flow = {
      ...loopFlow,
      blocks: [
        ...loopFlow.blocks,
        { index: 4, id: 'b5', kind: 'agent', name: 'loose', description: '', arguments: [], next: '' },
      ],
    };
    const drawing = blockDrawingOf(flow);
    expect(drawing.blocks.map((block) => block.blockId)).toEqual(['b1', 'b2', 'b3', 'b5', 'b4']);
    expect(drawing.blocks[4]?.cx).toBeGreaterThan(drawing.blocks[3]?.cx ?? Infinity);
  });

  it('F-12 AC-009 (data) draws the End circle last, after an open Agent, so no arrow runs through it', () => {
    // start -> planner -> End, with the reviewer open. The planner's arrow to the reviewer would pass
    // the End if the End were drawn before the reviewer; the End's place must be right of the reviewer's.
    const flow: Flow = {
      ...emptyFlow,
      blocks: [
        { index: 0, id: 'b1', kind: 'start', next: 'b2' },
        { index: 1, id: 'b2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'b4' },
        { index: 2, id: 'b3', kind: 'agent', name: 'reviewer', description: '', arguments: [], next: '' },
        { index: 3, id: 'b4', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    const drawing = blockDrawingOf(flow);
    expect(drawing.blocks.map((block) => block.blockId)).toEqual(['b1', 'b2', 'b3', 'b4']);
    const [, , reviewer, end] = drawing.blocks;
    expect(end?.cx).toBeGreaterThan(reviewer?.cx ?? Infinity);
  });
});

describe('F-12 AC-007 (logic) block shapes and their text', () => {
  it('F-12 AC-007 (logic) names Start and End and gives a Condition whose false route returns its description below it', () => {
    const [start, agent, condition, end] = blockDrawingOf(loopFlow).blocks;
    expect(start).toMatchObject({ kind: 'start', caption: 'Start', captionY: 390 });
    expect(agent).toMatchObject({ kind: 'agent', name: 'planner', summary: 'Writes the plan', caption: '' });
    expect(condition).toMatchObject({ kind: 'condition', caption: 'The reviewer approves', captionY: 470 });
    expect(end).toMatchObject({ kind: 'end', caption: 'End' });
  });

  it('F-12 AC-007 (logic) gives a Condition that follows Start its description above it when its false route goes forward', () => {
    const [, precheck] = blockDrawingOf(forwardFalseFlow).blocks;
    expect(precheck).toMatchObject({ kind: 'condition', caption: 'The brief is complete', captionY: 370 });
  });

  it('F-12 AC-007 (logic) gives a Condition that does not follow Start its description above it when its false route goes forward', () => {
    const flow: Flow = {
      ...loopFlow,
      blocks: [
        { index: 0, id: 'b1', kind: 'start', next: 'b2' },
        { index: 1, id: 'b2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'b3' },
        { index: 2, id: 'b3', kind: 'condition', description: 'Mid check', true: { to: 'b4' }, false: { to: 'b5' } },
        { index: 3, id: 'b4', kind: 'agent', name: 'writer', description: '', arguments: [], next: 'b5' },
        { index: 4, id: 'b5', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    const condition = blockDrawingOf(flow).blocks[2];
    expect(condition).toMatchObject({ kind: 'condition', caption: 'Mid check', captionY: 370 });
  });

  it('F-12 AC-007 (logic) gives a Condition whose false route returns to an earlier Agent its description below it, mid-flow', () => {
    const flow: Flow = {
      ...loopFlow,
      blocks: [
        { index: 0, id: 'b1', kind: 'start', next: 'b2' },
        { index: 1, id: 'b2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'b3' },
        { index: 2, id: 'b3', kind: 'agent', name: 'writer', description: '', arguments: [], next: 'b4' },
        { index: 3, id: 'b4', kind: 'condition', description: 'Mid check', true: { to: 'b5' }, false: { to: 'b2', roundLimit: 2 } },
        { index: 4, id: 'b5', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    const condition = blockDrawingOf(flow).blocks[3];
    expect(condition).toMatchObject({ kind: 'condition', caption: 'Mid check', captionY: 470 });
  });

  it('F-12 AC-007 (logic) gives a Condition whose true route returns to an earlier Agent its description below it', () => {
    const flow: Flow = {
      ...loopFlow,
      blocks: [
        { index: 0, id: 'b1', kind: 'start', next: 'b2' },
        { index: 1, id: 'b2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'b3' },
        { index: 2, id: 'b3', kind: 'condition', description: 'Retry check', true: { to: 'b2', roundLimit: 2 }, false: { to: 'b4' } },
        { index: 3, id: 'b4', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    const drawing = blockDrawingOf(flow);
    expect(drawing.arrows.find((arrow) => arrow.fromId === 'b3' && arrow.output === 'true')?.isReturn).toBe(true);
    expect(drawing.blocks[2]).toMatchObject({ kind: 'condition', caption: 'Retry check', captionY: 470 });
  });

  it('F-12 AC-007 (logic) gives a Condition whose both routes return its description below it', () => {
    const flow: Flow = {
      ...loopFlow,
      blocks: loopFlow.blocks.map((block) =>
        block.id === 'b3' && block.kind === 'condition'
          ? { ...block, true: { to: 'b2', roundLimit: 2 } }
          : block,
      ),
    };
    const drawing = blockDrawingOf(flow);
    expect(drawing.arrows.filter((arrow) => arrow.fromId === 'b3' && arrow.isReturn)).toHaveLength(2);
    expect(drawing.blocks[2]).toMatchObject({ kind: 'condition', captionY: 470 });
  });

  it('F-12 AC-007 (logic) ends the description left of a Condition whose true route returns and whose false route goes forward, clear of the forward false line', () => {
    const flow: Flow = {
      ...loopFlow,
      blocks: [
        { index: 0, id: 'b1', kind: 'start', next: 'b2' },
        { index: 1, id: 'b2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'b3' },
        { index: 2, id: 'b3', kind: 'condition', description: 'The retry is needed', true: { to: 'b2', roundLimit: 2 }, false: { to: 'b4' } },
        { index: 3, id: 'b4', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    const drawing = blockDrawingOf(flow);
    const condition = drawing.blocks[2];
    const forwardFalse = drawing.arrows.find((arrow) => arrow.fromId === 'b3' && arrow.output === 'false');
    expect(condition).toMatchObject({ kind: 'condition', captionY: 470, captionAnchor: 'end' });
    expect(condition?.captionX).toBe((condition?.cx ?? NaN) - 8);
    // The false line drops from the bottom vertex at the centre, so the caption ends before it.
    expect(forwardFalse?.points[0]).toMatchObject({ x: condition?.cx, y: 450 });
    expect(condition?.captionX).toBeLessThan(condition?.cx ?? NaN);
    // The false label starts right of the centre, so it does not overlap the caption.
    const label = forwardFalse?.branch;
    expect(label?.x).toBeGreaterThan(condition?.captionX ?? NaN);
  });

  it('F-12 AC-007 (logic) ends the description left of a Condition whose false route returns and whose true route goes forward', () => {
    const drawing = blockDrawingOf(loopFlow);
    const condition = drawing.blocks[2];
    const forwardTrue = drawing.arrows.find((arrow) => arrow.fromId === 'b3' && arrow.output === 'true');
    expect(condition).toMatchObject({ kind: 'condition', captionY: 470, captionAnchor: 'end' });
    expect(condition?.captionX).toBe((condition?.cx ?? NaN) - 8);
    // The true route leaves the right vertex on the main line, away from the caption on the left.
    expect(forwardTrue?.points[0]).toMatchObject({ x: (condition?.cx ?? NaN) + 30, y: 420 });
  });

  it('F-12 AC-007 (logic) centres the description of a Condition whose routes both go forward', () => {
    const [, precheck] = blockDrawingOf(forwardFalseFlow).blocks;
    expect(precheck).toMatchObject({ kind: 'condition', captionAnchor: 'middle' });
    expect(precheck?.captionX).toBe(precheck?.cx);
  });

  it('F-12 AC-007 (logic) cuts a long Agent name and summary with an ellipsis', () => {
    const flow: Flow = {
      ...loopFlow,
      blocks: [
        { index: 0, id: 'b1', kind: 'start', next: 'b2' },
        {
          index: 1,
          id: 'b2',
          kind: 'agent',
          name: 'a-very-long-agent-name-for-the-box',
          description: 'abcdefghijklmnopqrstuvwxyz',
          arguments: [],
          next: '',
        },
      ],
    };
    const agent = blockDrawingOf(flow).blocks[1];
    expect(agent?.name).toBe('a-very-long-age…');
    expect(agent?.summary).toBe('abcdefghijklmnopqrs…');
  });

  it('F-12 AC-007 (logic) marks only the selected block', () => {
    const blocks = blockDrawingOf(loopFlow, { kind: 'block', blockId: 'b3' }).blocks;
    expect(blocks.map((block) => block.selected)).toEqual([false, false, true, false]);
    expect(blockDrawingOf(loopFlow).blocks.some((block) => block.selected)).toBe(false);
  });
});

describe('F-12 AC-008 (logic) arrows: straight, return, forward false and their labels', () => {
  it('F-12 AC-008 (logic) draws a forward true arrow straight with its true label above it', () => {
    const arrow = blockDrawingOf(loopFlow).arrows.find((candidate) => candidate.fromId === 'b3' && candidate.output === 'true');
    expect(arrow?.points).toEqual([
      { x: 324, y: 420 },
      { x: 352, y: 420 },
    ]);
    expect(arrow?.isReturn).toBe(false);
    expect(arrow?.branch).toEqual({ text: 'true', x: 338, y: 414, anchor: 'middle' });
    expect(arrow?.rounds).toBeNull();
  });

  it('F-12 AC-008 (logic) draws a return over the top, dashed, with its false label and up to N rounds', () => {
    const arrow = blockDrawingOf(loopFlow).arrows.find((candidate) => candidate.fromId === 'b3' && candidate.output === 'false');
    expect(arrow?.isReturn).toBe(true);
    expect(arrow?.points).toEqual([
      { x: 294, y: 390 },
      { x: 294, y: 320 },
      { x: 166, y: 320 },
      { x: 166, y: 384 },
    ]);
    expect(arrow?.branch).toEqual({ text: 'false', x: 302, y: 366, anchor: 'start' });
    expect(arrow?.rounds).toEqual({ text: 'up to 3 rounds', x: 230, y: 312, anchor: 'middle' });
  });

  it('F-12 AC-008 (logic) draws a forward false arrow under the line with no round label', () => {
    const arrow = blockDrawingOf(forwardFalseFlow).arrows.find(
      (candidate) => candidate.fromId === 'b2' && candidate.output === 'false',
    );
    expect(arrow?.isReturn).toBe(false);
    expect(arrow?.points).toEqual([
      { x: 126, y: 450 },
      { x: 126, y: 520 },
      { x: 374, y: 520 },
      { x: 374, y: 442 },
    ]);
    expect(arrow?.branch).toEqual({ text: 'false', x: 132, y: 472, anchor: 'start' });
    expect(arrow?.rounds).toBeNull();
  });

  it('F-12 AC-008 (logic) gives a return with no round limit set no round label', () => {
    const flow: Flow = {
      ...loopFlow,
      blocks: loopFlow.blocks.map((block) =>
        block.id === 'b3' && block.kind === 'condition' ? { ...block, false: { to: 'b2' } } : block,
      ),
    };
    const arrow = blockDrawingOf(flow).arrows.find((candidate) => candidate.fromId === 'b3' && candidate.output === 'false');
    expect(arrow?.isReturn).toBe(true);
    expect(arrow?.rounds).toBeNull();
  });

  it('F-12 AC-008 (logic) marks only the selected arrow, by its block and output', () => {
    const arrows = blockDrawingOf(loopFlow, { kind: 'blockArrow', fromId: 'b3', output: 'false' }).arrows;
    expect(arrows.map((arrow) => [arrow.fromId, arrow.output, arrow.selected])).toEqual([
      ['b1', 'next', false],
      ['b2', 'next', false],
      ['b3', 'true', false],
      ['b3', 'false', true],
    ]);
  });

  it('F-12 AC-008 (logic) names each arrow for a screen reader by its output and its source', () => {
    const names = blockDrawingOf(loopFlow).arrows.map((arrow) => arrow.accessibleName);
    expect(names[0]).toBe('Arrow from Start');
    expect(names[2]).toBe('true arrow from Condition: The reviewer approves');
  });
});

describe('F-12 AC-007 (logic) cutText', () => {
  it.each([
    ['', 5, ''],
    ['plan', 5, 'plan'],
    ['planner', 7, 'planner'],
    ['planners', 8, 'planners'],
    ['planners!', 8, 'planner…'],
    ['planner', 6, 'plann…'],
    ['abcdef', 2, 'a…'],
  ])('F-12 AC-007 (logic) cuts %j to %d characters to %j', (text, limit, expected) => {
    expect(cutText(text, limit)).toBe(expected);
  });

  it('F-12 AC-007 (logic) counts code points, not UTF-16 units', () => {
    expect(cutText('ab😀cd', 4)).toBe('ab😀…');
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-23) a dragged block keeps its dragged centre', () => {
  it('draws the dragged block at its centre, and its arrows start and end on it', () => {
    const drawing = blockDrawingOf(loopFlow, { kind: 'none' }, { b2: { x: 200, y: 300 } });
    const planner = drawing.blocks.find((block) => block.blockId === 'b2');
    expect({ cx: planner?.cx, cy: planner?.cy }).toEqual({ cx: 200, cy: 300 });
    const into = drawing.arrows.find((arrow) => arrow.fromId === 'b1');
    const out = drawing.arrows.find((arrow) => arrow.fromId === 'b2' && arrow.output === 'next');
    expect(into?.points[into.points.length - 1]).toEqual({ x: 130, y: 300 });
    expect(out?.points[0]).toEqual({ x: 270, y: 300 });
  });

  it('keeps the width of the layout and the other blocks on the main line', () => {
    const plain = blockDrawingOf(loopFlow);
    const dragged = blockDrawingOf(loopFlow, { kind: 'none' }, { b2: { x: 200, y: 300 } });
    expect(dragged.width).toBe(plain.width);
    expect(dragged.blocks.find((block) => block.blockId === 'b4')).toEqual(plain.blocks.find((block) => block.blockId === 'b4'));
  });

  it('moves the return label and the caption of a Condition with the Condition', () => {
    const drawing = blockDrawingOf(loopFlow, { kind: 'none' }, { b3: { x: 400, y: 200 } });
    const condition = drawing.blocks.find((block) => block.blockId === 'b3');
    const back = drawing.arrows.find((arrow) => arrow.fromId === 'b3' && arrow.output === 'false');
    expect(condition?.captionY).toBe(250);
    expect(back?.branch?.y).toBe(146);
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-23) the blocks spread across the measured canvas area', () => {
  // The natural drawing of loopFlow is 420 px wide and 560 px high; its gaps are 28 px.
  const natural = blockDrawingOf(loopFlow);
  const naturalGap = 28;

  it('F-12 (no criterion: Verify device fix 2026-11-23) takes the measured width and shares the extra width by the gaps', () => {
    const drawing = blockDrawingOf(loopFlow, { kind: 'none' }, {}, { width: 1000, height: 560 });
    expect(drawing.width).toBe(1000);
    const edges = drawing.blocks.map((block) => ({ left: block.cx - block.halfWidth, right: block.cx + block.halfWidth }));
    expect(edges[0]?.left).toBe(24);
    expect(edges[edges.length - 1]?.right).toBeCloseTo(976, 9);
    const pitch = naturalGap + (1000 - natural.width) / 3;
    for (let index = 1; index < edges.length; index += 1) {
      expect((edges[index]?.left ?? NaN) - (edges[index - 1]?.right ?? NaN)).toBeCloseTo(pitch, 9);
    }
  });

  it('F-12 (no criterion: Verify device fix 2026-11-23) keeps the block sizes and keeps the End last', () => {
    const drawing = blockDrawingOf(loopFlow, { kind: 'none' }, {}, { width: 1000, height: 900 });
    expect(drawing.blocks.map((block) => [block.halfWidth, block.halfHeight])).toEqual(
      natural.blocks.map((block) => [block.halfWidth, block.halfHeight]),
    );
    expect(drawing.blocks.map((block) => block.blockId)).toEqual(['b1', 'b2', 'b3', 'b4']);
    const cxs = drawing.blocks.map((block) => block.cx);
    expect([...cxs].sort((a, b) => a - b)).toEqual(cxs);
  });

  it('F-12 (no criterion: Verify device fix 2026-11-23) centres a lone block in a wider area', () => {
    const lone: Flow = { ...emptyFlow, blocks: [{ index: 0, id: 'b1', kind: 'start', next: '' }] };
    const drawing = blockDrawingOf(lone, { kind: 'none' }, {}, { width: 1000, height: 560 });
    expect(drawing.blocks[0]?.cx).toBe(500);
    expect(drawing.width).toBe(1000);
  });

  it('F-12 (no criterion: Verify device fix 2026-11-23) is never smaller than the natural size, and keeps the natural layout', () => {
    const small = blockDrawingOf(loopFlow, { kind: 'none' }, {}, { width: 100, height: 100 });
    expect(small).toEqual(natural);
  });

  it('F-12 (no criterion: Verify device fix 2026-11-23) grows the height and moves the main line and lanes with it', () => {
    const drawing = blockDrawingOf(loopFlow, { kind: 'none' }, {}, { width: 0, height: 900 });
    const scale = 900 / drawingHeight;
    expect(drawing.height).toBe(900);
    expect(drawing.blocks.map((block) => block.cy)).toEqual(natural.blocks.map(() => 420 * scale));
    const back = drawing.arrows.find((arrow) => arrow.isReturn);
    expect(back?.points[1]?.y).toBeCloseTo(320 * scale, 9);
    const forwardFalse = drawing.blocks.find((block) => block.blockId === 'b3');
    expect(forwardFalse?.captionY).toBeCloseTo(420 * scale + 50, 9);
  });

  it('F-12 (no criterion: Verify device fix 2026-11-23) keeps the natural height when the area is shorter', () => {
    expect(blockDrawingOf(loopFlow, { kind: 'none' }, {}, { width: 0, height: 300 }).height).toBe(drawingHeight);
  });

  it('F-12 (no criterion: Verify device fix 2026-11-23) keeps a dragged block inside the drawing when the area has shrunk', () => {
    const drawing = blockDrawingOf(loopFlow, { kind: 'none' }, { b2: { x: 5000, y: 5000 } });
    const planner = drawing.blocks.find((block) => block.blockId === 'b2');
    expect(planner?.cx).toBe(drawing.width - (planner?.halfWidth ?? NaN));
    expect(planner?.cy).toBe(drawing.height - (planner?.halfHeight ?? NaN));
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-24) arrows are smooth curves along their routes', () => {
  it('curves a straight arrow from its source end to its target end, horizontal at both ends', () => {
    expect(pathOf([{ x: 0, y: 0 }, { x: 100, y: 0 }])).toBe('M0,0 C50,0 50,0 100,0');
  });

  it('gives a straight arrow whose target lies behind its source the React Flow loop offset', () => {
    expect(pathOf([{ x: 0, y: 0 }, { x: -100, y: 0 }])).toBe('M0,0 C62.5,0 -162.5,0 -100,0');
  });

  it('curves a lane route vertically, with its top on the lane', () => {
    const path = pathOf([{ x: 0, y: 400 }, { x: 0, y: 325 }, { x: 100, y: 325 }, { x: 100, y: 400 }]);
    expect(path).toBe('M0,400 C0,300 100,300 100,400');
  });

  it('throws for a route that is neither a straight pair nor a four-point lane route', () => {
    expect(() => pathOf([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }])).toThrow('F-12');
  });

  it('gives a return arrow a curve from the top of its source to the top of its target, peaking on the upper lane', () => {
    const arrow = blockDrawingOf(loopFlow).arrows.find((candidate) => candidate.fromId === 'b3' && candidate.output === 'false');
    // The return from b3 (top at y 390) to b2 (top at y 384), with the upper lane at y 320: the curve's peak is
    // (390 + 384) / 8 + 3 / 4 * control, so the control sits at (8 * 320 - 390 - 384) / 6.
    const control = (8 * 320 - 390 - 384) / 6;
    expect(arrow?.path).toBe(`M294,390 C294,${control} 166,${control} 166,384`);
  });
});
