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
