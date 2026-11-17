import { describe, expect, it } from 'vitest';
import {
  initialWizardState,
  wizardReducer,
  type WizardState,
  type WizardValues,
} from '../src/wizard/state.js';

const emptyStack = { language: '', framework: '', platform: '', buildTool: '', testFramework: '' };
const empty: WizardValues = {
  name: '',
  idea: '',
  stack: emptyStack,
  architecture: '',
  rules: [],
};

const sample = { name: 'Demo', idea: 'A small idea' };
const other = { name: 'Other' };

// The values of the project step with the step 2 values left empty.
function withProject(project: { name: string; idea: string }): WizardValues {
  return { ...empty, ...project };
}

function walk(state: WizardState, actions: readonly ('next' | 'prev')[]): WizardState {
  return actions.reduce<WizardState>((current, type) => wizardReducer(current, { type }), state);
}

function withSample(state: WizardState): WizardState {
  return wizardReducer(state, { type: 'update', patch: sample });
}

function withRules(count: number): WizardState {
  let state = initialWizardState();
  for (let i = 0; i < count; i += 1) state = wizardReducer(state, { type: 'add-rule' });
  return state;
}

describe('F-08 wizard state', () => {
  it('F-08 AC-008 prev moves back exactly one step and keeps the values', () => {
    const onStep2 = walk(withSample(initialWizardState()), ['next']);
    expect(onStep2.step).toBe(2);
    const back = wizardReducer(onStep2, { type: 'prev' });
    expect(back.step).toBe(1);
    expect(back.values).toEqual(withProject(sample));
  });

  it('F-08 AC-008 prev on step 1 is a programmer error, not a silent move', () => {
    expect(() => wizardReducer(initialWizardState(), { type: 'prev' })).toThrow(RangeError);
  });

  it('F-08 AC-010 a value set before moving forward is present on every step and after prev and next again', () => {
    const start = withSample(initialWizardState());
    for (const actions of [['next'], ['next', 'next'], ['next', 'next', 'next']] as const) {
      expect(walk(start, actions).values).toEqual(withProject(sample));
    }
    const again = walk(start, ['next', 'prev', 'next']);
    expect(again.step).toBe(2);
    expect(again.values).toEqual(withProject(sample));
  });

  it('F-08 AC-010 update merges the given fields into the values and keeps the rest', () => {
    const once = withSample(initialWizardState());
    const merged = wizardReducer(once, { type: 'update', patch: other });
    expect(merged.values).toEqual(withProject({ name: 'Other', idea: 'A small idea' }));
    expect(merged.step).toBe(1);
    expect(once.values).toEqual(withProject(sample));
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
    expect(again.values).toEqual(withProject(sample));
  });

  it('F-09 AC-013 a name and an idea are still present after going to step 4 and back to step 1', () => {
    const start = wizardReducer(initialWizardState(), { type: 'update', patch: sample });
    const back = walk(start, ['next', 'next', 'next', 'prev', 'prev', 'prev']);
    expect(back.step).toBe(1);
    expect(back.values).toEqual(withProject(sample));
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

describe('F-10 wizard values for the technical details step', () => {
  it('F-10 AC-021 the initial stack fields, architecture and rule list are empty', () => {
    const values = initialWizardState().values;
    expect(values.stack).toEqual(emptyStack);
    expect(values.architecture).toBe('');
    expect(values.rules).toEqual([]);
  });

  it('F-10 AC-021 each initial state has its own stack and rule list', () => {
    const first = initialWizardState().values;
    const second = initialWizardState().values;
    expect(first.stack).not.toBe(second.stack);
    expect(first.rules).not.toBe(second.rules);
  });

  it.each([
    ['language', 'TypeScript'],
    ['framework', '  Node  '],
    ['platform', '   '],
    ['buildTool', 'vite'],
    ['testFramework', 'vitest'],
  ] as const)('F-10 AC-020 the stack field %s keeps %j after Next, Prev and Next again', (field, value) => {
    const typed = wizardReducer(initialWizardState(), {
      type: 'update',
      patch: { stack: { ...emptyStack, [field]: value } },
    });
    const again = walk(typed, ['next', 'prev', 'next']);
    expect(again.values.stack[field]).toBe(value);
    expect(walk(typed, ['next', 'next', 'next', 'prev', 'prev', 'prev']).values.stack[field]).toBe(value);
  });

  it('F-10 AC-007 the architecture text keeps spaces and line breaks through Next and Prev (no trim)', () => {
    const architecture = '  Layers:\n  API and web\n\n';
    const typed = wizardReducer(initialWizardState(), { type: 'update', patch: { architecture } });
    expect(typed.values.architecture).toBe(architecture);
    expect(walk(typed, ['next', 'next', 'next', 'prev', 'prev', 'prev']).values.architecture).toBe(architecture);
  });

  it('F-10 AC-008 the rule list stays empty after Next, Prev and going to step 4 and back', () => {
    const start = initialWizardState();
    expect(walk(start, ['next']).values.rules).toEqual([]);
    expect(walk(start, ['next', 'next', 'next', 'prev', 'prev', 'prev']).values.rules).toEqual([]);
  });

  it('F-10 AC-009 add rule appends one empty block after the last one (0 to 1, 1 to 2)', () => {
    const one = wizardReducer(initialWizardState(), { type: 'add-rule' });
    expect(one.values.rules).toEqual([{ name: '', description: '' }]);
    const named = wizardReducer(one, { type: 'update-rule', index: 0, patch: { name: 'style' } });
    const two = wizardReducer(named, { type: 'add-rule' });
    expect(two.values.rules).toEqual([{ name: 'style', description: '' }, { name: '', description: '' }]);
  });

  it('F-10 AC-010 remove rule removes the given block and keeps the others in order', () => {
    const three = ['first', 'middle', 'last'].reduce<WizardState>(
      (state, name, index) => {
        const added = wizardReducer(state, { type: 'add-rule' });
        return wizardReducer(added, { type: 'update-rule', index, patch: { name } });
      },
      initialWizardState(),
    );
    const removed = wizardReducer(three, { type: 'remove-rule', index: 1 });
    expect(removed.values.rules.map((rule) => rule.name)).toEqual(['first', 'last']);
    expect(three.values.rules).toHaveLength(3);
  });

  it('F-10 AC-010 remove rule with an index that has no block is a programmer error', () => {
    const one = wizardReducer(initialWizardState(), { type: 'add-rule' });
    expect(() => wizardReducer(one, { type: 'remove-rule', index: 1 })).toThrow(RangeError);
    expect(() => wizardReducer(one, { type: 'remove-rule', index: -1 })).toThrow(RangeError);
    expect(() => wizardReducer(one, { type: 'remove-rule', index: 0.5 })).toThrow(RangeError);
  });

  it('F-10 AC-020 update rule merges a name or a description and keeps the rest, no trim', () => {
    const one = wizardReducer(initialWizardState(), { type: 'add-rule' });
    const named = wizardReducer(one, { type: 'update-rule', index: 0, patch: { name: '  style  ' } });
    const described = wizardReducer(named, {
      type: 'update-rule',
      index: 0,
      patch: { description: 'Line one\n  Line two  ' },
    });
    expect(described.values.rules).toEqual([{ name: '  style  ', description: 'Line one\n  Line two  ' }]);
    expect(one.values.rules).toEqual([{ name: '', description: '' }]);
    expect(walk(described, ['next', 'prev']).values.rules).toEqual(described.values.rules);
    expect(walk(described, ['next', 'next', 'next', 'prev', 'prev', 'prev']).values.rules).toEqual(
      described.values.rules,
    );
  });

  it('F-10 AC-020 update rule with an index that has no block is a programmer error', () => {
    expect(() =>
      wizardReducer(initialWizardState(), { type: 'update-rule', index: 0, patch: { name: 'x' } }),
    ).toThrow(RangeError);
  });

  it('F-10 AC-012 the 60th block is added and a 61st is refused, the state kept as it is', () => {
    const sixty = withRules(60);
    expect(sixty.values.rules).toHaveLength(60);
    const refused = wizardReducer(sixty, { type: 'add-rule' });
    expect(refused).toBe(sixty);
    expect(refused.values.rules).toHaveLength(60);
  });

  it('F-10 AC-012 at 59 blocks an add is accepted and gives 60', () => {
    const fiftyNine = withRules(59);
    expect(wizardReducer(fiftyNine, { type: 'add-rule' }).values.rules).toHaveLength(60);
  });

  it('F-10 AC-021 restart clears the stack, the architecture and the rule list', () => {
    let state = wizardReducer(initialWizardState(), {
      type: 'update',
      patch: { stack: { ...emptyStack, language: 'Go' }, architecture: 'Layers' },
    });
    state = wizardReducer(state, { type: 'add-rule' });
    state = walk(state, ['next']);
    const restarted = wizardReducer(state, { type: 'restart' });
    expect(restarted.values).toEqual(empty);
    expect(restarted.values.rules).toEqual([]);
  });
});
