import { childPath, ROOT_PATH } from './primitives.js';
import type { Flow, Problem, ProjectConfig } from '../model.js';

// An End block names an artifact of its flow (pipeline-schema.md §2, `blockEnd`; AC-064, AC-065).
// The `producedArtifact` of an end must be the exact label of one of the artifacts of the flow that
// holds the end, or empty: an end with an empty `producedArtifact` produces no artifact (owner decision
// 2026-11-25). A label that no artifact of the flow has is refused, and so is any value in a flow with
// no artifacts (AC-065). Returns the problems in document order; an empty list means every end names
// an artifact of its flow, or none. Ends that did not parse are not seen here.

const PIPELINE_PATH = childPath(ROOT_PATH, 'pipeline');
const FLOWS_PATH = childPath(PIPELINE_PATH, 'flows');

export function checkEndArtifacts(config: Pick<ProjectConfig, 'pipeline'>): Problem[] {
  const problems: Problem[] = [];
  config.pipeline.flows.forEach((flow: Flow) => {
    const labels = new Set(flow.artifacts.map((artifact) => artifact.label));
    const blocksPath = childPath(childPath(FLOWS_PATH, String(flow.index)), 'blocks');
    flow.blocks.forEach((block) => {
      if (block.kind !== 'end') return;
      if (block.producedArtifact === '' || labels.has(block.producedArtifact)) return;
      problems.push({
        path: childPath(childPath(blocksPath, String(block.index)), 'producedArtifact'),
        message: `must name an artifact of this flow, got ${block.producedArtifact}`,
      });
    });
  });
  return problems;
}
