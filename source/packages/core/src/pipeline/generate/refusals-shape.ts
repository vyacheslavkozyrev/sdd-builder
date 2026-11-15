// Refusals of the shape of the pipeline: exactly one Start and at least one End in each child flow and
// in the pipeline. Start and End are counted whether or not they are enabled: AC-017 always selects them
// in an enabled flow (progress.md, Amendment 2026-11-14). A disabled child flow is not checked at all (AC-014).
// The wiring refusals: Connections join two blocks of one flow or two flows of the pipeline, and both
// outputs of every Condition are wired. Disabled Connections and Conditions are skipped (AC-014).
import type {
  ConditionBlock,
  ConnectionBlock,
  FlowBlock,
  PipelineBlock,
  PipelineConditionBlock,
  ProjectConfig,
} from '../model.js';
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

/** The shape problems of the pipeline's own blocks, and of each enabled child flow. */
export function shapeProblems(config: ProjectConfig): PipelineProblem[] {
  const problems: PipelineProblem[] = [];
  const blocks = config.pipeline.blocks;
  checkStartAndEnd('pipeline', blocks, 'the pipeline', problems);
  const blocksPath = childPath('pipeline', 'blocks');
  blocks.forEach((block, index) => {
    if (block.kind === 'flow' && block.enabled) {
      checkStartAndEnd(indexPath(blocksPath, index), block.blocks, `flow "${block.id}"`, problems);
    }
  });
  return problems;
}

/** Every block and flow id of the config, at any level. A Connection end that is found here is in the wrong place. */
function allIds(config: ProjectConfig): Set<string> {
  const ids = new Set<string>();
  for (const block of config.pipeline.blocks) {
    ids.add(block.id);
    if (block.kind === 'flow') for (const child of block.blocks) ids.add(child.id);
  }
  return ids;
}

/** Both outputs of a Condition are wired when each has a route. A missing output is named. */
function conditionProblems(
  path: string,
  block: ConditionBlock | PipelineConditionBlock,
  problems: PipelineProblem[],
): void {
  if (!block.enabled) return;
  if (block.passRoute === undefined) {
    problems.push({ path, message: `Condition "${block.id}" has no pass route; its pass output is not wired` });
  }
  if (block.failRoute === undefined) {
    problems.push({ path, message: `Condition "${block.id}" has no fail route; its fail output is not wired` });
  }
}

/** What a Connection in one list must join: its subject for the message, and what an end must be. */
interface ConnectionScope {
  subject: string;
  target: string;
}

/**
 * A Connection's two ends must be ids of the list it sits in: the blocks of its flow, or the flows of the
 * pipeline. An end that names a block or flow elsewhere in the config is said to be in another place.
 */
function connectionProblems(
  path: string,
  block: ConnectionBlock,
  own: ReadonlySet<string>,
  everywhere: ReadonlySet<string>,
  scope: ConnectionScope,
  problems: PipelineProblem[],
): void {
  if (!block.enabled) return;
  for (const end of [block.from, block.to]) {
    if (own.has(end)) continue;
    const reason = everywhere.has(end)
      ? `"${end}" is in another flow or in the pipeline, not ${scope.target}`
      : `"${end}" is not ${scope.target}`;
    problems.push({ path, message: `Connection "${block.id}" must join ${scope.subject}; ${reason}` });
  }
}

/** The wiring problems of one flow's blocks. A disabled flow is skipped by the caller. */
function flowWiringProblems(
  flowPath: string,
  flow: FlowBlock,
  everywhere: ReadonlySet<string>,
  problems: PipelineProblem[],
): void {
  const own = new Set(flow.blocks.map((block) => block.id));
  const scope: ConnectionScope = {
    subject: `two blocks of flow "${flow.id}"`,
    target: `a block of flow "${flow.id}"`,
  };
  const blocksPath = childPath(flowPath, 'blocks');
  flow.blocks.forEach((block, index) => {
    const path = indexPath(blocksPath, index);
    if (block.kind === 'condition') conditionProblems(path, block, problems);
    if (block.kind === 'connection') connectionProblems(path, block, own, everywhere, scope, problems);
  });
}

/** The wiring problems of the pipeline's own blocks, and of each enabled child flow. */
export function wiringProblems(config: ProjectConfig): PipelineProblem[] {
  const problems: PipelineProblem[] = [];
  const everywhere = allIds(config);
  const blocks: readonly PipelineBlock[] = config.pipeline.blocks;
  const flowIds = new Set(blocks.filter((block) => block.kind === 'flow').map((block) => block.id));
  const scope: ConnectionScope = { subject: 'two flows of the pipeline', target: 'a flow of the pipeline' };
  const blocksPath = childPath('pipeline', 'blocks');
  blocks.forEach((block, index) => {
    const path = indexPath(blocksPath, index);
    if (block.kind === 'condition') conditionProblems(path, block, problems);
    if (block.kind === 'connection') connectionProblems(path, block, flowIds, everywhere, scope, problems);
    if (block.kind === 'flow' && block.enabled) flowWiringProblems(path, block, everywhere, problems);
  });
  return problems;
}
