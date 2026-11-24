// The drawing of a flow's blocks and arrows on the flow tab (F-12 AC-007, AC-008, AC-009, screen 01).
// The blocks sit on one main line in the order of the block layout: a Start and an End are circles, an
// Agent is a rounded box with its name and one line of its description, a Condition is a diamond with its
// description above it, or below it when either of its routes returns to an earlier Agent. An arrow runs straight
// along the line, or, for a return, over the top, or, for a false branch that goes forward, under it. The same
// flow and selection give the same drawing. Pure geometry in the canvas's own pixels: no React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';
import { blockName, flowArrows, hasInput, outputsOf } from './blockArrows.js';
import type { BlockArrow, OutputName } from './blockArrows.js';
import { blockLayout } from './blockLayout.js';
import type { BlockSelection } from './panel.js';

export type Flow = model.Flow;
export type Block = model.Block;
export type BlockKind = Block['kind'];

export interface Point {
  readonly x: number;
  readonly y: number;
}

// A text on the drawing, placed at its baseline. `anchor` is where the text starts, ends or is centred.
export interface TextMark {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle';
}

// One block drawn at its centre. `halfWidth` and `halfHeight` give its extent: a circle has equal halves,
// a diamond its two vertices, an Agent its box. `caption` is the text of a circle or a diamond (the name of
// Start and End, the description of a Condition), at `captionX` and `captionY`; an Agent has `name` and
// `summary` instead.
export interface BlockShape {
  readonly blockId: string;
  readonly kind: BlockKind;
  readonly selected: boolean;
  readonly cx: number;
  readonly cy: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly caption: string;
  readonly captionX: number;
  readonly captionY: number;
  readonly captionAnchor: 'middle' | 'end';
  readonly name: string;
  readonly summary: string;
  readonly accessibleName: string;
}

// One arrow from an output of a block to the input of its target. A return is dashed and carries its
// round limit when one is set (AC-008). `branch` is the true or false label of a Condition's output.
export interface ArrowShape {
  readonly fromId: string;
  readonly output: OutputName;
  readonly toId: string;
  readonly points: readonly Point[];
  readonly isReturn: boolean;
  readonly selected: boolean;
  readonly branch: TextMark | null;
  readonly rounds: TextMark | null;
  readonly accessibleName: string;
}

// A connection point of a block (AC-013): the input point, or an output point of one of the block's outputs.
// A drag starts at an output point and a drop lands on a point (AC-012, AC-018).
export type PortRole = 'input' | OutputName;

export interface PortShape {
  readonly blockId: string;
  readonly role: PortRole;
  readonly x: number;
  readonly y: number;
}

export interface BlockDrawing {
  readonly width: number;
  readonly height: number;
  readonly blocks: readonly BlockShape[];
  readonly arrows: readonly ArrowShape[];
  readonly ports: readonly PortShape[];
}

// The natural height of the drawing in canvas pixels: the lanes above and below the line, and the labels. A taller
// canvas area makes the drawing taller (F-12 device fix); this is the least it takes.
export const drawingHeight = 560;

// The size the drawing fills: the measured area of the canvas. The drawing is never smaller than the flow's natural
// size, so a flow that does not fit scrolls (F-12 device fix).
export interface DrawingSize {
  readonly width: number;
  readonly height: number;
}

// The main line: the y of the centre of every block at the natural height (screen 01 draws it at 420 px in its card).
const mainY = 420;
// The lane a return runs along, above the line, and the lane a forward false branch runs along, below it.
const laneAbove = 320;
const laneBelow = 520;

// The main line and the two lanes at a drawing height. They scale with the height, so the rows spread out as the
// canvas grows; at the natural height they sit where the screen draws them.
interface Lanes {
  readonly line: number;
  readonly above: number;
  readonly below: number;
}

function lanesOf(height: number): Lanes {
  const scale = height / drawingHeight;
  return { line: mainY * scale, above: laneAbove * scale, below: laneBelow * scale };
}
// The left inset of the first block and the gap between two neighbours.
const originX = 24;
const gap = 28;
const circleRadius = 22;
const agentHalfWidth = 70;
const agentHalfHeight = 36;
const diamondHalf = 30;

// Text limits in characters, so that a long name or description is cut with an ellipsis (AC-007).
const nameLimit = 16;
const summaryLimit = 20;
const captionLimit = 28;
// How far a shifted caption ends left of its block's centre, clear of the forward route and its label.
const captionShift = 8;

// Cuts a text to `limit` code points, the last one an ellipsis, when it is longer.
export function cutText(text: string, limit: number): string {
  const chars = Array.from(text);
  return chars.length <= limit ? text : `${chars.slice(0, limit - 1).join('')}…`;
}

interface Placed {
  readonly block: Block;
  readonly cx: number;
  readonly cy: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
}

type Side = 'left' | 'right' | 'top' | 'bottom';

function halfSize(kind: BlockKind): { readonly halfWidth: number; readonly halfHeight: number } {
  switch (kind) {
    case 'start':
    case 'end':
      return { halfWidth: circleRadius, halfHeight: circleRadius };
    case 'agent':
      return { halfWidth: agentHalfWidth, halfHeight: agentHalfHeight };
    case 'condition':
      return { halfWidth: diamondHalf, halfHeight: diamondHalf };
  }
}

// The blocks in layout order, each after the one before it. The natural pitch is the gap; when the target width is
// wider than the natural width, the extra width is shared by the gaps between the blocks, and a lone block is
// centred. A block the user dragged keeps its dragged centre, kept inside the drawing when the area has shrunk since
// the drag; the others sit on the main line. A flow with no blocks has no width.
function placeBlocks(
  flow: Flow,
  dragged: Readonly<Record<string, Point>>,
  lanes: Lanes,
  target: DrawingSize,
  height: number,
): { readonly places: readonly Placed[]; readonly width: number } {
  const byId = new Map(flow.blocks.map((block) => [block.id, block] as const));
  const sized = blockLayout(flow).places.map((place) => {
    const block = byId.get(place.blockId);
    if (block === undefined) {
      throw new Error(`F-12: layout names block ${place.blockId}, which is not in flow ${flow.id}`);
    }
    return { block, size: halfSize(block.kind) };
  });
  if (sized.length === 0) {
    return { places: [], width: 0 };
  }
  const naturalWidth =
    2 * originX + sized.reduce((total, { size }) => total + 2 * size.halfWidth, 0) + gap * (sized.length - 1);
  const width = Math.max(naturalWidth, target.width);
  const extra = width - naturalWidth;
  const pitch = sized.length > 1 ? gap + extra / (sized.length - 1) : gap;
  let cursor = originX + (sized.length === 1 ? extra / 2 : 0);
  const places = sized.map(({ block, size }): Placed => {
    const at = dragged[block.id];
    const cx = at === undefined ? cursor + size.halfWidth : within(at.x, size.halfWidth, width - size.halfWidth);
    const cy = at === undefined ? lanes.line : within(at.y, size.halfHeight, height - size.halfHeight);
    cursor += 2 * size.halfWidth + pitch;
    return { block, cx, cy, ...size };
  });
  return { places, width };
}

// The value kept between the low and the high limit (a dragged centre stays on the drawing).
function within(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}

// The point on one side of a placed block: the middle of a side, or the top and bottom vertices.
function anchor(placed: Placed, side: Side): Point {
  switch (side) {
    case 'left':
      return { x: placed.cx - placed.halfWidth, y: placed.cy };
    case 'right':
      return { x: placed.cx + placed.halfWidth, y: placed.cy };
    case 'top':
      return { x: placed.cx, y: placed.cy - placed.halfHeight };
    case 'bottom':
      return { x: placed.cx, y: placed.cy + placed.halfHeight };
  }
}

// The route of an arrow: a return goes from the top of its source over the lane above to the top of its
// target; a false branch that goes forward goes from the bottom under the lane below; any other arrow is
// straight from the right side of its source to the left side of its target (AC-008).
function routeOf(arrow: BlockArrow, from: Placed, to: Placed, lanes: Lanes): readonly Point[] {
  if (arrow.isReturn) {
    const start = anchor(from, 'top');
    const end = anchor(to, 'top');
    return [start, { x: start.x, y: lanes.above }, { x: end.x, y: lanes.above }, end];
  }
  if (arrow.output === 'false') {
    const start = anchor(from, 'bottom');
    const end = anchor(to, 'bottom');
    return [start, { x: start.x, y: lanes.below }, { x: end.x, y: lanes.below }, end];
  }
  return [anchor(from, 'right'), anchor(to, 'left')];
}

// The true or false label of an output (AC-008). A return's label sits above its vertex, a forward false
// label below it, and a forward true label above the middle of its straight arrow.
function branchMark(arrow: BlockArrow, from: Placed, route: readonly Point[]): TextMark | null {
  if (arrow.branchLabel === null) {
    return null;
  }
  const text = arrow.branchLabel;
  if (arrow.isReturn) {
    return { text, x: from.cx + 8, y: from.cy - 54, anchor: 'start' };
  }
  if (arrow.output === 'false') {
    return { text, x: from.cx + 6, y: from.cy + 52, anchor: 'start' };
  }
  const first = route[0];
  const last = route[route.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error(`F-12: arrow from ${arrow.fromId} has no route`);
  }
  return { text, x: (first.x + last.x) / 2, y: first.y - 6, anchor: 'middle' };
}

// The points of a block (AC-013): its input point on the left side, when its kind has one, and an output point
// for each output its kind has. An output point sits where its arrow starts, so a return leaves from the top
// and a false branch that goes forward from the bottom; an output with no arrow sits at its default place, the
// right side for next and true, the bottom vertex for false.
function portsOf(placed: Placed, arrows: readonly ArrowShape[]): readonly PortShape[] {
  const { block } = placed;
  const left = anchor(placed, 'left');
  const input: PortShape[] = hasInput(block) ? [{ blockId: block.id, role: 'input', x: left.x, y: left.y }] : [];
  const outputs = outputsOf(block).map((output): PortShape => {
    const arrow = arrows.find((candidate) => candidate.fromId === block.id && candidate.output === output);
    const at = arrow?.points[0] ?? anchor(placed, output === 'false' ? 'bottom' : 'right');
    return { blockId: block.id, role: output, x: at.x, y: at.y };
  });
  return [...input, ...outputs];
}

// The round limit of a return, above its lane (AC-008). A return with no limit set has no label.
function roundsMark(arrow: BlockArrow, route: readonly Point[], lanes: Lanes): TextMark | null {
  if (arrow.roundsLabel === null) {
    return null;
  }
  const first = route[0];
  const last = route[route.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error(`F-12: arrow from ${arrow.fromId} has no route`);
  }
  return { text: arrow.roundsLabel, x: (first.x + last.x) / 2, y: lanes.above - 8, anchor: 'middle' };
}

// The name a block has for a screen reader, which tells it apart from the toolbox buttons of the same kind.
function accessibleBlockName(block: Block): string {
  switch (block.kind) {
    case 'start':
      return 'Start block';
    case 'end':
      return 'End block';
    case 'agent':
      return `Agent block: ${blockName(block)}`;
    case 'condition':
      return block.description === '' ? 'Condition block' : `Condition block: ${block.description}`;
  }
}

function captionOf(block: Block): string {
  switch (block.kind) {
    case 'start':
    case 'end':
      return blockName(block);
    case 'condition':
      return cutText(block.description, captionLimit);
    case 'agent':
      return '';
  }
}

// The y of a caption (AC-007, amended 2026-11-23): a Condition's description sits above its diamond, except
// when either of its routes returns to an earlier Agent, then below it; the circles keep theirs above.
function captionYOf(block: Block, cy: number, hasReturn: boolean): number {
  if (block.kind === 'condition') {
    return hasReturn ? cy + 50 : cy - 50;
  }
  return cy - 30;
}

// The x and anchor of a caption (AC-007, T015 option 1). A Condition with a return on one output and a forward
// route on the other ends its description just left of its centre, away from the forward route, so a false
// branch that drops from the bottom vertex does not cross it and its "false" label stays clear. Every other
// caption is centred on its block.
function captionXOf(
  block: Block,
  cx: number,
  returns: number,
  forwards: number,
): { readonly x: number; readonly anchor: 'middle' | 'end' } {
  if (block.kind === 'condition' && returns === 1 && forwards === 1) {
    return { x: cx - captionShift, anchor: 'end' };
  }
  return { x: cx, anchor: 'middle' };
}

function placedOf(byId: ReadonlyMap<string, Placed>, blockId: string): Placed {
  const placed = byId.get(blockId);
  if (placed === undefined) {
    throw new Error(`F-12: arrow names block ${blockId}, which is not in the flow`);
  }
  return placed;
}

// The drawing of a flow for its canvas. A selected block is the one the selection names; a selected arrow
// is the arrow of the block and output it names (AC-007, AC-008). `dragged` gives the centre of each block the
// user moved; the arrows, labels and captions follow the blocks. `target` is the measured area of the canvas: the
// blocks keep their size and spread across it, and the drawing is never smaller than its natural size (F-12 device
// fix). A flow with no blocks has no drawing.
export function blockDrawingOf(
  flow: Flow,
  selection: BlockSelection = { kind: 'none' },
  dragged: Readonly<Record<string, Point>> = {},
  target: DrawingSize = { width: 0, height: 0 },
): BlockDrawing {
  const height = Math.max(drawingHeight, target.height);
  const lanes = lanesOf(height);
  const { places, width } = placeBlocks(flow, dragged, lanes, target, height);
  const byId = new Map(places.map((placed) => [placed.block.id, placed] as const));
  const selectedBlockId = selection.kind === 'block' ? selection.blockId : null;
  const selectedArrow = selection.kind === 'blockArrow' ? selection : null;
  const arrowList = flowArrows(flow);
  const countArrows = (blockId: string, isReturn: boolean): number =>
    arrowList.filter((arrow) => arrow.fromId === blockId && arrow.isReturn === isReturn).length;
  const blocks = places.map((placed): BlockShape => {
    const { block } = placed;
    const returns = countArrows(block.id, true);
    const forwards = countArrows(block.id, false);
    const captionX = captionXOf(block, placed.cx, returns, forwards);
    return {
      blockId: block.id,
      kind: block.kind,
      selected: block.id === selectedBlockId,
      cx: placed.cx,
      cy: placed.cy,
      halfWidth: placed.halfWidth,
      halfHeight: placed.halfHeight,
      caption: captionOf(block),
      captionX: captionX.x,
      captionY: captionYOf(block, placed.cy, returns > 0),
      captionAnchor: captionX.anchor,
      name: block.kind === 'agent' ? cutText(blockName(block), nameLimit) : '',
      summary: block.kind === 'agent' ? cutText(block.description, summaryLimit) : '',
      accessibleName: accessibleBlockName(block),
    };
  });
  const arrows = arrowList.map((arrow): ArrowShape => {
    const from = placedOf(byId, arrow.fromId);
    const to = placedOf(byId, arrow.toId);
    const points = routeOf(arrow, from, to, lanes);
    const outputName = arrow.output === 'next' ? 'Arrow' : `${arrow.output} arrow`;
    return {
      fromId: arrow.fromId,
      output: arrow.output,
      toId: arrow.toId,
      points,
      isReturn: arrow.isReturn,
      selected:
        selectedArrow !== null && selectedArrow.fromId === arrow.fromId && selectedArrow.output === arrow.output,
      branch: branchMark(arrow, from, points),
      rounds: roundsMark(arrow, points, lanes),
      accessibleName: `${outputName} from ${blockName(from.block)}`,
    };
  });
  const ports = places.flatMap((placed) => portsOf(placed, arrows));
  return { width, height, blocks, arrows, ports };
}
