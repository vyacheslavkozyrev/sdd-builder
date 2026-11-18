import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  BaseEdge,
  MarkerType,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type EdgeTypes,
  type HandleType,
  type Node,
  type OnNodesChange,
  type ReactFlowInstance,
  type Viewport,
  type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { pipeline } from '@sddbuilder/core';
import { connectFlows, type ConnectResult } from './connect.js';
import { addGate } from './gates.js';
import { BOX_PITCH } from './layout.js';
import {
  BOX_HEIGHT,
  BOX_WIDTH,
  TOOL_MIME,
  arrowLook,
  arrowViews,
  boxViews,
  captionFor,
  gateRequestFor,
  isGateTool,
  layoutKey,
  panFor,
  reconnectFor,
  rowWidth,
  stripThumb,
  toolFrom,
  type GateFields,
  type GateTool,
} from './drawing.js';
import {
  ArrowLabel,
  EMPTY_MARKS_NOTE,
  FlowMarks,
  MARKS_NOTE,
  MarksNote,
  NotDrawnMarks,
} from './MarkViews.js';
import { arrowMarksBySource, marksFor } from './marks.js';
import { FORM_SX, GateForm } from './GateForm.js';
import type { Selection } from './panel.js';

type Pipeline = pipeline.Pipeline;
type Rule = pipeline.Rule;

// The Pipeline canvas (F-11 AC-007 to AC-009, AC-011, AC-012, AC-022, AC-024). It draws the view-model of drawing.ts
// with React Flow, and wires its events to the pure functions: a repoint, a connection and a gate are each one call,
// and a refusal is shown with its reason. The canvas takes the centre of the page; the toolbox and the panel sit
// beside it. The row clips at the canvas edge, and a strip under it shows and moves the visible part (screens 01 to 03).

const CANVAS_SX = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
  height: '100%',
  minHeight: 420,
  border: '1px solid #cbd5e1',
  bgcolor: '#ffffff',
} as const;
const HEAD_SX = { fontSize: 14, fontWeight: 700, px: 1.5, pt: 1.5 } as const;
const CAPTION_SX = { fontSize: 11, color: '#64748b', px: 1.5, pt: 0.25 } as const;
const NOTE_SX = { fontSize: 12, color: '#334155', px: 1.5, pt: 1 } as const;
const ALERT_SX = { fontSize: 12, color: '#b91c1c', px: 1.5, pt: 1 } as const;
const STRIP_SX = {
  position: 'relative',
  height: 8,
  mx: 1.5,
  mt: 1,
  borderRadius: 4,
  bgcolor: '#e2e8f0',
  cursor: 'pointer',
} as const;
const THUMB_SX = { position: 'absolute', top: 0, height: '100%', borderRadius: 4, bgcolor: '#94a3b8' } as const;
const EMPTY_SX = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0.5,
  textAlign: 'center',
} as const;
const EMPTY_HEAD_SX = { fontSize: 14, fontWeight: 700 } as const;
// The marks of a box sit under it, in the box's own width, so they stay beside the box they name (AC-035).
const BOX_MARKS_SX = { position: 'absolute', top: BOX_HEIGHT + 6, left: 0, width: BOX_WIDTH } as const;
// The label of an arrow is as wide as one box pitch, so the labels of two arrows do not overlap, and it sits above the row.
const ARROW_LABEL_WIDTH = BOX_PITCH - 8;
const ARROW_LABEL_GAP = 6;

const INITIAL_VIEW: Viewport = { x: 24, y: 80, zoom: 1 };
const PENDING_NOTE = 'Connection: drop it on the next flow, or on empty canvas to cancel.';
const STRIP_NOTE = 'Drag the canvas or use the strip to see the rest of the row.';
const EMPTY_CAPTION = 'No flows in this pipeline.';
const NO_PLACES: Record<string, XYPosition> = {};
const CANVAS_LABEL = 'Pipeline canvas';

// An arrow is a bezier path with its label drawn inside the arrow's own group, so a drop on the label reaches the arrow
// (AC-022). The label is the artifact label, its gate and the arrow's marks (AC-008, AC-035). The boxes are drawn over
// the edges, so the label sits above the row of boxes, where no box covers it (screens 01 to 03).
function ArrowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={path} {...(style === undefined ? {} : { style })} {...(markerEnd === undefined ? {} : { markerEnd })} />
      <foreignObject
        x={labelX - ARROW_LABEL_WIDTH / 2}
        y={labelY - BOX_HEIGHT / 2 - ARROW_LABEL_GAP}
        width={ARROW_LABEL_WIDTH}
        height={1}
        overflow="visible"
      >
        <Box sx={{ textAlign: 'center', transform: 'translateY(-100%)' }}>{label}</Box>
      </foreignObject>
    </>
  );
}
const EDGE_TYPES: EdgeTypes = { arrow: ArrowEdge };

// What a drop on the canvas asks for next: the artifact label of a new arrow, or the gate for an arrow.
type DropState =
  | { readonly kind: 'label'; readonly source: string; readonly target: string }
  | { readonly kind: 'gate'; readonly source: string; readonly tool: GateTool };

export interface CanvasProps {
  readonly pipeline: Pipeline;
  // The rule list of step 2: the analyzer needs it to tell a rule tag that names no rule (F-10).
  readonly rules: readonly Rule[];
  readonly selection: Selection | undefined;
  readonly onSelect: (selection: Selection | undefined) => void;
  readonly onChange: (next: Pipeline) => void;
}

// The id of the closest element matching `selector` (a box or an arrow), or undefined on empty canvas.
function closestId(target: EventTarget | null, selector: string): string | undefined {
  if (!(target instanceof Element)) {
    return undefined;
  }
  return target.closest(selector)?.getAttribute('data-id') ?? undefined;
}

export function Canvas({ pipeline: config, rules, selection, onSelect, onChange }: CanvasProps) {
  const key = layoutKey(config);
  // The marks follow the pipeline on every change (AC-037); they are only shown, never checked against an edit.
  const marks = useMemo(() => marksFor(config, rules), [config, rules]);
  const anyMark = [...marks.boxes, ...marks.arrows, marks.notDrawn].some((list) => list.length > 0);
  // Boxes the user dragged keep their place until the layout is recomputed (a change of the flows).
  const [moved, setMoved] = useState<{ key: string; places: Record<string, XYPosition> }>({ key, places: {} });
  const places = moved.key === key ? moved.places : NO_PLACES;
  const [pending, setPending] = useState<string | undefined>(undefined);
  const [drop, setDrop] = useState<DropState | undefined>(undefined);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [view, setView] = useState<Viewport>(INITIAL_VIEW);
  const [visible, setVisible] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<ReactFlowInstance<Node, Edge> | undefined>(undefined);

  // The width of the visible row, to size the strip. It follows the canvas when the window changes.
  useEffect(() => {
    const element = rowRef.current;
    if (element === null) {
      return undefined;
    }
    const measure = () => setVisible(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The nodes and the edges are memoised, so the objects React Flow receives keep their identity between renders that
  // change nothing (F-11 AC-008). Their inputs are listed in the dependency arrays.
  const nodes = useMemo<Node[]>(() => boxViews(config).map((box, index) => {
    const findings = marks.boxes[index] ?? [];
    const blocked = findings.some((finding) => finding.severity === 'blocker');
    return {
      id: box.id,
      position: places[box.id] ?? { x: box.x, y: box.y },
      data: {
        label: (
          <>
            <strong>{box.name}</strong>
            <br />
            {box.blocks}
            {findings.length === 0 ? null : (
              <Box sx={BOX_MARKS_SX}>
                <FlowMarks findings={findings} />
              </Box>
            )}
          </>
        ),
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      width: BOX_WIDTH,
      height: BOX_HEIGHT,
      selected: selection?.kind === 'flow' && selection.id === box.id,
      ...(blocked ? { style: { borderColor: '#dc2626', borderWidth: 2 } } : {}),
    };
  }), [config, marks, places, selection]);

  // The arrow that leaves each flow carries that flow's arrow marks (`marks.arrows[i]`).
  const edges = useMemo<Edge[]>(() => {
    const arrowMarks = arrowMarksBySource(config, marks);
    return arrowViews(config).map((arrow) => {
      const selected = selection?.kind === 'arrow' && selection.source === arrow.source;
      const look = arrowLook(selected);
      return {
        id: arrow.id,
        source: arrow.source,
        target: arrow.target,
        type: 'arrow',
        label: <ArrowLabel text={arrow.label} findings={arrowMarks.get(arrow.source) ?? []} />,
        style: { stroke: look.colour, strokeWidth: look.width },
        markerEnd: { type: MarkerType.ArrowClosed, color: look.colour },
        selected,
      };
    });
  }, [config, marks, selection]);

  const row = rowWidth(config);
  const overflows = row * view.zoom > visible;
  const thumb = stripThumb(row, visible, view.x, view.zoom);

  // A press or a drag on the strip moves the canvas so that the point under the pointer is centred.
  const panOnStrip = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    flowRef.current?.setViewport({
      x: panFor(fraction, row, visible, view.zoom),
      y: view.y,
      zoom: view.zoom,
    });
  };

  const onNodesChange: OnNodesChange<Node> = (changes) => {
    const next = { ...places };
    let moving = false;
    for (const change of changes) {
      if (change.type === 'position' && change.position !== undefined) {
        next[change.id] = change.position;
        moving = true;
      }
    }
    // Only a move changes the state: dimension changes arrive on every measure and must not re-render the canvas.
    if (moving) {
      setMoved({ key, places: next });
    }
  };

  // React Flow passes the end that stayed fixed (`fixedEnd`); reconnectFor takes the end that moved.
  const onReconnectEnd = (event: MouseEvent | TouchEvent, edge: Edge, fixedEnd: HandleType) => {
    const dropFlow = closestId(event.target, '.react-flow__node');
    if (dropFlow === undefined) {
      return;
    }
    const result = reconnectFor(config, edge.source, fixedEnd, dropFlow);
    if (result.ok) {
      setNotice(undefined);
      onChange(result.pipeline);
    } else {
      setNotice(result.reason);
    }
  };

  const onDragOver = (event: DragEvent<HTMLElement>) => {
    if (Array.from(event.dataTransfer.types).includes(TOOL_MIME)) {
      event.preventDefault();
    }
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    const tool = toolFrom(event.dataTransfer.getData(TOOL_MIME));
    if (tool === undefined) {
      return;
    }
    event.preventDefault();
    if (tool === 'Connection') {
      dropConnection(closestId(event.target, '.react-flow__node'));
      return;
    }
    const arrow = closestId(event.target, '.react-flow__edge');
    if (isGateTool(tool) && arrow !== undefined) {
      setNotice(undefined);
      setDrop({ kind: 'gate', source: arrow, tool });
    }
  };

  // The first flow the Connection tool is dropped on is the source; the next one is the target, and the artifact
  // label is asked before the arrow is added (AC-012).
  const dropConnection = (flow: string | undefined) => {
    if (flow === undefined) {
      setPending(undefined);
      return;
    }
    if (pending === undefined) {
      setNotice(undefined);
      setPending(flow);
      return;
    }
    setPending(undefined);
    setNotice(undefined);
    setDrop({ kind: 'label', source: pending, target: flow });
  };

  return (
    <Box component="section" aria-label={CANVAS_LABEL} sx={CANVAS_SX} onDragOver={onDragOver} onDrop={onDrop}>
      <Typography component="h2" sx={HEAD_SX}>
        Pipeline
      </Typography>
      <Typography sx={CAPTION_SX}>
        {nodes.length === 0 ? EMPTY_CAPTION : captionFor(config, selection)}
      </Typography>
      {pending === undefined ? null : <Typography sx={NOTE_SX}>{PENDING_NOTE}</Typography>}
      {notice === undefined ? null : (
        <Typography role="alert" sx={ALERT_SX}>
          {notice}
        </Typography>
      )}
      <Box ref={rowRef} sx={{ flex: 1, minHeight: 0 }}>
        {nodes.length === 0 ? (
          <Box sx={EMPTY_SX}>
            <Typography sx={EMPTY_HEAD_SX}>No flows yet.</Typography>
            <Typography sx={NOTE_SX}>Add one with + in the tab row.</Typography>
            <MarksNote text={EMPTY_MARKS_NOTE} />
          </Box>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onInit={(instance) => {
              flowRef.current = instance;
            }}
            onMove={(_event, next) => setView(next)}
            onNodeDragStart={(_event, node) => onSelect({ kind: 'flow', id: node.id })}
            onNodeClick={(_event, node) => onSelect({ kind: 'flow', id: node.id })}
            onEdgeClick={(_event, edge) => onSelect({ kind: 'arrow', source: edge.source })}
            onPaneClick={() => onSelect(undefined)}
            onReconnectEnd={onReconnectEnd}
            nodesConnectable={false}
            edgesReconnectable
            zoomOnScroll={false}
            zoomOnDoubleClick={false}
            deleteKeyCode={null}
            defaultViewport={INITIAL_VIEW}
            edgeTypes={EDGE_TYPES}
          />
        )}
      </Box>
      {overflows ? (
        <>
          <Box
            role="presentation"
            sx={STRIP_SX}
            onPointerDown={(event) => panOnStrip(event)}
            onPointerMove={(event) => {
              if (event.buttons === 1) {
                panOnStrip(event);
              }
            }}
          >
            <Box sx={{ ...THUMB_SX, left: `${thumb.left * 100}%`, width: `${thumb.width * 100}%` }} />
          </Box>
          <Typography sx={CAPTION_SX}>{STRIP_NOTE}</Typography>
        </>
      ) : null}
      <NotDrawnMarks findings={marks.notDrawn} />
      {anyMark ? <MarksNote text={MARKS_NOTE} /> : null}
      {drop === undefined ? null : (
        <DropDialog
          state={drop}
          config={config}
          onClose={() => setDrop(undefined)}
          onDone={(next) => {
            setDrop(undefined);
            onChange(next);
          }}
        />
      )}
    </Box>
  );
}

interface DropDialogProps {
  readonly state: DropState;
  readonly config: Pipeline;
  readonly onClose: () => void;
  readonly onDone: (next: Pipeline) => void;
}

// Asks for the artifact label of a new arrow, or for the gate's values. A refusal of the function stays in the dialog
// with its reason; Cancel changes nothing (AC-013, AC-017, AC-018, AC-022).
function DropDialog({ state, config, onClose, onDone }: DropDialogProps) {
  const [label, setLabel] = useState('');
  const [fields, setFields] = useState<GateFields>({ description: '', type: '', threshold: '' });
  const [reason, setReason] = useState<string | undefined>(undefined);

  const confirm = () => {
    const result: ConnectResult =
      state.kind === 'label'
        ? connectFlows(config, { source: state.source, target: state.target, label })
        : addGate(config, state.source, gateRequestFor(state.tool, fields));
    if (result.ok) {
      onDone(result.pipeline);
    } else {
      setReason(result.reason);
    }
  };

  const title =
    state.kind === 'label'
      ? `Connect ${state.source} to ${state.target}`
      : `Add ${state.tool} to the arrow from ${state.source}`;

  return (
    <Dialog open onClose={onClose} aria-labelledby="drop-dialog-title" fullWidth maxWidth="xs">
      <DialogTitle id="drop-dialog-title">{title}</DialogTitle>
      <DialogContent>
        {state.kind === 'label' ? (
          <Box sx={FORM_SX}>
            <TextField
              label="Artifact label · required"
              helperText="what is handed over"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              autoFocus
            />
          </Box>
        ) : (
          <GateForm tool={state.tool} fields={fields} onChange={setFields} autoFocus />
        )}
        {reason === undefined ? null : (
          <Typography role="alert" sx={ALERT_SX}>
            {reason}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={confirm}>
          {state.kind === 'label' ? 'Connect' : `Add ${state.tool.toLowerCase()}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
