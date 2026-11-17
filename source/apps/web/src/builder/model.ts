// The builder's model of the Pipeline tab (F-11 AC-001, AC-003, AC-007, AC-008). Pure functions:
// no React and no I/O. The tab row, the boxes and the arrows are read from the pipeline value,
// and no function here changes the pipeline it is given: each returns a new value.

import type { pipeline } from '@sddbuilder/core';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;
type Gate = pipeline.Gate;

// The tab row: the Pipeline tab first, then one tab per flow in pipeline order.
export type Tab =
  | { readonly kind: 'pipeline' }
  | { readonly kind: 'flow'; readonly id: string; readonly name: string };

// A flow drawn as a box on the canvas: its name and its block count.
export interface Box {
  readonly id: string;
  readonly name: string;
  readonly blockCount: number;
}

// A connection drawn as an arrow from the source flow to the target flow.
export interface Connection {
  readonly source: string;
  readonly target: string;
  readonly label: string;
  readonly gate: Gate | undefined;
}

export function tabRow(config: Pipeline): Tab[] {
  return [
    { kind: 'pipeline' },
    ...config.flows.map((flow): Tab => ({ kind: 'flow', id: flow.id, name: flow.name })),
  ];
}

// The first `flow-N` (N from 2) that no flow of the pipeline uses as its id or as its name, so the
// new flow's name, which starts as its id, never clashes (AC-003, AC-029; owner decision 2026-11-17).
export function nextFlowId(config: Pipeline): string {
  const used = new Set(config.flows.flatMap((flow) => [flow.id, flow.name]));
  let n = 2;
  while (used.has(`flow-${n}`)) {
    n += 1;
  }
  return `flow-${n}`;
}

// Adds an empty flow with no blocks and no connection. Its name starts as its id; the name
// rules of the Name field are applied when the user edits it (AC-029).
export function addFlow(config: Pipeline): { pipeline: Pipeline; flowId: string } {
  const id = nextFlowId(config);
  const flow: Flow = { id, name: id, description: '', arguments: '', blocks: [] };
  return { pipeline: { ...config, flows: [...config.flows, flow] }, flowId: id };
}

export function boxes(config: Pipeline): Box[] {
  return config.flows.map(
    (flow): Box => ({ id: flow.id, name: flow.name, blockCount: flow.blocks.length }),
  );
}

export function connections(config: Pipeline): Connection[] {
  return config.flows.flatMap((flow): Connection[] => {
    const link = flow.connectedTo;
    if (link === undefined) {
      return [];
    }
    return [{ source: flow.id, target: link.to, label: link.label, gate: link.gate }];
  });
}
