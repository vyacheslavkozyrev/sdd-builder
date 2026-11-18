// @vitest-environment jsdom
// DOM tests for the Pipeline canvas (F-11 AC-007, AC-009, AC-011, AC-012, AC-022). React Flow needs a browser layout
// for its pointer gestures and to draw arrows, so the arrows, the drags and the clicks on arrows are checked on screen
// at Verify (device). Here the boxes' text and order, the click on a box, and the drop of a toolbox tool onto a box or
// onto an arrow are checked through the DOM. An arrow is stood in for by an element with its data-id, as React Flow
// draws it, because jsdom does not draw the arrow itself. The arrows' labels are tested as pure logic (AC-008,
// drawing.test.ts).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline } from '@sddbuilder/core';
import { Canvas } from '../src/builder/Canvas.js';
import { TOOL_MIME } from '../src/builder/drawing.js';
import type { Selection } from '../src/builder/panel.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

beforeAll(() => {
  // React Flow measures its nodes with a ResizeObserver, which jsdom does not provide.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function flow(id: string, extra: Partial<Flow> = {}): Flow {
  return { id, name: id, description: '', arguments: '', blocks: [], ...extra };
}

function config(flows: Flow[]): Pipeline {
  return { name: 'SDD process', description: '', arguments: [], flows };
}

// plan → build with an approval gate; verify has no arrow.
const PIPE = config([
  flow('plan', {
    connectedTo: { to: 'build', label: 'plan.md', gate: { kind: 'approval', description: 'Reviewed' } },
  }),
  flow('build'),
  flow('verify'),
]);

// A drag that carries a toolbox tool, as the toolbox's onDragStart sets it.
function toolDrag(tool: string) {
  return { dataTransfer: { types: [TOOL_MIME], getData: (type: string) => (type === TOOL_MIME ? tool : '') } };
}

function renderCanvas(pipe: Pipeline, selection: Selection | undefined = undefined) {
  const onSelect = vi.fn();
  const onChange = vi.fn();
  const view = render(
    <Canvas pipeline={pipe} rules={[]} selection={selection} onSelect={onSelect} onChange={onChange} />,
  );
  return { ...view, onSelect, onChange };
}

function nodeOf(name: string): HTMLElement {
  const node = screen.getByText(name).closest('.react-flow__node');
  if (!(node instanceof HTMLElement)) {
    throw new Error(`No box for ${name}.`);
  }
  return node;
}

// The arrow from `source` as a drop target: React Flow marks each arrow with its source's id, and the canvas reads the
// closest arrow from the drop target. The element is set into the canvas where React Flow would draw the arrow.
function arrowFrom(container: HTMLElement, source: string): HTMLElement {
  const section = container.querySelector('section');
  if (section === null) {
    throw new Error('No canvas.');
  }
  const arrow = document.createElement('div');
  arrow.className = 'react-flow__edge';
  arrow.setAttribute('data-id', source);
  section.appendChild(arrow);
  return arrow;
}

describe('F-11 AC-007 boxes on the canvas', () => {
  it('F-11 AC-007 draws each flow as a box with its name and its block count', () => {
    renderCanvas(PIPE);
    expect(nodeOf('plan').textContent).toContain('plan');
    expect(nodeOf('plan').textContent).toContain('0 blocks');
    expect(nodeOf('build').textContent).toContain('0 blocks');
    expect(nodeOf('verify').textContent).toContain('0 blocks');
  });
});

describe('F-11 AC-009 box order on the canvas', () => {
  it('F-11 AC-009 places the boxes left to right in pipeline order', () => {
    renderCanvas(PIPE);
    const left = (name: string) => {
      const match = /translate\((-?\d+(?:\.\d+)?)px/.exec(nodeOf(name).style.transform);
      return Number(match?.[1]);
    };
    expect(left('plan')).toBeLessThan(left('build'));
    expect(left('build')).toBeLessThan(left('verify'));
  });
});

describe('F-11 AC-011 selection on the canvas', () => {
  it('F-11 AC-011 selects a flow when its box is clicked', () => {
    const { onSelect } = renderCanvas(PIPE);
    fireEvent.click(nodeOf('build'));
    expect(onSelect).toHaveBeenLastCalledWith({ kind: 'flow', id: 'build' });
  });
});

describe('F-11 AC-022 gate drop on an arrow', () => {
  it('F-11 AC-022 asks for the gate when Approval is dropped on an arrow, and adds it', () => {
    const { container, onChange } = renderCanvas(
      config([flow('plan', { connectedTo: { to: 'build', label: 'plan.md' } }), flow('build')]),
    );
    fireEvent.drop(arrowFrom(container, 'plan'), toolDrag('Approval'));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Description · required'), { target: { value: 'Reviewed' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add approval' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(next.flows[0]?.connectedTo?.gate).toEqual({ kind: 'approval', description: 'Reviewed' });
  });

  it('F-11 AC-022 shows the refusal in the dialog and adds nothing when the description is blank', () => {
    const { container, onChange } = renderCanvas(
      config([flow('plan', { connectedTo: { to: 'build', label: 'plan.md' } }), flow('build')]),
    );
    fireEvent.drop(arrowFrom(container, 'plan'), toolDrag('Approval'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add approval' }));
    expect(within(dialog).getByRole('alert').textContent).toMatch(/^Description /);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-022 adds nothing when Approval is dropped on a box', () => {
    const { onChange } = renderCanvas(PIPE);
    fireEvent.drop(nodeOf('build'), toolDrag('Approval'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-022 adds nothing when Approval is dropped on empty canvas', () => {
    const { container, onChange } = renderCanvas(PIPE);
    const section = container.querySelector('section');
    if (section === null) {
      throw new Error('No canvas.');
    }
    fireEvent.drop(section, toolDrag('Approval'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('F-11 AC-011 canvas text', () => {
  it('F-11 AC-011 captions the canvas with the selected flow', () => {
    renderCanvas(PIPE, { kind: 'flow', id: 'build' });
    expect(screen.getByText('Flows in pipeline order. Selected: build.')).toBeTruthy();
  });

  it('F-11 AC-033 shows the empty canvas with its message when there are no flows', () => {
    renderCanvas(config([]));
    expect(screen.getByText('No flows in this pipeline.')).toBeTruthy();
    expect(screen.getByText('No flows yet.')).toBeTruthy();
    expect(screen.getByText('Add one with + in the tab row.')).toBeTruthy();
    expect(screen.queryByText(/Drag the canvas or use the strip/)).toBeNull();
  });
});

describe('F-11 AC-012 connection by drag from the toolbox', () => {
  it('F-11 AC-012 asks the artifact label after the second flow, and refuses a blank label', () => {
    const { onChange } = renderCanvas(config([flow('verify'), flow('build')]));
    fireEvent.drop(nodeOf('verify'), toolDrag('Connection'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.drop(nodeOf('build'), toolDrag('Connection'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Connect' }));
    expect(within(dialog).getByRole('alert').textContent).toContain('The artifact label is required');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-012 adds the arrow with the label the user gives', () => {
    const { onChange } = renderCanvas(config([flow('verify'), flow('build')]));
    fireEvent.drop(nodeOf('verify'), toolDrag('Connection'));
    fireEvent.drop(nodeOf('build'), toolDrag('Connection'));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Artifact label · required'), { target: { value: 'verify.md' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Connect' }));
    const next = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(next.flows[0]?.connectedTo).toEqual({ to: 'build', label: 'verify.md' });
  });
});
