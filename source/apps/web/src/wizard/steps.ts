// The wizard's step model (F-08 AC-001, AC-002, AC-005, AC-006, AC-007, AC-009).
// Pure functions: no React and no I/O of any kind. The stepper and the
// navigation buttons read these results.

export type StepNumber = 1 | 2 | 3 | 4;

export type StepState = 'done' | 'current' | 'todo';

export const FIRST_STEP: StepNumber = 1;
export const LAST_STEP: StepNumber = 4;

export const STEP_TITLES: Readonly<Record<StepNumber, string>> = {
  1: 'Project',
  2: 'Technical details',
  3: 'Workflow',
  4: 'Analyze and generate',
};

export interface StepStatus {
  readonly step: StepNumber;
  readonly title: string;
  readonly state: StepState;
}

const STEP_NUMBERS: readonly StepNumber[] = [1, 2, 3, 4];

function stateOf(step: StepNumber, current: StepNumber): StepState {
  if (step < current) return 'done';
  if (step === current) return 'current';
  return 'todo';
}

// The state of every step for the current step: steps before it are done,
// the current step is current, steps after it are to do.
export function stepStatuses(current: StepNumber): readonly StepStatus[] {
  return STEP_NUMBERS.map((step) => ({
    step,
    title: STEP_TITLES[step],
    state: stateOf(step, current),
  }));
}

// Prev is disabled on step 1 and enabled on every later step.
export function canGoPrev(current: StepNumber): boolean {
  return current > FIRST_STEP;
}

// Next is disabled on step 4 and enabled on every earlier step. It is never
// blocked by the content of a step.
export function canGoNext(current: StepNumber): boolean {
  return current < LAST_STEP;
}

// Moves exactly one step. Calling it on the last step is a programmer error,
// because the Next control is disabled there.
export function nextStep(current: StepNumber): StepNumber {
  if (!canGoNext(current)) {
    throw new RangeError(`There is no step after step ${current}`);
  }
  return (current + 1) as StepNumber;
}

// Moves exactly one step back. Calling it on the first step is a programmer
// error, because the Prev control is disabled there.
export function prevStep(current: StepNumber): StepNumber {
  if (!canGoPrev(current)) {
    throw new RangeError(`There is no step before step ${current}`);
  }
  return (current - 1) as StepNumber;
}
