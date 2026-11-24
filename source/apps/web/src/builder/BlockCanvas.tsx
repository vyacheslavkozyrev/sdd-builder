import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { AddBlockResult } from './blocks.js';
import type { OutputName } from './blockArrows.js';
import { blockDrawingOf } from './blockDrawing.js';
import type { ArrowShape, BlockDrawing, BlockShape, PortShape, Point, TextMark } from './blockDrawing.js';
import { dragPreview, settleDrop } from './blockDrag.js';
import type { Drop, DragState } from './blockDrag.js';
import { getBlockCanvasStyles } from './blockCanvasStyles.js';
import type { BlockInk } from './blockCanvasStyles.js';
import { blockLayout, countLine } from './blockLayout.js';
import { arrowKey, markedItems } from './MarkViews.js';
import type { MarkedItems } from './MarkViews.js';
import { getMarkViewsStyles } from './markViewsStyles.js';
import type { MarkInk } from './markViewsStyles.js';
import type { StructureMarks } from './marks.js';
import { MessageBand } from './MessageBand.js';
import type { Flow } from './model.js';
import type { BlockSelection } from './panel.js';
import { Toolbox } from './Toolbox.js';

// The canvas of a flow on the flow tab (F-12 AC-006 to AC-019, screen 01): a white card with the flow's name and
// the count line, the blocks and their arrows, the toolbox at the top right, the footer hint, and the message band.
// The blocks are drawn as the approved screen draws them (Start and End circles, Agent boxes, Condition diamonds,
// dashed returns with their round limit). A click selects the block or the arrow, or clears the selection on the
// empty canvas. A drag from an output point links the block (linkBlocks); a drag from an end of the selected arrow
// moves that end (repoint). A refused drop shows its reason in the message band and changes nothing. The caller
// holds the selection and the flow: a changed flow goes to `onChange`, and a toolbox press goes to `onAdd`.

export interface BlockCanvasProps {
  readonly flow: Flow;
  // The block or arrow selected on the flow tab; the selected one is drawn on the tint (AC-007).
  readonly selection: BlockSelection;
  // Called with the selection a click makes: a block, an arrow, or none on the empty canvas.
  readonly onSelect: (selection: BlockSelection) => void;
  // Called with the result of a toolbox press, so the caller stores the flow and selects the new block (AC-002).
  readonly onAdd: (result: AddBlockResult) => void;
  // Called with the flow after a drag or repoint is accepted. Never called for a refused drop.
  readonly onChange: (flow: Flow) => void;
  // The structure marks of the pipeline; the blocks and arrows of this flow that carry one are drawn marked (AC-045).
  // None when not given.
  readonly marks?: StructureMarks;
}

const emptyText = 'No blocks yet.';
const hintText =
  'Arrows run the blocks in order. A dashed arrow is a return: a false branch back to an earlier Agent.';
const noMarks: StructureMarks = { findings: [], blockedFlowIds: [] };

// The flow tab's canvas card: the heading, the drawing (or the empty text), the toolbox, the footer hint and the
// message band. The drawing is placed before the heading and the toolbox, so they paint above it.
export function BlockCanvas({ flow, selection, onSelect, onAdd, onChange, marks = noMarks }: BlockCanvasProps) {
  const styles = getBlockCanvasStyles(useTheme());
  const markStyles = getMarkViewsStyles(useTheme());
  const layout = blockLayout(flow);
  const drawing = blockDrawingOf(flow, selection);
  const marked = markedItems(marks, flow.id);
  // The drag in progress and the pointer's place in the drawing; the reason of the last refused drop.
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  // A drag ends with a click on the drawing, which is not a selection; the flag lets that one click pass.
  const afterDrag = useRef(false);

  // Every click on the drawing goes through here, so the click that follows a drag is consumed whichever element it
  // lands on (the svg, a block or an arrow).
  const pick = (selection: BlockSelection): void => {
    if (afterDrag.current) {
      afterDrag.current = false;
      return;
    }
    onSelect(selection);
  };
  const endDrag = (): void => {
    setDrag(null);
    setPointer(null);
  };
  const settle = (target: Drop, current: DragState): void => {
    endDrag();
    const result = settleDrop(flow, current, target);
    if (result === null) {
      return;
    }
    if (result.ok) {
      setRefusal(null);
      onChange(result.flow);
    } else {
      setRefusal(result.reason);
    }
  };
  const gestures: DrawingGestures = {
    onClear: () => pick({ kind: 'none' }),
    onPortDown: (blockId, output) => {
      afterDrag.current = false;
      setPointer(null);
      setDrag({ kind: 'link', fromId: blockId, output });
    },
    onHandleDown: (arrow, end) => {
      afterDrag.current = false;
      setPointer(null);
      const ends = { fromId: arrow.fromId, output: arrow.output, toId: arrow.toId };
      setDrag(end === 'source' ? { kind: 'source', arrow: ends } : { kind: 'target', arrow: ends });
    },
    onDrop: (target, event) => {
      if (drag === null) {
        return;
      }
      event.stopPropagation();
      afterDrag.current = true;
      settle(target, drag);
    },
    onMove: (at) => {
      if (drag !== null) {
        setPointer(at);
      }
    },
    onRelease: () => {
      if (drag !== null) {
        afterDrag.current = true;
        endDrag();
      }
    },
    onLeave: () => {
      if (drag !== null) {
        endDrag();
      }
    },
  };
  const preview = drag !== null && pointer !== null ? dragPreview(drawing, drag, pointer) : null;
  return (
    <Box component="section" aria-label="Flow canvas" sx={styles.card}>
      {flow.blocks.length === 0 ? (
        <Box sx={styles.empty}>{emptyText}</Box>
      ) : (
        <Box sx={styles.scroll}>
          <DrawingView
            drawing={drawing}
            ink={styles.ink}
            markInk={markStyles.ink}
            marked={marked}
            preview={preview}
            onSelect={pick}
            gestures={gestures}
          />
        </Box>
      )}
      <Box sx={styles.heading}>
        <Typography component="h2" sx={styles.title}>
          {flow.name}
        </Typography>
        <Typography component="p" sx={styles.count}>
          {countLine(layout)}
        </Typography>
      </Box>
      <Toolbox flow={flow} onAdd={onAdd} />
      <MessageBand refusal={refusal} />
      <Typography component="p" sx={styles.hint}>
        {hintText}
      </Typography>
    </Box>
  );
}

// The handlers the drawing reports to: a click on the empty drawing, the presses that start a drag, and the
// releases that end one. The canvas owns the drag, so the drawing keeps no state of its own.
interface DrawingGestures {
  readonly onClear: () => void;
  readonly onPortDown: (blockId: string, output: OutputName) => void;
  readonly onHandleDown: (arrow: ArrowShape, end: 'source' | 'target') => void;
  // A release over a point or a block. `event` is the release, which a drop stops so the drawing does not end the drag.
  readonly onDrop: (target: Drop, event: { readonly stopPropagation: () => void }) => void;
  readonly onMove: (at: Point) => void;
  readonly onRelease: () => void;
  readonly onLeave: () => void;
}

interface DrawingViewProps {
  readonly drawing: BlockDrawing;
  readonly ink: BlockInk;
  // The amber of the structure marks, and the blocks and arrows of the flow that carry one.
  readonly markInk: MarkInk;
  readonly marked: MarkedItems;
  // The line a drag draws while it moves, or null when no drag is moving.
  readonly preview: readonly Point[] | null;
  readonly onSelect: (selection: BlockSelection) => void;
  readonly gestures: DrawingGestures;
}

// The point of a pointer in the drawing's own pixels: the svg's box, so the scroll of its container is counted.
function pointerIn(event: ReactPointerEvent<SVGSVGElement>): Point {
  const box = event.currentTarget.getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
}

// The SVG of the blocks and arrows. A release that no point or block took ends the drag without a change.
function DrawingView({ drawing, ink, markInk, marked, preview, onSelect, gestures }: DrawingViewProps) {
  const selected = drawing.arrows.find((arrow) => arrow.selected);
  return (
    <svg
      width={drawing.width}
      height={drawing.height}
      onClick={gestures.onClear}
      onPointerMove={(event) => gestures.onMove(pointerIn(event))}
      onPointerUp={gestures.onRelease}
      onPointerLeave={gestures.onLeave}
    >
      <defs>
        <marker id="block-arrowhead" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={ink.line} />
        </marker>
        <marker id="block-arrowhead-accent" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={ink.accent} />
        </marker>
      </defs>
      {drawing.arrows.map((arrow) => (
        <ArrowView
          key={arrowKey(arrow.fromId, arrow.output)}
          arrow={arrow}
          ink={ink}
          marked={marked.arrows.has(arrowKey(arrow.fromId, arrow.output))}
          markInk={markInk}
          onSelect={onSelect}
        />
      ))}
      {drawing.blocks.map((block) => (
        <BlockView
          key={block.blockId}
          block={block}
          ink={ink}
          marked={marked.blocks.has(block.blockId)}
          markInk={markInk}
          ports={drawing.ports.filter((port) => port.blockId === block.blockId)}
          onSelect={onSelect}
          gestures={gestures}
        />
      ))}
      {selected === undefined ? null : <ArrowEnd arrow={selected} ink={ink} gestures={gestures} />}
      {preview === null ? null : (
        <polyline
          points={preview.map((point) => `${point.x},${point.y}`).join(' ')}
          fill="none"
          stroke={ink.accent}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}

// The two ends of the selected arrow, drawn as handles that a drag can take (AC-019). Each end is a handle on the
// point the arrow starts or ends at; the handles paint over the points so the arrow's own end takes the press.
function ArrowEnd({
  arrow,
  ink,
  gestures,
}: {
  readonly arrow: ArrowShape;
  readonly ink: BlockInk;
  readonly gestures: DrawingGestures;
}) {
  const first = arrow.points[0];
  const last = arrow.points[arrow.points.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error(`F-12: arrow from ${arrow.fromId} has no route`);
  }
  return (
    <>
      <Handle point={first} end="source" ink={ink} onDown={() => gestures.onHandleDown(arrow, 'source')} />
      <Handle point={last} end="target" ink={ink} onDown={() => gestures.onHandleDown(arrow, 'target')} />
    </>
  );
}

function Handle({
  point,
  end,
  ink,
  onDown,
}: {
  readonly point: Point;
  readonly end: 'source' | 'target';
  readonly ink: BlockInk;
  readonly onDown: () => void;
}) {
  return (
    <circle
      cx={point.x}
      cy={point.y}
      r={6}
      fill={ink.accent}
      stroke={ink.paper}
      strokeWidth={2}
      data-handle={end}
      onPointerDown={onDown}
    />
  );
}

// An arrow: a return is dashed and in the primary colour, a selected arrow is the primary colour at 2.5 px.
// A wide transparent line under it takes the click, so the arrow is easy to hit.
function ArrowView({
  arrow,
  ink,
  marked,
  markInk,
  onSelect,
}: {
  readonly arrow: ArrowShape;
  readonly ink: BlockInk;
  readonly marked: boolean;
  readonly markInk: MarkInk;
  readonly onSelect: (selection: BlockSelection) => void;
}) {
  const points = arrow.points.map((point) => `${point.x},${point.y}`).join(' ');
  const accent = arrow.selected || arrow.isReturn;
  // A marked arrow is drawn in the amber, unless it is the selected one, which keeps the primary colour.
  const stroke = marked && !arrow.selected ? markInk.line : accent ? ink.accent : ink.line;
  const select = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onSelect({ kind: 'blockArrow', fromId: arrow.fromId, output: arrow.output });
  };
  return (
    <g role="button" aria-label={arrow.accessibleName} onClick={select}>
      <polyline points={points} fill="none" stroke={ink.line} strokeOpacity={0} strokeWidth={12} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={arrow.selected ? 2.5 : 1.5}
        strokeDasharray={arrow.isReturn ? '6 4' : undefined}
        markerEnd={accent ? 'url(#block-arrowhead-accent)' : 'url(#block-arrowhead)'}
      />
      {marked && <MarkBadge at={arrowMarkPoint(arrow)} ink={markInk} />}
      {arrow.branch !== null && (
        <MarkText
          mark={arrow.branch}
          fill={arrow.output === 'true' ? ink.trueLabel : ink.falseLabel}
          fontWeight={500}
        />
      )}
      {arrow.rounds !== null && <MarkText mark={arrow.rounds} fill={ink.muted} fontWeight={400} />}
    </g>
  );
}

// The point a mark on an arrow sits at: the middle of its route, between the two points at its middle.
function arrowMarkPoint(arrow: ArrowShape): Point {
  const before = arrow.points[Math.floor((arrow.points.length - 1) / 2)];
  const after = arrow.points[Math.ceil((arrow.points.length - 1) / 2)];
  if (before === undefined || after === undefined) {
    throw new Error(`F-12: arrow from ${arrow.fromId} has no route`);
  }
  return { x: (before.x + after.x) / 2, y: (before.y + after.y) / 2 };
}

// The amber mark of a finding (F-12 AC-045): a small badge in the F-11 amber, drawn over the item it names. It
// takes no pointer, so a click still reaches the block or the arrow under it, and it adds no control (AC-048).
function MarkBadge({ at, ink }: { readonly at: Point; readonly ink: MarkInk }) {
  return (
    <g pointerEvents="none">
      <circle cx={at.x} cy={at.y} r={7} fill={ink.fill} stroke={ink.line} strokeWidth={1.5} />
      <text x={at.x} y={at.y + 4} textAnchor="middle" fontSize={11} fontWeight={600} fill={ink.text}>
        !
      </text>
    </g>
  );
}

function MarkText({
  mark,
  fill,
  fontWeight,
}: {
  readonly mark: TextMark;
  readonly fill: string;
  readonly fontWeight: number;
}) {
  return (
    <text x={mark.x} y={mark.y} textAnchor={mark.anchor} fontSize={11} fontWeight={fontWeight} fill={fill}>
      {mark.text}
    </text>
  );
}

// The outline and fill of a block: the tint with the primary outline when selected (AC-007), otherwise the
// outline of its kind as the approved screen draws it.
interface Frame {
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
}

function frameOf(block: BlockShape, ink: BlockInk): Frame {
  if (block.selected) {
    return { fill: ink.tint, stroke: ink.accent, strokeWidth: 2.5 };
  }
  switch (block.kind) {
    case 'start':
      return { fill: ink.paper, stroke: ink.accent, strokeWidth: 2 };
    case 'end':
      return { fill: ink.paper, stroke: ink.endOutline, strokeWidth: 2 };
    case 'agent':
      return { fill: ink.paper, stroke: ink.accent, strokeWidth: 1.5 };
    case 'condition':
      return { fill: ink.paper, stroke: ink.line, strokeWidth: 1.5 };
  }
}

// A block: a click selects it (AC-011), and a release over it drops a drag on it (AC-012). Its shape and text
// depend on its kind (AC-007). Its connection points are drawn over its body.
function BlockView({
  block,
  ink,
  marked,
  markInk,
  ports,
  onSelect,
  gestures,
}: {
  readonly block: BlockShape;
  readonly ink: BlockInk;
  readonly marked: boolean;
  readonly markInk: MarkInk;
  readonly ports: readonly PortShape[];
  readonly onSelect: (selection: BlockSelection) => void;
  readonly gestures: DrawingGestures;
}) {
  const select = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onSelect({ kind: 'block', blockId: block.blockId });
  };
  return (
    <g
      role="button"
      aria-label={block.accessibleName}
      onClick={select}
      onPointerUp={(event) => gestures.onDrop({ blockId: block.blockId, output: null }, event)}
    >
      <BlockBody block={block} ink={ink} />
      {marked && <MarkBadge at={{ x: block.cx + block.halfWidth, y: block.cy - block.halfHeight }} ink={markInk} />}
      {ports.map((port) => (
        <PortView key={port.role} port={port} ink={ink} gestures={gestures} />
      ))}
    </g>
  );
}

// A connection point (AC-013). An output point starts a link; an input point does not (AC-018). A release over
// either lands on its block, and an output point also names its output, which only an arrow's source end uses.
function PortView({
  port,
  ink,
  gestures,
}: {
  readonly port: PortShape;
  readonly ink: BlockInk;
  readonly gestures: DrawingGestures;
}) {
  const output = port.role === 'input' ? null : port.role;
  return (
    <circle
      cx={port.x}
      cy={port.y}
      r={5}
      fill={ink.paper}
      stroke={ink.line}
      strokeWidth={1.5}
      data-port={port.role}
      onPointerDown={output === null ? undefined : () => gestures.onPortDown(port.blockId, output)}
      onPointerUp={(event) => gestures.onDrop({ blockId: port.blockId, output }, event)}
    />
  );
}

function BlockBody({ block, ink }: { readonly block: BlockShape; readonly ink: BlockInk }) {
  const frame = frameOf(block, ink);
  const { cx, cy, halfWidth, halfHeight } = block;
  const caption =
    block.caption === '' ? null : (
      <text x={block.captionX} y={block.captionY} textAnchor={block.captionAnchor} fontSize={11} fill={ink.muted}>
        {block.caption}
      </text>
    );
  switch (block.kind) {
    case 'start':
      return (
        <>
          <circle cx={cx} cy={cy} r={halfWidth} {...frame} />
          <polygon points={`${cx - 4},${cy - 8} ${cx - 4},${cy + 8} ${cx + 10},${cy}`} fill={ink.accent} />
          {caption}
        </>
      );
    case 'end':
      return (
        <>
          <circle cx={cx} cy={cy} r={halfWidth} {...frame} />
          <rect x={cx - 6} y={cy - 6} width={12} height={12} rx={1} fill={ink.endOutline} />
          {caption}
        </>
      );
    case 'condition':
      return (
        <>
          <polygon
            points={`${cx},${cy - halfHeight} ${cx + halfWidth},${cy} ${cx},${cy + halfHeight} ${cx - halfWidth},${cy}`}
            {...frame}
          />
          {caption}
        </>
      );
    case 'agent':
      return (
        <>
          <rect
            x={cx - halfWidth}
            y={cy - halfHeight}
            width={2 * halfWidth}
            height={2 * halfHeight}
            rx={8}
            {...frame}
          />
          <text x={cx - halfWidth + 12} y={cy - 8} fontSize={12} fontWeight={500} fill={ink.text}>
            {block.name}
          </text>
          <text x={cx - halfWidth + 12} y={cy + 12} fontSize={11} fill={ink.muted}>
            {block.summary}
          </text>
        </>
      );
  }
}
