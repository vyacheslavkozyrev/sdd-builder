import { describe, expect, it } from 'vitest';
import {
  initialWizardState,
  wizardReducer,
  type WizardState,
} from '../src/wizard/state.js';

const sample = { name: 'Demo', idea: 'A small idea' };
const other = { name: 'Other' };
const empty = { name: '', idea: '' };

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
    expect(merged.values).toEqual({ name: 'Other', idea: 'A small idea' });
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
    expect(restarted.values).toEqual(empty);
    expect(restarted.values).not.toBe(onStep3.values);
  });

  it('F-08 AC-012 restart from step 1 gives a state equal to the initial state', () => {
    expect(wizardReducer(initialWizardState(), { type: 'restart' })).toEqual(initialWizardState());
  });

  it('F-08 AC-012 each initial state has its own values object', () => {
    expect(initialWizardState().values).not.toBe(initialWizardState().values);
  });
});

describe('F-09 wizard values for the project step', () => {
  it('F-09 AC-002 the initial name and idea are empty strings', () => {
    expect(initialWizardState().values).toEqual(empty);
  });

  it.each(['Demo', '  Demo  ', '   '])(
    'F-09 AC-002 the name %j is stored as typed and comes back unchanged after Next and Prev',
    (name) => {
      const typed = wizardReducer(initialWizardState(), { type: 'update', patch: { name } });
      expect(typed.values.name).toBe(name);
      expect(walk(typed, ['next', 'prev']).values.name).toBe(name);
    },
  );

  it.each(['  idea  ', 'idea ', '\n\tidea\n'])(
    'F-09 AC-010 the idea %j keeps its spaces and line breaks in the stored value',
    (idea) => {
      const typed = wizardReducer(initialWizardState(), { type: 'update', patch: { idea } });
      expect(typed.values.idea).toBe(idea);
      expect(walk(typed, ['next', 'next', 'next', 'prev']).values.idea).toBe(idea);
    },
  );

  it('F-09 AC-013 a name and an idea are still present after Next, Prev and Next again', () => {
    const start = wizardReducer(initialWizardState(), { type: 'update', patch: sample });
    const again = walk(start, ['next', 'prev', 'next']);
    expect(again.step).toBe(2);
    expect(again.values).toEqual(sample);
  });

  it('F-09 AC-013 a name and an idea are still present after going to step 4 and back to step 1', () => {
    const start = wizardReducer(initialWizardState(), { type: 'update', patch: sample });
    const back = walk(start, ['next', 'next', 'next', 'prev', 'prev', 'prev']);
    expect(back.step).toBe(1);
    expect(back.values).toEqual(sample);
  });

  it('F-09 AC-014 restart clears the name and the idea, with no value from the earlier project left', () => {
    const onStep2 = walk(wizardReducer(initialWizardState(), { type: 'update', patch: sample }), ['next']);
    const restarted = wizardReducer(onStep2, { type: 'restart' });
    expect(restarted.step).toBe(1);
    expect(restarted.values).toEqual(empty);
    expect(restarted.values.name).toBe('');
    expect(restarted.values.idea).toBe('');
  });
});
