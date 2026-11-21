// The canvas layout of the Pipeline tab (F-11 AC-005, AC-007, AC-009).
// A pure function of the flow list: boxes sit left to right in pipeline order at a fixed pitch,
// and one arrow runs along each flow's `next`. A box that the user drags is not an input, so it
// never moves the layout. No React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';

export type Pipeline = model.Pipeline;

// The distance in pixels from one box's left edge to the next box's left edge.
export const flowPitch = 110;

// One flow drawn as a box: its id and its left edge in canvas pixels.
export interface FlowBox {
  readonly flowId: string;
  readonly x: number;
}

// One arrow along a flow's `next`. It carries no label and no gate (AC-007).
export interface FlowArrow {
  readonly source: string;
  readonly target: string;
}

export interface CanvasLayout {
  readonly boxes: readonly FlowBox[];
  readonly arrows: readonly FlowArrow[];
}

// The boxes in list order at the fixed pitch, and the arrows in list order of their source.
// An empty pipeline gives no boxes and no arrows (AC-009). A `next` that names no flow in the
// pipeline is a programmer error: the connect rules never store one, so it throws.
export function canvasLayout(pipelineState: Pipeline): CanvasLayout {
  const flowIds = new Set(pipelineState.flows.map((flow) => flow.id));
  const boxes = pipelineState.flows.map(
    (flow, position): FlowBox => ({ flowId: flow.id, x: position * flowPitch }),
  );
  const arrows: FlowArrow[] = [];
  for (const flow of pipelineState.flows) {
    if (flow.next === undefined) {
      continue;
    }
    if (!flowIds.has(flow.next)) {
      throw new Error(`flow "${flow.id}" points to "${flow.next}", which is not in the pipeline`);
    }
    arrows.push({ source: flow.id, target: flow.next });
  }
  return { boxes, arrows };
}
