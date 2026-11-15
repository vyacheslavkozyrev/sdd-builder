// Refusals of the shape of the pipeline: exactly one Start and at least one End in each child flow and
// in the pipeline. Start and End are counted whether or not they are enabled: AC-017 always selects them
// in an enabled flow (progress.md, Amendment 2026-11-14).
import type { ProjectConfig } from '../model.js';
import { childPath, indexPath, type PipelineProblem } from '../parse-util.js';

/** The Start and End counts of one flow, or of the pipeline: exactly one Start, at least one End. */
function checkStartAndEnd(
  path: string,
  blocks: readonly { readonly kind: string }[],
  owner: string,
  problems: PipelineProblem[],
): void {
  const starts = blocks.filter((block) => block.kind === 'start').length;
  const ends = blocks.filter((block) => block.kind === 'end').length;
  if (starts === 0) {
    problems.push({ path, message: `${owner} has no Start block` });
  } else if (starts > 1) {
    problems.push({ path, message: `${owner} has ${starts} Start blocks; exactly one is required` });
  }
  if (ends === 0) problems.push({ path, message: `${owner} has no End block` });
}

/** The shape problems of the pipeline's own blocks, and of each of its child flows. */
export function shapeProblems(config: ProjectConfig): PipelineProblem[] {
  const problems: PipelineProblem[] = [];
  const blocks = config.pipeline.blocks;
  checkStartAndEnd('pipeline', blocks, 'the pipeline', problems);
  const blocksPath = childPath('pipeline', 'blocks');
  blocks.forEach((block, index) => {
    if (block.kind === 'flow') {
      checkStartAndEnd(indexPath(blocksPath, index), block.blocks, `flow "${block.id}"`, problems);
    }
  });
  return problems;
}
