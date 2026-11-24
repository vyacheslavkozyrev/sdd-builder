import { Box, useTheme } from '@mui/material';
import { getMarkViewsStyles } from './markViewsStyles.js';
import type { Finding, Placement, StructureMarks } from './marks.js';

// The views of the structure marks on the Pipeline tab (F-11 AC-035 warning part, AC-036). A warning
// is drawn beside the flow box or arrow it names, in the warning colour. Every blocker and warning is
// also collected in the error panel (ErrorPanel), where a finding with no drawn item (placement none) is
// listed under "Not on a drawn item". A blocker on a box is drawn red and is not drawn beside the box.
// The caller places each view; this file decides only what each view holds.

// The warnings placed on one drawn item, in the analyzer's order. A blocker is not returned here, and
// nothing is returned for a placement of none: such a finding is listed in the error panel instead (AC-036).
export function warningsAt(marks: StructureMarks, placement: Placement): readonly Finding[] {
  if (placement.kind === 'none') {
    return [];
  }
  const key = placementKey(placement);
  return marks.findings
    .filter((entry) => entry.finding.severity === 'warning' && placementKey(entry.placement) === key)
    .map((entry) => entry.finding);
}

// The blocks and arrows of one flow that carry a finding, for the marks on the flow tab (F-12 AC-045). A block is
// named by its id, and an arrow by its source block and output, as the canvas draws them. A finding with no drawn
// item is not here: it is listed in the error panel. The blocker sets are the marked items that carry a blocker;
// the others carry only warnings.
export interface MarkedItems {
  readonly blocks: ReadonlySet<string>;
  readonly arrows: ReadonlySet<string>;
  readonly blockerBlocks: ReadonlySet<string>;
  readonly blockerArrows: ReadonlySet<string>;
}

export function markedItems(marks: StructureMarks, flowId: string): MarkedItems {
  const blocks = new Set<string>();
  const arrows = new Set<string>();
  const blockerBlocks = new Set<string>();
  const blockerArrows = new Set<string>();
  for (const { finding, placement } of marks.findings) {
    const blocker = finding.severity === 'blocker';
    if (placement.kind === 'block' && placement.flowId === flowId) {
      blocks.add(placement.blockId);
      if (blocker) blockerBlocks.add(placement.blockId);
    }
    if (placement.kind === 'block-arrow' && placement.flowId === flowId) {
      const key = arrowKey(placement.fromId, placement.output);
      arrows.add(key);
      if (blocker) blockerArrows.add(key);
    }
  }
  return { blocks, arrows, blockerBlocks, blockerArrows };
}

// The key of a block's arrow in `MarkedItems.arrows`.
export function arrowKey(fromId: string, output: string): string {
  return `${fromId}.${output}`;
}

// The findings a block carries, in the analyzer's order: those on the block and those on its outgoing arrows
// (F-12 AC-045). Shown in the block's panel as a read-only list (AC-048).
export function findingsOfBlock(marks: StructureMarks, flowId: string, blockId: string): readonly Finding[] {
  return marks.findings
    .filter(({ placement }) => {
      if (placement.kind === 'block') {
        return placement.flowId === flowId && placement.blockId === blockId;
      }
      if (placement.kind === 'block-arrow') {
        return placement.flowId === flowId && placement.fromId === blockId;
      }
      return false;
    })
    .map((entry) => entry.finding);
}

// A key that is the same for two placements of the same item and differs for every other item.
function placementKey(placement: Placement): string {
  switch (placement.kind) {
    case 'flow':
      return `flow:${placement.flowId}`;
    case 'arrow':
      return `arrow:${placement.source}`;
    case 'block':
      return `block:${placement.flowId}:${placement.blockId}`;
    case 'block-arrow':
      return `block-arrow:${placement.flowId}:${placement.fromId}:${placement.output}`;
    case 'none':
      return 'none';
  }
}

export interface WarningNoteProps {
  // The analyzer's message, shown unchanged after the "Warning ·" label.
  readonly text: string;
}

// One warning, drawn beside the box or arrow it names. The caller positions it.
export function WarningNote({ text }: WarningNoteProps) {
  const styles = getMarkViewsStyles(useTheme());
  return (
    <Box role="note" sx={styles.note}>
      <Box component="span" sx={styles.noteText}>
        {`Warning · ${text}`}
      </Box>
    </Box>
  );
}
