// Step model of the wizard (F-08): titles, the state of each step and the
// Prev and Next flags. Pure functions of the step number; no React, no storage.

export type StepNumber = 1 | 2 | 3 | 4;

export type StepState = 'done' | 'current' | 'to-do';

export const STEP_NUMBERS: readonly StepNumber[] = [1, 2, 3, 4];

export const STEP_TITLES: Readonly<Record<StepNumber, string>> = {
  1: 'Project',
  2: 'Technical details',
  3: 'Workflow',
  4: 'Analyze and generate',
};

const FIRST_STEP: StepNumber = 1;
const LAST_STEP: StepNumber = 4;

function assertStep(step: number): asserts step is StepNumber {
  if (!STEP_NUMBERS.some((known) => known === step)) {
    throw new RangeError(`wizard step must be 1 to 4, got ${String(step)}`);
  }
}

export function stepTitle(step: StepNumber): string {
  assertStep(step);
  return STEP_TITLES[step];
}

export function stepState(step: StepNumber, current: StepNumber): StepState {
  assertStep(step);
  assertStep(current);
  if (step < current) return 'done';
  if (step === current) return 'current';
  return 'to-do';
}

export function isPrevEnabled(step: StepNumber): boolean {
  assertStep(step);
  return step > FIRST_STEP;
}

export function isNextEnabled(step: StepNumber): boolean {
  assertStep(step);
  return step < LAST_STEP;
}
