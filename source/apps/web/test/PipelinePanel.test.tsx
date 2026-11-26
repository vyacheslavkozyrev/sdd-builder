// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Pipeline, Rule } from '../src/builder/fields.js';
import { PipelinePanel } from '../src/builder/PipelinePanel.js';
import { editPipelineField, type PipelineFieldEdit } from '../src/builder/pipelineFields.js';
import { defaultPipelineValue } from '../src/wizard/state.js';

// The pipeline panel is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

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
    approval: false,
    blocks: [],
  };
  return next === undefined ? base : { ...base, next };
}

// The pipeline as screen 01 shows it: a name, a description, a model, tools, a body and one argument.
function pipelineState(): Pipeline {
  return {
    name: 'SDD process',
    description: 'The process we built',
    arguments: [{ index: 0, id: '82f01964-ec89-5b1a-8ccc-5a29c72f2adf', required: true, hint: 'The feature' }],
    model: 'inherit',
    tools: ['Read', 'Write', 'Edit', 'Bash'],
    body: 'Runs the feature from specify to complete.',
    ruleTags: [{ ruleId: '1b206118-4f23-5ed9-8340-8256dd24178c', index: 0 }],
    flows: [flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'Plan', 'a0c3aad4-8765-5b23-8df5-7c03d481233c'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c', 'Build')].map((item, index) => ({ ...item, index })),
  };
}

const RULES: readonly Rule[] = [
  { index: 0, id: '1b206118-4f23-5ed9-8340-8256dd24178c', title: '1b206118-4f23-5ed9-8340-8256dd24178c', text: 'The general rule.' },
  { index: 1, id: '2146d294-d7bb-5ff8-af8d-1981e7f569d7', title: '2146d294-d7bb-5ff8-af8d-1981e7f569d7', text: 'The qa rule.' },
];

function renderPanel(saved: Pipeline = pipelineState()) {
  const onChange = vi.fn();
  render(<PipelinePanel pipelineState={saved} rules={RULES} onChange={onChange} />);
  return { onChange };
}

// The parser's reason for an edit the panel is expected to refuse; the panel must show exactly this text.
function parserReason(saved: Pipeline, change: PipelineFieldEdit): string {
  const result = editPipelineField(saved, RULES, change);
  if (result.ok) throw new Error('the test edit was accepted by the parser');
  return result.reason;
}

describe('F-11 AC-042 the pipeline panel', () => {
  it('F-11 AC-042 shows the pipeline fields when nothing is selected', () => {
    renderPanel();

    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'SDD process');
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'The process we built');
    expect(screen.getByLabelText('Tools')).toHaveProperty('value', 'Read, Write, Edit, Bash');
    expect(screen.getByLabelText('Body')).toHaveProperty('value', 'Runs the feature from specify to complete.');
  });
});

describe('F-11 AC-045 pipeline panel fields', () => {
  it('F-11 AC-045 shows the fields in the order of screen 01', () => {
    renderPanel();

    const text = document.body.textContent ?? '';
    const order = ['Name', 'Description', 'Arguments', 'Model', 'Tools', 'Rule tags', 'Body'];
    const positions = order.map((label) => text.indexOf(label));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('F-11 AC-045 shows the arguments and rule tags as row editors', () => {
    renderPanel();

    expect(screen.getByRole('group', { name: 'Argument 1' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Rule tag 1' })).toBeTruthy();
  });

  it('F-11 AC-045 has no Delete control, and a footer that says the pipeline cannot be removed', () => {
    renderPanel();

    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
    expect(screen.getByText('The pipeline cannot be removed.')).toBeTruthy();
  });

  it('F-11 AC-045 accepts a new name and reports the new pipeline', () => {
    const { onChange } = renderPanel();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ name: 'Renamed' });
  });

  it('F-11 AC-045 shows the parser reason for a blank name and keeps the field empty under it', () => {
    const saved = pipelineState();
    const reason = parserReason(saved, { field: 'name', value: '   ' });
    const { onChange } = renderPanel(saved);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason).id).toBe('pipeline-name-refusal');
    expect(screen.getByLabelText('Name')).toHaveProperty('value', '   ');
  });

  it('F-11 AC-045 refuses a description longer than 1000 characters and keeps the saved one', () => {
    const saved = pipelineState();
    const longText = 'd'.repeat(1001);
    const reason = parserReason(saved, { field: 'description', value: longText });
    const { onChange } = renderPanel(saved);

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: longText } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'The process we built');
  });

  it('F-11 AC-045 sets the model the user picks, from the same options as a flow', () => {
    const { onChange } = renderPanel();

    const options = within(screen.getByLabelText('Model'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual(['', 'haiku', 'sonnet', 'opus', 'inherit']);

    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'sonnet' } });

    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ model: 'sonnet' });
  });

  it('F-11 AC-045 unsets the model when the blank option is picked', () => {
    const { onChange } = renderPanel();

    fireEvent.change(screen.getByLabelText('Model'), { target: { value: '' } });

    const next = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(next).not.toHaveProperty('model');
  });

  it('F-11 AC-045 splits the tools the user types on commas and reports them as a list', () => {
    const { onChange } = renderPanel();

    fireEvent.change(screen.getByLabelText('Tools'), { target: { value: 'Read,  Grep , ,Glob' } });

    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ tools: ['Read', 'Grep', 'Glob'] });
    expect(screen.getByLabelText('Tools')).toHaveProperty('value', 'Read,  Grep , ,Glob');
  });

  it('F-11 AC-045 refuses a tool longer than 100 characters with the parser reason and keeps the saved tools', () => {
    const saved = pipelineState();
    const tooLong = 't'.repeat(101);
    const reason = parserReason(saved, { field: 'tools', value: `Read, ${tooLong}` });
    const { onChange } = renderPanel(saved);

    fireEvent.change(screen.getByLabelText('Tools'), { target: { value: `Read, ${tooLong}` } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Tools')).toHaveProperty('value', 'Read, Write, Edit, Bash');
  });
});

describe('F-11 AC-044 pipeline body', () => {
  it('F-11 AC-044 shows the counter as n / 1000 characters under the body', () => {
    renderPanel();

    expect(screen.getByText('42 / 1000 characters')).toBeTruthy();
  });

  it('F-11 AC-044 accepts an empty body and counts it as 0', () => {
    const { onChange } = renderPanel();

    fireEvent.change(screen.getByLabelText('Body'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ body: '' });
    expect(screen.getByText('0 / 1000 characters')).toBeTruthy();
  });

  it('F-11 AC-044 accepts a body of exactly 1000 characters', () => {
    const { onChange } = renderPanel();
    const body = 'b'.repeat(1000);

    fireEvent.change(screen.getByLabelText('Body'), { target: { value: body } });

    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ body });
    expect(screen.getByText('1000 / 1000 characters')).toBeTruthy();
  });

  it('F-11 AC-044 refuses a body of 1001 characters with the reason and keeps the saved body', () => {
    const saved = pipelineState();
    const longBody = 'b'.repeat(1001);
    const reason = parserReason(saved, { field: 'body', value: longBody });
    const { onChange } = renderPanel(saved);

    fireEvent.change(screen.getByLabelText('Body'), { target: { value: longBody } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Body')).toHaveProperty('value', 'Runs the feature from specify to complete.');
    expect(screen.getByText('42 / 1000 characters')).toBeTruthy();
  });
});

// A lower-case GUID in the 8-4-4-4-12 form (F-16 AC-027): a new argument's id is generated, so the test does not know it.
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('F-11 AC-043 the default pipeline arguments on the pipeline panel', () => {
  it('F-11 AC-043 draws the saved feature-id argument as a field with a ticked "required" box and a minus', () => {
    const onChange = vi.fn();
    render(<PipelinePanel pipelineState={defaultPipelineValue()} rules={RULES} onChange={onChange} />);

    const row = within(screen.getByRole('group', { name: 'Argument 1' }));
    expect(screen.getByLabelText('Argument 1 name')).toHaveProperty('value', 'F-XX');
    expect(row.getByRole('checkbox', { name: 'required' })).toHaveProperty('checked', true);
    expect(row.getByRole('button', { name: 'Remove argument 1' })).toBeTruthy();
  });

  it('F-11 AC-043 keeps the new line closed until + is pressed', () => {
    const onChange = vi.fn();
    render(<PipelinePanel pipelineState={defaultPipelineValue()} rules={RULES} onChange={onChange} />);

    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
    expect(screen.queryByLabelText('New argument name')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    expect(screen.getByRole('group', { name: 'New argument' })).toBeTruthy();
  });

  it('F-11 AC-043 + adds one line with a text box and a minus, and no Cancel or Save', () => {
    const onChange = vi.fn();
    render(<PipelinePanel pipelineState={defaultPipelineValue()} rules={RULES} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));

    const line = within(screen.getByRole('group', { name: 'New argument' }));
    expect(line.getByLabelText('New argument name')).toBeTruthy();
    expect(line.getByRole('button', { name: 'Cancel new argument' })).toBeTruthy();
    expect(line.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(line.queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('F-11 AC-043 a valid id typed on the pipeline panel line is saved through the parser on blur', () => {
    const onChange = vi.fn();
    render(<PipelinePanel pipelineState={defaultPipelineValue()} rules={RULES} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    const input = screen.getByLabelText('New argument name');
    fireEvent.change(input, { target: { value: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' } });
    fireEvent.blur(input);

    const next = onChange.mock.calls[0]?.[0] as { arguments: { id: string }[] } | undefined;
    expect(next?.arguments.map((item) => item.id)).toEqual([
      'b74a414b-c3b7-41f5-b780-08c2c613df86',
      expect.stringMatching(GUID),
    ]);
    expect(next?.arguments[1]).toEqual({ index: 1, id: expect.stringMatching(GUID), required: false, hint: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038' });
  });
});

describe('F-11 (no criterion: Verify device fix 2026-11-24) required name', () => {
  it('F-11 (no criterion: Verify device fix 2026-11-24) shows no error for a saved name that has text', () => {
    const saved = pipelineState();
    const reason = parserReason(saved, { field: 'name', value: '' });
    renderPanel(saved);

    expect(screen.queryByText(reason)).toBeNull();
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) shows the empty-name error on the key press that empties the name, and hides it once text is typed', () => {
    const saved = pipelineState();
    const reason = parserReason(saved, { field: 'name', value: '' });
    renderPanel(saved);
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.keyUp(input, { key: ' ' });
    expect(screen.getByText(reason).id).toBe('pipeline-name-refusal');

    fireEvent.change(input, { target: { value: 'S' } });
    fireEvent.keyUp(input, { key: 'S' });
    expect(screen.queryByText(reason)).toBeNull();
  });
});

// The control box of a field: the box its TextField sits in. A field's reason is drawn inside that box.
function controlBoxOf(input: HTMLElement): HTMLElement {
  const box = input.closest('.MuiTextField-root')?.parentElement;
  if (box === null || box === undefined) throw new Error('the field has no control box');
  return box;
}

describe('F-11 (no criterion: Verify device fix 2026-11-24) error inside its field box', () => {
  it('F-11 (no criterion: Verify device fix 2026-11-24) draws the empty-name error inside the name control box, 4 px under the field', () => {
    const saved = pipelineState();
    const reason = parserReason(saved, { field: 'name', value: '' });
    renderPanel(saved);
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });

    const control = controlBoxOf(input);
    expect(screen.getByText(reason).parentElement).toBe(control);
    expect(control.contains(input)).toBe(true);
    expect(getComputedStyle(control).getPropertyValue('gap')).toBe('4px');
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) keeps the optional description error outside the control boxes', () => {
    const saved = pipelineState();
    const reason = parserReason(saved, { field: 'description', value: 'x'.repeat(1001) });
    renderPanel(saved);
    const input = screen.getByLabelText('Description');

    fireEvent.change(input, { target: { value: 'x'.repeat(1001) } });
    fireEvent.blur(input);

    expect(screen.getByText(reason).parentElement).not.toBe(controlBoxOf(input));
  });
});

// F-16 AC-025: the pipeline of a new project with two flows from Add flow. Each flow has a blank body and no link, and
// the name is blank until the user types it. The parser reports the missing links only once the name is not blank.
function newFlowsPipeline(): Pipeline {
  const added = (index: number, id: string): Flow => ({
    index,
    id,
    name: id,
    arguments: [],
    body: '',
    artifacts: [],
    approval: false,
    blocks: [],
  });
  return { name: '', description: '', arguments: [], flows: [added(0, '40174c6b-ffc9-5a01-af92-33a352fc884a'), added(1, '02e82ffe-8c62-50f5-acea-711320561fab')] };
}

// Types `value` into the field one character at a time, as the user does, and checks each character is kept.
function typeEachCharacter(label: string, value: string) {
  let text = '';
  for (const character of value) {
    text += character;
    fireEvent.change(screen.getByLabelText(label), { target: { value: text } });
    expect(screen.getByLabelText(label)).toHaveProperty('value', text);
  }
}

describe('F-16 AC-025 the pipeline text fields can be typed into while a flow has no link', () => {
  it.each([
    ['Name', 'Pipeline', 'name', 'Pipeline'],
    ['Description', 'Writes the plan.', 'description', 'Writes the plan.'],
    ['Body', 'Runs the feature.', 'body', 'Runs the feature.'],
    ['Tools', 'Read, Write', 'tools', ['Read', 'Write']],
  ])('F-16 AC-025 keeps each character typed into %s, and saves it', (label, value, key, expected) => {
    const { onChange } = renderPanel(newFlowsPipeline());

    typeEachCharacter(label, value);

    expect(onChange.mock.calls.at(-1)?.[0]).toMatchObject({ [key]: expected });
  });

  it('F-16 AC-025 negative case: a blank name still shows the parser reason under the Name field', () => {
    const saved: Pipeline = { ...newFlowsPipeline(), name: 'Demo' };
    const reason = parserReason(saved, { field: 'name', value: '' });
    renderPanel(saved);
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.keyUp(input, { key: ' ' });

    expect(screen.getByText(reason).id).toBe('pipeline-name-refusal');
  });
});
