import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { BlockKind } from './blocks.js';
import type { OutputName } from './blockArrows.js';
import { blockDrawingOf } from './blockDrawing.js';
import type {
  ArrowShape,
  BlockDrawing,
  BlockShape,
  DrawingSize,
  PortShape,
  Point,
  TextMark,
} from './blockDrawing.js';
import { dragPreview, movedCentre, pastSlop, settleDrop } from './blockDrag.js';
import type { Drop, DragState } from './blockDrag.js';
import { getBlockCanvasStyles } from './blockCanvasStyles.js';
import type { BlockCanvasStyles, BlockInk } from './blockCanvasStyles.js';
import { blockLayout, countLine } from './blockLayout.js';
import { ErrorPanel } from './ErrorPanel.js';
import { arrowKey, markedItems } from './MarkViews.js';
import type { MarkedItems } from './MarkViews.js';
import { getMarkViewsStyles } from './markViewsStyles.js';
import type { MarkInk, MarkInks } from './markViewsStyles.js';
import type { StructureMarks } from './marks.js';
import { MessageBand } from './MessageBand.js';
import type { Flow } from './model.js';
import type { BlockSelection } from './panel.js';
import { Toolbox } from './Toolbox.js';

// The canvas of a flow on the flow tab (F-12 AC-006 to AC-019, screen 01): a white card with the flow's name and
// the count line, the blocks and their arrows, the toolbox at the top right with the error panel under it, the
// footer hint, and the message band. A press on a block and a drag moves the block on the canvas; the new place is
// view state, kept while the flow tab is open, and the model keeps its automatic layout.
// The blocks are drawn as the approved screen draws them (Start and End circles, Agent boxes, Condition diamonds,
// dashed returns with their round limit). A click selects the block or the arrow, or clears the selection on the
// empty canvas. A drag from an output point links the block (linkBlocks); a drag from an end of the selected arrow
// moves that end (repoint). A refused drop shows its reason in the message band and changes nothing. The caller
// holds the selection and the flow: a changed flow goes to `onChange`, and a toolbox press goes to `onAdd`
// with its kind.

export interface BlockCanvasProps {
  readonly flow: Flow;
  // The block or arrow selected on the flow tab; the selected one is drawn with the primary outline (AC-007).
  readonly selection: BlockSelection;
  // Called with the selection a click makes: a block, an arrow, or none on the empty canvas.
  readonly onSelect: (selection: BlockSelection) => void;
  // Called with the kind of a toolbox press, so the caller adds the block, stores the flow and selects it (AC-002).
  readonly onAdd: (kind: BlockKind) => void;
  // Called with the flow after a drag or repoint is accepted. Never called for a refused drop.
  readonly onChange: (flow: Flow) => void;
  // The structure marks of the pipeline; the blocks and arrows of this flow that carry one are drawn marked (AC-045),
  // in the red of a blocker and the amber of a warning.
  // None when not given.
  readonly marks?: StructureMarks;
}

// A block pressed on the canvas: the press point, and whether the pointer has gone past the slop, so that a press
// that does not move stays a click.
interface BlockMove {
  readonly block: BlockShape;
  readonly grab: Point;
  readonly moved: boolean;
}

// A press on the empty drawing: the pointer's place in the page, the pan offset of the flow when it went down, and
// whether the pointer has moved, which pans the drawing (F-12 device fix 2026-11-24).
interface Pan {
  readonly start: Point;
  readonly origin: Point;
  readonly moved: boolean;
}

const noOffset: Point = { x: 0, y: 0 };
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
  const marked = markedItems(marks, flow.id);
  // The drag in progress and the pointer's place in the drawing; the reason of the last refused drop.
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  // The blocks moved on each flow tab, by flow id and block id, and the block being pressed or moved.
  const [dragged, setDragged] = useState<Readonly<Record<string, Readonly<Record<string, Point>>>>>({});
  const [move, setMove] = useState<BlockMove | null>(null);
  // The pan offset of the drawing on each flow tab, by flow id, and the press on the empty drawing that pans it.
  const [panned, setPanned] = useState<Readonly<Record<string, Point>>>({});
  const pan = useRef<Pan | null>(null);
  const places = dragged[flow.id] ?? {};
  const offset = panned[flow.id] ?? noOffset;
  // The canvas area the drawing fills: measured on the stage, and kept up to date as the card is resized. Where
  // ResizeObserver is missing (jsdom), the area is read once and stays at zero, so the drawing keeps its natural size.
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [area, setArea] = useState<DrawingSize>({ width: 0, height: 0 });
  useEffect(() => {
    if (stage === null) {
      return undefined;
    }
    const measure = (): void => {
      const next = { width: stage.clientWidth, height: stage.clientHeight };
      setArea((current) =>
        current.width === next.width && current.height === next.height ? current : next,
      );
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [stage]);
  const drawing = blockDrawingOf(flow, selection, places, area);
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
  // The block follows the pointer from the place it was pressed at, kept inside the drawing (AC-012 view state).
  const moveBlock = (current: BlockMove, at: Point): void => {
    if (!current.moved && !pastSlop(current.grab, at)) {
      return;
    }
    setMove({ ...current, moved: true });
    const centre = movedCentre({ x: current.block.cx, y: current.block.cy }, current.grab, at, current.block, drawing);
    setDragged((all) => ({ ...all, [flow.id]: { ...all[flow.id], [current.block.blockId]: centre } }));
  };
  // The drawing moves with the pointer from where the press went down, once the pointer has gone past the slop. The
  // offset is kept on this flow tab, and the blocks and arrows keep their places in the drawing.
  const panDrawing = (current: Pan, at: Point): void => {
    if (!current.moved && !pastSlop(current.start, at)) {
      return;
    }
    pan.current = { ...current, moved: true };
    const next = {
      x: current.origin.x + (at.x - current.start.x),
      y: current.origin.y + (at.y - current.start.y),
    };
    setPanned((all) => ({ ...all, [flow.id]: next }));
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
    onBackgroundDown: (at) => {
      afterDrag.current = false;
      pan.current = { start: at, origin: offset, moved: false };
    },
    onBlockDown: (block, at) => {
      afterDrag.current = false;
      setMove({ block, grab: shifted(at, offset), moved: false });
    },
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
    onMove: (at, client) => {
      // The pointer is in the drawing's units: the pan offset is taken off the place inside the svg.
      const inDrawing = shifted(at, offset);
      if (drag !== null) {
        setPointer(inDrawing);
      }
      if (move !== null) {
        moveBlock(move, inDrawing);
      }
      if (pan.current !== null) {
        panDrawing(pan.current, client);
      }
    },
    onRelease: () => {
      if (drag !== null) {
        afterDrag.current = true;
        endDrag();
      }
      if (move !== null) {
        // A block that was moved is not clicked: the click that ends the move does not select it.
        if (move.moved) {
          afterDrag.current = true;
        }
        setMove(null);
      }
      if (pan.current !== null) {
        // A drawing that was panned is not clicked: the click that ends the pan does not clear the selection.
        if (pan.current.moved) {
          afterDrag.current = true;
        }
        pan.current = null;
      }
    },
    onLeave: () => {
      if (drag !== null) {
        endDrag();
      }
      setMove(null);
      pan.current = null;
    },
  };
  const preview = drag !== null && pointer !== null ? dragPreview(drawing, drag, pointer) : null;
  return (
    <Box component="section" aria-label="Flow canvas" sx={styles.card}>
      {flow.blocks.length === 0 ? (
        <Box sx={styles.empty}>{emptyText}</Box>
      ) : (
        <Box sx={styles.scroll}>
          <Box ref={setStage} sx={styles.stage}>
            <DrawingView
              drawing={drawing}
              offset={offset}
              styles={styles}
              markInks={markStyles.ink}
              marked={marked}
              preview={preview}
              onSelect={pick}
              gestures={gestures}
            />
          </Box>
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
      {marks.findings.length > 0 && (
        <Box sx={styles.errors}>
          <ErrorPanel findings={marks.findings} />
        </Box>
      )}
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
  // A pointer move: `at` is in the svg's box, `client` in the page (the pan moves the drawing by the page move).
  readonly onMove: (at: Point, client: Point) => void;
  readonly onRelease: () => void;
  readonly onLeave: () => void;
  // A press on the empty drawing (the svg itself), at the page point it went down; it starts a pan (F-12 device fix).
  readonly onBackgroundDown: (client: Point) => void;
  // A press on a block's body, at the point the pointer went down; it starts a move, not a link (AC-012 view state).
  readonly onBlockDown: (block: BlockShape, at: Point) => void;
}

interface DrawingViewProps {
  readonly drawing: BlockDrawing;
  // The pan offset of the flow: the blocks, arrows and their handles are drawn shifted by it.
  readonly offset: Point;
  readonly styles: BlockCanvasStyles;
  // The red and amber of the structure marks, and the blocks and arrows of the flow that carry one.
  readonly markInks: MarkInks;
  readonly marked: MarkedItems;
  // The line a drag draws while it moves, or null when no drag is moving.
  readonly preview: readonly Point[] | null;
  readonly onSelect: (selection: BlockSelection) => void;
  readonly gestures: DrawingGestures;
}

// The point of a pointer in the svg's box, in pixels. The drawing's content is moved by the pan offset inside the svg,
// so a caller takes the offset off this point to get the drawing's own units. The event may come from the svg or from
// an element inside it.
function pointerIn(event: {
  readonly clientX: number;
  readonly clientY: number;
  readonly currentTarget: Element;
}): Point {
  const box = (event.currentTarget.closest('svg') ?? event.currentTarget).getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
}

// A point moved by a shift: the place of a pointer in the drawing's units, or the place of a drawing unit on the svg.
function shifted(at: Point, shift: Point): Point {
  return { x: at.x - shift.x, y: at.y - shift.y };
}

// The SVG of the blocks and arrows. A release that no point or block took ends the drag without a change. The
// blocks and arrows sit in one group, moved by the pan offset; the svg is the window onto the drawing.
function DrawingView({ drawing, offset, styles, markInks, marked, preview, onSelect, gestures }: DrawingViewProps) {
  const ink = styles.ink;
  const selected = drawing.arrows.find((arrow) => arrow.selected);
  return (
    <Box
      component="svg"
      width={drawing.width}
      height={drawing.height}
      sx={styles.drawing}
      onClick={gestures.onClear}
      onPointerDown={(event: PointerEvent<SVGSVGElement>) => {
        if (event.target === event.currentTarget) {
          // The pan keeps its moves when the pointer leaves the drawing, until the press is released.
          event.currentTarget.setPointerCapture(event.pointerId);
          gestures.onBackgroundDown({ x: event.clientX, y: event.clientY });
        }
      }}
      onPointerMove={(event: PointerEvent<SVGSVGElement>) =>
        gestures.onMove(pointerIn(event), { x: event.clientX, y: event.clientY })
      }
      onPointerUp={gestures.onRelease}
      onPointerLeave={gestures.onLeave}
      onPointerCancel={gestures.onLeave}
    >
      <defs>
        <Arrowhead id="block-arrowhead" color={ink.line} />
        <Arrowhead id="block-arrowhead-accent" color={ink.accent} />
      </defs>
      <g transform={`translate(${offset.x} ${offset.y})`}>
        {drawing.arrows.map((arrow) => {
          const key = arrowKey(arrow.fromId, arrow.output);
          return (
            <ArrowView
              key={key}
              arrow={arrow}
              ink={ink}
              mark={markOf(markInks, marked.arrows.has(key), marked.blockerArrows.has(key))}
              onSelect={onSelect}
            />
          );
        })}
        {drawing.blocks.map((block) => (
          <BlockView
            key={block.blockId}
            block={block}
            ink={ink}
            mark={markOf(markInks, marked.blocks.has(block.blockId), marked.blockerBlocks.has(block.blockId))}
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
      </g>
    </Box>
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

// A closed arrowhead with React Flow's geometry (F-11): 12.5 units, a 20 by 20 view box, a triangle of 5 by 8 units
// with round caps, scaled with the stroke it ends, as React Flow scales it.
function Arrowhead({ id, color }: { readonly id: string; readonly color: string }) {
  return (
    <marker
      id={id}
      markerWidth={12.5}
      markerHeight={12.5}
      markerUnits="strokeWidth"
      viewBox="-10 -10 20 20"
      refX={0}
      refY={0}
      orient="auto-start-reverse"
    >
      <polyline
        points="-5,-4 0,0 -5,4 -5,-4"
        fill={color}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </marker>
  );
}

// An arrow: a smooth curve (as F-11's edges). A return is dashed and in the primary colour, a selected arrow is the
// primary colour at 2.5 px, and a normal arrow is 1 px with React Flow's default closed arrowhead (the same size and
// shape as F-11). A wide transparent curve under it takes the click, so the arrow is easy to hit.
function ArrowView({
  arrow,
  ink,
  mark,
  onSelect,
}: {
  readonly arrow: ArrowShape;
  readonly ink: BlockInk;
  readonly mark: MarkInk | null;
  readonly onSelect: (selection: BlockSelection) => void;
}) {
  const accent = arrow.selected || arrow.isReturn;
  // A marked arrow is drawn in its mark's colour, unless it is the selected one, which keeps the primary colour.
  const stroke = mark !== null && !arrow.selected ? mark.line : accent ? ink.accent : ink.line;
  const select = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onSelect({ kind: 'blockArrow', fromId: arrow.fromId, output: arrow.output });
  };
  return (
    <g role="button" aria-label={arrow.accessibleName} onClick={select}>
      <path d={arrow.path} fill="none" stroke={ink.line} strokeOpacity={0} strokeWidth={12} />
      <path
        d={arrow.path}
        fill="none"
        stroke={stroke}
        strokeWidth={arrow.selected ? 2.5 : arrow.isReturn ? 1.5 : 1}
        strokeDasharray={arrow.isReturn ? '6 4' : undefined}
        markerEnd={accent ? 'url(#block-arrowhead-accent)' : 'url(#block-arrowhead)'}
      />
      {mark !== null && <MarkBadge at={arrowMarkPoint(arrow)} ink={mark} />}
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

// The ink of a marked item: its blocker red when it carries a blocker, otherwise the warning amber; null when the
// item carries no mark (F-12 AC-045).
function markOf(inks: MarkInks, marked: boolean, blocker: boolean): MarkInk | null {
  if (!marked) return null;
  return blocker ? inks.blocker : inks.warning;
}

// The mark of a finding (F-12 AC-045): a small badge in the colour of its severity, drawn over the item it names. It
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

// The outline and fill of a block: the primary outline when selected (AC-007), otherwise the outline of its kind as
// the approved screen draws it.
interface Frame {
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
}

function frameOf(block: BlockShape, ink: BlockInk): Frame {
  // A selected block has the primary outline at 2 px on the paper, as a selected flow box on the Pipeline tab (F-11).
  if (block.selected) {
    return { fill: ink.paper, stroke: ink.accent, strokeWidth: 2 };
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
  mark,
  ports,
  onSelect,
  gestures,
}: {
  readonly block: BlockShape;
  readonly ink: BlockInk;
  readonly mark: MarkInk | null;
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
      onPointerDown={(event) => gestures.onBlockDown(block, pointerIn(event))}
      onPointerUp={(event) => gestures.onDrop({ blockId: block.blockId, output: null }, event)}
    >
      <BlockBody block={block} ink={ink} />
      {mark !== null && <MarkBadge at={{ x: block.cx + block.halfWidth, y: block.cy - block.halfHeight }} ink={mark} />}
      {ports.map((port) => (
        <PortView key={port.role} port={port} ink={ink} gestures={gestures} />
      ))}
    </g>
  );
}

// The visible connection point is the F-11 handle: a 6 px dot in the accent colour with a 1 px ring in the paper
// colour (React Flow's handle, border-box). The circle sits on the centre line of the ring, so its radius is 2.5 and
// its stroke 1. The hit area is a transparent circle of 6 px radius around it, so the point is easy to press.
const portRadius = 2.5;
const portRingWidth = 1;
const portHitRadius = 6;

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
    <g
      data-port={port.role}
      onPointerDown={
        output === null
          ? undefined
          : (event) => {
              // A press on a point starts a link, not a move of the block the point belongs to.
              event.stopPropagation();
              gestures.onPortDown(port.blockId, output);
            }
      }
      onPointerUp={(event) => gestures.onDrop({ blockId: port.blockId, output }, event)}
    >
      <circle cx={port.x} cy={port.y} r={portHitRadius} fill="none" pointerEvents="all" />
      <circle
        cx={port.x}
        cy={port.y}
        r={portRadius}
        fill={ink.accent}
        stroke={ink.paper}
        strokeWidth={portRingWidth}
        pointerEvents="none"
      />
    </g>
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
