import { flowArrowOrder } from '../flow-order.js';
import { childPath, ROOT_PATH } from './primitives.js';
import type { Block, ConditionBlock, Flow, Problem, ProjectConfig, Route } from '../model.js';

// Block references inside a flow (pipeline-schema.md §3; AC-045, AC-046, AC-054, AC-059 to AC-062).
// A start's `next` names an agent or a condition of the same flow; an agent's `next` names an agent,
// a condition or the end of the same flow. Both name a later block: a loop (the block itself or an
// earlier one) is refused, and a return is only a condition's false route with a roundLimit (AC-054, AC-060).
// A route `to` names a block of the same flow: a plain route (`{to}`) names a later block of the flow,
// and a route with a `roundLimit` names an earlier agent of the flow (a return). "Later" and "earlier" are the
// arrow order from Start, with the End counted as a block (flowArrowOrder), not the list order. A reference to a block
// of another flow, or to an id that is no block, is refused at the path of the reference. Returns the
// problems in document order; an empty list means every reference is valid. Routes that did not parse
// are not seen here.

const PIPELINE_PATH = childPath(ROOT_PATH, 'pipeline');
const FLOWS_PATH = childPath(PIPELINE_PATH, 'flows');

// The position of each block in the arrow order of its flow: "later" and "earlier" compare these positions.
function positionsOf(flow: Flow): ReadonlyMap<string, number> {
  return new Map(flowArrowOrder(flow).map((id, position) => [id, position] as const));
}

// The position of a block of the flow. A block that is not in the flow is a programmer error and throws.
function positionOf(positions: ReadonlyMap<string, number>, blockId: string): number {
  const position = positions.get(blockId);
  if (position === undefined) throw new Error(`block ${blockId} has no position in the flow order`);
  return position;
}

// The ids of the blocks of every flow, so a reference to another flow is told apart from an id that is no block.
function blockIdsOfPipeline(flows: readonly Flow[]): ReadonlySet<string> {
  return new Set(flows.flatMap((flow) => flow.blocks.map((block) => block.id)));
}

// Resolves a reference to a block of the flow. Returns the block, or a message naming why the reference is refused.
function resolveTarget(flow: Flow, to: string, pipelineIds: ReadonlySet<string>): Block | string {
  const block = flow.blocks.find((candidate) => candidate.id === to);
  if (block !== undefined) return block;
  if (pipelineIds.has(to)) return `must name a block of this flow, got ${to}, which is a block of another flow`;
  return `must name a block of this flow, got ${to}, which is no block of the pipeline`;
}

function checkStartOrAgentNext(
  flow: Flow,
  block: Block,
  blockPath: string,
  pipelineIds: ReadonlySet<string>,
  positions: ReadonlyMap<string, number>,
  problems: Problem[],
): void {
  if (block.kind !== 'start' && block.kind !== 'agent') return;
  const path = childPath(blockPath, 'next');
  // A partial model (analysed, not parsed) may have no next: it is refused here instead of read.
  if (block.next === undefined) {
    problems.push({ path, message: 'must name a block of this flow, got nothing' });
    return;
  }
  const target = resolveTarget(flow, block.next, pipelineIds);
  if (typeof target === 'string') {
    problems.push({ path, message: target });
    return;
  }
  const allowed = block.kind === 'start' ? ['agent', 'condition'] : ['agent', 'condition', 'end'];
  if (!allowed.includes(target.kind)) {
    const list = block.kind === 'start' ? 'an agent or a condition' : 'an agent, a condition or the end';
    problems.push({
      path,
      message: `must name ${list} of this flow, got the ${target.kind} block ${block.next}`,
    });
    return;
  }
  if (positionOf(positions, target.id) <= positionOf(positions, block.id)) {
    problems.push({
      path,
      message: 'must name a later block of this flow; a return needs a condition with roundLimit',
    });
  }
}

function checkRoute(
  flow: Flow,
  condition: ConditionBlock,
  route: Route | undefined,
  routePath: string,
  pipelineIds: ReadonlySet<string>,
  positions: ReadonlyMap<string, number>,
  problems: Problem[],
): void {
  // A partial model may have no route: it is skipped here, and the analysis reports the missing output.
  if (route === undefined) return;
  if ('stop' in route) return;
  const toPath = childPath(routePath, 'to');
  const target = resolveTarget(flow, route.to, pipelineIds);
  if (typeof target === 'string') {
    problems.push({ path: toPath, message: target });
    return;
  }

  if ('roundLimit' in route) {
    if (target.kind !== 'agent' || positionOf(positions, target.id) >= positionOf(positions, condition.id)) {
      problems.push({
        path: toPath,
        message: `must name an earlier agent of this flow for a return with a roundLimit, got ${route.to}`,
      });
    }
    return;
  }

  if (positionOf(positions, target.id) > positionOf(positions, condition.id)) return;
  const message =
    target.kind === 'agent'
      ? `must name a later block of this flow: a return to the earlier agent ${route.to} needs a roundLimit`
      : `must name a later block of this flow, got ${route.to}`;
  problems.push({ path: toPath, message });
}

export function checkBlockLinks(config: Pick<ProjectConfig, 'pipeline'>): Problem[] {
  const { flows } = config.pipeline;
  const pipelineIds = blockIdsOfPipeline(flows);
  const problems: Problem[] = [];

  flows.forEach((flow) => {
    const blocksPath = childPath(childPath(FLOWS_PATH, String(flow.index)), 'blocks');
    const positions = positionsOf(flow);
    flow.blocks.forEach((block) => {
      const blockPath = childPath(blocksPath, String(block.index));
      checkStartOrAgentNext(flow, block, blockPath, pipelineIds, positions, problems);
      if (block.kind !== 'condition') return;
      checkRoute(flow, block, block.true, childPath(blockPath, 'true'), pipelineIds, positions, problems);
      checkRoute(flow, block, block.false, childPath(blockPath, 'false'), pipelineIds, positions, problems);
    });
  });

  return problems;
}
