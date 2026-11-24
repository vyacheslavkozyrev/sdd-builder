// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addAgentArgument,
  addAgentLabel,
  addAgentRuleTag,
  addAgentTool,
} from '../src/builder/blockAgentFields.js';
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
  { index: 0, id: 'no-secrets', title: 'No secrets', text: 'Never write a secret to a file.' },
  { index: 1, id: 'plain-words', title: 'Plain words', text: 'Use plain words in the text.' },
];

// The plan flow has two outcome artifacts; the planner reads and writes them and has one argument, one tool and
// one rule tag, so each list starts with a saved value.
function pipelineWithLists(): Pipeline {
  const blocks: Block[] = [
    { index: 0, id: 'start', kind: 'start', next: 'planner' },
    {
      index: 1,
      id: 'planner',
      kind: 'agent',
      name: 'planner',
      description: 'Writes the plan from the brief.',
      arguments: [{ index: 0, id: 'feature-id', required: true, hint: 'feature-id' }],
      tools: ['Read'],
      reads: ['plan.md'],
      writes: ['plan.md'],
      ruleTags: [{ index: 0, ruleId: 'no-secrets' }],
      next: 'done',
      body: 'Reads the brief and writes plan.md.',
    },
    { index: 2, id: 'done', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ];
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: [
      {
        index: 0,
        id: 'plan',
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
  const block = pipelineState.flows[0]?.blocks.find((item) => item.id === 'planner');
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

describe('F-12 AC-022 Agent argument rows', () => {
  it('F-12 AC-022 shows each saved argument as a field with its id, a required checkbox and a minus', () => {
    renderPanel(pipelineWithLists());

    const row = screen.getByRole('group', { name: 'Argument 1' });
    expect(within(row).getByLabelText('Argument 1 id')).toHaveProperty('value', 'feature-id');
    expect(within(row).getByRole('checkbox')).toHaveProperty('checked', true);
    expect(within(row).getByRole('button', { name: 'Remove argument 1' })).toBeTruthy();
  });

  it('F-12 AC-022 unticking the required checkbox saves required false through the parser, keeping id and hint', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(within(screen.getByRole('group', { name: 'Argument 1' })).getByRole('checkbox'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(plannerOf(saved).arguments).toEqual([{ index: 0, id: 'feature-id', required: false, hint: 'feature-id' }]);
  });

  it('F-12 AC-022 a new argument line saves a valid id on blur, unrequired, with the id as its hint', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    typeAndLeave(screen.getByLabelText('New argument id'), 'topic');

    expect(onChange).toHaveBeenCalledTimes(1);
    const saved = onChange.mock.calls[0]?.[0] as Pipeline;
    expect(plannerOf(saved).arguments.map((item) => [item.id, item.required, item.hint])).toEqual([
      ['feature-id', true, 'feature-id'],
      ['topic', false, 'topic'],
    ]);
  });

  it('F-12 AC-022 a refused argument id is discarded with no error shown, since it reverts to the saved list', () => {
    const pipelineState = pipelineWithLists();
    const { onChange } = renderPanel(pipelineState);
    const reason = reasonOf(
      addAgentArgument(pipelineState, RULES, 'plan', 'planner', { id: 'Bad Id!', required: false, hint: 'Bad Id!' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    typeAndLeave(screen.getByLabelText('New argument id'), 'Bad Id!');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
    expect(screen.queryByText(reason)).toBeNull();
  });

  it('F-12 AC-022 a blank new argument line is discarded on blur and nothing is saved', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    fireEvent.blur(screen.getByLabelText('New argument id'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('New argument id')).toBeNull();
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
    const reason = reasonOf(addAgentTool(pipelineState, RULES, 'plan', 'planner', tooLong));

    fireEvent.click(screen.getByRole('button', { name: 'Add tool' }));
    typeAndLeave(screen.getByLabelText('New tool text'), tooLong);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Tool 1 text')).toHaveProperty('value', 'Read');
  });

  it('F-12 AC-022 the minus of a tool removes it and keeps the others', () => {
    const pipelineState = pipelineWithLists();
    const { onChange } = renderPanel(pipelineState);

    fireEvent.click(screen.getByRole('button', { name: 'Remove tool 1' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(plannerOf(onChange.mock.calls[0]?.[0] as Pipeline).tools).toEqual([]);
  });
});

describe('F-12 AC-026 Agent reads and writes', () => {
  it('F-12 AC-026 shows each saved label as a row with a minus, under the titles Reads and Writes', () => {
    renderPanel(pipelineWithLists());

    expect(screen.getByText('Reads')).toBeTruthy();
    expect(screen.getByText('Writes')).toBeTruthy();
    const row = screen.getByRole('group', { name: 'Reads label 1' });
    expect(within(row).getByLabelText('Reads label 1 text')).toHaveProperty('value', 'plan.md');
    expect(within(row).getByRole('button', { name: 'Remove reads label 1' })).toBeTruthy();
  });

  it('F-12 AC-026 adds an outcome artifact label to writes through + and Enter, and saves it', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Add writes label' }));
    const input = screen.getByLabelText('New writes label text');
    fireEvent.change(input, { target: { value: 'notes.md' } });
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(plannerOf(onChange.mock.calls[0]?.[0] as Pipeline).writes).toEqual(['plan.md', 'notes.md']);
  });

  it('F-12 AC-026 refuses a label that is not an outcome artifact, with its reason, and keeps the list', () => {
    const pipelineState = pipelineWithLists();
    const { onChange } = renderPanel(pipelineState);
    const reason = reasonOf(addAgentLabel(pipelineState, RULES, 'plan', 'planner', 'reads', 'secret.md'));

    fireEvent.click(screen.getByRole('button', { name: 'Add reads label' }));
    typeAndLeave(screen.getByLabelText('New reads label text'), 'secret.md');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Reads label 1' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Reads label 2' })).toBeNull();
  });

  it('F-12 AC-026 refuses a label the list already has, with the parser reason', () => {
    const pipelineState = pipelineWithLists();
    const { onChange } = renderPanel(pipelineState);
    const reason = reasonOf(addAgentLabel(pipelineState, RULES, 'plan', 'planner', 'writes', 'plan.md'));

    fireEvent.click(screen.getByRole('button', { name: 'Add writes label' }));
    typeAndLeave(screen.getByLabelText('New writes label text'), 'plan.md');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
  });

  it('F-12 AC-026 the minus of a label row removes that label and keeps the others', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Remove writes label 1' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(plannerOf(onChange.mock.calls[0]?.[0] as Pipeline).writes).toEqual([]);
    expect(plannerOf(onChange.mock.calls[0]?.[0] as Pipeline).reads).toEqual(['plan.md']);
  });
});

describe('F-12 (no criterion: Verify device fix 2026-11-24) Agent list layout', () => {
  it('F-12 (no criterion: Verify device fix 2026-11-24) Reads and Writes have the Tools list layout', () => {
    renderPanel(pipelineWithLists());

    const lists = [
      { title: 'Tools', add: 'Add tool' },
      { title: 'Reads', add: 'Add reads label' },
      { title: 'Writes', add: 'Add writes label' },
    ].map((list) => {
      const titleElement = screen.getByText(list.title);
      const titleRow = titleElement.parentElement;
      if (titleRow === null) throw new Error(`no title row for ${list.title}`);
      return { ...list, tag: titleElement.tagName, titleRow };
    });

    // Each list has the same title element, and its + sits in the title row beside it.
    expect(new Set(lists.map((list) => list.tag)).size).toBe(1);
    for (const list of lists) {
      expect(within(list.titleRow).getByRole('button', { name: list.add })).toBeTruthy();
    }

    // Each item is a row with a read-only field and a minus, as a tool is; no item is a chip.
    const rows = [
      { group: 'Tool 1', text: 'Tool 1 text', remove: 'Remove tool 1' },
      { group: 'Reads label 1', text: 'Reads label 1 text', remove: 'Remove reads label 1' },
      { group: 'Writes label 1', text: 'Writes label 1 text', remove: 'Remove writes label 1' },
    ];
    for (const row of rows) {
      const group = screen.getByRole('group', { name: row.group });
      expect(within(group).getByLabelText(row.text)).toHaveProperty('readOnly', true);
      expect(within(group).getByRole('button', { name: row.remove })).toBeTruthy();
    }

    // The lists keep the order of AC-022: Tools, Reads, Writes, then Rule tags.
    const order = Array.from(document.querySelectorAll('p')).map((element) => element.textContent);
    expect(order.indexOf('Tools')).toBeLessThan(order.indexOf('Reads'));
    expect(order.indexOf('Reads')).toBeLessThan(order.indexOf('Writes'));
    expect(order.indexOf('Writes')).toBeLessThan(order.indexOf('Rule tags'));
  });
});

describe('F-12 AC-027 Agent rule tags', () => {
  it('F-12 AC-027 shows the saved rule tag as a dropdown of the project rules, with a minus', () => {
    renderPanel(pipelineWithLists());

    const row = screen.getByRole('group', { name: 'Rule tag 1' });
    expect(within(row).getByLabelText('Rule tag 1 rule')).toHaveProperty('value', 'no-secrets');
    expect(within(row).getByRole('button', { name: 'Remove rule tag 1' })).toBeTruthy();
  });

  it('F-12 AC-027 adds a rule of the project through + and the dropdown', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Add rule tag' }));
    fireEvent.change(screen.getByLabelText('New rule tag rule'), { target: { value: 'plain-words' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(plannerOf(onChange.mock.calls[0]?.[0] as Pipeline).ruleTags?.map((tag) => tag.ruleId)).toEqual([
      'no-secrets',
      'plain-words',
    ]);
  });

  it('F-12 AC-027 refuses a rule the Agent already has, with the parser reason, and keeps the saved tags', () => {
    const pipelineState = pipelineWithLists();
    const { onChange } = renderPanel(pipelineState);
    const reason = reasonOf(addAgentRuleTag(pipelineState, RULES, 'plan', 'planner', 'no-secrets'));

    fireEvent.click(screen.getByRole('button', { name: 'Add rule tag' }));
    fireEvent.change(screen.getByLabelText('New rule tag rule'), { target: { value: 'no-secrets' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(reason)).toBeTruthy();
  });

  it('F-12 AC-027 an unknown rule is refused by the parser with its reason', () => {
    const pipelineState = pipelineWithLists();
    const result = addAgentRuleTag(pipelineState, RULES, 'plan', 'planner', 'ghost-rule');

    expect(result.ok).toBe(false);
    expect(reasonOf(result)).toMatch(/ghost-rule/);
  });

  it('F-12 AC-027 the minus of a rule tag removes it', () => {
    const { onChange } = renderPanel(pipelineWithLists());

    fireEvent.click(screen.getByRole('button', { name: 'Remove rule tag 1' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(plannerOf(onChange.mock.calls[0]?.[0] as Pipeline).ruleTags).toEqual([]);
  });
});

describe('F-12 AC-022 Agent panel order', () => {
  it('F-12 AC-022 lists the Agent fields in order: Name, Description, Arguments, Model, Tools, Reads, Writes, Rule tags, Body', () => {
    renderPanel(pipelineWithLists());

    const wanted = [
      'Name',
      'Description',
      'Arguments',
      'Model',
      'Tools',
      'Reads',
      'Writes',
      'Rule tags',
      'Body · required',
    ];
    const shown = Array.from(document.querySelectorAll('label, p'))
      .map((element) => element.textContent)
      .filter((text): text is string => wanted.includes(text ?? ''));
    expect(shown).toEqual(wanted);
  });
});
