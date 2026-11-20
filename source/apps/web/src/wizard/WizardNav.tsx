import { Box, Button, useTheme } from '@mui/material';
import { isNextEnabled, isPrevEnabled } from './steps.js';
import type { StepNumber } from './steps.js';
import { getWizardNavStyles } from './wizardStyles.js';

// The Prev and Next buttons at the foot of the left panel (F-08 AC-005, AC-007, AC-014). Each
// button carries its word. Prev is disabled on step 1 and Next on step 4; a disabled button keeps
// its place and has no click handler, so it cannot move the wizard.

export interface WizardNavProps {
  readonly step: StepNumber;
  readonly onPrev: () => void;
  readonly onNext: () => void;
}

export function WizardNav({ step, onPrev, onNext }: WizardNavProps) {
  const styles = getWizardNavStyles(useTheme());
  const prevEnabled = isPrevEnabled(step);
  const nextEnabled = isNextEnabled(step);
  return (
    <Box sx={styles.row}>
      <Button
        variant="outlined"
        color="inherit"
        disabled={!prevEnabled}
        onClick={prevEnabled ? () => { onPrev(); } : undefined}
        sx={styles.prev}
      >
        Prev
      </Button>
      <Button
        variant="contained"
        color="primary"
        disabled={!nextEnabled}
        onClick={nextEnabled ? () => { onNext(); } : undefined}
        sx={styles.next}
      >
        Next
      </Button>
    </Box>
  );
}
