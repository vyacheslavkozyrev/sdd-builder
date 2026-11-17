import { Box, Button, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { canGoNext, canGoPrev, stepStatuses, type StepNumber } from './steps.js';

// The stepper row (F-08 AC-001, AC-002, AC-003, AC-004, AC-005, AC-007, AC-014).
// Prev sits on the left and Next on the right, with the four step titles
// between them. The titles are not controls: the stepper has no click handler.
// Next keeps its place on every step; on step 4 it is disabled, so the row
// does not move and the last step is visible as the end of the wizard.

export interface WizardStepperProps {
  step: StepNumber;
  onPrev: () => void;
  onNext: () => void;
}

// A round arrow drawn inline, so no icon library is added (architecture.md §5).
function ArrowIcon({ direction }: { direction: 'prev' | 'next' }) {
  const path = direction === 'prev' ? 'M12.5 5 L7.5 10 L12.5 15' : 'M7.5 5 L12.5 10 L7.5 15';
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NAV_COLUMN_WIDTH = 72;
const NAV_COLUMN_SX = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: NAV_COLUMN_WIDTH,
  flexShrink: 0,
} as const;
const NAV_BUTTON_SX = { minWidth: 0, width: 40, height: 40, p: 0, borderRadius: '50%' } as const;

export function WizardStepper({ step, onPrev, onNext }: WizardStepperProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
      <Box sx={NAV_COLUMN_SX}>
        <Button
          aria-label="Prev"
          variant="outlined"
          disabled={!canGoPrev(step)}
          onClick={() => onPrev()}
          sx={NAV_BUTTON_SX}
        >
          <ArrowIcon direction="prev" />
        </Button>
        <Typography variant="caption" component="span">
          Prev
        </Typography>
      </Box>

      <Stepper alternativeLabel activeStep={step - 1} sx={{ flex: 1 }}>
        {stepStatuses(step).map((status) => (
          <Step
            key={status.step}
            completed={status.state === 'done'}
            active={status.state === 'current'}
          >
            <StepLabel>{status.title}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={NAV_COLUMN_SX}>
        <Button
          aria-label="Next"
          variant="contained"
          disabled={!canGoNext(step)}
          onClick={() => onNext()}
          sx={NAV_BUTTON_SX}
        >
          <ArrowIcon direction="next" />
        </Button>
        <Typography variant="caption" component="span">
          Next
        </Typography>
      </Box>
    </Box>
  );
}
