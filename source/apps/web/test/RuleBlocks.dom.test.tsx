// @vitest-environment jsdom
// DOM tests for the rule list's clicks (F-10 AC-009 to AC-012). Only this file runs in
// jsdom; the markup tests in RuleBlocks.test.tsx stay in the default environment.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RuleBlocks } from '../src/wizard/RuleBlocks.js';
import type { RuleBlock } from '../src/wizard/state.js';
import { RULE_BLOCK_LIMIT } from '../src/wizard/technical.js';

afterEach(() => {
  cleanup();
});

function blocks(...names: string[]): RuleBlock[] {
  return names.map((name) => ({ name, description: '' }));
}

function renderRules(rules: RuleBlock[]) {
  const handlers = { onAdd: vi.fn(), onRemove: vi.fn(), onUpdate: vi.fn() };
  render(<RuleBlocks rules={rules} {...handlers} />);
  return handlers;
}

function removeButtonFor(number: number): HTMLElement {
  return screen.getByRole('button', { name: `Remove rule block ${number}` });
}

function dialogRemoveButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Remove' });
}

describe('F-10 technical details step: rule removal clicks', () => {
  it('F-10 AC-011 Remove opens the confirmation and does not remove before it is answered (negative case)', () => {
    const { onRemove } = renderRules(blocks('Code Style', 'Testing'));
    fireEvent.click(removeButtonFor(1));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Remove rule block 1?')).toBeTruthy();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('F-10 AC-011 Cancel closes the confirmation and keeps the block (negative case: onRemove is not called)', () => {
    const { onRemove } = renderRules(blocks('Code Style', 'Testing'));
    fireEvent.click(removeButtonFor(1));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('F-10 AC-011 Escape closes the confirmation without removing (negative case)', () => {
    const { onRemove } = renderRules(blocks('Code Style', 'Testing'));
    fireEvent.click(removeButtonFor(1));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('F-10 AC-011 Remove in the confirmation removes the block once and closes the confirmation', () => {
    const { onRemove } = renderRules(blocks('Code Style', 'Testing'));
    fireEvent.click(removeButtonFor(1));
    fireEvent.click(dialogRemoveButton());
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(0);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('F-10 AC-010 Remove on the middle of three blocks removes that block only (negative case: the others are not asked)', () => {
    const { onRemove } = renderRules(blocks('First', 'Second', 'Third'));
    fireEvent.click(removeButtonFor(2));
    expect(screen.getByText('Remove rule block 2?')).toBeTruthy();
    fireEvent.click(dialogRemoveButton());
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('F-10 AC-011 the confirmation names the block and says the next block keeps its place', () => {
    renderRules(blocks('First', 'Second', 'Third'));
    fireEvent.click(removeButtonFor(2));
    expect(screen.getByText('Rule block 2, “Second”, is removed.', { exact: false })).toBeTruthy();
    expect(screen.getByText('Rule block 3 keeps its place in the list.')).toBeTruthy();
  });
});

describe('F-10 technical details step: Add clicks', () => {
  it('F-10 AC-009 a click on Add rule block calls onAdd once (negative case: no block is added without a click)', () => {
    const { onAdd } = renderRules(blocks('Code Style'));
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add rule block' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('F-10 AC-012 Add rule block is enabled at 59 blocks and a click calls onAdd', () => {
    const rules = Array.from({ length: RULE_BLOCK_LIMIT - 1 }, (_, i) => ({ name: `rule ${i}`, description: '' }));
    const { onAdd } = renderRules(rules);
    const add = screen.getByRole('button', { name: 'Add rule block' });
    expect((add as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(add);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('F-10 AC-012 Add rule block is disabled at 60 blocks and a click does not call onAdd (negative case)', () => {
    const rules = Array.from({ length: RULE_BLOCK_LIMIT }, (_, i) => ({ name: `rule ${i}`, description: '' }));
    const { onAdd } = renderRules(rules);
    const add = screen.getByRole('button', { name: 'Add rule block' });
    expect((add as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(add);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
