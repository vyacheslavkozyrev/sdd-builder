// Connecting two flows on the Pipeline tab (F-11 AC-013, AC-014, model part). A pure function: it
// returns a new pipeline or a refusal with its reason, and never changes the pipeline it is given.
// A connection is the source flow's `connectedTo` (a flow has at most one outgoing arrow).

import type { pipeline } from '@sddbuilder/core';
import type { Connection } from './model.js';

type Pipeline = pipeline.Pipeline;

export interface ConnectRequest {
  readonly source: string;
  readonly target: string;
  readonly label: string;
}

export type ConnectResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly reason: string };

export const BLANK_LABEL_REASON =
  'The artifact label is required: name the artifact this arrow passes to the next flow.';
export const TARGET_NOT_IN_PIPELINE_REASON = 'The target flow is not in the pipeline.';
export const SOURCE_NOT_IN_PIPELINE_REASON = 'The source flow is not in the pipeline.';
export const ALREADY_CONNECTED_REASON =
  'This flow already has an arrow to the next flow. A flow has one outgoing arrow: remove or repoint it first.';
export const SELF_CONNECTION_REASON =
  'A flow cannot connect to itself: the flows of a pipeline form no cycle (architecture.md §12).';

// Adds the connection from the source flow to the target flow. A refusal names its reason and
// leaves no connection behind (AC-013, AC-014).
export function connectFlows(config: Pipeline, request: ConnectRequest): ConnectResult {
  const source = config.flows.find((flow) => flow.id === request.source);
  if (source === undefined) {
    return { ok: false, reason: SOURCE_NOT_IN_PIPELINE_REASON };
  }
  if (!config.flows.some((flow) => flow.id === request.target)) {
    return { ok: false, reason: TARGET_NOT_IN_PIPELINE_REASON };
  }
  if (request.source === request.target) {
    return { ok: false, reason: SELF_CONNECTION_REASON };
  }
  if (source.connectedTo !== undefined) {
    return { ok: false, reason: ALREADY_CONNECTED_REASON };
  }
  if (request.label.trim() === '') {
    return { ok: false, reason: BLANK_LABEL_REASON };
  }
  const flows = config.flows.map((flow) =>
    flow.id === request.source
      ? { ...flow, connectedTo: { to: request.target, label: request.label } }
      : flow,
  );
  return { ok: true, pipeline: { ...config, flows } };
}

export const NO_ARROW_REASON = 'This flow has no arrow to the next flow.';

// Which end of an arrow to move, and the flow it moves to. The label and the gate stay (AC-015).
export type RepointChange =
  | { readonly end: 'target'; readonly flow: string }
  | { readonly end: 'source'; readonly flow: string };

// Changes one end of the arrow that starts at `sourceId`. Moving the target keeps the arrow on the
// same source; moving the source moves the whole arrow (label and gate) to another flow. The same
// refusals as a new connection apply: the flow must be in the pipeline, no self-connection, and one
// outgoing arrow per flow. A refusal leaves the pipeline unchanged (AC-015).
export function repointConnection(
  config: Pipeline,
  sourceId: string,
  change: RepointChange,
): ConnectResult {
  const source = config.flows.find((flow) => flow.id === sourceId);
  const link = source?.connectedTo;
  if (source === undefined || link === undefined) {
    return { ok: false, reason: NO_ARROW_REASON };
  }
  if (change.end === 'target') {
    if (!config.flows.some((flow) => flow.id === change.flow)) {
      return { ok: false, reason: TARGET_NOT_IN_PIPELINE_REASON };
    }
    if (change.flow === sourceId) {
      return { ok: false, reason: SELF_CONNECTION_REASON };
    }
    const flows = config.flows.map((flow) =>
      flow.id === sourceId ? { ...flow, connectedTo: { ...link, to: change.flow } } : flow,
    );
    return { ok: true, pipeline: { ...config, flows } };
  }

  const newSource = config.flows.find((flow) => flow.id === change.flow);
  if (newSource === undefined) {
    return { ok: false, reason: SOURCE_NOT_IN_PIPELINE_REASON };
  }
  if (change.flow === sourceId) {
    return { ok: true, pipeline: { ...config } };
  }
  if (change.flow === link.to) {
    return { ok: false, reason: SELF_CONNECTION_REASON };
  }
  if (newSource.connectedTo !== undefined) {
    return { ok: false, reason: ALREADY_CONNECTED_REASON };
  }
  const flows = config.flows.map((flow) => {
    if (flow.id === sourceId) {
      const { connectedTo: _moved, ...rest } = flow;
      return rest;
    }
    return flow.id === change.flow ? { ...flow, connectedTo: { ...link } } : flow;
  });
  return { ok: true, pipeline: { ...config, flows } };
}

// Removes the arrow that starts at `sourceId`, and its gate with it (AC-016). The flows stay.
export function removeConnection(config: Pipeline, sourceId: string): ConnectResult {
  const source = config.flows.find((flow) => flow.id === sourceId);
  if (source === undefined || source.connectedTo === undefined) {
    return { ok: false, reason: NO_ARROW_REASON };
  }
  const flows = config.flows.map((flow) => {
    if (flow.id === sourceId) {
      const { connectedTo: _removed, ...rest } = flow;
      return rest;
    }
    return flow;
  });
  return { ok: true, pipeline: { ...config, flows } };
}

// The text the confirmation for Delete on an arrow shows (AC-016). It names the arrow, its artifact
// and, when there is one, the gate that is removed with it.
export interface ConnectionConfirmation {
  readonly title: string;
  readonly detail: string;
}

export function connectionConfirmation(connection: Connection): ConnectionConfirmation {
  const title = `Delete the arrow ${connection.source} → ${connection.target}?`;
  const gate = connection.gate;
  const gateText =
    gate === undefined
      ? ''
      : ` Its ${gate.kind === 'approval' ? 'approval' : 'check'} gate ("${gate.description}") is removed with it.`;
  return {
    title,
    detail: `This removes the arrow with the artifact "${connection.label}".${gateText} The flows stay.`,
  };
}
