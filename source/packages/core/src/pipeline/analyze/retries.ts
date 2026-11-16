// Retry round limits as analysis findings (F-04 AC-008). A retry is a Condition route `back` to an earlier block or flow.
// A retry with no `roundLimit` is a warning at the Condition's path, because each round can cost a model call. The check
// covers the enabled Conditions of the pipeline (gates between flows) and of each enabled child flow. A Condition with a
// `roundLimit`, and a Condition whose routes go forward or stop, give none. Disabled blocks and flows are not checked.
// Pure: no I/O.
import type { AnalysisFinding, ChildBlock, PipelineBlock, ProjectConfig, Route } from '../model.js';
import { childPath, indexPath } from '../parse-util.js';

/** The block ids a Condition's routes go back to, pass route first. Empty when neither route is a retry. */
function retryTargets(block: { passRoute: Route; failRoute: Route }): string[] {
  return [block.passRoute, block.failRoute].flatMap((route): string[] => (route.kind === 'back' ? [route.blockId] : []));
}

/** The warnings of one list of blocks: each enabled Condition that retries with no round limit, in list order. */
function retryFindingsIn(listPath: string, blocks: readonly (ChildBlock | PipelineBlock)[]): AnalysisFinding[] {
  return blocks.flatMap((block, index): AnalysisFinding[] => {
    if (block.kind !== 'condition' || !block.enabled || block.roundLimit !== undefined) return [];
    const targets = retryTargets(block);
    if (targets.length === 0) return [];
    const names = targets.map((target) => `"${target}"`).join(' and ');
    return [
      {
        severity: 'warning',
        subject: indexPath(listPath, index),
        message: `condition "${block.id}" retries to ${names} with no round limit`,
      },
    ];
  });
}

/** Every retry with no round limit: the pipeline's Conditions first, then each enabled child flow's, in pipeline order. */
export function retryFindings(config: ProjectConfig): AnalysisFinding[] {
  const blocksPath = childPath('pipeline', 'blocks');
  const pipelineLevel = retryFindingsIn(blocksPath, config.pipeline.blocks);
  const flowLevel = config.pipeline.blocks.flatMap((block, index): AnalysisFinding[] =>
    block.kind === 'flow' && block.enabled
      ? retryFindingsIn(childPath(indexPath(blocksPath, index), 'blocks'), block.blocks)
      : [],
  );
  return [...pipelineLevel, ...flowLevel];
}
