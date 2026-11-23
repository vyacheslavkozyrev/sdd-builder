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
    renderWithTheme(<BlockCanvas flow={emptyFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    expect(screen.getByText('No blocks yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /block/ })).toBeNull();
  });
});

describe('F-12 AC-010 (UI) the heading and the count line', () => {
  it('F-12 AC-010 (UI) shows the flow name and "0 Agents, 0 Conditions" for an empty flow', () => {
    renderWithTheme(<BlockCanvas flow={emptyFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'plan' })).toBeTruthy();
    expect(screen.getByText('0 Agents, 0 Conditions')).toBeTruthy();
  });

  it('F-12 AC-010 (UI) counts the Agents and the Conditions of the flow', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    expect(screen.getByText('1 Agents, 1 Conditions')).toBeTruthy();
  });
});

describe('F-12 AC-007 AC-008 (UI) drawn blocks and arrows', () => {
  it('F-12 AC-007 (UI) draws each block with its kind and its text', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Start block' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Agent block: planner' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Condition block: The reviewer approves' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'End block' })).toBeTruthy();
    expect(screen.getByText('Writes the plan')).toBeTruthy();
    expect(screen.getByText('The reviewer approves')).toBeTruthy();
  });

  it('F-12 AC-007 (UI) draws a Condition description below its diamond when its false route returns, and above it otherwise', () => {
    const { unmount } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    expect(screen.getByText('The reviewer approves').getAttribute('y')).toBe('470');
    unmount();
    renderWithTheme(<BlockCanvas flow={precheckFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    expect(screen.getByText('The brief is complete').getAttribute('y')).toBe('370');
  });

  it('F-12 AC-007 (UI) draws a Condition description below its diamond when its true route returns', () => {
    renderWithTheme(<BlockCanvas flow={trueReturnFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    expect(screen.getByText('The retry is needed').getAttribute('y')).toBe('470');
  });

  it('F-12 AC-007 (UI) ends the description left of the diamond when the true route returns and the false route goes forward', () => {
    renderWithTheme(<BlockCanvas flow={trueReturnFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    // The diamond is the third block: its centre is 294, so the caption ends at 286, left of the false line at 294.
    const caption = screen.getByText('The retry is needed');
    expect(caption.getAttribute('x')).toBe('286');
    expect(caption.getAttribute('text-anchor')).toBe('end');
    expect(caption.getAttribute('y')).toBe('470');
  });

  it('F-12 AC-007 (UI) ends the description left of the diamond when the false route returns and the true route goes forward', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    const caption = screen.getByText('The reviewer approves');
    expect(caption.getAttribute('x')).toBe('286');
    expect(caption.getAttribute('text-anchor')).toBe('end');
    expect(caption.getAttribute('y')).toBe('470');
  });

  it('F-12 AC-008 (UI) draws the true and false labels and "up to 3 rounds" on the return', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    expect(screen.getByText('true')).toBeTruthy();
    expect(screen.getByText('false')).toBeTruthy();
    expect(screen.getByText('up to 3 rounds')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'false arrow from Condition: The reviewer approves' })).toBeTruthy();
  });
});

describe('F-12 (no criterion: screen 01 footer) the footer hint', () => {
  it('F-12 (no criterion: screen 01 footer) shows the footer hint under the drawing', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
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
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={onSelect} onAdd={vi.fn()} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agent block: planner' }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'block', blockId: 'block-2' });
  });

  it('F-12 AC-011 (UI) selects the arrow that was clicked, by its block and output', () => {
    const onSelect = vi.fn<(selection: BlockSelection) => void>();
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={onSelect} onAdd={vi.fn()} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'false arrow from Condition: The reviewer approves' }));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'blockArrow', fromId: 'block-3', output: 'false' });
  });

  it('F-12 (no criterion: user decision for T015) clears the selection when the empty canvas is clicked', () => {
    const onSelect = vi.fn<(selection: BlockSelection) => void>();
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'block', blockId: 'block-2' }} onSelect={onSelect} onAdd={vi.fn()} onChange={vi.fn()} />,
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
    renderWithTheme(<BlockCanvas flow={emptyFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={onAdd} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    expect(onAdd).toHaveBeenCalledWith({
      flow: { ...emptyFlow, blocks: [{ index: 0, id: 'block-1', kind: 'agent', name: '', description: '', arguments: [], next: '' }] },
      blockId: 'block-1',
    });
  });
});

// start -> planner, the planner open, reviewer open, End: the drags of F-12 AC-012 and AC-015 to AC-018.
const dragFlow: Flow = {
  ...emptyFlow,
  blocks: [
    { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
    { index: 1, id: 'block-2', kind: 'agent', name: 'planner', description: '', arguments: [], next: '' },
    { index: 2, id: 'block-3', kind: 'agent', name: 'reviewer', description: '', arguments: [], next: '' },
    { index: 3, id: 'block-4', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

// The same flow with the planner's arrow to the reviewer, for the arrow-end drags of F-12 AC-019.
const linkedFlow: Flow = {
  ...dragFlow,
  blocks: dragFlow.blocks.map((block) => (block.id === 'block-2' && block.kind === 'agent' ? { ...block, next: 'block-3' } : block)),
};

// The group of a block on the drawing, by its accessible name.
function groupOf(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

// The connection points of a block's group, by role, in the order they are drawn.
function portRoles(group: HTMLElement): string[] {
  return Array.from(group.querySelectorAll('[data-port]')).map((point) => point.getAttribute('data-port') ?? '');
}

function portOf(group: HTMLElement, role: string): HTMLElement {
  const point = group.querySelector<HTMLElement>(`[data-port="${role}"]`);
  if (point === null) {
    throw new Error(`no ${role} point in the block`);
  }
  return point;
}

function drawingOf(container: HTMLElement): SVGSVGElement {
  const drawing = container.querySelector('svg');
  if (drawing === null) {
    throw new Error('the drawing has no svg element');
  }
  return drawing;
}

// The dashed line a drag draws while it moves: the only line with no pointer events.
function previewOf(container: HTMLElement): Element | null {
  return container.querySelector('polyline[pointer-events="none"]');
}

// The refusal in the message band, or null when the band shows nothing.
function bandText(): string | null {
  return screen.queryByRole('status')?.textContent ?? null;
}

describe('F-12 AC-013 (UI) connection points by kind', () => {
  it('F-12 AC-013 (UI) draws one output on a Start and no input', () => {
    renderWithTheme(<BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    expect(portRoles(groupOf('Start block'))).toEqual(['next']);
  });

  it('F-12 AC-013 (UI) draws an input and one output on an Agent, and an input and two outputs on a Condition', () => {
    renderWithTheme(<BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    expect(portRoles(groupOf('Agent block: planner'))).toEqual(['input', 'next']);
    expect(portRoles(groupOf('Condition block: The reviewer approves'))).toEqual(['input', 'true', 'false']);
  });

  it('F-12 AC-013 (UI) draws an input and no output on an End', () => {
    renderWithTheme(<BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    expect(portRoles(groupOf('End block'))).toEqual(['input']);
  });
});

describe('F-12 AC-012 (UI) a drag from an output point to an input point links the blocks', () => {
  it('F-12 AC-012 (UI) shows the arrow while the drag moves, and links the blocks on the drop', () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />,
    );
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'));
    fireEvent.pointerMove(drawingOf(container), { clientX: 300, clientY: 400 });
    expect(previewOf(container)).not.toBeNull();
    fireEvent.pointerUp(groupOf('Agent block: reviewer'));
    expect(previewOf(container)).toBeNull();
    expect(onChange).toHaveBeenCalledWith({
      ...dragFlow,
      blocks: dragFlow.blocks.map((block) => (block.id === 'block-2' && block.kind === 'agent' ? { ...block, next: 'block-3' } : block)),
    });
  });

  it('F-12 AC-012 (UI) keeps the selection after a drag: the click that follows a drop does not clear it', () => {
    const onSelect = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={dragFlow} selection={{ kind: 'block', blockId: 'block-2' }} onSelect={onSelect} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'));
    fireEvent.pointerUp(groupOf('Agent block: reviewer'));
    fireEvent.click(drawingOf(container));
    expect(onSelect).not.toHaveBeenCalledWith({ kind: 'none' });
  });

  it('F-12 AC-012 (UI) lets the next click on the empty canvas clear the selection after a drop on a block', () => {
    const onSelect = vi.fn<(selection: BlockSelection) => void>();
    const { container } = renderWithTheme(
      <BlockCanvas flow={dragFlow} selection={{ kind: 'block', blockId: 'block-2' }} onSelect={onSelect} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'));
    fireEvent.pointerUp(groupOf('Agent block: reviewer'));
    fireEvent.click(groupOf('Agent block: reviewer'));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(drawingOf(container));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'none' });
  });

  it('F-12 AC-012 (UI) ends the drag without a change when the drop lands on nothing', () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />,
    );
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'));
    fireEvent.pointerMove(drawingOf(container), { clientX: 300, clientY: 400 });
    fireEvent.pointerUp(drawingOf(container));
    expect(previewOf(container)).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(bandText()).toBeNull();
  });
});

describe('F-12 AC-014 to AC-018 (UI) a refused drop shows its reason and changes nothing', () => {
  it('F-12 AC-015 (UI) refuses a drop on the block itself with the reason', () => {
    const onChange = vi.fn();
    renderWithTheme(<BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />);
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'));
    fireEvent.pointerUp(groupOf('Agent block: planner'));
    expect(bandText()).toBe('Refused · A block cannot link to itself.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-12 AC-014 (UI) refuses a Start linked to an End with the reason', () => {
    renderWithTheme(<BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    fireEvent.pointerDown(portOf(groupOf('Start block'), 'next'));
    fireEvent.pointerUp(groupOf('End block'));
    expect(bandText()).toBe('Refused · A Start links to an Agent or a Condition.');
  });

  it('F-12 AC-015 (UI) refuses a second arrow from an output that already has one', () => {
    renderWithTheme(<BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    fireEvent.pointerDown(portOf(groupOf('Start block'), 'next'));
    fireEvent.pointerUp(groupOf('Agent block: reviewer'));
    expect(bandText()).toBe('Refused · This block already has an arrow from this point.');
  });

  it('F-12 AC-016 (UI) refuses an Agent linked back to an earlier Agent', () => {
    renderWithTheme(<BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    fireEvent.pointerDown(portOf(groupOf('Agent block: reviewer'), 'next'));
    fireEvent.pointerUp(groupOf('Agent block: planner'));
    expect(bandText()).toBe('Refused · Only a false route can return to an earlier Agent.');
  });

  it('F-12 AC-018 (UI) a drag that starts at an input point does not start a link', () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />,
    );
    fireEvent.pointerDown(portOf(groupOf('Agent block: reviewer'), 'input'));
    fireEvent.pointerMove(drawingOf(container), { clientX: 300, clientY: 400 });
    expect(previewOf(container)).toBeNull();
    fireEvent.pointerUp(groupOf('Agent block: planner'));
    expect(onChange).not.toHaveBeenCalled();
    expect(bandText()).toBeNull();
  });

  it('F-12 AC-018 (UI) refuses a drop on the Start, which has no input point', () => {
    renderWithTheme(<BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    fireEvent.pointerDown(portOf(groupOf('Agent block: reviewer'), 'next'));
    fireEvent.pointerUp(groupOf('Start block'));
    expect(bandText()).toBe('Refused · A Start has no input point.');
  });

  it('F-12 AC-012 (UI) clears the refusal when a later drag is accepted', () => {
    const onChange = vi.fn();
    renderWithTheme(<BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />);
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'));
    fireEvent.pointerUp(groupOf('Agent block: planner'));
    expect(bandText()).not.toBeNull();
    fireEvent.pointerDown(portOf(groupOf('Agent block: reviewer'), 'next'));
    fireEvent.pointerUp(groupOf('End block'));
    expect(bandText()).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('F-12 AC-019 (UI) dragging an end of the selected arrow moves that end', () => {
  const selected = { kind: 'blockArrow', fromId: 'block-2', output: 'next' } as const;

  it('F-12 AC-019 (UI) draws a handle on each end of the selected arrow', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={linkedFlow} selection={selected} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    expect(container.querySelectorAll('[data-handle]')).toHaveLength(2);
  });

  it('F-12 AC-019 (UI) moves the target end onto another block through the same rules', () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={linkedFlow} selection={selected} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />,
    );
    fireEvent.pointerDown(drawingOf(container).querySelector('[data-handle="target"]') as Element);
    fireEvent.pointerUp(groupOf('End block'));
    expect(onChange).toHaveBeenCalledWith({
      ...linkedFlow,
      blocks: linkedFlow.blocks.map((block) => (block.id === 'block-2' && block.kind === 'agent' ? { ...block, next: 'block-4' } : block)),
    });
  });

  it('F-12 AC-019 (UI) keeps the arrow and shows the reason when the moved end is refused', () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={linkedFlow} selection={selected} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />,
    );
    fireEvent.pointerDown(drawingOf(container).querySelector('[data-handle="target"]') as Element);
    fireEvent.pointerUp(groupOf('Start block'));
    expect(bandText()).toBe('Refused · A Start has no input point.');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-12 AC-019 (UI) moves the source end onto an output point of another block', () => {
    const onChange = vi.fn();
    // The Start's output is free in this flow, so the source end can take it.
    const freeStart: Flow = {
      ...linkedFlow,
      blocks: linkedFlow.blocks.map((block) => (block.id === 'block-1' && block.kind === 'start' ? { ...block, next: '' } : block)),
    };
    const { container } = renderWithTheme(
      <BlockCanvas flow={freeStart} selection={selected} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />,
    );
    fireEvent.pointerDown(drawingOf(container).querySelector('[data-handle="source"]') as Element);
    fireEvent.pointerUp(portOf(groupOf('Start block'), 'next'));
    expect(onChange).toHaveBeenCalledWith({
      ...freeStart,
      blocks: freeStart.blocks.map((block) => {
        if (block.id === 'block-1' && block.kind === 'start') return { ...block, next: 'block-3' };
        if (block.id === 'block-2' && block.kind === 'agent') return { ...block, next: '' };
        return block;
      }),
    });
  });

  it('F-12 AC-015 (UI) refuses a source end moved onto an output point that already has an arrow', () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={linkedFlow} selection={selected} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />,
    );
    fireEvent.pointerDown(drawingOf(container).querySelector('[data-handle="source"]') as Element);
    fireEvent.pointerUp(portOf(groupOf('Start block'), 'next'));
    expect(bandText()).toBe('Refused · This block already has an arrow from this point.');
    expect(onChange).not.toHaveBeenCalled();
  });
});
