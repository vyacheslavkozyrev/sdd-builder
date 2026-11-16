/** The four wizard steps, in order (F-05 AC-001). */
export type StepNumber = 1 | 2 | 3 | 4;

/** The wizard's step titles, shown by the stepper. */
export const STEP_TITLES: Record<StepNumber, string> = {
  1: 'Project name and idea',
  2: 'Technical details',
  3: 'Workflow',
  4: 'Analyze and generate',
};

const NEXT_STEP: Record<StepNumber, StepNumber> = { 1: 2, 2: 3, 3: 4, 4: 4 };
const PREVIOUS_STEP: Record<StepNumber, StepNumber> = { 1: 1, 2: 1, 3: 2, 4: 3 };

/**
 * The wizard in React memory: the current step and the values entered so far. Moving between steps
 * never changes `values` (F-05 AC-004), and no step checks them (F-05 AC-005).
 */
export interface WizardState<V> {
  readonly step: StepNumber;
  readonly values: V;
}

/** A new wizard, at step 1 with the given values. */
export function startWizard<V>(values: V): WizardState<V> {
  return { step: 1, values };
}

/** Moves forward one step. On step 4 the state is returned unchanged (F-05 AC-002). */
export function nextStep<V>(state: WizardState<V>): WizardState<V> {
  return { step: NEXT_STEP[state.step], values: state.values };
}

/** Moves back one step. On step 1 the state is returned unchanged (F-05 AC-002). */
export function backStep<V>(state: WizardState<V>): WizardState<V> {
  return { step: PREVIOUS_STEP[state.step], values: state.values };
}

/** Back is disabled on step 1 (F-05 AC-001). */
export function canGoBack<V>(state: WizardState<V>): boolean {
  return state.step > 1;
}

/** Next is hidden on step 4 (F-05 AC-002). */
export function canGoNext<V>(state: WizardState<V>): boolean {
  return state.step < 4;
}
