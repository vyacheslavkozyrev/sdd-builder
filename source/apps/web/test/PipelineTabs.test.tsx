// @vitest-environment jsdom
// DOM tests for the Pipeline tab row and the flow tab body (F-11 AC-001 to AC-005). The layout
// and full width of the row (AC-006) are checked on screen at Verify.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline } from '@sddbuilder/core';
import { PipelineTabs, FlowTabBody } from '../src/builder/PipelineTabs.js';
import { addFlow, type Tab } from '../src/builder/model.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

afterEach(() => {
  cleanup();
});

function flow(id: string, name = `Name ${id}`): Flow {
  return { id, name, description: '', arguments: '', blocks: [] };
}

function config(flows: Flow[]): Pipeline {
  return { name: 'pipeline', description: '', arguments: [], flows };
}

const PIPELINE_TAB: Tab = { kind: 'pipeline' };

// Holds the pipeline and the selected tab as the wizard does, so + is tested end to end.
function AddFlowHarness({ initial }: { readonly initial: Pipeline }) {
  const [value, setValue] = useState(initial);
  const [selected, setSelected] = useState<Tab>(PIPELINE_TAB);
  return (
    <PipelineTabs
      pipeline={value}
      selected={selected}
      onSelect={setSelected}
      onAddFlow={() => {
        const added = addFlow(value);
        setValue(added.pipeline);
        setSelected({ kind: 'flow', id: added.flowId, name: added.flowId });
      }}
    />
  );
}

function renderRow(pipelineValue: Pipeline, selected: Tab = PIPELINE_TAB) {
  const handlers = { onSelect: vi.fn(), onAddFlow: vi.fn() };
  render(<PipelineTabs pipeline={pipelineValue} selected={selected} {...handlers} />);
  return handlers;
}

function tabLabels(): string[] {
  return screen.getAllByRole('tab').map((tab) => tab.textContent ?? '');
}

describe('F-11 AC-001 tab row order', () => {
  it('F-11 AC-001 shows the Pipeline tab first, then one tab per flow in pipeline order', () => {
    renderRow(config([flow('specify'), flow('plan'), flow('build')]));
    expect(tabLabels()).toEqual(['Pipeline', 'Name specify', 'Name plan', 'Name build']);
  });

  it('F-11 AC-001 shows the Pipeline tab alone when there is no flow', () => {
    renderRow(config([]));
    expect(tabLabels()).toEqual(['Pipeline']);
  });

  it('F-11 AC-001 puts the + button after the last tab', () => {
    renderRow(config([flow('specify'), flow('build')]));
    const row = screen.getByRole('tablist');
    const add = screen.getByRole('button', { name: 'Add flow' });
    const lastTab = screen.getByRole('tab', { name: 'Name build' });
    expect(lastTab.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(row.contains(add)).toBe(false);
  });
});

describe('F-11 AC-002 no remove control on the tab row', () => {
  it('F-11 AC-002 has no remove control on the Pipeline tab', () => {
    renderRow(config([flow('specify')]));
    expect(screen.queryByRole('button', { name: /remove|delete/i })).toBeNull();
  });

  it('F-11 AC-002 keeps the Pipeline tab and no remove control when there is no flow (negative case)', () => {
    renderRow(config([]));
    expect(screen.getByRole('tab', { name: 'Pipeline' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /remove|delete/i })).toBeNull();
  });
});

describe('F-11 AC-003 + adds a flow and selects its tab', () => {
  it('F-11 AC-003 calls onAddFlow once when + is clicked', () => {
    const { onAddFlow, onSelect } = renderRow(config([flow('specify')]));
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    expect(onAddFlow).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('F-11 AC-003 adds an empty flow named flow-2 and selects its tab when + is clicked', () => {
    render(<AddFlowHarness initial={config([flow('specify')])} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    expect(tabLabels()).toEqual(['Pipeline', 'Name specify', 'flow-2']);
    expect(screen.getByRole('tab', { name: 'flow-2' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Pipeline' }).getAttribute('aria-selected')).toBe('false');
  });

  it('F-11 AC-003 adds a second flow as flow-3 when flow-2 is taken', () => {
    render(<AddFlowHarness initial={config([flow('flow-2')])} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    expect(tabLabels()).toEqual(['Pipeline', 'Name flow-2', 'flow-3']);
    expect(screen.getByRole('tab', { name: 'flow-3' }).getAttribute('aria-selected')).toBe('true');
  });
});

describe('F-11 AC-004 + is the only control that adds a flow', () => {
  it('F-11 AC-004 offers no other control that adds a flow on the tab row (negative case)', () => {
    renderRow(config([flow('specify'), flow('build')]));
    const controls = [...screen.getAllByRole('tab'), ...screen.getAllByRole('button')];
    const adders = controls.filter(
      (control) => control.textContent === '+' || /add/i.test(control.getAttribute('aria-label') ?? ''),
    );
    expect(adders).toHaveLength(1);
    expect(adders[0]?.getAttribute('aria-label')).toBe('Add flow');
  });

  it('F-11 AC-004 clicking a flow tab selects it and does not add a flow (negative case)', () => {
    const { onAddFlow, onSelect } = renderRow(config([flow('specify')]));
    fireEvent.click(screen.getByRole('tab', { name: 'Name specify' }));
    expect(onSelect).toHaveBeenCalledWith({ kind: 'flow', id: 'specify', name: 'Name specify' });
    expect(onAddFlow).not.toHaveBeenCalled();
  });
});

describe('F-11 AC-005 flow tab body and placeholder', () => {
  it('F-11 AC-005 shows the flow name, its block count and the placeholder built in F-12', () => {
    render(<FlowTabBody name="verify" blockCount={3} />);
    expect(screen.getByText('verify · 3 blocks')).toBeTruthy();
    expect(screen.getByText('The blocks of verify are built in F-12.')).toBeTruthy();
  });

  it('F-11 AC-005 uses the singular for one block', () => {
    render(<FlowTabBody name="plan" blockCount={1} />);
    expect(screen.getByText('plan · 1 block')).toBeTruthy();
  });

  it('F-11 AC-005 shows the Pipeline tab as selected with no flow placeholder (negative case)', () => {
    renderRow(config([flow('specify')]), PIPELINE_TAB);
    const pipelineTab = screen.getByRole('tab', { name: 'Pipeline' });
    expect(pipelineTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByText(/built in F-12/)).toBeNull();
    expect(within(screen.getByRole('tablist')).getAllByRole('tab')).toHaveLength(2);
  });
});
