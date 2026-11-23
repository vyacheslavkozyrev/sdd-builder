// The delete rule of a block on the Map tab (F-12 AC-039 to AC-044). Deleting a block removes it and
// every arrow that starts or ends at it. A block that routed to it keeps its own properties and has
// that route cleared; nothing is rewired. A flow keeps its Start block and at least one End block.
// Pure functions: no React and no I/O. A flow is a value; each rule returns a new one and never
// changes its input.

import type { pipeline as model } from '@sddbuilder/core';
import { flowArrows } from './blockArrows.js';

export type Flow = model.Flow;
export type Block = model.Block;

// The reasons a block cannot be deleted, shown beside its disabled Delete control (AC-042, AC-043).
export const START_DELETE_REFUSAL = 'A flow keeps its Start block.';
export const LAST_END_DELETE_REFUSAL = 'A flow keeps at least one End block.';

// The result of a delete: the flow without the block, or the reason the delete was refused. A
// refused delete leaves the flow as it was.
export type DeleteBlockResult =
  | { readonly ok: true; readonly flow: Flow }
  | { readonly ok: false; readonly reason: string };

// The number of arrows deleting the block removes: those that start at it and those that end at it
// (AC-039). An arrow is counted once even when it starts and ends at the block.
export function arrowsRemovedBy(flow: Flow, blockId: string): number {
  return flowArrows(flow).filter((arrow) => arrow.fromId === blockId || arrow.toId === blockId).length;
}

// The reason the block cannot be deleted, or null when it can (AC-042, AC-043). The flow's Start is
// never deleted; the last End is never deleted. An unknown block id is a programmer error and throws.
export function deleteRefusal(flow: Flow, blockId: string): string | null {
  const block = findBlock(flow, blockId);
  if (block.kind === 'start') {
    return START_DELETE_REFUSAL;
  }
  if (block.kind === 'end' && flow.blocks.filter((item) => item.kind === 'end').length === 1) {
    return LAST_END_DELETE_REFUSAL;
  }
  return null;
}

// Deletes the block and every arrow that starts or ends at it (AC-040). A block that routed to the
// deleted one has that route cleared (AC-041): an Agent's or Start's next becomes empty, a true
// route becomes empty and a false route becomes `stop`, the same empty values a new block has.
// Other properties of every block stay as they are. A refused delete returns its reason (AC-042,
// AC-043). An unknown block id is a programmer error and throws.
export function deleteBlock(flow: Flow, blockId: string): DeleteBlockResult {
  const refusal = deleteRefusal(flow, blockId);
  if (refusal !== null) {
    return { ok: false, reason: refusal };
  }
  const blocks = flow.blocks
    .filter((block) => block.id !== blockId)
    .map((block) => clearRoutesTo(block, blockId));
  return { ok: true, flow: { ...flow, blocks } };
}

function findBlock(flow: Flow, blockId: string): Block {
  const found = flow.blocks.find((block) => block.id === blockId);
  if (found === undefined) {
    throw new Error(`flow ${flow.id} has no block ${blockId}`);
  }
  return found;
}

// The block with each of its routes to the deleted block emptied. A block with no route to it is
// returned unchanged.
function clearRoutesTo(block: Block, deletedId: string): Block {
  switch (block.kind) {
    case 'start':
    case 'agent':
      return block.next === deletedId ? { ...block, next: '' } : block;
    case 'condition': {
      const onTrue = 'to' in block.true && block.true.to === deletedId ? { to: '' } : block.true;
      const onFalse = 'to' in block.false && block.false.to === deletedId ? { stop: true as const } : block.false;
      return onTrue === block.true && onFalse === block.false ? block : { ...block, true: onTrue, false: onFalse };
    }
    case 'end':
      return block;
  }
}
