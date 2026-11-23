// The link rules of a flow on the Map tab (F-12 AC-012, AC-014 to AC-018).
// Dragging from a block's output point to another block's input point sets that output's route.
// The checks run in the order of the stories, and the first refusal gives the reason. A pure
// function: it returns a new flow or a refusal, and never changes its input. No React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';
import { blockLayout } from './blockLayout.js';
import { flowArrows, hasInput, outputsOf, type OutputName } from './blockArrows.js';

export type Flow = model.Flow;
export type Block = model.Block;

// The result of a link: the flow with the new arrow, or the reason the link was refused. A refused
// link leaves the flow as it was.
export type LinkResult =
  | { readonly ok: true; readonly flow: Flow }
  | { readonly ok: false; readonly reason: string };

// Links an output of a block to a block of the same flow (AC-012). A return to an earlier block
// is set with no round limit (AC-017): the block's panel shows it as incomplete until a limit is
// set. An unknown block id or an output the block does not have is a programmer error and throws.
export function linkBlocks(flow: Flow, fromId: string, output: OutputName, targetId: string): LinkResult {
  const source = findBlock(flow, fromId);
  const target = findBlock(flow, targetId);
  if (!outputsOf(source).includes(output)) {
    throw new Error(`block ${fromId} (${source.kind}) has no ${output} output`);
  }

  if (fromId === targetId) {
    return refuse('A block cannot link to itself.');
  }
  if (source.kind === 'start' && target.kind === 'end') {
    return refuse('A Start links to an Agent or a Condition.');
  }
  if (flowArrows(flow).some((arrow) => arrow.fromId === fromId && arrow.output === output)) {
    return refuse('This block already has an arrow from this point.');
  }
  if (!hasInput(target)) {
    return refuse('A Start has no input point.');
  }

  const isReturn = isEarlier(flow, targetId, fromId);
  if (isReturn && (output === 'true' || source.kind === 'agent')) {
    return refuse('Only a false route can return to an earlier Agent.');
  }
  if (isReturn && output === 'false' && target.kind !== 'agent') {
    return refuse('Only an Agent can be returned to.');
  }

  const blocks = flow.blocks.map((block) => (block.id === fromId ? withRoute(block, output, targetId) : block));
  return { ok: true, flow: { ...flow, blocks } };
}

function refuse(reason: string): LinkResult {
  return { ok: false, reason };
}

function findBlock(flow: Flow, blockId: string): Block {
  const found = flow.blocks.find((block) => block.id === blockId);
  if (found === undefined) {
    throw new Error(`flow ${flow.id} has no block ${blockId}`);
  }
  return found;
}

// A target at the same column or earlier in the layout is an earlier block, as the arrows count
// a return (blockArrows.ts). The layout places every block of the flow, so both ids have a column.
function isEarlier(flow: Flow, targetId: string, sourceId: string): boolean {
  const column = new Map(blockLayout(flow).places.map((place) => [place.blockId, place.column] as const));
  const targetColumn = column.get(targetId);
  const sourceColumn = column.get(sourceId);
  if (targetColumn === undefined || sourceColumn === undefined) {
    throw new Error(`block ${targetId} or ${sourceId} has no place in the layout`);
  }
  return targetColumn <= sourceColumn;
}

// The block with the output's route set to the target. A forward route and a return carry no
// round limit here; the parser asks for one on a return (AC-017).
function withRoute(block: Block, output: OutputName, targetId: string): Block {
  switch (block.kind) {
    case 'start':
    case 'agent':
      return { ...block, next: targetId };
    case 'condition':
      return output === 'true' ? { ...block, true: { to: targetId } } : { ...block, false: { to: targetId } };
    case 'end':
      throw new Error(`block ${block.id} is an End and has no output`);
  }
}
