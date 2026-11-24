// The block layout of a flow on the Map tab (F-12 AC-006, AC-009, AC-010).
// Blocks are placed in the order of their arrows, starting from Start; blocks that Start does not
// reach follow in list order; the End blocks come last. The same flow always gives the same
// columns. A pure function: no React and no I/O. The canvas maps a column to a horizontal position.

import type { pipeline as model } from '@sddbuilder/core';

export type Flow = model.Flow;
export type Block = model.Block;

// One block placed on the canvas: its id and its column, counted from 0 from the left.
export interface BlockPlace {
  readonly blockId: string;
  readonly column: number;
}

export interface BlockLayout {
  readonly places: readonly BlockPlace[];
  readonly agents: number;
  readonly conditions: number;
}

// The ids a block's outputs point to, in output order: next for Start and Agent; true then false
// for a Condition. An empty target and a stop route point to nothing (AC-020).
function targetsOf(block: Block): readonly string[] {
  switch (block.kind) {
    case 'start':
    case 'agent':
      return block.next === '' ? [] : [block.next];
    case 'condition': {
      const targets: string[] = [];
      for (const route of [block.true, block.false]) {
        if ('to' in route && route.to !== '') {
          targets.push(route.to);
        }
      }
      return targets;
    }
    case 'end':
      return [];
  }
}

// The reached blocks in arrow order: a breadth-first walk from Start that takes each target the
// first time it is seen, so a return to an earlier block adds nothing. Targets that name no block
// of the flow are skipped; the analyzer reports them.
function arrowOrder(flow: Flow): string[] {
  const byId = new Map(flow.blocks.map((block) => [block.id, block] as const));
  const start = flow.blocks.find((block) => block.kind === 'start');
  if (start === undefined) {
    return [];
  }
  const order: string[] = [start.id];
  const seen = new Set<string>(order);
  for (let head = 0; head < order.length; head += 1) {
    const current = byId.get(order[head] ?? '');
    if (current === undefined) {
      continue;
    }
    for (const target of targetsOf(current)) {
      if (byId.has(target) && !seen.has(target)) {
        seen.add(target);
        order.push(target);
      }
    }
  }
  return order;
}

// The columns of the flow's blocks: arrow order from Start first, then the unreached blocks in
// list order (AC-009). The End blocks take the last columns, after every other block, in the same
// order (AC-009, amended 2026-11-23). A flow with no blocks gives no places (AC-006). The counts are
// the number of Agents and of Conditions in the flow (AC-010).
export function blockLayout(flow: Flow): BlockLayout {
  const reached = arrowOrder(flow);
  const placed = new Set(reached);
  const ordered = [
    ...reached,
    ...flow.blocks.map((block) => block.id).filter((id) => !placed.has(id)),
  ];
  const kindOf = new Map(flow.blocks.map((block) => [block.id, block.kind] as const));
  const isEnd = (id: string): boolean => kindOf.get(id) === 'end';
  const laid = [...ordered.filter((id) => !isEnd(id)), ...ordered.filter(isEnd)];
  const places = laid.map((blockId, column): BlockPlace => ({ blockId, column }));
  return {
    places,
    agents: flow.blocks.filter((block) => block.kind === 'agent').length,
    conditions: flow.blocks.filter((block) => block.kind === 'condition').length,
  };
}

// The count line of the canvas heading: "N Agents, N Conditions" (AC-010).
export function countLine(layout: Pick<BlockLayout, 'agents' | 'conditions'>): string {
  return `${layout.agents} Agents, ${layout.conditions} Conditions`;
}
