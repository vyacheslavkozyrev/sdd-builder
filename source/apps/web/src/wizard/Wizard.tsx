import { Box } from '@mui/material';
import { ProjectStep } from './ProjectStep.js';
import { RuleBlocks } from './RuleBlocks.js';
import { StepBody } from './StepBody.js';
import { TechnicalStep } from './TechnicalStep.js';
import { WizardStepper } from './WizardStepper.js';
import type { RuleBlock, WizardValues } from './state.js';
import type { StepNumber } from './steps.js';

// The wizard panel (F-08 AC-004, AC-015; F-09 AC-012; F-10 AC-019). The stepper row
// comes first, with Prev and Next beside it; the step body is rendered below it and
// fills the rest of the centre area. Step 1 shows the project step (F-09), step 2 the
// technical details card (F-10: the stack and architecture beside the rule blocks),
// and steps 3 and 4 still show the F-08 placeholder body.

export interface WizardProps {
  step: StepNumber;
  values: WizardValues;
  onUpdate: (patch: Partial<WizardValues>) => void;
  onAddRule: () => void;
  onRemoveRule: (index: number) => void;
  onUpdateRule: (index: number, patch: Partial<RuleBlock>) => void;
  onPrev: () => void;
  onNext: () => void;
}

// The step 2 card, drawn as one card split in two columns with a divider (the
// approved screens 01 to 06). The card belongs to the step, so the two columns carry
// no card of their own.
const CARD_SX = {
  position: 'relative',
  flexGrow: 1,
  minHeight: 0,
  display: 'flex',
  alignItems: 'flex-start',
  px: 6,
  pt: 6,
  pb: 3,
  bgcolor: '#ffffff',
  borderRadius: '16px',
  boxShadow: '0 6px 20px rgba(79, 70, 229, 0.12)',
  overflow: 'hidden',
} as const;

const ACCENT_SX = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: 6,
  background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
} as const;

const DIVIDER_SX = { width: '1px', alignSelf: 'stretch', bgcolor: '#e2e8f0', mx: 2.5, flexShrink: 0 } as const;

export function Wizard({
  step,
  values,
  onUpdate,
  onAddRule,
  onRemoveRule,
  onUpdateRule,
  onPrev,
  onNext,
}: WizardProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minHeight: 0 }}>
      <WizardStepper step={step} onPrev={onPrev} onNext={onNext} />
      {step === 1 ? (
        <ProjectStep name={values.name} idea={values.idea} onChange={onUpdate} />
      ) : step === 2 ? (
        <Box sx={CARD_SX}>
          <Box aria-hidden="true" sx={ACCENT_SX} />
          <TechnicalStep stack={values.stack} architecture={values.architecture} onChange={onUpdate} />
          <Box aria-hidden="true" sx={DIVIDER_SX} />
          <RuleBlocks rules={values.rules} onAdd={onAddRule} onRemove={onRemoveRule} onUpdate={onUpdateRule} />
        </Box>
      ) : (
        <StepBody />
      )}
    </Box>
  );
}
