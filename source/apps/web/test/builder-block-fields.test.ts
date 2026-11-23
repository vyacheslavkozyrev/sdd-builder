import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { editAgentField, NAME_CLASH_REASON, type AgentFieldEdit } from '../src/builder/blockFields.js';
import type { Pipeline } from '../src/builder/fields.js';

type Block = model.Block;
type AgentBlock = model.AgentBlock;

// A pipeline with one flow that runs start, review, write, end in order: every block is reached and
// linked, so the saved pipeline has no problem. Agent `review` is the first Agent, `write` the second.
function savedPipeline(): Pipeline {
  const blocks: Block[] = [
    { index: 0, id: 'start', kind: 'start', next: 'review' },
    {
      index: 1,
      id: 'review',
      kind: 'agent',
      name: 'review',
      description: 'Reviews the plan.',
      arguments: [],
      next: 'write',
    },
    {
      index: 2,
      id: 'write',
      kind: 'agent',
      name: 'write',
      description: 'Writes the code.',
      arguments: [],
      next: 'done',
      body: 'Write the code for the plan.',
    },
    { index: 3, id: 'done', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
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
        arguments: [],
        body: 'Plan the work.',
        artifacts: [{ label: 'plan.md', template: 'output.md' }],
        approval: true,
        blocks,
      },
    ],
  };
}

function edit(pipelineState: Pipeline, blockId: string, change: AgentFieldEdit) {
  return editAgentField(pipelineState, [], 'plan', blockId, change);
}

// The Agent `id` of the saved flow, read after an edit that must have been accepted.
function agentOf(pipelineState: Pipeline, id: string): AgentBlock {
  const block = pipelineState.flows[0]?.blocks.find((item) => item.id === id);
  if (block === undefined || block.kind !== 'agent') throw new Error(`no agent ${id}`);
  return block;
}

describe('F-12 AC-022 an Agent field edit is saved through the parser', () => {
  it('stores an accepted description on the Agent', () => {
    const result = edit(savedPipeline(), 'review', { field: 'description', value: 'Checks the plan.' });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(agentOf(result.pipeline, 'review').description).toBe('Checks the plan.');
  });

  it('keeps the saved pipeline when an edit is accepted (the input is never changed)', () => {
    const saved = savedPipeline();
    const result = edit(saved, 'review', { field: 'description', value: 'Checks the plan.' });
    expect(result).toMatchObject({ ok: true });
    expect(agentOf(saved, 'review').description).toBe('Reviews the plan.');
  });
});

describe('F-12 AC-023 an Agent name is file-safe, trimmed and unique among the Agents', () => {
  it('stores the trimmed name when it is free', () => {
    const result = edit(savedPipeline(), 'review', { field: 'name', value: '  check  ' });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(agentOf(result.pipeline, 'review').name).toBe('check');
  });

  it('refuses a name that another Agent has, when the edited Agent is the later one', () => {
    const saved = savedPipeline();
    expect(edit(saved, 'write', { field: 'name', value: 'review' })).toEqual({
      ok: false,
      field: 'name',
      reason: 'Another Agent already has this name.',
    });
    expect(agentOf(saved, 'write').name).toBe('write');
  });

  it('refuses a name that another Agent has, when the edited Agent is the earlier one', () => {
    const saved = savedPipeline();
    expect(edit(saved, 'review', { field: 'name', value: 'write' })).toEqual({
      ok: false,
      field: 'name',
      reason: NAME_CLASH_REASON,
    });
    expect(agentOf(saved, 'review').name).toBe('review');
  });

  it('refuses a padded name that another Agent has, after trimming it', () => {
    const saved = savedPipeline();
    expect(edit(saved, 'write', { field: 'name', value: '  review  ' })).toEqual({
      ok: false,
      field: 'name',
      reason: NAME_CLASH_REASON,
    });
    expect(agentOf(saved, 'write').name).toBe('write');
  });

  it('refuses a name that is not file-safe with the parser reason, not the clash reason', () => {
    const saved = savedPipeline();
    const result = edit(saved, 'review', { field: 'name', value: 'Review Agent' });
    expect(result).toMatchObject({ ok: false, field: 'name' });
    if (result.ok) return;
    expect(result.reason).not.toBe(NAME_CLASH_REASON);
    expect(agentOf(saved, 'review').name).toBe('review');
  });

  it('refuses a blank name with the parser reason and keeps the saved name', () => {
    const saved = savedPipeline();
    const result = edit(saved, 'review', { field: 'name', value: '   ' });
    expect(result).toMatchObject({ ok: false, field: 'name' });
    expect(agentOf(saved, 'review').name).toBe('review');
  });
});

describe('F-12 AC-024 an Agent description is required, not blank and at most 1000 characters', () => {
  it.each([[''], ['   ']])('refuses the blank description %j with the parser reason', (value) => {
    const saved = savedPipeline();
    expect(edit(saved, 'review', { field: 'description', value })).toEqual({
      ok: false,
      field: 'description',
      reason: 'must not be blank',
    });
    expect(agentOf(saved, 'review').description).toBe('Reviews the plan.');
  });

  it('accepts a description of 1000 characters and refuses 1001', () => {
    expect(edit(savedPipeline(), 'review', { field: 'description', value: 'x'.repeat(1000) })).toMatchObject({
      ok: true,
    });
    expect(edit(savedPipeline(), 'review', { field: 'description', value: 'x'.repeat(1001) })).toEqual({
      ok: false,
      field: 'description',
      reason: 'must be at most 1000 characters',
    });
  });
});

describe('F-12 AC-028 an Agent body is required, not blank and at most 1000 code points', () => {
  it.each([[''], ['   '], ['\n\t']])('refuses the blank body %j with the parser reason', (value) => {
    const saved = savedPipeline();
    expect(edit(saved, 'write', { field: 'body', value })).toEqual({
      ok: false,
      field: 'body',
      reason: 'must not be blank',
    });
    expect(agentOf(saved, 'write').body).toBe('Write the code for the plan.');
  });

  it('accepts a body of 1000 code points and refuses 1001', () => {
    expect(edit(savedPipeline(), 'write', { field: 'body', value: 'x'.repeat(1000) })).toMatchObject({ ok: true });
    expect(edit(savedPipeline(), 'write', { field: 'body', value: 'x'.repeat(1001) })).toEqual({
      ok: false,
      field: 'body',
      reason: 'must be at most 1000 characters',
    });
  });

  it('counts the body in code points, so 1000 emoji are accepted and 1001 refused', () => {
    expect(edit(savedPipeline(), 'write', { field: 'body', value: '😀'.repeat(1000) })).toMatchObject({ ok: true });
    expect(edit(savedPipeline(), 'write', { field: 'body', value: '😀'.repeat(1001) })).toMatchObject({
      ok: false,
      field: 'body',
    });
  });
});

describe('F-12 AC-029 an Agent field edit changes only that Agent', () => {
  it('keeps the arrows and every other block of the flow', () => {
    const saved = savedPipeline();
    const result = edit(saved, 'review', { field: 'name', value: 'check' });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    const before = saved.flows[0]?.blocks.filter((block) => block.id !== 'review');
    const after = result.pipeline.flows[0]?.blocks.filter((block) => block.id !== 'review');
    expect(after).toEqual(before);
    expect(agentOf(result.pipeline, 'review').next).toBe('write');
  });
});

describe('F-12 AC-050 a refused Agent field edit returns no pipeline and keeps the saved value', () => {
  it('returns a reason and no pipeline for a refused edit', () => {
    const result = edit(savedPipeline(), 'review', { field: 'body', value: '' });
    expect(result).not.toHaveProperty('pipeline');
    expect(result).toEqual({ ok: false, field: 'body', reason: 'must not be blank' });
  });
});

describe('F-12 programmer errors in an Agent field edit', () => {
  it('throws for an unknown block id', () => {
    expect(() => edit(savedPipeline(), 'missing', { field: 'description', value: 'x' })).toThrow(
      'the flow "plan" has no block "missing"',
    );
  });

  it('throws for a block that is not an Agent', () => {
    expect(() => edit(savedPipeline(), 'start', { field: 'description', value: 'x' })).toThrow(
      'the block "start" of the flow "plan" is not an Agent',
    );
  });
});
