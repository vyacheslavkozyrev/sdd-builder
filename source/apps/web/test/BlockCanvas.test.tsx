// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlockCanvas } from '../src/builder/BlockCanvas.js';
import type { Flow } from '../src/builder/model.js';
import type { BlockSelection } from '../src/builder/panel.js';
import { theme } from '../src/theme.js';

// The canvas is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

afterEach(() => {
  cleanup();
});

// The canvas reads its colours from the app theme, so every render gets the same provider the app uses.
function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

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

// start -> planner -> end check (true to End, false back to the planner with 3 rounds).
const loopFlow: Flow = {
  ...emptyFlow,
  blocks: [
    { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
    { index: 1, id: 'block-2', kind: 'agent', name: 'planner', description: 'Writes the plan', arguments: [], next: 'block-3' },
    {
      index: 2,
      id: 'block-3',
      kind: 'condition',
      description: 'The reviewer approves',
      true: { to: 'block-4' },
      false: { to: 'block-2', roundLimit: 3 },
    },
    { index: 3, id: 'block-4', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ],
};

// start -> planner -> retry check (true back to the planner with 2 rounds, false to End).
const trueReturnFlow: Flow = {
  ...emptyFlow,
  blocks: [
    { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
    { index: 1, id: 'block-2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'block-3' },
    {
      index: 2,
      id: 'block-3',
      kind: 'condition',
      description: 'The retry is needed',
      true: { to: 'block-2', roundLimit: 2 },
      false: { to: 'block-4' },
    },
    { index: 3, id: 'block-4', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

// start -> pre-check (a Condition that follows Start): true to End, false stops at End.
const precheckFlow: Flow = {
  ...emptyFlow,
  blocks: [
    { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
    { index: 1, id: 'block-2', kind: 'condition', description: 'The brief is complete', true: { to: 'block-3' }, false: { to: 'block-3' } },
    { index: 2, id: 'block-3', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

describe('F-12 AC-006 (UI) an empty flow', () => {
  it('F-12 AC-006 (UI) shows "No blocks yet." and no drawing when the flow has no blocks', () => {
    renderWithTheme(<BlockCanvas flow={emptyFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByText('No blocks yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /block/ })).toBeNull();
  });
});

describe('F-12 AC-010 (UI) the heading and the count line', () => {
  it('F-12 AC-010 (UI) shows the flow name and "0 Agents, 0 Conditions" for an empty flow', () => {
    renderWithTheme(<BlockCanvas flow={emptyFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'plan' })).toBeTruthy();
    expect(screen.getByText('0 Agents, 0 Conditions')).toBeTruthy();
  });

  it('F-12 AC-010 (UI) counts the Agents and the Conditions of the flow', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByText('1 Agents, 1 Conditions')).toBeTruthy();
  });
});

describe('F-12 AC-007 AC-008 (UI) drawn blocks and arrows', () => {
  it('F-12 AC-007 (UI) draws each block with its kind and its text', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Start block' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agent block: planner' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Condition block: The reviewer approves' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'End block' })).toBeTruthy();
    expect(screen.getByText('Writes the plan')).toBeTruthy();
    expect(screen.getByText('The reviewer approves')).toBeTruthy();
  });

  it('F-12 AC-007 (UI) draws a Condition description below its diamond when its false route returns, and above it otherwise', () => {
    const { unmount } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />,
    );
    expect(screen.getByText('The reviewer approves').getAttribute('y')).toBe('470');
    unmount();
    renderWithTheme(<BlockCanvas flow={precheckFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByText('The brief is complete').getAttribute('y')).toBe('370');
  });

  it('F-12 AC-007 (UI) draws a Condition description below its diamond when its true route returns', () => {
    renderWithTheme(<BlockCanvas flow={trueReturnFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByText('The retry is needed').getAttribute('y')).toBe('470');
  });

  it('F-12 AC-007 (UI) ends the description left of the diamond when the true route returns and the false route goes forward', () => {
    renderWithTheme(<BlockCanvas flow={trueReturnFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />);
    // The diamond is the third block: its centre is 294, so the caption ends at 286, left of the false line at 294.
    const caption = screen.getByText('The retry is needed');
    expect(caption.getAttribute('x')).toBe('286');
    expect(caption.getAttribute('text-anchor')).toBe('end');
    expect(caption.getAttribute('y')).toBe('470');
  });

  it('F-12 AC-007 (UI) ends the description left of the diamond when the false route returns and the true route goes forward', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />);
    const caption = screen.getByText('The reviewer approves');
    expect(caption.getAttribute('x')).toBe('286');
    expect(caption.getAttribute('text-anchor')).toBe('end');
    expect(caption.getAttribute('y')).toBe('470');
  });

  it('F-12 AC-008 (UI) draws the true and false labels and "up to 3 rounds" on the return', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByText('true')).toBeTruthy();
    expect(screen.getByText('false')).toBeTruthy();
    expect(screen.getByText('up to 3 rounds')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'false arrow from Condition: The reviewer approves' })).toBeTruthy();
  });
});

describe('F-12 (no criterion: screen 01 footer) the footer hint', () => {
  it('F-12 (no criterion: screen 01 footer) shows the footer hint under the drawing', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} />);
    expect(
      screen.getByText(
        'Arrows run the blocks in order. A dashed arrow is a return: a false branch back to an earlier Agent.',
      ),
    ).toBeTruthy();
  });
});

describe('F-12 AC-011 (UI) clicks select a block, an arrow or nothing', () => {
  it('F-12 AC-011 (UI) selects the block that was clicked', () => {
    const onSelect = vi.fn<(selection: BlockSelection) => void>();
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={onSelect} onAdd={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: planner' }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'block', blockId: 'block-2' });
  });

  it('F-12 AC-011 (UI) selects the arrow that was clicked, by its block and output', () => {
    const onSelect = vi.fn<(selection: BlockSelection) => void>();
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={onSelect} onAdd={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'false arrow from Condition: The reviewer approves' }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'blockArrow', fromId: 'block-3', output: 'false' });
  });

  it('F-12 (no criterion: user decision for T015) clears the selection when the empty canvas is clicked', () => {
    const onSelect = vi.fn<(selection: BlockSelection) => void>();
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'block', blockId: 'block-2' }} onSelect={onSelect} onAdd={vi.fn()} />,
    );
    const drawing = container.querySelector('svg');
    if (drawing === null) {
      throw new Error('the drawing has no svg element');
    }
    fireEvent.click(drawing);
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'none' });
  });
});

describe('F-12 AC-002 (UI) the toolbox adds a block on this canvas', () => {
  it('F-12 AC-002 (UI) passes the result of a toolbox press to onAdd', () => {
    const onAdd = vi.fn();
    renderWithTheme(<BlockCanvas flow={emptyFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    expect(onAdd).toHaveBeenCalledWith({
      flow: { ...emptyFlow, blocks: [{ index: 0, id: 'block-1', kind: 'agent', name: '', description: '', arguments: [], next: '' }] },
      blockId: 'block-1',
    });
  });
});
