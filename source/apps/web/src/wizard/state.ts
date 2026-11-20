// Wizard state reducer (F-08, extended by F-09): the current step and the values held in memory.
// Pure: no React, no I/O. The values are kept in memory only and are cleared by restart.

import { isNextEnabled, isPrevEnabled, type StepNumber } from './steps.js';

// The project step's values (F-09). Stored as typed: the reducer never trims them.
// The idea is trimmed only when the configuration is built (project.ts ideaForConfig).
export interface WizardValues {
  readonly name: string;
  readonly idea: string;
}

// The fields the project step sends as the user types. A field that is left out keeps its value.
export interface ProjectValuesPatch {
  readonly name?: string;
  readonly idea?: string;
}

export interface WizardState {
  readonly step: StepNumber;
  readonly values: WizardValues;
}

export type WizardAction =
  | { readonly type: 'next' }
  | { readonly type: 'prev' }
  | { readonly type: 'restart' }
  | { readonly type: 'setValues'; readonly patch: ProjectValuesPatch };

const NEXT_STEP: Readonly<Record<StepNumber, StepNumber>> = { 1: 2, 2: 3, 3: 4, 4: 4 };
const PREV_STEP: Readonly<Record<StepNumber, StepNumber>> = { 1: 1, 2: 1, 3: 2, 4: 3 };

function emptyValues(): WizardValues {
  return { name: '', idea: '' };
}

export function createInitialWizardState(): WizardState {
  return { step: 1, values: emptyValues() };
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
    case 'setValues':
      return {
        step: state.step,
        values: {
          name: action.patch.name ?? state.values.name,
          idea: action.patch.idea ?? state.values.idea,
        },
      };
    default: {
      const unexpected: unknown = action;
      throw new Error(`unknown wizard action: ${JSON.stringify(unexpected)}`);
    }
  }
}
