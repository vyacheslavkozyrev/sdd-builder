// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteFlow } from '../src/builder/delete.js';
import { addFlow } from '../src/builder/model.js';
import { FlowPanel, bodyCounterText } from '../src/builder/FlowPanel.js';
import { editFlowField } from '../src/builder/fields.js';
import type { Pipeline } from '../src/builder/fields.js';

// The flow panel is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

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

function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((item, index) => ({ ...item, index })),
  };
}

// Two flows: plan (selected in most tests) and build, so a name can clash with another flow.
function twoFlows(): Pipeline {
  return pipelineOf(flow('plan', 'Plan', 'build'), flow('build', 'Build'));
}

function renderPanel(pipelineState: Pipeline, flowId = 'plan') {
  const onChange = vi.fn();
  const onDelete = vi.fn();
  const selected = pipelineState.flows.find((item) => item.id === flowId);
  if (selected === undefined) throw new Error(`no flow ${flowId} in the test pipeline`);
  render(
    <FlowPanel pipelineState={pipelineState} rules={[]} flow={selected} onChange={onChange} onDelete={onDelete} />,
  );
  return { onChange, onDelete };
}

// The parser's reason for an edit the panel is expected to refuse; the panel must show exactly this text.
function parserReason(pipelineState: Pipeline, flowId: string, change: Parameters<typeof editFlowField>[3]): string {
  const result = editFlowField(pipelineState, [], flowId, change);
  if (result.ok) throw new Error('the test edit was accepted by the parser');
  return result.reason;
}

describe('F-11 AC-019 flow panel fields', () => {
  it('F-11 AC-019 shows the fields in order: name, description, arguments, model, body, artifacts, rule tags, Human approval', () => {
    renderPanel(twoFlows());

    const order = [
      'Name',
      'Description',
      'Arguments',
      'Model',
      'Body · required',
      'Outcome artifacts',
      'Rule tags',
      'Human approval',
    ];
    const positions = order.map((label) => document.body.textContent?.indexOf(label) ?? -1);
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('F-11 AC-019 has no checks field and no next-flow field', () => {
    renderPanel(twoFlows());

    expect(screen.queryByText(/check/i)).toBeNull();
    expect(screen.queryByText(/next/i)).toBeNull();
    expect(screen.queryByLabelText(/check/i)).toBeNull();
    expect(screen.queryByLabelText(/next/i)).toBeNull();
  });

  it('F-11 AC-019 shows the saved name, description and body in their fields', () => {
    renderPanel(twoFlows());

    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Plan');
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'The Plan step.');
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'Do the Plan work.');
  });
});

describe('F-11 AC-020 name', () => {
  it('F-11 AC-020 accepts a new name and reports the new pipeline', () => {
    const { onChange } = renderPanel(twoFlows());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Planning' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(next.flows[0]?.name).toBe('Planning');
  });

  it('F-11 AC-020 trims the name it saves but keeps the space the user typed', () => {
    const { onChange } = renderPanel(twoFlows());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Plan ' } });

    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ flows: [{ name: 'Plan' }, expect.anything()] });
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Plan ');
  });

  it('F-11 AC-020 shows the parser reason for a blank name and keeps the field empty under it', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: '   ' });
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', '   ');
  });

  it('F-11 AC-020 refuses a name that another flow has with no error shown, and keeps the saved name', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: 'Build' });
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Build' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(reason)).toBeNull();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Plan');
  });
});

describe('F-11 AC-021 description', () => {
  it('F-11 AC-021 accepts a description of 1000 characters', () => {
    const { onChange } = renderPanel(twoFlows());
    const text = 'd'.repeat(1000);

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: text } });

    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ flows: [{ description: text }, expect.anything()] });
  });

  it('F-11 AC-021 refuses a description longer than 1000 characters and keeps the saved one', () => {
    const pipelineState = twoFlows();
    const longText = 'd'.repeat(1001);
    const reason = parserReason(pipelineState, 'plan', { field: 'description', value: longText });
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: longText } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'The Plan step.');
  });
});

describe('F-11 AC-022 body', () => {
  it('F-11 AC-022 shows the counter as n / 1000 characters under the body', () => {
    renderPanel(twoFlows());

    expect(screen.getByText('17 / 1000 characters')).toBeTruthy();
  });

  it('F-11 AC-022 counts code points, so one emoji is one character', () => {
    expect(bodyCounterText('a😀')).toBe('2 / 1000 characters');
  });

  it('F-11 AC-022 shows the parser reason for a blank body and keeps the field empty under it', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'body', value: '' });
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: '' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', '');
  });

  it('F-11 AC-022 refuses a body of 1001 characters with the parser reason under the field, and keeps the saved body and its counter', () => {
    const pipelineState = twoFlows();
    const longBody = 'b'.repeat(1001);
    const reason = parserReason(pipelineState, 'plan', { field: 'body', value: longBody });
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: longBody } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason).id).toBe('flow-body-refusal');
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'Do the Plan work.');
    expect(screen.getByText('17 / 1000 characters')).toBeTruthy();
  });

  it('F-11 AC-022 accepts a body of exactly 1000 characters and counts it', () => {
    const { onChange } = renderPanel(twoFlows());
    const body = 'b'.repeat(1000);

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: body } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1000 / 1000 characters')).toBeTruthy();
  });
});

describe('F-11 AC-023 model', () => {
  it('F-11 AC-023 offers blank, haiku, sonnet, opus and inherit', () => {
    renderPanel(twoFlows());

    const options = within(screen.getByLabelText('Model'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(options).toEqual(['', 'haiku', 'sonnet', 'opus', 'inherit']);
  });

  it('F-11 AC-023 sets the model the user picks', () => {
    const { onChange } = renderPanel(twoFlows());

    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'sonnet' } });

    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ flows: [{ model: 'sonnet' }, expect.anything()] });
  });

  it('F-11 AC-023 unsets the model when the blank option is picked', () => {
    const pipelineState = pipelineOf({ ...flow('plan', 'Plan', 'build'), model: 'opus' }, flow('build', 'Build'));
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Model'), { target: { value: '' } });

    const next = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(next.flows[0]).not.toHaveProperty('model');
  });
});

describe('F-11 AC-027 Human approval', () => {
  it('F-11 AC-027 ticking the checkbox changes only the approval value', () => {
    const pipelineState = twoFlows();
    const { onChange } = renderPanel(pipelineState);

    fireEvent.click(screen.getByLabelText('Human approval'));

    const next = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(next.flows[0]).toEqual({ ...pipelineState.flows[0], approval: true });
    expect(next.flows[1]).toEqual(pipelineState.flows[1]);
  });

  it('F-11 AC-027 unticking the checkbox clears the approval value', () => {
    const pipelineState = pipelineOf({ ...flow('plan', 'Plan', 'build'), approval: true }, flow('build', 'Build'));
    const { onChange } = renderPanel(pipelineState);

    expect(screen.getByLabelText('Human approval')).toHaveProperty('checked', true);
    fireEvent.click(screen.getByLabelText('Human approval'));

    const next = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(next.flows[0]?.approval).toBe(false);
  });
});

describe('F-11 AC-028 refusals go through the parser', () => {
  it('F-11 AC-028 shows the parser message beneath the field and keeps the saved value for a refused name', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: '' });
    renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });

    const refusal = screen.getByText(reason);
    expect(refusal.id).toBe('flow-name-refusal');
  });

  it('F-11 AC-028 describes the name input by its refusal only while the refusal shows', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: '' });
    renderPanel(pipelineState);
    expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBeNull();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    expect(screen.getByText(reason).id).toBe('flow-name-refusal');
    expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBe('flow-name-refusal');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Planning' } });
    expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBeNull();
  });

  it('F-11 AC-028 clears a refusal once a later edit of the same field is accepted', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: '' });
    renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    expect(screen.getByText(reason)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Planning' } });
    expect(screen.queryByText(reason)).toBeNull();
  });
});

describe('F-11 AC-019 Delete flow control', () => {
  it('F-11 AC-019 shows a Delete flow control after Human approval, and no other delete control', () => {
    renderPanel(twoFlows());

    const text = document.body.textContent ?? '';
    expect(text.indexOf('Human approval')).toBeLessThan(text.indexOf('Delete flow'));
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Delete flow' })).toBeTruthy();
  });
});

describe('F-11 AC-029 delete flow asks first', () => {
  it('F-11 AC-029 shows the question and changes nothing until it is confirmed', () => {
    const { onChange, onDelete } = renderPanel(twoFlows());

    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));

    const dialog = screen.getByRole('dialog', { name: 'Delete flow Plan?' });
    expect(within(dialog).getByText('Are you sure you want to delete this flow?')).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-029 Cancel keeps the flow and closes the question', async () => {
    const { onDelete } = renderPanel(twoFlows());

    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Plan');
  });

  it('F-11 AC-029 Confirm reports the pipeline without the flow, as deleteFlow gives it', async () => {
    const pipelineState = twoFlows();
    const { onDelete } = renderPanel(pipelineState);

    fireEvent.click(screen.getByRole('button', { name: 'Delete flow' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete flow' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(deleteFlow(pipelineState, 'plan'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

// The flow with one argument, one artifact and one rule tag, for the typing tests: a keystroke must leave
// each list as it was, so the lists are read before and after each edit.
function flowWithRows(): Pipeline {
  return pipelineOf({
    ...flow('plan', 'Plan', 'build'),
    arguments: [{ index: 0, id: 'alpha', required: true, hint: 'The first input.' }],
    artifacts: [{ label: 'plan.md', template: '# Plan' }],
    ruleTags: [{ index: 0, ruleId: 'security' }],
  }, flow('build', 'Build'));
}

function listsOf() {
  return {
    argumentTitles: screen.queryAllByText('Arguments').length,
    arguments: screen.queryAllByRole('group', { name: /^Argument \d+$/ }).map((item) => item.getAttribute('aria-label')),
    artifactTitles: screen.queryAllByText('Outcome artifacts').length,
    artifacts: screen.queryAllByRole('group', { name: /^Artifact \d+$/ }).map((item) => item.getAttribute('aria-label')),
    ruleTagTitles: screen.queryAllByText('Rule tags').length,
    ruleTags: screen.queryAllByRole('group', { name: /^Rule tag \d+$/ }).map((item) => item.getAttribute('aria-label')),
  };
}

describe('F-11 AC-019 typing leaves the lists alone', () => {
  it('F-11 AC-019 typing in the name adds no argument row and no artifact', () => {
    renderPanel(flowWithRows());
    const before = listsOf();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Plann' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Planne' } });

    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Planne');
    expect(listsOf()).toEqual(before);
    expect(before).toEqual({
      argumentTitles: 1,
      arguments: ['Argument 1'],
      artifactTitles: 1,
      artifacts: ['Artifact 1'],
      ruleTagTitles: 1,
      ruleTags: ['Rule tag 1'],
    });
  });
});

describe('F-11 AC-024 typing in the description leaves the lists alone', () => {
  it('F-11 AC-024 typing in the description adds no argument row and no artifact', () => {
    renderPanel(flowWithRows());
    const before = listsOf();

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'The Plan step, longer.' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'The Plan step, longer still.' } });

    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'The Plan step, longer still.');
    expect(listsOf()).toEqual(before);
    expect(before.argumentTitles).toBe(1);
    expect(before.artifactTitles).toBe(1);
  });
});

describe('F-11 AC-025 typing in the body leaves the lists alone', () => {
  it('F-11 AC-025 typing in the body adds no argument row and no artifact', () => {
    renderPanel(flowWithRows());
    const before = listsOf();

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: 'Do the Plan work. More.' } });
    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: 'Do the Plan work. More text.' } });

    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'Do the Plan work. More text.');
    expect(listsOf()).toEqual(before);
    expect(before.argumentTitles).toBe(1);
    expect(before.artifactTitles).toBe(1);
  });
});

describe('F-11 AC-027 changing the model leaves the lists alone', () => {
  it('F-11 AC-027 changing the model adds no argument row and no artifact', () => {
    const { onChange } = renderPanel(flowWithRows());
    const before = listsOf();

    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'sonnet' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'opus' } });

    const saved = onChange.mock.calls.at(-1)?.[0] as Pipeline | undefined;
    expect(saved?.flows.find((item) => item.id === 'plan')?.model).toBe('opus');
    expect(listsOf()).toEqual(before);
    expect(before.argumentTitles).toBe(1);
    expect(before.artifactTitles).toBe(1);
  });
});

describe('F-11 (no criterion: Verify device fix 2026-11-24) required name and body', () => {
  it('F-11 (no criterion: Verify device fix 2026-11-24) shows no error for a saved name that has text', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: '' });
    renderPanel(pipelineState);

    expect(screen.queryByText(reason)).toBeNull();
    expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBeNull();
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) shows the empty-name error on the key press that empties the field', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: '' });
    renderPanel(pipelineState);
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });

    expect(screen.getByText(reason).id).toBe('flow-name-refusal');
    expect(input).toHaveProperty('value', '');
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) treats whitespace alone as empty and shows the error', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: '' });
    renderPanel(pipelineState);
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyUp(input, { key: ' ' });

    expect(screen.getByText(reason)).toBeTruthy();
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) hides the error once text is typed into the empty name', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: '' });
    renderPanel(pipelineState);
    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });
    expect(screen.getByText(reason)).toBeTruthy();

    fireEvent.change(input, { target: { value: 'P' } });
    fireEvent.keyUp(input, { key: 'P' });

    expect(screen.queryByText(reason)).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) shows the empty-body error on the key press that empties the body, and hides it once text is typed', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'body', value: '' });
    renderPanel(pipelineState);
    const body = screen.getByLabelText('Body · required');

    fireEvent.change(body, { target: { value: '' } });
    fireEvent.keyUp(body, { key: 'Backspace' });
    expect(screen.getByText(reason).id).toBe('flow-body-refusal');

    fireEvent.change(body, { target: { value: 'x' } });
    fireEvent.keyUp(body, { key: 'x' });
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
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: '' });
    renderPanel(pipelineState);
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });

    const control = controlBoxOf(input);
    expect(screen.getByText(reason).parentElement).toBe(control);
    expect(control.contains(input)).toBe(true);
    expect(getComputedStyle(control).getPropertyValue('gap')).toBe('4px');
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) draws the empty-body error inside the body control box, and the counter stays under the box', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'body', value: '' });
    renderPanel(pipelineState);
    const input = screen.getByLabelText('Body · required');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });

    const control = controlBoxOf(input);
    expect(screen.getByText(reason).parentElement).toBe(control);
    expect(control.nextElementSibling).toBe(document.getElementById('flow-body-counter'));
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) keeps the optional description error outside the control boxes', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'description', value: 'x'.repeat(1001) });
    renderPanel(pipelineState);
    const input = screen.getByLabelText('Description');

    fireEvent.change(input, { target: { value: 'x'.repeat(1001) } });
    fireEvent.blur(input);

    expect(screen.getByText(reason).parentElement).not.toBe(controlBoxOf(input));
  });
});

// F-16 AC-020: a flow with a Start and an End block, as the wizard builds one, in a pipeline with a name.
function wiredFlow(id: string, name: string, next?: string): Flow {
  const base: Flow = {
    index: 0,
    id,
    name,
    description: `The ${name} step.`,
    arguments: [],
    body: `Do the ${name} work.`,
    artifacts: [{ label: `${id}.md`, template: 'output.md' }],
    approval: false,
    blocks: [
      { index: 0, id: 'start', kind: 'start', next: 'end' },
      { index: 1, id: 'end', kind: 'end', outcome: 'done', producedArtifact: `${id}.md` },
    ],
  };
  return next === undefined ? base : { ...base, next };
}

function wiredPipeline(name = 'Demo'): Pipeline {
  const flows = [wiredFlow('plan', 'Plan', 'build'), wiredFlow('build', 'Build')];
  return { name, description: 'A demo pipeline.', arguments: [], flows: flows.map((item, index) => ({ ...item, index })) };
}

// The pipeline after Add flow (AC-003): a third flow with a blank body, linked to no other flow.
function withNewFlow(pipelineState: Pipeline): Pipeline {
  return addFlow(pipelineState).pipeline;
}

// Types `value` into the flow body the way the user does, one change event with the whole text.
function typeBody(value: string) {
  fireEvent.change(screen.getByLabelText('Body · required'), { target: { value } });
}

describe('F-16 AC-020 typing into the flow body', () => {
  it('F-16 AC-020 accepts typing into a saved flow body and shows the typed text', () => {
    const { onChange } = renderPanel(wiredPipeline());

    typeBody('Do the Plan work, carefully.');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toMatchObject({ flows: [{ body: 'Do the Plan work, carefully.' }, expect.anything()] });
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'Do the Plan work, carefully.');
  });

  it('F-16 AC-020 keeps every character typed one at a time, including a space and a newline', () => {
    const pipelineState = wiredPipeline();
    const { onChange } = renderPanel(pipelineState);
    const typed = 'Do the Plan work.\nSecond line';

    let text = '';
    for (const character of typed) {
      text += character;
      typeBody(text);
      expect(screen.getByLabelText('Body · required')).toHaveProperty('value', text);
    }

    expect(onChange).toHaveBeenCalledTimes([...typed].length);
    const last = onChange.mock.calls.at(-1)?.[0] as Pipeline;
    expect(last.flows[0]?.body).toBe(typed);
  });

  it('F-16 AC-020 keeps a long text typed into the body, up to the limit', () => {
    const pipelineState = wiredPipeline();
    const { onChange } = renderPanel(pipelineState);
    const long = `Do the Plan work.\n${'x'.repeat(900)}`;

    typeBody(long);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', long);
  });

  it('F-16 AC-020 accepts the first text typed into the body of a new flow from Add flow', () => {
    const pipelineState = withNewFlow(wiredPipeline());
    const { onChange } = renderPanel(pipelineState, 'flow-1');

    typeBody('a');

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(next.flows.find((item) => item.id === 'flow-1')?.body).toBe('a');
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'a');
  });

  it('F-16 AC-020 accepts the first text typed into the body when the pipeline name is blank', () => {
    const pipelineState = withNewFlow(wiredPipeline(''));
    const { onChange } = renderPanel(pipelineState, 'flow-1');

    typeBody('Write the plan.');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'Write the plan.');
  });

  it('F-16 AC-020 refuses a body over the limit, shows the parser reason under the Body field, and returns the field to the saved body', () => {
    const pipelineState = wiredPipeline();
    const tooLong = '😀'.repeat(1001);
    const reason = parserReason(pipelineState, 'plan', { field: 'body', value: tooLong });
    const { onChange } = renderPanel(pipelineState);
    const body = screen.getByLabelText('Body · required');

    typeBody(tooLong);
    fireEvent.keyUp(body, { key: '😀' });

    expect(onChange).not.toHaveBeenCalled();
    expect(reason).toBe('must be at most 1000 characters');
    expect(screen.getByText(reason).id).toBe('flow-body-refusal');
    expect(screen.getByText(reason).parentElement).toBe(controlBoxOf(body));
    expect(body).toHaveProperty('value', 'Do the Plan work.');
  });

  it('F-16 AC-020 keeps the parser reason of an over-limit body typed into a new flow with a blank saved body', () => {
    const pipelineState = withNewFlow(wiredPipeline());
    const reason = parserReason(pipelineState, 'flow-1', { field: 'body', value: 'x'.repeat(1001) });
    const { onChange } = renderPanel(pipelineState, 'flow-1');
    const body = screen.getByLabelText('Body · required');

    typeBody('x'.repeat(1001));
    fireEvent.keyUp(body, { key: 'x' });

    expect(onChange).not.toHaveBeenCalled();
    expect(body).toHaveProperty('value', '');
    expect(screen.getByText(reason).id).toBe('flow-body-refusal');
  });

  it('F-16 AC-020 shows the parser reason at the body for a blank body and keeps the blank text typed under it', () => {
    const pipelineState = withNewFlow(wiredPipeline());
    const { onChange } = renderPanel(pipelineState, 'flow-1');

    typeBody('   ');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('must not be blank')).toBeTruthy();
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', '   ');
  });
});
