// The view-model of the Pipeline canvas (F-11 AC-007 to AC-009, AC-012, AC-022). A pure function: it turns the pipeline
// into the boxes and arrows the canvas draws, reads what a drop means, and builds the requests the existing functions
// take. No React and no I/O. The component only wires React Flow's events to these functions.

import type { pipeline } from '@sddbuilder/core';
import { layout } from './layout.js';
import { boxes, connections, type Connection } from './model.js';
import { repointConnection, type ConnectResult } from './connect.js';
import type { GateRequest } from './gates.js';
import { TOOLBOX, type Selection, type ToolboxTool } from './panel.js';

type Pipeline = pipeline.Pipeline;
type Gate = pipeline.Gate;

// The data type a toolbox tool carries when it is dragged onto the canvas.
export const TOOL_MIME = 'application/x-sddbuilder-tool';

// A box is 140 px wide and 56 px high. React Flow draws the arrows once the boxes have a size, so the size is given
// here and the arrows do not wait for a measurement.
export const BOX_WIDTH = 140;
export const BOX_HEIGHT = 56;

// The tools a gate is dragged from the toolbox to an arrow (AC-022). The Connection tool is not a gate.
export type GateTool = Exclude<ToolboxTool, 'Connection'>;

// A box as the canvas draws it: its place from the layout and its text (AC-007, AC-009).
export interface BoxView {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly blocks: string;
}

// An arrow as the canvas draws it: its label with the gate, if any, on the same line (AC-008).
export interface ArrowView {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly label: string;
}

// "0 blocks", "1 block", "5 blocks" (AC-007).
export function blockText(count: number): string {
  return count === 1 ? '1 block' : `${count} blocks`;
}

// The gate's text on an arrow: "gate: approval", or the check's type and its description (AC-017, AC-018).
export function gateText(gate: Gate): string {
  if (gate.kind === 'approval') {
    return `gate: approval (${gate.description})`;
  }
  return `gate: check ${gate.type} (${gate.description})`;
}

// The arrow's label: the artifact label, and the gate after it when the arrow has one.
export function arrowLabel(connection: Connection): string {
  return connection.gate === undefined
    ? connection.label
    : `${connection.label} · ${gateText(connection.gate)}`;
}

export function boxViews(config: Pipeline): BoxView[] {
  const places = layout(config);
  return boxes(config).map((box, index): BoxView => {
    const place = places[index];
    return {
      id: box.id,
      x: place?.x ?? 0,
      y: place?.y ?? 0,
      name: box.name,
      blocks: blockText(box.blockCount),
    };
  });
}

export function arrowViews(config: Pipeline): ArrowView[] {
  return connections(config).map((connection): ArrowView => ({
    id: connection.source,
    source: connection.source,
    target: connection.target,
    label: arrowLabel(connection),
  }));
}

// The layout is recomputed only when the flows change (their ids and their order). A box dragged by the user keeps
// its place until then (AC-011).
export function layoutKey(config: Pipeline): string {
  return config.flows.map((flow) => flow.id).join('\n');
}

// The toolbox tool a drag carries, or undefined for anything else on the drag.
export function toolFrom(value: string): ToolboxTool | undefined {
  return TOOLBOX.find((tool) => tool === value);
}

export function isGateTool(tool: ToolboxTool): tool is GateTool {
  return tool === 'Approval' || tool === 'Check';
}

// The values of the gate form as the user typed them.
export interface GateFields {
  readonly description: string;
  readonly type: string;
  readonly threshold: string;
}

// The request for `addGate`: an approval, or a check with its type and threshold. The threshold is passed on for any
// type, so a threshold typed under `diff size` and left when the type is `checks` is refused by the parser with its
// reason, and no gate is added (AC-018).
export function gateRequestFor(tool: GateTool, fields: GateFields): GateRequest {
  if (tool === 'Approval') {
    return { kind: 'approval', description: fields.description };
  }
  return {
    kind: 'check',
    description: fields.description,
    type: fields.type,
    threshold: fields.threshold,
  };
}

// A reconnect ends at the flow under the pointer (AC-012). React Flow reports the end that stayed fixed, not the end
// that was dragged: dragging the source end reports 'target', and dragging the target end reports 'source'. So the
// end that moved is the opposite one. A refusal is returned as is, and the pipeline is unchanged.
export function reconnectFor(
  config: Pipeline,
  arrowSource: string,
  fixedEnd: 'source' | 'target',
  dropFlow: string,
): ConnectResult {
  const movedEnd = fixedEnd === 'source' ? 'target' : 'source';
  return repointConnection(config, arrowSource, { end: movedEnd, flow: dropFlow });
}

// The line under the canvas heading: what is selected (screens 02, 03, 04 and 10).
export function captionFor(config: Pipeline, selection: Selection | undefined): string {
  const base = 'Flows in pipeline order.';
  if (selection === undefined || selection.kind === 'pipeline') {
    return base;
  }
  if (selection.kind === 'flow') {
    const flow = config.flows.find((item) => item.id === selection.id);
    return flow === undefined ? base : `${base} Selected: ${flow.name}.`;
  }
  const link = config.flows.find((item) => item.id === selection.source)?.connectedTo;
  if (link === undefined) {
    return base;
  }
  const noGate = link.gate === undefined ? ' This arrow has no gate yet.' : '';
  return `${base} The selected arrow is ${selection.source} → ${link.to}.${noGate}`;
}

// The width of the row of boxes in pixels at zoom 1: from the left edge of the first box to the right edge of the last.
export function rowWidth(config: Pipeline): number {
  return boxViews(config).reduce((right, box) => Math.max(right, box.x + BOX_WIDTH), 0);
}

// The scroll strip under the row (screens 01 to 03): where its thumb starts and how wide it is, as fractions of the
// strip. `row` and `visible` are in pixels, `viewportX` is the canvas pan in pixels, and `zoom` the canvas zoom.
export function stripThumb(
  row: number,
  visible: number,
  viewportX: number,
  zoom: number,
): { readonly left: number; readonly width: number } {
  const total = Math.max(row * zoom, visible, 1);
  const width = Math.min(1, visible / total);
  const left = Math.min(1 - width, Math.max(0, -viewportX / total));
  return { left, width };
}

// The pan that centres the visible part of the row on `fraction` of the strip (0 to 1). It stays inside the row, so
// the strip never pans past the first or the last box.
export function panFor(fraction: number, row: number, visible: number, zoom: number): number {
  const total = Math.max(row * zoom, visible, 1);
  const centred = visible / 2 - fraction * total;
  return Math.min(0, Math.max(visible - total, centred));
}
