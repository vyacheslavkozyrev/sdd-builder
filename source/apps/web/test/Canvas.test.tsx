// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen } from '@testing-library/react';
import type { pipeline as model } from '@sddbuilder/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Canvas } from '../src/builder/Canvas.js';
import type { Pipeline } from '../src/builder/model.js';
import { theme } from '../src/theme.js';

// The canvas is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

// React Flow creates a ResizeObserver when it mounts, and jsdom does not provide one. The boxes carry
// their own size in the drawing data, so an observer that never reports is enough here.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
});

// The canvas reads its colours from the app theme, so every render gets the same provider the app uses.
function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

type Flow = model.Flow;

function flow(id: string, options: { next?: string; blocks?: number } = {}): Flow {
  const base: Flow = {
    index: 0,
    id,
    name: id,
    arguments: [],
    body: 'Do the work.',
    artifacts: [],
    approval: false,
    blocks: Array.from({ length: options.blocks ?? 0 }, (_, n): model.Block => ({
      index: n,
      id: `block-${n}`,
      kind: 'end',
      outcome: 'done',
      producedArtifact: 'plan.md',
    })),
  };
  return options.next === undefined ? base : { ...base, next: options.next };
}

function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((f, i) => ({ ...f, index: i })),
  };
}

// The box of a flow: the React Flow node wrapper carries the flow id, and the box is its child.
function boxOf(id: string): HTMLElement {
  const node = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`);
  if (node === null) {
    throw new Error(`no node for ${id}`);
  }
  const box = node.firstElementChild;
  if (!(box instanceof HTMLElement)) {
    throw new Error(`no box inside node ${id}`);
  }
  return box;
}

// jsdom reports a computed colour as rgb(...), so a theme hex value is converted the same way.
function rgbOf(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

function nodeIds(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.react-flow__node')).map(
    (node) => node.dataset['id'] ?? '',
  );
}

describe('F-11 AC-009 empty canvas', () => {
  it('F-11 AC-009 shows "No flows yet." and no box or arrow with no flows', () => {
    renderWithTheme(<Canvas pipelineState={pipelineOf()} blockedFlowIds={[]} />);
    expect(screen.getByText('No flows yet.')).toBeTruthy();
    expect(document.querySelectorAll('.react-flow__node')).toHaveLength(0);
    expect(document.querySelectorAll('.react-flow__edge')).toHaveLength(0);
  });

  it('F-11 AC-009 hides the empty message once a flow is drawn', () => {
    renderWithTheme(<Canvas pipelineState={pipelineOf(flow('specify'))} blockedFlowIds={[]} />);
    expect(screen.queryByText('No flows yet.')).toBeNull();
  });
});

describe('F-11 AC-006 boxes in one row', () => {
  it('F-11 AC-006 draws one box per flow, left to right in pipeline order', () => {
    renderWithTheme(
      <Canvas
        pipelineState={pipelineOf(flow('specify', { next: 'ux' }), flow('ux', { next: 'plan' }), flow('plan'))}
        blockedFlowIds={[]}
      />,
    );
    expect(nodeIds()).toEqual(['specify', 'ux', 'plan']);
    expect(screen.getByText('ux')).toBeTruthy();
  });

  it('F-11 AC-006 names each box and shows its block count', () => {
    renderWithTheme(
      <Canvas
        pipelineState={pipelineOf(flow('specify', { blocks: 3 }), flow('plan', { blocks: 1 }))}
        blockedFlowIds={[]}
      />,
    );
    expect(boxOf('specify').textContent).toContain('specify');
    expect(boxOf('specify').textContent).toContain('3 blocks');
    expect(boxOf('plan').textContent).toContain('1 block');
  });

  it('F-11 AC-006 gives each box a left and a right connection point', () => {
    renderWithTheme(<Canvas pipelineState={pipelineOf(flow('specify'))} blockedFlowIds={[]} />);
    const box = boxOf('specify');
    expect(box.querySelector('.react-flow__handle-left')).not.toBeNull();
    expect(box.querySelector('.react-flow__handle-right')).not.toBeNull();
  });
});

describe('F-11 AC-035 red box for a blocked flow', () => {
  it('F-11 AC-035 gives a blocked flow the blocker border and light red fill from the theme', () => {
    renderWithTheme(<Canvas pipelineState={pipelineOf(flow('specify'), flow('plan'))} blockedFlowIds={['plan']} />);
    const blocked = getComputedStyle(boxOf('plan'));
    expect(blocked.borderTopColor).toBe(rgbOf(theme.palette.error.main));
    expect(blocked.backgroundColor).toBe(rgbOf(theme.palette.error.light));
  });

  it('F-11 AC-035 leaves an unblocked flow with the normal border and white fill', () => {
    renderWithTheme(<Canvas pipelineState={pipelineOf(flow('specify'), flow('plan'))} blockedFlowIds={['plan']} />);
    const normal = getComputedStyle(boxOf('specify'));
    expect(normal.borderTopColor).toBe(rgbOf(theme.palette.primary.main));
    expect(normal.backgroundColor).toBe(rgbOf(theme.palette.background.paper));
  });
});
