// The wizard's state (F-08 AC-008, AC-010, AC-012). A reducer over the step
// model in steps.ts. The values live in memory only: no saving and no
// logging (decision 13, AC-011). Refreshing the browser clears them.

import { nextStep, prevStep, FIRST_STEP, type StepNumber } from './steps.js';

// The values entered across the four steps. F-08 has no fields yet; F-09 and
// F-10 extend this interface with their fields.
export interface WizardValues {}

export interface WizardState {
  readonly step: StepNumber;
  readonly values: WizardValues;
}

export type WizardAction =
  | { readonly type: 'next' }
  | { readonly type: 'prev' }
  | { readonly type: 'restart' }
  | { readonly type: 'update'; readonly patch: Partial<WizardValues> };

// A fresh state: step 1 and the initial values. A new object every call, so
// no value from an earlier project can be shared.
export function initialWizardState(): WizardState {
  return { step: FIRST_STEP, values: {} };
}

// Next and Prev move one step and keep the values. Restart returns to step 1
// with the initial values. Update merges the given fields into the values.
export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'next':
      return { step: nextStep(state.step), values: state.values };
    case 'prev':
      return { step: prevStep(state.step), values: state.values };
    case 'restart':
      return initialWizardState();
    case 'update':
      return { step: state.step, values: { ...state.values, ...action.patch } };
  }
}
