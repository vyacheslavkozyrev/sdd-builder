// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { editAgentField } from '../src/builder/blockFields.js';
import { AgentPanel, ConditionPanel, EndPanel, StartPanel } from '../src/builder/BlockPanel.js';
import { editConditionDescription, setConditionRoundLimit } from '../src/builder/blockCondition.js';
import { editEndArtifact } from '../src/builder/blockEnd.js';
import type { Pipeline } from '../src/builder/fields.js';

// The Agent panel is rendered in the DOM, so this file runs in jsdom (architecture.md §5).

afterEach(() => {
  cleanup();
});

type Block = core.Block;
type Flow = core.Flow;
type AgentBlock = core.AgentBlock;
type ConditionBlock = core.ConditionBlock;

// The plan flow: start, planner, reviewer, end. The planner has no model; the reviewer is set to sonnet.
function planPipeline(): Pipeline {
  const blocks: Block[] = [
    { index: 0, id: '15e362eb-af40-5e75-8c68-8ac7e7fc6a9e', kind: 'start', next: 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0' },
    {
      index: 1,
      id: 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0',
      kind: 'agent',
      name: 'planner',
      description: 'Writes the plan from the brief.',
      arguments: [],
      next: '1954b5cf-b131-5509-9c06-eb5b22e8aaad',
      body: 'Reads the brief and writes plan.md.',
    },
    {
      index: 2,
      id: '1954b5cf-b131-5509-9c06-eb5b22e8aaad',
      kind: 'agent',
      name: 'reviewer',
      description: 'Checks the plan.',
      arguments: [],
      next: 'e9921352-41c9-5771-a013-0c63c6a49697',
      model: 'sonnet',
      body: 'Checks plan.md against the stories.',
    },
    { index: 3, id: 'e9921352-41c9-5771-a013-0c63c6a49697', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ];
  const plan: Flow = {
    index: 0,
    id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
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
  const flow = pipelineState.flows.find((item) => item.id === 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
  const block = flow?.blocks.find((item) => item.id === blockId);
  if (block === undefined || block.kind !== 'agent') throw new Error(`no Agent ${blockId} in the test pipeline`);
  return block;
}

function renderPanel(pipelineState: Pipeline, blockId = 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0') {
  const onChange = vi.fn();
  const flow = pipelineState.flows.find((item) => item.id === 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
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
  const result = editAgentField(pipelineState, [], 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0', change);
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
    expect(agentOf(saved, 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0').description).toBe('Writes the plan.');
    expect(agentOf(saved, '1954b5cf-b131-5509-9c06-eb5b22e8aaad')).toEqual(agentOf(pipelineState, '1954b5cf-b131-5509-9c06-eb5b22e8aaad'));
  });
});

describe('F-12 AC-023 Agent name', () => {
  it('F-12 AC-023 saves a unique, file-safe name, trimmed', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  writer ' } });
    fireEvent.blur(screen.getByLabelText('Name'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(agentOf(saved, 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0').name).toBe('writer');
  });

  it('F-12 AC-023 refuses a name that another Agent has with no error shown, and keeps the saved name', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '1954b5cf-b131-5509-9c06-eb5b22e8aaad' } });
    fireEvent.blur(screen.getByLabelText('Name'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Another Agent already has this name.')).toBeNull();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'planner');
    expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBeNull();
  });

  it('F-12 AC-023 refuses a name that another Agent has once it is trimmed, and keeps the saved name', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  reviewer ' } });
    fireEvent.blur(screen.getByLabelText('Name'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText('Another Agent already has this name.')).toBeNull();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'planner');
  });

  it('F-12 AC-023 refuses a name that is not file-safe with no error shown, and keeps the saved name', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const reason = parserReason(pipelineState, { field: 'name', value: 'plan/ner' });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'plan/ner' } });
    fireEvent.blur(screen.getByLabelText('Name'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(reason)).toBeNull();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'planner');
  });

  it('F-12 AC-023 shows the refusal of an empty name beneath the Name field, not beneath another field', () => {
    const pipelineState = planPipeline();
    const reason = parserReason(pipelineState, { field: 'name', value: '' });
    renderPanel(pipelineState);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    fireEvent.keyUp(screen.getByLabelText('Name'), { key: 'Backspace' });

    const refusal = document.getElementById('block-agent-name-refusal');
    expect(refusal?.textContent).toBe(reason);
    expect(document.getElementById('block-agent-description-refusal')).toBeNull();
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-24) Agent name', () => {
  it('F-12 (no criterion: Verify device fix 2026-11-24) accepts a one-character name typed and committed by blur', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 's' } });
    fireEvent.blur(screen.getByLabelText('Name'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(agentOf(saved, 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0').name).toBe('s');
    expect(screen.queryByText(/must be an id/)).toBeNull();
    expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBeNull();
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) accepts a one-character name committed by Enter', () => {
    const { onChange } = renderPanel(planPipeline());
    const input = screen.getByLabelText('Name');

    input.focus();
    fireEvent.change(input, { target: { value: 's' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(agentOf(onChange.mock.calls[0]?.[0] as Pipeline, 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0').name).toBe('s');
    expect(screen.queryByText(/must be an id/)).toBeNull();
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) holds a blank name while typing without a refusal', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/must be an id/)).toBeNull();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', '');
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) refuses a blank name only when committed, and keeps the field empty under the reason', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const reason = parserReason(pipelineState, { field: 'name', value: '' });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    fireEvent.blur(screen.getByLabelText('Name'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Name')).toHaveProperty('value', '');
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) types a one-character name after clearing the field', () => {
    const { onChange } = renderPanel(planPipeline());
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.change(input, { target: { value: 's' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(agentOf(onChange.mock.calls[0]?.[0] as Pipeline, 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0').name).toBe('s');
    expect(screen.queryByText(/must be an id/)).toBeNull();
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) does not check a name on each change, only on commit', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'plan/ner' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/must be an id/)).toBeNull();
    expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBeNull();
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) shows an empty name committed by blur as the parser refusal, and keeps the field empty under it', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const reason = parserReason(pipelineState, { field: 'name', value: '' });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } });
    fireEvent.blur(screen.getByLabelText('Name'));

    expect(onChange).not.toHaveBeenCalled();
    expect(document.getElementById('block-agent-name-refusal')?.textContent).toBe(reason);
    expect(screen.getByLabelText('Name').getAttribute('aria-describedby')).toBe('block-agent-name-refusal');
    expect(screen.getByLabelText('Name')).toHaveProperty('value', '');
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) shows no error for a refused name with text, and the next valid name is saved', () => {
    const { onChange } = renderPanel(planPipeline());
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: 'plan/ner' } });
    fireEvent.blur(input);
    expect(screen.queryByText(/must be an id/)).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();

    fireEvent.change(input, { target: { value: 's' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(agentOf(onChange.mock.calls[0]?.[0] as Pipeline, 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0').name).toBe('s');
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) does not show a refused name after a valid commit', () => {
    const { onChange } = renderPanel(planPipeline());
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '1954b5cf-b131-5509-9c06-eb5b22e8aaad' } });
    fireEvent.blur(input);
    expect(screen.queryByText('Another Agent already has this name.')).toBeNull();

    fireEvent.change(input, { target: { value: 'writer' } });
    fireEvent.blur(input);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(agentOf(onChange.mock.calls[0]?.[0] as Pipeline, 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0').name).toBe('writer');
    expect(screen.queryByText('Another Agent already has this name.')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-24) Agent name gap', () => {
  it('F-12 (no criterion: Verify device fix 2026-11-24) puts 16 px between the Name label and its field', () => {
    renderPanel(planPipeline());
    const group = screen.getByText('Name', { selector: 'label' }).parentElement;

    expect(group).not.toBeNull();
    expect(getComputedStyle(group as HTMLElement).getPropertyValue('gap')).toBe('16px');
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
    expect(screen.getByLabelText('Description')).toHaveProperty('value', '   ');
  });

  it('F-12 AC-024 refuses a description of 1001 characters with no error shown, and keeps the saved value', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const longText = 'd'.repeat(1001);
    const reason = parserReason(pipelineState, { field: 'description', value: longText });

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: longText } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(reason)).toBeNull();
    expect(screen.getByLabelText('Description')).toHaveProperty('value', 'Writes the plan from the brief.');
  });

  it('F-12 AC-024 accepts a description of 1000 characters', () => {
    const { onChange } = renderPanel(planPipeline());
    const text = 'd'.repeat(1000);

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: text } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(agentOf(saved, 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0').description).toBe(text);
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
    expect(agentOf(saved, 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0').model).toBe('opus');
  });

  it('F-12 AC-025 unsets the model when the blank option is chosen', () => {
    const { onChange } = renderPanel(planPipeline(), '1954b5cf-b131-5509-9c06-eb5b22e8aaad');

    fireEvent.change(screen.getByLabelText('Model'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(agentOf(saved, '1954b5cf-b131-5509-9c06-eb5b22e8aaad').model).toBeUndefined();
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
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', '');
  });

  it('F-12 AC-028 refuses a body of 1001 code points with no error shown, and keeps the saved body', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const longBody = 'b'.repeat(1001);
    const reason = parserReason(pipelineState, { field: 'body', value: longBody });

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: longBody } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(reason)).toBeNull();
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
    expect(screen.getByLabelText('Body · required')).toHaveProperty('value', ' \n\t ');
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

  it('F-12 AC-028 refuses 1001 astral code points with no error shown, and keeps the saved body', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);
    const body = '\u{1F600}'.repeat(1001);
    const reason = parserReason(pipelineState, { field: 'body', value: body });

    fireEvent.change(screen.getByLabelText('Body · required'), { target: { value: body } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(reason)).toBeNull();
    expect(document.getElementById('block-agent-body-counter')?.textContent).toBe('35 / 1000 characters');
  });
});

// The Condition panel. The plan flow here: start, a pre-check after the start (true to the planner, false
// stops the flow), the planner, an end check (true to End, false returns to the planner with 3 rounds), End.
function conditionPipeline(blocks: Block[] = conditionBlocks()): Pipeline {
  const plan: Flow = {
    index: 0,
    id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
    name: 'Plan',
    arguments: [],
    body: 'Plan the work.',
    artifacts: [{ label: 'plan.md', template: 'output.md' }],
    approval: false,
    blocks,
  };
  return { name: 'Demo', description: 'A demo pipeline.', arguments: [], flows: [plan] };
}

function conditionBlocks(): Block[] {
  return [
    { index: 0, id: '15e362eb-af40-5e75-8c68-8ac7e7fc6a9e', kind: 'start', next: 'c045cda9-9761-5373-941f-b21a3f878ede' },
    {
      index: 1,
      id: 'c045cda9-9761-5373-941f-b21a3f878ede',
      kind: 'condition',
      description: 'The previous step is complete',
      true: { to: 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0' },
      false: { stop: true },
    },
    {
      index: 2,
      id: 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0',
      kind: 'agent',
      name: 'planner',
      description: 'Writes the plan.',
      arguments: [],
      next: '8f16ac90-f4a1-5d2b-95fa-129518a01467',
      body: 'Writes plan.md.',
    },
    {
      index: 3,
      id: '8f16ac90-f4a1-5d2b-95fa-129518a01467',
      kind: 'condition',
      description: 'The reviewer approves',
      true: { to: 'e9921352-41c9-5771-a013-0c63c6a49697' },
      false: { to: 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0', roundLimit: 3 },
    },
    { index: 4, id: 'e9921352-41c9-5771-a013-0c63c6a49697', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ];
}

function conditionOf(pipelineState: Pipeline, blockId: string): ConditionBlock {
  const flow = pipelineState.flows.find((item) => item.id === 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
  const block = flow?.blocks.find((item) => item.id === blockId);
  if (block === undefined || block.kind !== 'condition') {
    throw new Error(`no Condition ${blockId} in the test pipeline`);
  }
  return block;
}

function renderCondition(pipelineState: Pipeline, blockId: string) {
  const onChange = vi.fn();
  const flow = pipelineState.flows.find((item) => item.id === 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
  if (flow === undefined) throw new Error('no plan flow in the test pipeline');
  render(
    <ConditionPanel
      pipelineState={pipelineState}
      rules={[]}
      flow={flow}
      block={conditionOf(pipelineState, blockId)}
      onChange={onChange}
    />,
  );
  return { onChange };
}

function labelsShown(): string[] {
  return Array.from(document.querySelectorAll('label, p')).map((node) => node.textContent ?? '');
}

describe('F-12 AC-030 Condition description', () => {
  it('F-12 AC-030 shows the title as an end check and the subtitle with the arrow target', () => {
    renderCondition(conditionPipeline(), '8f16ac90-f4a1-5d2b-95fa-129518a01467');

    expect(screen.getByText('Condition: end check')).toBeTruthy();
    expect(screen.getByText('Check on the arrow before End')).toBeTruthy();
  });

  it('F-12 AC-030 shows the title as a pre-check when the true route does not go to End', () => {
    renderCondition(conditionPipeline(), 'c045cda9-9761-5373-941f-b21a3f878ede');

    expect(screen.getByText('Condition: pre-check')).toBeTruthy();
    expect(screen.getByText('Check on the arrow before planner')).toBeTruthy();
  });

  it('F-12 AC-030 shows a pre-check subtitle without a block name when the true route has no arrow', () => {
    const blocks = conditionBlocks();
    blocks[1] = {
      index: 1,
      id: 'c045cda9-9761-5373-941f-b21a3f878ede',
      kind: 'condition',
      description: 'Check',
      true: { to: '' },
      false: { stop: true },
    };
    renderCondition(conditionPipeline(blocks), 'c045cda9-9761-5373-941f-b21a3f878ede');

    expect(screen.getByText('Condition: pre-check')).toBeTruthy();
    expect(screen.getByText('Check on the arrow')).toBeTruthy();
  });

  it('F-12 AC-030 shows the saved description and its counter', () => {
    renderCondition(conditionPipeline(), '8f16ac90-f4a1-5d2b-95fa-129518a01467');

    expect(screen.getByLabelText('What it checks')).toHaveProperty('value', 'The reviewer approves');
    expect(screen.getByText('21 / 1000 characters')).toBeTruthy();
  });

  it('F-12 AC-030 saves a changed description through the parser', () => {
    const pipelineState = conditionPipeline();
    const { onChange } = renderCondition(pipelineState, '8f16ac90-f4a1-5d2b-95fa-129518a01467');

    fireEvent.change(screen.getByLabelText('What it checks'), { target: { value: 'The tests pass' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(conditionOf(saved, '8f16ac90-f4a1-5d2b-95fa-129518a01467').description).toBe('The tests pass');
    expect(conditionOf(saved, 'c045cda9-9761-5373-941f-b21a3f878ede')).toEqual(conditionOf(pipelineState, 'c045cda9-9761-5373-941f-b21a3f878ede'));
  });

  it('F-12 AC-030 refuses a blank description with the parser reason and keeps the saved value', () => {
    const pipelineState = conditionPipeline();
    const { onChange } = renderCondition(pipelineState, '8f16ac90-f4a1-5d2b-95fa-129518a01467');
    const result = editConditionDescription(pipelineState, [], 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '8f16ac90-f4a1-5d2b-95fa-129518a01467', '   ');
    if (result.ok) throw new Error('the parser accepted a blank description');

    fireEvent.change(screen.getByLabelText('What it checks'), { target: { value: '   ' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(result.reason)).toBeTruthy();
    expect(screen.getByLabelText('What it checks').getAttribute('aria-describedby')).toContain(
      'block-condition-description-refusal',
    );
  });
});

describe('F-12 AC-031 and AC-032 route texts', () => {
  it('F-12 AC-031 shows the true route as the next block, read-only', () => {
    renderCondition(conditionPipeline(), 'c045cda9-9761-5373-941f-b21a3f878ede');

    expect(screen.getByText('Next: planner')).toBeTruthy();
  });

  it('F-12 AC-031 shows "No arrow yet" when the true route has no arrow', () => {
    const blocks = conditionBlocks();
    blocks[1] = {
      index: 1,
      id: 'c045cda9-9761-5373-941f-b21a3f878ede',
      kind: 'condition',
      description: 'Check',
      true: { to: '' },
      false: { stop: true },
    };
    renderCondition(conditionPipeline(blocks), 'c045cda9-9761-5373-941f-b21a3f878ede');

    expect(screen.getByText('No arrow yet')).toBeTruthy();
  });

  it('F-12 AC-032 shows "Stop the flow and ask the user" for a false route with no arrow', () => {
    renderCondition(conditionPipeline(), 'c045cda9-9761-5373-941f-b21a3f878ede');

    expect(screen.getByText('Stop the flow and ask the user')).toBeTruthy();
  });

  it('F-12 AC-032 shows "Returns to <name>, up to N rounds" for a return', () => {
    renderCondition(conditionPipeline(), '8f16ac90-f4a1-5d2b-95fa-129518a01467');

    expect(screen.getByText('Returns to planner, up to 3 rounds')).toBeTruthy();
  });

  it('F-12 AC-032 shows "Goes to <name>" for a false route to a later block', () => {
    const blocks = conditionBlocks();
    blocks[1] = {
      index: 1,
      id: 'c045cda9-9761-5373-941f-b21a3f878ede',
      kind: 'condition',
      description: 'Check',
      true: { to: 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0' },
      false: { to: '8f16ac90-f4a1-5d2b-95fa-129518a01467' },
    };
    renderCondition(conditionPipeline(blocks), 'c045cda9-9761-5373-941f-b21a3f878ede');

    expect(screen.getByText('Goes to Condition: The reviewer approves')).toBeTruthy();
  });
});

describe('F-12 AC-033 and AC-034 round limit', () => {
  it('F-12 AC-033 shows the round limit and "rounds" for a return only', () => {
    renderCondition(conditionPipeline(), '8f16ac90-f4a1-5d2b-95fa-129518a01467');

    expect(screen.getByLabelText('Round limit')).toHaveProperty('value', '3');
    expect(screen.getByText('rounds')).toBeTruthy();
  });

  it('F-12 AC-034 shows no round field for a false route to a later block or no arrow', () => {
    renderCondition(conditionPipeline(), 'c045cda9-9761-5373-941f-b21a3f878ede');

    expect(screen.queryByLabelText('Round limit')).toBeNull();
    expect(labelsShown()).not.toContain('Round limit');
  });

  it.each(['0', '6', '2.5', ''])('F-12 AC-033 refuses the round limit "%s" and keeps the saved one', (text) => {
    const pipelineState = conditionPipeline();
    const { onChange } = renderCondition(pipelineState, '8f16ac90-f4a1-5d2b-95fa-129518a01467');
    const result = setConditionRoundLimit(pipelineState, [], 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '8f16ac90-f4a1-5d2b-95fa-129518a01467', text);
    if (result.ok) throw new Error(`the parser accepted the round limit "${text}"`);

    fireEvent.change(screen.getByLabelText('Round limit'), { target: { value: text } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('A return allows 1 to 5 rounds.')).toBeTruthy();
    expect(screen.getByLabelText('Round limit')).toHaveProperty('value', '3');
  });

  it('F-12 AC-033 refuses a round limit for a problem in the false route, with the parser reason (F-16 T015)', () => {
    const blocks = conditionBlocks().map((block) =>
      block.id === '8f16ac90-f4a1-5d2b-95fa-129518a01467' && block.kind === 'condition' ? { ...block, false: { to: 'c045cda9-9761-5373-941f-b21a3f878ede', roundLimit: 3 } } : block,
    );
    const pipelineState = conditionPipeline(blocks);
    const result = setConditionRoundLimit(pipelineState, [], 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '8f16ac90-f4a1-5d2b-95fa-129518a01467', '4');

    expect(result).toEqual({ ok: false, field: 'roundLimit', reason: expect.stringContaining('got c045cda9-9761-5373-941f-b21a3f878ede') });
  });

  it('F-12 AC-033 saves an accepted round limit through the parser', () => {
    const pipelineState = conditionPipeline();
    const { onChange } = renderCondition(pipelineState, '8f16ac90-f4a1-5d2b-95fa-129518a01467');

    fireEvent.change(screen.getByLabelText('Round limit'), { target: { value: '5' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(conditionOf(saved, '8f16ac90-f4a1-5d2b-95fa-129518a01467').false).toEqual({ to: 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0', roundLimit: 5 });
  });
});

// The plan flow of planPipeline with its flow changed: its artifacts or its blocks.
function flowWith(change: (flow: Flow) => Flow): Pipeline {
  const base = planPipeline();
  const flow = base.flows[0];
  if (flow === undefined) throw new Error('no plan flow in the test pipeline');
  return { ...base, flows: [change(flow)] };
}

function endOf(pipelineState: Pipeline, blockId: string): core.EndBlock {
  const flow = pipelineState.flows.find((item) => item.id === 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
  const block = flow?.blocks.find((item) => item.id === blockId);
  if (block === undefined || block.kind !== 'end') throw new Error(`no End ${blockId} in the test pipeline`);
  return block;
}

function renderEnd(pipelineState: Pipeline, blockId = 'e9921352-41c9-5771-a013-0c63c6a49697') {
  const onChange = vi.fn();
  const flow = pipelineState.flows.find((item) => item.id === 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
  if (flow === undefined) throw new Error('no plan flow in the test pipeline');
  render(
    <EndPanel
      pipelineState={pipelineState}
      rules={[]}
      flow={flow}
      block={endOf(pipelineState, blockId)}
      onChange={onChange}
    />,
  );
  return { onChange };
}

function optionValues(label: string): string[] {
  return Array.from(screen.getByLabelText(label).querySelectorAll('option')).map((option) => option.value);
}

describe('F-12 AC-035 End outcome', () => {
  it('F-12 AC-035 shows the title, the subtitle and the fields Outcome and Produced artifact in order', () => {
    renderEnd(planPipeline());

    expect(screen.getByText('End')).toBeTruthy();
    expect(screen.getByText("The flow's exit, last on the canvas")).toBeTruthy();
    const labels = Array.from(document.querySelectorAll('label')).map((label) => label.textContent);
    expect(labels).toEqual(['Outcome', 'Produced artifact']);
  });

  it('F-12 AC-035 offers only done and stopped as the outcome, and shows the saved outcome', () => {
    renderEnd(planPipeline());

    expect(optionValues('Outcome')).toEqual(['done', 'stopped']);
    expect(screen.getByLabelText('Outcome')).toHaveProperty('value', 'done');
  });

  it('F-12 AC-035 saves a chosen outcome through the parser', () => {
    const { onChange } = renderEnd(planPipeline());

    fireEvent.change(screen.getByLabelText('Outcome'), { target: { value: 'stopped' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(endOf(saved, 'e9921352-41c9-5771-a013-0c63c6a49697').outcome).toBe('stopped');
    expect(endOf(saved, 'e9921352-41c9-5771-a013-0c63c6a49697').producedArtifact).toBe('plan.md');
  });
});

describe('F-12 AC-036 End produced artifact', () => {
  it('F-12 AC-036 offers the outcome artifact labels of the flow, and no "none"', () => {
    const pipelineState = flowWith((flow) => ({
      ...flow,
      artifacts: [
        { label: 'plan.md', template: 'output.md' },
        { label: 'notes.md', template: 'output.md' },
      ],
    }));
    renderEnd(pipelineState);

    expect(optionValues('Produced artifact')).toEqual(['plan.md', 'notes.md']);
  });

  it('F-12 AC-036 saves a chosen artifact label through the parser', () => {
    const pipelineState = flowWith((flow) => ({
      ...flow,
      artifacts: [
        { label: 'plan.md', template: 'output.md' },
        { label: 'notes.md', template: 'output.md' },
      ],
    }));
    const { onChange } = renderEnd(pipelineState);

    fireEvent.change(screen.getByLabelText('Produced artifact'), { target: { value: 'notes.md' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(endOf(saved, 'e9921352-41c9-5771-a013-0c63c6a49697').producedArtifact).toBe('notes.md');
  });

  it('F-12 AC-036 refuses an empty produced artifact with the parser reason, and keeps the saved one', () => {
    const pipelineState = planPipeline();
    const refused = editEndArtifact(pipelineState, [], 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'e9921352-41c9-5771-a013-0c63c6a49697', '');
    if (refused.ok) throw new Error('the parser accepted an empty produced artifact');
    const { onChange } = renderEnd(pipelineState);

    // A value that no option carries leaves the select with the empty value, as a refused choice would.
    fireEvent.change(screen.getByLabelText('Produced artifact'), { target: { value: '' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(refused.reason)).toBeTruthy();
    expect(screen.getByLabelText('Produced artifact').getAttribute('aria-describedby')).toBe(
      'block-end-producedArtifact-refusal',
    );
    expect(screen.getByLabelText('Produced artifact')).toHaveProperty('value', 'plan.md');
  });

  it('F-12 AC-036 shows the empty text in place of the choices when the flow has no outcome artifacts', () => {
    renderEnd(
      flowWith((flow) => ({
        ...flow,
        artifacts: [],
      })),
    );

    expect(screen.getByText('Add an outcome artifact on the flow panel first.')).toBeTruthy();
    expect(screen.queryByLabelText('Produced artifact')).toBeNull();
    const labels = Array.from(document.querySelectorAll('label')).map((label) => label.textContent);
    expect(labels).toEqual(['Outcome']);
  });
});

// The plan flow with two outcome artifacts, and its End `done` with no produced artifact, as a new End starts.
function blankEndPipeline(): Pipeline {
  return flowWith((flow) => ({
    ...flow,
    artifacts: [
      { label: 'plan.md', template: 'output.md' },
      { label: 'notes.md', template: 'output.md' },
    ],
    blocks: flow.blocks.map((block) => (block.kind === 'end' ? { ...block, producedArtifact: '' } : block)),
  }));
}

describe('F-16 AC-024 End produced artifact placeholder', () => {
  it('F-16 AC-024 shows the blank placeholder for a new End and saves nothing', () => {
    const pipelineState = blankEndPipeline();
    const { onChange } = renderEnd(pipelineState);

    const select = screen.getByLabelText('Produced artifact');
    expect(optionValues('Produced artifact')).toEqual(['', 'plan.md', 'notes.md']);
    expect(select.querySelector('option')?.textContent).toBe('Choose an artifact');
    expect(select).toHaveProperty('value', '');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-16 AC-024 saves a picked artifact and shows it in place of the placeholder', () => {
    const pipelineState = blankEndPipeline();
    const onChange = vi.fn();
    const flow = pipelineState.flows.find((item) => item.id === 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
    if (flow === undefined) throw new Error('no plan flow in the test pipeline');
    const view = render(
      <EndPanel
        pipelineState={pipelineState}
        rules={[]}
        flow={flow}
        block={endOf(pipelineState, 'e9921352-41c9-5771-a013-0c63c6a49697')}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Produced artifact'), { target: { value: 'notes.md' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(endOf(saved, 'e9921352-41c9-5771-a013-0c63c6a49697').producedArtifact).toBe('notes.md');
    const savedFlow = saved.flows.find((item) => item.id === 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
    if (savedFlow === undefined) throw new Error('no plan flow in the saved pipeline');
    view.rerender(
      <EndPanel
        pipelineState={saved}
        rules={[]}
        flow={savedFlow}
        block={endOf(saved, 'e9921352-41c9-5771-a013-0c63c6a49697')}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText('Produced artifact')).toHaveProperty('value', 'notes.md');
    expect(optionValues('Produced artifact')).toEqual(['plan.md', 'notes.md']);
    expect(screen.queryByText('Choose an artifact')).toBeNull();
  });

  it('F-16 AC-024 shows the required reason under a blank End, with the control described by it', () => {
    const pipelineState = blankEndPipeline();
    const required = editEndArtifact(pipelineState, [], 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'e9921352-41c9-5771-a013-0c63c6a49697', '');
    if (required.ok) throw new Error('the parser accepted a blank produced artifact');
    renderEnd(pipelineState);

    expect(screen.getByText(required.reason)).toBeTruthy();
    expect(screen.getByLabelText('Produced artifact').getAttribute('aria-describedby')).toBe(
      'block-end-producedArtifact-refusal',
    );
  });

  it('F-16 AC-024 refuses the placeholder when it is picked again, and keeps the blank saved value', () => {
    const pipelineState = blankEndPipeline();
    const refused = editEndArtifact(pipelineState, [], 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'e9921352-41c9-5771-a013-0c63c6a49697', '');
    if (refused.ok) throw new Error('the parser accepted a blank produced artifact');
    const { onChange } = renderEnd(pipelineState);

    fireEvent.change(screen.getByLabelText('Produced artifact'), { target: { value: '' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(refused.reason)).toBeTruthy();
    expect(screen.getByLabelText('Produced artifact')).toHaveProperty('value', '');
  });

  it('F-16 AC-024 shows the saved artifact when the flow no longer has it, not another artifact', () => {
    const pipelineState = flowWith((flow) => ({
      ...flow,
      artifacts: [{ label: 'notes.md', template: 'output.md' }],
    }));
    renderEnd(pipelineState);

    expect(optionValues('Produced artifact')).toEqual(['plan.md', 'notes.md']);
    expect(screen.getByLabelText('Produced artifact')).toHaveProperty('value', 'plan.md');
    expect(screen.queryByText('Choose an artifact')).toBeNull();
  });

  it('F-16 AC-024 shows no placeholder and no reason when the End has a produced artifact', () => {
    renderEnd(planPipeline());

    expect(screen.queryByText('Choose an artifact')).toBeNull();
    expect(screen.getByLabelText('Produced artifact').getAttribute('aria-describedby')).toBeNull();
  });
});

describe('F-12 AC-043 End delete control', () => {
  it('F-12 AC-043 disables Delete block on the last End and shows its reason under the button', () => {
    renderEnd(planPipeline());

    const button = screen.getByRole('button', { name: 'Delete block' });
    expect(button).toHaveProperty('disabled', true);
    expect(screen.getByText('A flow keeps at least one End block.')).toBeTruthy();
    expect(button.getAttribute('aria-describedby')).toBe('block-delete-refusal');
  });

  it('F-12 AC-043 enables Delete block on an End when the flow has another End, and shows no reason', () => {
    const pipelineState = flowWith((flow) => ({
      ...flow,
      blocks: [
        ...flow.blocks,
        { index: 4, id: 'stopped', kind: 'end', outcome: 'stopped', producedArtifact: 'plan.md' },
      ],
    }));
    renderEnd(pipelineState, 'stopped');

    const button = screen.getByRole('button', { name: 'Delete block' });
    expect(button).toHaveProperty('disabled', false);
    expect(screen.getByText('Asks first')).toBeTruthy();
    expect(screen.queryByText('A flow keeps at least one End block.')).toBeNull();
    expect(button.getAttribute('aria-describedby')).toBeNull();
  });
});

describe('F-12 AC-039 Delete block confirmation', () => {
  it('F-12 AC-039 names the block and its arrows, and asks first', () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.click(screen.getByRole('button', { name: 'Delete block' }));

    const dialog = screen.getByRole('dialog', { name: "Delete block 'planner'?" });
    expect(within(dialog).getByText(/^2 arrows will be removed\./)).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-12 AC-039 Cancel keeps the block and its arrows', async () => {
    const { onChange } = renderPanel(planPipeline());

    fireEvent.click(screen.getByRole('button', { name: 'Delete block' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-12 AC-039 uses the singular for one arrow', () => {
    const pipelineState = flowWith((flow) => ({
      ...flow,
      blocks: [
        { index: 0, id: '15e362eb-af40-5e75-8c68-8ac7e7fc6a9e', kind: 'start', next: 'e9921352-41c9-5771-a013-0c63c6a49697' },
        { index: 1, id: 'e9921352-41c9-5771-a013-0c63c6a49697', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
        { index: 2, id: 'stopped', kind: 'end', outcome: 'stopped', producedArtifact: 'plan.md' },
      ],
    }));
    renderEnd(pipelineState, 'e9921352-41c9-5771-a013-0c63c6a49697');

    fireEvent.click(screen.getByRole('button', { name: 'Delete block' }));

    expect(screen.getByText(/^1 arrow will be removed\./)).toBeTruthy();
  });

  it('F-12 AC-040 Confirm removes the block and its arrows, clears the route to it and keeps the other blocks', () => {
    const pipelineState = planPipeline();
    const { onChange } = renderPanel(pipelineState);

    fireEvent.click(screen.getByRole('button', { name: 'Delete block' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    const blocks = (onChange.mock.calls[0]?.[0] as Pipeline).flows[0]?.blocks ?? [];
    expect(blocks.map((block) => block.id)).toEqual(['15e362eb-af40-5e75-8c68-8ac7e7fc6a9e', '1954b5cf-b131-5509-9c06-eb5b22e8aaad', 'e9921352-41c9-5771-a013-0c63c6a49697']);
    expect(blocks[0]).toEqual({ ...pipelineState.flows[0]?.blocks[0], next: '' });
    expect(blocks[1]).toEqual(pipelineState.flows[0]?.blocks[2]);
  });

  it('F-12 AC-039 names a Condition by its description and counts its three arrows', () => {
    renderCondition(conditionPipeline(), '8f16ac90-f4a1-5d2b-95fa-129518a01467');

    fireEvent.click(screen.getByRole('button', { name: 'Delete block' }));

    expect(screen.getByRole('dialog', { name: "Delete block 'Condition: The reviewer approves'?" })).toBeTruthy();
    expect(screen.getByText(/^3 arrows will be removed/)).toBeTruthy();
  });

  it('F-12 AC-040 Confirm on a Condition clears the routes that pointed to it', () => {
    const pipelineState = conditionPipeline();
    const { onChange } = renderCondition(pipelineState, '8f16ac90-f4a1-5d2b-95fa-129518a01467');

    fireEvent.click(screen.getByRole('button', { name: 'Delete block' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    const blocks = (onChange.mock.calls[0]?.[0] as Pipeline).flows[0]?.blocks ?? [];
    expect(blocks.map((block) => block.id)).toEqual(['15e362eb-af40-5e75-8c68-8ac7e7fc6a9e', 'c045cda9-9761-5373-941f-b21a3f878ede', 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0', 'e9921352-41c9-5771-a013-0c63c6a49697']);
    expect(blocks[2]).toEqual({ ...pipelineState.flows[0]?.blocks[2], next: '' });
  });

  it('F-12 AC-040 Confirm on an End deletes it when the flow has another End', () => {
    const pipelineState = flowWith((flow) => ({
      ...flow,
      blocks: [
        ...flow.blocks,
        { index: 4, id: 'stopped', kind: 'end', outcome: 'stopped', producedArtifact: 'plan.md' },
      ],
    }));
    const { onChange } = renderEnd(pipelineState, 'stopped');

    fireEvent.click(screen.getByRole('button', { name: 'Delete block' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    const blocks = (onChange.mock.calls[0]?.[0] as Pipeline).flows[0]?.blocks ?? [];
    expect(blocks.map((block) => block.id)).toEqual(['15e362eb-af40-5e75-8c68-8ac7e7fc6a9e', 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0', '1954b5cf-b131-5509-9c06-eb5b22e8aaad', 'e9921352-41c9-5771-a013-0c63c6a49697']);
  });
});

describe('F-12 AC-042 Start panel', () => {
  it('F-12 AC-042 shows the title, the subtitle and a disabled Delete block with its reason', () => {
    const pipelineState = planPipeline();
    const flow = pipelineState.flows[0];
    const block = flow?.blocks[0];
    if (flow === undefined || block?.kind !== 'start') throw new Error('no Start in the test pipeline');
    const onChange = vi.fn();
    render(<StartPanel pipelineState={pipelineState} flow={flow} block={block} onChange={onChange} />);

    expect(screen.getByRole('heading', { name: 'Start' })).toBeTruthy();
    expect(screen.getByText('Start block in the Plan flow')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete block' })).toHaveProperty('disabled', true);
    expect(screen.getByText('A flow keeps its Start block.')).toBeTruthy();
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-24) required Agent text and Condition description', () => {
  it('F-12 (no criterion: Verify device fix 2026-11-24) shows the empty-name error on the key press that empties the name, before any commit', () => {
    const pipelineState = planPipeline();
    const reason = parserReason(pipelineState, { field: 'name', value: '' });
    const { onChange } = renderPanel(pipelineState);
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });
    expect(document.getElementById('block-agent-name-refusal')?.textContent).toBe(reason);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 's' } });
    fireEvent.keyUp(input, { key: 's' });
    expect(screen.queryByText(reason)).toBeNull();
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) shows the empty-description error on the key press that empties it, and hides it once text is typed', () => {
    const pipelineState = planPipeline();
    const reason = parserReason(pipelineState, { field: 'description', value: '' });
    renderPanel(pipelineState);
    const input = screen.getByLabelText('Description');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });
    expect(screen.getByText(reason).id).toBe('block-agent-description-refusal');

    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.keyUp(input, { key: 'x' });
    expect(screen.queryByText(reason)).toBeNull();
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) shows the empty-body error on the key press that empties it, and hides it once text is typed', () => {
    const pipelineState = planPipeline();
    const reason = parserReason(pipelineState, { field: 'body', value: '' });
    renderPanel(pipelineState);
    const input = screen.getByLabelText('Body · required');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });
    expect(screen.getByText(reason).id).toBe('block-agent-body-refusal');

    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.keyUp(input, { key: 'x' });
    expect(screen.queryByText(reason)).toBeNull();
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) shows the empty-description error of a Condition on the key press that empties it, and hides it once text is typed', () => {
    const pipelineState = conditionPipeline();
    const result = editConditionDescription(pipelineState, [], 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '8f16ac90-f4a1-5d2b-95fa-129518a01467', '');
    if (result.ok) throw new Error('the parser accepted a blank description');
    renderCondition(pipelineState, '8f16ac90-f4a1-5d2b-95fa-129518a01467');
    const input = screen.getByLabelText('What it checks');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });
    expect(screen.getByText(result.reason).id).toBe('block-condition-description-refusal');

    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.keyUp(input, { key: 'x' });
    expect(screen.queryByText(result.reason)).toBeNull();
  });
});

// The control box of a field: the box its TextField sits in. A field's reason is drawn inside that box.
function controlBoxOf(input: HTMLElement): HTMLElement {
  const box = input.closest('.MuiTextField-root')?.parentElement;
  if (box === null || box === undefined) throw new Error('the field has no control box');
  return box;
}

describe('F-12 (no criterion: Verify device fix 2026-11-24) error inside its field box', () => {
  it('F-12 (no criterion: Verify device fix 2026-11-24) draws the empty Agent name error inside the name control box, 4 px under the field', () => {
    const pipelineState = planPipeline();
    const reason = parserReason(pipelineState, { field: 'name', value: '' });
    renderPanel(pipelineState);
    const input = screen.getByLabelText('Name');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    const control = controlBoxOf(input);
    expect(screen.getByText(reason).parentElement).toBe(control);
    expect(getComputedStyle(control).getPropertyValue('gap')).toBe('4px');
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) draws the empty Agent body error inside the body control box, and the counter stays under the box', () => {
    const pipelineState = planPipeline();
    const reason = parserReason(pipelineState, { field: 'body', value: '' });
    renderPanel(pipelineState);
    const input = screen.getByLabelText('Body · required');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });

    const control = controlBoxOf(input);
    expect(screen.getByText(reason).parentElement).toBe(control);
    expect(control.nextElementSibling).toBe(document.getElementById('block-agent-body-counter'));
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) draws a refused round limit inside its control box, beneath the rounds row', () => {
    const pipelineState = conditionPipeline();
    renderCondition(pipelineState, '8f16ac90-f4a1-5d2b-95fa-129518a01467');
    const input = screen.getByLabelText('Round limit');
    const result = setConditionRoundLimit(pipelineState, [], 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '8f16ac90-f4a1-5d2b-95fa-129518a01467', '0');
    if (result.ok) throw new Error('the parser accepted the round limit "0"');

    fireEvent.change(input, { target: { value: '0' } });

    const roundRow = controlBoxOf(input);
    const control = roundRow.parentElement;
    if (control === null) throw new Error('the round limit has no control box');
    expect(screen.getByText(result.reason).parentElement).toBe(control);
    expect(control.firstElementChild).toBe(roundRow);
    expect(getComputedStyle(control).getPropertyValue('gap')).toBe('4px');
  });
});
