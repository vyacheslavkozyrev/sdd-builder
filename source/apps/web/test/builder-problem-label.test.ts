import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { problemLabel } from '../src/builder/problemLabel.js';
import { structureMarks } from '../src/builder/marks.js';
import type { Pipeline, PlacedFinding, StructureMarks } from '../src/builder/marks.js';

type Flow = pipeline.Flow;
type Block = pipeline.Block;

// The flow ids are GUIDs (F-16 AC-027); the words are the names the user sees.
const PLAN = 'ea3211a4-b64b-5204-9451-6fe12fd7c655';
const BUILD = 'a0c3aad4-8765-5b23-8df5-7c03d481233c';
const SECOND = '02e82ffe-8c62-50f5-acea-711320561fab';

// A block id of a flow: the flow's GUID with its last twelve digits replaced by the block's number, so it is a GUID too.
function blockId(flowId: string, n: number): string {
  return `${flowId.slice(0, 24)}${String(n).padStart(12, '0')}`;
}

// A flow that the analyzer accepts: a Start that leads to one Agent, the Agent to one End, a body, and an
// artifact the End produces. Its name is the word given.
function flowOf(id: string, word: string): Flow {
  const artifact = `${word}.md`;
  return {
    index: 0,
    id,
    name: word,
    arguments: [],
    body: `Do the ${word} work.`,
    artifacts: [{ label: artifact, template: 'output.md' }],
    approval: false,
    blocks: [
      { index: 0, id: blockId(id, 1), kind: 'start', next: blockId(id, 2) },
      {
        index: 1,
        id: blockId(id, 2),
        kind: 'agent',
        name: `Write the ${word}`,
        description: `Does the ${word} work.`,
        arguments: [],
        next: blockId(id, 3),
      },
      { index: 2, id: blockId(id, 3), kind: 'end', outcome: 'done', producedArtifact: artifact },
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
    const state = pipelineOf(flowOf(PLAN, 'plan'), withBlocks(flowOf(BUILD, 'build'), []));
    const marks = structureMarks(state, []);
    const entry = placedAt(marks, 'pipeline.flows.1');
    expect(entry.finding.message).toBe('must have one Start block, got none');
    expect(entry.label.location).toBe('build');
    expect(entry.placement).toEqual({ kind: 'flow', flowId: BUILD });
  });

  it('F-16 AC-022 names a block by the block name: an Agent by its name, Start and End by their kind', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'));
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.1.body', message: 'is blank' }, state).location).toBe('Write the plan');
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.0.next', message: 'is wrong' }, state).location).toBe('Start');
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.2.outcome', message: 'is wrong' }, state).location).toBe('End');
  });

  it('F-16 AC-022 names a Condition by its description, and by "Condition N" when it has none', () => {
    const condition = (index: number, id: string, description: string): Block => ({
      index,
      id,
      kind: 'condition',
      description,
      true: { to: '56798844-1cc5-5bad-98ac-69c9f8e75e43' },
      false: { stop: true },
    });
    const flow = withBlocks(flowOf(PLAN, 'plan'), [
      { index: 0, id: '73b60bc1-1571-5bd8-b203-54190f53a123', kind: 'start', next: '0cc64090-6c93-52de-93cf-e229eb62fa8a' },
      condition(1, '0cc64090-6c93-52de-93cf-e229eb62fa8a', 'The tests pass'),
      condition(2, '5e7c3a10-0b7d-4c4e-9a52-6d1f2b8e9c01', ''),
      { index: 3, id: '56798844-1cc5-5bad-98ac-69c9f8e75e43', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
    ]);
    const state = pipelineOf(flow);
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.1.description', message: 'is short' }, state).location).toBe('The tests pass');
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.2.description', message: 'is blank' }, state).location).toBe('Condition 2');
  });

  it('F-16 AC-022 names an Agent with no name by "Agent N" among the Agents of its flow', () => {
    const agent = (index: number, id: string): Block => ({
      index,
      id,
      kind: 'agent',
      name: '',
      description: '',
      arguments: [],
      next: '56798844-1cc5-5bad-98ac-69c9f8e75e43',
    });
    const state = pipelineOf(
      withBlocks(flowOf(PLAN, 'plan'), [
        { index: 0, id: '73b60bc1-1571-5bd8-b203-54190f53a123', kind: 'start', next: '6f0d2a51-7c3e-4b8a-9d61-2e5f7a1b3c40' },
        agent(1, '6f0d2a51-7c3e-4b8a-9d61-2e5f7a1b3c40'),
        agent(2, '6f0d2a51-7c3e-4b8a-9d61-2e5f7a1b3c41'),
        { index: 3, id: '56798844-1cc5-5bad-98ac-69c9f8e75e43', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
      ]),
    );
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.2.name', message: 'must not be blank' }, state).location).toBe('Agent 2');
  });

  it('F-16 AC-022 names a pipeline field "pipeline"', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'));
    expect(problemLabel({ path: 'pipeline.name', message: 'a name is required' }, state)).toEqual({
      location: 'pipeline',
      message: 'a name is required',
    });
  });

  it('F-16 AC-022 names a blank flow name by its number in the pipeline, never by an empty location', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'), { ...flowOf(BUILD, 'build'), name: ' ' });
    expect(problemLabel({ path: 'pipeline.flows.1.name', message: 'must not be blank' }, state).location).toBe('Flow 2');
  });

  it('F-16 AC-022 negative case: a path that names no flow of the pipeline is located at "pipeline"', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'));
    expect(problemLabel({ path: 'pipeline.flows.7', message: 'is missing' }, state).location).toBe('pipeline');
  });

  it('F-16 AC-022 a path that names a block the flow does not have is located at the flow', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'));
    expect(problemLabel({ path: 'pipeline.flows.0.blocks.9.next', message: 'is wrong' }, state).location).toBe('plan');
  });
});

describe('F-16 AC-022 a message that quotes a path or an id shows the names instead', () => {
  it('F-16 AC-022 rewrites a quoted path that ends in a list index and a key, leaving no part of the path', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'));
    expect(
      problemLabel({ path: 'pipeline.flows.0', message: 'the id topic is also used at pipeline.flows.0.arguments.0.id' }, state).message,
    ).toBe('the id topic is also used at plan');
    expect(problemLabel({ path: 'pipeline.arguments.0.id', message: 'is also used at pipeline.arguments.0.id' }, state).message).toBe(
      'is also used at pipeline',
    );
  });

  it('F-16 AC-022 rewrites a quoted block path to the block name and keeps the rest of the message', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'));
    expect(problemLabel({ path: 'pipeline.flows.0', message: 'must point at pipeline.flows.0.blocks.1.next' }, state).message).toBe(
      'must point at Write the plan',
    );
  });

  it('F-16 AC-022 rewrites a quoted flow path and a quoted pipeline field path', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'), flowOf(BUILD, 'build'));
    expect(
      problemLabel({ path: 'pipeline.flows.1.body', message: 'duplicates pipeline.flows.0.body and pipeline.name.' }, state).message,
    ).toBe('duplicates plan and pipeline.');
  });

  it('F-16 AC-022 rewrites a quoted block id to the name of its block, and a quoted flow id to the flow name', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'), flowOf(BUILD, 'build'));
    expect(
      problemLabel({ path: 'pipeline.flows.0', message: `flow build routes to ${blockId(PLAN, 2)}, which is no block` }, state).message,
    ).toBe('flow build routes to Write the plan, which is no block');
  });

  it('F-16 AC-022 names a flow id by the flow name when the names differ', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'), { ...flowOf(SECOND, 'flow-2'), name: 'build' });
    expect(problemLabel({ path: 'pipeline.flows.1', message: `${SECOND} is not connected.` }, state)).toEqual({
      location: 'build',
      message: 'build is not connected.',
    });
  });

  it('F-16 AC-022 matches an id as a whole word, so a longer word that starts with it is not rewritten', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'));
    expect(problemLabel({ path: 'pipeline.flows.0', message: 'planner is not plan' }, state).message).toBe('planner is not plan');
  });

  it('F-16 AC-022 a duplicate block id is named in the message and at the location, with no raw id left', () => {
    const start = blockId(PLAN, 1);
    const duplicate = withBlocks(flowOf(PLAN, 'plan'), [
      { index: 0, id: start, kind: 'start', next: blockId(PLAN, 2) },
      {
        index: 1,
        id: start,
        kind: 'agent',
        name: 'Write the plan',
        description: 'Does the work.',
        arguments: [],
        next: '56798844-1cc5-5bad-98ac-69c9f8e75e43',
      },
      { index: 2, id: '56798844-1cc5-5bad-98ac-69c9f8e75e43', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
    ]);
    const state = pipelineOf(duplicate);
    const marks = structureMarks(state, []);
    const clash = placedAt(marks, 'pipeline.flows.0.blocks.1.id');
    expect(clash.finding.message).toBe(`must be unique: the id ${start} is already used at pipeline.flows.0.blocks.0.id`);
    expect(clash.label).toEqual({
      location: 'Write the plan',
      message: 'must be unique: the id Start is already used at Start',
    });
    expect(clash.placement).toEqual({ kind: 'block', flowId: PLAN, blockId: start });
  });

  it('F-16 AC-022 negative case: a message with no path and no id is shown unchanged', () => {
    const state = pipelineOf(flowOf(PLAN, 'plan'));
    expect(problemLabel({ path: 'pipeline.description', message: 'is short' }, state).message).toBe('is short');
  });
});
