import type { Block, Flow, Route } from '../model.js';
import { GenerationError } from './error.js';

// The walk of a flow (F-04, AC-015). It starts at the flow's Start and follows the `next` link of a Start or Agent and
// the routes of a Condition. At a Condition the `true` route is followed before the `false` route, depth first, so a
// route's whole branch is listed before the next one. A block reached by two routes is listed once, at its first
// visit. The result holds every block reached, the Start and any End included; a block that no route reaches is not
// listed. The walk is fixed by the config, so the same flow always gives the same order.
//
// A `{stop}` route names no block and ends its branch. A route or `next` to a block the flow does not hold is a
// programmer error: a refused config never reaches the generator, so it throws.

// The block ids a block leads to, in the reverse of the order they are followed: the `false` route is first, so that
// the `true` route is popped first from a stack.
function pushOrder(block: Block): string[] {
  switch (block.kind) {
    case 'start':
    case 'agent':
      return [block.next];
    case 'condition':
      return [routeTarget(block.false), routeTarget(block.true)].filter((to): to is string => to !== undefined);
    case 'end':
      return [];
  }
}

function routeTarget(route: Route): string | undefined {
  return 'to' in route ? route.to : undefined;
}

export function walkFlow(flow: Flow): Block[] {
  const start = flow.blocks.find((block) => block.kind === 'start');
  if (start === undefined) throw new GenerationError(`the flow ${flow.id} has no Start block`);

  const blocks = new Map<string, Block>(flow.blocks.map((block): [string, Block] => [block.id, block]));
  const ordered: Block[] = [];
  const listed = new Set<string>();
  const pending: string[] = [start.id];
  let id = pending.pop();
  while (id !== undefined) {
    if (!listed.has(id)) {
      const block = blocks.get(id);
      if (block === undefined) {
        throw new GenerationError(`the flow ${flow.id} routes to ${id}, which is no block of the flow`);
      }
      listed.add(id);
      ordered.push(block);
      pending.push(...pushOrder(block));
    }
    id = pending.pop();
  }
  return ordered;
}
