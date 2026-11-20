import { Box, Typography, useTheme } from '@mui/material';
import { getStepBodyStyles } from './wizardStyles.js';

// The placeholder body of a wizard step (F-08 AC-013, screens 01 to 04). It is the same for
// every step: a sparkle mark in a light circle and the line below it. It shows no step title,
// no step counter and no input, because the stepper names the step. The real content comes in
// F-09 to F-13. The sparkle is decorative, so it is hidden from assistive technology.

const PLACEHOLDER_LINE = 'The content of this step is added in a later feature.';

export function StepBody() {
  const styles = getStepBodyStyles(useTheme());
  return (
    <Box sx={styles.root}>
      <Box sx={styles.circle}>
        <Box component="svg" aria-hidden="true" focusable="false" viewBox="744 314 52 52" sx={styles.sparkle}>
          <path d="M770 314 L776 334 L796 340 L776 346 L770 366 L764 346 L744 340 L764 334 Z" fill="currentColor" />
        </Box>
      </Box>
      <Typography component="p" sx={styles.line}>
        {PLACEHOLDER_LINE}
      </Typography>
    </Box>
  );
}
