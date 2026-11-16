// Iteration sources of the agents as analysis findings (F-04 AC-009). An enabled Agent block with scope `task` or
// `feature` repeats over an iteration source: an artifact produced earlier in pipeline order (an enabled End's `produced`
// label or an enabled Connection's `artifact` label, in the same flow or an earlier one), or, for an agent in the first
// flow, the pipeline Start's declared arguments (at least one). An agent with none is a warning at its path. Scope
// `project` gives none, and so do disabled agents and disabled flows. Pure: no I/O.
import type { AnalysisFinding, ChildBlock, PipelineBlock, ProjectConfig } from '../model.js';
import { childPath, indexPath } from '../parse-util.js';

/** True when a label is set: present and not empty. */
function hasLabel(label: string | undefined): boolean {
  return label !== undefined && label !== '';
}

/** True when a block hands an artifact over: an enabled End with a `produced` label, or an enabled Connection with `artifact`. */
function handsOverArtifact(block: ChildBlock | PipelineBlock): boolean {
  if (block.kind === 'end') return block.enabled && hasLabel(block.produced);
  if (block.kind === 'connection') return block.enabled && hasLabel(block.artifact);
  return false;
}

/**
 * Every agent with no iteration source, in pipeline order. The walk keeps whether an artifact was produced earlier: each
 * enabled flow's children are read in order, then the next pipeline block. The first flow is the first flow in the pipeline.
 */
export function inputFindings(config: ProjectConfig): AnalysisFinding[] {
  const blocksPath = childPath('pipeline', 'blocks');
  const declaresArguments = config.pipeline.blocks.some(
    (block) => block.kind === 'start' && block.arguments.length > 0,
  );
  const findings: AnalysisFinding[] = [];
  let artifactProduced = false;
  let firstFlowSeen = false;
  config.pipeline.blocks.forEach((block, index) => {
    if (block.kind !== 'flow') {
      if (handsOverArtifact(block)) artifactProduced = true;
      return;
    }
    const isFirstFlow = !firstFlowSeen;
    firstFlowSeen = true;
    if (!block.enabled) return;
    const flowPath = childPath(indexPath(blocksPath, index), 'blocks');
    block.blocks.forEach((child, at) => {
      if (child.kind === 'agent' && child.enabled && child.scope !== 'project') {
        const hasArgumentSource = isFirstFlow && declaresArguments;
        if (!artifactProduced && !hasArgumentSource) {
          const reason = isFirstFlow
            ? 'no earlier artifact and the pipeline Start declares no argument'
            : 'no earlier artifact';
          findings.push({
            severity: 'warning',
            subject: indexPath(flowPath, at),
            message: `agent "${child.id}" has no iteration source: ${reason}`,
          });
        }
      }
      if (handsOverArtifact(child)) artifactProduced = true;
    });
  });
  return findings;
}
