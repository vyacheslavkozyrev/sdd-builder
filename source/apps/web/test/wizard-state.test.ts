import { describe, expect, it } from 'vitest';
import {
  STEP_TITLES,
  backStep,
  canGoBack,
  canGoNext,
  nextStep,
  startWizard,
} from '../src/wizard/state.js';
import type { WizardState } from '../src/wizard/state.js';

interface FakeValues {
  name: string;
  idea: string;
}

const filled: FakeValues = { name: 'Demo', idea: 'A small tool' };
const blank: FakeValues = { name: '', idea: '' };

describe('F-05 AC-001 the wizard has four steps in order, starting at step 1 with Back disabled', () => {
  it('F-05 AC-001 lists the four step titles in order', () => {
    expect([STEP_TITLES[1], STEP_TITLES[2], STEP_TITLES[3], STEP_TITLES[4]]).toEqual([
      'Project name and idea',
      'Technical details',
      'Workflow',
      'Analyze and generate',
    ]);
  });

  it('F-05 AC-001 a new wizard starts at step 1', () => {
    expect(startWizard(filled).step).toBe(1);
  });

  it('F-05 AC-001 Back is disabled on a new wizard', () => {
    expect(canGoBack(startWizard(filled))).toBe(false);
  });
});

describe('F-05 AC-002 Next and Back move one step', () => {
  it('F-05 AC-002 Next moves forward one step at a time, from 1 to 4', () => {
    let state = startWizard(filled);
    const seen: number[] = [state.step];
    for (let i = 0; i < 3; i += 1) {
      state = nextStep(state);
      seen.push(state.step);
    }
    expect(seen).toEqual([1, 2, 3, 4]);
  });

  it('F-05 AC-002 Back moves back one step at a time, from 4 to 1', () => {
    let state: WizardState<FakeValues> = { step: 4, values: filled };
    const seen: number[] = [state.step];
    for (let i = 0; i < 3; i += 1) {
      state = backStep(state);
      seen.push(state.step);
    }
    expect(seen).toEqual([4, 3, 2, 1]);
  });

  it('F-05 AC-002 Back on step 1 changes nothing', () => {
    const state = startWizard(filled);
    expect(backStep(state)).toEqual(state);
  });

  it('F-05 AC-002 Next on step 4 changes nothing and is not offered', () => {
    const state = { step: 4 as const, values: filled };
    expect(nextStep(state)).toEqual(state);
    expect(canGoNext(state)).toBe(false);
  });

  it('F-05 AC-002 Next is offered on steps 1 to 3', () => {
    for (const step of [1, 2, 3] as const) {
      expect(canGoNext({ step, values: filled })).toBe(true);
    }
  });

  it('F-05 AC-002 Back is offered on steps 2 to 4', () => {
    for (const step of [2, 3, 4] as const) {
      expect(canGoBack({ step, values: filled })).toBe(true);
    }
  });
});

describe('F-05 AC-004 moving between steps keeps the values as entered', () => {
  it('F-05 AC-004 values are the same object after Next and Back', () => {
    const start = startWizard(filled);
    const moved = backStep(nextStep(nextStep(nextStep(start))));
    expect(moved.values).toBe(filled);
    expect(moved.values).toEqual({ name: 'Demo', idea: 'A small tool' });
  });

  it('F-05 AC-004 values are kept across every step when moving forward', () => {
    let state = startWizard(filled);
    for (let i = 0; i < 3; i += 1) {
      state = nextStep(state);
      expect(state.values).toBe(filled);
    }
  });
});

describe('F-05 AC-005 Next is never blocked by an empty field', () => {
  it('F-05 AC-005 Next moves past step 1 when every value is blank', () => {
    const state = nextStep(startWizard(blank));
    expect(state.step).toBe(2);
    expect(state.values).toEqual({ name: '', idea: '' });
  });

  it('F-05 AC-005 Next moves past step 3 when the values are blank', () => {
    const state = nextStep({ step: 3 as const, values: blank });
    expect(state.step).toBe(4);
  });
});
