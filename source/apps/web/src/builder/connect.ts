// The connect rule of the Pipeline tab (F-11 AC-010, AC-011, AC-012, AC-015).
// Dragging from a flow's right point to another flow's left point sets the source's `next`.
// Dragging an arrow's end onto another flow's point repoints it. A pure function: it returns a
// new pipeline or a refusal with its reason, and never changes its input. No React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';

export type Pipeline = model.Pipeline;

// The result of a connect: the new pipeline, or the reason the link was refused. A refused link
// leaves the pipeline as it was (AC-011), so the caller keeps its own value.
export type ConnectResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly reason: string };

// What a drag ended on. The view reports the element under the pointer; only a connection point
// of a flow can accept a link (AC-012).
export type DropTarget =
  | { readonly kind: 'empty' }
  | { readonly kind: 'arrow' }
  | { readonly kind: 'body'; readonly flow: string }
  | { readonly kind: 'point'; readonly flow: string; readonly side: 'left' | 'right' };

// An arrow is named by its two flows: `source` has the arrow as its `next`, pointing at `target`.
export interface Arrow {
  readonly source: string;
  readonly target: string;
}

export type ArrowEnd = 'source' | 'target';

// The result of a drop. `unchanged` is a drop that does not count (AC-012): it is not an attempt,
// so it gives no reason. `refused` keeps the pipeline as it was and gives the reason (AC-015).
export type DropResult =
  | { readonly kind: 'changed'; readonly pipeline: Pipeline }
  | { readonly kind: 'unchanged' }
  | { readonly kind: 'refused'; readonly reason: string };

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

// Whether a drop counts as a link from `from` (AC-012): only a drop on another flow's left point.
// A drop on empty canvas, an arrow, the same flow's own point, a box body or a right point does not.
export function isLinkDrop(from: string, drop: DropTarget): boolean {
  return drop.kind === 'point' && drop.side === 'left' && drop.flow !== from;
}

// A drag from `from`'s right point ended on `drop` (AC-012). A drop that does not count changes
// nothing; a counted drop is connected under the AC-010 rules.
export function dropLink(pipelineState: Pipeline, from: string, drop: DropTarget): DropResult {
  if (drop.kind !== 'point' || !isLinkDrop(from, drop)) {
    return { kind: 'unchanged' };
  }
  return fromConnect(connectFlows(pipelineState, from, drop.flow));
}

// Drags one end of an arrow onto `drop` (AC-015). The target end counts on another flow's left
// point and sets the source's `next` under the AC-010 rules. The source end counts on another
// flow's right point: the arrow moves to start from that flow, which must have no `next`, and
// the old source loses its `next`. A refused repoint returns the pipeline as it was, with a reason.
// An arrow that is not in the pipeline is a programmer error and throws (as in connectFlows).
export function repointArrow(pipelineState: Pipeline, arrow: Arrow, end: ArrowEnd, drop: DropTarget): DropResult {
  const sourceFlow = pipelineState.flows.find((flow) => flow.id === arrow.source);
  if (sourceFlow === undefined || sourceFlow.next !== arrow.target) {
    throw new Error(`no arrow from "${arrow.source}" to "${arrow.target}" in the pipeline`);
  }
  if (drop.kind !== 'point') {
    return { kind: 'unchanged' };
  }

  if (end === 'target') {
    if (!isLinkDrop(arrow.source, drop)) {
      return { kind: 'unchanged' };
    }
    // The source gives up its arrow first, so the connect rules see it with no `next`.
    const detached = withoutNext(pipelineState, arrow.source);
    return fromConnect(connectFlows(detached, arrow.source, drop.flow));
  }

  if (drop.side !== 'right' || drop.flow === arrow.source) {
    return { kind: 'unchanged' };
  }
  const detached = withoutNext(pipelineState, arrow.source);
  return fromConnect(connectFlows(detached, drop.flow, arrow.target));
}

// The pipeline with the flow's `next` removed. The input is not changed.
function withoutNext(pipelineState: Pipeline, flowId: string): Pipeline {
  return {
    ...pipelineState,
    flows: pipelineState.flows.map((flow) => {
      if (flow.id !== flowId) {
        return flow;
      }
      const copy = { ...flow };
      delete copy.next;
      return copy;
    }),
  };
}

// Turns a connect result into a drop result: a connected pipeline changes, a refusal keeps its reason.
function fromConnect(result: ConnectResult): DropResult {
  return result.ok
    ? { kind: 'changed', pipeline: result.pipeline }
    : { kind: 'refused', reason: result.reason };
}
