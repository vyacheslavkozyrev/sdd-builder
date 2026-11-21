import { useId, useState } from 'react';
import { Box, Button, useTheme } from '@mui/material';
import { getErrorPanelStyles } from './builderStyles.js';
import type { Finding, PlacedFinding } from './marks.js';

// The error panel of the Pipeline tab (F-11 AC-035 notification part, AC-036). Every blocker and every
// warning of the pipeline is collected here, with one counter: "11 errors" and "2 warnings". The panel is
// closed by default and sits in the canvas card's header, so it covers no canvas box while closed. A click
// opens the full list: each finding with its kind, its path and its message. The findings that name no
// drawn item are listed in the section "Not on a drawn item", inside the same panel. Nothing is drawn when
// there is no finding.

export interface ErrorPanelProps {
  // Every finding of the analyzer, in its order, each with where it is drawn.
  readonly findings: readonly PlacedFinding[];
}

const kindLabels: Record<Finding['severity'], string> = {
  blocker: 'Blocker',
  warning: 'Warning',
};

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function ErrorPanel({ findings }: ErrorPanelProps) {
  const styles = getErrorPanelStyles(useTheme());
  const [open, setOpen] = useState(false);
  const listId = useId();
  const titleId = useId();
  if (findings.length === 0) {
    return null;
  }
  const errors = findings.filter((entry) => entry.finding.severity === 'blocker').length;
  const warnings = findings.filter((entry) => entry.finding.severity === 'warning').length;
  const counter = [
    ...(errors > 0 ? [countLabel(errors, 'error', 'errors')] : []),
    ...(warnings > 0 ? [countLabel(warnings, 'warning', 'warnings')] : []),
  ].join(' · ');
  const onCanvas = findings.filter((entry) => entry.placement.kind !== 'none');
  const unplaced = findings.filter((entry) => entry.placement.kind === 'none');

  const row = (entry: PlacedFinding, index: number) => (
    <Box component="li" key={`${entry.finding.severity}-${entry.finding.path}-${index}`} sx={styles.item}>
      <Box component="span" sx={styles.kind[entry.finding.severity]}>
        {kindLabels[entry.finding.severity]}
      </Box>
      <Box component="span" sx={styles.path}>
        {entry.finding.path}
      </Box>
      <Box component="span" sx={styles.message}>
        {entry.finding.message}
      </Box>
    </Box>
  );

  return (
    <Box sx={styles.root}>
      <Button
        type="button"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        sx={styles.toggle}
        onClick={() => setOpen((current) => !current)}
      >
        {counter}
      </Button>
      {open && (
        <Box component="section" id={listId} aria-label="Errors and warnings" sx={styles.list}>
          {onCanvas.length > 0 && <Box component="ul" sx={styles.items}>{onCanvas.map(row)}</Box>}
          {unplaced.length > 0 && (
            <Box component="section" aria-labelledby={titleId}>
              <Box component="h2" id={titleId} sx={styles.sectionTitle}>
                Not on a drawn item
              </Box>
              <Box component="ul" sx={styles.items}>
                {unplaced.map(row)}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
