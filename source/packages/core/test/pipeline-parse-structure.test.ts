import { describe, expect, it } from 'vitest';
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';

/** A child flow that passes the structure rules: one Start and one End. */
function flow(id: string, extra: Record<string, unknown>[] = []): Record<string, unknown> {
  return {
    kind: 'flow',
    id,
    name: `${id} flow`,
    enabled: true,
    blocks: [
      { kind: 'start', id: `${id}-start`, enabled: true },
      ...extra,
      { kind: 'end', id: `${id}-end`, enabled: true, outcome: 'done' },
    ],
  };
}

/** A config whose pipeline holds the given blocks. Tests change one part of a fresh copy. */
function configWith(blocks: unknown[]): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: { name: 'main-pipeline', blocks },
  };
}

/** A pipeline that passes every structure rule: a Start, one flow, and an End. */
function validBlocks(): Record<string, unknown>[] {
  return [
    { kind: 'start', id: 'start', enabled: true, arguments: [] },
    flow('build', [{ kind: 'agent', id: 'implement', enabled: true, name: 'implement', scope: 'task' }]),
    { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
  ];
}

function problemsOf(value: unknown): PipelineProblem[] {
  const result = parsePipelineConfig(value);
  if (result.ok) throw new Error('expected the config to be refused');
  return result.problems;
}

describe('F-01 AC-002 a Flow block is allowed in the pipeline and refused inside a child flow', () => {
  it('accepts a child flow in the pipeline', () => {
    expect(parsePipelineConfig(configWith(validBlocks())).ok).toBe(true);
  });

  it('refuses a Flow block inside a child flow, at the path of its kind', () => {
    const blocks = [
      { kind: 'start', id: 'start', enabled: true, arguments: [] },
      flow('build', [flow('inner')]),
      { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
    ];
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].kind', message: 'is not allowed in a child flow' },
    ]);
  });
});

describe('F-01 AC-003 the block kinds are the six of the model; any other kind is refused with its path', () => {
  it.each(['agent', 'condition', 'connection', 'end'])('accepts %s inside a child flow', (kind) => {
    const block = { kind, id: `b-${kind}`, enabled: true, name: `a-${kind}`, scope: 'task' };
    const result = parsePipelineConfig(configWith([flow('build', [block]), ...startEnd()]));
    expect(paths(result)).not.toContain('pipeline.blocks[0].blocks[1].kind');
  });

  it.each(['condition', 'connection', 'end'])('accepts %s in the pipeline', (kind) => {
    const blocks = [
      { kind: 'start', id: 'start', enabled: true, arguments: [] },
      { kind, id: `b-${kind}`, enabled: true, from: 'start', to: 'end', artifact: 'x' },
      { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
    ];
    expect(paths(parsePipelineConfig(configWith(blocks)))).not.toContain('pipeline.blocks[1].kind');
  });

  it('refuses an Agent block in the pipeline, at the path of its kind', () => {
    const blocks = validBlocks();
    blocks.splice(1, 0, { kind: 'agent', id: 'loose', enabled: true, name: 'loose', scope: 'task' });
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[1].kind', message: 'is not allowed in the pipeline' },
    ]);
  });

  it.each(['loop', 'Start', 'skill', ''])('refuses the unknown kind %j with a problem naming the path', (kind) => {
    const blocks = validBlocks();
    blocks.splice(1, 0, { kind, id: 'odd', enabled: true });
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[1].kind', message: 'is not a known block kind' },
    ]);
  });

  it.each([42, null, true])('refuses the non-string kind %j at the path of its kind', (kind) => {
    const blocks = validBlocks();
    blocks.splice(1, 0, { kind, id: 'odd', enabled: true });
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[1].kind', message: 'is not a known block kind' },
    ]);
  });

  it('refuses a block without a kind at the path of the missing kind', () => {
    const blocks = validBlocks();
    blocks.splice(1, 0, { id: 'nameless', enabled: true });
    expect(problemsOf(configWith(blocks))).toEqual([{ path: 'pipeline.blocks[1].kind', message: 'is required' }]);
  });

  it('refuses an unknown kind inside a child flow at the path of its kind', () => {
    const build = flow('build', [{ kind: 'loop', id: 'spin', enabled: true }]);
    expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0].blocks[1].kind', message: 'is not a known block kind' },
    ]);
  });
});

describe('F-01 AC-004 every block and flow has an enabled flag that is a boolean', () => {
  it.each([true, false])('accepts enabled %s on a child block and on a flow', (enabled) => {
    const result = parsePipelineConfig(configWith([{ ...flow('build'), enabled }, ...startEnd()]));
    expect(result.ok).toBe(true);
  });

  it('refuses a missing enabled flag on a child block at its path', () => {
    const block = { kind: 'agent', id: 'implement', name: 'implement', scope: 'task' };
    expect(problemsOf(configWith([flow('build', [block]), ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0].blocks[1].enabled', message: 'is required' },
    ]);
  });

  it('refuses a missing enabled flag on a pipeline block at its path', () => {
    const blocks = [{ kind: 'start', id: 'start', arguments: [] }, { kind: 'end', id: 'end', enabled: true, outcome: 'done' }];
    expect(problemsOf(configWith(blocks))).toEqual([{ path: 'pipeline.blocks[0].enabled', message: 'is required' }]);
  });

  it('refuses a missing enabled flag on a flow at its path', () => {
    const build = flow('build');
    delete build['enabled'];
    expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0].enabled', message: 'is required' },
    ]);
  });

  it.each(['yes', 1, 0, null, 'true'])('refuses the non-boolean enabled %j on a pipeline block', (enabled) => {
    const blocks = [{ kind: 'start', id: 'start', enabled, arguments: [] }, { kind: 'end', id: 'end', enabled: true, outcome: 'done' }];
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[0].enabled', message: 'must be true or false' },
    ]);
  });

  it('refuses a non-boolean enabled flag on a flow at its path', () => {
    const build = { ...flow('build'), enabled: 'yes' };
    expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0].enabled', message: 'must be true or false' },
    ]);
  });
});

describe('F-01 AC-022 ids are unique in the project and agent names are unique among agents', () => {
  it('refuses a block id that repeats a block in another flow, at the path of the second', () => {
    const blocks = [
      { kind: 'start', id: 'start', enabled: true, arguments: [] },
      flow('build', [{ kind: 'agent', id: 'review', enabled: true, name: 'review', scope: 'task' }]),
      flow('verify', [{ kind: 'agent', id: 'review', enabled: true, name: 'check', scope: 'feature' }]),
      { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
    ];
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[2].blocks[1].id', message: 'is already used by another block or flow' },
    ]);
  });

  it('refuses a block id that repeats another block id in the same flow, at the path of the second', () => {
    const build = flow('build', [{ kind: 'agent', id: 'build-start', enabled: true, name: 'review', scope: 'task' }]);
    expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0].blocks[1].id', message: 'is already used by another block or flow' },
    ]);
  });

  it('refuses an agent name that repeats an agent name in the same flow, at the path of the second', () => {
    const build = flow('build', [
      { kind: 'agent', id: 'a1', enabled: true, name: 'review', scope: 'task' },
      { kind: 'agent', id: 'a2', enabled: true, name: 'review', scope: 'task' },
    ]);
    expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0].blocks[2].name', message: 'is already used by another agent' },
    ]);
  });

  it('refuses a flow id that repeats a block id of the pipeline, at the path of the second', () => {
    const blocks = [
      { kind: 'start', id: 'build', enabled: true, arguments: [] },
      flow('build'),
      { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
    ];
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[1].id', message: 'is already used by another block or flow' },
    ]);
  });

  it('refuses an agent name that repeats an agent name in another flow, at the path of the second', () => {
    const blocks = [
      { kind: 'start', id: 'start', enabled: true, arguments: [] },
      flow('build', [{ kind: 'agent', id: 'a1', enabled: true, name: 'review', scope: 'task' }]),
      flow('verify', [{ kind: 'agent', id: 'a2', enabled: true, name: 'review', scope: 'feature' }]),
      { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
    ];
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[2].blocks[1].name', message: 'is already used by another agent' },
    ]);
  });

  it('accepts two agents in one flow whose names differ', () => {
    const blocks = [
      { kind: 'start', id: 'start', enabled: true, arguments: [] },
      flow('build', [
        { kind: 'agent', id: 'a1', enabled: true, name: 'review', scope: 'task' },
        { kind: 'agent', id: 'a2', enabled: true, name: 'test', scope: 'task' },
      ]),
      { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
    ];
    expect(parsePipelineConfig(configWith(blocks)).ok).toBe(true);
  });

  it('refuses an agent name that is not an id, at the name path', () => {
    const blocks = [
      { kind: 'start', id: 'start', enabled: true, arguments: [] },
      flow('build', [{ kind: 'agent', id: 'a1', enabled: true, name: 'Review Agent', scope: 'task' }]),
      { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
    ];
    expect(problemsOf(configWith(blocks))).toEqual([
      {
        path: 'pipeline.blocks[1].blocks[1].name',
        message: 'must be lowercase letters, digits and hyphens, starting with a letter',
      },
    ]);
  });
});

describe('F-01 AC-021 block and flow ids follow the id rule', () => {
  it.each(['Build', 'build flow', 'build/flow', 'build.flow', '1build'])(
    'refuses the block id %j at the id path',
    (id) => {
      const build = flow('build', [{ kind: 'agent', id, enabled: true, name: 'review', scope: 'task' }]);
      expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
        {
          path: 'pipeline.blocks[0].blocks[1].id',
          message: 'must be lowercase letters, digits and hyphens, starting with a letter',
        },
      ]);
    },
  );

  it.each(['Build', '../build', 'build.flow'])('refuses the flow id %j at the id path', (id) => {
    const build = { ...flow('build'), id };
    expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
      {
        path: 'pipeline.blocks[0].id',
        message: 'must be lowercase letters, digits and hyphens, starting with a letter',
      },
    ]);
  });

  it('refuses a pipeline block id that is not an id, at the id path', () => {
    const blocks = [{ kind: 'start', id: 'Start Here', enabled: true, arguments: [] }, { kind: 'end', id: 'end', enabled: true, outcome: 'done' }];
    expect(problemsOf(configWith(blocks))).toEqual([
      {
        path: 'pipeline.blocks[0].id',
        message: 'must be lowercase letters, digits and hyphens, starting with a letter',
      },
    ]);
  });
});

describe('F-01 AC-012 each list of blocks has exactly one Start and at least one End', () => {
  it('refuses a pipeline without a Start, at the blocks path', () => {
    expect(problemsOf(configWith([{ kind: 'end', id: 'end', enabled: true, outcome: 'done' }]))).toEqual([
      { path: 'pipeline.blocks', message: 'must contain exactly one start block' },
    ]);
  });

  it('refuses a pipeline with a second Start, at the kind path of the second', () => {
    const blocks = [...startEnd(), { kind: 'start', id: 'again', enabled: true, arguments: [] }];
    expect(problemsOf(configWith(blocks))).toEqual([
      { path: 'pipeline.blocks[2].kind', message: 'is a second start block; a list has exactly one' },
    ]);
  });

  it('refuses a pipeline without an End', () => {
    expect(problemsOf(configWith([{ kind: 'start', id: 'start', enabled: true, arguments: [] }]))).toEqual([
      { path: 'pipeline.blocks', message: 'must contain at least one end block' },
    ]);
  });

  it('refuses a child flow without a Start, at its blocks path', () => {
    const build = { kind: 'flow', id: 'build', name: 'build', enabled: true, blocks: [{ kind: 'end', id: 'build-end', enabled: true, outcome: 'done' }] };
    expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0].blocks', message: 'must contain exactly one start block' },
    ]);
  });

  it('refuses a child flow without an End, at its blocks path', () => {
    const build = { kind: 'flow', id: 'build', name: 'build', enabled: true, blocks: [{ kind: 'start', id: 'build-start', enabled: true }] };
    expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0].blocks', message: 'must contain at least one end block' },
    ]);
  });

  it('refuses a child flow with a second Start, at the kind path of the second', () => {
    const build = flow('build', [{ kind: 'start', id: 'again', enabled: true }]);
    expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0].blocks[1].kind', message: 'is a second start block; a list has exactly one' },
    ]);
  });
});

describe('F-01 AC-003 a block that is not an object, or a blocks value that is not a list, gives one problem at its path', () => {
  it('refuses a flow whose blocks are not a list', () => {
    const build = { kind: 'flow', id: 'build', name: 'build', enabled: true, blocks: 'none' };
    expect(problemsOf(configWith([build, ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0].blocks', message: 'must be a list' },
    ]);
  });

  it('refuses a block that is not an object at its path', () => {
    expect(problemsOf(configWith(['start', ...startEnd()]))).toEqual([
      { path: 'pipeline.blocks[0]', message: 'must be an object' },
    ]);
  });
});

/** The Start and End of the pipeline, for tests that only need a valid pipeline around one flow. */
function startEnd(): Record<string, unknown>[] {
  return [
    { kind: 'start', id: 'start', enabled: true, arguments: [] },
    { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
  ];
}

function paths(result: ReturnType<typeof parsePipelineConfig>): string[] {
  return result.ok ? [] : result.problems.map((problem) => problem.path);
}

describe('F-01 AC-003 the success result carries the blocks that passed the checks, with their kind, id and flag', () => {
  it('returns the pipeline blocks in order, and each flow with its child blocks in order', () => {
    const result = parsePipelineConfig(configWith(validBlocks()));
    if (!result.ok) throw new Error('expected the config to be accepted');
    const blocks = result.config.pipeline.blocks;
    expect(blocks.map((block) => [block.kind, block.id, block.enabled])).toEqual([
      ['start', 'start', true],
      ['flow', 'build', true],
      ['end', 'end', true],
    ]);
    const build = blocks[1];
    if (build?.kind !== 'flow') throw new Error('expected a flow block at index 1');
    expect(build.blocks.map((block) => block.kind)).toEqual(['start', 'agent', 'end']);
  });
});
