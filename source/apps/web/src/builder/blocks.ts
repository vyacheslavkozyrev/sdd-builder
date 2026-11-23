// The block rules of the flow tab (F-12 AC-002, AC-003, AC-004, AC-005).
// Adding a block gives it a new id, blank fields for its kind and no arrows. Pure functions: no
// React and no I/O. A flow is a value; each rule returns a new one and never changes its input.

import type { pipeline as model } from '@sddbuilder/core';

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
// block of this flow already has that id (AC-004). Ids are unique within the flow and file-safe.
export function nextBlockId(flow: Flow): string {
  const taken = new Set(flow.blocks.map((block) => block.id));
  let n = 1;
  while (taken.has(`block-${n}`)) {
    n += 1;
  }
  return `block-${n}`;
}

// Appends a blank block of the given kind after the flow's last block (AC-002). Its fields are
// blank for its kind and it has no arrows: an Agent's and a Start's `next` is empty, a true route
// is empty (`{to: ''}`) and a false route is `stop`, which is what an empty false output means
// (AC-020). An End starts `done` with no produced artifact. Its index comes after every index in
// the flow, so it never repeats one. A second Start is a programmer error and throws, since the
// toolbox disables Start while the flow has one (AC-003).
export function addBlock(flow: Flow, kind: BlockKind): AddBlockResult {
  if (kind === 'start' && !canAddStart(flow)) {
    throw new Error(`flow ${flow.id} already has a Start block`);
  }
  const id = nextBlockId(flow);
  const index = flow.blocks.reduce((highest, block) => Math.max(highest, block.index), -1) + 1;
  const block = blankBlock(kind, index, id);
  return {
    flow: { ...flow, blocks: [...flow.blocks, block] },
    blockId: id,
  };
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
