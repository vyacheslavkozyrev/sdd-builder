// Selection and order of the pipeline's blocks (F-02 AC-015, AC-016, AC-017). Pure: it reads the config and returns the
// blocks the file list will be built from, in order. A block is selected when it is enabled, so a disabled item produces
// nothing, whatever its kind. The required blocks (the pipeline's Start and End, the five gates, and the Start and End of
// each enabled flow) are always selected because the refusal checks already require them to be present and enabled.
// An Agent block is selected like any other block, so a custom block takes its place by position alone (AC-016).
import type { ChildBlock, FlowBlock, PipelineBlock, ProjectConfig } from '../model.js';

/** An enabled child flow with its selected blocks, in block order. */
export interface SelectedFlow {
  readonly flow: FlowBlock;
  readonly blocks: readonly ChildBlock[];
}

/** What the file list is built from: the pipeline-level blocks in pipeline order, and each enabled flow in that order. */
export interface Selection {
  readonly pipeline: readonly PipelineBlock[];
  readonly flows: readonly SelectedFlow[];
}

/** Selects the blocks of a configuration, keeping their order. A disabled child flow gives no entry in `flows`. */
export function selectBlocks(config: ProjectConfig): Selection {
  const pipeline = config.pipeline.blocks.filter((block) => block.enabled);
  const flows = pipeline.flatMap((block): SelectedFlow[] =>
    block.kind === 'flow' ? [{ flow: block, blocks: block.blocks.filter((child) => child.enabled) }] : [],
  );
  return { pipeline, flows };
}
