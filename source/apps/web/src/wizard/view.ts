// Wizard frame view model: the stepper (done, current and todo steps) and the footer (Back and Next).
// Pure: no DOM, no storage, no network. The stepper has no click target: a step is never selected from it
// (F-05 AC-003), so an item carries no action. Next is hidden on step 4 (F-05 AC-002).
import { STEP_TITLES, canGoBack, canGoNext } from './state.js';
import type { StepNumber, WizardState } from './state.js';

/** A stepper item: a step before the current one is done, the current one is current, a later one is todo. */
export type StepStatus = 'done' | 'current' | 'todo';

/** One step in the stepper. It has no action: the stepper only shows progress. */
export interface StepperItem {
  readonly step: StepNumber;
  readonly title: string;
  readonly status: StepStatus;
}

/** The footer: Back is disabled on step 1 and Next is hidden on step 4. */
export interface FooterView {
  readonly backEnabled: boolean;
  readonly nextVisible: boolean;
}

/** What the wizard frame shows for a state. */
export interface WizardFrameView {
  readonly stepper: readonly StepperItem[];
  readonly footer: FooterView;
}

const STEPS: readonly StepNumber[] = [1, 2, 3, 4];

/** The stepper items in order, with each status set from the current step (F-05 AC-003). */
export function stepperView<V>(state: WizardState<V>): readonly StepperItem[] {
  return STEPS.map((step) => ({
    step,
    title: STEP_TITLES[step],
    status: statusOf(step, state.step),
  }));
}

/** The footer for a state (F-05 AC-002). */
export function footerView<V>(state: WizardState<V>): FooterView {
  return { backEnabled: canGoBack(state), nextVisible: canGoNext(state) };
}

/** The stepper and the footer together. */
export function wizardFrameView<V>(state: WizardState<V>): WizardFrameView {
  return { stepper: stepperView(state), footer: footerView(state) };
}

function statusOf(step: StepNumber, current: StepNumber): StepStatus {
  if (step < current) {
    return 'done';
  }
  if (step === current) {
    return 'current';
  }
  return 'todo';
}
