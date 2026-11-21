// The pipeline builder's rules for the tabs and for adding a flow (F-11 AC-001, AC-003).
// Pure functions: no React and no I/O. The builder state is a `Pipeline` from core, and each
// rule returns a new one; the input is never changed.

import type { pipeline as model } from '@sddbuilder/core';

export type Pipeline = model.Pipeline;
export type Flow = model.Flow;

// One tab of the builder: the Pipeline tab, or the tab of one flow. The + control is not a tab;
// the view draws it after the last one.
export type Tab = { readonly kind: 'pipeline' } | { readonly kind: 'flow'; readonly id: string };

// The tab row in order: Pipeline first, then one tab per flow in pipeline order (AC-001).
export function tabOrder(pipelineState: Pipeline): readonly Tab[] {
  return [
    { kind: 'pipeline' },
    ...pipelineState.flows.map((flow): Tab => ({ kind: 'flow', id: flow.id })),
  ];
}

// The id of the next added flow: `flow-N`, where N is the lowest positive number such that
// neither `flow-N` is the id nor the name of an existing flow (AC-003).
export function nextFlowId(pipelineState: Pipeline): string {
  const taken = new Set<string>();
  for (const flow of pipelineState.flows) {
    taken.add(flow.id);
    taken.add(flow.name);
  }
  let n = 1;
  while (taken.has(`flow-${n}`)) {
    n += 1;
  }
  return `flow-${n}`;
}

// Appends an empty flow after the last one (AC-003). Its name is its id; it has no description
// and no arguments, a blank body, no blocks and no artifacts, and no `next`. Its index comes
// after every index in the list, so it never repeats one. The result names the new flow's id,
// so the view can open its tab.
export function addFlow(pipelineState: Pipeline): { readonly pipeline: Pipeline; readonly flowId: string } {
  const id = nextFlowId(pipelineState);
  const index = pipelineState.flows.reduce((highest, flow) => Math.max(highest, flow.index), -1) + 1;
  const flow: Flow = {
    index,
    id,
    name: id,
    arguments: [],
    body: '',
    artifacts: [],
    approval: false,
    blocks: [],
  };
  return {
    pipeline: { ...pipelineState, flows: [...pipelineState.flows, flow] },
    flowId: id,
  };
}
