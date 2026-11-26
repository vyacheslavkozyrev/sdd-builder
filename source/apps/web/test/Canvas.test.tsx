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
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08')));
    expect(screen.queryByText('No flows yet.')).toBeNull();
  });
});

describe('F-11 AC-006 boxes in one row', () => {
  it('F-11 AC-006 draws one box per flow, left to right in pipeline order', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: '47d4f7c9-a236-5d9b-b5a7-3f4724285515' }), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    expect(nodeIds()).toEqual(['2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'ea3211a4-b64b-5204-9451-6fe12fd7c655']);
    expect(screen.getByText('47d4f7c9-a236-5d9b-b5a7-3f4724285515')).toBeTruthy();
  });

  it('F-11 AC-006 names each box and shows its block count', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { blocks: 3 }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', { blocks: 1 })));
    expect(boxOf('2d8eebb4-9a34-5eae-ae8d-88813520de08').textContent).toContain('2d8eebb4-9a34-5eae-ae8d-88813520de08');
    expect(boxOf('2d8eebb4-9a34-5eae-ae8d-88813520de08').textContent).toContain('3 blocks');
    expect(boxOf('ea3211a4-b64b-5204-9451-6fe12fd7c655').textContent).toContain('1 block');
  });

  it('F-11 AC-006 gives each box a left and a right connection point', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08')));
    const box = boxOf('2d8eebb4-9a34-5eae-ae8d-88813520de08');
    expect(box.querySelector('.react-flow__handle-left')).not.toBeNull();
    expect(box.querySelector('.react-flow__handle-right')).not.toBeNull();
  });
});

describe('F-11 AC-035 red box for a blocked flow', () => {
  it('F-11 AC-035 gives a blocked flow the blocker border and light red fill from the theme', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')), { blockedFlowIds: ['ea3211a4-b64b-5204-9451-6fe12fd7c655'] });
    const blocked = getComputedStyle(boxOf('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(blocked.borderTopColor).toBe(rgbOf(theme.palette.error.main));
    expect(blocked.backgroundColor).toBe(rgbOf(theme.palette.error.light));
  });

  it('F-11 AC-035 leaves an unblocked flow with the normal border and white fill', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')), { blockedFlowIds: ['ea3211a4-b64b-5204-9451-6fe12fd7c655'] });
    const normal = getComputedStyle(boxOf('2d8eebb4-9a34-5eae-ae8d-88813520de08'));
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
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    act(() => {
      flowProps().onConnect?.(dragTo('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'left'));
    });
    expect(onPipelineChange).toHaveBeenCalledTimes(1);
    expect(onPipelineChange.mock.calls[0]?.[0].flows.map((f) => f.next)).toEqual(['ea3211a4-b64b-5204-9451-6fe12fd7c655', undefined]);
  });

  it('F-11 AC-013 a drag without a left point target changes nothing', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    const drops: Connection[] = [
      dragTo('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'right'),
      dragTo('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655', null),
      dragTo('2d8eebb4-9a34-5eae-ae8d-88813520de08', '2d8eebb4-9a34-5eae-ae8d-88813520de08', 'left'),
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
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    expect(flowProps().nodesConnectable).toBe(true);
    expect(flowProps().connectOnClick).toBe(false);
  });

  it('F-11 AC-013 a drag starts only at a right point: the left point cannot start a link', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    const box = boxOf('ea3211a4-b64b-5204-9451-6fe12fd7c655');
    expect(box.querySelector('.react-flow__handle-right.connectablestart')).not.toBeNull();
    expect(box.querySelector('.react-flow__handle-left.connectablestart')).toBeNull();
  });
});

describe('F-11 AC-016 an arrow end moves by a drag onto a point', () => {
  it('F-11 AC-016 wires the target end drag to the repoint: the source next moves to the new target', () => {
    const { onPipelineChange } = renderCanvas(
      pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515')),
    );
    dragArrowEnd('target', arrowOf('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), dragTo('2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'left'));
    expect(onPipelineChange).toHaveBeenCalledTimes(1);
    expect(onPipelineChange.mock.calls[0]?.[0].flows[0]?.next).toBe('47d4f7c9-a236-5d9b-b5a7-3f4724285515');
  });

  it('F-11 AC-016 wires the source end drag to the repoint: the arrow starts from the new flow', () => {
    const { onPipelineChange } = renderCanvas(
      pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515')),
    );
    dragArrowEnd('source', arrowOf('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), {
      source: '47d4f7c9-a236-5d9b-b5a7-3f4724285515',
      sourceHandle: 'right',
      target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
      targetHandle: 'left',
    });
    expect(onPipelineChange).toHaveBeenCalledTimes(1);
    const next = onPipelineChange.mock.calls[0]?.[0].flows.map((f) => f.next);
    expect(next).toEqual([undefined, undefined, 'ea3211a4-b64b-5204-9451-6fe12fd7c655']);
  });

  it('F-11 AC-016 a drag of an arrow end onto a flow body changes nothing', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515')));
    dragArrowEnd('target', arrowOf('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), {
      source: '2d8eebb4-9a34-5eae-ae8d-88813520de08',
      sourceHandle: 'right',
      target: '47d4f7c9-a236-5d9b-b5a7-3f4724285515',
      targetHandle: null,
    });
    expect(onPipelineChange).not.toHaveBeenCalled();
  });
});

describe('F-11 AC-014 a refused drag shows its reason in the band', () => {
  it('F-11 AC-014 shows the reason of a second outgoing arrow and draws no new arrow', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: '47d4f7c9-a236-5d9b-b5a7-3f4724285515' }), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    act(() => {
      flowProps().onConnect?.(dragTo('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'left'));
    });
    expect(onPipelineChange).not.toHaveBeenCalled();
    expect(bandText()).toBe('Refused · flow "2d8eebb4-9a34-5eae-ae8d-88813520de08" already has an outgoing arrow to "47d4f7c9-a236-5d9b-b5a7-3f4724285515"; remove it before adding another');
    expect(flowProps().edges?.map((edge) => edge.id)).toEqual(['2d8eebb4-9a34-5eae-ae8d-88813520de08->47d4f7c9-a236-5d9b-b5a7-3f4724285515']);
  });

  it('F-11 AC-014 shows the reason of a loop', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    act(() => {
      flowProps().onConnect?.(dragTo('ea3211a4-b64b-5204-9451-6fe12fd7c655', '2d8eebb4-9a34-5eae-ae8d-88813520de08', 'left'));
    });
    expect(onPipelineChange).not.toHaveBeenCalled();
    expect(bandText()).toContain('would make a loop');
  });

  it('F-11 AC-014 shows the reason of a refused repoint', () => {
    const { onPipelineChange } = renderCanvas(
      pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515', { next: '2d8eebb4-9a34-5eae-ae8d-88813520de08' })),
    );
    dragArrowEnd('source', arrowOf('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), dragTo('47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'left'));
    expect(onPipelineChange).not.toHaveBeenCalled();
    expect(bandText()).toBe('Refused · flow "47d4f7c9-a236-5d9b-b5a7-3f4724285515" already has an outgoing arrow to "2d8eebb4-9a34-5eae-ae8d-88813520de08"; remove it before adding another');
  });

  it('F-11 AC-014 clears the refusal when a later drag is accepted', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515')));
    act(() => {
      flowProps().onConnect?.(dragTo('2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'left'));
    });
    expect(bandText()).toContain('Refused');
    act(() => {
      flowProps().onConnect?.(dragTo('47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'left'));
    });
    expect(onPipelineChange).toHaveBeenCalledTimes(1);
    expect(bandText()).toBe('');
  });
});

describe('F-11 AC-042 the canvas reports the selection of a box, an arrow or the empty canvas', () => {
  it('F-11 AC-042 a click on a flow box selects that flow', () => {
    const { onSelect } = renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    act(() => {
      flowProps().onNodeClick?.({} as Parameters<NodeClick>[0], { id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' } as Parameters<NodeClick>[1]);
    });
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'flow', id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' });
  });

  it('F-11 AC-042 a click on an arrow selects that arrow by its two flows', () => {
    const { onSelect } = renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    act(() => {
      flowProps().onEdgeClick?.({} as Parameters<EdgeClick>[0], { id: '2d8eebb4-9a34-5eae-ae8d-88813520de08->ea3211a4-b64b-5204-9451-6fe12fd7c655', source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' } as Edge);
    });
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'arrow', arrow: { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' } });
  });

  it('F-11 AC-042 a click on the empty canvas selects the pipeline', () => {
    const { onSelect } = renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08')));
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
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')), {
      selection: { kind: 'flow', id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' },
    });
    const selected = getComputedStyle(boxOf('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(selected.borderTopColor).toBe(rgbOf(theme.palette.primary.main));
    expect(selected.borderTopWidth).toBe('2px');
    const unselected = getComputedStyle(boxOf('2d8eebb4-9a34-5eae-ae8d-88813520de08'));
    expect(unselected.borderTopWidth).toBe('1.5px');
  });

  it('F-11 AC-042 the selected arrow has the primary colour and a 2.5 px stroke; the other arrows do not', () => {
    renderCanvas(
      pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', { next: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' }), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c')),
      { selection: { kind: 'arrow', arrow: { source: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', target: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' } } },
    );
    const selected = edgeOf('ea3211a4-b64b-5204-9451-6fe12fd7c655->a0c3aad4-8765-5b23-8df5-7c03d481233c');
    expect(selected.style).toEqual({ stroke: theme.palette.primary.main, strokeWidth: 2.5 });
    expect(selected.markerEnd).toMatchObject({ color: theme.palette.primary.main });
    const other = edgeOf('2d8eebb4-9a34-5eae-ae8d-88813520de08->ea3211a4-b64b-5204-9451-6fe12fd7c655');
    expect(other.style).toBeUndefined();
    expect(other.markerEnd).not.toMatchObject({ color: theme.palette.primary.main });
  });

  it('F-11 AC-042 with the pipeline selected no box and no arrow has the selected style', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    expect(getComputedStyle(boxOf('2d8eebb4-9a34-5eae-ae8d-88813520de08')).borderTopWidth).toBe('1.5px');
    expect(getComputedStyle(boxOf('ea3211a4-b64b-5204-9451-6fe12fd7c655')).borderTopWidth).toBe('1.5px');
    expect(edgeOf('2d8eebb4-9a34-5eae-ae8d-88813520de08->ea3211a4-b64b-5204-9451-6fe12fd7c655').style).toBeUndefined();
  });
});

describe('F-11 AC-005 boxes are dragged on the canvas and the pipeline is not changed', () => {
  it('F-11 AC-005 every flow box is draggable', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    expect(flowProps().nodesDraggable).toBe(true);
    expect(flowProps().nodes?.every((node) => node.draggable === true)).toBe(true);
  });

  it('F-11 AC-005 a drag moves the box where it was dropped and reports no pipeline change', () => {
    const { onPipelineChange } = renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    act(() => {
      flowProps().onNodesChange?.([{ type: 'position', id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', position: { x: 300, y: 40 }, dragging: false }]);
    });
    expect(onPipelineChange).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLElement>('.react-flow__node[data-id="ea3211a4-b64b-5204-9451-6fe12fd7c655"]')?.style.transform).toBe(
      'translate(300px,40px)',
    );
  });

  it('F-11 AC-005 a dragged place is dropped when the layout changes', () => {
    const pipeline = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const { rerender } = renderWithRerender(pipeline);
    act(() => {
      flowProps().onNodesChange?.([{ type: 'position', id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', position: { x: 300, y: 40 }, dragging: false }]);
    });
    rerender(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', { next: '2d8eebb4-9a34-5eae-ae8d-88813520de08' })));
    expect(document.querySelector<HTMLElement>('.react-flow__node[data-id="ea3211a4-b64b-5204-9451-6fe12fd7c655"]')?.style.transform).toBe(
      'translate(110px,0px)',
    );
  });

  it('F-11 AC-005 a dragged place is not brought back when the layout returns to an earlier one', () => {
    const { rerender } = renderWithRerender(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    act(() => {
      flowProps().onNodesChange?.([{ type: 'position', id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', position: { x: 300, y: 40 }, dragging: false }]);
    });
    rerender(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', { next: '2d8eebb4-9a34-5eae-ae8d-88813520de08' })));
    rerender(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    expect(document.querySelector<HTMLElement>('.react-flow__node[data-id="ea3211a4-b64b-5204-9451-6fe12fd7c655"]')?.style.transform).toBe(
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
        flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: '47d4f7c9-a236-5d9b-b5a7-3f4724285515' }),
        flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }),
        flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', { next: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' }),
        flow('a0c3aad4-8765-5b23-8df5-7c03d481233c'),
      ),
    );
    await act(async () => {});
    expect(arrowCount()).toBe(3);
    act(() => {
      flowProps().onNodesChange?.([{ type: 'position', id: '47d4f7c9-a236-5d9b-b5a7-3f4724285515', position: { x: 150, y: 40 }, dragging: true }]);
    });
    expect(arrowCount()).toBe(3);
    act(() => {
      flowProps().onNodesChange?.([{ type: 'position', id: '47d4f7c9-a236-5d9b-b5a7-3f4724285515', position: { x: 160, y: 40 }, dragging: false }]);
    });
    expect(arrowCount()).toBe(3);
  });
});

describe('F-11 (no criterion: Verify device fix 2026-11-24) the connection points of a selected box are larger', () => {
  it('F-11 Verify device fix 2026-11-24 draws both points of the selected box at 14 px with a 2 px paper ring', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')), {
      selection: { kind: 'flow', id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' },
    });
    for (const side of ['left', 'right']) {
      const handle = boxOf('ea3211a4-b64b-5204-9451-6fe12fd7c655').querySelector<HTMLElement>(`.react-flow__handle-${side}`);
      expect(handle).not.toBeNull();
      const style = getComputedStyle(handle as HTMLElement);
      expect(style.width).toBe('14px');
      expect(style.height).toBe('14px');
      expect(style.borderTopWidth).toBe('2px');
      expect(style.borderTopColor).toBe(rgbOf(theme.palette.background.paper));
    }
  });

  it('F-11 Verify device fix 2026-11-24 keeps the library size on the points of a box that is not selected', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')), {
      selection: { kind: 'flow', id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' },
    });
    const handle = boxOf('2d8eebb4-9a34-5eae-ae8d-88813520de08').querySelector<HTMLElement>('.react-flow__handle-right');
    expect(handle).not.toBeNull();
    expect(handle?.style.width).toBe('');
    expect(handle?.style.height).toBe('');
    expect(handle?.style.borderTopWidth).toBe('');
  });
});

describe('F-11 (no criterion: Verify device fix 2026-11-24) the two ends of a selected arrow are larger', () => {
  it('F-11 Verify device fix 2026-11-24 draws the source point and the target point of the selected arrow at 14 px', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', { next: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' }), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c')), {
      selection: { kind: 'arrow', arrow: { source: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', target: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' } },
    });
    const ends = [
      boxOf('ea3211a4-b64b-5204-9451-6fe12fd7c655').querySelector<HTMLElement>('.react-flow__handle-right'),
      boxOf('a0c3aad4-8765-5b23-8df5-7c03d481233c').querySelector<HTMLElement>('.react-flow__handle-left'),
    ];
    for (const handle of ends) {
      expect(handle).not.toBeNull();
      const style = getComputedStyle(handle as HTMLElement);
      expect(style.width).toBe('14px');
      expect(style.height).toBe('14px');
      expect(style.borderTopWidth).toBe('2px');
      expect(style.borderTopColor).toBe(rgbOf(theme.palette.background.paper));
    }
  });

  it('F-11 Verify device fix 2026-11-24 keeps the library size on the other points of the boxes', () => {
    renderCanvas(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', { next: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' }), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c')), {
      selection: { kind: 'arrow', arrow: { source: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', target: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' } },
    });
    const others = [
      boxOf('2d8eebb4-9a34-5eae-ae8d-88813520de08').querySelector<HTMLElement>('.react-flow__handle-right'),
      boxOf('2d8eebb4-9a34-5eae-ae8d-88813520de08').querySelector<HTMLElement>('.react-flow__handle-left'),
      boxOf('ea3211a4-b64b-5204-9451-6fe12fd7c655').querySelector<HTMLElement>('.react-flow__handle-left'),
      boxOf('a0c3aad4-8765-5b23-8df5-7c03d481233c').querySelector<HTMLElement>('.react-flow__handle-right'),
    ];
    for (const handle of others) {
      expect(handle).not.toBeNull();
      expect(handle?.style.width).toBe('');
      expect(handle?.style.height).toBe('');
      expect(handle?.style.borderTopWidth).toBe('');
    }
  });
});
