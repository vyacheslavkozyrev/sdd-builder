import { Button, Paper, Typography } from '@mui/material';

// The left panel of the shared frame (F-07 AC-001, AC-002, AC-003, AC-013). It holds
// the text wordmark above the New project button and nothing else: the stepper and
// Prev and Next are added by F-08, and there is no Demo button (F-23).
// Sizes follow the approved screens: 260 px wide, 24 px gutters, New project 40 px high.

export interface LeftPanelProps {
  readonly onNewProject: () => void;
}

export function LeftPanel({ onNewProject }: LeftPanelProps) {
  return (
    <Paper
      elevation={0}
      square
      sx={{
        width: 260,
        minHeight: '100%',
        boxSizing: 'border-box',
        p: 3,
        borderRight: '1px solid #DDE7EE',
        bgcolor: '#FFFFFF',
      }}
    >
      <Typography
        component="p"
        sx={{ fontSize: 18, fontWeight: 600, lineHeight: '24px', color: '#32383E', mb: 3 }}
      >
        SDDBuilder
      </Typography>
      <Button
        variant="outlined"
        color="inherit"
        fullWidth
        onClick={() => {
          onNewProject();
        }}
        sx={{
          height: 40,
          borderRadius: '8px',
          borderColor: '#CDD7E1',
          color: '#32383E',
          bgcolor: '#FFFFFF',
          textTransform: 'none',
        }}
      >
        New project
      </Button>
    </Paper>
  );
}
