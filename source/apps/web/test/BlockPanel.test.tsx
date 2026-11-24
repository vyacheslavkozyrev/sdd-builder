// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { editAgentField } from '../src/builder/blockFields.js';
import { AgentPanel, ConditionPanel } from '../src/builder/BlockPanel.js';
import { editConditionDescription, setConditionRoundLimit } from '../src/builder/blockCondition.js';
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

// The Condition panel. The plan flow here: start, a pre-check after the start (true to the planner, false
// stops the flow), the planner, an end check (true to End, false returns to the planner with 3 rounds), End.
function conditionPipeline(blocks: Block[] = conditionBlocks()): Pipeline {
  const plan: Flow = {
    index: 0,
    id: 'plan',
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
    { index: 0, id: 'start', kind: 'start', next: 'pre' },
    {
      index: 1,
      id: 'pre',
      kind: 'condition',
      description: 'The previous step is complete',
      true: { to: 'planner' },
      false: { stop: true },
    },
    {
      index: 2,
      id: 'planner',
      kind: 'agent',
      name: 'planner',
      description: 'Writes the plan.',
      arguments: [],
      next: 'check',
      body: 'Writes plan.md.',
    },
    {
      index: 3,
      id: 'check',
      kind: 'condition',
      description: 'The reviewer approves',
      true: { to: 'done' },
      false: { to: 'planner', roundLimit: 3 },
    },
    { index: 4, id: 'done', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ];
}

function conditionOf(pipelineState: Pipeline, blockId: string): ConditionBlock {
  const flow = pipelineState.flows.find((item) => item.id === 'plan');
  const block = flow?.blocks.find((item) => item.id === blockId);
  if (block === undefined || block.kind !== 'condition') {
    throw new Error(`no Condition ${blockId} in the test pipeline`);
  }
  return block;
}

function renderCondition(pipelineState: Pipeline, blockId: string) {
  const onChange = vi.fn();
  const flow = pipelineState.flows.find((item) => item.id === 'plan');
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
    renderCondition(conditionPipeline(), 'check');

    expect(screen.getByText('Condition: end check')).toBeTruthy();
    expect(screen.getByText('Check on the arrow before End')).toBeTruthy();
  });

  it('F-12 AC-030 shows the title as a pre-check when the true route does not go to End', () => {
    renderCondition(conditionPipeline(), 'pre');

    expect(screen.getByText('Condition: pre-check')).toBeTruthy();
    expect(screen.getByText('Check on the arrow before planner')).toBeTruthy();
  });

  it('F-12 AC-030 shows a pre-check subtitle without a block name when the true route has no arrow', () => {
    const blocks = conditionBlocks();
    blocks[1] = {
      index: 1,
      id: 'pre',
      kind: 'condition',
      description: 'Check',
      true: { to: '' },
      false: { stop: true },
    };
    renderCondition(conditionPipeline(blocks), 'pre');

    expect(screen.getByText('Condition: pre-check')).toBeTruthy();
    expect(screen.getByText('Check on the arrow')).toBeTruthy();
  });

  it('F-12 AC-030 shows the saved description and its counter', () => {
    renderCondition(conditionPipeline(), 'check');

    expect(screen.getByLabelText('What it checks')).toHaveProperty('value', 'The reviewer approves');
    expect(screen.getByText('21 / 1000 characters')).toBeTruthy();
  });

  it('F-12 AC-030 saves a changed description through the parser', () => {
    const pipelineState = conditionPipeline();
    const { onChange } = renderCondition(pipelineState, 'check');

    fireEvent.change(screen.getByLabelText('What it checks'), { target: { value: 'The tests pass' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(conditionOf(saved, 'check').description).toBe('The tests pass');
    expect(conditionOf(saved, 'pre')).toEqual(conditionOf(pipelineState, 'pre'));
  });

  it('F-12 AC-030 refuses a blank description with the parser reason and keeps the saved value', () => {
    const pipelineState = conditionPipeline();
    const { onChange } = renderCondition(pipelineState, 'check');
    const result = editConditionDescription(pipelineState, [], 'plan', 'check', '   ');
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
    renderCondition(conditionPipeline(), 'pre');

    expect(screen.getByText('Next: planner')).toBeTruthy();
  });

  it('F-12 AC-031 shows "No arrow yet" when the true route has no arrow', () => {
    const blocks = conditionBlocks();
    blocks[1] = {
      index: 1,
      id: 'pre',
      kind: 'condition',
      description: 'Check',
      true: { to: '' },
      false: { stop: true },
    };
    renderCondition(conditionPipeline(blocks), 'pre');

    expect(screen.getByText('No arrow yet')).toBeTruthy();
  });

  it('F-12 AC-032 shows "Stop the flow and ask the user" for a false route with no arrow', () => {
    renderCondition(conditionPipeline(), 'pre');

    expect(screen.getByText('Stop the flow and ask the user')).toBeTruthy();
  });

  it('F-12 AC-032 shows "Returns to <name>, up to N rounds" for a return', () => {
    renderCondition(conditionPipeline(), 'check');

    expect(screen.getByText('Returns to planner, up to 3 rounds')).toBeTruthy();
  });

  it('F-12 AC-032 shows "Goes to <name>" for a false route to a later block', () => {
    const blocks = conditionBlocks();
    blocks[1] = {
      index: 1,
      id: 'pre',
      kind: 'condition',
      description: 'Check',
      true: { to: 'planner' },
      false: { to: 'check' },
    };
    renderCondition(conditionPipeline(blocks), 'pre');

    expect(screen.getByText('Goes to Condition: The reviewer approves')).toBeTruthy();
  });
});

describe('F-12 AC-033 and AC-034 round limit', () => {
  it('F-12 AC-033 shows the round limit and "rounds" for a return only', () => {
    renderCondition(conditionPipeline(), 'check');

    expect(screen.getByLabelText('Round limit')).toHaveProperty('value', '3');
    expect(screen.getByText('rounds')).toBeTruthy();
  });

  it('F-12 AC-034 shows no round field for a false route to a later block or no arrow', () => {
    renderCondition(conditionPipeline(), 'pre');

    expect(screen.queryByLabelText('Round limit')).toBeNull();
    expect(labelsShown()).not.toContain('Round limit');
  });

  it.each(['0', '6', '2.5', ''])('F-12 AC-033 refuses the round limit "%s" and keeps the saved one', (text) => {
    const pipelineState = conditionPipeline();
    const { onChange } = renderCondition(pipelineState, 'check');
    const result = setConditionRoundLimit(pipelineState, [], 'plan', 'check', text);
    if (result.ok) throw new Error(`the parser accepted the round limit "${text}"`);

    fireEvent.change(screen.getByLabelText('Round limit'), { target: { value: text } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('A return allows 1 to 5 rounds.')).toBeTruthy();
    expect(screen.getByLabelText('Round limit')).toHaveProperty('value', '3');
  });

  it('F-12 AC-033 saves an accepted round limit through the parser', () => {
    const pipelineState = conditionPipeline();
    const { onChange } = renderCondition(pipelineState, 'check');

    fireEvent.change(screen.getByLabelText('Round limit'), { target: { value: '5' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(conditionOf(saved, 'check').false).toEqual({ to: 'planner', roundLimit: 5 });
  });
});
