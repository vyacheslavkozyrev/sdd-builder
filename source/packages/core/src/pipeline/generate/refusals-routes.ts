// Refusals of reachability and routes (F-02 AC-005, AC-006, AC-007, AC-014). Every enabled block and flow must be
// reached from its Start: the pipeline's Start for the pipeline's blocks and flows, a flow's own Start for its blocks.
// A back route goes to an earlier block of the same flow, or in the pipeline to an earlier flow, and never leaves a
// child flow. An enabled back route must not point into a disabled block or flow. Disabled blocks and flows are not
// checked (AC-014), and neither are their routes.
//
// The walk: a block runs after the next live block in its list. A Condition routes only through its pass and fail
// outputs: `next` is the next live block, `back` its target, and `stop` leads to the live Ends of its list, since a
// stop is how a gate ends the process with a stopped End (building-blocks.md, End). A Condition output that is not
// wired is taken as `next`: the wiring checks refuse it, and the walk goes on without a second refusal. An End is the
// exit of its list, so nothing after it runs: the walk stops there (building-blocks.md, End). A Start is always
// selected in an enabled flow (AC-017), so it is live even when switched off.
import type { ChildBlock, PipelineBlock, ProjectConfig, Route } from '../model.js';
import { childPath, indexPath, type PipelineProblem } from '../parse-util.js';

/** A block of one list as the walk sees it. `outputs` is set for a Condition only. */
interface Walkable {
  readonly id: string;
  readonly kind: string;
  readonly enabled: boolean;
  readonly outputs: readonly Route[] | undefined;
}

const NEXT: Route = { kind: 'next' };

function toWalkable(block: ChildBlock | PipelineBlock): Walkable {
  const outputs = block.kind === 'condition' ? [block.passRoute ?? NEXT, block.failRoute ?? NEXT] : undefined;
  return { id: block.id, kind: block.kind, enabled: block.enabled, outputs };
}

function isLive(item: Walkable): boolean {
  return item.enabled || item.kind === 'start';
}

/** The indices a block can route to: the next live block, a live `back` target, or the live Ends for `stop`. */
function successors(items: readonly Walkable[], index: number): number[] {
  const item = items[index];
  if (item === undefined || !isLive(item) || item.kind === 'end') return [];
  const nextLive = items.findIndex((other, at) => at > index && isLive(other));
  const ends = items.flatMap((other, at) => (other.kind === 'end' && isLive(other) ? [at] : []));
  return (item.outputs ?? [NEXT]).flatMap((route): number[] => {
    if (route.kind === 'stop') return ends;
    if (route.kind === 'next') return nextLive < 0 ? [] : [nextLive];
    const target = items.findIndex((other) => other.id === route.blockId);
    const targetItem = target < 0 ? undefined : items[target];
    return targetItem !== undefined && isLive(targetItem) ? [target] : [];
  });
}

/** Every index reached from the entry. */
function reachedFrom(items: readonly Walkable[], entry: number): Set<number> {
  const reached = new Set<number>();
  const pending = [entry];
  for (let index = pending.pop(); index !== undefined; index = pending.pop()) {
    if (reached.has(index)) continue;
    reached.add(index);
    pending.push(...successors(items, index));
  }
  return reached;
}

/**
 * Each enabled item that the walk does not reach. A list with no single Start has no entry to walk from; the shape
 * checks refuse it, so it is skipped here.
 */
function reachabilityProblems(
  listPath: string,
  items: readonly Walkable[],
  from: string,
  problems: PipelineProblem[],
): void {
  const starts = items.flatMap((item, index) => (item.kind === 'start' ? [index] : []));
  const [entry] = starts;
  if (starts.length !== 1 || entry === undefined) return;
  const reached = reachedFrom(items, entry);
  items.forEach((item, index) => {
    if (!item.enabled || reached.has(index)) return;
    const what = item.kind === 'flow' ? `flow "${item.id}"` : `block "${item.id}"`;
    problems.push({ path: indexPath(listPath, index), message: `${what} is not reachable from ${from}` });
  });
}

/** The reason a back route inside a child flow is refused, or undefined when it goes to an earlier block of the flow. */
function flowBackProblem(
  flow: { id: string; blocks: readonly ChildBlock[] },
  index: number,
  targetId: string,
): string | undefined {
  const targetIndex = flow.blocks.findIndex((block) => block.id === targetId);
  const target = targetIndex < 0 ? undefined : flow.blocks[targetIndex];
  if (target === undefined) return `back route to "${targetId}" is not a block of flow "${flow.id}"`;
  if (!target.enabled) return `back route to "${targetId}" points into a disabled block`;
  if (targetIndex >= index) return `back route to "${targetId}" is not an earlier block of flow "${flow.id}"`;
  return undefined;
}

/** The reason a back route in the pipeline is refused, or undefined when it goes to an earlier flow. */
function pipelineBackProblem(blocks: readonly PipelineBlock[], index: number, targetId: string): string | undefined {
  const targetIndex = blocks.findIndex((block) => block.id === targetId);
  const target = targetIndex < 0 ? undefined : blocks[targetIndex];
  if (target === undefined || target.kind !== 'flow') return `back route to "${targetId}" is not a flow of the pipeline`;
  if (!target.enabled) return `back route to "${targetId}" points into a disabled flow`;
  if (targetIndex >= index) return `back route to "${targetId}" is not an earlier flow of the pipeline`;
  return undefined;
}

/** The back routes of the enabled Conditions of one list, checked by `problemFor`. A disabled Condition is skipped. */
function backRouteProblems(
  listPath: string,
  blocks: readonly (ChildBlock | PipelineBlock)[],
  problemFor: (index: number, targetId: string) => string | undefined,
  problems: PipelineProblem[],
): void {
  blocks.forEach((block, index) => {
    if (block.kind !== 'condition' || !block.enabled) return;
    for (const route of [block.passRoute, block.failRoute]) {
      if (route === undefined || route.kind !== 'back') continue;
      const message = problemFor(index, route.blockId);
      if (message !== undefined) problems.push({ path: indexPath(listPath, index), message });
    }
  });
}

/** The reachability and route problems of one enabled child flow. */
function flowProblems(
  flowPath: string,
  flow: { id: string; blocks: readonly ChildBlock[] },
  problems: PipelineProblem[],
): void {
  const blocksPath = childPath(flowPath, 'blocks');
  reachabilityProblems(blocksPath, flow.blocks.map(toWalkable), `the Start of flow "${flow.id}"`, problems);
  backRouteProblems(blocksPath, flow.blocks, (index, targetId) => flowBackProblem(flow, index, targetId), problems);
}

/** Every reachability and route problem of the pipeline, and of each enabled child flow. */
export function routeProblems(config: ProjectConfig): PipelineProblem[] {
  const problems: PipelineProblem[] = [];
  const blocks = config.pipeline.blocks;
  const blocksPath = childPath('pipeline', 'blocks');
  reachabilityProblems(blocksPath, blocks.map(toWalkable), 'the pipeline Start', problems);
  backRouteProblems(blocksPath, blocks, (index, targetId) => pipelineBackProblem(blocks, index, targetId), problems);
  blocks.forEach((block, index) => {
    if (block.kind === 'flow' && block.enabled) flowProblems(indexPath(blocksPath, index), block, problems);
  });
  return problems;
}
