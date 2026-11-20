// Wizard state reducer (F-08): the current step and the values held in memory.
// Pure: no React, no I/O. The values are kept in memory only and are cleared by restart.

import { isNextEnabled, isPrevEnabled, type StepNumber } from './steps.js';

// Empty for now; F-09 and F-10 extend it with the project and technical values.
export interface WizardValues {}

export interface WizardState {
  readonly step: StepNumber;
  readonly values: WizardValues;
}

export type WizardAction = { readonly type: 'next' } | { readonly type: 'prev' } | { readonly type: 'restart' };

const NEXT_STEP: Readonly<Record<StepNumber, StepNumber>> = { 1: 2, 2: 3, 3: 4, 4: 4 };
const PREV_STEP: Readonly<Record<StepNumber, StepNumber>> = { 1: 1, 2: 1, 3: 2, 4: 3 };

export function createInitialWizardState(): WizardState {
  return { step: 1, values: {} };
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'next':
      if (!isNextEnabled(state.step)) return state;
      return { step: NEXT_STEP[state.step], values: state.values };
    case 'prev':
      if (!isPrevEnabled(state.step)) return state;
      return { step: PREV_STEP[state.step], values: state.values };
    case 'restart':
      return createInitialWizardState();
    default: {
      const unexpected: unknown = action;
      throw new Error(`unknown wizard action: ${JSON.stringify(unexpected)}`);
    }
  }
}
