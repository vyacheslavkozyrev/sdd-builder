import type { Block, Flow, Route } from './model.js';

// The arrow order of a flow (F-12 owner decision 2026-11-24): "later" and "earlier" between blocks of a flow mean
// this order. It starts at the Start block and follows the arrows (next, true and false) breadth-first, each block
// once, the End included. A block no arrow reaches follows in list order. Pure: no I/O.
export function flowArrowOrder(flow: Flow): readonly string[] {
  const byId = new Map<string, Block>();
  for (const block of flow.blocks) {
    if (!byId.has(block.id)) byId.set(block.id, block);
  }

  const order: string[] = [];
  const seen = new Set<string>();
  const queue: Block[] = [];
  const start = flow.blocks.find((block) => block.kind === 'start');
  if (start !== undefined) queue.push(start);

  while (queue.length > 0) {
    const block = queue.shift();
    if (block === undefined || seen.has(block.id)) continue;
    seen.add(block.id);
    order.push(block.id);
    for (const targetId of arrowTargets(block)) {
      const target = byId.get(targetId);
      if (target !== undefined && !seen.has(targetId)) queue.push(target);
    }
  }

  for (const block of flow.blocks) {
    if (!seen.has(block.id)) {
      seen.add(block.id);
      order.push(block.id);
    }
  }
  return order;
}

// The ids a block's arrows lead to, in output order. An empty next or a stop route leads nowhere.
function arrowTargets(block: Block): readonly string[] {
  switch (block.kind) {
    case 'start':
    case 'agent':
      return block.next === undefined || block.next === '' ? [] : [block.next];
    case 'condition':
      return [routeTarget(block.true), routeTarget(block.false)].filter((id): id is string => id !== null);
    case 'end':
      return [];
  }
}

function routeTarget(route: Route | undefined): string | null {
  if (route === undefined || !('to' in route) || route.to === '') return null;
  return route.to;
}
