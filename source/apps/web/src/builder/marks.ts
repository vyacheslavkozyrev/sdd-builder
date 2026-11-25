// The structure marks of the Pipeline and flow tabs (F-11 AC-033, AC-034, AC-036, AC-037, AC-038;
// F-12 AC-045, AC-046, AC-047, AC-048). The findings of core's `analyzeStructure` are placed on the drawn
// item they belong to: a flow box, a flow arrow (by its source flow), a block, a block's arrow, or none.
// The analyzer's message and path are kept; each finding also carries its label, the names the builder shows
// in their place (problemLabel, F-16 AC-022). A flow with a blocker
// is marked as a blocker on its box, and blockers disable no control. A pure function of the pipeline and
// the rules: no React and no I/O.

import { pipeline } from '@sddbuilder/core';
import { flowArrows, type OutputName } from './blockArrows.js';
import { problemLabel, type ProblemLabel } from './problemLabel.js';

export type Pipeline = pipeline.Pipeline;
export type Rule = pipeline.Rule;
export type Finding = pipeline.Finding;

// Where a finding is drawn: on a flow box, on the arrow that leaves a flow, on a block, on the arrow that
// leaves a block, or nowhere (listed under the canvas as "Not on a drawn item", AC-036). The flow, block
// and arrow are named by id, as the canvas names them.
export type Placement =
  | { readonly kind: 'flow'; readonly flowId: string }
  | { readonly kind: 'arrow'; readonly source: string }
  | { readonly kind: 'block'; readonly flowId: string; readonly blockId: string }
  | { readonly kind: 'block-arrow'; readonly flowId: string; readonly fromId: string; readonly output: OutputName }
  | { readonly kind: 'none' };

export interface PlacedFinding {
  readonly finding: Finding;
  readonly placement: Placement;
  // The names the builder shows for the finding: its location and its message (F-16 AC-022).
  readonly label: ProblemLabel;
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
// A block's path (`pipeline.flows.<n>.blocks.<m>`), with the key below it when there is one.
const BLOCK_PATH = /^pipeline\.flows\.(\d+)\.blocks\.(\d+)(?:\.(.+))?$/;
// The block keys that name an arrow: a Start's or Agent's `next`, and a Condition's `true.to` and `false.to`.
const ARROW_KEYS = new Map<string, OutputName>([
  ['next', 'next'],
  ['true.to', 'true'],
  ['false.to', 'false'],
]);

function flowIndexOf(path: string): number | undefined {
  const match = FLOW_PATH.exec(path);
  return match === null ? undefined : Number(match[1]);
}

// The placement of a finding inside a flow's blocks (F-12 AC-045). A route's target path places it on the
// arrow the route draws; a block's own path or any other key of the block places it on the block. A route
// with no drawn arrow (its target is missing) falls back to its block, so the finding is still drawn.
// A path that names no block of the flow has no drawn item here.
function blockPlacementOf(path: string, flow: pipeline.Flow): Placement {
  const match = BLOCK_PATH.exec(path);
  if (match === null) {
    return { kind: 'none' };
  }
  const block = flow.blocks.find((candidate) => candidate.index === Number(match[2]));
  if (block === undefined) {
    return { kind: 'none' };
  }
  const output = match[3] === undefined ? undefined : ARROW_KEYS.get(match[3]);
  if (output !== undefined && flowArrows(flow).some((arrow) => arrow.fromId === block.id && arrow.output === output)) {
    return { kind: 'block-arrow', flowId: flow.id, fromId: block.id, output };
  }
  return { kind: 'block', flowId: flow.id, blockId: block.id };
}

// The placement of one finding. A finding at a flow's own path is drawn on its box; a finding at its
// `next` is drawn on its arrow, when the flow has one. A finding inside a block is placed by blockPlacementOf.
// Every other path (a field of the flow, the pipeline itself) has no drawn item.
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
  return blockPlacementOf(finding.path, flow);
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
    findings: findings.map((finding) => ({
      finding,
      placement: placementOf(finding, pipelineState),
      label: problemLabel(finding, pipelineState),
    })),
    blockedFlowIds: pipelineState.flows.filter((flow) => blockedIndexes.has(flow.index)).map((flow) => flow.id),
  };
}

// The controls the builder turns off because of the marks. None: blockers disable no control, so the
// editing, Delete flow, Delete connection, + and the drags stay available (AC-037).
export function disabledControls(): readonly string[] {
  return [];
}
