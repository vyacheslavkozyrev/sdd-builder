// Wizard state reducer (F-08, extended by F-09 and F-10): the current step and the values held in memory.
// Pure: no React, no I/O. The values are kept in memory only and are cleared by restart.

import { isNextEnabled, isPrevEnabled, type StepNumber } from './steps.js';
import { canAddRule } from './technical.js';

// The five stack fields of step 2 (F-10). Stored as typed, like the project values.
export interface StackValues {
  readonly language: string;
  readonly framework: string;
  readonly platform: string;
  readonly buildTool: string;
  readonly testFramework: string;
}

// The values of the wizard. The name and the idea are the project step's (F-09) and are stored as
// typed: the reducer never trims them. The idea is trimmed only when the configuration is built
// (project.ts ideaForConfig).
export interface WizardValues {
  readonly name: string;
  readonly idea: string;
  readonly stack: StackValues;
  readonly architecture: string;
  readonly rules: readonly RuleValues[];
}

// One rule block of step 2 (F-10): the name becomes `rules[].title` and the description `rules[].text`.
export interface RuleValues {
  readonly name: string;
  readonly description: string;
}

// The fields the project step sends as the user types. A field that is left out keeps its value.
export interface ProjectValuesPatch {
  readonly name?: string;
  readonly idea?: string;
  readonly stack?: Partial<StackValues>;
  readonly architecture?: string;
}

// The fields of one rule block as the user types them. A field that is left out keeps its value.
export interface RulePatch {
  readonly name?: string;
  readonly description?: string;
}

export interface WizardState {
  readonly step: StepNumber;
  readonly values: WizardValues;
}

export type WizardAction =
  | { readonly type: 'next' }
  | { readonly type: 'prev' }
  | { readonly type: 'restart' }
  | { readonly type: 'setValues'; readonly patch: ProjectValuesPatch }
  | { readonly type: 'add-rule' }
  | { readonly type: 'remove-rule'; readonly index: number }
  | { readonly type: 'update-rule'; readonly index: number; readonly patch: RulePatch };

const NEXT_STEP: Readonly<Record<StepNumber, StepNumber>> = { 1: 2, 2: 3, 3: 4, 4: 4 };
const PREV_STEP: Readonly<Record<StepNumber, StepNumber>> = { 1: 1, 2: 1, 3: 2, 4: 3 };

function emptyStack(): StackValues {
  return { language: '', framework: '', platform: '', buildTool: '', testFramework: '' };
}

function emptyValues(): WizardValues {
  return { name: '', idea: '', stack: emptyStack(), architecture: '', rules: [] };
}

export function createInitialWizardState(): WizardState {
  return { step: 1, values: emptyValues() };
}

// The rule at `index`, or a programmer error when the index is not a block of the list.
function ruleAt(rules: readonly RuleValues[], index: number): RuleValues {
  const rule = Number.isInteger(index) ? rules[index] : undefined;
  if (rule === undefined) throw new Error(`no rule block at index ${index}`);
  return rule;
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
          stack: { ...state.values.stack, ...action.patch.stack },
          architecture: action.patch.architecture ?? state.values.architecture,
          rules: state.values.rules,
        },
      };
    case 'add-rule':
      if (!canAddRule(state.values.rules.length)) return state;
      return {
        step: state.step,
        values: { ...state.values, rules: [...state.values.rules, { name: '', description: '' }] },
      };
    case 'remove-rule':
      ruleAt(state.values.rules, action.index);
      return {
        step: state.step,
        values: {
          ...state.values,
          rules: state.values.rules.filter((_, position) => position !== action.index),
        },
      };
    case 'update-rule': {
      const current = ruleAt(state.values.rules, action.index);
      const updated: RuleValues = {
        name: action.patch.name ?? current.name,
        description: action.patch.description ?? current.description,
      };
      return {
        step: state.step,
        values: {
          ...state.values,
          rules: state.values.rules.map((rule, position) => (position === action.index ? updated : rule)),
        },
      };
    }
    default: {
      const unexpected: unknown = action;
      throw new Error(`unknown wizard action: ${JSON.stringify(unexpected)}`);
    }
  }
}
