// The delete flow rule of the Pipeline tab (F-11 AC-030, AC-032). Deleting a flow removes the flow
// with everything it owns: its arguments, artifacts, approval, rule tags and blocks, and its own
// `next`. A flow whose `next` named the deleted flow loses that `next`; the other flows keep all
// their fields. The last flow may be deleted, and the pipeline may then have no flows.
// A pure function: it returns a new pipeline and never changes its input. No React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';

export type Pipeline = model.Pipeline;
export type Flow = model.Flow;

// Removes the flow `flowId` and every arrow that pointed at it (AC-030, AC-032). The surviving flows
// are renumbered, so each `index` is again its position in the list (as in fields.ts). An unknown
// flow id is a programmer error and throws (as in fields.ts and connect.ts).
export function deleteFlow(pipelineState: Pipeline, flowId: string): Pipeline {
  if (!pipelineState.flows.some((flow) => flow.id === flowId)) {
    throw new Error(`F-11: the pipeline has no flow "${flowId}"`);
  }
  const flows = pipelineState.flows
    .filter((flow) => flow.id !== flowId)
    .map((flow, index): Flow => {
      const renumbered: Flow = { ...flow, index };
      if (flow.next !== flowId) {
        return renumbered;
      }
      const { next: _deleted, ...kept } = renumbered;
      return kept;
    });
  return { ...pipelineState, flows };
}
