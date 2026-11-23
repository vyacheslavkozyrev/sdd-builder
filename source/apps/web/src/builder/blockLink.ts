// The link rules of a flow on the Map tab (F-12 AC-012, AC-014 to AC-021).
// Dragging from a block's output point to another block's input point sets that output's route.
// The checks run in the order of the stories, and the first refusal gives the reason. A pure
// function: it returns a new flow or a refusal, and never changes its input. No React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';
import { blockLayout } from './blockLayout.js';
import { flowArrows, hasInput, outputsOf, type BlockArrow, type OutputName } from './blockArrows.js';

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

// The two ends of an arrow of the flow: the output it leaves and the block it enters.
export type ArrowEnds = Pick<BlockArrow, 'fromId' | 'output' | 'toId'>;

// Drags an arrow's target end onto another block's input point (AC-019). The arrow is cleared from
// its output first, so the link rules see that output empty; a refusal keeps the flow as it was.
// An arrow that is not in the flow is a programmer error and throws.
export function repointBlockTarget(flow: Flow, arrow: ArrowEnds, newTargetId: string): LinkResult {
  requireArrow(flow, arrow);
  return linkBlocks(clearOutput(flow, arrow.fromId, arrow.output), arrow.fromId, arrow.output, newTargetId);
}

// Drags an arrow's source end onto another block's output point (AC-019). The arrow leaves the
// new output and keeps its target; the old output is cleared first. A refusal keeps the flow as it
// was. An arrow that is not in the flow is a programmer error and throws.
export function repointBlockSource(flow: Flow, arrow: ArrowEnds, newFromId: string, newOutput: OutputName): LinkResult {
  requireArrow(flow, arrow);
  return linkBlocks(clearOutput(flow, arrow.fromId, arrow.output), newFromId, newOutput, arrow.toId);
}

// Delete connection (AC-021): clears the output's route, leaving the output empty and the other
// arrows as they were. An output the block does not have is a programmer error and throws.
export function removeBlockArrow(flow: Flow, fromId: string, output: OutputName): Flow {
  const source = findBlock(flow, fromId);
  if (!outputsOf(source).includes(output)) {
    throw new Error(`block ${fromId} (${source.kind}) has no ${output} output`);
  }
  return clearOutput(flow, fromId, output);
}

// The read-only text of an output with no arrow (AC-020, AC-031, AC-041): a false output stops the
// flow and asks the user; a true output or a Start or Agent output has no arrow yet.
export function emptyOutputText(output: OutputName): string {
  return output === 'false' ? 'Stop the flow and ask the user' : 'No arrow yet';
}

// Throws when the arrow is not an arrow of the flow.
function requireArrow(flow: Flow, arrow: ArrowEnds): void {
  const found = flowArrows(flow).some(
    (existing) => existing.fromId === arrow.fromId && existing.output === arrow.output && existing.toId === arrow.toId,
  );
  if (!found) {
    throw new Error(`no ${arrow.output} arrow from ${arrow.fromId} to ${arrow.toId} in flow ${flow.id}`);
  }
}

// The flow with the output of a block emptied: an Agent's or Start's next is empty, a true route is
// empty and a false route is `stop` (the same empty values a new block has).
function clearOutput(flow: Flow, blockId: string, output: OutputName): Flow {
  const blocks = flow.blocks.map((block) => (block.id === blockId ? withoutRoute(block, output) : block));
  return { ...flow, blocks };
}

function withoutRoute(block: Block, output: OutputName): Block {
  switch (block.kind) {
    case 'start':
    case 'agent':
      return { ...block, next: '' };
    case 'condition':
      return output === 'true' ? { ...block, true: { to: '' } } : { ...block, false: { stop: true } };
    case 'end':
      throw new Error(`block ${block.id} is an End and has no output`);
  }
}
