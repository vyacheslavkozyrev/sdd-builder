import { childPath, ROOT_PATH } from './primitives.js';
import type { Block, ConditionBlock, Flow, Problem, ProjectConfig, Route } from '../model.js';

// Block references inside a flow (pipeline-schema.md §3; AC-045, AC-046, AC-054, AC-059 to AC-062).
// A start's `next` names an agent or a condition of the same flow; an agent's `next` names an agent,
// a condition or the end of the same flow. A route `to` names a block of the same flow: a plain route
// (`{to}`) names a later block of the flow, and a route with a `roundLimit` names an earlier agent of
// the flow (a return). A reference to a block of another flow, or to an id that is no block, is refused
// at the path of the reference. Returns the problems in document order; an empty list means every
// reference is valid. Routes that did not parse are not seen here.

const PIPELINE_PATH = childPath(ROOT_PATH, 'pipeline');
const FLOWS_PATH = childPath(PIPELINE_PATH, 'flows');

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
  problems: Problem[],
): void {
  if (block.kind !== 'start' && block.kind !== 'agent') return;
  const path = childPath(blockPath, 'next');
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
  }
}

function checkRoute(
  flow: Flow,
  condition: ConditionBlock,
  route: Route,
  routePath: string,
  pipelineIds: ReadonlySet<string>,
  problems: Problem[],
): void {
  if ('stop' in route) return;
  const toPath = childPath(routePath, 'to');
  const target = resolveTarget(flow, route.to, pipelineIds);
  if (typeof target === 'string') {
    problems.push({ path: toPath, message: target });
    return;
  }

  if ('roundLimit' in route) {
    if (target.kind !== 'agent' || target.index >= condition.index) {
      problems.push({
        path: toPath,
        message: `must name an earlier agent of this flow for a return with a roundLimit, got ${route.to}`,
      });
    }
    return;
  }

  if (target.index > condition.index) return;
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
    flow.blocks.forEach((block) => {
      const blockPath = childPath(blocksPath, String(block.index));
      checkStartOrAgentNext(flow, block, blockPath, pipelineIds, problems);
      if (block.kind !== 'condition') return;
      checkRoute(flow, block, block.true, childPath(blockPath, 'true'), pipelineIds, problems);
      checkRoute(flow, block, block.false, childPath(blockPath, 'false'), pipelineIds, problems);
    });
  });

  return problems;
}
