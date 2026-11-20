import { describe, expect, it } from 'vitest';
import {
  createInitialWizardState,
  wizardReducer,
  type WizardAction,
  type WizardState,
  type WizardValues,
} from '../src/wizard/state.js';
import { isNextEnabled, isPrevEnabled, type StepNumber } from '../src/wizard/steps.js';

// A values object with one entry, to prove the reducer carries values through.
// The real values type is empty until F-09 and F-10 extend it, so the marker is
// added here as a test-only extension rather than relying on the empty type.
type ValuesWithMarker = WizardValues & { readonly marker: string };

function markedValues(): ValuesWithMarker {
  return { marker: 'kept' };
}

function stateWithValue(step: StepNumber): WizardState {
  return { step, values: markedValues() };
}

describe('F-08 AC-006 Next moves forward by exactly one step', () => {
  const table: ReadonlyArray<{ from: StepNumber; to: StepNumber }> = [
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
  ];

  for (const { from, to } of table) {
    it(`F-08 AC-006 Next from step ${from} goes to step ${to}`, () => {
      const start: WizardState = { step: from, values: {} };
      expect(wizardReducer(start, { type: 'next' }).step).toBe(to);
    });
  }
});

describe('F-08 AC-007 Next does not move past step 4', () => {
  it('F-08 AC-007 Next is disabled on step 4', () => {
    expect(isNextEnabled(4)).toBe(false);
  });

  it('F-08 AC-007 Next on step 4 returns the same state and stays on step 4', () => {
    const start: WizardState = { step: 4, values: {} };
    const after = wizardReducer(start, { type: 'next' });
    expect(after).toBe(start);
    expect(after.step).toBe(4);
  });
});

describe('F-08 AC-008 Prev moves back by exactly one step and keeps the values', () => {
  const table: ReadonlyArray<{ from: StepNumber; to: StepNumber }> = [
    { from: 4, to: 3 },
    { from: 3, to: 2 },
    { from: 2, to: 1 },
  ];

  for (const { from, to } of table) {
    it(`F-08 AC-008 Prev from step ${from} goes to step ${to}`, () => {
      const start = stateWithValue(from);
      const after = wizardReducer(start, { type: 'prev' });
      expect(after.step).toBe(to);
      expect(after.values).toBe(start.values);
    });
  }

  it('F-08 AC-008 Prev on step 2 goes to step 1 and does not clear the values', () => {
    const after = wizardReducer(stateWithValue(2), { type: 'prev' });
    expect(after).toEqual({ step: 1, values: { marker: 'kept' } });
  });

  it('F-08 AC-008 Prev on step 1 stays on step 1 (negative case)', () => {
    expect(isPrevEnabled(1)).toBe(false);
    const start: WizardState = { step: 1, values: {} };
    expect(wizardReducer(start, { type: 'prev' })).toBe(start);
  });
});

describe('F-08 AC-010 values set before moving stay in memory through all four steps', () => {
  it('F-08 AC-010 a value set on step 1 is still there after Next, Prev and Next again to step 4', () => {
    const values = markedValues();
    const actions: readonly WizardAction[] = [
      { type: 'next' },
      { type: 'next' },
      { type: 'prev' },
      { type: 'next' },
      { type: 'next' },
    ];

    let state: WizardState = { step: 1, values };
    const visited: StepNumber[] = [state.step];
    for (const action of actions) {
      state = wizardReducer(state, action);
      visited.push(state.step);
      expect(state.values).toBe(values);
      expect(state.values).toEqual({ marker: 'kept' });
    }

    expect(visited).toEqual([1, 2, 3, 2, 3, 4]);
  });
});

describe('F-08 AC-012 restart returns to step 1 and clears the values', () => {
  const steps: readonly StepNumber[] = [1, 2, 3, 4];

  for (const step of steps) {
    it(`F-08 AC-012 restart from step ${step} returns to step 1`, () => {
      const after = wizardReducer(stateWithValue(step), { type: 'restart' });
      expect(after.step).toBe(1);
    });

    it(`F-08 AC-012 restart from step ${step} leaves no value from the earlier project`, () => {
      const after = wizardReducer(stateWithValue(step), { type: 'restart' });
      expect(after.values).toEqual({});
      expect(Object.keys(after.values)).toEqual([]);
    });
  }

  it('F-08 AC-012 after restart Prev is disabled and Next is shown (negative case: no stale step 4)', () => {
    const after = wizardReducer(stateWithValue(4), { type: 'restart' });
    expect(isPrevEnabled(after.step)).toBe(false);
    expect(isNextEnabled(after.step)).toBe(true);
  });

  it('F-08 AC-012 restart gives a fresh values object, not the one from the earlier project', () => {
    const start = stateWithValue(3);
    const after = wizardReducer(start, { type: 'restart' });
    expect(after.values).not.toBe(start.values);
  });
});

describe('F-08 AC-006 initial state is step 1 with empty values', () => {
  it('F-08 AC-006 createInitialWizardState starts on step 1 with no values', () => {
    expect(createInitialWizardState()).toEqual({ step: 1, values: {} });
  });

  it('F-08 AC-006 createInitialWizardState returns a new object each time', () => {
    expect(createInitialWizardState()).not.toBe(createInitialWizardState());
  });
});

describe('F-08 AC-006 reducer does not change the state it is given', () => {
  it('F-08 AC-006 Next returns a new state and leaves the input state unchanged', () => {
    const start: WizardState = { step: 1, values: {} };
    const after = wizardReducer(start, { type: 'next' });
    expect(after).not.toBe(start);
    expect(start).toEqual({ step: 1, values: {} });
  });
});

describe('F-08 AC-006 an unknown action is a programmer error', () => {
  const unknownActions: readonly unknown[] = [{ type: 'jump' }, { type: '' }, {}];

  for (const action of unknownActions) {
    it(`F-08 AC-006 an unknown action ${JSON.stringify(action)} throws`, () => {
      const start: WizardState = { step: 2, values: {} };
      expect(() => wizardReducer(start, action as WizardAction)).toThrow(/unknown wizard action/);
    });
  }
});
