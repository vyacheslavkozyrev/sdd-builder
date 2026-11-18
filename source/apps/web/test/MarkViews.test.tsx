// @vitest-environment jsdom
// DOM tests for the structure marks on the Pipeline canvas (F-11 AC-033, AC-035, AC-036, AC-037). The marks themselves
// are the analyzer's findings (marks.test.ts); here the findings are shown beside their box, on their arrow, under the
// canvas, and no mark stops the Delete or Add buttons.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { pipeline } from '@sddbuilder/core';
import { Canvas } from '../src/builder/Canvas.js';
import {
  ArrowLabel,
  EMPTY_MARKS_NOTE,
  MARKS_NOTE,
  NOT_DRAWN_HEADING,
  NotDrawnMarks,
  markText,
} from '../src/builder/MarkViews.js';
import { PipelineTabs, ADD_FLOW_LABEL } from '../src/builder/PipelineTabs.js';
import { PropertiesPanel } from '../src/builder/PropertiesPanel.js';
import { arrowMarksBySource, marksFor, rulesFor } from '../src/builder/marks.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;
type Block = pipeline.Block;

const RULES = rulesFor([{ name: 'Testing', description: 'Tests come first.' }]);

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

function start(id: string, link?: pipeline.BlockLink): Block {
  return link === undefined ? { id, kind: 'start' } : { id, kind: 'start', connectedTo: link };
}

function end(id: string): Block {
  return { id, kind: 'end' } as Block;
}

// A flow with a Start chained to an End: no structural finding of its own.
function sound(id: string, extra: Partial<Flow> = {}): Flow {
  return flow(id, {
    blocks: [start(`${id}-start`, { to: `${id}-end`, label: 'next' }), end(`${id}-end`)],
    ...extra,
  });
}

// `plan` has no blocks (two blockers) and an arrow to `build`; `build` is sound.
const BLOCKED = config([flow('plan', { connectedTo: { to: 'build', label: 'plan.md' } }), sound('build')]);

const PLAN_NO_START = 'The flow has no Start block. Add one Start block.';
const PLAN_NO_END = 'The flow has no End block. Add at least one End block.';

function renderCanvas(pipe: Pipeline) {
  const onSelect = vi.fn();
  const onChange = vi.fn();
  const view = render(
    <Canvas pipeline={pipe} rules={RULES} selection={undefined} onSelect={onSelect} onChange={onChange} />,
  );
  return { ...view, onChange };
}

function nodeOf(name: string): HTMLElement {
  const node = screen.getByText(name, { selector: 'strong' }).closest('.react-flow__node');
  if (!(node instanceof HTMLElement)) {
    throw new Error(`No box for ${name}.`);
  }
  return node;
}

function sectionOf(label: string): HTMLElement {
  return screen.getByRole('region', { name: label });
}

describe('F-11 AC-033 the empty canvas', () => {
  it('F-11 AC-033 says there are no flows yet, with no flow drawn', () => {
    renderCanvas(config([]));
    expect(screen.getByText('No flows yet.')).toBeTruthy();
    expect(screen.getByText('Add one with + in the tab row.')).toBeTruthy();
    expect(document.querySelector('.react-flow__node')).toBeNull();
  });

  it('F-11 AC-033 says that the deleted last flow blocks no edit, and the mark stays until + adds a flow', () => {
    renderCanvas(config([]));
    expect(screen.getByText(EMPTY_MARKS_NOTE)).toBeTruthy();
    expect(EMPTY_MARKS_NOTE).toContain('no edit is blocked');
  });

  it('F-11 AC-033 lists the pipeline blocker under the canvas when every flow is deleted', () => {
    renderCanvas(config([]));
    const section = sectionOf(NOT_DRAWN_HEADING);
    expect(within(section).getByText('Blocker · The pipeline has no flow. Add at least one flow.')).toBeTruthy();
    expect(section.textContent).toContain('path: pipeline.flows');
  });
});

describe('F-11 AC-035 a mark beside the item it names', () => {
  it('F-11 AC-035 shows a flow finding beside its box, in the blocker colour and with its message', () => {
    renderCanvas(BLOCKED);
    const node = nodeOf('plan');
    const mark = within(node).getByText(markText({ severity: 'blocker', path: '', message: PLAN_NO_START }));
    expect(mark.parentElement?.getAttribute('data-severity')).toBe('blocker');
    expect(within(node).getByText(markText({ severity: 'blocker', path: '', message: PLAN_NO_END }))).toBeTruthy();
    expect(within(nodeOf('build')).queryByText(/Blocker/)).toBeNull();
  });

  it('F-11 AC-035 outlines a flow with a blocker in red', () => {
    renderCanvas(BLOCKED);
    expect(nodeOf('plan').style.borderColor).toBe('rgb(220, 38, 38)');
    expect(nodeOf('build').style.borderColor).toBe('');
  });

  it('F-11 AC-035 places a connection finding on the arrow that leaves its flow, and no other arrow', () => {
    const p = config([
      sound('specify', { connectedTo: { to: 'ghost', label: 'spec.md' } }),
      sound('plan', { connectedTo: { to: 'specify', label: 'plan.md' } }),
    ]);
    const arrows = arrowMarksBySource(p, marksFor(p, RULES));
    expect(arrows.get('specify')?.map((finding) => finding.path)).toEqual(['pipeline.flows[0].connectedTo']);
    expect(arrows.get('plan')).toEqual([]);
  });

  it('F-11 AC-035 shows the arrow label with its finding beside it, in the arrow text', () => {
    const p = config([sound('specify', { connectedTo: { to: 'ghost', label: 'spec.md' } }), sound('plan')]);
    const [finding] = arrowMarksBySource(p, marksFor(p, RULES)).get('specify') ?? [];
    if (finding === undefined) {
      throw new Error('No arrow finding.');
    }
    // React Flow draws no edges in jsdom, so the arrow's label is rendered on its own; the placement is device-checked.
    render(<ArrowLabel text="spec.md" findings={[finding]} />);
    expect(screen.getByText('spec.md')).toBeTruthy();
    expect(screen.getByText(markText(finding))).toBeTruthy();
  });
});

describe('F-11 AC-035 the severity colour', () => {
  it('F-11 AC-035 marks a warning from the analyzer as a warning, with its message and path', () => {
    // A Check whose false route goes back to Start with no roundLimit: the analyzer's only finding is that warning.
    const retry = config([
      flow('build', {
        blocks: [
          start('build-start', { to: 'build-check', label: 'next' }),
          {
            id: 'build-check',
            kind: 'check',
            description: '',
            type: 'checks',
            connectedTo: { true: { to: 'build-end' }, false: { to: 'build-start' } },
          },
          end('build-end'),
        ],
      }),
    ]);
    // The analyzer's own output for this config, as the only finding: a warning, and nothing else.
    const analyzer = pipeline.analyzeStructure({ schemaVersion: 2, rules: RULES, pipeline: retry });
    expect(analyzer.map((finding) => finding.severity)).toEqual(['warning']);
    const [warning] = marksFor(retry, RULES).notDrawn;
    expect(marksFor(retry, RULES).notDrawn).toEqual(analyzer);
    if (warning === undefined) {
      throw new Error('No warning finding.');
    }
    renderCanvas(retry);
    const item = within(sectionOf(NOT_DRAWN_HEADING)).getByText(markText(warning));
    expect(item.parentElement?.getAttribute('data-severity')).toBe('warning');
    expect(item.parentElement?.textContent).toContain(`path: ${warning.path}`);
  });

  it('F-11 AC-035 marks a blocker as a blocker, not as a warning', () => {
    const blocker = { severity: 'blocker' as const, path: 'pipeline.flows[0]', message: 'A blocker.' };
    render(<NotDrawnMarks findings={[blocker]} />);
    expect(screen.getByText('Blocker · A blocker.').parentElement?.getAttribute('data-severity')).toBe('blocker');
  });
});

describe('F-11 AC-036 a mark that names no drawn item', () => {
  it('F-11 AC-036 lists a block finding under "Not on a drawn item", with its message and path', () => {
    const p = config([
      sound('specify', {
        blocks: [start('specify-start', { to: 'ghost', label: 'next' }), end('specify-end')],
      }),
    ]);
    const marks = marksFor(p, RULES);
    expect(marks.notDrawn.map((finding) => finding.path)).toEqual([
      'pipeline.flows[0].blocks[0].connectedTo',
      'pipeline.flows[0].blocks[1]',
    ]);
    renderCanvas(p);
    const section = sectionOf(NOT_DRAWN_HEADING);
    for (const finding of marks.notDrawn) {
      expect(within(section).getByText(markText(finding))).toBeTruthy();
      expect(within(section).getByText(`path: ${finding.path}`)).toBeTruthy();
    }
  });

  it('F-11 AC-036 shows no "Not on a drawn item" section when every mark is drawn beside its item', () => {
    const p = config([sound('specify'), sound('plan', { connectedTo: { to: 'specify', label: 'plan.md' } })]);
    renderCanvas(p);
    expect(screen.queryByRole('region', { name: NOT_DRAWN_HEADING })).toBeNull();
  });
});

describe('F-11 AC-037 the marks follow the edits and never block one', () => {
  it('F-11 AC-037 updates the marks when the pipeline changes', () => {
    const { rerender } = renderCanvas(BLOCKED);
    expect(
      within(nodeOf('plan')).getByText(markText({ severity: 'blocker', path: '', message: PLAN_NO_START })),
    ).toBeTruthy();
    const fixed = config([
      flow('plan', {
        connectedTo: { to: 'build', label: 'plan.md' },
        blocks: [start('p-s', { to: 'p-e', label: 'x' }), end('p-e')],
      }),
      sound('build'),
    ]);
    rerender(<Canvas pipeline={fixed} rules={RULES} selection={undefined} onSelect={vi.fn()} onChange={vi.fn()} />);
    expect(within(nodeOf('plan')).queryByText(/Blocker/)).toBeNull();
  });

  it('F-11 AC-037 shows the note that marks never block an edit while a mark shows', () => {
    renderCanvas(BLOCKED);
    expect(screen.getByText(MARKS_NOTE)).toBeTruthy();
    expect(MARKS_NOTE).toContain('A blocker never stops an edit: Delete and Add stay enabled.');
  });

  it('F-11 AC-037 shows no marks note when no mark shows', () => {
    const clean = config([sound('specify', { connectedTo: { to: 'plan', label: 'spec.md' } }), sound('plan')]);
    expect(marksFor(clean, RULES)).toEqual({ boxes: [[], []], arrows: [[], []], notDrawn: [] });
    renderCanvas(clean);
    expect(screen.queryByText(MARKS_NOTE)).toBeNull();
  });

  it('F-11 AC-037 keeps + enabled while a blocker shows', () => {
    const onAddFlow = vi.fn();
    render(
      <PipelineTabs pipeline={BLOCKED} selected={{ kind: 'pipeline' }} onSelect={vi.fn()} onAddFlow={onAddFlow} />,
    );
    const add = screen.getByRole('button', { name: ADD_FLOW_LABEL });
    expect((add as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(add);
    expect(onAddFlow).toHaveBeenCalledTimes(1);
  });

  it('F-11 AC-037 keeps Delete flow enabled while a blocker shows on that flow', () => {
    const onDelete = vi.fn();
    render(
      <PropertiesPanel
        pipeline={BLOCKED}
        selection={{ kind: 'flow', id: 'plan' }}
        onChange={vi.fn()}
        onDelete={onDelete}
      />,
    );
    const remove = screen.getByRole('button', { name: 'Delete flow' });
    expect((remove as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(remove);
    expect(onDelete).toHaveBeenCalledWith('plan');
  });
});
