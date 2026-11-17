import { Typography } from '@mui/material';
import { AppFrame } from './layout/AppFrame.js';

// The application root (F-07 AC-008).
// Renders the frame with a centre placeholder. The wizard replaces the
// placeholder and wires New project in F-08.

export function App() {
  return (
    <AppFrame onNewProject={() => undefined}>
      <Typography>Screen content is added by the wizard (F-08).</Typography>
    </AppFrame>
  );
}
