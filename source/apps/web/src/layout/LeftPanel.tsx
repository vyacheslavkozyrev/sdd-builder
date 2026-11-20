import { Button, Paper, Typography, useTheme } from '@mui/material';
import { getLeftPanelStyles } from './layoutStyles.js';

// The left panel of the shared frame (F-07 AC-001, AC-002, AC-003, AC-013). It holds
// the text wordmark above the New project button and nothing else: the stepper and
// Prev and Next are added by F-08, and there is no Demo button (F-23).
// Sizes follow the approved screens: 260 px wide, 24 px gutters, New project 40 px high.

export interface LeftPanelProps {
  readonly onNewProject: () => void;
}

export function LeftPanel({ onNewProject }: LeftPanelProps) {
  const styles = getLeftPanelStyles(useTheme());
  return (
    <Paper elevation={0} square sx={styles.root}>
      <Typography component="p" sx={styles.wordmark}>
        SDDBuilder
      </Typography>
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
    </Paper>
  );
}
