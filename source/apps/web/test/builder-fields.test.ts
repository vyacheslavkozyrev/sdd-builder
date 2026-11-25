import { describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import { editFlowField } from '../src/builder/fields.js';
import type { FlowFieldEdit, Pipeline } from '../src/builder/fields.js';

type Flow = core.Flow;

// A flow with the required fields only; `next` is set only when given.
function flow(id: string, name: string = id, next?: string): Flow {
  const base: Flow = {
    index: 0,
    id,
    name,
    description: `The ${name} step.`,
    arguments: [],
    body: `Do the ${name} work.`,
    artifacts: [{ label: `${id}.md`, template: 'output.md' }],
    approval: true,
    blocks: [],
  };
  return next === undefined ? base : { ...base, next };
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

// The saved pipeline of most tests: two connected flows, so no link problem is reported.
function linkedPipeline(): Pipeline {
  return pipelineOf(flow('plan', 'Plan', 'build'), flow('build', 'Build'));
}

function edit(pipelineState: Pipeline, flowId: string, change: FlowFieldEdit) {
  return editFlowField(pipelineState, [], flowId, change);
}

// The flow `id` of a pipeline, read after an edit that must have been accepted.
function flowOf(pipelineState: Pipeline, id: string): Flow {
  const found = pipelineState.flows.find((item) => item.id === id);
  if (found === undefined) throw new Error(`no flow ${id}`);
  return found;
}

describe('F-11 AC-020 the flow name is required, trimmed and unique among the flows', () => {
  it('stores the trimmed name', () => {
    const result = edit(linkedPipeline(), 'plan', { field: 'name', value: '  Draft plan  ' });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(flowOf(result.pipeline, 'plan').name).toBe('Draft plan');
  });

  it.each(['', '   ', '\n\t'])('refuses the blank name %j with the parser reason and keeps the saved name', (value) => {
    const saved = linkedPipeline();
    const result = edit(saved, 'plan', { field: 'name', value });
    expect(result).toEqual({ ok: false, field: 'name', reason: 'must not be blank' });
    expect(flowOf(saved, 'plan').name).toBe('Plan');
  });

  it('refuses a name that another flow already has, with the parser reason', () => {
    const saved = linkedPipeline();
    const result = edit(saved, 'plan', { field: 'name', value: 'Build' });
    expect(result).toEqual({
      ok: false,
      field: 'name',
      reason: 'must be unique among the flows, got Build, which another flow already has',
    });
    expect(flowOf(saved, 'plan').name).toBe('Plan');
  });

  it('refuses a duplicate name when the other flow is the later one, and when it is the earlier one', () => {
    const pipelineState = pipelineOf(flow('first', 'Alpha'), flow('second', 'Beta', 'third'), flow('third', 'Gamma'));
    const earlier = edit(pipelineState, 'second', { field: 'name', value: 'Alpha' });
    const later = edit(pipelineState, 'first', { field: 'name', value: 'Gamma' });
    expect(earlier).toEqual({
      ok: false,
      field: 'name',
      reason: 'must be unique among the flows, got Alpha, which another flow already has',
    });
    expect(later).toEqual({
      ok: false,
      field: 'name',
      reason: 'must be unique among the flows, got Gamma, which another flow already has',
    });
    expect(flowOf(pipelineState, 'second').name).toBe('Beta');
    expect(flowOf(pipelineState, 'first').name).toBe('Alpha');
  });

  it('accepts a name that differs from another flow only in case, since names are compared as written', () => {
    const result = edit(linkedPipeline(), 'plan', { field: 'name', value: 'build' });
    expect(result).toMatchObject({ ok: true });
  });

  it('accepts the flow keeping its own name', () => {
    const result = edit(linkedPipeline(), 'plan', { field: 'name', value: 'Plan' });
    expect(result).toMatchObject({ ok: true });
  });

  it('refuses a name longer than 100 characters with the parser reason', () => {
    const saved = linkedPipeline();
    const result = edit(saved, 'plan', { field: 'name', value: 'a'.repeat(101) });
    expect(result).toEqual({ ok: false, field: 'name', reason: 'must be at most 100 characters' });
    expect(flowOf(saved, 'plan').name).toBe('Plan');
  });
});

describe('F-11 AC-021 the flow description is optional text of at most 1000 characters', () => {
  it('accepts a description of 1000 characters', () => {
    const result = edit(linkedPipeline(), 'plan', { field: 'description', value: 'x'.repeat(1000) });
    expect(result).toMatchObject({ ok: true });
  });

  it('accepts an empty description', () => {
    const result = edit(linkedPipeline(), 'plan', { field: 'description', value: '' });
    expect(result).toMatchObject({ ok: true });
  });

  it('refuses a description of 1001 characters with the parser reason and keeps the saved one', () => {
    const saved = linkedPipeline();
    const result = edit(saved, 'plan', { field: 'description', value: 'x'.repeat(1001) });
    expect(result).toEqual({ ok: false, field: 'description', reason: 'must be at most 1000 characters' });
    expect(flowOf(saved, 'plan').description).toBe('The Plan step.');
  });
});

describe('F-11 AC-022 the flow body is at most 1000 code points', () => {
  it('accepts a body of 1000 code points', () => {
    const result = edit(linkedPipeline(), 'plan', { field: 'body', value: 'x'.repeat(1000) });
    expect(result).toMatchObject({ ok: true });
  });

  it('counts an emoji as one code point, so 1000 emoji are accepted', () => {
    const result = edit(linkedPipeline(), 'plan', { field: 'body', value: '😀'.repeat(1000) });
    expect(result).toMatchObject({ ok: true });
  });

  it('refuses 1001 code points with the parser reason and keeps the saved body', () => {
    const saved = linkedPipeline();
    const result = edit(saved, 'plan', { field: 'body', value: '😀'.repeat(1001) });
    expect(result).toEqual({ ok: false, field: 'body', reason: 'must be at most 1000 characters' });
    expect(flowOf(saved, 'plan').body).toBe('Do the Plan work.');
  });

  it("F-11 AC-022 refuses a blank body with the parser's reason and keeps the saved body", () => {
    for (const value of ['', '   ', '\n\t']) {
      const saved = linkedPipeline();
      const result = edit(saved, 'plan', { field: 'body', value });
      expect(result).toEqual({ ok: false, field: 'body', reason: 'must not be blank' });
      expect(flowOf(saved, 'plan').body).toBe('Do the Plan work.');
    }
  });
});

describe('F-11 AC-023 the flow model is haiku, sonnet, opus, inherit or unset', () => {
  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('stores the model %s', (value) => {
    const result = edit(linkedPipeline(), 'plan', { field: 'model', value });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(flowOf(result.pipeline, 'plan').model).toBe(value);
  });

  it('unsets the model when the value is undefined', () => {
    const pipelineState = pipelineOf({ ...flow('plan', 'Plan', 'build'), model: 'opus' }, flow('build', 'Build'));
    const result = edit(pipelineState, 'plan', { field: 'model', value: undefined });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(flowOf(result.pipeline, 'plan')).not.toHaveProperty('model');
  });

  it.each(['gpt', 'Opus', ''])('refuses the model %j with the parser reason and stores nothing', (value) => {
    const saved = linkedPipeline();
    const result = edit(saved, 'plan', { field: 'model', value });
    expect(result).toEqual({
      ok: false,
      field: 'model',
      reason: `must be one of haiku, sonnet, opus, inherit, got text`,
    });
    expect(flowOf(saved, 'plan')).not.toHaveProperty('model');
  });
});

describe('F-11 AC-028 every flow field edit goes through the parser', () => {
  it('returns the parser reason for the field path, as parseProjectConfig reports it', () => {
    const saved = linkedPipeline();
    const value = 'x'.repeat(1001);
    const result = edit(saved, 'plan', { field: 'description', value });
    // The document form of the pipeline: the model's `index` is not a document key.
    const document = saved.flows.map(({ index: _index, ...item }) =>
      item.id === 'plan' ? { ...item, description: value } : item,
    );
    const parsed = core.parseProjectConfig({
      schemaVersion: 2,
      rules: [],
      pipeline: { name: saved.name, description: saved.description, arguments: [], flows: document },
    });
    if (parsed.ok) throw new Error('the parser accepted a description of 1001 characters');
    const expected = parsed.problems.find((problem) => problem.path === 'pipeline.flows.0.description');
    if (expected === undefined) throw new Error('the parser gave no problem at the description path');
    expect(result).toEqual({ ok: false, field: 'description', reason: expected.message });
  });

  it('never changes the input pipeline, whether the edit is accepted or refused', () => {
    const saved = linkedPipeline();
    const snapshot = structuredClone(saved);
    edit(saved, 'plan', { field: 'name', value: 'Build' });
    edit(saved, 'plan', { field: 'body', value: 'x'.repeat(1001) });
    edit(saved, 'plan', { field: 'name', value: 'Renamed' });
    expect(saved).toEqual(snapshot);
  });

  it('changes only the edited flow and keeps its other fields', () => {
    const saved = linkedPipeline();
    const result = edit(saved, 'plan', { field: 'body', value: 'A new body.' });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(flowOf(result.pipeline, 'plan')).toEqual({ ...flowOf(saved, 'plan'), body: 'A new body.' });
    expect(flowOf(result.pipeline, 'build')).toEqual(flowOf(saved, 'build'));
  });

  it('accepts an edit of a flow that has no link yet, since the link problem was there before the edit', () => {
    const unlinked = pipelineOf(flow('plan', 'Plan'), flow('build', 'Build'));
    const result = edit(unlinked, 'plan', { field: 'description', value: 'Edited.' });
    expect(result).toMatchObject({ ok: true });
  });

  it('throws for a flow id that is not in the pipeline, as a programmer error', () => {
    expect(() => edit(linkedPipeline(), 'missing', { field: 'name', value: 'Anything' })).toThrow(
      'F-11: the pipeline has no flow "missing"',
    );
  });
});

// F-16 AC-020: a flow of a new project, from Add flow, with a blank body and no link yet (the saved body is blank,
// so the parser drops the flow and reports no link for it until the body has text).
function newFlowPipeline(): Pipeline {
  const added: Flow = {
    index: 2,
    id: 'flow-1',
    name: 'flow-1',
    arguments: [],
    body: '',
    artifacts: [],
    approval: false,
    blocks: [],
  };
  return { ...linkedPipeline(), flows: [...linkedPipeline().flows, added] };
}

describe('F-16 AC-020 the body refusal is about the body', () => {
  it('F-16 AC-020 accepts the first character of the body of a new flow that no flow links to yet', () => {
    const result = edit(newFlowPipeline(), 'flow-1', { field: 'body', value: 'a' });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(flowOf(result.pipeline, 'flow-1').body).toBe('a');
  });

  it.each(['a ', 'a\n', 'a\nb', 'x'.repeat(300)])('F-16 AC-020 accepts the body %j typed into a new flow', (value) => {
    const result = edit(newFlowPipeline(), 'flow-1', { field: 'body', value });
    expect(result).toMatchObject({ ok: true });
  });

  it('F-16 AC-020 keeps the parser reason for a body over the limit', () => {
    const result = edit(newFlowPipeline(), 'flow-1', { field: 'body', value: 'x'.repeat(1001) });
    expect(result).toEqual({ ok: false, field: 'body', reason: 'must be at most 1000 characters' });
  });

  it('F-16 AC-020 refuses a blank body of a new flow with the parser reason at the body', () => {
    const result = edit(newFlowPipeline(), 'flow-1', { field: 'body', value: ' ' });
    expect(result).toEqual({ ok: false, field: 'body', reason: 'must not be blank' });
  });

  it('F-16 AC-020 accepts a description typed into a new flow that no flow links to yet', () => {
    const result = edit(newFlowPipeline(), 'flow-1', { field: 'description', value: 'Writes the plan.' });
    expect(result).toMatchObject({ ok: true });
  });
});
