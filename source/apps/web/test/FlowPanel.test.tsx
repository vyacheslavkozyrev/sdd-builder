// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  const selected = pipelineState.flows.find((item) => item.id === flowId);
  if (selected === undefined) throw new Error(`no flow ${flowId} in the test pipeline`);
  render(<FlowPanel pipelineState={pipelineState} rules={[]} flow={selected} onChange={onChange} />);
  return { onChange };
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

  it('F-11 AC-020 refuses a blank name with the parser reason and keeps the saved name', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: '   ' });
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Plan');
  });

  it('F-11 AC-020 refuses a name that another flow has, with the parser reason', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'name', value: 'Build' });
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Build' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
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

  it('F-11 AC-022 refuses a blank body with the parser reason and keeps the saved body', () => {
    const pipelineState = twoFlows();
    const reason = parserReason(pipelineState, 'plan', { field: 'body', value: '' });
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: '' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'Do the Plan work.');
  });

  it('F-11 AC-022 refuses a body of 1001 characters, keeps the saved body and its counter', () => {
    const pipelineState = twoFlows();
    const longBody = 'b'.repeat(1001);
    const reason = parserReason(pipelineState, 'plan', { field: 'body', value: longBody });
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: longBody } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
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
