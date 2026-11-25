// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArgumentRows, ArtifactRows, RuleTagRows, TEMPLATE_HELP_TEXT } from '../src/builder/RowEditors.js';
import type { ListTarget } from '../src/builder/RowEditors.js';
import { FlowPanel } from '../src/builder/FlowPanel.js';
import { PipelinePanel } from '../src/builder/PipelinePanel.js';
import {
  addFlowArgument,
  addFlowArtifact,
  addFlowRuleTag,
  editFlowArgument,
  editFlowArtifact,
  removeFlowArtifact,
} from '../src/builder/fields.js';
import type { ArgumentRow, Pipeline, Rule } from '../src/builder/fields.js';
import { addPipelineArgument, editPipelineArgument } from '../src/builder/pipelineFields.js';

// The row editors are rendered in the DOM, so this file runs in jsdom (architecture.md §5). Every refusal
// text is the parser's own message, taken from the same parser call the editor makes, so the test does not
// copy any wording.

afterEach(() => {
  cleanup();
});

type Flow = core.Flow;

const RULES: readonly Rule[] = [
  { index: 0, id: 'general', title: 'General', text: 'Write short sentences.' },
  { index: 1, id: 'qa', title: 'QA', text: 'Every criterion has a test.' },
];

function flow(id: string, name = id): Flow {
  return {
    index: 0,
    id,
    name,
    description: `The ${name} step.`,
    arguments: [{ index: 0, id: 'feature-id', required: true, hint: 'The feature' }],
    body: `Do the ${name} work.`,
    artifacts: [{ label: 'plan.md', template: 'Task list, in order\nSecond line' }],
    approval: false,
    blocks: [],
    ruleTags: [{ index: 0, ruleId: 'general' }],
  };
}

function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    // An argument id is unique across the pipeline and its flows, so the pipeline's id differs from the flow's.
    arguments: [{ index: 0, id: 'brief', required: false, hint: '' }],
    ruleTags: [{ index: 0, ruleId: 'qa' }],
    flows: flows.map((item, index) => ({ ...item, index })),
  };
}

function basePipeline(): Pipeline {
  return pipelineOf(flow('plan', 'Plan'), flow('build', 'Build'));
}

// A flow `plan` with the given arguments, for the argument and refusal tests.
function withArguments(...rows: ArgumentRow[]): Pipeline {
  return pipelineOf({ ...flow('plan', 'Plan'), arguments: rows.map((row, index) => ({ index, ...row })) });
}

// The reason the parser gives for an argument edit it refuses. The test fails if the parser accepts it.
function argumentRefusal(result: ReturnType<typeof addFlowArgument>): string {
  if (result.ok) throw new Error('the test edit was accepted by the parser');
  return result.reason;
}

// Types `value` into a one-line field and leaves it (blur), which is how the editor takes an id.
function commitText(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

function renderArguments(pipelineState: Pipeline, target: ListTarget = { kind: 'flow', flowId: 'plan' }) {
  const onChange = vi.fn();
  render(<ArgumentRows pipelineState={pipelineState} rules={RULES} target={target} onChange={onChange} />);
  return { onChange };
}

function renderTags(pipelineState: Pipeline, target: ListTarget = { kind: 'flow', flowId: 'plan' }) {
  const onChange = vi.fn();
  render(<RuleTagRows pipelineState={pipelineState} rules={RULES} target={target} onChange={onChange} />);
  return { onChange };
}

function renderArtifacts(pipelineState: Pipeline) {
  const onChange = vi.fn();
  render(<ArtifactRows pipelineState={pipelineState} rules={RULES} flowId="plan" onChange={onChange} />);
  return { onChange };
}

// The pipeline the editor reports after an accepted edit: the callback's first argument.
function reported(onChange: ReturnType<typeof vi.fn>): Pipeline {
  const call = onChange.mock.calls[0];
  if (call === undefined) throw new Error('onChange was not called');
  return call[0] as Pipeline;
}

describe('F-11 AC-024 flow argument rows', () => {
  it('F-11 AC-024 shows each saved argument as a field with its id, a "required" checkbox and a minus; no new line is open', () => {
    renderArguments(basePipeline());
    const row = within(screen.getByRole('group', { name: 'Argument 1' }));
    expect(screen.getByLabelText('Argument 1 id')).toHaveProperty('value', 'feature-id');
    expect(row.getByRole('checkbox', { name: 'required' })).toBeTruthy();
    expect(row.getByRole('button', { name: 'Remove argument 1' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
  });

  it('F-11 AC-024 the required checkbox reflects the flag: the feature-id row is checked, an unrequired argument is not', () => {
    renderArguments(withArguments({ id: 'feature-id', required: true, hint: '' }, { id: 'topic', required: false, hint: '' }));
    expect(within(screen.getByRole('group', { name: 'Argument 1' })).getByRole('checkbox', { name: 'required' })).toHaveProperty(
      'checked',
      true,
    );
    expect(within(screen.getByRole('group', { name: 'Argument 2' })).getByRole('checkbox', { name: 'required' })).toHaveProperty(
      'checked',
      false,
    );
  });

  it('F-11 AC-024 ticking the required checkbox of a saved argument saves required true through the parser, keeping its id and hint', () => {
    const { onChange } = renderArguments(withArguments({ id: 'topic', required: false, hint: 'The topic' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'required' }));

    expect(reported(onChange).flows[0]?.arguments).toEqual([{ index: 0, id: 'topic', required: true, hint: 'The topic' }]);
  });

  it('F-11 AC-024 unticking the required checkbox of the feature-id argument saves required false, keeping its id and hint', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('checkbox', { name: 'required' }));

    expect(reported(onChange).flows[0]?.arguments).toEqual([{ index: 0, id: 'feature-id', required: false, hint: 'The feature' }]);
  });

  it('F-11 AC-024 a new argument starts unrequired: its required checkbox is not ticked', () => {
    renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));

    expect(within(screen.getByRole('group', { name: 'New argument' })).getByRole('checkbox', { name: 'required' })).toHaveProperty(
      'checked',
      false,
    );
  });

  it('F-11 AC-024 a new line whose required box is ticked before its id is accepted is saved required', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'New argument' })).getByRole('checkbox', { name: 'required' }));
    expect(screen.getByLabelText('New argument id')).toHaveProperty('value', '');
    commitText(screen.getByLabelText('New argument id'), 'topic');

    expect(reported(onChange).flows[0]?.arguments[1]).toEqual({ index: 1, id: 'topic', required: true, hint: 'topic' });
  });

  it('F-11 AC-024 the press on the required box of the new line keeps the focus in the line, so the line is not saved early', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    fireEvent.change(screen.getByLabelText('New argument id'), { target: { value: 'topic' } });
    const label = within(screen.getByRole('group', { name: 'New argument' })).getByText('required');

    expect(fireEvent.mouseDown(label)).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: 'New argument' })).toBeTruthy();
  });

  it('F-11 AC-043 the required checkbox of a pipeline argument saves through the pipeline parser', () => {
    const { onChange } = renderArguments(basePipeline(), { kind: 'pipeline' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'required' }));

    expect(reported(onChange).arguments).toEqual([{ index: 0, id: 'brief', required: true, hint: '' }]);
  });

  it('F-11 AC-024 + adds one line with a text box and a minus, and no Cancel or Save', () => {
    renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    const line = within(screen.getByRole('group', { name: 'New argument' }));
    expect(line.getByLabelText('New argument id')).toBeTruthy();
    expect(line.getByRole('button', { name: 'Cancel new argument' })).toBeTruthy();
    expect(line.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(line.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(line.queryByLabelText('New argument hint')).toBeNull();
    expect(line.queryByLabelText('New argument required')).toBeNull();
  });

  it('F-11 AC-024 a blank new line is discarded on blur and nothing is saved', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), '   ');

    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-024 a valid id on blur saves a new argument through the parser: not required, the hint is the id', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), 'topic');

    expect(reported(onChange).flows[0]?.arguments).toEqual([
      { index: 0, id: 'feature-id', required: true, hint: 'The feature' },
      { index: 1, id: 'topic', required: false, hint: 'topic' },
    ]);
    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
  });

  it('F-11 AC-024 Enter on the new line saves a valid id the same way as blur', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    const input = screen.getByLabelText('New argument id');
    fireEvent.change(input, { target: { value: 'topic' } });
    input.focus();
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(reported(onChange).flows[0]?.arguments[1]).toEqual({ index: 1, id: 'topic', required: false, hint: 'topic' });
  });

  it('F-11 AC-024 Tab from the new line\'s id to its required box keeps the line open until the box is ticked', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    const input = screen.getByLabelText('New argument id');
    const box = within(screen.getByRole('group', { name: 'New argument' })).getByRole('checkbox', { name: 'required' });
    fireEvent.change(input, { target: { value: 'topic' } });
    fireEvent.blur(input, { relatedTarget: box });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('New argument id')).toHaveProperty('value', 'topic');
    fireEvent.click(box);
    fireEvent.blur(box);
    expect(reported(onChange).flows[0]?.arguments[1]).toEqual({ index: 1, id: 'topic', required: true, hint: 'topic' });
  });

  it('F-11 AC-024 a minus on the new line discards it without saving', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    fireEvent.change(screen.getByLabelText('New argument id'), { target: { value: 'topic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel new argument' }));

    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-024 the press on the minus of the new line keeps its focus, so a typed id is not saved before the click', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    fireEvent.change(screen.getByLabelText('New argument id'), { target: { value: 'topic' } });
    const minus = screen.getByRole('button', { name: 'Cancel new argument' });

    expect(fireEvent.mouseDown(minus)).toBe(false);
    fireEvent.click(minus);
    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-024 an edit of a saved id is checked by the parser on blur and keeps required and the hint', () => {
    const { onChange } = renderArguments(basePipeline());
    commitText(screen.getByLabelText('Argument 1 id'), 'feature-two');

    expect(reported(onChange).flows[0]?.arguments).toEqual([{ index: 0, id: 'feature-two', required: true, hint: 'The feature' }]);
  });

  it('F-11 AC-024 an unchanged saved id is not sent on blur', () => {
    const { onChange } = renderArguments(basePipeline());
    commitText(screen.getByLabelText('Argument 1 id'), 'feature-id');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-024 a refused edit repeats the id of another argument: the saved id returns with no error shown', () => {
    const pipelineState = withArguments({ id: 'a', required: false, hint: '' }, { id: 'b', required: false, hint: '' });
    const { onChange } = renderArguments(pipelineState);
    commitText(screen.getByLabelText('Argument 2 id'), 'a');

    const reason = argumentRefusal(editFlowArgument(pipelineState, RULES, 'plan', 1, { id: 'a', required: false, hint: '' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(reason)).toBeNull();
    expect(screen.getByLabelText('Argument 2 id')).toHaveProperty('value', 'b');
  });

  it('F-11 AC-024 removes one row on its own and leaves the others', () => {
    const { onChange } = renderArguments(
      withArguments({ id: 'a', required: false, hint: '' }, { id: 'b', required: false, hint: '' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }));

    expect(reported(onChange).flows[0]?.arguments).toEqual([{ index: 0, id: 'b', required: false, hint: '' }]);
  });

  it('F-11 AC-024 after a removal the field of each row shows the id that row now has', () => {
    const pipelineState = withArguments({ id: 'a', required: false, hint: '' }, { id: 'b', required: false, hint: '' });
    const onChange = vi.fn();
    const view = render(<ArgumentRows pipelineState={pipelineState} rules={RULES} target={{ kind: 'flow', flowId: 'plan' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }));
    // The panel draws the pipeline it was handed back, so the list is drawn again from the reported state.
    view.rerender(<ArgumentRows pipelineState={reported(onChange)} rules={RULES} target={{ kind: 'flow', flowId: 'plan' }} onChange={onChange} />);

    expect(screen.getByLabelText('Argument 1 id')).toHaveProperty('value', 'b');
    expect(screen.queryByLabelText('Argument 2 id')).toBeNull();
  });

  it('F-11 AC-024 a refused edit does not take the focus from the field the user moved to', () => {
    renderArguments(withArguments({ id: 'a', required: false, hint: '' }, { id: 'b', required: false, hint: '' }));
    const first = screen.getByLabelText('Argument 1 id');
    const second = screen.getByLabelText('Argument 2 id');
    first.focus();
    fireEvent.change(first, { target: { value: 'bad id!' } });
    // The browser blurs the first field, then focuses the second one it pressed: the blur must not replace the second.
    fireEvent.blur(first);
    second.focus();

    expect(document.activeElement).toBe(second);
  });
});

describe('F-16 AC-026 a refused new argument line', () => {
  function refusalOfNew(text: string): string {
    return argumentRefusal(addFlowArgument(basePipeline(), RULES, 'plan', { id: text, required: false, hint: text }));
  }

  function newLine() {
    return within(screen.getByRole('group', { name: 'New argument' }));
  }

  it('F-16 AC-026 a name with capitals is saved with the id generated from it, and the typed name is kept as the hint', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), 'F-XX');

    expect(reported(onChange).flows[0]?.arguments[1]).toEqual({ index: 1, id: 'f-xx', required: false, hint: 'F-XX' });
    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
  });

  it('F-16 AC-026 a name with spaces is saved with its words joined by one hyphen', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), '  Route   type! ');

    expect(reported(onChange).flows[0]?.arguments[1]).toEqual({
      index: 1,
      id: 'route-type',
      required: false,
      hint: '  Route   type! ',
    });
  });

  it('F-16 AC-026 a name with no letter or digit stays on the line with the parser reason, and nothing is saved', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), '!!!');

    expect(onChange).not.toHaveBeenCalled();
    expect(newLine().getByLabelText('New argument id')).toHaveProperty('value', '!!!');
    expect(newLine().getByText(refusalOfNew(''))).toBeTruthy();
  });

  it('F-16 AC-026 a name whose generated id starts with a digit stays on the line with the parser reason, and nothing is saved', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), '2nd topic');

    expect(onChange).not.toHaveBeenCalled();
    expect(newLine().getByText(refusalOfNew('2nd-topic'))).toBeTruthy();
  });

  it('F-16 AC-026 a name whose generated id the parser refuses stays on the line with the parser reason, and nothing is saved', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), 'Feature ID');

    expect(onChange).not.toHaveBeenCalled();
    expect(newLine().getByText(refusalOfNew('feature-id'))).toBeTruthy();
  });

  it('F-16 AC-026 a corrected name typed into the kept line is saved when focus leaves it, and the line closes', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), 'Feature ID');
    commitText(screen.getByLabelText('New argument id'), 'Topic');

    expect(reported(onChange).flows[0]?.arguments[1]).toEqual({ index: 1, id: 'topic', required: false, hint: 'Topic' });
    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
  });

  it('F-16 AC-026 a blank new line is discarded when focus leaves it, with no message and nothing saved', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), '   ');

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
    expect(screen.queryByText(refusalOfNew(''))).toBeNull();
  });

  it('F-16 AC-026 a valid name is saved when focus leaves the new line, as before', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), 'topic');

    expect(reported(onChange).flows[0]?.arguments[1]).toEqual({ index: 1, id: 'topic', required: false, hint: 'topic' });
    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
  });
});

describe('F-11 AC-043 pipeline argument rows', () => {
  it('F-11 AC-043 shows the pipeline arguments under the title, with + and a minus on each row', () => {
    renderArguments(basePipeline(), { kind: 'pipeline' });
    expect(screen.getByText('Arguments')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add argument' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove argument 1' })).toBeTruthy();
  });

  it('F-11 AC-043 edits the pipeline arguments on blur, not the arguments of a flow', () => {
    const { onChange } = renderArguments(basePipeline(), { kind: 'pipeline' });
    commitText(screen.getByLabelText('Argument 1 id'), 'lead');

    const next = reported(onChange);
    expect(next.arguments[0]?.id).toBe('lead');
    expect(next.flows[0]?.arguments[0]?.id).toBe('feature-id');
  });

  it('F-11 AC-043 F-16 AC-026 a new pipeline argument whose id another pipeline argument already has stays on the line with the parser reason, and nothing is saved', () => {
    const pipelineState = basePipeline();
    const { onChange } = renderArguments(pipelineState, { kind: 'pipeline' });
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    commitText(screen.getByLabelText('New argument id'), 'brief');

    const reason = argumentRefusal(addPipelineArgument(pipelineState, RULES, { id: 'brief', required: false, hint: 'brief' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(within(screen.getByRole('group', { name: 'New argument' })).getByText(reason)).toBeTruthy();
  });

  it('F-11 AC-043 a pipeline argument edit that repeats another id is refused, and the saved id returns with no error shown', () => {
    const pipelineState: Pipeline = {
      ...basePipeline(),
      arguments: [
        { index: 0, id: 'brief', required: false, hint: '' },
        { index: 1, id: 'topic', required: false, hint: '' },
      ],
    };
    const { onChange } = renderArguments(pipelineState, { kind: 'pipeline' });
    commitText(screen.getByLabelText('Argument 2 id'), 'brief');

    const reason = argumentRefusal(editPipelineArgument(pipelineState, RULES, 1, { id: 'brief', required: false, hint: '' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(reason)).toBeNull();
    expect(screen.getByLabelText('Argument 2 id')).toHaveProperty('value', 'topic');
  });

  it('F-11 AC-043 removes one pipeline argument row on its own', () => {
    const pipelineState: Pipeline = {
      ...basePipeline(),
      arguments: [
        { index: 0, id: 'brief', required: false, hint: '' },
        { index: 1, id: 'topic', required: false, hint: '' },
      ],
    };
    const { onChange } = renderArguments(pipelineState, { kind: 'pipeline' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove argument 2' }));

    expect(reported(onChange).arguments).toEqual([{ index: 0, id: 'brief', required: false, hint: '' }]);
  });
});

describe('F-11 AC-026 rule tag rows', () => {
  it('F-11 AC-026 shows a dropdown that offers only the rules of the Technical details step', () => {
    renderTags(basePipeline());
    const select = screen.getByLabelText('Rule tag 1 rule') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['general', 'qa']);
    expect(select.value).toBe('general');
  });

  it('F-11 AC-026 + in the title row adds a row, and choosing a rule stores it', () => {
    const { onChange } = renderTags(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add rule tag' }));
    fireEvent.change(screen.getByLabelText('New rule tag rule'), { target: { value: 'qa' } });

    expect(reported(onChange).flows[0]?.ruleTags).toEqual([
      { index: 0, ruleId: 'general' },
      { index: 1, ruleId: 'qa' },
    ]);
  });

  it('F-11 AC-026 refuses a rule that the flow already has, and shows the parser reason beneath the new row', () => {
    const pipelineState = basePipeline();
    const { onChange } = renderTags(pipelineState);
    fireEvent.click(screen.getByRole('button', { name: 'Add rule tag' }));
    fireEvent.change(screen.getByLabelText('New rule tag rule'), { target: { value: 'general' } });

    const result = addFlowRuleTag(pipelineState, RULES, 'plan', 'general');
    if (result.ok) throw new Error('the parser accepted a repeated rule tag');
    expect(onChange).not.toHaveBeenCalled();
    expect(within(screen.getByRole('group', { name: 'New rule tag' })).getByText(result.reason)).toBeTruthy();
  });

  it('F-11 AC-026 changing a saved tag adds the new rule and then removes the old one', () => {
    const { onChange } = renderTags(basePipeline());
    fireEvent.change(screen.getByLabelText('Rule tag 1 rule'), { target: { value: 'qa' } });

    expect(reported(onChange).flows[0]?.ruleTags).toEqual([{ index: 0, ruleId: 'qa' }]);
  });

  it('F-11 AC-026 removes one tag row on its own, with its minus', () => {
    const pipelineState = pipelineOf({
      ...flow('plan', 'Plan'),
      ruleTags: [
        { index: 0, ruleId: 'general' },
        { index: 1, ruleId: 'qa' },
      ],
    });
    const { onChange } = renderTags(pipelineState);
    fireEvent.click(screen.getByRole('button', { name: 'Remove rule tag 1' }));

    expect(reported(onChange).flows[0]?.ruleTags).toEqual([{ index: 0, ruleId: 'qa' }]);
  });

  it('F-11 AC-026 a new row cancelled with its minus is not stored', () => {
    const { onChange } = renderTags(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add rule tag' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel new rule tag' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'New rule tag' })).toBeNull();
  });

  it('F-11 AC-043 the pipeline rule tags are a list of their own, not the flow tags', () => {
    const { onChange } = renderTags(basePipeline(), { kind: 'pipeline' });
    const select = screen.getByLabelText('Rule tag 1 rule') as HTMLSelectElement;
    expect(select.value).toBe('qa');
    fireEvent.click(screen.getByRole('button', { name: 'Remove rule tag 1' }));

    expect(reported(onChange).ruleTags).toEqual([]);
    expect(reported(onChange).flows[0]?.ruleTags).toEqual([{ index: 0, ruleId: 'general' }]);
  });
});

describe('F-11 AC-025 outcome artifacts', () => {
  // The group of one artifact row, and the Label field and Template box inside it (screen 03).
  function artifactGroup(position: number) {
    return within(screen.getByRole('group', { name: `Artifact ${position}` }));
  }

  function labelField(position: number): HTMLInputElement {
    return artifactGroup(position).getByLabelText('Label') as HTMLInputElement;
  }

  function templateField(position: number): HTMLTextAreaElement {
    return artifactGroup(position).getByLabelText('Template') as HTMLTextAreaElement;
  }

  // The new group, open after + (screen 03 draws no new group; it is closed until + is pressed).
  function addGroup() {
    return within(screen.getByRole('group', { name: 'New artifact' }));
  }

  it('F-11 AC-025 shows each artifact as a Label field with its label and a minus, then the Template box with its help text beneath', () => {
    renderArtifacts(basePipeline());
    expect(screen.queryByRole('group', { name: 'New artifact' })).toBeNull();
    expect(labelField(1).value).toBe('plan.md');
    expect(templateField(1).value).toBe('Task list, in order\nSecond line');
    expect(artifactGroup(1).getByRole('button', { name: 'Remove artifact 1' })).toBeTruthy();
    expect(artifactGroup(1).getByText(TEMPLATE_HELP_TEXT)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
  });

  it('F-11 AC-025 + opens an inline group with a Label field, a Template box and its help text, and no Save or Cancel', () => {
    renderArtifacts(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    expect(addGroup().getByLabelText('Label')).toHaveProperty('value', '');
    expect(addGroup().getByLabelText('Template')).toHaveProperty('value', '');
    expect(addGroup().getByText(TEMPLATE_HELP_TEXT)).toBeTruthy();
    expect(addGroup().getByRole('button', { name: 'Discard new artifact' })).toBeTruthy();
    expect(addGroup().queryByRole('button', { name: 'Save' })).toBeNull();
    expect(addGroup().queryByRole('button', { name: 'Cancel' })).toBeNull();
  });

  it('F-11 AC-025 the new group is saved through the parser when focus leaves it, and the list is closed again', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    fireEvent.change(addGroup().getByLabelText('Label'), { target: { value: 'notes.md' } });
    fireEvent.change(addGroup().getByLabelText('Template'), { target: { value: 'Line one\nLine two' } });
    fireEvent.blur(addGroup().getByLabelText('Template'));

    expect(reported(onChange).flows[0]?.artifacts).toEqual([
      { label: 'plan.md', template: 'Task list, in order\nSecond line' },
      { label: 'notes.md', template: 'Line one\nLine two' },
    ]);
    expect(screen.queryByRole('group', { name: 'New artifact' })).toBeNull();
  });

  it('F-11 AC-025 Tab from the new label into its template keeps the group open and saves nothing', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    const template = addGroup().getByLabelText('Template');
    fireEvent.change(addGroup().getByLabelText('Label'), { target: { value: 'notes.md' } });
    fireEvent.blur(addGroup().getByLabelText('Label'), { relatedTarget: template });

    expect(onChange).not.toHaveBeenCalled();
    expect(addGroup().getByLabelText('Label')).toHaveProperty('value', 'notes.md');
  });

  it('F-11 AC-025 Enter in the new label saves the group with the label typed', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    const label = addGroup().getByLabelText('Label');
    label.focus();
    fireEvent.change(label, { target: { value: 'notes.md' } });
    fireEvent.keyDown(label, { key: 'Enter' });

    expect(reported(onChange).flows[0]?.artifacts[1]).toEqual({ label: 'notes.md', template: '' });
    expect(screen.queryByRole('group', { name: 'New artifact' })).toBeNull();
  });

  it('F-11 AC-025 a blank new label is discarded on blur and nothing is saved', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    fireEvent.change(addGroup().getByLabelText('Label'), { target: { value: '   ' } });
    fireEvent.change(addGroup().getByLabelText('Template'), { target: { value: 'kept text' } });
    fireEvent.blur(addGroup().getByLabelText('Template'));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'New artifact' })).toBeNull();
  });

  it('F-11 AC-025 a new label the parser refuses is discarded with no error shown, since it reverts to the saved list', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    fireEvent.change(addGroup().getByLabelText('Label'), { target: { value: 'plan.md' } });
    fireEvent.change(addGroup().getByLabelText('Template'), { target: { value: 'kept text' } });
    fireEvent.blur(addGroup().getByLabelText('Template'));

    const result = addFlowArtifact(basePipeline(), RULES, 'plan', { label: 'plan.md', template: 'kept text' });
    if (result.ok) throw new Error('the parser accepted a repeated label');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'New artifact' })).toBeNull();
    expect(screen.queryByText(result.reason)).toBeNull();
  });

  it('F-11 AC-025 a new template of 5001 characters is refused on save and the reason shows beneath its box', () => {
    const { onChange } = renderArtifacts(basePipeline());
    const longTemplate = 'x'.repeat(5001);
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    fireEvent.change(addGroup().getByLabelText('Label'), { target: { value: 'notes.md' } });
    fireEvent.change(addGroup().getByLabelText('Template'), { target: { value: longTemplate } });
    fireEvent.blur(addGroup().getByLabelText('Template'));

    const result = addFlowArtifact(basePipeline(), RULES, 'plan', { label: 'notes.md', template: longTemplate });
    if (result.ok) throw new Error('the parser accepted a template of 5001 characters');
    expect(onChange).not.toHaveBeenCalled();
    expect(addGroup().getByText(result.reason)).toBeTruthy();
    expect(addGroup().getByLabelText('Label')).toHaveProperty('value', 'notes.md');
  });

  it('F-11 AC-025 accepts a template of exactly 5000 characters on save', () => {
    const { onChange } = renderArtifacts(basePipeline());
    const template = 'x'.repeat(5000);
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    fireEvent.change(addGroup().getByLabelText('Label'), { target: { value: 'notes.md' } });
    fireEvent.change(addGroup().getByLabelText('Template'), { target: { value: template } });
    fireEvent.blur(addGroup().getByLabelText('Template'));

    expect(reported(onChange).flows[0]?.artifacts[1]?.template).toBe(template);
  });

  it('F-11 AC-025 the discard minus removes the new group without saving, and its press keeps the focus in the group', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    fireEvent.change(addGroup().getByLabelText('Label'), { target: { value: 'notes.md' } });
    const minus = addGroup().getByRole('button', { name: 'Discard new artifact' });
    expect(fireEvent.mouseDown(minus)).toBe(false);
    fireEvent.click(minus);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'New artifact' })).toBeNull();
  });

  it('F-11 AC-025 a changed label is sent to the parser when the field loses focus', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.change(labelField(1), { target: { value: 'design.md' } });
    fireEvent.blur(labelField(1));

    expect(reported(onChange).flows[0]?.artifacts[0]).toEqual({ label: 'design.md', template: 'Task list, in order\nSecond line' });
  });

  it('F-11 AC-025 Enter in the label field sends a changed label to the parser', () => {
    const { onChange } = renderArtifacts(basePipeline());
    labelField(1).focus();
    fireEvent.change(labelField(1), { target: { value: 'design.md' } });
    fireEvent.keyDown(labelField(1), { key: 'Enter' });

    expect(reported(onChange).flows[0]?.artifacts[0]?.label).toBe('design.md');
  });

  it('F-11 AC-025 Enter that ends an IME composition in the label field does not send the label to the parser', () => {
    const { onChange } = renderArtifacts(basePipeline());
    labelField(1).focus();
    fireEvent.change(labelField(1), { target: { value: 'design.md' } });
    fireEvent.keyDown(labelField(1), { key: 'Enter', isComposing: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(labelField(1).value).toBe('design.md');
  });

  it('F-11 AC-025 a changed template is sent to the parser when its box loses focus', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.change(templateField(1), { target: { value: 'New first line\nSecond' } });
    fireEvent.blur(templateField(1));

    expect(reported(onChange).flows[0]?.artifacts[0]).toEqual({ label: 'plan.md', template: 'New first line\nSecond' });
  });

  it('F-11 AC-025 a field that is left unchanged is not sent to the parser', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.blur(labelField(1));
    fireEvent.blur(templateField(1));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('F-11 AC-025 a blank label keeps the field empty under the parser reason, and marks the field as refused', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.change(labelField(1), { target: { value: '' } });
    fireEvent.blur(labelField(1));

    const result = editFlowArtifact(basePipeline(), RULES, 'plan', 0, { field: 'label', value: '' });
    if (result.ok) throw new Error('the parser accepted a blank label');
    expect(onChange).not.toHaveBeenCalled();
    expect(artifactGroup(1).getByText(result.reason)).toBeTruthy();
    expect(labelField(1).value).toBe('');
    expect(labelField(1).getAttribute('aria-invalid')).toBe('true');
    expect(templateField(1).value).toBe('Task list, in order\nSecond line');
  });

  it('F-11 AC-025 a refused template keeps the saved template, shows the reason beneath its box, and keeps the label', () => {
    const { onChange } = renderArtifacts(basePipeline());
    const longTemplate = 'x'.repeat(5001);
    fireEvent.change(templateField(1), { target: { value: longTemplate } });
    fireEvent.blur(templateField(1));

    const result = editFlowArtifact(basePipeline(), RULES, 'plan', 0, { field: 'template', value: longTemplate });
    if (result.ok) throw new Error('the parser accepted a template of 5001 characters');
    expect(onChange).not.toHaveBeenCalled();
    expect(artifactGroup(1).getByText(result.reason)).toBeTruthy();
    expect(templateField(1).value).toBe('Task list, in order\nSecond line');
    expect(labelField(1).value).toBe('plan.md');
  });

  it('F-11 AC-025 a refusal clears when the field is later accepted', () => {
    const { onChange } = renderArtifacts(basePipeline());
    const refusal = editFlowArtifact(basePipeline(), RULES, 'plan', 0, { field: 'label', value: '' });
    if (refusal.ok) throw new Error('the parser accepted a blank label');
    fireEvent.change(labelField(1), { target: { value: '' } });
    fireEvent.blur(labelField(1));
    expect(artifactGroup(1).getByText(refusal.reason)).toBeTruthy();

    fireEvent.change(labelField(1), { target: { value: 'design.md' } });
    fireEvent.blur(labelField(1));

    expect(reported(onChange).flows[0]?.artifacts[0]?.label).toBe('design.md');
    expect(artifactGroup(1).queryByText(refusal.reason)).toBeNull();
  });

  it('F-11 AC-025 removing the first of two artifacts shows the second artifact\'s own label', () => {
    const pipelineState = pipelineOf({
      ...flow('plan', 'Plan'),
      artifacts: [
        { label: 'plan.md', template: 'Plan headings' },
        { label: 'notes.md', template: 'Notes headings' },
      ],
    });
    const onChange = vi.fn();
    const view = render(<ArtifactRows pipelineState={pipelineState} rules={RULES} flowId="plan" onChange={onChange} />);
    fireEvent.click(artifactGroup(1).getByRole('button', { name: 'Remove artifact 1' }));
    // The panel draws the pipeline it was handed back, so the list is drawn again from the reported state.
    view.rerender(<ArtifactRows pipelineState={reported(onChange)} rules={RULES} flowId="plan" onChange={onChange} />);

    expect(labelField(1).value).toBe('notes.md');
    expect(templateField(1).value).toBe('Notes headings');
    expect(screen.queryByDisplayValue('plan.md')).toBeNull();
  });

  it('F-11 AC-025 a refused label edit keeps the focus on the refused row\'s template and does not redraw the other rows', () => {
    const pipelineState = pipelineOf({
      ...flow('plan', 'Plan'),
      artifacts: [
        { label: 'plan.md', template: 'Plan headings' },
        { label: 'notes.md', template: 'Notes headings' },
        { label: 'design.md', template: 'Design headings' },
      ],
    });
    renderArtifacts(pipelineState);
    const firstLabel = labelField(1);
    const firstTemplate = templateField(1);
    const otherLabel = labelField(3);
    const otherTemplate = templateField(3);
    const refusal = editFlowArtifact(pipelineState, RULES, 'plan', 1, { field: 'label', value: '' });
    if (refusal.ok) throw new Error('the parser accepted a blank label');

    // The user types a blank label of row 2 and presses Tab into the template of row 2: the label is checked on the blur.
    const refusedTemplate = templateField(2);
    labelField(2).focus();
    fireEvent.change(labelField(2), { target: { value: '' } });
    fireEvent.blur(labelField(2));
    refusedTemplate.focus();

    expect(artifactGroup(2).getByText(refusal.reason)).toBeTruthy();
    expect(labelField(2).value).toBe('');
    expect(document.activeElement).toBe(refusedTemplate);
    expect(labelField(1)).toBe(firstLabel);
    expect(templateField(1)).toBe(firstTemplate);
    expect(labelField(3)).toBe(otherLabel);
    expect(templateField(3)).toBe(otherTemplate);
    expect(otherLabel.value).toBe('design.md');
  });

  it('F-11 AC-025 the minus removes the artifact on its own row', () => {
    const pipelineState = pipelineOf({
      ...flow('plan', 'Plan'),
      artifacts: [
        { label: 'plan.md', template: '' },
        { label: 'notes.md', template: '' },
      ],
    });
    const { onChange } = renderArtifacts(pipelineState);
    fireEvent.click(artifactGroup(1).getByRole('button', { name: 'Remove artifact 1' }));

    expect(reported(onChange).flows[0]?.artifacts).toEqual([{ label: 'notes.md', template: '' }]);
  });

  it('F-11 AC-025 a removal the parser refuses keeps the artifact and shows the reason beneath its row', () => {
    const pipelineState = pipelineOf({
      ...flow('plan', 'Plan'),
      blocks: [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' }],
    });
    const { onChange } = renderArtifacts(pipelineState);
    fireEvent.click(artifactGroup(1).getByRole('button', { name: 'Remove artifact 1' }));

    const result = removeFlowArtifact(pipelineState, RULES, 'plan', 0);
    if (result.ok) throw new Error('the parser accepted the removal of an artifact an End block names');
    expect(onChange).not.toHaveBeenCalled();
    expect(artifactGroup(1).getByText(result.reason)).toBeTruthy();
    expect(labelField(1).value).toBe('plan.md');
  });

  it('F-11 AC-025 removing an artifact an End names saves the removal and moves the End to the first remaining artifact', () => {
    const pipelineState = pipelineOf({
      ...flow('plan', 'Plan'),
      artifacts: [
        { label: 'plan.md', template: '' },
        { label: 'notes.md', template: '' },
      ],
      blocks: [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'notes.md' }],
    });
    const { onChange } = renderArtifacts(pipelineState);
    fireEvent.click(artifactGroup(2).getByRole('button', { name: 'Remove artifact 2' }));

    expect(reported(onChange).flows[0]?.artifacts).toEqual([{ label: 'plan.md', template: '' }]);
    expect(reported(onChange).flows[0]?.blocks).toEqual([
      { index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
    ]);
  });
});

describe('F-11 AC-024 AC-026 the flow panel shows the list editors in its slots', () => {
  it('F-11 AC-024 AC-025 AC-026 the flow panel holds the arguments, outcome artifacts and rule tags, in order', () => {
    const pipelineState = basePipeline();
    render(
      <FlowPanel
        pipelineState={pipelineState}
        rules={RULES}
        flow={pipelineState.flows[0] as Flow}
        onChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const text = document.body.textContent ?? '';
    const order = ['Arguments', 'Outcome artifacts', 'Rule tags', 'Human approval'].map((label) => text.indexOf(label));
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(screen.getByRole('group', { name: 'Argument 1' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Artifact 1' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Rule tag 1' })).toBeTruthy();
  });
});

describe('F-11 AC-019 the body counter sits under its box, in the body group', () => {
  it('F-11 AC-019 the flow panel draws the counter as the last line of the body group, under the box', () => {
    const pipelineState = basePipeline();
    render(
      <FlowPanel
        pipelineState={pipelineState}
        rules={RULES}
        flow={pipelineState.flows[0] as Flow}
        onChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const body = document.getElementById('flow-body');
    const counter = document.getElementById('flow-body-counter');
    expect(counter?.parentElement?.contains(body)).toBe(true);
    expect(counter?.previousElementSibling?.contains(body)).toBe(true);
    expect(counter?.nextElementSibling).toBeNull();
  });

  it('F-11 AC-019 the pipeline panel draws the counter the same way, under the body box', () => {
    render(<PipelinePanel pipelineState={basePipeline()} rules={RULES} onChange={vi.fn()} />);
    const body = document.getElementById('pipeline-body');
    const counter = document.getElementById('pipeline-body-counter');
    expect(counter?.parentElement?.contains(body)).toBe(true);
    expect(counter?.previousElementSibling?.contains(body)).toBe(true);
    expect(counter?.nextElementSibling).toBeNull();
  });
});

describe('F-11 (no criterion: Verify device fix 2026-11-24) required argument ids and artifact labels', () => {
  function artifactGroup(position: number) {
    return within(screen.getByRole('group', { name: `Artifact ${position}` }));
  }

  function labelField(position: number): HTMLInputElement {
    return artifactGroup(position).getByLabelText('Label') as HTMLInputElement;
  }

  function addGroup() {
    return within(screen.getByRole('group', { name: 'New artifact' }));
  }

  it('F-11 (no criterion: Verify device fix 2026-11-24) shows the empty-id error on the key press that empties a saved argument id, and hides it once text is typed', () => {
    const pipelineState = withArguments({ id: 'brief', required: false, hint: '' }, { id: 'topic', required: false, hint: '' });
    renderArguments(pipelineState);
    const input = screen.getByLabelText('Argument 1 id');
    const reason = argumentRefusal(editFlowArgument(pipelineState, RULES, 'plan', 0, { id: '', required: false, hint: '' }));
    expect(screen.queryByText(reason)).toBeNull();

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyUp(input, { key: ' ' });
    expect(within(screen.getByRole('group', { name: 'Argument 1' })).getByText(reason)).toBeTruthy();
    expect(input).toHaveProperty('value', '   ');

    fireEvent.change(input, { target: { value: 'b' } });
    fireEvent.keyUp(input, { key: 'b' });
    expect(screen.queryByText(reason)).toBeNull();
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) shows the empty-id error on the key press in a new argument line, and hides it once text is typed', () => {
    renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    const input = screen.getByLabelText('New argument id');
    const reason = argumentRefusal(addFlowArgument(basePipeline(), RULES, 'plan', { id: '', required: false, hint: '' }));

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });
    expect(within(screen.getByRole('group', { name: 'New argument' })).getByText(reason)).toBeTruthy();

    fireEvent.change(input, { target: { value: 'topic' } });
    fireEvent.keyUp(input, { key: 't' });
    expect(screen.queryByText(reason)).toBeNull();
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) shows the empty-label error on the key press that empties a saved label, and hides it once text is typed', () => {
    renderArtifacts(basePipeline());
    const result = editFlowArtifact(basePipeline(), RULES, 'plan', 0, { field: 'label', value: '' });
    if (result.ok) throw new Error('the parser accepted a blank label');

    fireEvent.change(labelField(1), { target: { value: '' } });
    fireEvent.keyUp(labelField(1), { key: 'Backspace' });
    expect(artifactGroup(1).getByText(result.reason)).toBeTruthy();

    fireEvent.change(labelField(1), { target: { value: 'x' } });
    fireEvent.keyUp(labelField(1), { key: 'x' });
    expect(screen.queryByText(result.reason)).toBeNull();
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) shows the empty-label error on the key press in a new artifact group, and hides it once text is typed', () => {
    renderArtifacts(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    const result = addFlowArtifact(basePipeline(), RULES, 'plan', { label: '', template: '' });
    if (result.ok) throw new Error('the parser accepted a blank label');

    fireEvent.change(addGroup().getByLabelText('Label'), { target: { value: '  ' } });
    fireEvent.keyUp(addGroup().getByLabelText('Label'), { key: ' ' });
    expect(addGroup().getByText(result.reason)).toBeTruthy();

    fireEvent.change(addGroup().getByLabelText('Label'), { target: { value: 'notes.md' } });
    fireEvent.keyUp(addGroup().getByLabelText('Label'), { key: 'n' });
    expect(screen.queryByText(result.reason)).toBeNull();
  });

  function templateField(position: number): HTMLTextAreaElement {
    return artifactGroup(position).getByLabelText('Template') as HTMLTextAreaElement;
  }

  // Leaves argument 1's id empty and blurred, so its error shows and its text stays blank.
  function blankArgumentOne(pipelineState: Pipeline) {
    const reason = argumentRefusal(editFlowArgument(pipelineState, RULES, 'plan', 0, { id: '', required: false, hint: '' }));
    const input = screen.getByLabelText('Argument 1 id');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });
    fireEvent.blur(input);
    expect(screen.getByText(reason)).toBeTruthy();
    return reason;
  }

  it('F-11 (no criterion: Verify device fix 2026-11-24) a blank id is drawn again from the saved id when its row\'s required box is saved', () => {
    const pipelineState = withArguments({ id: 'alpha', required: false, hint: '' }, { id: 'beta', required: false, hint: '' });
    const { onChange } = renderArguments(pipelineState);
    const reason = blankArgumentOne(pipelineState);

    fireEvent.click(within(screen.getByRole('group', { name: 'Argument 1' })).getByRole('checkbox', { name: 'required' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Argument 1 id')).toHaveProperty('value', 'alpha');
    expect(screen.queryByText(reason)).toBeNull();
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) a blank id keeps its text and its error when another row is saved', () => {
    const pipelineState = withArguments({ id: 'alpha', required: false, hint: '' }, { id: 'beta', required: false, hint: '' });
    const { onChange } = renderArguments(pipelineState);
    const reason = blankArgumentOne(pipelineState);

    fireEvent.click(within(screen.getByRole('group', { name: 'Argument 2' })).getByRole('checkbox', { name: 'required' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Argument 1 id')).toHaveProperty('value', '');
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) a blank id above a removed row keeps its text and its error', () => {
    const pipelineState = withArguments({ id: 'alpha', required: false, hint: '' }, { id: 'beta', required: false, hint: '' });
    renderArguments(pipelineState);
    const reason = blankArgumentOne(pipelineState);

    fireEvent.click(screen.getByRole('button', { name: 'Remove argument 2' }));

    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Argument 1 id')).toHaveProperty('value', '');
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) a blank saved label is drawn again from the saved label when its row\'s template is saved', () => {
    const { onChange } = renderArtifacts(basePipeline());
    const result = editFlowArtifact(basePipeline(), RULES, 'plan', 0, { field: 'label', value: '' });
    if (result.ok) throw new Error('the parser accepted a blank label');
    fireEvent.change(labelField(1), { target: { value: '' } });
    fireEvent.keyUp(labelField(1), { key: 'Backspace' });
    fireEvent.blur(labelField(1));
    expect(artifactGroup(1).getByText(result.reason)).toBeTruthy();

    fireEvent.change(templateField(1), { target: { value: 'Edited template' } });
    fireEvent.blur(templateField(1));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(labelField(1).value).toBe('plan.md');
    expect(screen.queryByText(result.reason)).toBeNull();
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) a blank saved label keeps its error when another artifact is removed or a new one is opened', () => {
    const pipelineState = pipelineOf({
      ...flow('plan', 'Plan'),
      artifacts: [
        { label: 'plan.md', template: '' },
        { label: 'notes.md', template: '' },
      ],
    });
    renderArtifacts(pipelineState);
    const result = editFlowArtifact(pipelineState, RULES, 'plan', 0, { field: 'label', value: '' });
    if (result.ok) throw new Error('the parser accepted a blank label');
    fireEvent.change(labelField(1), { target: { value: '' } });
    fireEvent.keyUp(labelField(1), { key: 'Backspace' });
    fireEvent.blur(labelField(1));

    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    expect(artifactGroup(1).getByText(result.reason)).toBeTruthy();

    fireEvent.click(artifactGroup(2).getByRole('button', { name: 'Remove artifact 2' }));
    expect(artifactGroup(1).getByText(result.reason)).toBeTruthy();
    expect(labelField(1).value).toBe('');
  });
});

describe('F-11 (no criterion: Verify device fix 2026-11-24) error inside its field box', () => {
  it('F-11 (no criterion: Verify device fix 2026-11-24) draws a refused argument id inside its argument row, 4 px under the line', () => {
    const pipelineState = withArguments({ id: 'brief', required: false, hint: '' }, { id: 'topic', required: false, hint: '' });
    renderArguments(pipelineState);
    const input = screen.getByLabelText('Argument 1 id');
    const reason = argumentRefusal(editFlowArgument(pipelineState, RULES, 'plan', 0, { id: '', required: false, hint: '' }));

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyUp(input, { key: 'Backspace' });

    const row = screen.getByRole('group', { name: 'Argument 1' });
    expect(within(row).getByText(reason).parentElement).toBe(row);
    expect(row.contains(input)).toBe(true);
    expect(getComputedStyle(row).getPropertyValue('gap')).toBe('4px');
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) draws a refused artifact label inside its row, 4 px under the label', () => {
    renderArtifacts(basePipeline());
    const group = screen.getByRole('group', { name: 'Artifact 1' });
    const label = within(group).getByLabelText('Label') as HTMLInputElement;
    const reason = editFlowArtifact(basePipeline(), RULES, 'plan', 0, { field: 'label', value: '' });
    if (reason.ok) throw new Error('the parser accepted a blank label');

    fireEvent.change(label, { target: { value: '' } });
    fireEvent.keyUp(label, { key: 'Backspace' });

    const row = within(group).getByText(reason.reason).parentElement as HTMLElement;
    expect(row.contains(label)).toBe(true);
    expect(getComputedStyle(row).getPropertyValue('gap')).toBe('4px');
  });

  it('F-11 (no criterion: Verify device fix 2026-11-24) draws a refused template inside its control box, 4 px under the box, with the help text after it', () => {
    renderArtifacts(basePipeline());
    const group = within(screen.getByRole('group', { name: 'Artifact 1' }));
    const template = group.getByLabelText('Template') as HTMLTextAreaElement;
    const longTemplate = 'x'.repeat(5001);
    const result = editFlowArtifact(basePipeline(), RULES, 'plan', 0, { field: 'template', value: longTemplate });
    if (result.ok) throw new Error('the parser accepted a template of 5001 characters');

    fireEvent.change(template, { target: { value: longTemplate } });
    fireEvent.blur(template);

    // The reason's parent is the control box: it holds the template field, and the help text follows the box.
    const control = group.getByText(result.reason).parentElement as HTMLElement;
    // The field is drawn again after the refusal, so the template is queried again rather than the element kept above.
    expect(control.contains(group.getByLabelText('Template'))).toBe(true);
    expect(control.nextElementSibling?.textContent).toBe(TEMPLATE_HELP_TEXT);
    expect(getComputedStyle(control).getPropertyValue('gap')).toBe('4px');
  });
});
