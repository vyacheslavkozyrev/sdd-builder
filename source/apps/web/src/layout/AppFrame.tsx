import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { Footer } from './Footer.js';
import { Header } from './Header.js';
import { frameStyle } from './frameStyle.js';

// The application frame (F-07 AC-006, AC-007).
// Renders the header, then the centre area holding the children, then the
// footer. The centre area fills the space between the header and the footer;
// the screen supplies its content, the frame only sets its size.

export interface AppFrameProps {
  onNewProject: () => void;
  children?: ReactNode;
}

export function AppFrame({ onNewProject, children }: AppFrameProps) {
  return (
    <Box sx={{ ...frameStyle(), display: 'flex', flexDirection: 'column' }}>
      <Header onNewProject={onNewProject} />
      <Box component="main" sx={{ flexGrow: 1, boxSizing: 'border-box', px: 3, pt: 2, pb: 2 }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
