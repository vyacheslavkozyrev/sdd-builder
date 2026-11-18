// @vitest-environment jsdom
// DOM tests for the buttons of the properties panel (F-11 AC-014 to AC-019, AC-021, AC-031). The pure rules are
// tested in connect.test.ts, gates.test.ts and delete.test.ts; here the buttons, the pickers, the refusals under the
// buttons and the confirmations are checked through the DOM. Cancel is proved to change nothing: the pipeline is
// compared as JSON before and after.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { pipeline } from '@sddbuilder/core';
import { PropertiesPanel } from '../src/builder/PropertiesPanel.js';
import { connectFlows } from '../src/builder/connect.js';
import type { Selection } from '../src/builder/panel.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

afterEach(() => {
  cleanup();
});

function flow(id: string, extra: Partial<Flow> = {}): Flow {
  return { id, name: id, description: '', arguments: '', blocks: [], ...extra };
}

function config(flows: Flow[]): Pipeline {
  return { name: 'SDD process', description: '', arguments: [], flows };
}

// plan → build (approval gate), build → verify (no gate), verify → complete (check gate), specify has no arrow.
const PIPELINE = config([
  flow('specify'),
  flow('plan', { connectedTo: { to: 'build', label: 'plan.md', gate: { kind: 'approval', description: 'the plan is right' } } }),
  flow('build', { connectedTo: { to: 'verify', label: 'commits' } }),
  flow('verify', { connectedTo: { to: 'complete', label: 'report', gate: { kind: 'approval', description: 'verified' } } }),
  flow('complete'),
]);

interface Seen {
  pipeline: Pipeline;
  selection: Selection | undefined;
  changes: number;
}

// Holds the pipeline and the selection as the builder does, so an accepted action shows at once.
function Host({ initial, start, seen, onDelete }: {
  readonly initial: Pipeline;
  readonly start: Selection | undefined;
  readonly seen: Seen;
  readonly onDelete: (flowId: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const [selection, setSelection] = useState(start);
  return (
    <PropertiesPanel
      pipeline={value}
      selection={selection}
      onChange={(next) => {
        seen.changes += 1;
        seen.pipeline = next;
        setValue(next);
      }}
      onDelete={onDelete}
      onSelect={(next) => {
        seen.selection = next;
        setSelection(next);
      }}
    />
  );
}

function setup(initial: Pipeline, start: Selection | undefined, onDelete = vi.fn()): Seen {
  const seen: Seen = { pipeline: initial, selection: start, changes: 0 };
  render(<Host initial={initial} start={start} seen={seen} onDelete={onDelete} />);
  return seen;
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name }) as HTMLButtonElement;
}

function type(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function pick(name: RegExp, option: string): void {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

// The reason of a refused action: the alert under the buttons, or the helper text under a field.
function alertText(): string {
  return screen.getByText(/^Refused: /).textContent ?? '';
}

describe('F-11 AC-014 Connect to next flow', () => {
  it('F-11 AC-014 choosing a flow with a label makes the same connection a drag would make', () => {
    const seen = setup(PIPELINE, { kind: 'flow', id: 'specify' });
    type('Artifact label · required', 'screens.md');
    fireEvent.click(button('Connect to next flow ▾'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'plan' }));
    const drag = connectFlows(PIPELINE, { source: 'specify', target: 'plan', label: 'screens.md' });
    expect(drag.ok).toBe(true);
    expect(seen.pipeline).toEqual(drag.ok ? drag.pipeline : undefined);
    expect(seen.pipeline.flows[0]?.connectedTo).toEqual({ to: 'plan', label: 'screens.md' });
  });

  it('F-11 AC-014 the picker lists the other flows, not the selected one', () => {
    setup(PIPELINE, { kind: 'flow', id: 'specify' });
    fireEvent.click(button('Connect to next flow ▾'));
    const names = screen.getAllByRole('menuitem').map((item) => item.textContent);
    expect(names).toEqual(['plan', 'build', 'verify', 'complete']);
  });

  it('F-11 AC-014 a blank artifact label is refused under the label and nothing is connected (negative case)', () => {
    const seen = setup(PIPELINE, { kind: 'flow', id: 'specify' });
    fireEvent.click(button('Connect to next flow ▾'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'plan' }));
    expect(alertText()).toMatch(/^Refused: The artifact label is required/);
    expect(seen.changes).toBe(0);
    expect(seen.pipeline).toBe(PIPELINE);
  });
});

describe('F-11 AC-015 repointing an arrow end', () => {
  it('F-11 AC-015 Target flow changes only the target; the label and the gate stay', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'plan' });
    pick(/^Target flow/, 'verify');
    expect(seen.pipeline.flows[1]?.connectedTo).toEqual({
      to: 'verify',
      label: 'plan.md',
      gate: { kind: 'approval', description: 'the plan is right' },
    });
    expect(seen.selection).toEqual({ kind: 'arrow', source: 'plan' });
  });

  it('F-11 AC-015 Source flow moves the whole arrow and the selection follows it', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'build' });
    pick(/^Source flow/, 'specify');
    expect(seen.pipeline.flows[0]?.connectedTo).toEqual({ to: 'verify', label: 'commits' });
    expect(seen.pipeline.flows[2]?.connectedTo).toBeUndefined();
    expect(seen.selection).toEqual({ kind: 'arrow', source: 'specify' });
  });

  it('F-11 AC-015 a refused end keeps the saved flow (negative case: a self-connection)', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'build' });
    pick(/^Target flow/, 'build');
    expect(screen.getByText(/^Refused: A flow cannot connect to itself/)).toBeTruthy();
    expect(seen.changes).toBe(0);
    expect(seen.pipeline).toBe(PIPELINE);
    expect(screen.getByRole('combobox', { name: /^Target flow/ }).textContent).toBe('verify');
  });
});

describe('F-11 AC-016 Delete connection asks first', () => {
  it('F-11 AC-016 a confirmed delete removes the connection and its gate; the flows stay', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'verify' });
    fireEvent.click(button('Delete connection'));
    expect(screen.getByRole('dialog').textContent).toContain('Delete the arrow verify → complete?');
    expect(seen.changes).toBe(0);
    fireEvent.click(button('Delete connection'));
    expect(seen.pipeline.flows.map((item) => item.id)).toEqual(['specify', 'plan', 'build', 'verify', 'complete']);
    expect(seen.pipeline.flows[3]?.connectedTo).toBeUndefined();
    expect(seen.selection).toBeUndefined();
  });

  it('F-11 AC-016 Cancel changes nothing (negative case: the pipeline is the same JSON before and after)', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'verify' });
    const before = JSON.stringify(seen.pipeline);
    fireEvent.click(button('Delete connection'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(JSON.stringify(seen.pipeline)).toBe(before);
    expect(seen.changes).toBe(0);
    expect(seen.selection).toEqual({ kind: 'arrow', source: 'verify' });
  });
});

describe('F-11 AC-017 Add approval', () => {
  it('F-11 AC-017 a blank description is refused with the reason, adds no gate, and the button stays enabled (negative case)', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'build' });
    fireEvent.click(button('Add approval'));
    expect(alertText()).toMatch(/^Refused: /);
    expect(seen.changes).toBe(0);
    expect(seen.pipeline.flows[2]?.connectedTo?.gate).toBeUndefined();
    expect(button('Add approval').disabled).toBe(false);
  });

  it('F-11 AC-017 an approval with a description is added to the arrow', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'build' });
    type('Description · required', 'the owner approves');
    fireEvent.click(button('Add approval'));
    expect(seen.pipeline.flows[2]?.connectedTo?.gate).toEqual({ kind: 'approval', description: 'the owner approves' });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('F-11 AC-018 Add check', () => {
  const rows: Array<{ name: string; type: string; threshold: string; valid: boolean }> = [
    { name: 'checks without a threshold is valid', type: 'checks', threshold: '', valid: true },
    { name: 'diff size with a positive whole number is valid', type: 'diff size', threshold: '200', valid: true },
    { name: 'diff size with zero is refused', type: 'diff size', threshold: '0', valid: false },
    { name: 'diff size with a blank threshold is refused', type: 'diff size', threshold: '', valid: false },
    { name: 'diff size with a negative threshold is refused', type: 'diff size', threshold: '-3', valid: false },
    { name: 'diff size with a fractional threshold is refused', type: 'diff size', threshold: '2.5', valid: false },
  ];

  it.each(rows)('F-11 AC-018 $name', ({ type: checkType, threshold, valid }) => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'build' });
    type('Description · required', 'what passing means');
    pick(/^Type/, checkType);
    if (checkType === 'diff size') {
      type('Threshold (lines) · required', threshold);
    }
    fireEvent.click(button('Add check'));
    if (valid) {
      expect(seen.pipeline.flows[2]?.connectedTo?.gate?.kind).toBe('check');
      expect(screen.queryByRole('alert')).toBeNull();
    } else {
      expect(alertText()).toMatch(/^Refused: /);
      expect(seen.changes).toBe(0);
      expect(seen.pipeline.flows[2]?.connectedTo?.gate).toBeUndefined();
    }
  });

  it('F-11 AC-018 a threshold typed under diff size is refused on checks, with the reason, and adds no gate (negative case)', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'build' });
    type('Description · required', 'what passing means');
    pick(/^Type/, 'diff size');
    type('Threshold (lines) · required', '200');
    pick(/^Type/, 'checks');
    fireEvent.click(button('Add check'));
    expect(alertText()).toBe('Refused: Threshold is not allowed on a checks gate.');
    expect(seen.changes).toBe(0);
    expect(seen.pipeline.flows[2]?.connectedTo?.gate).toBeUndefined();
  });

  it('F-11 AC-018 a check with no description is refused and adds no gate (negative case)', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'build' });
    fireEvent.click(button('Add check'));
    expect(alertText()).toMatch(/^Refused: /);
    expect(seen.changes).toBe(0);
  });
});

describe('F-11 AC-019 one gate per arrow', () => {
  it('F-11 AC-019 a second gate is refused with the reason and the existing gate stays (negative case)', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'plan' });
    fireEvent.click(button('Add check'));
    expect(alertText()).toMatch(/already has a gate/);
    expect(seen.changes).toBe(0);
    expect(seen.pipeline.flows[1]?.connectedTo?.gate).toEqual({ kind: 'approval', description: 'the plan is right' });
    expect(button('Add approval').disabled).toBe(false);
    expect(button('Add check').disabled).toBe(false);
  });
});

describe('F-11 AC-021 Remove gate', () => {
  it('F-11 AC-021 removes only the gate; the connection stays and no confirmation is asked', () => {
    const seen = setup(PIPELINE, { kind: 'arrow', source: 'plan' });
    fireEvent.click(button('Remove gate'));
    expect(seen.pipeline.flows[1]?.connectedTo).toEqual({ to: 'build', label: 'plan.md' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(seen.selection).toEqual({ kind: 'arrow', source: 'plan' });
  });
});

describe('F-11 AC-031 Delete flow asks first and names the arrows and gates', () => {
  it('F-11 AC-031 the confirmation names every arrow of the flow, in and out, with its gate', () => {
    const onDelete = vi.fn();
    setup(PIPELINE, { kind: 'flow', id: 'build' }, onDelete);
    fireEvent.click(button('Delete flow'));
    const text = screen.getByRole('dialog').textContent ?? '';
    expect(text).toContain('Delete flow build?');
    expect(text).toContain('plan → build · plan.md · approval');
    expect(text).toContain('build → verify · commits · no gate');
    expect(text).toContain('Other flows and connections stay.');
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('F-11 AC-031 a flow with no connections says so in the confirmation', () => {
    setup(config([flow('lonely'), flow('other')]), { kind: 'flow', id: 'lonely' });
    fireEvent.click(button('Delete flow'));
    expect(screen.getByRole('dialog').textContent).toContain('This removes the flow and its 0 blocks. It has no connections.');
  });

  it('F-11 AC-031 a confirmed delete calls the caller with the flow id', () => {
    const onDelete = vi.fn();
    setup(PIPELINE, { kind: 'flow', id: 'build' }, onDelete);
    fireEvent.click(button('Delete flow'));
    fireEvent.click(button('Delete flow'));
    expect(onDelete).toHaveBeenCalledWith('build');
  });

  it('F-11 AC-031 Cancel changes nothing (negative case: the pipeline is the same JSON before and after)', () => {
    const onDelete = vi.fn();
    const seen = setup(PIPELINE, { kind: 'flow', id: 'build' }, onDelete);
    const before = JSON.stringify(seen.pipeline);
    fireEvent.click(button('Delete flow'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
    expect(JSON.stringify(seen.pipeline)).toBe(before);
    expect(seen.changes).toBe(0);
  });
});
