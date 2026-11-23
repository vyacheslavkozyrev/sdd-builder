import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { Handle, MarkerType, PanOnScrollMode, Position, ReactFlow } from '@xyflow/react';
import type { Connection, Edge, NodeProps, XYPosition } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { dropLink, repointArrow } from './connect.js';
import type { ArrowEnd, DropResult, DropTarget } from './connect.js';
import { getCanvasStyles } from './canvasStyles.js';
import type { CanvasStyles } from './canvasStyles.js';
import { drawingOf, leftHandle, rightHandle } from './drawing.js';
import type { ArrowEdge, FlowBoxData, FlowBoxNode } from './drawing.js';
import { canvasLayout } from './layout.js';
import { MessageBand } from './MessageBand.js';
import type { Pipeline } from './model.js';
import type { Selection } from './panel.js';

// The Pipeline canvas (F-11 AC-005, AC-006, AC-008, AC-009, AC-013, AC-014, AC-016, AC-035, AC-042): the flows
// as boxes in one row, in pipeline order, with a left and a right connection point each, and an arrow along
// each `next` with no label. A box can be dragged; a dragged place is kept only until the layout changes and
// is never saved in the pipeline. A link is made only by dragging from a right point onto another flow's left
// point (connect.ts decides); an arrow end is moved by dragging it onto a point (repointArrow decides). A
// refused drag or repoint shows its reason in the message band; blockers and warnings are in the error panel.
// The canvas reports the new pipeline through `onPipelineChange`; it keeps no pipeline of its own.

export interface CanvasProps {
  readonly pipelineState: Pipeline;
  readonly blockedFlowIds: readonly string[];
  // The item selected on the Pipeline tab; the selected box and arrow are drawn with the selected style (AC-042).
  readonly selection: Selection;
  // Called with the new pipeline when a drag or repoint changes it. Never called for a refusal.
  readonly onPipelineChange: (pipeline: Pipeline) => void;
  // Called when a box or an arrow is clicked (the box or arrow selected), or the empty canvas is clicked
  // (nothing selected, so the pipeline is shown). The caller holds the selection (AC-030, AC-042).
  readonly onSelect: (selection: Selection) => void;
}

// The places the user dragged boxes to, and the layout they were dragged in (AC-005).
interface DraggedPlaces {
  readonly layout: string;
  readonly places: Readonly<Record<string, XYPosition>>;
}

const noDraggedPlaces: DraggedPlaces = { layout: '', places: {} };

// Which look a flow box has: its blocked state (AC-035) and whether it is selected (AC-042).
type BoxState = keyof CanvasStyles['flowBox'];

function boxStateOf(data: FlowBoxData): BoxState {
  if (data.blocked) return data.selected ? 'blockedSelected' : 'blocked';
  return data.selected ? 'selected' : 'normal';
}

// The label under a flow's name: the count of its blocks (F-11 screen 01).
function blockLabel(count: number): string {
  return count === 1 ? '1 block' : `${count} blocks`;
}

// The drop under a React Flow handle: a connection point of a flow, or the body of a flow (AC-012).
function dropOnHandle(flow: string, handle: string | null): DropTarget {
  if (handle === leftHandle) {
    return { kind: 'point', flow, side: 'left' };
  }
  if (handle === rightHandle) {
    return { kind: 'point', flow, side: 'right' };
  }
  return { kind: 'body', flow };
}

// A flow box: the name and the block count, with the left and the right connection points.
function FlowBox({ data }: NodeProps<FlowBoxNode>) {
  const styles = getCanvasStyles(useTheme());
  return (
    <Box sx={styles.flowBox[boxStateOf(data)]}>
      {/* A link starts only at a right point (AC-013); a drag that starts at a left point is not a link. */}
      <Handle type="target" position={Position.Left} id={leftHandle} isConnectableStart={false} />
      <Box component="span" sx={styles.flowName}>
        {data.name}
      </Box>
      <Box component="span" sx={styles.flowCount}>
        {blockLabel(data.blockCount)}
      </Box>
      <Handle type="source" position={Position.Right} id={rightHandle} />
    </Box>
  );
}

// Defined once, outside the component, so React Flow keeps the same node types between renders.
const nodeTypes = { flow: FlowBox };

export function Canvas({ pipelineState, blockedFlowIds, selection, onPipelineChange, onSelect }: CanvasProps) {
  const styles = getCanvasStyles(useTheme());
  const drawing = useMemo(
    () => drawingOf(pipelineState, blockedFlowIds, selection),
    [pipelineState, blockedFlowIds, selection],
  );
  // The selected arrow is drawn in the primary colour with a 2.5 px stroke (AC-042); the others keep React Flow's look.
  const edges = drawing.edges.map((edge): ArrowEdge =>
    edge.data?.selected === true
      ? {
          ...edge,
          style: styles.selectedArrow.style,
          markerEnd: { type: MarkerType.ArrowClosed, color: styles.selectedArrow.markerColor },
        }
      : edge,
  );
  // The layout as a key: a dragged place is kept only while the layout is the one it was dragged in (AC-005).
  const layoutKey = useMemo(() => JSON.stringify(canvasLayout(pipelineState)), [pipelineState]);
  const [dragged, setDragged] = useState<DraggedPlaces>(noDraggedPlaces);
  // A change of layout drops every dragged place, so a return to an earlier layout does not bring them back (AC-005).
  useEffect(() => {
    setDragged(noDraggedPlaces);
  }, [layoutKey]);
  const nodes = useMemo(
    () =>
      drawing.nodes.map((node): FlowBoxNode => {
        const place = dragged.layout === layoutKey ? dragged.places[node.id] : undefined;
        return place === undefined ? node : { ...node, position: place };
      }),
    [drawing, dragged, layoutKey],
  );
  // The reason of the last refused drag or repoint. A drag that does not count (AC-012) keeps it.
  const [refusal, setRefusal] = useState<string | null>(null);
  // Which end of an arrow the current reconnect drag moves. React Flow's onReconnect does not say it.
  const reconnectEnd = useRef<ArrowEnd>('target');

  const settle = (result: DropResult): void => {
    if (result.kind === 'changed') {
      setRefusal(null);
      onPipelineChange(result.pipeline);
    } else if (result.kind === 'refused') {
      setRefusal(result.reason);
    }
  };

  const flowCanvas =
    drawing.nodes.length === 0 ? (
      <Box sx={styles.empty}>No flows yet.</Box>
    ) : (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 24, y: 0, zoom: 1 }}
        minZoom={1}
        maxZoom={1}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Horizontal}
        nodesDraggable
        nodesConnectable
        connectOnClick={false}
        elementsSelectable={false}
        onNodesChange={(changes) => {
          // A drag moves a box on the canvas only; the pipeline is not changed (AC-005).
          const moved: { id: string; position: XYPosition }[] = [];
          for (const change of changes) {
            if (change.type === 'position' && change.position !== undefined) {
              moved.push({ id: change.id, position: change.position });
            }
          }
          if (moved.length === 0) return;
          setDragged((current) => {
            const places: Record<string, XYPosition> = current.layout === layoutKey ? { ...current.places } : {};
            for (const move of moved) {
              places[move.id] = move.position;
            }
            return { layout: layoutKey, places };
          });
        }}
        onNodeClick={(_event, node) => {
          onSelect({ kind: 'flow', id: node.id });
        }}
        onEdgeClick={(_event, edge) => {
          onSelect({ kind: 'arrow', arrow: { source: edge.source, target: edge.target } });
        }}
        onPaneClick={() => {
          onSelect({ kind: 'pipeline' });
        }}
        onConnect={(connection: Connection) =>
          settle(dropLink(pipelineState, connection.source, dropOnHandle(connection.target, connection.targetHandle)))
        }
        onReconnectStart={(_event, _edge, handleType) => {
          // React Flow reports the type of the end that stays fixed, so the dragged end is the other one.
          reconnectEnd.current = handleType === 'target' ? 'source' : 'target';
        }}
        onReconnect={(oldEdge: Edge, connection: Connection) => {
          const arrow = { source: oldEdge.source, target: oldEdge.target };
          const end = reconnectEnd.current;
          const drop =
            end === 'source'
              ? dropOnHandle(connection.source, connection.sourceHandle)
              : dropOnHandle(connection.target, connection.targetHandle);
          settle(repointArrow(pipelineState, arrow, end, drop));
        }}
      />
    );

  return (
    <Box aria-label="Pipeline canvas" sx={styles.root}>
      {flowCanvas}
      <MessageBand refusal={refusal} />
    </Box>
  );
}
