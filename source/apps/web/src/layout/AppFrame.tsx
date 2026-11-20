import type { ReactNode } from 'react';
import { Box, useTheme } from '@mui/material';
import { LeftPanel } from './LeftPanel.js';
import { Footer } from './Footer.js';
import { getAppFrameStyles } from './layoutStyles.js';

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
  const styles = getAppFrameStyles(useTheme());
  return (
    <Box sx={styles.root}>
      <LeftPanel onNewProject={onNewProject} />
      <Box sx={styles.content}>
        <Box component="main" sx={styles.main}>
          {children}
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}
