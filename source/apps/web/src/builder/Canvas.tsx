import { useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { Handle, PanOnScrollMode, Position, ReactFlow } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getCanvasStyles } from './canvasStyles.js';
import { drawingOf, leftHandle, rightHandle } from './drawing.js';
import type { FlowBoxNode } from './drawing.js';
import type { Pipeline } from './model.js';

// The Pipeline canvas (F-11 AC-006, AC-008, AC-009, AC-035): the flows as boxes in one row, in
// pipeline order, with a left and a right connection point each, and an arrow along each `next`
// with no label. A blocked flow has a red border and a light red fill. With no flows the canvas
// says "No flows yet.". The drawing data is built by drawing.ts and memoised here, so React Flow
// measures the edges from arrays that do not change between renders. Interactions (connect,
// repoint) belong to the next task; here the boxes and arrows are shown only.

export interface CanvasProps {
  readonly pipelineState: Pipeline;
  readonly blockedFlowIds: readonly string[];
}

// The label under a flow's name: the count of its blocks (F-11 screen 01).
function blockLabel(count: number): string {
  return count === 1 ? '1 block' : `${count} blocks`;
}

// A flow box: the name and the block count, with the left and the right connection points.
function FlowBox({ data }: NodeProps<FlowBoxNode>) {
  const styles = getCanvasStyles(useTheme());
  return (
    <Box sx={styles.flowBox[data.blocked ? 'blocked' : 'normal']}>
      <Handle type="target" position={Position.Left} id={leftHandle} />
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

export function Canvas({ pipelineState, blockedFlowIds }: CanvasProps) {
  const styles = getCanvasStyles(useTheme());
  const drawing = useMemo(() => drawingOf(pipelineState, blockedFlowIds), [pipelineState, blockedFlowIds]);
  if (drawing.nodes.length === 0) {
    return (
      <Box aria-label="Pipeline canvas" sx={styles.root}>
        <Box sx={styles.empty}>No flows yet.</Box>
      </Box>
    );
  }
  return (
    <Box aria-label="Pipeline canvas" sx={styles.root}>
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
        nodesConnectable={false}
        elementsSelectable={false}
      />
    </Box>
  );
}
