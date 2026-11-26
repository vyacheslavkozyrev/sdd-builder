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

// A new id: a lower-case GUID (F-16 AC-027). `crypto.randomUUID()` is used when the browser has it; otherwise a version 4
// GUID is built from `crypto.getRandomValues`, which works without a secure context. The user never types an id; a
// GUID is unique by construction, so the builder does not check it against the pipeline.
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID().toLowerCase();
  return randomGuid();
}

// A version 4 GUID from random bytes: the version nibble is 4 and the variant bits are 10xx (RFC 4122), in lower case.
function randomGuid(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte, at) => {
    const set = at === 6 ? (byte & 0x0f) | 0x40 : at === 8 ? (byte & 0x3f) | 0x80 : byte;
    return set.toString(16).padStart(2, '0');
  }).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

// The default name of the next added flow: `flow-N`, where N is the lowest positive number such that no
// existing flow is named `flow-N` (AC-003). The name is what the user sees and edits; the id is a GUID.
export function nextFlowName(pipelineState: Pipeline): string {
  const taken = new Set(pipelineState.flows.map((flow) => flow.name));
  let n = 1;
  while (taken.has(`flow-${n}`)) {
    n += 1;
  }
  return `flow-${n}`;
}

// Appends an empty flow after the last one (AC-003). Its id is a new GUID and its name is the default
// name; it has no description and no arguments, a blank body, no blocks and no artifacts, and no `next`.
// Its index comes after every index in the list, so it never repeats one. The result names the new flow's
// id, so the view can open its tab.
export function addFlow(pipelineState: Pipeline): { readonly pipeline: Pipeline; readonly flowId: string } {
  const id = newId();
  const index = pipelineState.flows.reduce((highest, flow) => Math.max(highest, flow.index), -1) + 1;
  const flow: Flow = {
    index,
    id,
    name: nextFlowName(pipelineState),
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
