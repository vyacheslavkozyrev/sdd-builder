import { describe, expect, it } from 'vitest';
import {
  initialWizardState,
  wizardReducer,
  type WizardState,
} from '../src/wizard/state.js';

const sample = { projectName: 'Demo' };
const other = { projectName: 'Other' };

function walk(state: WizardState, actions: readonly ('next' | 'prev')[]): WizardState {
  return actions.reduce<WizardState>((current, type) => wizardReducer(current, { type }), state);
}

function withSample(state: WizardState): WizardState {
  return wizardReducer(state, { type: 'update', patch: sample });
}

describe('F-08 wizard state', () => {
  it('F-08 AC-008 prev moves back exactly one step and keeps the values', () => {
    const onStep2 = walk(withSample(initialWizardState()), ['next']);
    expect(onStep2.step).toBe(2);
    const back = wizardReducer(onStep2, { type: 'prev' });
    expect(back.step).toBe(1);
    expect(back.values).toEqual(sample);
  });

  it('F-08 AC-008 prev on step 1 is a programmer error, not a silent move', () => {
    expect(() => wizardReducer(initialWizardState(), { type: 'prev' })).toThrow(RangeError);
  });

  it('F-08 AC-010 a value set before moving forward is present on every step and after prev and next again', () => {
    const start = withSample(initialWizardState());
    for (const actions of [['next'], ['next', 'next'], ['next', 'next', 'next']] as const) {
      expect(walk(start, actions).values).toEqual(sample);
    }
    const again = walk(start, ['next', 'prev', 'next']);
    expect(again.step).toBe(2);
    expect(again.values).toEqual(sample);
  });

  it('F-08 AC-010 update merges the given fields into the values and keeps the rest', () => {
    const once = withSample(initialWizardState());
    const merged = wizardReducer(once, { type: 'update', patch: other });
    expect(merged.values).toEqual(other);
    expect(merged.step).toBe(1);
    expect(once.values).toEqual(sample);
  });

  it('F-08 AC-012 restart from step 4 returns to step 1 at once', () => {
    const onStep4 = walk(withSample(initialWizardState()), ['next', 'next', 'next']);
    expect(onStep4.step).toBe(4);
    const restarted = wizardReducer(onStep4, { type: 'restart' });
    expect(restarted.step).toBe(1);
  });

  it('F-08 AC-012 restart clears every value to a new empty object, not the earlier one', () => {
    const onStep3 = walk(withSample(initialWizardState()), ['next', 'next']);
    const restarted = wizardReducer(onStep3, { type: 'restart' });
    expect(restarted.values).toEqual({});
    expect(restarted.values).not.toBe(onStep3.values);
  });

  it('F-08 AC-012 restart from step 1 gives a state equal to the initial state', () => {
    expect(wizardReducer(initialWizardState(), { type: 'restart' })).toEqual(initialWizardState());
  });

  it('F-08 AC-012 each initial state has its own values object', () => {
    expect(initialWizardState().values).not.toBe(initialWizardState().values);
  });
});
