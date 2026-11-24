// @vitest-environment jsdom
import type { ComponentProps, ReactElement } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { Connection, Edge, ReactFlow as ReactFlowComponent } from '@xyflow/react';
import type { pipeline as model } from '@sddbuilder/core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Canvas } from '../src/builder/Canvas.js';
import { flowBoxHeight, flowBoxWidth } from '../src/builder/drawing.js';
import type { Pipeline } from '../src/builder/model.js';
import type { Selection } from '../src/builder/panel.js';
import { theme } from '../src/theme.js';

// The canvas is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

type ReactFlowProps = ComponentProps<typeof ReactFlowComponent>;
type ReconnectStartEvent = Parameters<NonNullable<ReactFlowProps['onReconnectStart']>>[0];
type NodeClick = NonNullable<ReactFlowProps['onNodeClick']>;
type EdgeClick = NonNullable<ReactFlowProps['onEdgeClick']>;
type PaneClick = NonNullable<ReactFlowProps['onPaneClick']>;

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
  options: { blockedFlowIds?: string[]; selection?: Selection } = {},
) {
  const onPipelineChange = vi.fn<(next: Pipeline) => void>();
  const onSelect = vi.fn<(selection: Selection) => void>();
  renderWithTheme(
    <Canvas
      pipelineState={pipeline}
      blockedFlowIds={options.blockedFlowIds ?? []}
      selection={options.selection ?? { kind: 'pipeline' }}
      onPipelineChange={onPipelineChange}
      onSelect={onSelect}
    />,
  );
  return { onPipelineChange, onSelect };
}

// Renders the canvas with a pipeline that the test can replace, as the wizard does after an edit (AC-005).
function renderWithRerender(pipeline: Pipeline) {
  const noop = (): void => {};
  const view = renderWithTheme(
    <Canvas pipelineState={pipeline} blockedFlowIds={[]} selection={{ kind: 'pipeline' }} onPipelineChange={noop} onSelect={noop} />,
  );
  return {
    rerender: (next: Pipeline) =>
      view.rerender(
        <ThemeProvider theme={theme}>
          <Canvas pipelineState={next} blockedFlowIds={[]} selection={{ kind: 'pipeline' }} onPipelineChange={noop} onSelect={noop} />
        </ThemeProvider>,
      ),
  };
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

  it('F-11 AC-035 draws the empty message, and no band line, for a pipeline with no flow', () => {
    renderCanvas(pipelineOf());
    expect(screen.getByText('No flows yet.')).toBeTruthy();
    expect(bandText()).toBe('');
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

describe('F-11 AC-042 the canvas reports the selection of a box, an arrow or the empty canvas', () => {
  it('F-11 AC-042 a click on a flow box selects that flow', () => {
    const { onSelect } = renderCanvas(pipelineOf(flow('specify', { next: 'plan' }), flow('plan')));
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: 'plan' } as Parameters<NodeClick>[1]);
    });
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'flow', id: 'plan' });
  });

  it('F-11 AC-042 a click on an arrow selects that arrow by its two flows', () => {
    const { onSelect } = renderCanvas(pipelineOf(flow('specify', { next: 'plan' }), flow('plan')));
    act(() => {
      flowProps().onEdgeClick?.({} as Parameters<EdgeClick>[0], { id: 'specify->plan', source: 'specify', target: 'plan' } as Edge);
    });
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'arrow', arrow: { source: 'specify', target: 'plan' } });
  });

  it('F-11 AC-042 a click on the empty canvas selects the pipeline', () => {
    const { onSelect } = renderCanvas(pipelineOf(flow('specify')));
    act(() => {
      flowProps().onPaneClick?.({} as Parameters<PaneClick>[0]);
    });
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'pipeline' });
  });
});

// The edge the canvas gave to React Flow for an arrow. React Flow draws no edge path in jsdom (it measures
// the handles in the browser), so the style the canvas sets on the edge is what the test checks.
function edgeOf(id: string): Edge {
  const edge = flowProps().edges?.find((item) => item.id === id);
  if (edge === undefined) {
    throw new Error(`no arrow ${id}`);
  }
  return edge;
}

describe('F-11 AC-042 the selected box and arrow are drawn with the selected style', () => {
  it('F-11 AC-042 the selected flow box has the 2 px primary outline; an unselected box does not', () => {
    renderCanvas(pipelineOf(flow('specify', { next: 'plan' }), flow('plan')), {
      selection: { kind: 'flow', id: 'plan' },
    });
    const selected = getComputedStyle(boxOf('plan'));
    expect(selected.borderTopColor).toBe(rgbOf(theme.palette.primary.main));
    expect(selected.borderTopWidth).toBe('2px');
    const unselected = getComputedStyle(boxOf('specify'));
    expect(unselected.borderTopWidth).toBe('1.5px');
  });

  it('F-11 AC-042 the selected arrow has the primary colour and a 2.5 px stroke; the other arrows do not', () => {
    renderCanvas(
      pipelineOf(flow('specify', { next: 'plan' }), flow('plan', { next: 'build' }), flow('build')),
      { selection: { kind: 'arrow', arrow: { source: 'plan', target: 'build' } } },
    );
    const selected = edgeOf('plan->build');
    expect(selected.style).toEqual({ stroke: theme.palette.primary.main, strokeWidth: 2.5 });
    expect(selected.markerEnd).toMatchObject({ color: theme.palette.primary.main });
    const other = edgeOf('specify->plan');
    expect(other.style).toBeUndefined();
    expect(other.markerEnd).not.toMatchObject({ color: theme.palette.primary.main });
  });

  it('F-11 AC-042 with the pipeline selected no box and no arrow has the selected style', () => {
    renderCanvas(pipelineOf(flow('specify', { next: 'plan' }), flow('plan')));
    expect(getComputedStyle(boxOf('specify')).borderTopWidth).toBe('1.5px');
    expect(getComputedStyle(boxOf('plan')).borderTopWidth).toBe('1.5px');
    expect(edgeOf('specify->plan').style).toBeUndefined();
  });
});

describe('F-11 AC-005 boxes are dragged on the canvas and the pipeline is not changed', () => {
  it('F-11 AC-005 every flow box is draggable', () => {
    renderCanvas(pipelineOf(flow('specify'), flow('plan')));
    expect(flowProps().nodesDraggable).toBe(true);
    expect(flowProps().nodes?.every((node) => node.draggable === true)).toBe(true);
  });

  it('F-11 AC-005 a drag moves the box where it was dropped and reports no pipeline change', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('specify'), flow('plan')));
    act(() => {
      flowProps().onNodesChange?.([{ type: 'position', id: 'plan', position: { x: 300, y: 40 }, dragging: false }]);
    });
    expect(onPipelineChange).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLElement>('.react-flow__node[data-id="plan"]')?.style.transform).toBe(
      'translate(300px,40px)',
    );
  });

  it('F-11 AC-005 a dragged place is dropped when the layout changes', () => {
    const pipeline = pipelineOf(flow('specify'), flow('plan'));
    const { rerender } = renderWithRerender(pipeline);
    act(() => {
      flowProps().onNodesChange?.([{ type: 'position', id: 'plan', position: { x: 300, y: 40 }, dragging: false }]);
    });
    rerender(pipelineOf(flow('specify'), flow('plan', { next: 'specify' })));
    expect(document.querySelector<HTMLElement>('.react-flow__node[data-id="plan"]')?.style.transform).toBe(
      'translate(110px,0px)',
    );
  });

  it('F-11 AC-005 a dragged place is not brought back when the layout returns to an earlier one', () => {
    const { rerender } = renderWithRerender(pipelineOf(flow('specify'), flow('plan')));
    act(() => {
      flowProps().onNodesChange?.([{ type: 'position', id: 'plan', position: { x: 300, y: 40 }, dragging: false }]);
    });
    rerender(pipelineOf(flow('specify'), flow('plan', { next: 'specify' })));
    rerender(pipelineOf(flow('specify'), flow('plan')));
    expect(document.querySelector<HTMLElement>('.react-flow__node[data-id="plan"]')?.style.transform).toBe(
      'translate(110px,0px)',
    );
  });
});

// React Flow draws an arrow only when both of its boxes are measured. This block lets the boxes measure at
// their drawn size after mount, as a browser does, so the arrows can be counted.
describe('F-11 AC-005 the arrows of a dragged box stay drawn', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(flowBoxWidth);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(flowBoxHeight);
    // React Flow reads the viewport zoom from the transform matrix when it measures; jsdom has no
    // DOMMatrixReadOnly, and the canvas zoom is fixed at 1.
    vi.stubGlobal(
      'DOMMatrixReadOnly',
      class {
        readonly m22 = 1;
      },
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private readonly callback: ResizeObserverCallback;

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
        }

        observe(target: Element): void {
          queueMicrotask(() => {
            this.callback([{ target } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
          });
        }

        unobserve(): void {}

        disconnect(): void {}
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function arrowCount(): number {
    return document.querySelectorAll('.react-flow__edge').length;
  }

  it('F-11 AC-005 keeps every arrow drawn while a box is dragged and after it is dropped', async () => {
    renderCanvas(
      pipelineOf(
        flow('specify', { next: 'ux' }),
        flow('ux', { next: 'plan' }),
        flow('plan', { next: 'build' }),
        flow('build'),
      ),
    );
    await act(async () => {});
    expect(arrowCount()).toBe(3);
    act(() => {
      flowProps().onNodesChange?.([{ type: 'position', id: 'ux', position: { x: 150, y: 40 }, dragging: true }]);
    });
    expect(arrowCount()).toBe(3);
    act(() => {
      flowProps().onNodesChange?.([{ type: 'position', id: 'ux', position: { x: 160, y: 40 }, dragging: false }]);
    });
    expect(arrowCount()).toBe(3);
  });
});
