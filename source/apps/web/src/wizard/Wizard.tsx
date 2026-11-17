import { Box } from '@mui/material';
import { ProjectStep } from './ProjectStep.js';
import { StepBody } from './StepBody.js';
import { WizardStepper } from './WizardStepper.js';
import type { WizardValues } from './state.js';
import type { StepNumber } from './steps.js';

// The wizard panel (F-08 AC-004, AC-015; F-09 AC-012). The stepper row comes
// first, with Prev and Next beside it; the step body is rendered below it and
// fills the rest of the centre area. Step 1 shows the project step (F-09);
// steps 2 to 4 still show the F-08 placeholder body.

export interface WizardProps {
  step: StepNumber;
  values: WizardValues;
  onUpdate: (patch: Partial<WizardValues>) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function Wizard({ step, values, onUpdate, onPrev, onNext }: WizardProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minHeight: 0 }}>
      <WizardStepper step={step} onPrev={onPrev} onNext={onNext} />
      {step === 1 ? (
        <ProjectStep name={values.name} idea={values.idea} onChange={onUpdate} />
      ) : (
        <StepBody />
      )}
    </Box>
  );
}
