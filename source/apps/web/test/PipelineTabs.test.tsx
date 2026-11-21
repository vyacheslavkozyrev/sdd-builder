// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline as model } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PipelineTabs } from '../src/builder/PipelineTabs.js';
import type { Pipeline, Tab } from '../src/builder/model.js';

// The tab row is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

afterEach(() => {
  cleanup();
});

type Flow = model.Flow;

function flow(id: string, name = id): Flow {
  return {
    index: 0,
    id,
    name,
    arguments: [],
    body: 'Do the work.',
    artifacts: [],
    approval: false,
    blocks: [],
  };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((f, i) => ({ ...f, index: i })),
  };
}

const PIPELINE: Tab = { kind: 'pipeline' };

function flowTab(id: string): Tab {
  return { kind: 'flow', id };
}

function renderTabs(pipelineState: Pipeline, openTab: Tab = PIPELINE) {
  const onSelectTab = vi.fn();
  const onAddFlow = vi.fn();
  render(
    <PipelineTabs pipelineState={pipelineState} openTab={openTab} onSelectTab={onSelectTab} onAddFlow={onAddFlow} />,
  );
  return { onSelectTab, onAddFlow };
}

function tabLabels(): string[] {
  return screen.getAllByRole('tab').map((tab) => tab.textContent ?? '');
}

describe('F-11 AC-001 tab row order', () => {
  it('F-11 AC-001 shows Pipeline first, then one tab per flow in pipeline order', () => {
    renderTabs(pipelineOf(flow('specify'), flow('plan'), flow('build')));

    expect(tabLabels()).toEqual(['Pipeline', 'specify', 'plan', 'build']);
  });

  it('F-11 AC-001 shows the flow name on its tab, not its id', () => {
    renderTabs(pipelineOf(flow('flow-1', 'Specify the work')));

    expect(tabLabels()).toEqual(['Pipeline', 'Specify the work']);
  });

  it('F-11 AC-001 shows only the Pipeline tab when there are no flows', () => {
    renderTabs(pipelineOf());

    expect(tabLabels()).toEqual(['Pipeline']);
  });

  it('F-11 AC-001 draws the + control after the last flow tab, outside the tab list', () => {
    renderTabs(pipelineOf(flow('specify'), flow('plan')));

    const tablist = screen.getByRole('tablist', { name: 'Pipeline tabs' });
    expect(Array.from(tablist.children).every((child) => child.getAttribute('role') === 'tab')).toBe(true);
    expect(Array.from(tablist.children).at(-1)).toBe(screen.getByRole('tab', { name: 'plan' }));
    expect(tablist.nextElementSibling).toBe(screen.getByRole('button', { name: 'Add flow' }));
  });

  it('F-11 AC-001 has no remove control on the Pipeline tab or on any tab', () => {
    renderTabs(pipelineOf(flow('specify')));

    const tablist = screen.getByRole('tablist', { name: 'Pipeline tabs' });
    expect(screen.queryByRole('button', { name: /remove|delete|close/i })).toBeNull();
    expect(within(tablist).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Pipeline', 'specify']);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['+']);
  });
});

describe('F-11 AC-001 open tab', () => {
  it('F-11 AC-001 marks the Pipeline tab as open when it is the open tab', () => {
    renderTabs(pipelineOf(flow('specify')), PIPELINE);

    expect(screen.getByRole('tab', { name: 'Pipeline' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'specify' }).getAttribute('aria-selected')).toBe('false');
  });

  it('F-11 AC-001 marks only the flow tab that is open', () => {
    renderTabs(pipelineOf(flow('specify'), flow('plan')), flowTab('plan'));

    expect(screen.getByRole('tab', { name: 'plan' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Pipeline' }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('tab', { name: 'specify' }).getAttribute('aria-selected')).toBe('false');
  });

  it('F-11 AC-001 marks the open flow tab by its id, even when its name differs', () => {
    renderTabs(pipelineOf(flow('flow-1', 'specify'), flow('flow-2', 'plan')), flowTab('flow-2'));

    expect(screen.getByRole('tab', { name: 'plan' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'specify' }).getAttribute('aria-selected')).toBe('false');
  });
});

describe('F-11 AC-001 tab clicks', () => {
  it('F-11 AC-001 calls onSelectTab with the Pipeline tab when Pipeline is clicked', () => {
    const { onSelectTab } = renderTabs(pipelineOf(flow('specify')), flowTab('specify'));

    fireEvent.click(screen.getByRole('tab', { name: 'Pipeline' }));

    expect(onSelectTab).toHaveBeenCalledTimes(1);
    expect(onSelectTab).toHaveBeenCalledWith(PIPELINE);
  });

  it('F-11 AC-001 calls onSelectTab with the flow tab when a flow is clicked', () => {
    const { onSelectTab } = renderTabs(pipelineOf(flow('specify'), flow('plan')));

    fireEvent.click(screen.getByRole('tab', { name: 'plan' }));

    expect(onSelectTab).toHaveBeenCalledTimes(1);
    expect(onSelectTab).toHaveBeenCalledWith(flowTab('plan'));
  });

  it('F-11 AC-001 does not select a tab on render, before any click', () => {
    const { onSelectTab, onAddFlow } = renderTabs(pipelineOf(flow('specify')));

    expect(onSelectTab).not.toHaveBeenCalled();
    expect(onAddFlow).not.toHaveBeenCalled();
  });
});

describe('F-11 AC-003 the + control', () => {
  it('F-11 AC-003 calls onAddFlow exactly once when + is clicked', () => {
    const { onAddFlow, onSelectTab } = renderTabs(pipelineOf(flow('specify')));

    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));

    expect(onAddFlow).toHaveBeenCalledTimes(1);
    expect(onSelectTab).not.toHaveBeenCalled();
  });

  it('F-11 AC-003 draws + after the Pipeline tab when there are no flows', () => {
    renderTabs(pipelineOf());

    expect(screen.getByRole('button', { name: 'Add flow' }).textContent).toBe('+');
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Pipeline']);
  });
});

describe('F-11 AC-004 no toolbox on the Pipeline tab', () => {
  it('F-11 AC-004 renders no Connection, Approval or Check tool with the Pipeline tab open', () => {
    renderTabs(pipelineOf(flow('specify')), PIPELINE);

    for (const name of ['Connection', 'Approval', 'Check']) {
      expect(screen.queryByRole('button', { name: new RegExp(name, 'i') })).toBeNull();
      expect(screen.queryByText(new RegExp(name, 'i'))).toBeNull();
    }
  });
});
