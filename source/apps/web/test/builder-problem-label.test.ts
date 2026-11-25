import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { problemLabel } from '../src/builder/problemLabel.js';
import { structureMarks } from '../src/builder/marks.js';
import type { Pipeline, PlacedFinding, StructureMarks } from '../src/builder/marks.js';

type Flow = pipeline.Flow;
type Block = pipeline.Block;

// A flow that the analyzer accepts: a Start that leads to one Agent, the Agent to one End, a body, and an
// artifact the End produces. Its name is its id.
function flowOf(id: string): Flow {
  const artifact = `${id}.md`;
  return {
    index: 0,
    id,
    name: id,
    arguments: [],
    body: `Do the ${id} work.`,
    artifacts: [{ label: artifact, template: 'output.md' }],
    approval: false,
    blocks: [
      { index: 0, id: `${id}-start`, kind: 'start', next: `${id}-work` },
      {
        index: 1,
        id: `${id}-work`,
        kind: 'agent',
        name: `Write the ${id}`,
        description: `Does the ${id} work.`,
        arguments: [],
        next: `${id}-end`,
      },
      { index: 2, id: `${id}-end`, kind: 'end', outcome: 'done', producedArtifact: artifact },
    ],
  };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((flow, i) => ({ ...flow, index: i })),
  };
}

// The placed finding at `path`. A test fails when there is none.
function placedAt(marks: StructureMarks, path: string): PlacedFinding {
  const found = marks.findings.find((entry) => entry.finding.path === path);
  if (found === undefined) {
    throw new Error(`no finding at the path "${path}"`);
  }
  return found;
}

// A flow with its blocks replaced, so a test can name each block as it needs.
function withBlocks(flow: Flow, blocks: readonly Block[]): Flow {
  return { ...flow, blocks };
}

describe('F-16 AC-022 the location of a problem names its flow and its block', () => {
  it('F-16 AC-022 names a flow by its name, not by its path, when the flow has no Start', () => {
    const state = pipelineOf(flowOf('plan'), withBlocks(flowOf('build'), []));
    const marks = structureMarks(state, []);
    const entry = placedAt(marks, 'pipeline.flows.1');
    expect(entry.finding.message).toBe('must have one Start block, got none');
    expect(entry.label.location).toBe('build');
    expect(entry.placement).toEqual({ kind: 'flow', flowId: 'build' });
  });

  it('F-16 AC-022 names a block by the block name: an Agent by its name, Start and End by their kind', () => {
    const state = pipelineOf(flowOf('plan'));
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.1.body', message: 'is blank' }, state).location).toBe(
      'Write the plan',
    );
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.0.next', message: 'is wrong' }, state).location).toBe('Start');
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.2.outcome', message: 'is wrong' }, state).location).toBe(
      'End',
    );
  });

  it('F-16 AC-022 names a Condition by its description, and by "Condition N" when it has none', () => {
    const condition = (index: number, id: string, description: string): Block => ({
      index,
      id,
      kind: 'condition',
      description,
      true: { to: 'plan-end' },
      false: { stop: true },
    });
    const flow = withBlocks(flowOf('plan'), [
      { index: 0, id: 'plan-start', kind: 'start', next: 'plan-check' },
      condition(1, 'plan-check', 'The tests pass'),
      condition(2, 'plan-recheck', ''),
      { index: 3, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
    ]);
    const state = pipelineOf(flow);
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.1.description', message: 'is short' }, state).location).toBe(
      'The tests pass',
    );
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.2.description', message: 'is blank' }, state).location).toBe(
      'Condition 2',
    );
  });

  it('F-16 AC-022 names an Agent with no name by "Agent N" among the Agents of its flow', () => {
    const agent = (index: number, id: string): Block => ({
      index,
      id,
      kind: 'agent',
      name: '',
      description: '',
      arguments: [],
      next: 'plan-end',
    });
    const state = pipelineOf(
      withBlocks(flowOf('plan'), [
        { index: 0, id: 'plan-start', kind: 'start', next: 'plan-a' },
        agent(1, 'plan-a'),
        agent(2, 'plan-b'),
        { index: 3, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
      ]),
    );
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.2.name', message: 'must not be blank' }, state).location).toBe(
      'Agent 2',
    );
  });

  it('F-16 AC-022 names a pipeline field "pipeline"', () => {
    const state = pipelineOf(flowOf('plan'));
    expect(problemLabel({ path: 'pipeline.name', message: 'a name is required' }, state)).toEqual({
      location: 'pipeline',
      message: 'a name is required',
    });
  });

  it('F-16 AC-022 names a blank flow name by its number in the pipeline, never by an empty location', () => {
    const state = pipelineOf(flowOf('plan'), { ...flowOf('build'), name: ' ' });
    expect(problemLabel({ path: 'pipeline.flows.1.name', message: 'must not be blank' }, state).location).toBe('Flow 2');
  });

  it('F-16 AC-022 negative case: a path that names no flow of the pipeline is located at "pipeline"', () => {
    const state = pipelineOf(flowOf('plan'));
    expect(problemLabel({ path: 'pipeline.flows.7', message: 'is missing' }, state).location).toBe('pipeline');
  });

  it('F-16 AC-022 a path that names a block the flow does not have is located at the flow', () => {
    const state = pipelineOf(flowOf('plan'));
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.9.next', message: 'is wrong' }, state).location).toBe('plan');
  });
});

describe('F-16 AC-022 a message that quotes a path or an id shows the names instead', () => {
  it('F-16 AC-022 rewrites a quoted path that ends in a list index and a key, leaving no part of the path', () => {
    const state = pipelineOf(flowOf('plan'));
    expect(
      problemLabel({ path: 'pipeline.flows.0', message: 'the id topic is also used at pipeline.flows.0.arguments.0.id' }, state)
        .message,
    ).toBe('the id topic is also used at plan');
    expect(problemLabel({ path: 'pipeline.arguments.0.id', message: 'is also used at pipeline.arguments.0.id' }, state).message).toBe(
      'is also used at pipeline',
    );
  });

  it('F-16 AC-022 rewrites a quoted block path to the block name and keeps the rest of the message', () => {
    const state = pipelineOf(flowOf('plan'));
    expect(
      problemLabel({ path: 'pipeline.flows.0', message: 'must point at pipeline.flows.0.blocks.1.next' }, state).message,
    ).toBe('must point at Write the plan');
  });

  it('F-16 AC-022 rewrites a quoted flow path and a quoted pipeline field path', () => {
    const state = pipelineOf(flowOf('plan'), flowOf('build'));
    expect(
      problemLabel({ path: 'pipeline.flows.1.body', message: 'duplicates pipeline.flows.0.body and pipeline.name.' }, state)
        .message,
    ).toBe('duplicates plan and pipeline.');
  });

  it('F-16 AC-022 rewrites a quoted block id to the name of its block, and a quoted flow id to the flow name', () => {
    const state = pipelineOf(flowOf('plan'), flowOf('build'));
    expect(
      problemLabel({ path: 'pipeline.flows.0', message: 'flow build routes to plan-work, which is no block' }, state)
        .message,
    ).toBe('flow build routes to Write the plan, which is no block');
  });

  it('F-16 AC-022 names a flow id by the flow name when the names differ', () => {
    const state = pipelineOf(flowOf('plan'), { ...flowOf('flow-2'), name: 'build' });
    expect(problemLabel({ path: 'pipeline.flows.1', message: 'flow-2 is not connected.' }, state)).toEqual({
      location: 'build',
      message: 'build is not connected.',
    });
  });

  it('F-16 AC-022 matches an id as a whole word, so a longer word that starts with it is not rewritten', () => {
    const state = pipelineOf(flowOf('plan'));
    expect(problemLabel({ path: 'pipeline.flows.0', message: 'planner is not plan' }, state).message).toBe(
      'planner is not plan',
    );
  });

  it('F-16 AC-022 a duplicate block id is named in the message and at the location, with no raw id left', () => {
    const duplicate = withBlocks(flowOf('plan'), [
      { index: 0, id: 'block-1', kind: 'start', next: 'block-1-work' },
      {
        index: 1,
        id: 'block-1',
        kind: 'agent',
        name: 'Write the plan',
        description: 'Does the work.',
        arguments: [],
        next: 'plan-end',
      },
      { index: 2, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
    ]);
    const state = pipelineOf(duplicate);
    const marks = structureMarks(state, []);
    const clash = placedAt(marks, 'pipeline.flows.0.blocks.1.id');
    expect(clash.finding.message).toBe('must be unique: the id block-1 is already used at pipeline.flows.0.blocks.0.id');
    expect(clash.label).toEqual({
      location: 'Write the plan',
      message: 'must be unique: the id Start is already used at Start',
    });
    expect(clash.placement).toEqual({ kind: 'block', flowId: 'plan', blockId: 'block-1' });
  });

  it('F-16 AC-022 negative case: a message with no path and no id is shown unchanged', () => {
    const state = pipelineOf(flowOf('plan'));
    expect(problemLabel({ path: 'pipeline.description', message: 'is short' }, state).message).toBe('is short');
  });
});
