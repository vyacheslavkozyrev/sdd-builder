import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';

// The application header (F-07 AC-001, AC-002, AC-003, AC-013).
// The wordmark sits on the left, the New project button on the right, and
// no other control is shown. Demo is not in the MVP.

export interface HeaderProps {
  onNewProject: () => void;
}

export function Header({ onNewProject }: HeaderProps) {
  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
    >
      <Toolbar>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          SDDBuilder
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" color="primary" onClick={() => onNewProject()}>
          New project
        </Button>
      </Toolbar>
    </AppBar>
  );
}
