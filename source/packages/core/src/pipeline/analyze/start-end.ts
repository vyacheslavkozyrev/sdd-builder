// Start and End blocks per flow, and a flow in the pipeline (architecture.md §12, decision 30). Each flow has
// exactly one Start and at least one End; the pipeline has at least one flow.

import type { ProjectConfig } from '../model.js';
import type { LocatedFinding } from './finding.js';

export function checkStartAndEnd(config: ProjectConfig): LocatedFinding[] {
  const { flows } = config.pipeline;
  if (flows.length === 0) {
    return [
      {
        severity: 'blocker',
        path: 'pipeline.flows',
        message: 'The pipeline has no flow. Add at least one flow.',
        flow: -1,
        block: -1,
      },
    ];
  }
  return flows.flatMap((flow, flowIndex) => {
    const flowPath = `pipeline.flows[${flowIndex}]`;
    const findings: LocatedFinding[] = [];
    const starts = flow.blocks.flatMap((block, blockIndex) =>
      block.kind === 'start' ? [blockIndex] : [],
    );
    const ends = flow.blocks.filter((block) => block.kind === 'end');

    if (starts.length === 0) {
      findings.push({
        severity: 'blocker',
        path: flowPath,
        message: 'The flow has no Start block. Add one Start block.',
        flow: flowIndex,
        block: -1,
      });
    }
    const secondStart = starts[1];
    if (secondStart !== undefined) {
      findings.push({
        severity: 'blocker',
        path: `${flowPath}.blocks[${secondStart}]`,
        message: 'The flow has more than one Start block. Keep one Start block.',
        flow: flowIndex,
        block: secondStart,
      });
    }
    if (ends.length === 0) {
      findings.push({
        severity: 'blocker',
        path: flowPath,
        message: 'The flow has no End block. Add at least one End block.',
        flow: flowIndex,
        block: -1,
      });
    }
    return findings;
  });
}
