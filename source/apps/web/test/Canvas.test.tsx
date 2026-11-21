// @vitest-environment jsdom
import type { ComponentProps, ReactElement } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { Connection, Edge, ReactFlow as ReactFlowComponent } from '@xyflow/react';
import type { pipeline as model } from '@sddbuilder/core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Canvas } from '../src/builder/Canvas.js';
import type { Pipeline } from '../src/builder/model.js';
import { theme } from '../src/theme.js';

// The canvas is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

type ReactFlowProps = ComponentProps<typeof ReactFlowComponent>;
type ReconnectStartEvent = Parameters<NonNullable<ReactFlowProps['onReconnectStart']>>[0];

// The props the canvas gives to React Flow. The real component still renders; the wrapper only keeps
// the props, so a test can call the handlers the canvas wired (AC-013, AC-016) the way React Flow would.
const rendered = vi.hoisted(() => ({ props: undefined as ReactFlowProps | undefined }));

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    ReactFlow: (props: ReactFlowProps) => {
      rendered.props = props;
      return <actual.ReactFlow {...props} />;
    },
  };
});

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
  rendered.props = undefined;
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

// Renders the canvas with a change callback that the test can read.
function renderCanvas(
  pipeline: Pipeline,
  options: { blockedFlowIds?: string[]; blockerMessages?: string[] } = {},
) {
  const onPipelineChange = vi.fn<(next: Pipeline) => void>();
  renderWithTheme(
    <Canvas
      pipelineState={pipeline}
      blockedFlowIds={options.blockedFlowIds ?? []}
      blockerMessages={options.blockerMessages ?? []}
      onPipelineChange={onPipelineChange}
    />,
  );
  return { onPipelineChange };
}

// The React Flow props of the last render.
function flowProps(): ReactFlowProps {
  if (rendered.props === undefined) {
    throw new Error('React Flow was not rendered');
  }
  return rendered.props;
}

// A drag from a source's right point onto a target's handle, as React Flow reports it.
function dragTo(source: string, target: string, targetHandle: string | null): Connection {
  return { source, sourceHandle: 'right', target, targetHandle };
}

// Drags one end of the arrow `from` onto `to`: React Flow starts the reconnect, then reports the new connection.
// React Flow reports in onReconnectStart the type of the end that stays fixed, not the end being dragged.
function dragArrowEnd(end: 'source' | 'target', from: Edge, to: Connection): void {
  act(() => {
    flowProps().onReconnectStart?.({} as ReconnectStartEvent, from, end === 'source' ? 'target' : 'source');
  });
  act(() => {
    flowProps().onReconnect?.(from, to);
  });
}

function arrowOf(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target };
}

// The text of the message band, or an empty string when it shows nothing.
function bandText(): string {
  return screen.queryByRole('status')?.textContent ?? '';
}

describe('F-11 AC-009 empty canvas', () => {
  it('F-11 AC-009 shows "No flows yet." and no box or arrow with no flows', () => {
    renderCanvas(pipelineOf());
    expect(screen.getByText('No flows yet.')).toBeTruthy();
    expect(document.querySelectorAll('.react-flow__node')).toHaveLength(0);
    expect(document.querySelectorAll('.react-flow__edge')).toHaveLength(0);
  });

  it('F-11 AC-009 hides the empty message once a flow is drawn', () => {
    renderCanvas(pipelineOf(flow('specify')));
    expect(screen.queryByText('No flows yet.')).toBeNull();
  });
});

describe('F-11 AC-006 boxes in one row', () => {
  it('F-11 AC-006 draws one box per flow, left to right in pipeline order', () => {
    renderCanvas(pipelineOf(flow('specify', { next: 'ux' }), flow('ux', { next: 'plan' }), flow('plan')));
    expect(nodeIds()).toEqual(['specify', 'ux', 'plan']);
    expect(screen.getByText('ux')).toBeTruthy();
  });

  it('F-11 AC-006 names each box and shows its block count', () => {
    renderCanvas(pipelineOf(flow('specify', { blocks: 3 }), flow('plan', { blocks: 1 })));
    expect(boxOf('specify').textContent).toContain('specify');
    expect(boxOf('specify').textContent).toContain('3 blocks');
    expect(boxOf('plan').textContent).toContain('1 block');
  });

  it('F-11 AC-006 gives each box a left and a right connection point', () => {
    renderCanvas(pipelineOf(flow('specify')));
    const box = boxOf('specify');
    expect(box.querySelector('.react-flow__handle-left')).not.toBeNull();
    expect(box.querySelector('.react-flow__handle-right')).not.toBeNull();
  });
});

describe('F-11 AC-035 red box for a blocked flow', () => {
  it('F-11 AC-035 gives a blocked flow the blocker border and light red fill from the theme', () => {
    renderCanvas(pipelineOf(flow('specify'), flow('plan')), { blockedFlowIds: ['plan'] });
    const blocked = getComputedStyle(boxOf('plan'));
    expect(blocked.borderTopColor).toBe(rgbOf(theme.palette.error.main));
    expect(blocked.backgroundColor).toBe(rgbOf(theme.palette.error.light));
  });

  it('F-11 AC-035 leaves an unblocked flow with the normal border and white fill', () => {
    renderCanvas(pipelineOf(flow('specify'), flow('plan')), { blockedFlowIds: ['plan'] });
    const normal = getComputedStyle(boxOf('specify'));
    expect(normal.borderTopColor).toBe(rgbOf(theme.palette.primary.main));
    expect(normal.backgroundColor).toBe(rgbOf(theme.palette.background.paper));
  });

  it('F-11 AC-035 shows the blocker message in the band at the top centre', () => {
    renderCanvas(pipelineOf(flow('specify'), flow('plan')), {
      blockedFlowIds: ['plan'],
      blockerMessages: ['flow-2 is not connected.'],
    });
    expect(bandText()).toBe('Blocker · flow-2 is not connected.');
  });

  it('F-11 AC-035 shows the blocker message of an empty pipeline with the empty message', () => {
    renderCanvas(pipelineOf(), { blockerMessages: ['the pipeline has no flow.'] });
    expect(screen.getByText('No flows yet.')).toBeTruthy();
    expect(bandText()).toBe('Blocker · the pipeline has no flow.');
  });
});

describe('F-11 AC-013 a link is made by a drag from a right point onto a left point', () => {
  it('F-11 AC-013 wires the drag to dropLink: a drop on another flow\'s left point sets the source next', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('specify'), flow('plan')));
    act(() => {
      flowProps().onConnect?.(dragTo('specify', 'plan', 'left'));
    });
    expect(onPipelineChange).toHaveBeenCalledTimes(1);
    expect(onPipelineChange.mock.calls[0]?.[0].flows.map((f) => f.next)).toEqual(['plan', undefined]);
  });

  it('F-11 AC-013 a drag without a left point target changes nothing', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('specify'), flow('plan')));
    const drops: Connection[] = [
      dragTo('specify', 'plan', 'right'),
      dragTo('specify', 'plan', null),
      dragTo('specify', 'specify', 'left'),
    ];
    for (const drop of drops) {
      act(() => {
        flowProps().onConnect?.(drop);
      });
    }
    expect(onPipelineChange).not.toHaveBeenCalled();
    expect(bandText()).toBe('');
  });

  it('F-11 AC-013 the canvas connects by drag only: nodes are connectable and a click does not connect', () => {
    renderCanvas(pipelineOf(flow('specify'), flow('plan')));
    expect(flowProps().nodesConnectable).toBe(true);
    expect(flowProps().connectOnClick).toBe(false);
  });

  it('F-11 AC-013 a drag starts only at a right point: the left point cannot start a link', () => {
    renderCanvas(pipelineOf(flow('specify'), flow('plan')));
    const box = boxOf('plan');
    expect(box.querySelector('.react-flow__handle-right.connectablestart')).not.toBeNull();
    expect(box.querySelector('.react-flow__handle-left.connectablestart')).toBeNull();
  });
});

describe('F-11 AC-016 an arrow end moves by a drag onto a point', () => {
  it('F-11 AC-016 wires the target end drag to the repoint: the source next moves to the new target', () => {
    const { onPipelineChange } = renderCanvas(
      pipelineOf(flow('specify', { next: 'plan' }), flow('plan'), flow('ux')),
    );
    dragArrowEnd('target', arrowOf('specify', 'plan'), dragTo('specify', 'ux', 'left'));
    expect(onPipelineChange).toHaveBeenCalledTimes(1);
    expect(onPipelineChange.mock.calls[0]?.[0].flows[0]?.next).toBe('ux');
  });

  it('F-11 AC-016 wires the source end drag to the repoint: the arrow starts from the new flow', () => {
    const { onPipelineChange } = renderCanvas(
      pipelineOf(flow('specify', { next: 'plan' }), flow('plan'), flow('ux')),
    );
    dragArrowEnd('source', arrowOf('specify', 'plan'), {
      source: 'ux',
      sourceHandle: 'right',
      target: 'plan',
      targetHandle: 'left',
    });
    expect(onPipelineChange).toHaveBeenCalledTimes(1);
    const next = onPipelineChange.mock.calls[0]?.[0].flows.map((f) => f.next);
    expect(next).toEqual([undefined, undefined, 'plan']);
  });

  it('F-11 AC-016 a drag of an arrow end onto a flow body changes nothing', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('specify', { next: 'plan' }), flow('plan'), flow('ux')));
    dragArrowEnd('target', arrowOf('specify', 'plan'), {
      source: 'specify',
      sourceHandle: 'right',
      target: 'ux',
      targetHandle: null,
    });
    expect(onPipelineChange).not.toHaveBeenCalled();
  });
});

describe('F-11 AC-014 a refused drag shows its reason in the band', () => {
  it('F-11 AC-014 shows the reason of a second outgoing arrow and draws no new arrow', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('specify', { next: 'ux' }), flow('ux'), flow('plan')));
    act(() => {
      flowProps().onConnect?.(dragTo('specify', 'plan', 'left'));
    });
    expect(onPipelineChange).not.toHaveBeenCalled();
    expect(bandText()).toBe('Refused · flow "specify" already has an outgoing arrow to "ux"; remove it before adding another');
    expect(flowProps().edges?.map((edge) => edge.id)).toEqual(['specify->ux']);
  });

  it('F-11 AC-014 shows the reason of a loop', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('specify', { next: 'plan' }), flow('plan')));
    act(() => {
      flowProps().onConnect?.(dragTo('plan', 'specify', 'left'));
    });
    expect(onPipelineChange).not.toHaveBeenCalled();
    expect(bandText()).toContain('would make a loop');
  });

  it('F-11 AC-014 shows the reason of a refused repoint', () => {
    const { onPipelineChange } = renderCanvas(
      pipelineOf(flow('specify', { next: 'plan' }), flow('plan'), flow('ux', { next: 'specify' })),
    );
    dragArrowEnd('source', arrowOf('specify', 'plan'), dragTo('ux', 'plan', 'left'));
    expect(onPipelineChange).not.toHaveBeenCalled();
    expect(bandText()).toBe('Refused · flow "ux" already has an outgoing arrow to "specify"; remove it before adding another');
  });

  it('F-11 AC-014 clears the refusal when a later drag is accepted', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('specify', { next: 'plan' }), flow('plan'), flow('ux')));
    act(() => {
      flowProps().onConnect?.(dragTo('specify', 'ux', 'left'));
    });
    expect(bandText()).toContain('Refused');
    act(() => {
      flowProps().onConnect?.(dragTo('ux', 'plan', 'left'));
    });
    expect(onPipelineChange).toHaveBeenCalledTimes(1);
    expect(bandText()).toBe('');
  });
});
