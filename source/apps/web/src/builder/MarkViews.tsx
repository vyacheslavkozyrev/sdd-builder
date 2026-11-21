import { Box, useTheme } from '@mui/material';
import { useId } from 'react';
import { getMarkViewsStyles } from './markViewsStyles.js';
import type { Finding, Placement, StructureMarks } from './marks.js';

// The views of the structure marks on the Pipeline tab (F-11 AC-035 warning part, AC-036). A warning
// is drawn beside the flow box or arrow it names, in the warning colour; a finding with no drawn item
// (placement none) is listed under the canvas in the section "Not on a drawn item", blockers included.
// A blocker on a box is drawn red and its message goes to the message band (MessageBand), so it is not
// drawn beside the box. The caller places each view; this file decides only what each view holds.

// The warnings placed on one drawn item, in the analyzer's order. A blocker is not returned here, and
// nothing is returned for a placement of none: such a finding is listed under the canvas instead (AC-036).
export function warningsAt(marks: StructureMarks, placement: Placement): readonly Finding[] {
  if (placement.kind === 'none') {
    return [];
  }
  const key = placementKey(placement);
  return marks.findings
    .filter((entry) => entry.finding.severity === 'warning' && placementKey(entry.placement) === key)
    .map((entry) => entry.finding);
}

// Every finding that names no drawn item, blockers and warnings both, in the analyzer's order (AC-036).
export function unplacedFindings(marks: StructureMarks): readonly Finding[] {
  return marks.findings.filter((entry) => entry.placement.kind === 'none').map((entry) => entry.finding);
}

// A key that is the same for two placements of the same item and differs for every other item.
function placementKey(placement: Placement): string {
  switch (placement.kind) {
    case 'flow':
      return `flow:${placement.flowId}`;
    case 'arrow':
      return `arrow:${placement.source}`;
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

export interface UnplacedFindingsProps {
  // The findings with no drawn item, in order. Nothing is drawn when the list is empty.
  readonly findings: readonly Finding[];
}

const kindLabels: Record<Finding['severity'], string> = {
  blocker: 'Blocker',
  warning: 'Warning',
};

// The list under the canvas: each finding with its kind, its path and the analyzer's message.
export function UnplacedFindings({ findings }: UnplacedFindingsProps) {
  const styles = getMarkViewsStyles(useTheme());
  const titleId = useId();
  if (findings.length === 0) {
    return null;
  }
  return (
    <Box component="section" aria-labelledby={titleId} sx={styles.unplaced}>
      <Box component="h2" id={titleId} sx={styles.unplacedTitle}>
        Not on a drawn item
      </Box>
      <Box component="ul" sx={styles.unplacedList}>
        {findings.map((finding, index) => (
          <Box component="li" key={`${finding.severity}-${finding.path}-${index}`} sx={styles.unplacedItem}>
            <Box component="span" sx={styles.kind[finding.severity]}>
              {kindLabels[finding.severity]}
            </Box>
            <Box component="span" sx={styles.path}>
              {finding.path}
            </Box>
            <Box component="span" sx={styles.message}>
              {finding.message}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
