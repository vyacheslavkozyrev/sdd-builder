// The connect rule of the Pipeline tab (F-11 AC-010, AC-011).
// Dragging from a flow's right point to another flow's left point sets the source's `next`.
// A pure function: it returns a new pipeline or a refusal with its reason, and never changes
// its input. No React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';

export type Pipeline = model.Pipeline;

// The result of a connect: the new pipeline, or the reason the link was refused. A refused link
// leaves the pipeline as it was (AC-011), so the caller keeps its own value.
export type ConnectResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly reason: string };

// Sets the source flow's `next` to the target flow's id, or refuses the link (AC-010). The checks
// run in the order of the criterion: membership, self, a second outgoing arrow, then a loop.
// A `next` that names no flow in the pipeline is a programmer error and throws (as in layout.ts).
export function connectFlows(pipelineState: Pipeline, source: string, target: string): ConnectResult {
  const flowIds = new Set(pipelineState.flows.map((flow) => flow.id));
  for (const flow of pipelineState.flows) {
    if (flow.next !== undefined && !flowIds.has(flow.next)) {
      throw new Error(`flow "${flow.id}" points to "${flow.next}", which is not in the pipeline`);
    }
  }

  if (!flowIds.has(source)) {
    return { ok: false, reason: `the source "${source}" is not a flow of this pipeline` };
  }
  if (!flowIds.has(target)) {
    return { ok: false, reason: `the target "${target}" is not a flow of this pipeline` };
  }
  if (target === source) {
    return { ok: false, reason: `flow "${source}" cannot be connected to itself` };
  }

  const nextOf = new Map(pipelineState.flows.map((flow) => [flow.id, flow.next] as const));
  const existing = nextOf.get(source);
  if (existing !== undefined) {
    return {
      ok: false,
      reason: `flow "${source}" already has an outgoing arrow to "${existing}"; remove it before adding another`,
    };
  }

  // Follow the chain from the target. Reaching the source would close a loop. The visited set
  // guards the walk; a stored cycle cannot be reached through connect, but the walk must end.
  const visited = new Set<string>();
  let cursor: string | undefined = target;
  while (cursor !== undefined && !visited.has(cursor)) {
    if (cursor === source) {
      const reason =
        `connecting "${source}" to "${target}" would make a loop, ` +
        `because "${target}" already leads back to "${source}"`;
      return { ok: false, reason };
    }
    visited.add(cursor);
    cursor = nextOf.get(cursor);
  }

  return {
    ok: true,
    pipeline: {
      ...pipelineState,
      flows: pipelineState.flows.map((flow) => (flow.id === source ? { ...flow, next: target } : flow)),
    },
  };
}
