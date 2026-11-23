import { Box, Typography, useTheme } from '@mui/material';
import type { AddBlockResult } from './blocks.js';
import { blockDrawingOf } from './blockDrawing.js';
import type { ArrowShape, BlockDrawing, BlockShape, TextMark } from './blockDrawing.js';
import { getBlockCanvasStyles } from './blockCanvasStyles.js';
import type { BlockInk } from './blockCanvasStyles.js';
import { blockLayout, countLine } from './blockLayout.js';
import type { Flow } from './model.js';
import type { BlockSelection } from './panel.js';
import { Toolbox } from './Toolbox.js';

// The canvas of a flow on the flow tab (F-12 AC-006, AC-007, AC-008, AC-010, screen 01): a white card with the
// flow's name and the count line, the blocks and their arrows, the toolbox at the top right and the footer hint.
// The blocks are drawn as the approved screen draws them (Start and End circles, Agent boxes, Condition diamonds,
// dashed returns with their round limit). A click selects the block or the arrow, or clears the selection on the
// empty canvas; the caller holds the selection and the flow. A press in the toolbox goes to `onAdd`.

export interface BlockCanvasProps {
  readonly flow: Flow;
  // The block or arrow selected on the flow tab; the selected one is drawn on the tint (AC-007).
  readonly selection: BlockSelection;
  // Called with the selection a click makes: a block, an arrow, or none on the empty canvas.
  readonly onSelect: (selection: BlockSelection) => void;
  // Called with the result of a toolbox press, so the caller stores the flow and selects the new block (AC-002).
  readonly onAdd: (result: AddBlockResult) => void;
}

const emptyText = 'No blocks yet.';
const hintText =
  'Arrows run the blocks in order. A dashed arrow is a return: a false branch back to an earlier Agent.';

// The flow tab's canvas card: the heading, the drawing (or the empty text), the toolbox and the footer hint.
// The drawing is placed before the heading and the toolbox, so they paint above it.
export function BlockCanvas({ flow, selection, onSelect, onAdd }: BlockCanvasProps) {
  const styles = getBlockCanvasStyles(useTheme());
  const layout = blockLayout(flow);
  const drawing = blockDrawingOf(flow, selection);
  return (
    <Box component="section" aria-label="Flow canvas" sx={styles.card}>
      {flow.blocks.length === 0 ? (
        <Box sx={styles.empty}>{emptyText}</Box>
      ) : (
        <Box sx={styles.scroll}>
          <DrawingView drawing={drawing} ink={styles.ink} onSelect={onSelect} />
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
      <Typography component="p" sx={styles.hint}>
        {hintText}
      </Typography>
    </Box>
  );
}

interface DrawingViewProps {
  readonly drawing: BlockDrawing;
  readonly ink: BlockInk;
  readonly onSelect: (selection: BlockSelection) => void;
}

// The SVG of the blocks and arrows. A click on the empty drawing clears the selection (a user decision for
// T015; no criterion names it).
function DrawingView({ drawing, ink, onSelect }: DrawingViewProps) {
  return (
    <svg width={drawing.width} height={drawing.height} onClick={() => onSelect({ kind: 'none' })}>
      <defs>
        <marker id="block-arrowhead" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={ink.line} />
        </marker>
        <marker id="block-arrowhead-accent" markerWidth={8} markerHeight={8} refX={7} refY={4} orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={ink.accent} />
        </marker>
      </defs>
      {drawing.arrows.map((arrow) => (
        <ArrowView key={`${arrow.fromId}.${arrow.output}`} arrow={arrow} ink={ink} onSelect={onSelect} />
      ))}
      {drawing.blocks.map((block) => (
        <BlockView key={block.blockId} block={block} ink={ink} onSelect={onSelect} />
      ))}
    </svg>
  );
}

// An arrow: a return is dashed and in the primary colour, a selected arrow is the primary colour at 2.5 px.
// A wide transparent line under it takes the click, so the arrow is easy to hit.
function ArrowView({
  arrow,
  ink,
  onSelect,
}: {
  readonly arrow: ArrowShape;
  readonly ink: BlockInk;
  readonly onSelect: (selection: BlockSelection) => void;
}) {
  const points = arrow.points.map((point) => `${point.x},${point.y}`).join(' ');
  const accent = arrow.selected || arrow.isReturn;
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
        stroke={accent ? ink.accent : ink.line}
        strokeWidth={arrow.selected ? 2.5 : 1.5}
        strokeDasharray={arrow.isReturn ? '6 4' : undefined}
        markerEnd={accent ? 'url(#block-arrowhead-accent)' : 'url(#block-arrowhead)'}
      />
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

// A block: a click selects it (AC-011). Its shape and text depend on its kind (AC-007).
function BlockView({
  block,
  ink,
  onSelect,
}: {
  readonly block: BlockShape;
  readonly ink: BlockInk;
  readonly onSelect: (selection: BlockSelection) => void;
}) {
  const select = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onSelect({ kind: 'block', blockId: block.blockId });
  };
  return (
    <g role="button" aria-label={block.accessibleName} onClick={select}>
      <BlockBody block={block} ink={ink} />
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
