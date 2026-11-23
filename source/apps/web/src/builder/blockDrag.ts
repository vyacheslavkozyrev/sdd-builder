// The drags on the flow tab's block canvas (F-12 AC-012, AC-018, AC-019). A drag starts at an output point (a new
// link) or at one end of the selected arrow (a repoint). A drop lands on a block, or on an output point. The rules
// are the ones of blockLink.ts: this module picks the rule for the drag and returns its result. Pure: no React and
// no I/O.

import type { OutputName } from './blockArrows.js';
import type { BlockDrawing, Point } from './blockDrawing.js';
import { linkBlocks, repointBlockSource, repointBlockTarget } from './blockLink.js';
import type { ArrowEnds, Flow, LinkResult } from './blockLink.js';

// What the user is dragging: a new link from an output point, or one end of an arrow.
export type DragState =
  | { readonly kind: 'link'; readonly fromId: string; readonly output: OutputName }
  | { readonly kind: 'source'; readonly arrow: ArrowEnds }
  | { readonly kind: 'target'; readonly arrow: ArrowEnds };

// Where a drop landed: on a block, and on one of its output points when the drop was on one (null otherwise).
export interface Drop {
  readonly blockId: string;
  readonly output: OutputName | null;
}

// The result of a drop: the link rules' result, or null when the drop does nothing. A source end dropped on
// something other than an output point is not a target, so it does nothing (AC-019).
export function settleDrop(flow: Flow, drag: DragState, drop: Drop): LinkResult | null {
  switch (drag.kind) {
    case 'link':
      return linkBlocks(flow, drag.fromId, drag.output, drop.blockId);
    case 'target':
      return repointBlockTarget(flow, drag.arrow, drop.blockId);
    case 'source':
      return drop.output === null ? null : repointBlockSource(flow, drag.arrow, drop.blockId, drop.output);
  }
}

// The line a drag draws while it moves (AC-012): from the fixed end to the pointer. A new link is drawn from its
// output point; a dragged end is drawn from the end that stays where it is. A drag of a block's output point
// that is not in the drawing is a programmer error and throws.
export function dragPreview(drawing: BlockDrawing, drag: DragState, pointer: Point): readonly Point[] {
  switch (drag.kind) {
    case 'link': {
      const port = drawing.ports.find((candidate) => candidate.blockId === drag.fromId && candidate.role === drag.output);
      if (port === undefined) {
        throw new Error(`F-12: block ${drag.fromId} has no ${drag.output} point in the drawing`);
      }
      return [{ x: port.x, y: port.y }, pointer];
    }
    case 'source':
      return [pointer, arrowEnds(drawing, drag.arrow).last];
    case 'target':
      return [arrowEnds(drawing, drag.arrow).first, pointer];
  }
}

// The first and last point of an arrow of the drawing: its source end and its target end. An arrow that is not in
// the drawing is a programmer error and throws.
function arrowEnds(drawing: BlockDrawing, arrow: ArrowEnds): { readonly first: Point; readonly last: Point } {
  const found = drawing.arrows.find((candidate) => candidate.fromId === arrow.fromId && candidate.output === arrow.output);
  const points = found?.points ?? [];
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error(`F-12: no ${arrow.output} arrow from ${arrow.fromId} in the drawing`);
  }
  return { first, last };
}
