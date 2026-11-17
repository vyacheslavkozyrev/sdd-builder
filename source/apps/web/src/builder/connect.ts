// Connecting two flows on the Pipeline tab (F-11 AC-013, AC-014, model part). A pure function: it
// returns a new pipeline or a refusal with its reason, and never changes the pipeline it is given.
// A connection is the source flow's `connectedTo` (a flow has at most one outgoing arrow).

import type { pipeline } from '@sddbuilder/core';

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
