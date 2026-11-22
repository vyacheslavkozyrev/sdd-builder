// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { pipeline as core } from '@sddbuilder/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArgumentRows, ArtifactRows, RuleTagRows, TEMPLATE_HELP_TEXT } from '../src/builder/RowEditors.js';
import type { ListTarget } from '../src/builder/RowEditors.js';
import { FlowPanel } from '../src/builder/FlowPanel.js';
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

// Presses Save in the argument form of `group` (its group name, as the form draws it).
function saveForm(group: string) {
  fireEvent.click(within(screen.getByRole('group', { name: group })).getByRole('button', { name: 'Save' }));
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
  it('F-11 AC-024 shows each saved argument as a field with its id and "· required", and a minus; the form is closed', () => {
    renderArguments(basePipeline());
    const row = within(screen.getByRole('group', { name: 'Argument 1' }));
    expect(row.getByRole('button', { name: 'feature-id · required' })).toBeTruthy();
    expect(row.getByRole('button', { name: 'Remove argument 1' })).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'New argument' })).toBeNull();
    expect(screen.queryByLabelText('Argument 1 id')).toBeNull();
  });

  it('F-11 AC-024 shows no "· required" text for an argument that is not required', () => {
    renderArguments(withArguments({ id: 'topic', required: false, hint: '' }));
    expect(screen.getByRole('button', { name: 'topic' })).toBeTruthy();
    expect(screen.queryByText(/required/)).toBeNull();
  });

  it('F-11 AC-024 + in the title row opens a new row, and Save appends it when the parser accepts it', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    const draft = within(screen.getByRole('group', { name: 'New argument' }));
    fireEvent.change(draft.getByLabelText('New argument id'), { target: { value: 'topic' } });
    fireEvent.change(draft.getByLabelText('New argument hint'), { target: { value: 'What to plan' } });
    fireEvent.click(draft.getByRole('button', { name: 'Save' }));

    expect(reported(onChange).flows[0]?.arguments).toEqual([
      { index: 0, id: 'feature-id', required: true, hint: 'The feature' },
      { index: 1, id: 'topic', required: false, hint: 'What to plan' },
    ]);
  });

  it('F-11 AC-024 refuses a new argument whose id is not file-safe, keeps the typed values and shows the parser reason beneath the form', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    const draft = within(screen.getByRole('group', { name: 'New argument' }));
    fireEvent.change(draft.getByLabelText('New argument id'), { target: { value: 'bad id!' } });
    fireEvent.click(draft.getByRole('button', { name: 'Save' }));

    const reason = argumentRefusal(addFlowArgument(basePipeline(), RULES, 'plan', { id: 'bad id!', required: false, hint: '' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(draft.getByText(reason)).toBeTruthy();
    expect(draft.getByLabelText('New argument id')).toHaveProperty('value', 'bad id!');
  });

  it('F-11 AC-024 refuses an edit that repeats the id of another argument, keeps the form open and shows the reason beneath it', () => {
    const pipelineState = withArguments(
      { id: 'a', required: false, hint: '' },
      { id: 'b', required: false, hint: '' },
    );
    const { onChange } = renderArguments(pipelineState);
    fireEvent.click(screen.getByRole('button', { name: 'b' }));
    fireEvent.change(screen.getByLabelText('Argument 2 id'), { target: { value: 'a' } });
    saveForm('Argument 2');

    const reason = argumentRefusal(editFlowArgument(pipelineState, RULES, 'plan', 1, { id: 'a', required: false, hint: '' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(within(screen.getByRole('group', { name: 'Argument 2' })).getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Argument 2 id')).toHaveProperty('value', 'a');
  });

  it('F-11 AC-024 edits a saved row through the parser and reports the new pipeline', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'feature-id · required' }));
    fireEvent.click(screen.getByLabelText('required'));
    saveForm('Argument 1');

    expect(reported(onChange).flows[0]?.arguments).toEqual([{ index: 0, id: 'feature-id', required: false, hint: 'The feature' }]);
  });

  it('F-11 AC-024 refuses a hint longer than 100 characters, keeps the form open and shows the reason beneath it', () => {
    const pipelineState = basePipeline();
    const { onChange } = renderArguments(pipelineState);
    const longHint = 'x'.repeat(101);
    fireEvent.click(screen.getByRole('button', { name: 'feature-id · required' }));
    fireEvent.change(screen.getByLabelText('Argument 1 hint'), { target: { value: longHint } });
    saveForm('Argument 1');

    const reason = argumentRefusal(
      editFlowArgument(pipelineState, RULES, 'plan', 0, { id: 'feature-id', required: true, hint: longHint }),
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(within(screen.getByRole('group', { name: 'Argument 1' })).getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Argument 1 hint')).toHaveProperty('value', longHint);
  });

  it('F-11 AC-024 accepts a hint of exactly 100 characters on edit', () => {
    const { onChange } = renderArguments(basePipeline());
    const hint = 'x'.repeat(100);
    fireEvent.click(screen.getByRole('button', { name: 'feature-id · required' }));
    fireEvent.change(screen.getByLabelText('Argument 1 hint'), { target: { value: hint } });
    saveForm('Argument 1');

    expect(reported(onChange).flows[0]?.arguments[0]?.hint).toBe(hint);
  });

  it('F-11 AC-024 Cancel closes the edit form and keeps the saved row', () => {
    const { onChange } = renderArguments(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'feature-id · required' }));
    fireEvent.change(screen.getByLabelText('Argument 1 id'), { target: { value: 'other' } });
    fireEvent.click(within(screen.getByRole('group', { name: 'Argument 1' })).getByRole('button', { name: 'Cancel' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Argument 1 id')).toBeNull();
    expect(screen.getByRole('button', { name: 'feature-id · required' })).toBeTruthy();
  });

  it('F-11 AC-024 removes one row on its own and leaves the others', () => {
    const { onChange } = renderArguments(
      withArguments({ id: 'a', required: false, hint: '' }, { id: 'b', required: false, hint: '' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove argument 1' }));

    expect(reported(onChange).flows[0]?.arguments).toEqual([{ index: 0, id: 'b', required: false, hint: '' }]);
  });
});

describe('F-11 AC-043 pipeline argument rows', () => {
  it('F-11 AC-043 shows the pipeline arguments under the title, with + and a minus on each row', () => {
    renderArguments(basePipeline(), { kind: 'pipeline' });
    expect(screen.getByText('Arguments')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add argument' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove argument 1' })).toBeTruthy();
  });

  it('F-11 AC-043 edits the pipeline arguments, not the arguments of a flow', () => {
    const { onChange } = renderArguments(basePipeline(), { kind: 'pipeline' });
    fireEvent.click(screen.getByRole('button', { name: 'brief' }));
    fireEvent.click(screen.getByLabelText('required'));
    saveForm('Argument 1');

    const next = reported(onChange);
    expect(next.arguments[0]?.required).toBe(true);
    expect(next.flows[0]?.arguments[0]?.required).toBe(true);
  });

  it('F-11 AC-043 refuses a new pipeline argument whose id another pipeline argument already has', () => {
    const pipelineState = basePipeline();
    const { onChange } = renderArguments(pipelineState, { kind: 'pipeline' });
    fireEvent.click(screen.getByRole('button', { name: 'Add argument' }));
    const draft = within(screen.getByRole('group', { name: 'New argument' }));
    fireEvent.change(draft.getByLabelText('New argument id'), { target: { value: 'brief' } });
    fireEvent.click(draft.getByRole('button', { name: 'Save' }));

    const reason = argumentRefusal(addPipelineArgument(pipelineState, RULES, { id: 'brief', required: false, hint: '' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(draft.getByText(reason)).toBeTruthy();
  });

  it('F-11 AC-043 refuses a pipeline argument edit that repeats another id, keeps the form open and shows the reason beneath it', () => {
    const pipelineState: Pipeline = {
      ...basePipeline(),
      arguments: [
        { index: 0, id: 'brief', required: false, hint: '' },
        { index: 1, id: 'topic', required: false, hint: '' },
      ],
    };
    const { onChange } = renderArguments(pipelineState, { kind: 'pipeline' });
    fireEvent.click(screen.getByRole('button', { name: 'topic' }));
    fireEvent.change(screen.getByLabelText('Argument 2 id'), { target: { value: 'brief' } });
    saveForm('Argument 2');

    const reason = argumentRefusal(
      editPipelineArgument(pipelineState, RULES, 1, { id: 'brief', required: false, hint: '' }),
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(within(screen.getByRole('group', { name: 'Argument 2' })).getByText(reason)).toBeTruthy();
    expect(screen.getByLabelText('Argument 2 id')).toHaveProperty('value', 'brief');
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
  it('F-11 AC-025 shows each artifact as a bold label, the first line of its template in grey, and Edit and Remove', () => {
    renderArtifacts(basePipeline());
    const row = within(screen.getByRole('group', { name: 'Artifact 1' }));
    expect(row.getByText('plan.md')).toBeTruthy();
    expect(row.getByText('Task list, in order')).toBeTruthy();
    expect(row.queryByText('Second line')).toBeNull();
    expect(row.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(row.getByRole('button', { name: 'Remove' })).toBeTruthy();
  });

  it('F-11 AC-025 + opens an empty form with Label and Template, and Save appends the artifact', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    expect(screen.getByLabelText('Label')).toHaveProperty('value', '');
    expect(screen.getByLabelText('Template')).toHaveProperty('value', '');
    expect(screen.getByText(TEMPLATE_HELP_TEXT)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'notes.md' } });
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'Line one\nLine two' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(reported(onChange).flows[0]?.artifacts).toEqual([
      { label: 'plan.md', template: 'Task list, in order\nSecond line' },
      { label: 'notes.md', template: 'Line one\nLine two' },
    ]);
  });

  it('F-11 AC-025 refuses a blank label on add, keeps the typed values and shows the reason beneath the label field', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'kept text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const result = addFlowArtifact(basePipeline(), RULES, 'plan', { label: '   ', template: 'kept text' });
    if (result.ok) throw new Error('the parser accepted a blank label');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(result.reason)).toBeTruthy();
    expect(screen.getByLabelText('Template')).toHaveProperty('value', 'kept text');
  });

  it('F-11 AC-025 refuses a template of 5001 characters on add and shows the reason beneath the template field', () => {
    const { onChange } = renderArtifacts(basePipeline());
    const longTemplate = 'x'.repeat(5001);
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'notes.md' } });
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: longTemplate } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const result = addFlowArtifact(basePipeline(), RULES, 'plan', { label: 'notes.md', template: longTemplate });
    if (result.ok) throw new Error('the parser accepted a template of 5001 characters');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(result.reason)).toBeTruthy();
  });

  it('F-11 AC-025 accepts a template of exactly 5000 characters on add', () => {
    const { onChange } = renderArtifacts(basePipeline());
    const template = 'x'.repeat(5000);
    fireEvent.click(screen.getByRole('button', { name: 'Add artifact' }));
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'notes.md' } });
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: template } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(reported(onChange).flows[0]?.artifacts[1]?.template).toBe(template);
  });

  it('F-11 AC-025 on Edit, a refused label keeps the saved label and the accepted template is still saved', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(within(screen.getByRole('group', { name: 'Artifact 1' })).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'New first line' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const result = editFlowArtifact(basePipeline(), RULES, 'plan', 0, { field: 'label', value: '' });
    if (result.ok) throw new Error('the parser accepted a blank label');
    expect(reported(onChange).flows[0]?.artifacts[0]).toEqual({ label: 'plan.md', template: 'New first line' });
    expect(screen.getByText(result.reason)).toBeTruthy();
    expect(screen.getByLabelText('Label')).toHaveProperty('value', 'plan.md');
  });

  it('F-11 AC-025 Edit opens the saved values in the form, and Save applies a changed label', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(within(screen.getByRole('group', { name: 'Artifact 1' })).getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Label')).toHaveProperty('value', 'plan.md');
    expect(screen.getByLabelText('Template')).toHaveProperty('value', 'Task list, in order\nSecond line');

    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'design.md' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(reported(onChange).flows[0]?.artifacts[0]).toEqual({ label: 'design.md', template: 'Task list, in order\nSecond line' });
  });

  it('F-11 AC-025 a refused label on Edit keeps the saved label, shows the reason beneath the field, and keeps the form open', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(within(screen.getByRole('group', { name: 'Artifact 1' })).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const result = editFlowArtifact(basePipeline(), RULES, 'plan', 0, { field: 'label', value: '' });
    if (result.ok) throw new Error('the parser accepted a blank label');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(result.reason)).toBeTruthy();
    expect(screen.getByLabelText('Label')).toHaveProperty('value', 'plan.md');
    expect(screen.getByRole('group', { name: 'Artifact 1' })).toBeTruthy();
  });

  it('F-11 AC-025 Cancel closes the form and keeps the saved values', () => {
    const { onChange } = renderArtifacts(basePipeline());
    fireEvent.click(within(screen.getByRole('group', { name: 'Artifact 1' })).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'changed.md' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Label')).toBeNull();
    expect(within(screen.getByRole('group', { name: 'Artifact 1' })).getByText('plan.md')).toBeTruthy();
  });

  it('F-11 AC-025 Remove deletes the artifact on its own row', () => {
    const pipelineState = pipelineOf({
      ...flow('plan', 'Plan'),
      artifacts: [
        { label: 'plan.md', template: '' },
        { label: 'notes.md', template: '' },
      ],
    });
    const { onChange } = renderArtifacts(pipelineState);
    fireEvent.click(within(screen.getByRole('group', { name: 'Artifact 1' })).getByRole('button', { name: 'Remove' }));

    expect(reported(onChange).flows[0]?.artifacts).toEqual([{ label: 'notes.md', template: '' }]);
  });

  it('F-11 AC-025 a removal the parser refuses keeps the artifact and shows the reason beneath its row', () => {
    const pipelineState = pipelineOf({
      ...flow('plan', 'Plan'),
      blocks: [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' }],
    });
    const { onChange } = renderArtifacts(pipelineState);
    fireEvent.click(within(screen.getByRole('group', { name: 'Artifact 1' })).getByRole('button', { name: 'Remove' }));

    const result = removeFlowArtifact(pipelineState, RULES, 'plan', 0);
    if (result.ok) throw new Error('the parser accepted the removal of an artifact an End block names');
    expect(onChange).not.toHaveBeenCalled();
    expect(within(screen.getByRole('group', { name: 'Artifact 1' })).getByText(result.reason)).toBeTruthy();
    expect(within(screen.getByRole('group', { name: 'Artifact 1' })).getByText('plan.md')).toBeTruthy();
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
