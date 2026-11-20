import { Box, Typography, useTheme } from '@mui/material';
import { ProjectStep } from './ProjectStep.js';
import type { StepNumber } from './steps.js';
import type { ProjectValuesPatch, WizardValues } from './state.js';
import { getStepBodyStyles } from './wizardStyles.js';

// The body of the current wizard step, below the stepper and the buttons. Step 1 shows the project
// step (F-09 AC-012); steps 2 to 4 keep the placeholder of F-08 AC-013 until F-10 to F-13 build
// them. The placeholder is a sparkle mark in a light circle and the line below it. It shows no step
// title, no step counter and no input, because the stepper names the step. The sparkle is
// decorative, so it is hidden from assistive technology.

const PLACEHOLDER_LINE = 'The content of this step is added in a later feature.';

export interface StepBodyProps {
  readonly step: StepNumber;
  readonly values: WizardValues;
  readonly onChange: (patch: ProjectValuesPatch) => void;
}

export function StepBody({ step, values, onChange }: StepBodyProps) {
  if (step === 1) {
    return <ProjectStep values={values} onChange={onChange} />;
  }
  return <Placeholder />;
}

function Placeholder() {
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
