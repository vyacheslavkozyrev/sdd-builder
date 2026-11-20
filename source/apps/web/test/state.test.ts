import { describe, expect, it } from 'vitest';
import {
  createInitialWizardState,
  wizardReducer,
  type WizardAction,
  type WizardState,
  type WizardValues,
} from '../src/wizard/state.js';
import { isNextEnabled, isPrevEnabled, type StepNumber } from '../src/wizard/steps.js';
import { valuesWith } from './wizardValues.js';

// A values object with a name and an idea, to prove the reducer carries values through.
function filledValues(): WizardValues {
  return valuesWith('Demo', 'kept idea');
}

function stateWithValue(step: StepNumber): WizardState {
  return { step, values: filledValues() };
}

function emptyState(step: StepNumber): WizardState {
  return { step, values: valuesWith('', '') };
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
    expect(after).toEqual({ step: 1, values: valuesWith('Demo', 'kept idea') });
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
      expect(state.values).toEqual(valuesWith('Demo', 'kept idea'));
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
      expect(after.values).toEqual(valuesWith('', ''));
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
    expect(createInitialWizardState()).toEqual({ step: 1, values: valuesWith('', '') });
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
    expect(start).toEqual({ step: 1, values: valuesWith('', '') });
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
    expect(after.values).toEqual(valuesWith('New', 'kept idea'));
  });

  it('F-09 AC-010 a patch with only the idea keeps the name', () => {
    const start = stateWithValue(1);
    const after = wizardReducer(start, { type: 'setValues', patch: { idea: 'New idea ' } });
    expect(after.values).toEqual(valuesWith('Demo', 'New idea '));
  });

  it('F-09 AC-002 an empty patch keeps both fields (edge case)', () => {
    const start = stateWithValue(1);
    const after = wizardReducer(start, { type: 'setValues', patch: {} });
    expect(after.values).toEqual(valuesWith('Demo', 'kept idea'));
  });

  it('F-09 AC-002 a patch with both fields sets both', () => {
    const after = wizardReducer(stateWithValue(1), {
      type: 'setValues',
      patch: { name: ' N ', idea: ' I ' },
    });
    expect(after.values).toEqual(valuesWith(' N ', ' I '));
  });

  it('F-09 AC-002 setValues keeps the step and does not change the input state', () => {
    const start = stateWithValue(1);
    const after = wizardReducer(start, { type: 'setValues', patch: { name: 'X' } });
    expect(after.step).toBe(1);
    expect(start.values).toEqual(valuesWith('Demo', 'kept idea'));
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
      expect(state.values).toEqual(valuesWith('  Demo ', 'Idea line\n'));
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
    expect(after.values).not.toEqual(valuesWith('Old', 'Old idea'));
    expect(after.values).toEqual(valuesWith('', ''));
  });
});

// Step 2 (F-10): the stack, the architecture and the rule blocks.
function rulesOf(...names: readonly string[]): WizardState {
  let state: WizardState = emptyState(2);
  for (let index = 0; index < names.length; index += 1) {
    state = wizardReducer(state, { type: 'add-rule' });
    state = wizardReducer(state, { type: 'update-rule', index, patch: { name: names[index] ?? '' } });
  }
  return state;
}

describe('F-10 AC-007 the architecture text is stored as typed', () => {
  const table: readonly string[] = ['  Layers\n\n  api -> core  ', '\n', '   '];

  for (const architecture of table) {
    it(`F-10 AC-007 the architecture ${JSON.stringify(architecture)} comes back unchanged`, () => {
      const after = wizardReducer(emptyState(2), { type: 'setValues', patch: { architecture } });
      expect(after.values.architecture).toBe(architecture);
    });
  }

  it('F-10 AC-007 the architecture text is not trimmed by Next or Prev', () => {
    const typed = wizardReducer(emptyState(2), {
      type: 'setValues',
      patch: { architecture: '  line one\nline two  ' },
    });
    const moved = wizardReducer(wizardReducer(typed, { type: 'next' }), { type: 'prev' });
    expect(moved.values.architecture).toBe('  line one\nline two  ');
  });
});

describe('F-10 AC-003 the stack fields are stored as typed, one field at a time', () => {
  const table: readonly string[] = ['TypeScript', '  Node  ', '   '];

  for (const language of table) {
    it(`F-10 AC-003 the language ${JSON.stringify(language)} comes back unchanged`, () => {
      const after = wizardReducer(emptyState(2), { type: 'setValues', patch: { stack: { language } } });
      expect(after.values.stack.language).toBe(language);
    });
  }

  it('F-10 AC-003 a stack patch with one field keeps the other stack fields', () => {
    const start = wizardReducer(emptyState(2), {
      type: 'setValues',
      patch: { stack: { language: 'Go', buildTool: 'make' } },
    });
    const after = wizardReducer(start, { type: 'setValues', patch: { stack: { framework: ' Gin ' } } });
    expect(after.values.stack).toEqual({
      language: 'Go',
      framework: ' Gin ',
      platform: '',
      buildTool: 'make',
      testFramework: '',
    });
  });
});

describe('F-10 AC-008 the rule list starts empty and stays empty until Add rule block', () => {
  it('F-10 AC-008 a fresh wizard has no rule blocks', () => {
    expect(createInitialWizardState().values.rules).toEqual([]);
  });

  it('F-10 AC-008 Next and Prev do not add a rule block', () => {
    let state = createInitialWizardState();
    for (const action of [{ type: 'next' }, { type: 'next' }, { type: 'prev' }, { type: 'next' }] as const) {
      state = wizardReducer(state, action);
    }
    expect(state.values.rules).toEqual([]);
  });
});

describe('F-10 AC-009 Add rule block appends one empty block after the last one', () => {
  const table: ReadonlyArray<{ before: number; after: number }> = [
    { before: 0, after: 1 },
    { before: 1, after: 2 },
  ];

  for (const { before, after } of table) {
    it(`F-10 AC-009 Add rule block from ${before} block(s) gives ${after}`, () => {
      const start = rulesOf(...Array.from({ length: before }, (_, index) => `rule ${index}`));
      const next = wizardReducer(start, { type: 'add-rule' });
      expect(next.values.rules).toHaveLength(after);
      expect(next.values.rules[after - 1]).toEqual({ name: '', description: '' });
    });
  }

  it('F-10 AC-009 the blocks before the new one keep their order', () => {
    const start = rulesOf('first', 'second');
    const next = wizardReducer(start, { type: 'add-rule' });
    expect(next.values.rules.map((rule) => rule.name)).toEqual(['first', 'second', '']);
  });
});

describe('F-10 AC-010 Remove on a block removes that block only and keeps the order', () => {
  it('F-10 AC-010 removing the middle of three blocks keeps the first and the last in place', () => {
    const after = wizardReducer(rulesOf('first', 'middle', 'last'), { type: 'remove-rule', index: 1 });
    expect(after.values.rules.map((rule) => rule.name)).toEqual(['first', 'last']);
  });

  it('F-10 AC-010 removing the only block leaves an empty list', () => {
    const after = wizardReducer(rulesOf('only'), { type: 'remove-rule', index: 0 });
    expect(after.values.rules).toEqual([]);
  });

  it('F-10 AC-010 an index that is not a block is a programmer error (negative case)', () => {
    const start = rulesOf('one');
    expect(() => wizardReducer(start, { type: 'remove-rule', index: 1 })).toThrow(/no rule block at index 1/);
    expect(() => wizardReducer(start, { type: 'remove-rule', index: -1 })).toThrow(/no rule block/);
    expect(() => wizardReducer(start, { type: 'remove-rule', index: 0.5 })).toThrow(/no rule block/);
  });
});

describe('F-10 AC-012 Add rule block is refused at 60 blocks', () => {
  const table: ReadonlyArray<{ before: number; added: boolean }> = [
    { before: 59, added: true },
    { before: 60, added: false },
  ];

  for (const { before, added } of table) {
    it(`F-10 AC-012 Add rule block from ${before} block(s) ${added ? 'adds' : 'does not add'} one`, () => {
      const start = rulesOf(...Array.from({ length: before }, (_, index) => `rule ${index}`));
      const next = wizardReducer(start, { type: 'add-rule' });
      expect(next.values.rules).toHaveLength(added ? before + 1 : 60);
    });
  }

  it('F-10 AC-012 a refused Add returns the same state (negative case: no 61st block)', () => {
    const start = rulesOf(...Array.from({ length: 60 }, (_, index) => `rule ${index}`));
    expect(wizardReducer(start, { type: 'add-rule' })).toBe(start);
  });
});

describe('F-10 AC-020 the rule description is stored as typed', () => {
  it('F-10 AC-020 a blank description is kept as typed and does not block Next', () => {
    const start = rulesOf('Style');
    const after = wizardReducer(start, { type: 'update-rule', index: 0, patch: { description: '   ' } });
    expect(after.values.rules[0]).toEqual({ name: 'Style', description: '   ' });
    expect(wizardReducer(after, { type: 'next' }).step).toBe(3);
  });

  it('F-10 AC-020 update-rule on an index that is not a block is a programmer error (negative case)', () => {
    const start = rulesOf('one');
    expect(() => wizardReducer(start, { type: 'update-rule', index: 1, patch: { name: 'x' } })).toThrow(
      /no rule block at index 1/,
    );
  });

  it('F-10 AC-020 update-rule merges one field and keeps the other, and keeps the other blocks', () => {
    const start = rulesOf('one', 'two');
    const after = wizardReducer(start, {
      type: 'update-rule',
      index: 1,
      patch: { description: 'Line one\nline two' },
    });
    expect(after.values.rules).toEqual([
      { name: 'one', description: '' },
      { name: 'two', description: 'Line one\nline two' },
    ]);
  });
});

describe('F-10 AC-022 step 2 values survive Next, Prev and a visit to step 4', () => {
  it('F-10 AC-022 stack, architecture and rule blocks are present after Next, Prev, Next and a walk to step 4 and back', () => {
    let state = wizardReducer(createInitialWizardState(), {
      type: 'setValues',
      patch: { stack: { language: 'Go' }, architecture: 'Layers ' },
    });
    state = wizardReducer(state, { type: 'next' });
    state = wizardReducer(state, { type: 'add-rule' });
    state = wizardReducer(state, { type: 'update-rule', index: 0, patch: { name: 'Style', description: 'd' } });
    const kept = state.values;
    const actions: readonly WizardAction[] = [
      { type: 'prev' },
      { type: 'next' },
      { type: 'next' },
      { type: 'next' },
      { type: 'prev' },
      { type: 'prev' },
    ];
    for (const action of actions) {
      state = wizardReducer(state, action);
      expect(state.values).toBe(kept);
    }
    expect(state.step).toBe(2);
    expect(state.values.stack.language).toBe('Go');
    expect(state.values.architecture).toBe('Layers ');
    expect(state.values.rules).toEqual([{ name: 'Style', description: 'd' }]);
  });
});

describe('F-10 AC-023 restart clears every step 2 value, including the rule list', () => {
  it('F-10 AC-023 restart from step 2 clears the stack, the architecture and the rules', () => {
    let state = wizardReducer(emptyState(2), {
      type: 'setValues',
      patch: { stack: { language: 'Go' }, architecture: 'Layers' },
    });
    state = wizardReducer(state, { type: 'add-rule' });
    const after = wizardReducer(state, { type: 'restart' });
    expect(after.values).toEqual(valuesWith('', ''));
    expect(after.values.rules).toEqual([]);
  });
});
