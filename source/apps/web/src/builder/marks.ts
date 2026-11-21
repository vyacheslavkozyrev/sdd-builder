// The structure marks of the Pipeline tab (F-11 AC-033, AC-034, AC-036, AC-037, AC-038).
// The findings of core's `analyzeStructure` are placed on the drawn item they belong to: a flow box,
// an arrow (by its source flow), or none. The message is the analyzer's, unchanged: the builder adds
// no wording of its own. A flow with a blocker is marked as a blocker on its box, and blockers disable
// no control. A pure function of the pipeline and the rules: no React and no I/O.

import { pipeline } from '@sddbuilder/core';

export type Pipeline = pipeline.Pipeline;
export type Rule = pipeline.Rule;
export type Finding = pipeline.Finding;

// Where a finding is drawn: on a flow box, on the arrow that leaves a flow, or nowhere (listed under the
// canvas as "Not on a drawn item", AC-036). The flow and arrow are named by flow id, as the canvas names them.
export type Placement =
  | { readonly kind: 'flow'; readonly flowId: string }
  | { readonly kind: 'arrow'; readonly source: string }
  | { readonly kind: 'none' };

export interface PlacedFinding {
  readonly finding: Finding;
  readonly placement: Placement;
}

export interface StructureMarks {
  // Every finding of the analyzer, in its order, each with where it is drawn.
  readonly findings: readonly PlacedFinding[];
  // The flows that hold a blocker, in list order. A blocker anywhere in a flow, its `next` included, marks
  // its box (AC-034); the message itself is drawn where its placement says.
  readonly blockedFlowIds: readonly string[];
}

// The analyzer names every flow by its index, and every `next` by the flow's path below it (the paths of
// core's structural checks: `pipeline.flows.<index>` and `pipeline.flows.<index>.next`).
const FLOW_PATH = /^pipeline\.flows\.(\d+)(?:\.|$)/;

function flowIndexOf(path: string): number | undefined {
  const match = FLOW_PATH.exec(path);
  return match === null ? undefined : Number(match[1]);
}

// The placement of one finding. A finding at a flow's own path is drawn on its box; a finding at its
// `next` is drawn on its arrow, when the flow has one. Every other path (a field of the flow, a block,
// the pipeline itself) has no drawn item.
function placementOf(finding: Finding, pipelineState: Pipeline): Placement {
  const index = flowIndexOf(finding.path);
  const flow = pipelineState.flows.find((candidate) => candidate.index === index);
  if (flow === undefined) {
    return { kind: 'none' };
  }
  if (finding.path === `pipeline.flows.${flow.index}`) {
    return { kind: 'flow', flowId: flow.id };
  }
  if (finding.path === `pipeline.flows.${flow.index}.next` && flow.next !== undefined) {
    return { kind: 'arrow', source: flow.id };
  }
  return { kind: 'none' };
}

// Runs the structural checks on the pipeline with the given rules and places every finding. The config
// is assembled here, so the analyzer sees the same pipeline and rules as the generator would.
export function structureMarks(pipelineState: Pipeline, rules: readonly Rule[]): StructureMarks {
  const config: pipeline.ProjectConfig = { schemaVersion: 2, rules, pipeline: pipelineState };
  const findings = pipeline.analyzeStructure(config);
  const blockedIndexes = new Set<number>();
  for (const finding of findings) {
    const index = flowIndexOf(finding.path);
    if (finding.severity === 'blocker' && index !== undefined) {
      blockedIndexes.add(index);
    }
  }
  return {
    findings: findings.map((finding) => ({ finding, placement: placementOf(finding, pipelineState) })),
    blockedFlowIds: pipelineState.flows.filter((flow) => blockedIndexes.has(flow.index)).map((flow) => flow.id),
  };
}

// The controls the builder turns off because of the marks. None: blockers disable no control, so the
// editing, Delete flow, Delete connection, + and the drags stay available (AC-037).
export function disabledControls(): readonly string[] {
  return [];
}
