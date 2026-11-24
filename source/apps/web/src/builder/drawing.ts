// The drawing data of the Pipeline canvas (F-11 AC-006, AC-008, AC-009, AC-035): the React Flow nodes
// (one box per flow) and edges (one arrow per `next`). It is a pure function of the pipeline and of
// the blocked flow ids, so the canvas can memoise it. No React and no I/O.

import { MarkerType } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';
import { canvasLayout } from './layout.js';
import type { Pipeline } from './model.js';
import type { Selection } from './panel.js';

// The size of a flow box in canvas pixels (F-11 screen 01: 80 by 76).
export const flowBoxWidth = 80;
export const flowBoxHeight = 76;

// The data a flow box carries: what its component draws (AC-006, AC-035, AC-042).
export type FlowBoxData = {
  readonly flowId: string;
  readonly name: string;
  readonly blockCount: number;
  readonly blocked: boolean;
  readonly selected: boolean;
  // The right point is the source of the selected arrow, or the left point is its target (device fix 2026-11-24):
  // those two points are drawn in the selected size, the ends of the selected arrow.
  readonly sourceOfSelectedArrow: boolean;
  readonly targetOfSelectedArrow: boolean;
};

// The data an arrow carries: whether it is the selected arrow (AC-042).
export type ArrowData = { readonly selected: boolean };

export type FlowBoxNode = Node<FlowBoxData, 'flow'>;

export type ArrowEdge = Edge<ArrowData>;

// The drawing of a pipeline: the nodes and the edges, in layout order.
// The arrays are mutable because React Flow takes mutable arrays; they are built fresh per call.
export interface Drawing {
  readonly nodes: FlowBoxNode[];
  readonly edges: ArrowEdge[];
}

// The handles of a flow box: the left point takes an arrow, the right point gives one (AC-008).
export const leftHandle = 'left';
export const rightHandle = 'right';

// Every flow in layout order as a box, and every `next` as an arrow from the right point of its source
// to the left point of its target. An arrow has no label and no gate (AC-008). A flow whose id is in
// `blockedFlowIds` is marked blocked (AC-035). The selected flow box and the selected arrow are marked
// selected (AC-042); with nothing selected (the pipeline selection) none is. An empty pipeline gives no
// nodes and no edges (AC-009). Boxes are draggable (AC-005); a drag is not part of this drawing.
export function drawingOf(
  pipelineState: Pipeline,
  blockedFlowIds: readonly string[],
  selection: Selection = { kind: 'pipeline' },
): Drawing {
  const layout = canvasLayout(pipelineState);
  const blocked = new Set(blockedFlowIds);
  const selectedFlowId = selection.kind === 'flow' ? selection.id : undefined;
  const selectedArrow = selection.kind === 'arrow' ? selection.arrow : undefined;
  const flowsById = new Map(pipelineState.flows.map((flow) => [flow.id, flow] as const));
  const nodes = layout.boxes.map((box): FlowBoxNode => {
    const flow = flowsById.get(box.flowId);
    if (flow === undefined) {
      throw new Error(`layout names flow "${box.flowId}", which is not in the pipeline`);
    }
    return {
      id: flow.id,
      type: 'flow',
      position: { x: box.x, y: 0 },
      width: flowBoxWidth,
      height: flowBoxHeight,
      // The measured size is known, so React Flow keeps a box's handle bounds when a drag replaces the node object;
      // without it the arrows of a dragged box are not drawn until the box is measured again.
      measured: { width: flowBoxWidth, height: flowBoxHeight },
      data: {
        flowId: flow.id,
        name: flow.name,
        blockCount: flow.blocks.length,
        blocked: blocked.has(flow.id),
        selected: flow.id === selectedFlowId,
        sourceOfSelectedArrow: selectedArrow?.source === flow.id,
        targetOfSelectedArrow: selectedArrow?.target === flow.id,
      },
      draggable: true,
      selectable: false,
    };
  });
  const edges = layout.arrows.map(
    (arrow): ArrowEdge => ({
      id: `${arrow.source}->${arrow.target}`,
      source: arrow.source,
      target: arrow.target,
      sourceHandle: rightHandle,
      targetHandle: leftHandle,
      markerEnd: { type: MarkerType.ArrowClosed },
      selectable: false,
      data: {
        selected:
          selectedArrow !== undefined && selectedArrow.source === arrow.source && selectedArrow.target === arrow.target,
      },
    }),
  );
  return { nodes, edges };
}
