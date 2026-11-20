import { childPath, ROOT_PATH } from '../check/primitives.js';
import type { Block, Flow, ProjectConfig, Route } from '../model.js';
import type { PositionedFinding } from './finding.js';

// Every block of a flow is reached from the flow's Start (F-03 AC-021, AC-022). The walk follows the `next` link of
// a Start or Agent and the routes of a condition, inside the flow only. A `{stop}` route names no block, and a route
// or `next` to a missing block is not followed: those problems belong to the links and routes rules. A flow with no
// Start is skipped, since the start rule reports it. A flow with more than one Start is walked from the first. A block
// that is not reached gets one blocker at its path.

const REACH_RULE = 'block-reach';
const PIPELINE_PATH = childPath(ROOT_PATH, 'pipeline');
const FLOWS_PATH = childPath(PIPELINE_PATH, 'flows');

function blockPath(flow: Flow, block: Block): string {
  return childPath(childPath(childPath(FLOWS_PATH, String(flow.index)), 'blocks'), String(block.index));
}

// The id a route leads to, or undefined for a `{stop}` route or a route that is absent (a partial model).
function routeTarget(route: Route | undefined): string | undefined {
  return route !== undefined && 'to' in route ? route.to : undefined;
}

// The ids a block leads to: the `next` of a Start or Agent, and the `to` of each route of a condition.
function targetsOf(block: Block): string[] {
  switch (block.kind) {
    case 'start':
    case 'agent':
      return block.next === undefined ? [] : [block.next];
    case 'condition':
      return [routeTarget(block.true), routeTarget(block.false)].filter((to): to is string => to !== undefined);
    case 'end':
      return [];
  }
}

// The ids of the blocks reached from the block with id `startId`, the start included.
function reachedFrom(flow: Flow, startId: string): ReadonlySet<string> {
  const blocks = new Map<string, Block>(flow.blocks.map((block): [string, Block] => [block.id, block]));
  const reached = new Set<string>([startId]);
  const pending: string[] = [startId];
  let id = pending.pop();
  while (id !== undefined) {
    const block = blocks.get(id);
    if (block !== undefined) {
      for (const to of targetsOf(block)) {
        if (blocks.has(to) && !reached.has(to)) {
          reached.add(to);
          pending.push(to);
        }
      }
    }
    id = pending.pop();
  }
  return reached;
}

function reachOfFlow(flow: Flow): PositionedFinding[] {
  const start = flow.blocks.find((block) => block.kind === 'start');
  if (start === undefined) return [];
  const reached = reachedFrom(flow, start.id);
  return flow.blocks
    .filter((block) => !reached.has(block.id))
    .map(
      (block): PositionedFinding => ({
        severity: 'blocker',
        rule: REACH_RULE,
        path: blockPath(flow, block),
        message: 'must be reached from the Start of its flow, got no next or route that leads to it',
        position: { flow: flow.index, block: block.index, slot: -1 },
      }),
    );
}

export function reachRule(config: ProjectConfig): PositionedFinding[] {
  return config.pipeline.flows.flatMap(reachOfFlow);
}
