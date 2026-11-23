// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AddBlockResult } from '../src/builder/blocks.js';
import type { Flow } from '../src/builder/model.js';
import { Toolbox } from '../src/builder/Toolbox.js';
import { theme } from '../src/theme.js';

// The toolbox is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

afterEach(() => {
  cleanup();
});

// The toolbox reads its colours from the app theme, so every render gets the same provider the app uses.
function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// A flow with no blocks, and a copy of it with the given blocks.
const emptyFlow: Flow = {
  index: 0,
  id: 'plan',
  name: 'plan',
  arguments: [],
  body: '',
  artifacts: [],
  approval: false,
  blocks: [],
};

function flowWith(blocks: Flow['blocks']): Flow {
  return { ...emptyFlow, blocks };
}

const startBlock: Flow['blocks'][number] = { index: 0, id: 'block-1', kind: 'start', next: '' };

const reason = 'This flow already has a Start block.';

describe('F-12 AC-001 toolbox buttons', () => {
  it('F-12 AC-001 shows four icon buttons, Agent, Condition, Start and End, in that order', () => {
    renderWithTheme(<Toolbox flow={emptyFlow} onAdd={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Agent',
      'Condition',
      'Start',
      'End',
    ]);
  });

  it('F-12 AC-001 has no Link, Move, Connection or Delete-flow control', () => {
    renderWithTheme(<Toolbox flow={emptyFlow} onAdd={vi.fn()} />);
    for (const name of ['Link', 'Move', 'Move up', 'Move down', 'Connection', 'Delete flow']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('F-12 AC-001 names each button by a tooltip with its name', () => {
    renderWithTheme(<Toolbox flow={emptyFlow} onAdd={vi.fn()} />);
    const toolbar = screen.getByRole('toolbar', { name: 'Add a block' });
    for (const name of ['Agent', 'Condition', 'Start', 'End']) {
      const button = within(toolbar).getByRole('button', { name });
      expect(button.parentElement?.tagName).toBe('SPAN');
    }
  });

  // The tooltip opens after MUI's enter delay, so the timers are faked and run at once.
  it.each(['Agent', 'Condition', 'Start', 'End'])('F-12 AC-001 shows the tooltip %s on hover', (name) => {
    vi.useFakeTimers();
    try {
      renderWithTheme(<Toolbox flow={flowWith([startBlock])} onAdd={vi.fn()} />);
      const wrapper = screen.getByRole('button', { name }).parentElement;
      if (!wrapper) throw new Error(`no wrapper for ${name}`);
      fireEvent.mouseOver(wrapper);
      act(() => {
        vi.runAllTimers();
      });
      expect(screen.getByRole('tooltip').textContent).toBe(name);
    } finally {
      vi.useRealTimers();
    }
  });

  it('F-12 AC-001 shows the tooltip of Start while Start is disabled', () => {
    vi.useFakeTimers();
    try {
      renderWithTheme(<Toolbox flow={flowWith([startBlock])} onAdd={vi.fn()} />);
      const start = screen.getByRole('button', { name: 'Start' });
      expect(start.hasAttribute('disabled')).toBe(true);
      fireEvent.mouseOver(start.parentElement as HTMLElement);
      act(() => {
        vi.runAllTimers();
      });
      expect(screen.getByRole('tooltip').textContent).toBe('Start');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('F-12 AC-002 a press adds a block and selects it', () => {
  it('F-12 AC-002 adds an Agent with no arrows, selected by its id', () => {
    const onAdd = vi.fn<(result: AddBlockResult) => void>();
    renderWithTheme(<Toolbox flow={emptyFlow} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    const result = onAdd.mock.calls[0]?.[0];
    expect(result?.blockId).toBe('block-1');
    expect(result?.flow.blocks).toEqual([
      { index: 0, id: 'block-1', kind: 'agent', name: '', description: '', arguments: [], next: '' },
    ]);
  });

  it('F-12 AC-002 adds a Condition and an End, each a new block of its kind', () => {
    const onAdd = vi.fn<(result: AddBlockResult) => void>();
    renderWithTheme(<Toolbox flow={flowWith([startBlock])} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Condition' }));
    fireEvent.click(screen.getByRole('button', { name: 'End' }));
    const kinds = onAdd.mock.calls.map(([result]) => result.flow.blocks.at(-1)?.kind);
    expect(kinds).toEqual(['condition', 'end']);
    expect(onAdd.mock.calls[1]?.[0].blockId).toBe('block-2');
  });

  it('F-12 AC-002 adds a Start to a flow that has none', () => {
    const onAdd = vi.fn<(result: AddBlockResult) => void>();
    renderWithTheme(<Toolbox flow={emptyFlow} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onAdd.mock.calls[0]?.[0].flow.blocks.map((block) => block.kind)).toEqual(['start']);
  });
});

describe('F-12 AC-003 Start while the flow has one', () => {
  it('F-12 AC-003 disables Start and shows the reason beside the toolbox', () => {
    renderWithTheme(<Toolbox flow={flowWith([startBlock])} onAdd={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Start' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(reason)).toBeTruthy();
  });

  it('F-12 AC-003 does not add a second Start when Start is pressed', () => {
    const onAdd = vi.fn();
    renderWithTheme(<Toolbox flow={flowWith([startBlock])} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('F-12 AC-003 keeps Start enabled and shows no reason while the flow has no Start', () => {
    renderWithTheme(<Toolbox flow={emptyFlow} onAdd={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Start' }).hasAttribute('disabled')).toBe(false);
    expect(screen.queryByText(reason)).toBeNull();
  });

  it('F-12 AC-003 leaves the other buttons enabled while Start is disabled', () => {
    renderWithTheme(<Toolbox flow={flowWith([startBlock])} onAdd={vi.fn()} />);
    for (const name of ['Agent', 'Condition', 'End']) {
      expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(false);
    }
  });
});
