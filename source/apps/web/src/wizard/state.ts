// The wizard's state (F-08 AC-008, AC-010, AC-012; F-09 AC-002, AC-010 reducer,
// AC-013 reducer, AC-014 reducer; F-10 AC-007 to AC-010, AC-012, AC-020, AC-021
// reducer). A reducer over the step model in steps.ts. The values live in
// memory only: no saving and no logging (decision 13, AC-011). Refreshing the
// browser clears them.

import { nextStep, prevStep, FIRST_STEP, type StepNumber } from './steps.js';
import { canAddRule } from './technical.js';

// The five stack fields of the technical details step (F-10 AC-001 to AC-004).
// Free text, stored as typed. The names match the brief fields of decision 37.
export interface StackValues {
  language: string;
  framework: string;
  platform: string;
  buildTool: string;
  testFramework: string;
}

// One rule block: its name and its description, as typed (F-10 AC-013, AC-018).
export interface RuleBlock {
  name: string;
  description: string;
}

// The values entered across the four steps. The project step (F-09) holds the
// name and the idea as typed; the technical details step (F-10) holds the stack,
// the architecture text and the ordered list of rule blocks.
export interface WizardValues {
  name: string;
  idea: string;
  stack: StackValues;
  architecture: string;
  rules: RuleBlock[];
}

export interface WizardState {
  readonly step: StepNumber;
  readonly values: WizardValues;
}

export type WizardAction =
  | { readonly type: 'next' }
  | { readonly type: 'prev' }
  | { readonly type: 'restart' }
  | { readonly type: 'update'; readonly patch: Partial<WizardValues> }
  | { readonly type: 'add-rule' }
  | { readonly type: 'remove-rule'; readonly index: number }
  | { readonly type: 'update-rule'; readonly index: number; readonly patch: Partial<RuleBlock> };

// A fresh state: step 1 and the initial values. A new object every call, so
// no value from an earlier project can be shared.
export function initialWizardState(): WizardState {
  return {
    step: FIRST_STEP,
    values: {
      name: '',
      idea: '',
      stack: { language: '', framework: '', platform: '', buildTool: '', testFramework: '' },
      architecture: '',
      rules: [],
    },
  };
}

// Next and Prev move one step and keep the values. Restart returns to step 1
// with the initial values. Update merges the given fields into the values.
// Add rule appends one empty block, refused (state returned as it is) at the
// limit of 60 blocks. Remove rule and update rule act on the block at index;
// an index with no block is a programmer error and throws.
export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'next':
      return { step: nextStep(state.step), values: state.values };
    case 'prev':
      return { step: prevStep(state.step), values: state.values };
    case 'restart':
      return initialWizardState();
    case 'update':
      return withValues(state, action.patch);
    case 'add-rule': {
      const { rules } = state.values;
      if (!canAddRule(rules.length)) return state;
      return withValues(state, { rules: [...rules, { name: '', description: '' }] });
    }
    case 'remove-rule': {
      const { rules } = state.values;
      requireRule(rules, action.index);
      return withValues(state, { rules: rules.filter((_, i) => i !== action.index) });
    }
    case 'update-rule': {
      const { rules } = state.values;
      const current = requireRule(rules, action.index);
      const updated = { ...current, ...action.patch };
      return withValues(state, { rules: rules.map((rule, i) => (i === action.index ? updated : rule)) });
    }
  }
}

function withValues(state: WizardState, patch: Partial<WizardValues>): WizardState {
  return { step: state.step, values: { ...state.values, ...patch } };
}

function requireRule(rules: readonly RuleBlock[], index: number): RuleBlock {
  const rule = Number.isInteger(index) ? rules[index] : undefined;
  if (rule === undefined) throw new RangeError(`no rule block at index ${index}`);
  return rule;
}
