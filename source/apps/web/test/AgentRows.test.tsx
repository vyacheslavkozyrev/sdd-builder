// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addAgentArgument, addAgentRuleTag, addAgentTool } from '../src/builder/blockAgentFields.js';
import { AgentPanel } from '../src/builder/BlockPanel.js';
import type { Pipeline, Rule } from '../src/builder/fields.js';

// The Agent lists of the panel are rendered in the DOM, so this file runs in jsdom (architecture.md §5).
// Each refusal expected here is the reason the parser (through blockAgentFields.ts) gives for that edit; the
// panel must show that reason, not a wording of its own.

afterEach(() => {
  cleanup();
});

type Block = core.Block;
type AgentBlock = core.AgentBlock;

const RULES: readonly Rule[] = [
  { index: 0, id: '0c71d478-327b-5b57-b985-9e4352721ab6', title: 'No secrets', text: 'Never write a secret to a file.' },
  { index: 1, id: 'a73b7d64-46a6-567c-b9e5-d381e24f8157', title: 'Plain words', text: 'Use plain words in the text.' },
];

// The plan flow has two outcome artifacts; the planner has one argument, one tool and one rule tag, so each list
// starts with a saved value.
function pipelineWithLists(): Pipeline {
  const blocks: Block[] = [
    { index: 0, id: '15e362eb-af40-5e75-8c68-8ac7e7fc6a9e', kind: 'start', next: 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0' },
    {
      index: 1,
      id: 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0',
      kind: 'agent',
      name: 'planner',
      description: 'Writes the plan from the brief.',
      arguments: [{ index: 0, id: '82f01964-ec89-5b1a-8ccc-5a29c72f2adf', required: true, hint: 'The feature' }],
      tools: ['Read'],
      ruleTags: [{ index: 0, ruleId: '0c71d478-327b-5b57-b985-9e4352721ab6' }],
      next: 'e9921352-41c9-5771-a013-0c63c6a49697',
      body: 'Reads the brief and writes plan.md.',
    },
    { index: 2, id: 'e9921352-41c9-5771-a013-0c63c6a49697', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ];
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: [
      {
        index: 0,
        id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
        name: 'Plan',
        description: 'The plan step.',
        arguments: [],
        body: 'Plan the work.',
        artifacts: [
          { label: 'plan.md', template: 'output.md' },
          { label: 'notes.md', template: 'notes.md' },
        ],
        approval: false,
        blocks,
      },
    ],
  };
}

function plannerOf(pipelineState: Pipeline): AgentBlock {
  const block = pipelineState.flows[0]?.blocks.find((item) => item.id === 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0');
  if (block === undefined || block.kind !== 'agent') throw new Error('no planner in the test pipeline');
  return block;
}

function renderPanel(pipelineState: Pipeline) {
  const onChange = vi.fn();
  const flow = pipelineState.flows[0];
  if (flow === undefined) throw new Error('no flow in the test pipeline');
  render(
    <AgentPanel
      pipelineState={pipelineState}
      rules={RULES}
      flow={flow}
      block={plannerOf(pipelineState)}
      onChange={onChange}
    />,
  );
  return { onChange };
}

// The reason the parser gives for an edit that must be refused. The test fails if the edit is accepted.
function reasonOf(result: { readonly ok: boolean; readonly reason?: string }): string {
  if (result.ok || result.reason === undefined) throw new Error('the test edit was accepted by the parser');
  return result.reason;
}

// Types into a line and leaves it, as a user does: the text is set, then the line loses focus.
function typeAndLeave(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

// A lower-case GUID in the 8-4-4-4-12 form (F-16 AC-027).
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('F-12 AC-022 Agent argument rows', () => {
  it('F-12 AC-022 shows each saved argument as a field with its name, a required checkbox and a minus', () => {
    renderPanel(pipelineWithLists());

    const row = screen.getByRole('group', { name: 'Argument 1' });
    expect(within(row).getByLabelText('Argument 1 name')).toHaveProperty('value', 'The feature');
    expect(within(row).getByRole('checkbox')).toHaveProperty('checked', true);
    expect(within(row).getByRole('button', { name: 'Remove argument 1' })).toBeTruthy();
  });

  it('F-12 AC-022 unticking the required checkbox saves required false through the parser, keeping id and hint', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(within(screen.getByRole('group', { name: 'Argument 1' })).getByRole('checkbox'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(plannerOf(saved).arguments).toEqual([{ index: 0, id: '82f01964-ec89-5b1a-8ccc-5a29c72f2adf', required: false, hint: 'The feature' }]);
  });

  it('F-12 AC-022 a new argument line saves a valid name on blur, unrequired, with a GUID id and the name as its hint', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    typeAndLeave(screen.getByLabelText('New argument name'), 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038');

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(plannerOf(saved).arguments.map((item) => [item.id, item.required, item.hint])).toEqual([
      ['82f01964-ec89-5b1a-8ccc-5a29c72f2adf', true, 'The feature'],
      [expect.stringMatching(GUID), false, 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038'],
    ]);
  });

  it('F-12 AC-022 F-16 AC-026 a new argument name with no letter or digit stays on the line with the parser reason, and nothing is saved', () => {
    const pipelineState = pipelineWithLists();
    const { onChange } = renderPanel(pipelineState);
    const reason = 'Needs a letter or digit.';

    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    typeAndLeave(screen.getByLabelText('New argument name'), '!!!');

    expect(onChange).not.toHaveBeenCalled();
    expect(within(screen.getByRole('group', { name: 'New argument' })).getByText(reason)).toBeTruthy();
  });

  it('F-12 AC-022 a blank new argument line is discarded on blur and nothing is saved', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    fireEvent.blur(screen.getByLabelText('New argument name'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('New argument name')).toBeNull();
  });
});

describe('F-12 AC-022 Agent tools', () => {
  it('F-12 AC-022 shows each saved tool as a row with a minus, and the list title Tools', () => {
    renderPanel(pipelineWithLists());

    expect(screen.getByText('Tools')).toBeTruthy();
    const row = screen.getByRole('group', { name: 'Tool 1' });
    expect(within(row).getByLabelText('Tool 1 text')).toHaveProperty('value', 'Read');
    expect(within(row).getByRole('button', { name: 'Remove tool 1' })).toBeTruthy();
  });

  it('F-12 AC-022 adds a tool through + and Enter, trimmed, after the saved tools', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));
    const input = screen.getByLabelText('New tool text');
    fireEvent.change(input, { target: { value: '  Bash ' } });
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(plannerOf(onChange.mock.calls[0]?.[0] as Pipeline).tools).toEqual(['Read', 'Bash']);
  });

  it('F-12 AC-022 a blank tool adds nothing and closes the line', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));
    typeAndLeave(screen.getByLabelText('New tool text'), '   ');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('New tool text')).toBeNull();
  });

  it('F-12 AC-022 the minus of a new tool line discards the line and saves nothing', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));
    fireEvent.change(screen.getByLabelText('New tool text'), { target: { value: 'Grep' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel new tool' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('New tool text')).toBeNull();
  });

  it('F-12 AC-022 a refused tool shows the parser reason beneath the list and keeps the saved tools', () => {
    const pipelineState = pipelineWithLists();
    const { onChange } = renderPanel(pipelineState);
    const tooLong = 't'.repeat(101);
    const reason = reasonOf(addAgentTool(pipelineState, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0', tooLong));

    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));
    typeAndLeave(screen.getByLabelText('New tool text'), tooLong);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Tool 1 text')).toHaveProperty('value', 'Read');
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) a repeated tool shows the reason beneath the list and keeps the saved tools', () => {
    const pipelineState = pipelineWithLists();
    const { onChange } = renderPanel(pipelineState);
    const reason = reasonOf(addAgentTool(pipelineState, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0', 'Read'));
    expect(reason).toBe('repeats Read; each tool must be listed once');

    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));
    typeAndLeave(screen.getByLabelText('New tool text'), 'Read');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Tool 1 text')).toHaveProperty('value', 'Read');
    expect(screen.queryByRole('group', { name: 'Tool 2' })).toBeNull();
  });

  it('F-12 AC-022 the minus of a tool removes it and keeps the others', () => {
    const pipelineState = pipelineWithLists();
    const { onChange } = renderPanel(pipelineState);

    fireEvent.click(screen.getByRole('button', { name: 'Remove tool 1' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(plannerOf(onChange.mock.calls[0]?.[0] as Pipeline).tools).toEqual([]);
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-24) Agent panel has no reads or writes', () => {
  it('F-12 (no criterion: Verify device fix 2026-11-24) shows no Reads or Writes list, and the Tools list keeps its layout', () => {
    renderPanel(pipelineWithLists());

    expect(screen.queryByText('Reads')).toBeNull();
    expect(screen.queryByText('Writes')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add reads label' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add writes label' })).toBeNull();

    const titleRow = screen.getByText('Tools').parentElement;
    if (titleRow === null) throw new Error('no title row for Tools');
    expect(within(titleRow).getByRole('button', { name: 'Add tool' })).toBeTruthy();
    const row = screen.getByRole('group', { name: 'Tool 1' });
    expect(within(row).getByLabelText('Tool 1 text')).toHaveProperty('readOnly', true);
    expect(within(row).getByRole('button', { name: 'Remove tool 1' })).toBeTruthy();
  });
});

describe('F-12 AC-027 Agent rule tags', () => {
  it('F-12 AC-027 shows the saved rule tag as a dropdown of the project rules, with a minus', () => {
    renderPanel(pipelineWithLists());

    const row = screen.getByRole('group', { name: 'Rule tag 1' });
    expect(within(row).getByLabelText('Rule tag 1 rule')).toHaveProperty('value', '0c71d478-327b-5b57-b985-9e4352721ab6');
    expect(within(row).getByRole('button', { name: 'Remove rule tag 1' })).toBeTruthy();
  });

  it('F-12 AC-027 adds a rule of the project through + and the dropdown', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Add rule tag' }));
    fireEvent.change(screen.getByLabelText('New rule tag rule'), { target: { value: 'a73b7d64-46a6-567c-b9e5-d381e24f8157' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(plannerOf(onChange.mock.calls[0]?.[0] as Pipeline).ruleTags?.map((tag) => tag.ruleId)).toEqual([
      '0c71d478-327b-5b57-b985-9e4352721ab6',
      'a73b7d64-46a6-567c-b9e5-d381e24f8157',
    ]);
  });

  it('F-12 AC-027 refuses a rule the Agent already has, with the parser reason, and keeps the saved tags', () => {
    const pipelineState = pipelineWithLists();
    const { onChange } = renderPanel(pipelineState);
    const reason = reasonOf(addAgentRuleTag(pipelineState, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0', '0c71d478-327b-5b57-b985-9e4352721ab6'));

    fireEvent.click(screen.getByRole('button', { name: 'Add rule tag' }));
    fireEvent.change(screen.getByLabelText('New rule tag rule'), { target: { value: '0c71d478-327b-5b57-b985-9e4352721ab6' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
  });

  it('F-12 AC-027 an unknown rule is refused by the parser with its reason', () => {
    const pipelineState = pipelineWithLists();
    const result = addAgentRuleTag(pipelineState, RULES, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'f09bba4a-ce3a-507e-9c22-6f1aa828c2a0', '1fedffc1-5c79-5aab-a165-4df0949d84f5');

    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toMatch(/1fedffc1-5c79-5aab-a165-4df0949d84f5/);
  });

  it('F-12 AC-027 the minus of a rule tag removes it', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Remove rule tag 1' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(plannerOf(onChange.mock.calls[0]?.[0] as Pipeline).ruleTags).toEqual([]);
  });
});

describe('F-12 AC-022 Agent panel order', () => {
  it('F-12 AC-022 lists the Agent fields in order: Name, Description, Arguments, Model, Tools, Rule tags, Body', () => {
    renderPanel(pipelineWithLists());

    const wanted = ['Name', 'Description', 'Arguments', 'Model', 'Tools', 'Rule tags', 'Body · required'];
    const shown = Array.from(document.querySelectorAll('label, p'))
      .map((element) => element.textContent)
      .filter((text): text is string => wanted.includes(text ?? ''));
    expect(shown).toEqual(wanted);
  });
});
