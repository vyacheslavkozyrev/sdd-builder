// @vitest-environment jsdom
// DOM tests for the Workflow step's Pipeline tab body (F-11 AC-003, AC-005, AC-031, AC-040, AC-041). The step is
// rendered with a harness that holds the pipeline the way the wizard does, so every change is visible as the new
// value the step reports. No network call and no storage write is allowed on any path (AC-040).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline } from '@sddbuilder/core';
import { PipelineStep } from '../src/wizard/PipelineStep.js';
import { defaultWizardPipeline, type RuleBlock } from '../src/wizard/state.js';

type Pipeline = pipeline.Pipeline;

beforeEach(() => {
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

interface HarnessProps {
  readonly initial: Pipeline;
  readonly ruleBlocks?: readonly RuleBlock[];
  readonly onReport: (next: Pipeline) => void;
}

// Holds the pipeline as the wizard does: each report replaces the value the step receives.
function Harness({ initial, ruleBlocks = [], onReport }: HarnessProps) {
  const [value, setValue] = useState(initial);
  return (
    <PipelineStep
      pipeline={value}
      ruleBlocks={ruleBlocks}
      onChange={(next) => {
        onReport(next);
        setValue(next);
      }}
    />
  );
}

function setup(initial: Pipeline = defaultWizardPipeline(), ruleBlocks: readonly RuleBlock[] = []) {
  const onReport = vi.fn<(next: Pipeline) => void>();
  const view = render(<Harness initial={initial} ruleBlocks={ruleBlocks} onReport={onReport} />);
  return { onReport, ...view };
}

function tabNames(): string[] {
  return screen.getAllByRole('tab').map((tab) => tab.textContent ?? '');
}

function selectedTab(): string | null {
  return screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true')?.textContent ?? null;
}

function nodeOf(container: HTMLElement, id: string): HTMLElement {
  const node = container.querySelector(`.react-flow__node[data-id="${id}"]`);
  if (!(node instanceof HTMLElement)) {
    throw new Error(`No box for ${id}.`);
  }
  return node;
}

describe('F-11 AC-041 the Pipeline tab on step 3', () => {
  it('F-11 AC-041 opens on the Pipeline tab with the default pipeline: its flows as tabs in the default order', () => {
    setup();
    expect(tabNames()).toEqual(['Pipeline', 'Specify', 'UX', 'Plan', 'Build', 'Verify', 'Complete']);
    expect(selectedTab()).toBe('Pipeline');
  });

  it('F-11 AC-041 shows the toolbox, the canvas and the Pipeline properties on the Pipeline tab', () => {
    const { container } = setup();
    expect(screen.getByRole('region', { name: 'Toolbox' })).toBeTruthy();
    expect(container.querySelector('.react-flow')).not.toBeNull();
    expect(screen.getByText('Generates .claude/commands/pipeline.md')).toBeTruthy();
  });
});

describe('F-11 AC-003 and AC-005 adding a flow and the flow tab body', () => {
  it('F-11 AC-003 + adds one flow with no blocks, id flow-2, and opens its tab at once', () => {
    const { onReport } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    expect(onReport).toHaveBeenCalledTimes(1);
    const next = onReport.mock.calls[0]?.[0];
    expect(next?.flows.map((flow) => flow.id)).toContain('flow-2');
    expect(next?.flows.find((flow) => flow.id === 'flow-2')?.blocks).toEqual([]);
    expect(selectedTab()).toBe('flow-2');
    expect(screen.getByText('flow-2 · 0 blocks')).toBeTruthy();
  });

  it('F-11 AC-005 a flow tab shows its name, the placeholder and no canvas (negative case: the canvas is not drawn)', () => {
    const { container } = setup();
    fireEvent.click(screen.getByRole('tab', { name: 'Verify' }));
    expect(selectedTab()).toBe('Verify');
    expect(screen.getByText('Verify · 3 blocks')).toBeTruthy();
    expect(screen.getByText('The blocks of Verify are built in F-12.')).toBeTruthy();
    expect(screen.getByText('The canvas is on the Pipeline tab.')).toBeTruthy();
    expect(container.querySelector('.react-flow')).toBeNull();
  });
});

describe('F-11 AC-031 Delete flow from the step', () => {
  it('F-11 AC-031 a confirmed Delete flow removes the flow, clears the selection and moves the tab to Pipeline', () => {
    const { container, onReport } = setup();
    fireEvent.click(nodeOf(container, 'build'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete flow' }));
    expect(onReport).toHaveBeenCalledTimes(1);
    const next = onReport.mock.calls[0]?.[0];
    expect(next?.flows.map((flow) => flow.id)).not.toContain('build');
    expect(tabNames()).not.toContain('Build');
    expect(selectedTab()).toBe('Pipeline');
    expect(screen.getByText('Generates .claude/commands/pipeline.md')).toBeTruthy();
  });

  it('F-11 AC-031 Cancel keeps the flow and its tab (negative case: nothing is reported)', () => {
    const { container, onReport } = setup();
    fireEvent.click(nodeOf(container, 'build'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onReport).not.toHaveBeenCalled();
    expect(tabNames()).toContain('Build');
  });
});

describe('F-11 AC-040 no network call and no storage on a change', () => {
  it('F-11 AC-040 adding a flow reports the pipeline and calls no network and writes no storage', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { onReport } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add flow' }));
    expect(onReport).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });
});
