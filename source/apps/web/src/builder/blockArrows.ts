// The output and input points and the arrows of a flow on the Map tab (F-12 AC-008, AC-011, AC-013).
// Outputs by kind: Start and Agent have one (next), Condition has two (true, false), End has none.
// Inputs: every block but Start has one. An arrow runs from an output to the input of its target.
// An arrow to a block at the same place or earlier in the layout is a return: drawn dashed, with
// its round limit when one is set. Pure functions: no React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';
import { blockLayout } from './blockLayout.js';

export type Flow = model.Flow;
export type Block = model.Block;

// An output point of a block. A Condition's true and false outputs are labelled; next is not.
export type OutputName = 'next' | 'true' | 'false';

// One arrow of the flow: from an output of a block to the input of its target. A return has
// `isReturn` set; its round limit is `roundLimit`, or null while it is unset (AC-017).
export interface BlockArrow {
  readonly fromId: string;
  readonly output: OutputName;
  readonly toId: string;
  readonly isReturn: boolean;
  readonly roundLimit: number | null;
  readonly branchLabel: 'true' | 'false' | null;
  readonly roundsLabel: string | null;
}

// The read-only data of an arrow's panel: its source and target names (AC-011).
export interface ArrowPanel {
  readonly source: string;
  readonly target: string;
}

// The output points of a block, in the order they are drawn (AC-013).
export function outputsOf(block: Block): readonly OutputName[] {
  switch (block.kind) {
    case 'start':
    case 'agent':
      return ['next'];
    case 'condition':
      return ['true', 'false'];
    case 'end':
      return [];
  }
}

// Every block but Start has one input point (AC-013).
export function hasInput(block: Block): boolean {
  return block.kind !== 'start';
}

// The target id of an output, or null when the output has no arrow: an empty next, an empty true
// route or a stop route (AC-020). A target that names no block of the flow is not drawn; the
// analyzer reports it.
function targetOf(block: Block, output: OutputName): { toId: string; roundLimit: number | null } | null {
  let route: model.Route | undefined;
  if (block.kind === 'start' || block.kind === 'agent') {
    return block.next === '' ? null : { toId: block.next, roundLimit: null };
  }
  if (block.kind === 'condition') {
    route = output === 'true' ? block.true : block.false;
  }
  if (route === undefined || !('to' in route) || route.to === '') {
    return null;
  }
  return { toId: route.to, roundLimit: 'roundLimit' in route ? route.roundLimit : null };
}

// The arrows of the flow, in block list order and then output order. A return is an arrow whose
// target is at the same column or earlier in the block layout (AC-008); its round limit is kept
// only for a return.
export function flowArrows(flow: Flow): readonly BlockArrow[] {
  const column = new Map(blockLayout(flow).places.map((place) => [place.blockId, place.column] as const));
  const columnOf = (blockId: string): number => {
    const found = column.get(blockId);
    if (found === undefined) {
      throw new Error(`block ${blockId} has no place in the layout`);
    }
    return found;
  };
  const ids = new Set(flow.blocks.map((block) => block.id));
  const arrows: BlockArrow[] = [];
  for (const block of flow.blocks) {
    for (const output of outputsOf(block)) {
      const target = targetOf(block, output);
      if (target === null || !ids.has(target.toId)) {
        continue;
      }
      const isReturn = columnOf(target.toId) <= columnOf(block.id);
      const roundLimit = isReturn ? target.roundLimit : null;
      arrows.push({
        fromId: block.id,
        output,
        toId: target.toId,
        isReturn,
        roundLimit,
        branchLabel: output === 'next' ? null : output,
        roundsLabel: roundLimit === null ? null : `up to ${roundLimit} rounds`,
      });
    }
  }
  return arrows;
}

// The name of a block as the arrow panel shows it: an Agent's name (its id while blank), "Start",
// "End", and a Condition with its description.
export function blockName(block: Block): string {
  switch (block.kind) {
    case 'start':
      return 'Start';
    case 'end':
      return 'End';
    case 'agent':
      return block.name === '' ? block.id : block.name;
    case 'condition':
      return block.description === '' ? 'Condition' : `Condition: ${block.description}`;
  }
}

// The source and target names of an arrow of this flow (AC-011). An arrow that names a block the
// flow does not have is a programmer error and throws.
export function arrowPanel(flow: Flow, arrow: BlockArrow): ArrowPanel {
  const source = flow.blocks.find((block) => block.id === arrow.fromId);
  const target = flow.blocks.find((block) => block.id === arrow.toId);
  if (source === undefined || target === undefined) {
    throw new Error(`arrow ${arrow.fromId} to ${arrow.toId} names a block the flow does not have`);
  }
  return { source: blockName(source), target: blockName(target) };
}
