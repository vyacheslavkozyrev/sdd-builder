import { describe, expect, it } from 'vitest';
import type { ChildBlock } from '../src/pipeline/model.js';
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';

/** A child flow with one Agent block of the given scope, plus its Start and End. */
function flow(id: string, extra: Record<string, unknown>[] = []): Record<string, unknown> {
  return {
    kind: 'flow',
    id,
    name: `${id} flow`,
    description: 'A flow description.',
    enabled: true,
    blocks: [
      { kind: 'start', id: `${id}-start`, enabled: true },
      ...extra,
      { kind: 'end', id: `${id}-end`, enabled: true, outcome: 'done' },
    ],
  };
}

function agent(scope: unknown, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { kind: 'agent', id: 'implement', enabled: true, name: 'implement', scope, description: 'test job', ...extra };
}

/** A config whose pipeline holds the given blocks. Tests change one part of a fresh copy. */
function configWith(blocks: unknown[]): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: { name: 'main-pipeline', blocks },
    rules: [],
  };
}

/** A pipeline Start with the given arguments. */
function pipelineStart(arguments_: unknown): Record<string, unknown> {
  return { kind: 'start', id: 'start', enabled: true, arguments: arguments_ };
}

const FEATURE_ARGUMENT = { name: 'feature-id', required: true, hint: 'the feature to build' };

/** A pipeline that passes every rule: a Start with one argument, one flow holding the given blocks, and an End. */
function validBlocks(childBlocks: Record<string, unknown>[] = [agent('task')]): Record<string, unknown>[] {
  return [
    pipelineStart([FEATURE_ARGUMENT]),
    flow('build', childBlocks),
    { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
  ];
}

function problemsOf(value: unknown): PipelineProblem[] {
  const result = parsePipelineConfig(value);
  if (result.ok) throw new Error('expected the config to be refused');
  return result.problems;
}

/** The blocks of the child flow at pipeline index 1, as parsed. */
function childBlocksOf(value: unknown): ChildBlock[] {
  const result = parsePipelineConfig(value);
  if (!result.ok) throw new Error('expected the config to pass');
  const second = result.config.pipeline.blocks[1];
  if (second?.kind !== 'flow') throw new Error('expected a flow at index 1');
  return second.blocks;
}

describe('F-01 AC-010 every Agent block has a scope of project, feature or task', () => {
  it.each(['project', 'feature', 'task'])('accepts scope %s and keeps it on the parsed Agent block', (scope) => {
    const blocks = childBlocksOf(configWith(validBlocks([agent(scope)])));
    expect(blocks[1]).toEqual({
      kind: 'agent',
      id: 'implement',
      enabled: true,
      name: 'implement',
      scope,
      description: 'test job',
      ruleTags: [],
    });
  });

  it.each([
    ['another value', 'global'],
    ['an empty string', ''],
    ['a value of the wrong case', 'Task'],
    ['a non-string value', 3],
  ])('refuses %s at the path of the scope', (_label, scope) => {
    expect(problemsOf(configWith(validBlocks([agent(scope)])))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].scope', message: 'must be project, feature or task' },
    ]);
  });

  it('refuses an Agent block with no scope at the path of the missing key', () => {
    const block = agent('task');
    delete block['scope'];
    expect(problemsOf(configWith(validBlocks([block])))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].scope', message: 'is required' },
    ]);
  });

  it('refuses an unknown key inside an Agent block at the path of the key', () => {
    expect(problemsOf(configWith(validBlocks([agent('task', { colour: 'blue' })])))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].colour', message: 'is not a known key' },
    ]);
  });

  it('keeps the path of a later Agent block when an earlier Agent block is dropped', () => {
    const blocks = validBlocks([agent('global'), agent('global', { id: 'review', name: 'review' })]);
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].scope', message: 'must be project, feature or task' },
      { path: 'pipeline.blocks[1].blocks[2].scope', message: 'must be project, feature or task' },
    ]);
  });
});

describe('F-01 AC-011 the pipeline Start carries arguments with unique names', () => {
  it('accepts a pipeline Start with arguments and keeps them on the Start block', () => {
    const result = parsePipelineConfig(configWith(validBlocks()));
    if (!result.ok) throw new Error('expected the config to pass');
    expect(result.config.pipeline.blocks[0]).toEqual({
      kind: 'start',
      id: 'start',
      enabled: true,
      arguments: [FEATURE_ARGUMENT],
    });
  });

  it('accepts a pipeline Start with an empty argument list', () => {
    expect(parsePipelineConfig(configWith(validBlocks().map((b, i) => (i === 0 ? pipelineStart([]) : b)))).ok).toBe(true);
  });

  it('refuses a pipeline Start with no arguments key at the path of the key', () => {
    const start = { kind: 'start', id: 'start', enabled: true };
    expect(problemsOf(configWith([start, flow('build', [agent('task')]), { kind: 'end', id: 'end', enabled: true, outcome: 'done' }]))).toEqual([
      { path: 'pipeline.blocks[0].arguments', message: 'is required' },
    ]);
  });

  it.each([
    ['a name with a capital letter', 'Feature-id'],
    ['a name with an underscore', 'feature_id'],
    ['a name starting with a digit', '1feature'],
    ['an empty name', ''],
  ])('refuses %s at the path of the argument name', (_label, name) => {
    expect(problemsOf(configWith(validBlocks([agent('task')]).map((b, i) => (i === 0 ? pipelineStart([{ ...FEATURE_ARGUMENT, name }]) : b))))).toEqual([
      { path: 'pipeline.blocks[0].arguments[0].name', message: 'must be lowercase letters, digits and hyphens, starting with a letter' },
    ]);
  });

  it('refuses a repeated argument name at the path of the second name', () => {
    const args = [FEATURE_ARGUMENT, { name: 'feature-id', required: false, hint: 'again' }];
    expect(problemsOf(configWith(validBlocks().map((b, i) => (i === 0 ? pipelineStart(args) : b))))).toEqual([
      { path: 'pipeline.blocks[0].arguments[1].name', message: 'is already used by another argument' },
    ]);
  });

  it('refuses a required flag that is not a boolean at the path of the flag', () => {
    const args = [{ ...FEATURE_ARGUMENT, required: 'yes' }];
    expect(problemsOf(configWith(validBlocks().map((b, i) => (i === 0 ? pipelineStart(args) : b))))).toEqual([
      { path: 'pipeline.blocks[0].arguments[0].required', message: 'must be true or false' },
    ]);
  });

  it('refuses an argument with no hint at the path of the missing key', () => {
    const args = [{ name: 'feature-id', required: true }];
    expect(problemsOf(configWith(validBlocks().map((b, i) => (i === 0 ? pipelineStart(args) : b))))).toEqual([
      { path: 'pipeline.blocks[0].arguments[0].hint', message: 'is required' },
    ]);
  });

  it('refuses an unknown key inside an argument at the path of the key', () => {
    const args = [{ ...FEATURE_ARGUMENT, default: 'x' }];
    expect(problemsOf(configWith(validBlocks().map((b, i) => (i === 0 ? pipelineStart(args) : b))))).toEqual([
      { path: 'pipeline.blocks[0].arguments[0].default', message: 'is not a known key' },
    ]);
  });

  it('refuses an unknown key on the pipeline Start at the path of the key', () => {
    const start = { ...pipelineStart([FEATURE_ARGUMENT]), extra: true };
    expect(problemsOf(configWith(validBlocks().map((b, i) => (i === 0 ? start : b))))).toEqual([
      { path: 'pipeline.blocks[0].extra', message: 'is not a known key' },
    ]);
  });

  it('keeps the path of a later argument when an earlier argument is dropped', () => {
    const args = [{ ...FEATURE_ARGUMENT, name: 'Bad-name' }, { name: 'next-name', required: 'yes', hint: 'a hint' }];
    expect(problemsOf(configWith(validBlocks().map((b, i) => (i === 0 ? pipelineStart(args) : b))))).toEqual([
      { path: 'pipeline.blocks[0].arguments[0].name', message: 'must be lowercase letters, digits and hyphens, starting with a letter' },
      { path: 'pipeline.blocks[0].arguments[1].required', message: 'must be true or false' },
    ]);
  });
});

describe('F-01 AC-012 a child Start carries no arguments; the pipeline Start is required', () => {
  it('accepts a child Start without arguments and keeps it as a Start block', () => {
    expect(childBlocksOf(configWith(validBlocks()))[0]).toEqual({ kind: 'start', id: 'build-start', enabled: true });
  });

  it('refuses arguments on a child Start at the path of the key', () => {
    const childStart = { kind: 'start', id: 'build-start', enabled: true, arguments: [FEATURE_ARGUMENT] };
    const blocks = [
      pipelineStart([FEATURE_ARGUMENT]),
      { kind: 'flow', id: 'build', name: 'build flow', description: 'A flow description.', enabled: true, blocks: [childStart, { kind: 'end', id: 'build-end', enabled: true, outcome: 'done' }] },
      { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
    ];
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[1].blocks[0].arguments', message: 'is not a known key' },
    ]);
  });

  it('keeps the path of a later block when a child Start with arguments is dropped', () => {
    const childStart = { kind: 'start', id: 'build-start', enabled: true, arguments: [FEATURE_ARGUMENT] };
    const blocks = [
      pipelineStart([FEATURE_ARGUMENT]),
      {
        kind: 'flow',
        id: 'build',
        name: 'build flow',
        description: 'A flow description.',
        enabled: true,
        blocks: [childStart, agent('global'), { kind: 'end', id: 'build-end', enabled: true, outcome: 'done' }],
      },
      { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
    ];
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[1].blocks[0].arguments', message: 'is not a known key' },
      { path: 'pipeline.blocks[1].blocks[1].scope', message: 'must be project, feature or task' },
    ]);
  });

  it('refuses a child flow with no Start block at the path of its block list', () => {
    const blocks = [
      pipelineStart([FEATURE_ARGUMENT]),
      {
        kind: 'flow',
        id: 'build',
        name: 'build flow',
        description: 'A flow description.',
        enabled: true,
        blocks: [agent('task'), { kind: 'end', id: 'build-end', enabled: true, outcome: 'done' }],
      },
      { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
    ];
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[1].blocks', message: 'must contain exactly one start block' },
    ]);
  });

  it('refuses a pipeline with no Start block at the path of its block list', () => {
    const blocks = [flow('build', [agent('task')]), { kind: 'end', id: 'end', enabled: true, outcome: 'done' }];
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks', message: 'must contain exactly one start block' },
    ]);
  });
});
