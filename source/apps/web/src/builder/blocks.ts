// The block rules of the flow tab (F-12 AC-002, AC-003, AC-004, AC-005).
// Adding a block gives it a new id, blank fields for its kind and no arrows. Pure functions: no
// React and no I/O. A flow is a value; each rule returns a new one and never changes its input.

import type { pipeline as model } from '@sddbuilder/core';
import { renumber } from './fields.js';

export type Flow = model.Flow;
export type Block = model.Block;
export type BlockKind = Block['kind'];

// The result of adding a block: the new flow, and the id of the block so the view can select it
// and open its panel (AC-002).
export interface AddBlockResult {
  readonly flow: Flow;
  readonly blockId: string;
}

// Start is offered only while the flow has none (AC-003). A flow has at most one Start.
export function canAddStart(flow: Flow): boolean {
  return !flow.blocks.some((block) => block.kind === 'start');
}

// The id of the next added block: `block-N`, where N is the lowest positive number such that no
// block of any flow in `flows` already has that id (AC-004, AC-021). `flows` is the pipeline's flow list: the
// parser requires a block id to be unique across the whole pipeline, not only within its flow. File-safe.
export function nextBlockId(flows: readonly Flow[]): string {
  const taken = new Set(flows.flatMap((flow) => flow.blocks.map((block) => block.id)));
  let n = 1;
  while (taken.has(`block-${n}`)) {
    n += 1;
  }
  return `block-${n}`;
}

// Adds a blank block of the given kind (AC-002). `flows` is the pipeline's flow list; the ids of `flow` are
// counted as well, so the new id is unique across the pipeline even when `flows` leaves `flow` out (AC-021). A
// repeat that was already there is not extended: the structural analysis still marks it. A non-End block goes
// before the flow's End blocks, so the Ends stay after every other block in the list (a route from a Condition or
// an Agent to an End names a later block). An End goes at the end of the list. The blocks are renumbered, so each
// `index` is again its position in the list. Its fields are blank for its kind and it has no arrows: an Agent's and
// a Start's `next` is empty, a true route is empty (`{to: ''}`) and a false route is `stop`, which is what an
// empty false output means (AC-020). An End starts `done` with no produced artifact. A second Start is a
// programmer error and throws, since the toolbox disables Start while the flow has one (AC-003).
export function addBlock(flow: Flow, kind: BlockKind, flows: readonly Flow[]): AddBlockResult {
  if (kind === 'start' && !canAddStart(flow)) {
    throw new Error(`flow ${flow.id} already has a Start block`);
  }
  const id = nextBlockId([...flows, flow]);
  const block = blankBlock(kind, 0, id);
  const at = kind === 'end' ? flow.blocks.length : firstEndPosition(flow);
  const blocks = [...flow.blocks.slice(0, at), block, ...flow.blocks.slice(at)];
  return {
    flow: { ...flow, blocks: renumber(blocks) },
    blockId: id,
  };
}

// The position of the flow's first End block, or the length of the list when it has none.
function firstEndPosition(flow: Flow): number {
  const position = flow.blocks.findIndex((block) => block.kind === 'end');
  return position === -1 ? flow.blocks.length : position;
}

function blankBlock(kind: BlockKind, index: number, id: string): Block {
  switch (kind) {
    case 'start':
      return { index, id, kind, next: '' };
    case 'agent':
      return { index, id, kind, name: '', description: '', arguments: [], next: '' };
    case 'condition':
      return { index, id, kind, description: '', true: { to: '' }, false: { stop: true } };
    case 'end':
      return { index, id, kind, outcome: 'done', producedArtifact: '' };
  }
}
