import { describe, expect, it } from 'vitest';
import type { AgentBlock, ChildBlock } from '../src/pipeline/model.js';
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';

/** A child flow with one Agent block carrying the given fields, plus its Start and End. */
function flow(agentFields: Record<string, unknown>): Record<string, unknown> {
  return {
    kind: 'flow',
    id: 'build',
    name: 'Build',
    description: 'A flow description.',
    enabled: true,
    blocks: [
      { kind: 'start', id: 'build-start', enabled: true },
      { kind: 'agent', id: 'build-implement', enabled: true, name: 'implement', scope: 'task', description: 'Implements.', ...agentFields },
      { kind: 'end', id: 'build-end', enabled: true, outcome: 'done' },
    ],
  };
}

/** A pipeline that passes every rule: a Start, the build flow, and an End. */
function configWith(agentFields: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: {
      name: 'main-pipeline',
      blocks: [
        { kind: 'start', id: 'start', enabled: true, arguments: [] },
        flow(agentFields),
        { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
      ],
    },
    rules: [],
  };
}

function problemsOf(value: unknown): PipelineProblem[] {
  const result = parsePipelineConfig(value);
  if (result.ok) throw new Error('expected the config to be refused');
  return result.problems;
}

/** The Agent block of the build flow, as parsed. */
function parsedAgent(value: unknown): AgentBlock {
  const result = parsePipelineConfig(value);
  if (!result.ok) throw new Error('expected the config to pass');
  const build = result.config.pipeline.blocks[1];
  if (build?.kind !== 'flow') throw new Error('expected a flow at index 1');
  const agent = build.blocks.find((block: ChildBlock) => block.kind === 'agent');
  if (agent?.kind !== 'agent') throw new Error('expected an Agent block');
  return agent;
}

describe('F-06 AC-023 an Agent block takes optional reads and writes lists of artifact names', () => {
  it('keeps the reads and writes lists on the parsed Agent block', () => {
    const agent = parsedAgent(configWith({ reads: ['feature-spec', 'plan'], writes: ['code'] }));
    expect(agent.reads).toEqual(['feature-spec', 'plan']);
    expect(agent.writes).toEqual(['code']);
  });

  it('keeps an empty list as an empty list', () => {
    const agent = parsedAgent(configWith({ reads: [], writes: [] }));
    expect(agent.reads).toEqual([]);
    expect(agent.writes).toEqual([]);
  });

  it('sets neither key when the block has no reads and writes', () => {
    const agent = parsedAgent(configWith({}));
    expect(agent).not.toHaveProperty('reads');
    expect(agent).not.toHaveProperty('writes');
  });

  it('accepts the same artifact name in reads and in writes', () => {
    const agent = parsedAgent(configWith({ reads: ['notes'], writes: ['notes'] }));
    expect(agent.reads).toEqual(['notes']);
    expect(agent.writes).toEqual(['notes']);
  });

  it('keeps reads and writes when only one of them is set', () => {
    const agent = parsedAgent(configWith({ writes: ['code'] }));
    expect(agent.writes).toEqual(['code']);
    expect(agent).not.toHaveProperty('reads');
  });

  it.each([
    ['an empty name', [''], 0],
    ['a name of spaces only', ['feature-spec', '   '], 1],
  ])('refuses %s in reads at the path of that item', (_label, reads, index) => {
    expect(problemsOf(configWith({ reads }))).toEqual([
      { path: `pipeline.blocks[1].blocks[1].reads[${index}]`, message: 'must not be blank' },
    ]);
  });

  it('refuses a blank name in writes at the path of that item', () => {
    expect(problemsOf(configWith({ writes: ['code', ' '] }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].writes[1]', message: 'must not be blank' },
    ]);
  });

  it.each([
    ['a number', 3],
    ['a null', null],
    ['an object', { name: 'plan' }],
  ])('refuses %s in writes as not a string', (_label, item) => {
    expect(problemsOf(configWith({ writes: [item] }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].writes[0]', message: 'must be a string' },
    ]);
  });

  it('refuses a name listed twice in the same list at the second occurrence', () => {
    expect(problemsOf(configWith({ reads: ['plan', 'code', 'plan'] }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].reads[2]', message: 'is listed more than once' },
    ]);
  });

  it('refuses a reads value that is not a list', () => {
    expect(problemsOf(configWith({ reads: 'plan' }))).toEqual([{ path: 'pipeline.blocks[1].blocks[1].reads', message: 'must be a list' }]);
  });

  it('refuses a writes value that is null', () => {
    expect(problemsOf(configWith({ writes: null }))).toEqual([{ path: 'pipeline.blocks[1].blocks[1].writes', message: 'must be a list' }]);
  });

  it('reports every bad item of both lists in one result', () => {
    expect(problemsOf(configWith({ reads: ['plan', 'plan'], writes: [''] }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].reads[1]', message: 'is listed more than once' },
      { path: 'pipeline.blocks[1].blocks[1].writes[0]', message: 'must not be blank' },
    ]);
  });
});
