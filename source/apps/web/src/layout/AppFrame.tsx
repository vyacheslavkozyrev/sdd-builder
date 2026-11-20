import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { LeftPanel } from './LeftPanel.js';
import { Footer } from './Footer.js';
import { frameStyle } from './frameStyle.js';

// The shared frame every screen uses (F-07 AC-006, AC-007). It renders the left panel,
// then the centre area with the children, then the footer, in that order. The centre
// area is a slot only: the wizard fills it in F-08, so with no children it stays empty.
// Sizes follow the approved screens: the card sits 24 px in from the panel edge and
// from the window edge, and the footer sits in the grey area below it. The card is
// white with a 1 px border, a 12 px radius and a soft shadow (screens.md, restyle note).

export interface AppFrameProps {
  readonly onNewProject: () => void;
  readonly children?: ReactNode;
}

export function AppFrame({ onNewProject, children }: AppFrameProps) {
  return (
    <Box sx={{ ...frameStyle(), display: 'flex', bgcolor: '#F0F4F8' }}>
      <LeftPanel onNewProject={onNewProject} />
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          component="main"
          sx={{
            flex: 1,
            m: 3,
            mb: 0,
            bgcolor: '#FFFFFF',
            border: '1px solid #DDE7EE',
            borderRadius: '12px',
            boxShadow: '0 1px 4px rgba(50, 56, 62, 0.12)',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}
