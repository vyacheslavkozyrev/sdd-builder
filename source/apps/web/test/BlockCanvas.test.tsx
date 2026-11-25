// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BlockCanvas } from '../src/builder/BlockCanvas.js';
import { blockDrawingOf } from '../src/builder/blockDrawing.js';
import type { Flow } from '../src/builder/model.js';
import type { BlockSelection } from '../src/builder/panel.js';
import type { StructureMarks } from '../src/builder/marks.js';
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

// start -> planner -> End, the reviewer open: the End is drawn after the reviewer, so the planner's arrow to the reviewer
// does not run through it (F-12 AC-009, amended 2026-11-23).
const endLastFlow: Flow = {
  ...emptyFlow,
  blocks: [
    { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
    { index: 1, id: 'block-2', kind: 'agent', name: 'planner', description: '', arguments: [], next: 'block-4' },
    { index: 2, id: 'block-3', kind: 'agent', name: 'reviewer', description: '', arguments: [], next: '' },
    { index: 3, id: 'block-4', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

describe('F-12 AC-009 (UI) the End block is drawn last', () => {
  it('F-12 AC-009 (UI) draws the End circle after every other block of the flow', () => {
    renderWithTheme(<BlockCanvas flow={endLastFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    const blockNames = screen
      .getAllByRole('button', { name: /block/ })
      .map((group) => group.getAttribute('aria-label'));
    expect(blockNames).toEqual(['Start block', 'Agent block: planner', 'Agent block: reviewer', 'End block']);
  });
});

describe('F-12 AC-002 (UI) the toolbox adds a block on this canvas', () => {
  it('F-12 AC-002 (UI) passes the kind of a toolbox press to onAdd', () => {
    const onAdd = vi.fn();
    renderWithTheme(<BlockCanvas flow={emptyFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={onAdd} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    expect(onAdd).toHaveBeenCalledWith('agent');
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

describe('F-12 AC-013 (UI) connection points look like the F-11 handles', () => {
  it('F-12 AC-013 (UI) draws a 2.5 px accent dot with a 1 px paper ring, and a transparent 6 px hit area around it', () => {
    renderWithTheme(<BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    const [hit, dot] = Array.from(portOf(groupOf('Agent block: planner'), 'next').querySelectorAll('circle'));
    expect(hit?.getAttribute('r')).toBe('6');
    expect(hit?.getAttribute('fill')).toBe('none');
    expect(hit?.getAttribute('pointer-events')).toBe('all');
    expect(dot?.getAttribute('r')).toBe('2.5');
    expect(dot?.getAttribute('fill')).toBe(theme.palette.primary.main);
    expect(dot?.getAttribute('stroke')).toBe(theme.palette.background.paper);
    expect(dot?.getAttribute('stroke-width')).toBe('1');
    expect(dot?.getAttribute('pointer-events')).toBe('none');
  });

  it('F-12 AC-013 (UI) a press on an output point starts a link and does not move its block', () => {
    const { container } = renderWithTheme(<BlockCanvas flow={dragFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />);
    const plannerX = () => Number(groupOf('Agent block: planner').querySelector('rect')?.getAttribute('x'));
    const before = plannerX();
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 140, clientY: 420 });
    expect(previewOf(container)).not.toBeNull();
    expect(plannerX()).toBe(before);
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

describe('F-12 (no criterion: Verify device fix 2026-11-23) the selected style matches F-11', () => {
  it('F-12 AC-007 (UI) draws a selected block with a 2 px primary outline on the paper', () => {
    renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'block', blockId: 'block-2' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const frame = groupOf('Agent block: planner').querySelector('rect');
    expect(frame?.getAttribute('stroke')).toBe(theme.palette.primary.main);
    expect(frame?.getAttribute('stroke-width')).toBe('2');
    expect(frame?.getAttribute('fill')).toBe(theme.palette.background.paper);
  });

  it('F-12 AC-008 (UI) draws a selected arrow in the primary colour at 2.5 px', () => {
    const { container } = renderWithTheme(
      <BlockCanvas
        flow={loopFlow}
        selection={{ kind: 'blockArrow', fromId: 'block-2', output: 'next' }}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onChange={vi.fn()}
      />,
    );
    const selected = container.querySelector('path[stroke-width="2.5"]');
    expect(selected?.getAttribute('stroke')).toBe(theme.palette.primary.main);
  });

  it('F-12 AC-008 (UI) draws a normal arrow at 1 px with a closed 12.5 px arrowhead in the stroke colour', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const normal = container.querySelector('path[marker-end="url(#block-arrowhead)"]');
    expect(normal?.getAttribute('stroke-width')).toBe('1');
    expect(normal?.getAttribute('stroke')).toBe(theme.palette.text.secondary);
    const marker = container.querySelector('marker#block-arrowhead');
    expect(marker?.getAttribute('markerWidth')).toBe('12.5');
    expect(marker?.getAttribute('markerHeight')).toBe('12.5');
    expect(marker?.getAttribute('viewBox')).toBe('-10 -10 20 20');
    expect(marker?.getAttribute('markerUnits')).toBe('strokeWidth');
    expect(marker?.getAttribute('orient')).toBe('auto-start-reverse');
    expect(marker?.querySelector('polyline')?.getAttribute('points')).toBe('-5,-4 0,0 -5,4 -5,-4');
    expect(marker?.querySelector('polyline')?.getAttribute('stroke-linecap')).toBe('round');
  });

  it('draws the return and selected arrowheads with the same closed shape as the normal one', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const normal = container.querySelector('marker#block-arrowhead');
    const accent = container.querySelector('marker#block-arrowhead-accent');
    for (const attribute of ['markerWidth', 'markerHeight', 'viewBox', 'refX', 'refY', 'markerUnits', 'orient']) {
      expect(accent?.getAttribute(attribute)).toBe(normal?.getAttribute(attribute));
    }
    expect(accent?.querySelector('polyline')?.getAttribute('points')).toBe(normal?.querySelector('polyline')?.getAttribute('points'));
    expect(accent?.querySelector('polyline')?.getAttribute('fill')).toBe(theme.palette.primary.main);
    expect(container.querySelector('marker path')).toBeNull();
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-23) the drawing keeps its own size in the canvas card', () => {
  it('draws the svg at the drawing width and height, without a viewBox that scales it', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const drawing = drawingOf(container);
    const own = blockDrawingOf(loopFlow);
    expect(drawing.getAttribute('width')).toBe(String(own.width));
    expect(drawing.getAttribute('height')).toBe(String(own.height));
    expect(drawing.hasAttribute('viewBox')).toBe(false);
  });

  it('reads a drag at the natural size, offset by the svg box', () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />,
    );
    const own = blockDrawingOf(loopFlow);
    // The svg sits 10 px right and 20 px down in the page, and one pixel is one drawing unit.
    vi.spyOn(drawingOf(container), 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      width: own.width,
      height: own.height,
      right: 10 + own.width,
      bottom: 20 + own.height,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);
    const plannerX = () => Number(groupOf('Agent block: planner').querySelector('rect')?.getAttribute('x'));
    const before = plannerX();
    fireEvent.pointerDown(groupOf('Agent block: planner'), { clientX: 210, clientY: 860 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 250, clientY: 860 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 250, clientY: 860 });
    expect(plannerX()).toBe(before + 40);
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-23) a block can be dragged on the canvas', () => {
  it('moves the block with its pointer, keeps the place while the flow tab stays open, and does not change the flow', () => {
    const onChange = vi.fn();
    const { container, rerender } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />,
    );
    const plannerX = () => Number(groupOf('Agent block: planner').querySelector('rect')?.getAttribute('x'));
    const before = plannerX();
    fireEvent.pointerDown(groupOf('Agent block: planner'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 140, clientY: 420 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 140, clientY: 420 });
    expect(plannerX()).toBe(before + 40);
    expect(onChange).not.toHaveBeenCalled();
    rerender(
      <ThemeProvider theme={theme}>
        <BlockCanvas
          flow={loopFlow}
          selection={{ kind: 'block', blockId: 'block-2' }}
          onSelect={vi.fn()}
          onAdd={vi.fn()}
          onChange={onChange}
        />
      </ThemeProvider>,
    );
    expect(plannerX()).toBe(before + 40);
  });

  it('keeps the moved place of each flow tab when another flow tab is moved', () => {
    const other: Flow = { ...loopFlow, id: 'other-flow' };
    const { container, rerender } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const plannerX = () => Number(groupOf('Agent block: planner').querySelector('rect')?.getAttribute('x'));
    const before = plannerX();
    fireEvent.pointerDown(groupOf('Agent block: planner'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 140, clientY: 420 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 140, clientY: 420 });
    const showFlow = (flow: Flow) => (
      <ThemeProvider theme={theme}>
        <BlockCanvas flow={flow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />
      </ThemeProvider>
    );
    rerender(showFlow(other));
    expect(plannerX()).toBe(before);
    fireEvent.pointerDown(groupOf('Agent block: planner'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 160, clientY: 420 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 160, clientY: 420 });
    expect(plannerX()).toBe(before + 60);
    rerender(showFlow(loopFlow));
    expect(plannerX()).toBe(before + 40);
  });

  it('does not select the block that a move ends on', () => {
    const onSelect = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={onSelect} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    fireEvent.pointerDown(groupOf('Agent block: planner'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 140, clientY: 420 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 140, clientY: 420 });
    fireEvent.click(groupOf('Agent block: planner'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('still selects a block that is pressed and released without a move', () => {
    const onSelect = vi.fn();
    renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={onSelect} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    fireEvent.pointerDown(groupOf('Agent block: planner'), { clientX: 100, clientY: 420 });
    fireEvent.pointerUp(groupOf('Agent block: planner'), { clientX: 100, clientY: 420 });
    fireEvent.click(groupOf('Agent block: planner'));
    expect(onSelect).toHaveBeenCalledWith({ kind: 'block', blockId: 'block-2' });
  });

  it('starts a link, not a move, when the press is on a connection point', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const plannerX = () => Number(groupOf('Agent block: planner').querySelector('rect')?.getAttribute('x'));
    const before = plannerX();
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 160, clientY: 420 });
    expect(previewOf(container)).not.toBeNull();
    expect(plannerX()).toBe(before);
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-23) the error panel sits in the flow canvas card', () => {
  const blocker: StructureMarks = {
    findings: [
      {
        finding: { severity: 'blocker', rule: 'test-rule', path: 'pipeline.flows.0', message: 'plan is not connected.' },
        placement: { kind: 'flow', flowId: 'plan' },
        label: { location: 'plan', message: 'plan is not connected.' },
      },
    ],
    blockedFlowIds: ['plan'],
  };

  it('shows the error counter inside the canvas card, under the toolbox', () => {
    renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} marks={blocker} />,
    );
    const card = screen.getByRole('region', { name: 'Flow canvas' });
    expect(within(card).getByRole('button', { name: '1 error' })).not.toBeNull();
  });

  it('shows no error counter when the flow has no finding', () => {
    renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: '1 error' })).toBeNull();
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-24) a press on the empty drawing pans it', () => {
  // jsdom does not capture pointers, so the drawing's capture is a mock here.
  function mockCapture(container: HTMLElement): void {
    Object.defineProperty(drawingOf(container), 'setPointerCapture', { value: vi.fn(), configurable: true });
  }
  // The drawing's content sits in one group, moved by the pan offset.
  function contentOf(container: HTMLElement): SVGGElement {
    const group = drawingOf(container).querySelector(':scope > g');
    if (group === null) {
      throw new Error('the drawing has no content group');
    }
    return group as SVGGElement;
  }
  const transformOf = (container: HTMLElement): string | null => contentOf(container).getAttribute('transform');

  it('moves the drawing by the pointer move when the press is on the empty drawing', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    mockCapture(container);
    fireEvent.pointerDown(drawingOf(container), { clientX: 300, clientY: 300 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 250, clientY: 280 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 250, clientY: 280 });
    expect(transformOf(container)).toBe('translate(-50 -20)');
  });

  it('does not move the drawing for a press that stays inside the slop', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    mockCapture(container);
    fireEvent.pointerDown(drawingOf(container), { clientX: 300, clientY: 300 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 302, clientY: 301 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 302, clientY: 301 });
    expect(transformOf(container)).toBe('translate(0 0)');
  });

  it('clears the selection on a press without movement', () => {
    const onSelect = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'block', blockId: 'block-2' }} onSelect={onSelect} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    mockCapture(container);
    fireEvent.pointerDown(drawingOf(container), { clientX: 300, clientY: 300 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 300, clientY: 300 });
    fireEvent.click(drawingOf(container));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'none' });
  });

  it('keeps the selection after a pan: the click that ends the pan does not clear it', () => {
    const onSelect = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'block', blockId: 'block-2' }} onSelect={onSelect} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    mockCapture(container);
    fireEvent.pointerDown(drawingOf(container), { clientX: 300, clientY: 300 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 260, clientY: 300 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 260, clientY: 300 });
    fireEvent.click(drawingOf(container));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not pan when the press is on a block: the block moves and the drawing stays', () => {
    const onChange = vi.fn();
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={onChange} />,
    );
    mockCapture(container);
    const plannerX = () => Number(groupOf('Agent block: planner').querySelector('rect')?.getAttribute('x'));
    const before = plannerX();
    fireEvent.pointerDown(groupOf('Agent block: planner'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 140, clientY: 420 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 140, clientY: 420 });
    expect(plannerX()).toBe(before + 40);
    expect(transformOf(container)).toBe('translate(0 0)');
    expect(drawingOf(container).setPointerCapture).not.toHaveBeenCalled();
  });

  it('moves a block by the pointer move while the drawing is panned, not by the pan', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    mockCapture(container);
    const plannerX = () => Number(groupOf('Agent block: planner').querySelector('rect')?.getAttribute('x'));
    fireEvent.pointerDown(drawingOf(container), { clientX: 300, clientY: 300 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 250, clientY: 280 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 250, clientY: 280 });
    const before = plannerX();
    fireEvent.pointerDown(groupOf('Agent block: planner'), { clientX: 100 - 50, clientY: 420 - 20 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 140 - 50, clientY: 420 - 20 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 140 - 50, clientY: 420 - 20 });
    expect(plannerX()).toBe(before + 40);
  });

  it('captures the pointer on a press on the empty drawing, so the pan goes on past the drawing', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    mockCapture(container);
    fireEvent.pointerDown(drawingOf(container), { clientX: 300, clientY: 300 });
    expect(drawingOf(container).setPointerCapture).toHaveBeenCalledTimes(1);
    fireEvent.pointerMove(drawingOf(container), { clientX: 200, clientY: 300 });
    expect(transformOf(container)).toBe('translate(-100 0)');
  });

  it('ends the pan when the browser cancels the pointer, so a later move does not move the drawing', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    mockCapture(container);
    fireEvent.pointerDown(drawingOf(container), { clientX: 300, clientY: 300 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 250, clientY: 300 });
    fireEvent.pointerCancel(drawingOf(container));
    fireEvent.pointerMove(drawingOf(container), { clientX: 100, clientY: 300 });
    expect(transformOf(container)).toBe('translate(-50 0)');
  });

  it('keeps the offset of each flow tab while the tab stays open', () => {
    const other: Flow = { ...loopFlow, id: 'other-flow' };
    const showFlow = (flow: Flow) => (
      <ThemeProvider theme={theme}>
        <BlockCanvas flow={flow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />
      </ThemeProvider>
    );
    const { container, rerender } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    mockCapture(container);
    fireEvent.pointerDown(drawingOf(container), { clientX: 300, clientY: 300 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 250, clientY: 280 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 250, clientY: 280 });
    rerender(showFlow(other));
    expect(transformOf(container)).toBe('translate(0 0)');
    rerender(showFlow(loopFlow));
    expect(transformOf(container)).toBe('translate(-50 -20)');
  });

  it('draws the link preview from the point to the pointer in the drawing units while the drawing is panned', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    mockCapture(container);
    fireEvent.pointerDown(drawingOf(container), { clientX: 300, clientY: 300 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 250, clientY: 280 });
    fireEvent.pointerUp(drawingOf(container), { clientX: 250, clientY: 280 });
    const point = portOf(groupOf('Agent block: planner'), 'next').querySelector('circle');
    const cx = Number(point?.getAttribute('cx'));
    const cy = Number(point?.getAttribute('cy'));
    // The pan is (-50, -20): the page point (200, 300) is (250, 320) in the drawing's units.
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'), { clientX: cx - 50, clientY: cy - 20 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 200, clientY: 300 });
    expect(previewOf(container)?.getAttribute('points')).toBe(`${cx},${cy} 250,320`);
  });

  it('does not pan when the press is on a connection point: the link starts', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    mockCapture(container);
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 160, clientY: 420 });
    expect(previewOf(container)).not.toBeNull();
    expect(transformOf(container)).toBe('translate(0 0)');
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-24) arrows stay curved while a block is dragged', () => {
  // Each arrow is drawn as one smooth cubic curve (as F-11's edges): "M start C control control end", with the same
  // start and end as the arrow's route. A forward arrow leaves and enters horizontally, a return (dashed) vertically.
  function expectCurvedArrows(container: HTMLElement): void {
    const arrows = Array.from(container.querySelectorAll('path[marker-end]'));
    expect(arrows.length).toBeGreaterThan(0);
    for (const arrow of arrows) {
      const path = arrow.getAttribute('d') ?? '';
      expect(path).toMatch(/^M-?[\d.]+,-?[\d.]+ C(-?[\d.]+,-?[\d.]+ ){2}-?[\d.]+,-?[\d.]+$/);
    }
  }

  it('keeps every arrow a curved route after an Agent block is dragged', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const before = groupOf('Agent block: planner').innerHTML;
    fireEvent.pointerDown(groupOf('Agent block: planner'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 100, clientY: 520 });
    expect(groupOf('Agent block: planner').innerHTML).not.toBe(before);
    expectCurvedArrows(container);
    fireEvent.pointerUp(drawingOf(container), { clientX: 100, clientY: 520 });
    expectCurvedArrows(container);
  });

  it('keeps the return arrow a curved route after the Condition it leaves is dragged', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const before = groupOf('Condition block: The reviewer approves').innerHTML;
    fireEvent.pointerDown(groupOf('Condition block: The reviewer approves'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 100, clientY: 380 });
    expect(groupOf('Condition block: The reviewer approves').innerHTML).not.toBe(before);
    fireEvent.pointerUp(drawingOf(container), { clientX: 100, clientY: 380 });
    expectCurvedArrows(container);
  });

  it('draws the link preview as a straight two-point line while a link is dragged', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    fireEvent.pointerDown(portOf(groupOf('Agent block: planner'), 'next'), { clientX: 100, clientY: 420 });
    fireEvent.pointerMove(drawingOf(container), { clientX: 160, clientY: 300 });
    const points = previewOf(container)?.getAttribute('points')?.trim().split(' ') ?? [];
    expect(points).toHaveLength(2);
  });
});

// The canvas area is measured on the stage: the test gives the stage a size through the client size getters, and a
// fake ResizeObserver that keeps the callback, so a resize can be replayed.
describe('F-12 (no criterion: Verify device fix 2026-11-23) the drawing fills the measured canvas area', () => {
  let width = 900;
  let height = 700;
  let resized: Array<() => void> = [];

  beforeEach(() => {
    width = 900;
    height = 700;
    resized = [];
    class FakeResizeObserver {
      constructor(callback: () => void) {
        resized.push(callback);
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => width);
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(() => height);
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('F-12 (no criterion: Verify device fix 2026-11-23) draws the svg at the measured area, without scaling it', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const drawing = drawingOf(container);
    expect(drawing.getAttribute('width')).toBe('900');
    expect(drawing.getAttribute('height')).toBe('700');
    expect(drawing.hasAttribute('viewBox')).toBe(false);
  });

  it('F-12 (no criterion: Verify device fix 2026-11-23) follows a resize of the canvas area', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    width = 1200;
    height = 800;
    act(() => {
      for (const callback of resized) callback();
    });
    expect(drawingOf(container).getAttribute('width')).toBe('1200');
    expect(drawingOf(container).getAttribute('height')).toBe('800');
  });

  it('F-12 (no criterion: Verify device fix 2026-11-23) never draws the flow smaller than its natural size', () => {
    width = 100;
    height = 100;
    const { container } = renderWithTheme(
      <BlockCanvas flow={loopFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const natural = blockDrawingOf(loopFlow);
    expect(drawingOf(container).getAttribute('width')).toBe(String(natural.width));
    expect(drawingOf(container).getAttribute('height')).toBe(String(natural.height));
  });

  it('F-12 AC-009 (UI) keeps the End circle last in the drawing across the spread width', () => {
    const { container } = renderWithTheme(
      <BlockCanvas flow={endLastFlow} selection={{ kind: 'none' }} onSelect={vi.fn()} onAdd={vi.fn()} onChange={vi.fn()} />,
    );
    const blocks = blockDrawingOf(endLastFlow, { kind: 'none' }, {}, { width: 900, height: 700 }).blocks;
    expect(blocks[blocks.length - 1]?.kind).toBe('end');
    expect(drawingOf(container).querySelector('[aria-label="End block"]')).not.toBeNull();
    expect(drawingOf(container).getAttribute('width')).toBe('900');
  });
});
