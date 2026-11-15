// Refusals of the descriptions of the pipeline's Agent blocks (F-02 AC-029). An enabled Agent block must have a
// description, because its text becomes the stub of `.claude/agents/<name>.md`. The parser refuses the same cases
// for a config read from JSON; this check keeps generate refusing them for a config built in code. A disabled Agent
// block, or one in a disabled flow, is not checked (AC-014).
import type { ProjectConfig } from '../model.js';
import { childPath, indexPath, type PipelineProblem } from '../parse-util.js';

/** The description problems of the enabled Agent blocks of the pipeline's enabled child flows. */
export function descriptionProblems(config: ProjectConfig): PipelineProblem[] {
  const problems: PipelineProblem[] = [];
  const blocksPath = childPath('pipeline', 'blocks');
  config.pipeline.blocks.forEach((block, index) => {
    if (block.kind !== 'flow' || !block.enabled) return;
    const flowPath = indexPath(blocksPath, index);
    block.blocks.forEach((child, childIndex) => {
      if (child.kind !== 'agent' || !child.enabled) return;
      if (typeof child.description !== 'string' || child.description.trim() === '') {
        problems.push({
          path: indexPath(childPath(flowPath, 'blocks'), childIndex),
          message: `Agent block "${child.id}" has no description; its stub text would be empty`,
        });
      }
    });
  });
  return problems;
}
