import { useReducer } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AppFrame } from './layout/AppFrame.js';
import type { RuleActions } from './wizard/RuleList.js';
import { StepBody } from './wizard/StepBody.js';
import { WizardNav } from './wizard/WizardNav.js';
import { WizardStepper } from './wizard/WizardStepper.js';
import { createInitialWizardState, wizardReducer } from './wizard/state.js';
import { theme } from './theme.js';

// The application root (F-07 AC-008). It renders the shared frame, so the left panel and the
// footer appear on the first screen. The wizard state (F-08, values added by F-09 and F-10) lives
// here: the stepper and the navigation go to the left panel, and the step body fills the centre
// area. The project values and the technical details (stack, architecture, rule blocks) are held in
// the reducer and passed to the body with the update handlers (F-09 AC-013, F-10 AC-022). New project
// dispatches restart, so the wizard returns to step 1 with no value kept (F-08 AC-012, F-09 AC-014,
// F-10 AC-023). Next is not tied to the values, so a blank value on any step never blocks it
// (F-09 AC-004 and AC-009, F-10 AC-002 and AC-005).
// CssBaseline removes the browser's default body margin, so the full-height frame fits the
// window without a scrollbar (F-07 AC-011).

export function App() {
  const [state, dispatch] = useReducer(wizardReducer, undefined, createInitialWizardState);
  const ruleActions: RuleActions = {
    onAdd: () => {
      dispatch({ type: 'add-rule' });
    },
    onRemove: (index) => {
      dispatch({ type: 'remove-rule', index });
    },
    onUpdate: (index, patch) => {
      dispatch({ type: 'update-rule', index, patch });
    },
  };
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppFrame
        onNewProject={() => {
          dispatch({ type: 'restart' });
        }}
        stepper={<WizardStepper current={state.step} />}
        navigation={
          <WizardNav
            step={state.step}
            onPrev={() => {
              dispatch({ type: 'prev' });
            }}
            onNext={() => {
              dispatch({ type: 'next' });
            }}
          />
        }
      >
        <StepBody
          step={state.step}
          values={state.values}
          onChange={(patch) => {
            dispatch({ type: 'setValues', patch });
          }}
          ruleActions={ruleActions}
          onPipelineChange={(pipeline) => {
            dispatch({ type: 'set-pipeline', pipeline });
          }}
        />
      </AppFrame>
    </ThemeProvider>
  );
}
