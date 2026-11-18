// @vitest-environment jsdom
// DOM tests for the pipeline arguments as rows (F-11 AC-025, AC-027; screen 09). Every edit goes through
// applyPipelineField 'arguments', so the refusals are the parser's; here the rows, the reason beside a row and the
// accepted and refused edits are checked on the rendered panel.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { pipeline } from '@sddbuilder/core';
import { PropertiesPanel } from '../src/builder/PropertiesPanel.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

afterEach(() => {
  cleanup();
});

function flow(id: string): Flow {
  return { id, name: id, description: `${id} description`, arguments: '', blocks: [] };
}

const ARGS: pipeline.Argument[] = [
  { id: 'feature-id', required: true, hint: 'The feature' },
  { id: 'topic', required: false, hint: '' },
];

function config(args: pipeline.Argument[] = ARGS): Pipeline {
  return { name: 'SDD process', description: 'The process we built', arguments: args, flows: [flow('plan')] };
}

// Holds the pipeline as the builder does, so an accepted edit shows in the panel at once.
function Harness({ initial, onChange }: { readonly initial: Pipeline; readonly onChange?: (next: Pipeline) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <PropertiesPanel
      pipeline={value}
      selection={undefined}
      onChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
      onDelete={vi.fn()}
      onSelect={vi.fn()}
    />
  );
}

function panel(): HTMLElement {
  return screen.getByRole('region', { name: 'Properties' });
}

function typeInto(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('F-11 AC-025 arguments as rows', () => {
  it('F-11 AC-025 shows each argument row with its id, required and hint', () => {
    render(<Harness initial={config()} />);
    const text = panel().textContent ?? '';
    expect(text).toContain('feature-id · required');
    expect(text).toContain('The feature');
    expect(text).toContain('topic');
    expect(screen.getByRole('button', { name: 'Edit feature-id' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove topic' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add argument' })).toBeTruthy();
  });

  it('F-11 AC-025 shows the row without a hint line when the hint is empty', () => {
    render(<Harness initial={config([{ id: 'topic', required: false, hint: '' }])} />);
    expect(screen.getByText('topic')).toBeTruthy();
    expect(panel().textContent).not.toContain('required');
  });
});

describe('F-11 AC-027 arguments edits', () => {
  it('F-11 AC-027 adds an accepted row and the panel shows it at once', () => {
    const onChange = vi.fn();
    render(<Harness initial={config()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    typeInto('Argument id', 'scope');
    typeInto('Hint', 'The scope');
    fireEvent.click(screen.getByRole('button', { name: 'Save argument' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      arguments: [...ARGS, { id: 'scope', required: false, hint: 'The scope' }],
    });
    expect(panel().textContent).toContain('scope');
    expect(screen.queryByLabelText('Argument id')).toBeNull();
  });

  it('F-11 AC-027 refuses a repeated id on a new row and names the row that uses it (screen 09)', () => {
    const onChange = vi.fn();
    render(<Harness initial={config()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    typeInto('Argument id', 'feature-id');
    fireEvent.click(screen.getByRole('button', { name: 'Save argument' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Refused: feature-id is already used by row 1. Rename this row.')).toBeTruthy();
    // The new row is not saved, so its draft stays open for a rename.
    expect((screen.getByLabelText('Argument id') as HTMLInputElement).value).toBe('feature-id');
  });

  it('F-11 AC-027 names the row that uses a repeated id when an edit clashes with another row', () => {
    const onChange = vi.fn();
    render(<Harness initial={config()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit topic' }));
    typeInto('Argument id', 'feature-id');
    fireEvent.click(screen.getByRole('button', { name: 'Save argument' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Refused: feature-id is already used by row 1. Rename this row.')).toBeTruthy();
    // The saved row keeps its saved id; the edit is closed.
    expect(screen.getByRole('button', { name: 'Edit topic' })).toBeTruthy();
    expect(screen.queryByLabelText('Argument id')).toBeNull();
  });

  it('F-11 AC-027 edits an accepted row in place', () => {
    const onChange = vi.fn();
    render(<Harness initial={config()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit feature-id' }));
    typeInto('Hint', 'The feature under build');
    fireEvent.click(screen.getByRole('button', { name: 'Save argument' }));
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({
      arguments: [{ id: 'feature-id', required: true, hint: 'The feature under build' }, ARGS[1]],
    });
    expect(panel().textContent).toContain('The feature under build');
  });

  it('F-11 AC-027 a refused edit keeps the saved row and shows the parser reason beside it', () => {
    const onChange = vi.fn();
    render(<Harness initial={config()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit topic' }));
    typeInto('Argument id', 'Topic Name');
    fireEvent.click(screen.getByRole('button', { name: 'Save argument' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/^Refused: Arguments at \[1\]\.id /)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit topic' })).toBeTruthy();
    expect(panel().textContent).not.toContain('Topic Name');
  });

  it('F-11 AC-027 cancelling an edit keeps the saved row unchanged (negative case)', () => {
    const onChange = vi.fn();
    render(<Harness initial={config()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit feature-id' }));
    typeInto('Argument id', 'other');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(panel().textContent).toContain('feature-id · required');
    expect(screen.queryByText(/Refused:/)).toBeNull();
  });

  it('F-11 AC-027 removes an accepted row', () => {
    const onChange = vi.fn();
    render(<Harness initial={config()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove topic' }));
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ arguments: [ARGS[0]] });
    expect(panel().textContent).not.toContain('topic');
  });

  it('F-11 AC-027 a refused edit clears when the next edit is accepted', () => {
    render(<Harness initial={config()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit topic' }));
    typeInto('Argument id', 'feature-id');
    fireEvent.click(screen.getByRole('button', { name: 'Save argument' }));
    expect(screen.getByText(/^Refused: /)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit topic' }));
    typeInto('Argument id', 'scope');
    fireEvent.click(screen.getByRole('button', { name: 'Save argument' }));
    expect(screen.queryByText(/^Refused: /)).toBeNull();
    expect(panel().textContent).toContain('scope');
  });
});
