import { describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import {
  addFlowArtifact,
  editFlowArtifact,
  removeFlowArtifact,
} from '../src/builder/fields.js';
import type { ArtifactRow, Pipeline, Rule } from '../src/builder/fields.js';

type Flow = core.Flow;
type Artifact = core.Artifact;

const ONLY_OUTCOME_REASON =
  'This is the only outcome of this flow, and its End block produces it. Add another outcome first; then this one can be removed.';

// A flow with the required fields only. Its artifacts are given; the default is one artifact.
function flow(id: string, artifacts: Artifact[] = [{ label: `${id}.md`, template: 'output.md' }]): Flow {
  return {
    index: 0,
    id,
    name: id,
    description: `The ${id} step.`,
    arguments: [],
    body: `Do the ${id} work.`,
    artifacts,
    approval: true,
    blocks: [],
  };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((item, index) => ({ ...item, index })),
  };
}

// Two connected flows: `plan` links to `build`, so no link problem is reported.
function linkedPipeline(planArtifacts?: Artifact[]): Pipeline {
  return pipelineOf(
    { ...flow('plan', planArtifacts), next: 'build' },
    flow('build'),
  );
}

// A project rule as the Technical details step gives it.
function rule(id: string): Rule {
  return { index: 0, id, title: id, text: `The ${id} rule.` };
}

const RULES: readonly Rule[] = [rule('style')];

function row(label: string, template: string = 'output.md'): ArtifactRow {
  return { label, template };
}

// The artifacts of the flow `id` of a pipeline.
function artifactsOf(pipelineState: Pipeline, id: string): readonly Artifact[] {
  const found = pipelineState.flows.find((item) => item.id === id);
  if (found === undefined) throw new Error(`no flow ${id}`);
  return found.artifacts;
}

describe('F-11 AC-025 flow artifacts: add appends an artifact with a label and a template', () => {
  it('appends the artifact after the saved ones, in the order the user added them', () => {
    const first = addFlowArtifact(linkedPipeline(), RULES, 'plan', row('spec.md', 'the spec'));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = addFlowArtifact(first.pipeline, RULES, 'plan', row('notes.md', 'the notes'));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(artifactsOf(second.pipeline, 'plan')).toEqual([
      { label: 'plan.md', template: 'output.md' },
      { label: 'spec.md', template: 'the spec' },
      { label: 'notes.md', template: 'the notes' },
    ]);
  });

  it('accepts an empty template, since a template may be empty', () => {
    const result = addFlowArtifact(linkedPipeline(), RULES, 'plan', row('spec.md', ''));
    expect(result).toMatchObject({ ok: true });
  });

  it('accepts a template that spans several lines', () => {
    const template = '# Spec\n\n## Goals\n- one\n- two\n';
    const result = addFlowArtifact(linkedPipeline(), RULES, 'plan', row('spec.md', template));
    expect(result.ok && artifactsOf(result.pipeline, 'plan')[1]).toEqual({ label: 'spec.md', template });
  });

  it('accepts a template of exactly 5000 characters and refuses 5001 at the template field', () => {
    const saved = linkedPipeline();
    expect(addFlowArtifact(saved, RULES, 'plan', row('spec.md', 'x'.repeat(5000)))).toMatchObject({ ok: true });

    const refused = addFlowArtifact(saved, RULES, 'plan', row('spec.md', 'x'.repeat(5001)));
    expect(refused).toEqual({ ok: false, field: 'template', reason: 'must be at most 5000 characters' });
    expect(artifactsOf(saved, 'plan')).toHaveLength(1);
  });

  it.each(['', '   ', '\t'])('refuses the blank label %j at the label field and adds nothing', (label) => {
    const saved = linkedPipeline();
    const result = addFlowArtifact(saved, RULES, 'plan', row(label));
    expect(result).toEqual({ ok: false, field: 'label', reason: 'must not be blank' });
    expect(artifactsOf(saved, 'plan')).toHaveLength(1);
  });

  it('refuses a label that spans more than one line at the label field', () => {
    const result = addFlowArtifact(linkedPipeline(), RULES, 'plan', row('spec.md\nnotes.md'));
    expect(result).toEqual({ ok: false, field: 'label', reason: 'must be one line' });
  });

  it('accepts a label of exactly 200 characters and refuses 201 at the label field', () => {
    const saved = linkedPipeline();
    expect(addFlowArtifact(saved, RULES, 'plan', row('a'.repeat(200)))).toMatchObject({ ok: true });

    const refused = addFlowArtifact(saved, RULES, 'plan', row('a'.repeat(201)));
    expect(refused).toEqual({ ok: false, field: 'label', reason: 'must be at most 200 characters' });
    expect(artifactsOf(saved, 'plan')).toHaveLength(1);
  });

  it('refuses a label that another artifact of the flow already has, at the label field', () => {
    const saved = linkedPipeline();
    const result = addFlowArtifact(saved, RULES, 'plan', row('plan.md', 'other'));
    expect(result).toEqual({
      ok: false,
      field: 'label',
      reason: 'repeats plan.md; each artifact of a flow needs its own label',
    });
    expect(artifactsOf(saved, 'plan')).toEqual([{ label: 'plan.md', template: 'output.md' }]);
  });

  it('accepts a label that another flow already has, since artifact labels are unique within a flow', () => {
    const result = addFlowArtifact(linkedPipeline(), RULES, 'build', row('plan.md'));
    expect(result).toMatchObject({ ok: true });
  });
});

describe('F-11 AC-025 flow artifacts: edit changes the label or the template of one row', () => {
  it('edits the label and keeps the template and the other rows', () => {
    const saved = linkedPipeline([
      { label: 'plan.md', template: 'the plan' },
      { label: 'spec.md', template: 'the spec' },
    ]);
    const result = editFlowArtifact(saved, RULES, 'plan', 0, { field: 'label', value: 'brief.md' });
    expect(result.ok && artifactsOf(result.pipeline, 'plan')).toEqual([
      { label: 'brief.md', template: 'the plan' },
      { label: 'spec.md', template: 'the spec' },
    ]);
  });

  it('edits the template to an empty value and to several lines', () => {
    const saved = linkedPipeline();
    const emptied = editFlowArtifact(saved, RULES, 'plan', 0, { field: 'template', value: '' });
    expect(emptied.ok && artifactsOf(emptied.pipeline, 'plan')).toEqual([{ label: 'plan.md', template: '' }]);

    const lines = editFlowArtifact(saved, RULES, 'plan', 0, { field: 'template', value: 'a\nb\nc' });
    expect(lines.ok && artifactsOf(lines.pipeline, 'plan')).toEqual([{ label: 'plan.md', template: 'a\nb\nc' }]);
  });

  it('refuses a blank label and keeps the saved label', () => {
    const saved = linkedPipeline();
    const result = editFlowArtifact(saved, RULES, 'plan', 0, { field: 'label', value: '  ' });
    expect(result).toEqual({ ok: false, field: 'label', reason: 'must not be blank' });
    expect(artifactsOf(saved, 'plan')).toEqual([{ label: 'plan.md', template: 'output.md' }]);
  });

  it('refuses a label of several lines at the label field', () => {
    const result = editFlowArtifact(linkedPipeline(), RULES, 'plan', 0, { field: 'label', value: 'a\nb' });
    expect(result).toEqual({ ok: false, field: 'label', reason: 'must be one line' });
  });

  it('refuses a template of 5001 characters at the template field and keeps the saved template', () => {
    const saved = linkedPipeline();
    const result = editFlowArtifact(saved, RULES, 'plan', 0, { field: 'template', value: 'x'.repeat(5001) });
    expect(result).toEqual({ ok: false, field: 'template', reason: 'must be at most 5000 characters' });
    expect(artifactsOf(saved, 'plan')).toEqual([{ label: 'plan.md', template: 'output.md' }]);
  });

  it('refuses a label that another row of the flow has, at the label field', () => {
    const saved = linkedPipeline([
      { label: 'plan.md', template: 'the plan' },
      { label: 'spec.md', template: 'the spec' },
    ]);
    const result = editFlowArtifact(saved, RULES, 'plan', 1, { field: 'label', value: 'plan.md' });
    expect(result).toEqual({
      ok: false,
      field: 'label',
      reason: 'repeats plan.md; each artifact of a flow needs its own label',
    });
    expect(artifactsOf(saved, 'plan')[1]).toEqual({ label: 'spec.md', template: 'the spec' });
  });

  it('throws for a row the flow does not have', () => {
    expect(() => editFlowArtifact(linkedPipeline(), RULES, 'plan', 3, { field: 'label', value: 'x.md' })).toThrow(
      'F-11: the flow "plan" has no artifact row 3',
    );
  });
});

describe('F-11 AC-025 flow artifacts: remove deletes one row and keeps the others in order', () => {
  it('removes the row and keeps the order of the rest', () => {
    const saved = linkedPipeline([
      { label: 'plan.md', template: 'the plan' },
      { label: 'spec.md', template: 'the spec' },
      { label: 'notes.md', template: 'the notes' },
    ]);
    const result = removeFlowArtifact(saved, RULES, 'plan', 1);
    expect(result.ok && artifactsOf(result.pipeline, 'plan')).toEqual([
      { label: 'plan.md', template: 'the plan' },
      { label: 'notes.md', template: 'the notes' },
    ]);
  });

  it('removes an artifact that no End block names, even when another artifact is named', () => {
    const planFlow: Flow = {
      ...flow('plan', [
        { label: 'plan.md', template: 'the plan' },
        { label: 'spec.md', template: 'the spec' },
      ]),
      blocks: [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' }],
    };
    const saved = pipelineOf({ ...planFlow, next: 'build' }, flow('build'));
    const result = removeFlowArtifact(saved, RULES, 'plan', 1);
    expect(result.ok && artifactsOf(result.pipeline, 'plan')).toEqual([{ label: 'plan.md', template: 'the plan' }]);
  });

  it('F-11 AC-025 removes the first artifact of specify, named by its End, and the End names the remaining artifact', () => {
    const specifyFlow: Flow = {
      ...flow('specify', [
        { label: 'stories.md', template: 'the stories' },
        { label: 'design.md', template: 'the design' },
      ]),
      blocks: [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'stories.md' }],
    };
    const saved = pipelineOf({ ...specifyFlow, next: 'build' }, flow('build'));
    const result = removeFlowArtifact(saved, RULES, 'specify', 0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(artifactsOf(result.pipeline, 'specify')).toEqual([{ label: 'design.md', template: 'the design' }]);
    expect(result.pipeline.flows[0]?.blocks).toEqual([
      { index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'design.md' },
    ]);
    expect(artifactsOf(saved, 'specify')[0]?.label).toBe('stories.md');
  });

  it('F-11 AC-025 removing the only outcome that an End names shows what the user can do, and the pipeline is unchanged', () => {
    const planFlow: Flow = {
      ...flow('plan'),
      blocks: [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' }],
    };
    const saved = pipelineOf({ ...planFlow, next: 'build' }, flow('build'));
    const before = structuredClone(saved);
    const result = removeFlowArtifact(saved, RULES, 'plan', 0);
    expect(result).toEqual({
      ok: false,
      reason:
        'This is the only outcome of this flow, and its End block produces it. Add another outcome first; then this one can be removed.',
    });
    expect(saved).toEqual(before);
    expect(artifactsOf(saved, 'plan')).toEqual([{ label: 'plan.md', template: 'output.md' }]);
    expect(saved.flows[0]?.blocks).toEqual(planFlow.blocks);
  });

  it('F-11 AC-025 removing an artifact that no End names leaves the ends and the other artifacts unchanged', () => {
    const planFlow: Flow = {
      ...flow('plan', [
        { label: 'plan.md', template: 'the plan' },
        { label: 'spec.md', template: 'the spec' },
      ]),
      blocks: [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' }],
    };
    const saved = pipelineOf({ ...planFlow, next: 'build' }, flow('build'));
    const result = removeFlowArtifact(saved, RULES, 'plan', 1);
    expect(result.ok && result.pipeline.flows[0]?.blocks).toEqual(planFlow.blocks);
    expect(result.ok && artifactsOf(result.pipeline, 'plan')).toEqual([{ label: 'plan.md', template: 'the plan' }]);
  });

  it('F-11 AC-025 removing the second artifact, named by an End, moves the End to the first remaining artifact', () => {
    const planFlow: Flow = {
      ...flow('plan', [
        { label: 'plan.md', template: 'the plan' },
        { label: 'spec.md', template: 'the spec' },
      ]),
      blocks: [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'spec.md' }],
    };
    const saved = pipelineOf({ ...planFlow, next: 'build' }, flow('build'));
    const result = removeFlowArtifact(saved, RULES, 'plan', 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(artifactsOf(result.pipeline, 'plan')).toEqual([{ label: 'plan.md', template: 'the plan' }]);
    expect(result.pipeline.flows[0]?.blocks).toEqual([
      { index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
    ]);
  });

  it('throws for a row the flow does not have', () => {
    expect(() => removeFlowArtifact(linkedPipeline(), RULES, 'plan', 3)).toThrow(
      'F-11: the flow "plan" has no artifact row 3',
    );
  });
});

describe('F-11 AC-025 flow artifacts: renaming an outcome that an End names renames the End with it', () => {
  it('F-11 AC-025 renaming the outcome named by an End saves, and the End names the new label', () => {
    const planFlow: Flow = {
      ...flow('plan', [
        { label: 'plan.md', template: 'the plan' },
        { label: 'spec.md', template: 'the spec' },
      ]),
      blocks: [
        { index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
        { index: 1, id: 'stop', kind: 'end', outcome: 'stopped', producedArtifact: 'spec.md' },
      ],
    };
    const saved = pipelineOf({ ...planFlow, next: 'build' }, flow('build'));
    const result = editFlowArtifact(saved, RULES, 'plan', 0, { field: 'label', value: 'brief.md' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(artifactsOf(result.pipeline, 'plan')).toEqual([
      { label: 'brief.md', template: 'the plan' },
      { label: 'spec.md', template: 'the spec' },
    ]);
    expect(result.pipeline.flows[0]?.blocks).toEqual([
      { index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'brief.md' },
      { index: 1, id: 'stop', kind: 'end', outcome: 'stopped', producedArtifact: 'spec.md' },
    ]);
    expect(result.pipeline.flows[0]?.next).toBe('build');
    expect(saved.flows[0]?.blocks[0]).toMatchObject({ producedArtifact: 'plan.md' });
  });

  it('F-11 AC-025 renaming an outcome that no End names leaves the ends unchanged', () => {
    const planFlow: Flow = {
      ...flow('plan', [
        { label: 'plan.md', template: 'the plan' },
        { label: 'spec.md', template: 'the spec' },
      ]),
      blocks: [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' }],
    };
    const saved = pipelineOf({ ...planFlow, next: 'build' }, flow('build'));
    const result = editFlowArtifact(saved, RULES, 'plan', 1, { field: 'label', value: 'design.md' });
    expect(result.ok && artifactsOf(result.pipeline, 'plan')).toEqual([
      { label: 'plan.md', template: 'the plan' },
      { label: 'design.md', template: 'the spec' },
    ]);
    expect(result.ok && result.pipeline.flows[0]?.blocks).toEqual(planFlow.blocks);
  });

  it('F-11 AC-025 a blank label for an outcome that an End names is refused with the label reason, and nothing moves', () => {
    const planFlow: Flow = {
      ...flow('plan'),
      blocks: [{ index: 0, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' }],
    };
    const saved = pipelineOf({ ...planFlow, next: 'build' }, flow('build'));
    const result = editFlowArtifact(saved, RULES, 'plan', 0, { field: 'label', value: '  ' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe('label');
    expect(result.reason).toBe('must not be blank');
    expect(saved.flows[0]?.blocks).toEqual(planFlow.blocks);
  });
});
