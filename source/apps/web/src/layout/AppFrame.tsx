import type { ReactNode } from 'react';
import { Box, useTheme } from '@mui/material';
import { LeftPanel } from './LeftPanel.js';
import { Footer } from './Footer.js';
import { getAppFrameStyles } from './layoutStyles.js';

// The shared frame every screen uses (F-07 AC-006, AC-007). It renders the left panel,
// then the centre area with the children, then the footer, in that order. The centre
// area is a slot only: with no children it stays empty. The stepper and the navigation
// are passed through to the left panel's slots (F-08 AC-004); the frame does not read
// them, so layout does not import wizard code.
// Sizes follow the approved screens: the card sits 24 px in from the panel edge and
// from the window edge, and the footer sits in the grey area below it. The card is
// white with a 1 px border, a 12 px radius and a soft shadow (screens.md, restyle note).
// With `fill` the window height bounds the frame and the centre area draws no card, so the step
// draws its own cards under its tab row (F-11 step 3). Without it the frame is the card layout of F-07.

export interface AppFrameProps {
  readonly onNewProject: () => void;
  readonly stepper?: ReactNode;
  readonly navigation?: ReactNode;
  readonly fill?: boolean;
  readonly children?: ReactNode;
}

export function AppFrame({ onNewProject, stepper, navigation, fill = false, children }: AppFrameProps) {
  const styles = getAppFrameStyles(useTheme());
  return (
    <Box sx={styles.root(fill)}>
      <LeftPanel onNewProject={onNewProject} stepper={stepper} navigation={navigation} />
      <Box sx={styles.content}>
        <Box component="main" sx={styles.main(fill)}>
          {children}
        </Box>
        <Footer />
      </Box>
    </Box>
  );
}
