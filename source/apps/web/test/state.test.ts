import { describe, expect, it } from 'vitest';
import {
  createInitialWizardState,
  wizardReducer,
  type WizardAction,
  type WizardState,
  type WizardValues,
} from '../src/wizard/state.js';
import { isNextEnabled, isPrevEnabled, type StepNumber } from '../src/wizard/steps.js';

// A values object with a name and an idea, to prove the reducer carries values through.
function filledValues(): WizardValues {
  return { name: 'Demo', idea: 'kept idea' };
}

function stateWithValue(step: StepNumber): WizardState {
  return { step, values: filledValues() };
}

function emptyState(step: StepNumber): WizardState {
  return { step, values: { name: '', idea: '' } };
}

describe('F-08 AC-006 Next moves forward by exactly one step', () => {
  const table: ReadonlyArray<{ from: StepNumber; to: StepNumber }> = [
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
  ];

  for (const { from, to } of table) {
    it(`F-08 AC-006 Next from step ${from} goes to step ${to}`, () => {
      const start = emptyState(from);
      expect(wizardReducer(start, { type: 'next' }).step).toBe(to);
    });
  }
});

describe('F-08 AC-007 Next does not move past step 4', () => {
  it('F-08 AC-007 Next is disabled on step 4', () => {
    expect(isNextEnabled(4)).toBe(false);
  });

  it('F-08 AC-007 Next on step 4 returns the same state and stays on step 4', () => {
    const start = emptyState(4);
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
    expect(after).toEqual({ step: 1, values: { name: 'Demo', idea: 'kept idea' } });
  });

  it('F-08 AC-008 Prev on step 1 stays on step 1 (negative case)', () => {
    expect(isPrevEnabled(1)).toBe(false);
    const start = emptyState(1);
    expect(wizardReducer(start, { type: 'prev' })).toBe(start);
  });
});

describe('F-08 AC-010 values set before moving stay in memory through all four steps', () => {
  it('F-08 AC-010 a value set on step 1 is still there after Next, Prev and Next again to step 4', () => {
    const values = filledValues();
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
      expect(state.values).toEqual({ name: 'Demo', idea: 'kept idea' });
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
      expect(after.values).toEqual({ name: '', idea: '' });
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
    expect(createInitialWizardState()).toEqual({ step: 1, values: { name: '', idea: '' } });
  });

  it('F-08 AC-006 createInitialWizardState returns a new object each time', () => {
    expect(createInitialWizardState()).not.toBe(createInitialWizardState());
  });
});

describe('F-08 AC-006 reducer does not change the state it is given', () => {
  it('F-08 AC-006 Next returns a new state and leaves the input state unchanged', () => {
    const start = emptyState(1);
    const after = wizardReducer(start, { type: 'next' });
    expect(after).not.toBe(start);
    expect(start).toEqual({ step: 1, values: { name: '', idea: '' } });
  });
});

describe('F-08 AC-006 an unknown action is a programmer error', () => {
  const unknownActions: readonly unknown[] = [{ type: 'jump' }, { type: '' }, {}];

  for (const action of unknownActions) {
    it(`F-08 AC-006 an unknown action ${JSON.stringify(action)} throws`, () => {
      const start = emptyState(2);
      expect(() => wizardReducer(start, action as WizardAction)).toThrow(/unknown wizard action/);
    });
  }
});

describe('F-09 AC-002 the name is stored as typed', () => {
  const table: readonly string[] = ['Demo', '  Demo  ', '   '];

  for (const name of table) {
    it(`F-09 AC-002 the name ${JSON.stringify(name)} comes back unchanged`, () => {
      const after = wizardReducer(emptyState(1), { type: 'setValues', patch: { name } });
      expect(after.values.name).toBe(name);
    });
  }
});

describe('F-09 AC-010 the idea is stored as typed, spaces kept', () => {
  it('F-09 AC-010 a trailing space in the idea is kept in the stored value', () => {
    const after = wizardReducer(emptyState(1), { type: 'setValues', patch: { idea: 'a b ' } });
    expect(after.values.idea).toBe('a b ');
  });

  it('F-09 AC-010 leading and trailing spaces survive Next and Prev (no trim on navigation)', () => {
    const typed = wizardReducer(emptyState(1), { type: 'setValues', patch: { idea: '  idea  ' } });
    const moved = wizardReducer(wizardReducer(typed, { type: 'next' }), { type: 'prev' });
    expect(moved.values.idea).toBe('  idea  ');
  });
});

describe('F-09 AC-002 AC-010 setValues merges one or both fields and leaves the other as it was', () => {
  it('F-09 AC-002 a patch with only the name keeps the idea', () => {
    const start = stateWithValue(1);
    const after = wizardReducer(start, { type: 'setValues', patch: { name: 'New' } });
    expect(after.values).toEqual({ name: 'New', idea: 'kept idea' });
  });

  it('F-09 AC-010 a patch with only the idea keeps the name', () => {
    const start = stateWithValue(1);
    const after = wizardReducer(start, { type: 'setValues', patch: { idea: 'New idea ' } });
    expect(after.values).toEqual({ name: 'Demo', idea: 'New idea ' });
  });

  it('F-09 AC-002 an empty patch keeps both fields (edge case)', () => {
    const start = stateWithValue(1);
    const after = wizardReducer(start, { type: 'setValues', patch: {} });
    expect(after.values).toEqual({ name: 'Demo', idea: 'kept idea' });
  });

  it('F-09 AC-002 a patch with both fields sets both', () => {
    const after = wizardReducer(stateWithValue(1), {
      type: 'setValues',
      patch: { name: ' N ', idea: ' I ' },
    });
    expect(after.values).toEqual({ name: ' N ', idea: ' I ' });
  });

  it('F-09 AC-002 setValues keeps the step and does not change the input state', () => {
    const start = stateWithValue(1);
    const after = wizardReducer(start, { type: 'setValues', patch: { name: 'X' } });
    expect(after.step).toBe(1);
    expect(start.values).toEqual({ name: 'Demo', idea: 'kept idea' });
  });
});

describe('F-09 AC-013 name and idea survive Next, Prev and Next, and a visit to step 4', () => {
  it('F-09 AC-013 values set on step 1 are present after Next, Prev, Next and a walk to step 4 and back', () => {
    let state = wizardReducer(emptyState(1), {
      type: 'setValues',
      patch: { name: '  Demo ', idea: 'Idea line\n' },
    });
    const actions: readonly WizardAction[] = [
      { type: 'next' },
      { type: 'prev' },
      { type: 'next' },
      { type: 'next' },
      { type: 'next' },
      { type: 'prev' },
      { type: 'prev' },
      { type: 'prev' },
    ];
    for (const action of actions) {
      state = wizardReducer(state, action);
      expect(state.values).toEqual({ name: '  Demo ', idea: 'Idea line\n' });
    }
    expect(state.step).toBe(1);
  });
});

describe('F-09 AC-014 restart clears the name and the idea', () => {
  for (const step of [1, 2, 3, 4] as const) {
    it(`F-09 AC-014 restart from step ${step} leaves the name and the idea empty`, () => {
      const after = wizardReducer(stateWithValue(step), { type: 'restart' });
      expect(after.values.name).toBe('');
      expect(after.values.idea).toBe('');
    });
  }

  it('F-09 AC-014 after restart no value from the earlier project remains (negative case)', () => {
    const typed = wizardReducer(emptyState(1), {
      type: 'setValues',
      patch: { name: 'Old', idea: 'Old idea' },
    });
    const after = wizardReducer(typed, { type: 'restart' });
    expect(after.values).not.toEqual({ name: 'Old', idea: 'Old idea' });
    expect(after.values).toEqual({ name: '', idea: '' });
  });
});
