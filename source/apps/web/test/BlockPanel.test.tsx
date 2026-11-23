// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { editAgentField } from '../src/builder/blockFields.js';
import { AgentPanel } from '../src/builder/BlockPanel.js';
import type { Pipeline } from '../src/builder/fields.js';

// The Agent panel is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

afterEach(() => {
  cleanup();
});

type Block = core.Block;
type Flow = core.Flow;
type AgentBlock = core.AgentBlock;

// The plan flow: start, planner, reviewer, end. The planner has no model; the reviewer is set to sonnet.
function planPipeline(): Pipeline {
  const blocks: Block[] = [
    { index: 0, id: 'start', kind: 'start', next: 'planner' },
    {
      index: 1,
      id: 'planner',
      kind: 'agent',
      name: 'planner',
      description: 'Writes the plan from the brief.',
      arguments: [],
      next: 'reviewer',
      body: 'Reads the brief and writes plan.md.',
    },
    {
      index: 2,
      id: 'reviewer',
      kind: 'agent',
      name: 'reviewer',
      description: 'Checks the plan.',
      arguments: [],
      next: 'done',
      model: 'sonnet',
      body: 'Checks plan.md against the stories.',
    },
    { index: 3, id: 'done', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ];
  const plan: Flow = {
    index: 0,
    id: 'plan',
    name: 'Plan',
    description: 'The plan step.',
    arguments: [],
    body: 'Plan the work.',
    artifacts: [{ label: 'plan.md', template: 'output.md' }],
    approval: false,
    blocks,
  };
  return { name: 'Demo', description: 'A demo pipeline.', arguments: [], flows: [{ ...plan, index: 0 }] };
}

function agentOf(pipelineState: Pipeline, blockId: string): AgentBlock {
  const flow = pipelineState.flows.find((item) => item.id === 'plan');
  const block = flow?.blocks.find((item) => item.id === blockId);
  if (block === undefined || block.kind !== 'agent') throw new Error(`no Agent ${blockId} in the test pipeline`);
  return block;
}

function renderPanel(pipelineState: Pipeline, blockId = 'planner') {
  const onChange = vi.fn();
  const flow = pipelineState.flows.find((item) => item.id === 'plan');
  if (flow === undefined) throw new Error('no plan flow in the test pipeline');
  render(
    <AgentPanel
      pipelineState={pipelineState}
      rules={[]}
      flow={flow}
      block={agentOf(pipelineState, blockId)}
      onChange={onChange}
    />,
  );
  return { onChange };
}

// The parser's reason for an edit of the planner's field, which the panel must show exactly. The edit is
// expected to be refused.
function parserReason(pipelineState: Pipeline, change: Parameters<typeof editAgentField>[4]): string {
  const result = editAgentField(pipelineState, [], 'plan', 'planner', change);
  if (result.ok) throw new Error('the test edit was accepted by the parser');
  return result.reason;
}

describe('F-12 AC-022 Agent panel fields', () => {
  it('F-12 AC-022 shows the title, the subtitle and the fields in order: Name, Description, Model, Body', () => {
    renderPanel(planPipeline());

    expect(screen.getByText('Agent: planner')).toBeTruthy();
    expect(screen.getByText('Agent block in the Plan flow')).toBeTruthy();
    const labels = Array.from(document.querySelectorAll('label')).map((label) => label.textContent);
    expect(labels).toEqual(['Name', 'Description', 'Model', 'Body · required']);
  });

  it('F-12 AC-022 shows the saved values of the Agent in its fields', () => {
    renderPanel(planPipeline());

    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'planner');
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'Writes the plan from the brief.');
    expect(screen.getByLabelText('Model')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'Reads the brief and writes plan.md.');
  });

  it('F-12 AC-022 saves a changed description through the parser and keeps the other blocks', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Writes the plan.' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(agentOf(saved, 'planner').description).toBe('Writes the plan.');
    expect(agentOf(saved, 'reviewer')).toEqual(agentOf(pipelineState, 'reviewer'));
  });
});

describe('F-12 AC-023 Agent name', () => {
  it('F-12 AC-023 saves a unique, file-safe name, trimmed', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  writer ' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(agentOf(saved, 'planner').name).toBe('writer');
  });

  it('F-12 AC-023 refuses a name that another Agent has, with its reason, and keeps the saved name', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'reviewer' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Another Agent already has this name.')).toBeTruthy();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'planner');
    expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBe('block-agent-name-refusal');
  });

  it('F-12 AC-023 refuses a name that another Agent has once it is trimmed, and keeps the saved name', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  reviewer ' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Another Agent already has this name.')).toBeTruthy();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'planner');
  });

  it('F-12 AC-023 refuses a name that is not file-safe with the parser reason', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const reason = parserReason(pipelineState, { field: 'name', value: 'plan/ner' });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'plan/ner' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'planner');
  });

  it('F-12 AC-023 shows the refusal of the name beneath the Name field, not beneath another field', () => {
    renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'reviewer' } });

    const refusal = document.getElementById('block-agent-name-refusal');
    expect(refusal?.textContent).toBe('Another Agent already has this name.');
    expect(document.getElementById('block-agent-description-refusal')).toBeNull();
  });
});

describe('F-12 AC-024 Agent description', () => {
  it('F-12 AC-024 refuses a blank description with its reason and keeps the saved value', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const reason = parserReason(pipelineState, { field: 'description', value: '   ' });

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '   ' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'Writes the plan from the brief.');
  });

  it('F-12 AC-024 refuses a description of 1001 characters and keeps the saved value', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const longText = 'd'.repeat(1001);
    const reason = parserReason(pipelineState, { field: 'description', value: longText });

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: longText } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'Writes the plan from the brief.');
  });

  it('F-12 AC-024 accepts a description of 1000 characters', () => {
    const { onChange } = renderPanel(planPipeline());
    const text = 'd'.repeat(1000);

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: text } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(agentOf(saved, 'planner').description).toBe(text);
  });
});

describe('F-12 AC-025 Agent model', () => {
  it('F-12 AC-025 offers only haiku, sonnet, opus and inherit, and the blank option', () => {
    renderPanel(planPipeline());

    const options = Array.from(screen.getByLabelText('Model').querySelectorAll('option')).map(
      (option) => option.value,
    );
    expect(options).toEqual(['', 'haiku', 'sonnet', 'opus', 'inherit']);
  });

  it('F-12 AC-025 saves a chosen model through the parser', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'opus' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(agentOf(saved, 'planner').model).toBe('opus');
  });

  it('F-12 AC-025 unsets the model when the blank option is chosen', () => {
    const { onChange } = renderPanel(planPipeline(), 'reviewer');

    fireEvent.change(screen.getByLabelText('Model'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(agentOf(saved, 'reviewer').model).toBeUndefined();
  });
});

describe('F-12 AC-028 Agent body', () => {
  it('F-12 AC-028 shows the count of the body under the field, out of 1000', () => {
    renderPanel(planPipeline());

    const counter = document.getElementById('block-agent-body-counter');
    expect(counter?.textContent).toBe('35 / 1000 characters');
  });

  it('F-12 AC-028 refuses a blank body with its reason and keeps the saved body', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const reason = parserReason(pipelineState, { field: 'body', value: '' });

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: '' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'Reads the brief and writes plan.md.');
  });

  it('F-12 AC-028 refuses a body of 1001 code points with its reason and keeps the saved body', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const longBody = 'b'.repeat(1001);
    const reason = parserReason(pipelineState, { field: 'body', value: longBody });

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: longBody } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'Reads the brief and writes plan.md.');
    expect(document.getElementById('block-agent-body-counter')?.textContent).toBe('35 / 1000 characters');
  });

  it('F-12 AC-028 refuses a body of only whitespace with its reason and keeps the saved body', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const reason = parserReason(pipelineState, { field: 'body', value: ' \n\t ' });

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: ' \n\t ' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', 'Reads the brief and writes plan.md.');
  });

  it('F-12 AC-028 accepts a body of exactly 1000 code points and counts it', () => {
    const { onChange } = renderPanel(planPipeline());
    const body = 'b'.repeat(1000);

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: body } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(document.getElementById('block-agent-body-counter')?.textContent).toBe('1000 / 1000 characters');
  });

  it('F-12 AC-028 counts astral characters as one code point each, so 1000 of them are accepted', () => {
    const { onChange } = renderPanel(planPipeline());
    const body = '\u{1F600}'.repeat(1000);

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: body } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(document.getElementById('block-agent-body-counter')?.textContent).toBe('1000 / 1000 characters');
  });

  it('F-12 AC-028 refuses 1001 astral code points with its reason and keeps the saved body', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const body = '\u{1F600}'.repeat(1001);
    const reason = parserReason(pipelineState, { field: 'body', value: body });

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: body } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(document.getElementById('block-agent-body-counter')?.textContent).toBe('35 / 1000 characters');
  });
});
