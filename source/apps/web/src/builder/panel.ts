// The data of the arrow panel of the Pipeline tab (F-11 AC-017).
// Selecting an arrow shows its source flow's name and its target flow's name. Both are read-only:
// the result is a plain value with no field that edits them, and no rule here changes the pipeline.
// A pure function: no React and no I/O.

import type { Arrow, Pipeline } from './connect.js';

// What the arrow panel shows for one arrow: the names of its two flows, not their ids.
export interface ArrowPanel {
  readonly sourceName: string;
  readonly targetName: string;
}

// The panel data for `arrow`, frozen so that no caller can write a name. An arrow that is not in
// the pipeline is a programmer error and throws (as in connect.ts).
export function arrowPanel(pipelineState: Pipeline, arrow: Arrow): ArrowPanel {
  const source = pipelineState.flows.find((flow) => flow.id === arrow.source);
  const target = pipelineState.flows.find((flow) => flow.id === arrow.target);
  if (source === undefined || target === undefined || source.next !== arrow.target) {
    throw new Error(`no arrow from "${arrow.source}" to "${arrow.target}" in the pipeline`);
  }
  return Object.freeze({ sourceName: source.name, targetName: target.name });
}
