import { useMemo, useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import { Handle, PanOnScrollMode, Position, ReactFlow } from '@xyflow/react';
import type { Connection, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { dropLink, repointArrow } from './connect.js';
import type { ArrowEnd, DropResult, DropTarget } from './connect.js';
import { getCanvasStyles } from './canvasStyles.js';
import { drawingOf, leftHandle, rightHandle } from './drawing.js';
import type { FlowBoxNode } from './drawing.js';
import { MessageBand } from './MessageBand.js';
import type { BandMessage } from './MessageBand.js';
import type { Pipeline } from './model.js';
import type { Selection } from './panel.js';

// The Pipeline canvas (F-11 AC-006, AC-008, AC-009, AC-013, AC-014, AC-016, AC-035): the flows as boxes
// in one row, in pipeline order, with a left and a right connection point each, and an arrow along each
// `next` with no label. A link is made only by dragging from a right point onto another flow's left point
// (connect.ts decides); an arrow end is moved by dragging it onto a point (repointArrow decides). A
// refused drag or repoint shows its reason in the message band, and so does each blocker's message.
// The canvas reports the new pipeline through `onPipelineChange`; it keeps no pipeline of its own.

export interface CanvasProps {
  readonly pipelineState: Pipeline;
  readonly blockedFlowIds: readonly string[];
  // The messages of the blockers in the pipeline, shown in the band as "Blocker · …" (AC-035).
  readonly blockerMessages: readonly string[];
  // Called with the new pipeline when a drag or repoint changes it. Never called for a refusal.
  readonly onPipelineChange: (pipeline: Pipeline) => void;
  // Called when a box or an arrow is clicked (the box or arrow selected), or the empty canvas is clicked
  // (nothing selected, so the pipeline is shown). The caller holds the selection (AC-030, AC-042).
  readonly onSelect: (selection: Selection) => void;
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
    <Box sx={styles.flowBox[data.blocked ? 'blocked' : 'normal']}>
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

export function Canvas({ pipelineState, blockedFlowIds, blockerMessages, onPipelineChange, onSelect }: CanvasProps) {
  const styles = getCanvasStyles(useTheme());
  const drawing = useMemo(() => drawingOf(pipelineState, blockedFlowIds), [pipelineState, blockedFlowIds]);
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

  const messages: BandMessage[] = [
    ...(refusal === null ? [] : [{ kind: 'refused' as const, text: refusal }]),
    ...blockerMessages.map((text): BandMessage => ({ kind: 'blocker', text })),
  ];

  const flowCanvas =
    drawing.nodes.length === 0 ? (
      <Box sx={styles.empty}>No flows yet.</Box>
    ) : (
      <ReactFlow
        nodes={drawing.nodes}
        edges={drawing.edges}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 24, y: 0, zoom: 1 }}
        minZoom={1}
        maxZoom={1}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Horizontal}
        nodesDraggable={false}
        nodesConnectable
        connectOnClick={false}
        elementsSelectable={false}
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
      <MessageBand messages={messages} />
    </Box>
  );
}
