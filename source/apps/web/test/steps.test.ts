import { describe, expect, it } from 'vitest';
import {
  canGoNext,
  canGoPrev,
  nextStep,
  prevStep,
  stepStatuses,
  STEP_TITLES,
  type StepNumber,
} from '../src/wizard/steps.js';

const steps: readonly StepNumber[] = [1, 2, 3, 4];

describe('F-08 step titles', () => {
  it('F-08 AC-001 shows four steps in order with the approved titles', () => {
    const titles = stepStatuses(1).map((status) => status.title);
    expect(titles).toEqual(['Project', 'Technical details', 'Workflow', 'Analyze and generate']);
    expect(stepStatuses(1).map((status) => status.step)).toEqual([1, 2, 3, 4]);
    expect(STEP_TITLES[4]).toBe('Analyze and generate');
  });
});

describe('F-08 step states', () => {
  const expected: Record<StepNumber, readonly string[]> = {
    1: ['current', 'todo', 'todo', 'todo'],
    2: ['done', 'current', 'todo', 'todo'],
    3: ['done', 'done', 'current', 'todo'],
    4: ['done', 'done', 'done', 'current'],
  };

  for (const current of steps) {
    it(`F-08 AC-002 on step ${current} marks earlier steps done, the current step current and later steps to do`, () => {
      expect(stepStatuses(current).map((status) => status.state)).toEqual(expected[current]);
    });
  }

  it('F-08 AC-002 exactly one step is current on every step', () => {
    for (const current of steps) {
      const currentCount = stepStatuses(current).filter((status) => status.state === 'current');
      expect(currentCount).toHaveLength(1);
    }
  });
});

describe('F-08 Prev rule', () => {
  const table: readonly [StepNumber, boolean][] = [
    [1, false],
    [2, true],
    [3, true],
    [4, true],
  ];

  for (const [step, enabled] of table) {
    it(`F-08 AC-005 Prev is ${enabled ? 'enabled' : 'disabled'} on step ${step}`, () => {
      expect(canGoPrev(step)).toBe(enabled);
    });
  }
});

describe('F-08 Next rule', () => {
  const table: readonly [StepNumber, StepNumber][] = [
    [1, 2],
    [2, 3],
    [3, 4],
  ];

  for (const [from, to] of table) {
    it(`F-08 AC-006 Next moves from step ${from} to step ${to}`, () => {
      expect(nextStep(from)).toBe(to);
    });
  }

  it('F-08 AC-007 Next is disabled on step 4 and does not move the wizard past step 4 (negative case: not enabled)', () => {
    expect(canGoNext(4)).toBe(false);
    expect(() => nextStep(4)).toThrow(RangeError);
  });

  it('F-08 AC-007 Next is enabled on steps 1, 2 and 3', () => {
    expect(canGoNext(1)).toBe(true);
    expect(canGoNext(2)).toBe(true);
    expect(canGoNext(3)).toBe(true);
  });

  it('F-08 AC-009 Next depends only on the step, never on the content of step 1 (blank name does not block it)', () => {
    // The step model takes no content input, so Next can only depend on the step.
    expect(canGoNext(1)).toBe(true);
    expect(nextStep(1)).toBe(2);
  });
});

describe('F-08 Prev moves back', () => {
  it('F-08 AC-008 Prev on step 2 goes to step 1 (one step back)', () => {
    expect(prevStep(2)).toBe(1);
  });

  it('F-08 AC-008 Prev moves back exactly one step from steps 2, 3 and 4', () => {
    expect(prevStep(3)).toBe(2);
    expect(prevStep(4)).toBe(3);
  });

  it('F-08 AC-005 Prev on step 1 is a programmer error (negative case)', () => {
    expect(() => prevStep(1)).toThrow(RangeError);
  });
});
