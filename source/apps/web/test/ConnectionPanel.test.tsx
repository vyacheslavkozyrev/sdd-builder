// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlockArrowPanel, ConnectionPanel } from '../src/builder/ConnectionPanel.js';
import { flowArrows } from '../src/builder/blockArrows.js';
import type { Arrow } from '../src/builder/connect.js';
import type { Pipeline } from '../src/builder/fields.js';

// The connection panel is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

afterEach(() => {
  cleanup();
});

type Flow = core.Flow;

function flow(id: string, name = id, next?: string): Flow {
  const base: Flow = {
    index: 0,
    id,
    name,
    description: `The ${name} step.`,
    arguments: [],
    body: `Do the ${name} work.`,
    artifacts: [{ label: `${id}.md`, template: 'output.md' }],
    approval: true,
    blocks: [],
  };
  return next === undefined ? base : { ...base, next };
}

function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((item, index) => ({ ...item, index })),
  };
}

// plan -> build -> verify: the arrow selected in most tests is build to verify.
function chain(): Pipeline {
  return pipelineOf(flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'Plan', 'a0c3aad4-8765-5b23-8df5-7c03d481233c'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c', 'Build', '888b47d9-bbf6-5511-b91e-e344ce1da719'), flow('888b47d9-bbf6-5511-b91e-e344ce1da719', 'Verify'));
}

const BUILD_TO_VERIFY: Arrow = { source: 'a0c3aad4-8765-5b23-8df5-7c03d481233c', target: '888b47d9-bbf6-5511-b91e-e344ce1da719' };

function renderPanel(pipelineState: Pipeline = chain(), arrow: Arrow = BUILD_TO_VERIFY) {
  const onDelete = vi.fn();
  render(<ConnectionPanel pipelineState={pipelineState} arrow={arrow} onDelete={onDelete} />);
  return { onDelete };
}

describe('F-11 AC-017 connection panel', () => {
  it('F-11 AC-017 shows the source and the target flow names, read-only', () => {
    renderPanel();

    expect(screen.getByLabelText('Source · read only').textContent).toBe('Build');
    expect(screen.getByLabelText('Target · read only').textContent).toBe('Verify');
  });

  it('F-11 AC-017 has no field that changes the source or the target', () => {
    const { container } = render(
      <ConnectionPanel pipelineState={chain()} arrow={BUILD_TO_VERIFY} onDelete={vi.fn()} />,
    );

    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it("F-11 AC-017 notes that artifacts and approval are in the source flow's panel", () => {
    renderPanel();

    expect(screen.getByText("Artifacts and approval are in the source flow's panel.")).toBeTruthy();
  });
});

describe('F-11 AC-018 delete connection asks first', () => {
  it('F-11 AC-018 asks for confirmation and changes nothing until it is confirmed', () => {
    const { onDelete } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Delete connection' }));

    const dialog = screen.getByRole('dialog', { name: 'Delete connection?' });
    expect(within(dialog).getByText('Are you sure you want to delete this connection?')).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('F-11 AC-018 Cancel keeps the arrow', async () => {
    const { onDelete } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Delete connection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Target · read only').textContent).toBe('Verify');
  });

  it('F-11 AC-018 Confirm clears the source next and changes nothing else', async () => {
    const pipelineState = chain();
    const { onDelete } = renderPanel(pipelineState);

    fireEvent.click(screen.getByRole('button', { name: 'Delete connection' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete connection' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    const next = onDelete.mock.calls[0]?.[0] as Pipeline;
    const [plan, build, verify] = next.flows;
    expect(build).not.toHaveProperty('next');
    expect(plan).toEqual(pipelineState.flows[0]);
    expect(verify).toEqual(pipelineState.flows[2]);
    expect(build).toEqual({ ...pipelineState.flows[1], next: undefined });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('F-11 AC-018 Confirm on the arrow from the first flow keeps the flows it does not touch', () => {
    const pipelineState = chain();
    const { onDelete } = renderPanel(pipelineState, { source: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', target: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' });

    fireEvent.click(screen.getByRole('button', { name: 'Delete connection' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete connection' }));

    const next = onDelete.mock.calls[0]?.[0] as Pipeline;
    expect(next.flows[0]).not.toHaveProperty('next');
    expect(next.flows[1]).toEqual(pipelineState.flows[1]);
    expect(next.flows[2]).toEqual(pipelineState.flows[2]);
  });
});

// A flow of blocks: start to the planner Agent, which goes to End.
function blockFlow(): core.Flow {
  return {
    ...flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'Plan'),
    blocks: [
      { index: 0, id: 'start', kind: 'start', next: 'planner' },
      {
        index: 1,
        id: 'planner',
        kind: 'agent',
        name: 'planner',
        description: 'Plans.',
        arguments: [],
        next: 'done',
        body: 'Plan.',
      },
      { index: 2, id: 'done', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
    ],
  };
}

function renderBlockArrow(flowState: core.Flow = blockFlow()) {
  const onDelete = vi.fn();
  const arrow = flowArrows(flowState).find((item) => item.fromId === 'start');
  if (arrow === undefined) throw new Error('no arrow from start in the test flow');
  render(<BlockArrowPanel flow={flowState} arrow={arrow} onDelete={onDelete} />);
  return { onDelete };
}

describe('F-12 AC-021 block arrow connection panel', () => {
  it('F-12 AC-021 shows the block names of the arrow, read-only', () => {
    renderBlockArrow();

    expect(screen.getByLabelText('Source · read only').textContent).toBe('Start');
    expect(screen.getByLabelText('Target · read only').textContent).toBe('planner');
    expect(screen.queryByText("Artifacts and approval are in the source flow's panel.")).toBeNull();
  });

  it('F-12 AC-021 asks first and changes nothing when Cancel is pressed', async () => {
    const { onDelete } = renderBlockArrow();

    fireEvent.click(screen.getByRole('button', { name: 'Delete connection' }));
    expect(screen.getByRole('dialog', { name: 'Delete connection?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('F-12 AC-021 Confirm clears the source route and keeps the blocks and the other arrows', async () => {
    const flowState = blockFlow();
    const { onDelete } = renderBlockArrow(flowState);

    fireEvent.click(screen.getByRole('button', { name: 'Delete connection' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete connection' }));

    const next = onDelete.mock.calls[0]?.[0] as core.Flow;
    expect(next.blocks[0]).toEqual({ ...flowState.blocks[0], next: '' });
    expect(next.blocks.slice(1)).toEqual(flowState.blocks.slice(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-24) block arrow panel shows the whole name', () => {
  it('F-12 (no criterion: Verify device fix 2026-11-24) shows the whole long Condition description in the Source field', () => {
    const description =
      'all stories are generated and there is no conflicts with another stories and every story has a reviewed plan';
    const flowState: core.Flow = {
      ...blockFlow(),
      blocks: [
        { index: 0, id: 'start', kind: 'start', next: 'check' },
        { index: 1, id: 'check', kind: 'condition', description, true: { to: 'done' }, false: { stop: true } },
        { index: 2, id: 'done', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
      ],
    };
    const arrow = flowArrows(flowState).find((item) => item.fromId === 'check' && item.output === 'true');
    if (arrow === undefined) throw new Error('no true arrow from the condition in the test flow');
    render(<BlockArrowPanel flow={flowState} arrow={arrow} onDelete={vi.fn()} />);

    expect(screen.getByLabelText('Source · read only').textContent).toBe(`Condition: ${description}`);
  });
});
