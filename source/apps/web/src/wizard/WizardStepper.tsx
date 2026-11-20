import type { StepIconProps } from '@mui/material';
import { Box, Step, StepConnector, StepLabel, Stepper, useTheme } from '@mui/material';
import { STEP_NUMBERS, stepState, stepTitle } from './steps.js';
import type { StepNumber, StepState } from './steps.js';
import { getWizardStepperStyles } from './wizardStyles.js';

// The vertical stepper of the wizard (F-08 AC-001, AC-002, AC-003, AC-014). It names the four
// steps and shows the state of each from the current step. It is not clickable: the titles are
// plain text with no press handler. The state is passed to each Step, and the step node reads
// it through the Material UI step context.

export interface WizardStepperProps {
  readonly current: StepNumber;
}

const STATE_WORDS: Readonly<Record<StepState, string>> = {
  done: 'done',
  current: 'current step',
  'to-do': 'to do',
};

// The node of one step: a number in an outlined circle (to do), a violet number with a soft
// ring (current), or a green circle with a white check mark (done). The check mark is an
// inline SVG path, not a glyph. The node names its step and state (screens.md, usability U-03):
// "Project: done" as its accessible name and hover text. Material UI numbers the steps from 1,
// so the icon is the step number.
function StepNode({ active, completed, icon }: StepIconProps) {
  const styles = getWizardStepperStyles(useTheme());
  const state: StepState = completed ? 'done' : active ? 'current' : 'to-do';
  const name = `${stepTitle(Number(icon) as StepNumber)}: ${STATE_WORDS[state]}`;
  return (
    <Box component="span" data-state={state} role="img" aria-label={name} title={name} sx={styles.node[state]}>
      {state === 'done' ? (
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M2.5 6.5l2.25 2.25L9.5 3.75" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        icon
      )}
    </Box>
  );
}

export function WizardStepper({ current }: WizardStepperProps) {
  const styles = getWizardStepperStyles(useTheme());
  return (
    <Stepper orientation="vertical" connector={<StepConnector sx={styles.connector} />} sx={styles.root}>
      {STEP_NUMBERS.map((step) => {
        const state = stepState(step, current);
        return (
          <Step key={step} active={state === 'current'} completed={state === 'done'}>
            <StepLabel slots={{ stepIcon: StepNode }} slotProps={{ label: { sx: styles.label[state] } }}>
              {stepTitle(step)}
            </StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );
}
