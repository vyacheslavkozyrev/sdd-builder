// The block layout of a flow on the Map tab (F-12 AC-006, AC-009, AC-010).
// Blocks are placed in the arrow order of the flow (core's flowArrowOrder: from Start, the End counted as a
// block, blocks Start does not reach in list order), with the End blocks moved to the last columns. The same
// flow always gives the same columns. A pure function: no React and no I/O. The canvas maps a column to a
// horizontal position.

import { pipeline as model } from '@sddbuilder/core';

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

// The columns of the flow's blocks: arrow order from Start first, then the unreached blocks in
// list order (AC-009). The End blocks take the last columns, after every other block, in the same
// order (AC-009, amended 2026-11-23). A flow with no blocks gives no places (AC-006). The counts are
// the number of Agents and of Conditions in the flow (AC-010).
export function blockLayout(flow: Flow): BlockLayout {
  const ordered = model.flowArrowOrder(flow);
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
