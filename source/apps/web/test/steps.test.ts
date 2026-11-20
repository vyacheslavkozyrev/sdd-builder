import { describe, expect, it } from 'vitest';
import {
  STEP_NUMBERS,
  isNextEnabled,
  isPrevEnabled,
  stepState,
  stepTitle,
  type StepNumber,
  type StepState,
} from '../src/wizard/steps.js';

describe('F-08 AC-001 stepper shows four steps in order with the approved titles', () => {
  it('F-08 AC-001 lists the four step numbers in order', () => {
    expect(STEP_NUMBERS).toEqual([1, 2, 3, 4]);
  });

  it('F-08 AC-001 gives the titles Project, Technical details, Workflow, Analyze and generate', () => {
    expect(STEP_NUMBERS.map((step) => stepTitle(step))).toEqual([
      'Project',
      'Technical details',
      'Workflow',
      'Analyze and generate',
    ]);
  });
});

describe('F-08 AC-002 step state follows the current step', () => {
  const table: ReadonlyArray<{ current: StepNumber; expected: readonly StepState[] }> = [
    { current: 1, expected: ['current', 'to-do', 'to-do', 'to-do'] },
    { current: 2, expected: ['done', 'current', 'to-do', 'to-do'] },
    { current: 3, expected: ['done', 'done', 'current', 'to-do'] },
    { current: 4, expected: ['done', 'done', 'done', 'current'] },
  ];

  for (const { current, expected } of table) {
    it(`F-08 AC-002 on step ${current} marks steps before it done, it current and later steps to do`, () => {
      const states = STEP_NUMBERS.map((step) => stepState(step, current));
      expect(states).toEqual(expected);
    });
  }
});

describe('F-08 AC-005 Prev is disabled on step 1 and enabled after it', () => {
  const table: ReadonlyArray<{ step: StepNumber; enabled: boolean }> = [
    { step: 1, enabled: false },
    { step: 2, enabled: true },
    { step: 3, enabled: true },
    { step: 4, enabled: true },
  ];

  for (const { step, enabled } of table) {
    it(`F-08 AC-005 Prev on step ${step} is ${enabled ? 'enabled' : 'disabled'}`, () => {
      expect(isPrevEnabled(step)).toBe(enabled);
    });
  }
});

describe('F-08 AC-007 Next is disabled on step 4 and cannot pass it', () => {
  it('F-08 AC-007 Next is disabled on step 4', () => {
    expect(isNextEnabled(4)).toBe(false);
  });

  it('F-08 AC-007 Next is enabled on steps 1, 2 and 3', () => {
    const steps: readonly StepNumber[] = [1, 2, 3];
    expect(steps.map((step) => isNextEnabled(step))).toEqual([true, true, true]);
  });
});

describe('F-08 AC-009 Next is never disabled by the content of the current step', () => {
  it('F-08 AC-009 Next is enabled on step 1 (the step model has no project name input to block it)', () => {
    expect(isNextEnabled(1)).toBe(true);
  });

  it('F-08 AC-009 the Next flag ignores any content passed beside the step number', () => {
    const withContent = isNextEnabled as unknown as (step: StepNumber, content: unknown) => boolean;
    expect(withContent(1, '')).toBe(true);
    expect(withContent(1, { projectName: '   ' })).toBe(true);
    expect(withContent(4, { projectName: 'Demo' })).toBe(false);
  });
});

describe('F-08 step model rejects values outside 1 to 4', () => {
  const invalid = [0, 5, 1.5, -1, Number.NaN];

  for (const value of invalid) {
    it(`F-08 step model throws a RangeError for step ${String(value)} in every function`, () => {
      const step = value as StepNumber;
      expect(() => stepTitle(step)).toThrow(RangeError);
      expect(() => stepState(step, 1)).toThrow(RangeError);
      expect(() => stepState(1, step)).toThrow(RangeError);
      expect(() => isPrevEnabled(step)).toThrow(RangeError);
      expect(() => isNextEnabled(step)).toThrow(RangeError);
    });
  }
});
