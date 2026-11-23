// The properties card of the Pipeline tab (F-11 AC-017, AC-031, AC-042).
// The arrow panel shows its source flow's name and its target flow's name. Both are read-only:
// the result is a plain value with no field that edits them, and no rule here changes the pipeline.
// The selection holds one item at a time; `panelFor` picks the panel of that item, and
// `afterDeleteFlow` clears the selection and moves the open tab after a confirmed delete.
// On a flow tab, `blockPanelFor` picks the panel of the selected block or arrow (F-12), and
// `afterDeleteBlock` keeps the flow tab open after a confirmed block delete.
// A pure function: no React and no I/O.

import type { Arrow, Pipeline } from './connect.js';
import type { Block } from './blocks.js';
import {
  arrowPanel as blockArrowPanel,
  flowArrows,
  type ArrowPanel as BlockArrowPanel,
  type OutputName,
} from './blockArrows.js';
import type { Flow, Tab } from './model.js';

// The one selected item of the Pipeline tab. Nothing selected is the pipeline selected (AC-042).
export type Selection =
  | { readonly kind: 'pipeline' }
  | { readonly kind: 'flow'; readonly id: string }
  | { readonly kind: 'arrow'; readonly arrow: Arrow };

// What the arrow panel shows for one arrow: the names of its two flows, not their ids.
export interface ArrowPanel {
  readonly sourceName: string;
  readonly targetName: string;
}

// The panel shown for the selection: the pipeline, a flow, or an arrow.
export type Panel =
  | { readonly kind: 'pipeline'; readonly pipeline: Pipeline }
  | { readonly kind: 'flow'; readonly flow: Flow }
  | { readonly kind: 'arrow'; readonly arrow: ArrowPanel };

// The panel data for `arrow`, frozen so that no caller can write a name. An arrow that is not in
// the pipeline is a programmer error and throws (as in connect.ts).
export function arrowPanel(pipelineState: Pipeline, arrow: Arrow): ArrowPanel {
  const source = pipelineState.flows.find((flow) => flow.id === arrow.source);
  const target = pipelineState.flows.find((flow) => flow.id === arrow.target);
  if (source === undefined || target === undefined || source.next !== arrow.target) {
    throw new Error(`no arrow from "${arrow.source}" to "${arrow.target}" in the pipeline`);
  }
  return Object.freeze({ sourceName: source.name, targetName: target.name });
}

// The panel for the selected item (AC-042). A selected flow that is not in the pipeline is a
// programmer error and throws, as an unknown arrow does.
export function panelFor(pipelineState: Pipeline, selection: Selection): Panel {
  switch (selection.kind) {
    case 'pipeline':
      return { kind: 'pipeline', pipeline: pipelineState };
    case 'flow': {
      const flow = pipelineState.flows.find((candidate) => candidate.id === selection.id);
      if (flow === undefined) {
        throw new Error(`F-11: the pipeline has no flow "${selection.id}"`);
      }
      return { kind: 'flow', flow };
    }
    case 'arrow':
      return { kind: 'arrow', arrow: arrowPanel(pipelineState, selection.arrow) };
  }
}

// The open tab and the selection, the two things a confirmed delete can leave pointing at nothing.
export interface PanelState {
  readonly tab: Tab;
  readonly selection: Selection;
}

// The state after a confirmed delete of a flow (AC-031): the selection is cleared and the open tab
// moves to the Pipeline tab. This also leaves nothing dangling: a selected arrow that touched the
// deleted flow would otherwise name a flow that is gone, and so would a tab open on it.
export function afterDeleteFlow(): PanelState {
  return { tab: { kind: 'pipeline' }, selection: { kind: 'pipeline' } };
}

// The selection on a flow tab (F-12 AC-011): one block, one arrow of a block, or nothing. Nothing
// selected shows the flow's own panel. A block is named by its id within the flow; an arrow by its
// source block and output, since each output has at most one arrow.
export type BlockSelection =
  | { readonly kind: 'none' }
  | { readonly kind: 'block'; readonly blockId: string }
  | { readonly kind: 'blockArrow'; readonly fromId: string; readonly output: OutputName };

type BlockOf<K extends Block['kind']> = Extract<Block, { readonly kind: K }>;

// The panel for the selected block or arrow on a flow tab. A block's panel is its kind's panel: Start,
// Agent, Condition or End (AC-011). The flow panel is shown when nothing is selected.
export type BlockPanel =
  | { readonly kind: 'flow'; readonly flow: Flow }
  | { readonly kind: 'start'; readonly block: BlockOf<'start'> }
  | { readonly kind: 'agent'; readonly block: BlockOf<'agent'> }
  | { readonly kind: 'condition'; readonly block: BlockOf<'condition'> }
  | { readonly kind: 'end'; readonly block: BlockOf<'end'> }
  | { readonly kind: 'blockArrow'; readonly arrow: BlockArrowPanel };

// The panel for the selection on a flow tab (AC-011). A block or arrow that is not in the flow is a
// programmer error and throws, as the pipeline selections do.
export function blockPanelFor(flow: Flow, selection: BlockSelection): BlockPanel {
  switch (selection.kind) {
    case 'none':
      return { kind: 'flow', flow };
    case 'block':
      return blockPanel(findBlock(flow, selection.blockId));
    case 'blockArrow': {
      const arrow = flowArrows(flow).find(
        (candidate) => candidate.fromId === selection.fromId && candidate.output === selection.output,
      );
      if (arrow === undefined) {
        throw new Error(`F-12: flow ${flow.id} has no ${selection.output} arrow from block ${selection.fromId}`);
      }
      return { kind: 'blockArrow', arrow: blockArrowPanel(flow, arrow) };
    }
  }
}

function findBlock(flow: Flow, blockId: string): Block {
  const found = flow.blocks.find((block) => block.id === blockId);
  if (found === undefined) {
    throw new Error(`F-12: flow ${flow.id} has no block "${blockId}"`);
  }
  return found;
}

function blockPanel(block: Block): BlockPanel {
  switch (block.kind) {
    case 'start':
      return { kind: 'start', block };
    case 'agent':
      return { kind: 'agent', block };
    case 'condition':
      return { kind: 'condition', block };
    case 'end':
      return { kind: 'end', block };
  }
}

// The state after a confirmed block delete (AC-044): the open tab stays on the same flow and the
// selection is empty, so no deleted block or arrow stays selected.
export function afterDeleteBlock(flowId: string): { readonly tab: Tab; readonly selection: BlockSelection } {
  return { tab: { kind: 'flow', id: flowId }, selection: { kind: 'none' } };
}
