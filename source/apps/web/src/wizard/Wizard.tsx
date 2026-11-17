import { Box } from '@mui/material';
import { StepBody } from './StepBody.js';
import { WizardStepper } from './WizardStepper.js';
import type { StepNumber } from './steps.js';

// The wizard panel (F-08 AC-004, AC-015). The stepper row comes first, with
// Prev and Next beside it; the step body is rendered below it and fills the
// rest of the centre area.

export interface WizardProps {
  step: StepNumber;
  onPrev: () => void;
  onNext: () => void;
}

export function Wizard({ step, onPrev, onNext }: WizardProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minHeight: 0 }}>
      <WizardStepper step={step} onPrev={onPrev} onNext={onNext} />
      <StepBody />
    </Box>
  );
}
