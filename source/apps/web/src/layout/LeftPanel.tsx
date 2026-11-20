import type { ReactNode } from 'react';
import { Box, Button, Paper, Typography, useTheme } from '@mui/material';
import { getLeftPanelStyles } from './layoutStyles.js';

// The left panel of the shared frame (F-07 AC-001, AC-002, AC-003, AC-013). It holds the
// logo mark and the text wordmark in one row, above the New project button, and nothing
// else by itself: there is no Demo button (F-23). F-08 fills two optional slots: the stepper
// sits below New project, and the navigation (Prev and Next) is pinned to the foot of the
// panel (F-08 AC-004). With no slots the panel renders exactly as F-07.
// Sizes follow the approved screens: 260 px wide, 24 px gutters, the logo 24 × 24 px at x 24
// with the wordmark 10 px to its right, New project 40 px high below the row.

export interface LeftPanelProps {
  readonly onNewProject: () => void;
  readonly stepper?: ReactNode;
  readonly navigation?: ReactNode;
}

export function LeftPanel({ onNewProject, stepper, navigation }: LeftPanelProps) {
  const styles = getLeftPanelStyles(useTheme());
  return (
    <Paper elevation={0} square sx={styles.root}>
      <Box sx={styles.brandRow}>
        <Box role="img" aria-label="SDDBuilder logo" sx={styles.logo} />
        <Typography component="p" sx={styles.wordmark}>
          SDDBuilder
        </Typography>
      </Box>
      <Button
        variant="outlined"
        color="inherit"
        fullWidth
        onClick={() => {
          onNewProject();
        }}
        sx={styles.newProjectButton}
      >
        New project
      </Button>
      {stepper !== undefined && <Box sx={styles.stepper}>{stepper}</Box>}
      {navigation !== undefined && <Box sx={styles.foot}>{navigation}</Box>}
    </Paper>
  );
}
