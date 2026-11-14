import { describe, expect, it } from 'vitest';
import type { ChildBlock, PipelineBlock } from '../src/pipeline/model.js';
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';

const START = { kind: 'start', id: 'start', enabled: true, arguments: [] };
const END = { kind: 'end', id: 'end', enabled: true, outcome: 'done' };

/** A child flow `build` with its own Start and End around the given blocks. */
function flow(id: string, blocks: Record<string, unknown>[] = []): Record<string, unknown> {
  return {
    kind: 'flow',
    id,
    name: `${id} flow`,
    enabled: true,
    blocks: [
      { kind: 'start', id: `${id}-start`, enabled: true },
      ...blocks,
      { kind: 'end', id: `${id}-end`, enabled: true, outcome: 'done' },
    ],
  };
}

function agent(id: string): Record<string, unknown> {
  return { kind: 'agent', id, enabled: true, name: id, scope: 'task' };
}

function configWith(blocks: unknown[]): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: { name: 'main-pipeline', blocks: [...blocks, END] },
    rules: [],
  };
}

/** A connection inside the `build` flow, from its Start to the Agent `implement`. */
function flowConnection(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { kind: 'connection', id: 'hand-over', enabled: true, from: 'build-start', to: 'implement', artifact: 'plan', ...overrides };
}

/** An End inside the `build` flow. */
function flowEnd(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { kind: 'end', id: 'build-finished', enabled: true, outcome: 'done', ...overrides };
}

function problemsOf(value: unknown): PipelineProblem[] {
  const result = parsePipelineConfig(value);
  if (result.ok) throw new Error('expected the config to be refused');
  return result.problems;
}

function childBlockAt(value: unknown, index: number): ChildBlock {
  const result = parsePipelineConfig(value);
  if (!result.ok) throw new Error('expected the config to pass');
  const second = result.config.pipeline.blocks[1];
  if (second?.kind !== 'flow') throw new Error('expected a flow at index 1');
  const block = second.blocks[index];
  if (block === undefined) throw new Error(`expected a block at index ${index}`);
  return block;
}

function pipelineBlockAt(value: unknown, index: number): PipelineBlock {
  const result = parsePipelineConfig(value);
  if (!result.ok) throw new Error('expected the config to pass');
  const block = result.config.pipeline.blocks[index];
  if (block === undefined) throw new Error(`expected a block at index ${index}`);
  return block;
}

/** A pipeline with the `build` flow (holding an Agent `implement`), a connection and a flow `review`. */
function twoFlows(connection: Record<string, unknown>): Record<string, unknown> {
  return configWith([
    START,
    flow('build', [agent('implement'), flowEnd()]),
    connection,
    flow('review', [agent('review-it')]),
  ]);
}

describe('F-01 AC-027 a Connection between two blocks of a flow has from, to and an artifact', () => {
  it('accepts a connection between two blocks of the same flow and keeps its fields', () => {
    const block = childBlockAt(configWith([START, flow('build', [agent('implement'), flowConnection()])]), 2);
    expect(block).toEqual({ kind: 'connection', id: 'hand-over', enabled: true, from: 'build-start', to: 'implement', artifact: 'plan' });
  });

  it('refuses a from or to that names no block of the same flow, at its path', () => {
    const blocks = configWith([START, flow('build', [agent('implement'), flowConnection({ from: 'review-start', to: 'nowhere' })])]);
    expect(problemsOf(blocks)).toEqual([
      { path: 'pipeline.blocks[1].blocks[2].from', message: 'must name a block in the same list' },
      { path: 'pipeline.blocks[1].blocks[2].to', message: 'must name a block in the same list' },
    ]);
  });

  it('refuses a connection without an artifact', () => {
    const { artifact: _removed, ...withoutArtifact } = flowConnection();
    expect(problemsOf(configWith([START, flow('build', [agent('implement'), withoutArtifact])]))).toEqual([
      { path: 'pipeline.blocks[1].blocks[2].artifact', message: 'is required' },
    ]);
  });

  it('refuses an artifact that is not a string', () => {
    expect(problemsOf(configWith([START, flow('build', [agent('implement'), flowConnection({ artifact: 3 })])]))).toEqual([
      { path: 'pipeline.blocks[1].blocks[2].artifact', message: 'must be a string' },
    ]);
  });

  it('refuses an unknown key inside a connection, at the key path', () => {
    expect(problemsOf(configWith([START, flow('build', [agent('implement'), flowConnection({ label: 'x' })])]))).toEqual([
      { path: 'pipeline.blocks[1].blocks[2].label', message: 'is not a known key' },
    ]);
  });

  it('accepts a connection between two flows of the pipeline, naming the flows', () => {
    const block = pipelineBlockAt(twoFlows({ kind: 'connection', id: 'build-to-review', enabled: true, from: 'build', to: 'review', artifact: 'plan' }), 2);
    expect(block).toMatchObject({ kind: 'connection', from: 'build', to: 'review' });
  });

  it('refuses a pipeline connection that names a block inside a child flow', () => {
    const connection = { kind: 'connection', id: 'build-to-review', enabled: true, from: 'build', to: 'review-it', artifact: 'plan' };
    expect(problemsOf(twoFlows(connection))).toEqual([
      { path: 'pipeline.blocks[2].to', message: 'must name a block in the same list' },
    ]);
  });
});

describe('F-01 AC-027 an End block has an outcome of done or stopped and an optional produced artifact', () => {
  it.each(['done', 'stopped'])('accepts outcome %s and keeps it', (outcome) => {
    expect(childBlockAt(configWith([START, flow('build', [agent('implement'), flowEnd({ outcome })])]), 2)).toEqual({
      kind: 'end',
      id: 'build-finished',
      enabled: true,
      outcome,
    });
  });

  it('keeps the produced artifact when it is given', () => {
    const block = childBlockAt(configWith([START, flow('build', [agent('implement'), flowEnd({ produced: 'report' })])]), 2);
    expect(block).toMatchObject({ kind: 'end', produced: 'report' });
  });

  it('leaves the produced artifact out of the model when it is absent', () => {
    expect(childBlockAt(configWith([START, flow('build', [agent('implement'), flowEnd()])]), 2)).not.toHaveProperty('produced');
  });

  it('refuses an End without an outcome, at its path', () => {
    const { outcome: _removed, ...withoutOutcome } = flowEnd();
    expect(problemsOf(configWith([START, flow('build', [agent('implement'), withoutOutcome])]))).toEqual([
      { path: 'pipeline.blocks[1].blocks[2].outcome', message: 'is required' },
    ]);
  });

  it.each([
    ['another value', 'failed'],
    ['a value of the wrong case', 'Done'],
    ['a non-string value', 1],
  ])('refuses an outcome that is %s', (_label, outcome) => {
    expect(problemsOf(configWith([START, flow('build', [agent('implement'), flowEnd({ outcome })])]))).toEqual([
      { path: 'pipeline.blocks[1].blocks[2].outcome', message: 'must be done or stopped' },
    ]);
  });

  it('refuses a produced artifact that is not a string', () => {
    expect(problemsOf(configWith([START, flow('build', [agent('implement'), flowEnd({ produced: 7 })])]))).toEqual([
      { path: 'pipeline.blocks[1].blocks[2].produced', message: 'must be a string' },
    ]);
  });

  it('refuses an unknown key inside an End, at the key path', () => {
    expect(problemsOf(configWith([START, flow('build', [agent('implement'), flowEnd({ message: 'x' })])]))).toEqual([
      { path: 'pipeline.blocks[1].blocks[2].message', message: 'is not a known key' },
    ]);
  });

  it('accepts a pipeline End with an outcome', () => {
    expect(pipelineBlockAt(twoFlows({ kind: 'connection', id: 'c', enabled: true, from: 'build', to: 'review', artifact: 'a' }), 4)).toEqual(END);
  });
});
