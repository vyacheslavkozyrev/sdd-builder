// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findingsOfBlock, markedItems, WarningNote, warningsAt } from '../src/builder/MarkViews.js';
import { ErrorPanel } from '../src/builder/ErrorPanel.js';
import { AgentPanel } from '../src/builder/BlockPanel.js';
import { BlockCanvas } from '../src/builder/BlockCanvas.js';
import type { Flow } from '../src/builder/model.js';
import { structureMarks } from '../src/builder/marks.js';
import type { Finding, Placement, StructureMarks } from '../src/builder/marks.js';
import { theme } from '../src/theme.js';

// The views are rendered in the DOM, so this file runs in jsdom (architecture.md §5).

afterEach(() => {
  cleanup();
});

// The views read their colours from the app theme, so every render gets the same provider the app uses.
function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// jsdom reports a computed colour as rgb(...), so a theme hex value is converted the same way.
function rgbOf(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgb(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255})`;
}

// A finding with a severity, a path and a message. The rule is not shown, so it is a fixed name.
function finding(severity: Finding['severity'], path: string, message: string): Finding {
  return { severity, rule: 'test-rule', path, message };
}

// Marks with the given findings, each placed where its placement says. No blocked flow is needed here.
function marksOf(
  ...entries: ReadonlyArray<{ readonly finding: Finding; readonly placement: Placement }>
): StructureMarks {
  return { findings: entries, blockedFlowIds: [] };
}

const onPlan: Placement = { kind: 'flow', flowId: 'plan' };
const onArrowFromPlan: Placement = { kind: 'arrow', source: 'plan' };
const onNothing: Placement = { kind: 'none' };

describe('F-11 AC-035 warning beside the item it names', () => {
  it('F-11 AC-035 returns the warnings placed on a flow box, in the analyzer order', () => {
    const marks = marksOf(
      { finding: finding('warning', 'pipeline.flows.0.name', 'first on plan'), placement: onPlan },
      { finding: finding('warning', 'pipeline.flows.1', 'on build'), placement: { kind: 'flow', flowId: 'build' } },
      { finding: finding('warning', 'pipeline.flows.0', 'second on plan'), placement: onPlan },
    );
    expect(warningsAt(marks, onPlan).map((item) => item.message)).toEqual(['first on plan', 'second on plan']);
  });

  it('F-11 AC-035 returns the warnings placed on the arrow that leaves a flow, and no others', () => {
    const marks = marksOf(
      { finding: finding('warning', 'pipeline.flows.0.next', 'arrow warning'), placement: onArrowFromPlan },
      { finding: finding('warning', 'pipeline.flows.0', 'box warning'), placement: onPlan },
    );
    expect(warningsAt(marks, onArrowFromPlan).map((item) => item.message)).toEqual(['arrow warning']);
    expect(warningsAt(marks, onPlan).map((item) => item.message)).toEqual(['box warning']);
  });

  it('F-11 AC-035 leaves a blocker out of the warnings beside an item, since it is drawn red and in the band', () => {
    const marks = marksOf(
      { finding: finding('blocker', 'pipeline.flows.0', 'a blocker on plan'), placement: onPlan },
      { finding: finding('warning', 'pipeline.flows.0', 'a warning on plan'), placement: onPlan },
    );
    expect(warningsAt(marks, onPlan).map((item) => item.message)).toEqual(['a warning on plan']);
  });

  it('F-11 AC-035 returns nothing for an item with no placed warning, nor for no item at all', () => {
    const marks = marksOf(
      { finding: finding('warning', 'pipeline.flows.0', 'on plan'), placement: onPlan },
      { finding: finding('warning', 'pipeline.name', 'drawn on no item'), placement: onNothing },
    );
    expect(warningsAt(marks, { kind: 'flow', flowId: 'verify' })).toEqual([]);
    expect(warningsAt(marks, onNothing)).toEqual([]);
  });

  it('F-11 AC-035 draws the warning message after the Warning label in a note', () => {
    renderWithTheme(<WarningNote text="the flow is never reached." />);
    const note = screen.getByRole('note');
    expect(note.textContent).toBe('Warning · the flow is never reached.');
  });

  it('F-11 AC-035 draws the warning note in the warning colours from the theme', () => {
    renderWithTheme(<WarningNote text="the flow is never reached." />);
    const text = screen.getByText('Warning · the flow is never reached.');
    const style = getComputedStyle(text);
    expect(style.color).toBe(rgbOf(theme.palette.warning.dark));
    const box = screen.getByRole('note');
    expect(getComputedStyle(box).backgroundColor).toBe(rgbOf(theme.palette.warning.light));
  });
});

describe('F-11 AC-036 findings with no drawn item under the canvas', () => {
  it('F-11 AC-036 returns every finding placed on none, blockers and warnings both, in order', () => {
    const marks = marksOf(
      { finding: finding('warning', 'pipeline.flows.0.blocks.0.next', 'block warning'), placement: onNothing },
      { finding: finding('blocker', 'pipeline.name', 'a name is required'), placement: onNothing },
      { finding: finding('blocker', 'pipeline.flows.0', 'a flow blocker'), placement: onPlan },
    );
    const unplaced = marks.findings.filter((entry) => entry.placement.kind === 'none').map((entry) => entry.finding);
    expect(unplaced).toEqual([
      finding('warning', 'pipeline.flows.0.blocks.0.next', 'block warning'),
      finding('blocker', 'pipeline.name', 'a name is required'),
    ]);
  });

  it('F-11 AC-036 gives the real analyzer finding of a pipeline with no flow to the panel, with no drawn item', () => {
    const empty = { name: 'Demo', description: 'A demo pipeline.', arguments: [], flows: [] };
    const marks = structureMarks(empty, []);
    expect(marks.findings.length).toBeGreaterThan(0);
    expect(marks.findings.every((entry) => entry.finding.path !== '')).toBe(true);
    expect(marks.findings.every((entry) => entry.placement.kind === 'none')).toBe(true);
  });
});

// The F-12 marks on the flow tab. The flow is start, planner, end; the planner's arrow runs to the End.
const planFlow: Flow = {
  index: 0,
  id: 'plan',
  name: 'plan',
  arguments: [],
  body: '',
  artifacts: [],
  approval: false,
  blocks: [
    { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
    {
      index: 1,
      id: 'block-2',
      kind: 'agent',
      name: 'planner',
      description: 'Writes the plan',
      arguments: [],
      next: 'block-3',
    },
    { index: 2, id: 'block-3', kind: 'end', outcome: 'done', producedArtifact: '' },
  ],
};

const onPlannerBlock: Placement = { kind: 'block', flowId: 'plan', blockId: 'block-2' };
const onPlannerArrow: Placement = { kind: 'block-arrow', flowId: 'plan', fromId: 'block-2', output: 'next' };
const onEndBlock: Placement = { kind: 'block', flowId: 'plan', blockId: 'block-3' };
const otherFlowBlock: Placement = { kind: 'block', flowId: 'build', blockId: 'block-2' };
type AgentBlock = Extract<Flow['blocks'][number], { kind: 'agent' }>;
const planner = planFlow.blocks[1] as AgentBlock;
const plannerState = { name: 'Demo', description: 'A demo pipeline.', arguments: [], flows: [planFlow] };

describe('F-12 AC-045 (UI) a finding is shown on the block and arrow it names', () => {
  it('F-12 AC-045 (UI) lists the blocks and arrows of one flow that carry a finding', () => {
    const marks = marksOf(
      { finding: finding('warning', 'pipeline.flows.0.blocks.1', 'on the planner'), placement: onPlannerBlock },
      { finding: finding('warning', 'pipeline.flows.0.blocks.1.next', 'on its arrow'), placement: onPlannerArrow },
      { finding: finding('warning', 'pipeline.flows.1.blocks.1', 'on another flow'), placement: otherFlowBlock },
      { finding: finding('warning', 'pipeline.name', 'on no item'), placement: onNothing },
    );
    const items = markedItems(marks, 'plan');
    expect([...items.blocks]).toEqual(['block-2']);
    expect([...items.arrows]).toEqual(['block-2.next']);
    expect([...markedItems(marks, 'build').blocks]).toEqual(['block-2']);
    expect(markedItems(marks, 'verify').blocks.size).toBe(0);
  });

  it('F-12 AC-045 (UI) draws an amber badge on the marked block and on its arrow, and none on the others', () => {
    const marks = marksOf(
      { finding: finding('warning', 'pipeline.flows.0.blocks.1', 'on the planner'), placement: onPlannerBlock },
      { finding: finding('warning', 'pipeline.flows.0.blocks.1.next', 'on its arrow'), placement: onPlannerArrow },
    );
    const { container } = renderWithTheme(
      <BlockCanvas
        flow={planFlow}
        selection={{ kind: 'none' }}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onChange={vi.fn()}
        marks={marks}
      />,
    );
    expect(screen.getAllByText('!')).toHaveLength(2);
    const amberArrows = container.querySelectorAll(`polyline[stroke="${theme.palette.warning.main}"]`);
    expect(amberArrows).toHaveLength(1);
  });

  it('F-12 AC-045 (UI) draws no mark on a flow whose findings are on no drawn item', () => {
    const marks = marksOf({ finding: finding('blocker', 'pipeline.name', 'a name is required'), placement: onNothing });
    renderWithTheme(
      <BlockCanvas
        flow={planFlow}
        selection={{ kind: 'none' }}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onChange={vi.fn()}
        marks={marks}
      />,
    );
    expect(screen.queryAllByText('!')).toHaveLength(0);
  });

  it('F-12 AC-045 (UI) lists the findings of a block and its arrows in its panel, in the analyzer order', () => {
    const marks = marksOf(
      {
        finding: finding('warning', 'pipeline.flows.0.blocks.1.next', 'arrow of the planner'),
        placement: onPlannerArrow,
      },
      {
        finding: finding('blocker', 'pipeline.flows.0.blocks.1', 'the planner has no body'),
        placement: onPlannerBlock,
      },
      { finding: finding('warning', 'pipeline.flows.0.blocks.2', 'on the end'), placement: onEndBlock },
    );
    const findings = findingsOfBlock(marks, 'plan', 'block-2');
    expect(findings.map((item) => item.message)).toEqual(['arrow of the planner', 'the planner has no body']);
    expect(findingsOfBlock(marks, 'plan', 'block-3').map((item) => item.message)).toEqual(['on the end']);
    expect(findingsOfBlock(marks, 'build', 'block-2')).toEqual([]);
  });

  it("F-12 AC-045 (UI) shows the block's findings in its panel as a list, with the kind and the message", () => {
    const marks = marksOf({
      finding: finding('blocker', 'pipeline.flows.0.blocks.1', 'the planner has no body'),
      placement: onPlannerBlock,
    });
    renderWithTheme(
      <AgentPanel
        pipelineState={plannerState}
        rules={[]}
        flow={planFlow}
        block={planner}
        onChange={vi.fn()}
        findings={findingsOfBlock(marks, 'plan', 'block-2')}
      />,
    );
    const list = screen.getByRole('region', { name: 'Structure marks' });
    expect(within(list).getByText('Blocker')).toBeTruthy();
    expect(within(list).getByText('the planner has no body')).toBeTruthy();
  });

  it('F-12 AC-045 (UI) shows no findings list for a block with no finding', () => {
    const marks = marksOf({
      finding: finding('warning', 'pipeline.flows.0.blocks.2', 'on the end'),
      placement: onEndBlock,
    });
    renderWithTheme(
      <AgentPanel
        pipelineState={plannerState}
        rules={[]}
        flow={planFlow}
        block={planner}
        onChange={vi.fn()}
        findings={findingsOfBlock(marks, 'plan', 'block-2')}
      />,
    );
    expect(screen.queryByRole('region', { name: 'Structure marks' })).toBeNull();
  });
});

describe('F-12 AC-047 (UI) a new unlinked block is marked, not refused', () => {
  it('F-12 AC-047 (UI) marks the unlinked block and keeps its Name field editable', () => {
    const unlinked: Flow = {
      ...planFlow,
      blocks: [
        { index: 0, id: 'block-1', kind: 'start', next: 'block-2' },
        {
          index: 1,
          id: 'block-2',
          kind: 'agent',
          name: 'planner',
          description: 'Writes the plan',
          arguments: [],
          next: '',
        },
        { index: 2, id: 'block-3', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    const state = { ...plannerState, flows: [unlinked] };
    const marks = structureMarks(state, []);
    expect(markedItems(marks, 'plan').blocks.has('block-2')).toBe(true);
    renderWithTheme(
      <BlockCanvas
        flow={unlinked}
        selection={{ kind: 'none' }}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onChange={vi.fn()}
        marks={marks}
      />,
    );
    // Two blocks are marked: the unlinked one (no route out) and the End it cuts off from Start.
    expect(screen.getAllByText('!')).toHaveLength(2);
    renderWithTheme(
      <AgentPanel
        pipelineState={state}
        rules={[]}
        flow={unlinked}
        block={unlinked.blocks[1] as AgentBlock}
        onChange={vi.fn()}
        findings={findingsOfBlock(marks, 'plan', 'block-2')}
      />,
    );
    const list = screen.getByRole('region', { name: 'Structure marks' });
    expect(within(list).getByText(/^must name a block of this flow/)).toBeTruthy();
    expect((screen.getByLabelText('Name') as HTMLInputElement).disabled).toBe(false);
  });
});

describe('F-12 AC-048 (UI) marks are read-only', () => {
  it("F-12 AC-048 (UI) adds no control to the list of a block's findings", () => {
    const marks = marksOf({
      finding: finding('warning', 'pipeline.flows.0.blocks.1.next', 'arrow of the planner'),
      placement: onPlannerArrow,
    });
    renderWithTheme(
      <AgentPanel
        pipelineState={plannerState}
        rules={[]}
        flow={planFlow}
        block={planner}
        onChange={vi.fn()}
        findings={findingsOfBlock(marks, 'plan', 'block-2')}
      />,
    );
    const list = screen.getByRole('region', { name: 'Structure marks' });
    expect(within(list).queryAllByRole('button')).toHaveLength(0);
    expect(within(list).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(list).getByText('arrow of the planner')).toBeTruthy();
  });
});

describe('F-12 AC-045 (UI) findings with no drawn item stay in the error panel', () => {
  it('F-12 AC-045 (UI) lists a finding with no drawn item under "Not on a drawn item"', () => {
    const marks = marksOf(
      { finding: finding('blocker', 'pipeline.name', 'a name is required'), placement: onNothing },
      { finding: finding('warning', 'pipeline.flows.0.blocks.1', 'on the planner'), placement: onPlannerBlock },
    );
    renderWithTheme(<ErrorPanel findings={marks.findings} />);
    fireEvent.click(screen.getByRole('button', { name: '1 error · 1 warning' }));
    expect(screen.getByText('Not on a drawn item')).toBeTruthy();
    expect(screen.getByText('a name is required')).toBeTruthy();
  });
});
