// Deleting a flow on the Pipeline tab (F-11 AC-031 to AC-033). A pure function: it returns a new pipeline and the
// arrows removed with the flow, or a refusal with its reason, and never changes the pipeline it is given. An arrow
// and its gate are part of the source flow's `connectedTo`, so removing a flow removes its outgoing arrow with
// the gate, and every arrow that points to it, with their gates. The list it returns is what the confirmation names.

import type { pipeline } from '@sddbuilder/core';
import { connections } from './model.js';
import type { Connection } from './model.js';

type Pipeline = pipeline.Pipeline;

export const UNKNOWN_FLOW_REASON = 'The flow is not in the pipeline.';

export type DeleteResult =
  | { readonly ok: true; readonly pipeline: Pipeline; readonly removed: Connection[] }
  | { readonly ok: false; readonly reason: string };

// Deletes the flow with `flowId`. `removed` lists every arrow the flow had, in or out, each with its gate (AC-031).
// The other flows and their arrows stay (AC-032). Deleting the last flow is allowed (AC-033).
export function deleteFlow(config: Pipeline, flowId: string): DeleteResult {
  if (!config.flows.some((flow) => flow.id === flowId)) {
    return { ok: false, reason: UNKNOWN_FLOW_REASON };
  }
  const removed = connections(config).filter(
    (arrow) => arrow.source === flowId || arrow.target === flowId,
  );
  const flows = config.flows
    .filter((flow) => flow.id !== flowId)
    .map((flow) => {
      if (flow.connectedTo?.to !== flowId) {
        return flow;
      }
      const { connectedTo: _removed, ...rest } = flow;
      return rest;
    });
  return { ok: true, pipeline: { ...config, flows }, removed };
}
