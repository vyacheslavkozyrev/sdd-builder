// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useReducer } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../src/theme.js';
import { NAME_LABEL } from '../src/wizard/RuleBlock.js';
import { getRuleListStyles } from '../src/wizard/ruleListStyles.js';
import {
  EMPTY_LIST_LINES,
  LIMIT_REASON,
  REMOVE_CONFIRM_TEXT,
  RuleList,
  type RuleActions,
} from '../src/wizard/RuleList.js';
import type { RuleValues, WizardState, WizardValues } from '../src/wizard/state.js';
import { createInitialWizardState, wizardReducer } from '../src/wizard/state.js';

const BLANK_VALUES: WizardValues = {
  name: '',
  idea: '',
  stack: { language: '', framework: '', platform: '', buildTool: '', testFramework: '' },
  architecture: '',
  rules: [],
};

function rulesOf(count: number, name = ''): RuleValues[] {
  return Array.from({ length: count }, () => ({ name, description: '' }));
}

// The list driven by the real wizard reducer, so the add, update and remove actions are proved end to end.
function Harness({ initial }: { readonly initial: readonly RuleValues[] }) {
  const start: WizardState = { step: 2, values: { ...BLANK_VALUES, rules: initial } };
  const [state, dispatch] = useReducer(wizardReducer, start);
  const actions: RuleActions = {
    onAdd: () => {
      dispatch({ type: 'add-rule' });
    },
    onRemove: (index) => {
      dispatch({ type: 'remove-rule', index });
    },
    onUpdate: (index, patch) => {
      dispatch({ type: 'update-rule', index, patch });
    },
  };
  return (
    <ThemeProvider theme={theme}>
      <RuleList rules={state.values.rules} actions={actions} />
    </ThemeProvider>
  );
}

function renderList(initial: readonly RuleValues[] = []) {
  return render(<Harness initial={initial} />);
}

function addButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Add rule block' }) as HTMLButtonElement;
}

// The name fields read from the DOM: while the confirmation is open MUI hides the page from the
// accessibility tree, so a role query would find no field.
function nameValues(): string[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[id^="rule-name-"]'), (field) => field.value);
}

function removeBlock(number: number): void {
  fireEvent.click(screen.getByRole('button', { name: `Remove rule block ${number}` }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('F-10 AC-008 the rule list starts empty', () => {
  it('F-10 AC-008 shows the empty list on a new project and no rule block', () => {
    renderList();
    expect(screen.getByText(EMPTY_LIST_LINES.title)).toBeTruthy();
    expect(screen.getByText(EMPTY_LIST_LINES.nothing)).toBeTruthy();
    expect(screen.queryAllByRole('textbox', { name: NAME_LABEL })).toHaveLength(0);
  });

  it('F-10 AC-008 a new wizard holds zero rule blocks after Next, Prev and a return to step 2', () => {
    let state = createInitialWizardState();
    state = wizardReducer(state, { type: 'next' });
    state = wizardReducer(state, { type: 'next' });
    state = wizardReducer(state, { type: 'next' });
    state = wizardReducer(state, { type: 'prev' });
    state = wizardReducer(state, { type: 'prev' });
    expect(state.step).toBe(2);
    expect(state.values.rules).toHaveLength(0);
  });
});

describe('F-10 AC-009 Add rule block appends one empty block after the last one', () => {
  it.each([
    [0, 1],
    [1, 2],
    [2, 3],
  ])('F-10 AC-009 going from %i to %i blocks appends the new block last', (before, after) => {
    renderList(rulesOf(before, 'existing'));
    fireEvent.click(addButton());
    const names = nameValues();
    expect(names).toHaveLength(after);
    expect(names.slice(0, before)).toEqual(rulesOf(before, 'existing').map((rule) => rule.name));
    expect(names[after - 1]).toBe('');
  });

  it('F-10 AC-009 keeps the order of the blocks that were there before the add', () => {
    renderList([
      { name: 'First', description: '' },
      { name: 'Second', description: '' },
    ]);
    fireEvent.click(addButton());
    expect(nameValues()).toEqual(['First', 'Second', '']);
  });
});

describe('F-10 AC-010 Remove deletes that block and keeps the others in order', () => {
  it('F-10 AC-010 removing the middle of three blocks keeps the first and the last in place', () => {
    renderList([
      { name: 'First', description: '' },
      { name: 'Middle', description: '' },
      { name: 'Last', description: '' },
    ]);
    removeBlock(2);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(nameValues()).toEqual(['First', 'Last']);
  });
});

describe('F-10 AC-011 Remove asks for confirmation first', () => {
  it('F-10 AC-011 opens the confirmation and removes nothing before it is confirmed (negative case)', () => {
    renderList([
      { name: 'Code Style', description: '' },
      { name: 'Testing', description: '' },
    ]);
    removeBlock(1);
    expect(screen.getByRole('dialog', { name: 'Remove rule block 1?' })).toBeTruthy();
    expect(screen.getByText(REMOVE_CONFIRM_TEXT)).toBeTruthy();
    expect(nameValues()).toEqual(['Code Style', 'Testing']);
  });

  it('F-10 AC-011 Cancel keeps the block unchanged and closes the confirmation', async () => {
    renderList([{ name: 'Code Style', description: 'Use named exports.' }]);
    removeBlock(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(nameValues()).toEqual(['Code Style']);
  });

  it('F-10 AC-011 Remove block removes the confirmed block and closes the confirmation', async () => {
    renderList([
      { name: 'Code Style', description: '' },
      { name: 'Testing', description: '' },
    ]);
    removeBlock(1);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(nameValues()).toEqual(['Testing']);
  });
});

describe('F-10 AC-012 Add rule block is disabled at 60 blocks', () => {
  it.each([
    [59, false],
    [60, true],
  ])('F-10 AC-012 with %i blocks the add control disabled is %s', (count, disabled) => {
    renderList(rulesOf(count));
    expect(addButton().disabled).toBe(disabled);
  });

  it('F-10 AC-012 at 60 blocks shows the reason beside the disabled add control', () => {
    renderList(rulesOf(60));
    expect(screen.getByText(LIMIT_REASON)).toBeTruthy();
    expect(addButton().getAttribute('aria-describedby')).toBe('rule-limit-reason');
  });

  it('F-10 AC-012 at 59 blocks shows no reason and adds the 60th block (negative case: no 61st)', () => {
    renderList(rulesOf(59));
    expect(screen.queryByText(LIMIT_REASON)).toBeNull();
    fireEvent.click(addButton());
    expect(screen.getAllByRole('textbox', { name: NAME_LABEL })).toHaveLength(60);
    expect(addButton().disabled).toBe(true);
    expect(screen.getByText(LIMIT_REASON)).toBeTruthy();
  });
});

describe('F-10 AC-025 the rule list is its own scroll region', () => {
  it('F-10 AC-025 the list style fills the column and scrolls vertically inside it (page layout is checked on the device)', () => {
    const styles = getRuleListStyles(theme);
    expect(styles.list).toMatchObject({ flex: 1, minHeight: 0, overflowY: 'auto' });
  });
});
