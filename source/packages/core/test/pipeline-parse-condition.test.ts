import { describe, expect, it } from 'vitest';
import type { ChildBlock, PipelineBlock } from '../src/pipeline/model.js';
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';

const START = { kind: 'start', id: 'start', enabled: true, arguments: [] };
const END = { kind: 'end', id: 'end', enabled: true, outcome: 'done' };

/** A child flow: its own Start and End around the given blocks. */
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
  return { kind: 'agent', id, enabled: true, name: id, scope: 'task', description: 'test job' };
}

/** A Condition with a valid default; the overrides change one part of a fresh copy. */
function check(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: 'condition',
    id: 'check',
    enabled: true,
    checkType: 'approval',
    decidedBy: 'human',
    passRoute: { kind: 'next' },
    failRoute: { kind: 'stop' },
    ...overrides,
  };
}

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

/** A pipeline with one child flow named `build`, holding the given blocks. The Condition at index 1 is `pipeline.blocks[1].blocks[1]`. */
function withFlow(childBlocks: Record<string, unknown>[]): Record<string, unknown> {
  return configWith([START, flow('build', childBlocks), END]);
}

function problemsOf(value: unknown): PipelineProblem[] {
  const result = parsePipelineConfig(value);
  if (result.ok) throw new Error('expected the config to be refused');
  return result.problems;
}

/** The block at `index` of the `build` flow, as parsed. */
function buildBlock(value: unknown, index: number): ChildBlock {
  const result = parsePipelineConfig(value);
  if (!result.ok) throw new Error('expected the config to pass');
  const second = result.config.pipeline.blocks[1];
  if (second?.kind !== 'flow') throw new Error('expected a flow at index 1');
  const block = second.blocks[index];
  if (block === undefined) throw new Error(`expected a block at index ${index}`);
  return block;
}

const CHECK_PATH = 'pipeline.blocks[1].blocks[1]';

describe('F-01 AC-005 the check type is approval, checks, review or diff-size; any other value is refused at its path', () => {
  it.each([
    ['approval', {}],
    ['checks', {}],
    ['review', {}],
    ['diff-size', { threshold: 5 }],
  ])('accepts check type %s and keeps it on the parsed Condition', (checkType, extra) => {
    const block = buildBlock(withFlow([check({ checkType, ...extra })]), 1);
    expect(block).toMatchObject({ kind: 'condition', checkType });
  });

  it.each([
    ['another value', 'lint'],
    ['a value of the wrong case', 'Approval'],
    ['an empty string', ''],
    ['a non-string value', 3],
  ])('refuses %s at the path of the check type', (_label, checkType) => {
    expect(problemsOf(withFlow([check({ checkType })]))).toEqual([
      { path: `${CHECK_PATH}.checkType`, message: 'must be approval, checks, review or diff-size' },
    ]);
  });

  it('refuses a Condition without a check type', () => {
    const { checkType: _removed, ...withoutType } = check();
    expect(problemsOf(withFlow([withoutType]))).toEqual([{ path: `${CHECK_PATH}.checkType`, message: 'is required' }]);
  });

  it('refuses an unknown key inside a Condition, at the key path', () => {
    expect(problemsOf(withFlow([check({ description: 'what passing means' })]))).toEqual([
      { path: `${CHECK_PATH}.description`, message: 'is not a known key' },
    ]);
  });
});

describe('F-01 AC-006 diff-size takes a whole-number threshold of at least 1; the other check types take none', () => {
  it.each([1, 250])('accepts a diff-size threshold of %i and keeps it', (threshold) => {
    const block = buildBlock(withFlow([check({ checkType: 'diff-size', threshold })]), 1);
    expect(block).toMatchObject({ checkType: 'diff-size', threshold });
  });

  it.each([
    ['zero', 0],
    ['a negative number', -3],
    ['a fraction', 1.5],
    ['NaN', Number.NaN],
    ['a string', '10'],
  ])('refuses a diff-size threshold that is %s', (_label, threshold) => {
    expect(problemsOf(withFlow([check({ checkType: 'diff-size', threshold })]))).toEqual([
      { path: `${CHECK_PATH}.threshold`, message: 'must be a whole number of at least 1' },
    ]);
  });

  it('refuses a diff-size check without a threshold', () => {
    expect(problemsOf(withFlow([check({ checkType: 'diff-size' })]))).toEqual([
      { path: `${CHECK_PATH}.threshold`, message: 'is required' },
    ]);
  });

  it.each(['approval', 'checks', 'review'])('refuses a threshold on a %s check', (checkType) => {
    expect(problemsOf(withFlow([check({ checkType, threshold: 5 })]))).toEqual([
      { path: `${CHECK_PATH}.threshold`, message: 'is only for diff-size' },
    ]);
  });

  it('reports a bad threshold together with a bad decided by, in one parse', () => {
    expect(problemsOf(withFlow([check({ checkType: 'diff-size', threshold: 0, decidedBy: 'bot' })]))).toEqual([
      { path: `${CHECK_PATH}.threshold`, message: 'must be a whole number of at least 1' },
      { path: `${CHECK_PATH}.decidedBy`, message: 'must be human or agent' },
    ]);
  });
});

describe('F-01 AC-007 decided by is human or agent and is required', () => {
  it.each(['human', 'agent'])('accepts decided by %s and keeps it', (decidedBy) => {
    expect(buildBlock(withFlow([check({ decidedBy })]), 1)).toMatchObject({ decidedBy });
  });

  it.each([
    ['another value', 'bot'],
    ['a value of the wrong case', 'Human'],
    ['an empty string', ''],
    ['a non-string value', true],
  ])('refuses %s at the path of decided by', (_label, decidedBy) => {
    expect(problemsOf(withFlow([check({ decidedBy })]))).toEqual([
      { path: `${CHECK_PATH}.decidedBy`, message: 'must be human or agent' },
    ]);
  });

  it('refuses a Condition without decided by', () => {
    const { decidedBy: _removed, ...withoutDecider } = check();
    expect(problemsOf(withFlow([withoutDecider]))).toEqual([{ path: `${CHECK_PATH}.decidedBy`, message: 'is required' }]);
  });
});

describe('F-01 AC-008 the pass and fail routes are required; next, stop, or back to an earlier block of the same flow', () => {
  it('accepts next and stop routes', () => {
    expect(buildBlock(withFlow([check({ passRoute: { kind: 'stop' }, failRoute: { kind: 'next' } })]), 1)).toMatchObject({
      passRoute: { kind: 'stop' },
      failRoute: { kind: 'next' },
    });
  });

  it('accepts a back route to an earlier block of the same flow and keeps the block id', () => {
    const block = buildBlock(withFlow([agent('implement'), check({ failRoute: { kind: 'back', blockId: 'implement' } })]), 2);
    expect(block).toMatchObject({ failRoute: { kind: 'back', blockId: 'implement' } });
  });

  it('refuses a back route to a later block', () => {
    expect(problemsOf(withFlow([check({ failRoute: { kind: 'back', blockId: 'later' } }), agent('later')]))).toEqual([
      { path: `${CHECK_PATH}.failRoute.blockId`, message: 'must name an earlier block in the same list' },
    ]);
  });

  it('refuses a back route to the Condition itself', () => {
    expect(problemsOf(withFlow([check({ passRoute: { kind: 'back', blockId: 'check' } })]))).toEqual([
      { path: `${CHECK_PATH}.passRoute.blockId`, message: 'must name an earlier block in the same list' },
    ]);
  });

  it('refuses a back route to a block of another flow', () => {
    const config = configWith([START, flow('plan', [agent('draft')]), flow('build', [check({ passRoute: { kind: 'back', blockId: 'draft' } })]), END]);
    expect(problemsOf(config)).toEqual([
      { path: 'pipeline.blocks[2].blocks[1].passRoute.blockId', message: 'must name an earlier block in the same list' },
    ]);
  });

  it('refuses a back route to an id that no block of the list has', () => {
    expect(problemsOf(withFlow([agent('implement'), check({ failRoute: { kind: 'back', blockId: 'nowhere' } })]))).toEqual([
      { path: 'pipeline.blocks[1].blocks[2].failRoute.blockId', message: 'must name an earlier block in the same list' },
    ]);
  });

  it('refuses a back route without a block id', () => {
    expect(problemsOf(withFlow([agent('implement'), check({ failRoute: { kind: 'back' } })]))).toEqual([
      { path: 'pipeline.blocks[1].blocks[2].failRoute.blockId', message: 'is required' },
    ]);
  });

  it.each(['passRoute', 'failRoute'])('refuses a Condition without %s', (key) => {
    const { [key]: _removed, ...withoutRoute } = check();
    expect(problemsOf(withFlow([withoutRoute]))).toEqual([{ path: `${CHECK_PATH}.${key}`, message: 'is required' }]);
  });

  it('refuses a route kind that is not next, stop or back', () => {
    expect(problemsOf(withFlow([check({ passRoute: { kind: 'retry' } })]))).toEqual([
      { path: `${CHECK_PATH}.passRoute.kind`, message: 'must be next, stop or back' },
    ]);
  });

  it('refuses a block id on a next route, at the key path', () => {
    expect(problemsOf(withFlow([check({ passRoute: { kind: 'next', blockId: 'start' } })]))).toEqual([
      { path: `${CHECK_PATH}.passRoute.blockId`, message: 'is not a known key' },
    ]);
  });

  it('refuses a route that is not an object', () => {
    expect(problemsOf(withFlow([check({ failRoute: 'stop' })]))).toEqual([
      { path: `${CHECK_PATH}.failRoute`, message: 'must be an object' },
    ]);
  });
});

describe('F-01 AC-009 the round limit is optional; when given it is a whole number of at least 1', () => {
  it('leaves the round limit out of the model when it is absent', () => {
    const block = buildBlock(withFlow([check()]), 1);
    expect(block).not.toHaveProperty('roundLimit');
  });

  it.each([1, 3])('accepts a round limit of %i and keeps it', (roundLimit) => {
    expect(buildBlock(withFlow([check({ roundLimit })]), 1)).toMatchObject({ roundLimit });
  });

  it.each([
    ['zero', 0],
    ['a negative number', -1],
    ['a fraction', 2.5],
    ['a string', '2'],
    ['null', null],
  ])('refuses a round limit that is %s', (_label, roundLimit) => {
    expect(problemsOf(withFlow([check({ roundLimit })]))).toEqual([
      { path: `${CHECK_PATH}.roundLimit`, message: 'must be a whole number of at least 1' },
    ]);
  });
});

/** A pipeline with a gate between two flows, which sits on the connection `build-to-review`. */
function gateWith(condition: Record<string, unknown>, connection: Record<string, unknown> = connectionBlock()): Record<string, unknown> {
  return configWith([
    START,
    flow('build', [agent('implement')]),
    condition,
    connection,
    flow('review', [agent('review-it')]),
    END,
  ]);
}

function connectionBlock(): Record<string, unknown> {
  return { kind: 'connection', id: 'build-to-review', enabled: true, from: 'build', to: 'review', artifact: 'plan' };
}

function gate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return check({ id: 'gate', onConnection: 'build-to-review', ...overrides });
}

function pipelineBlockAt(value: unknown, index: number): PipelineBlock {
  const result = parsePipelineConfig(value);
  if (!result.ok) throw new Error('expected the config to pass');
  const block = result.config.pipeline.blocks[index];
  if (block === undefined) throw new Error(`expected a block at index ${index}`);
  return block;
}

describe('F-01 AC-027 pipeline gate: a Condition between flows names the pipeline connection it sits on', () => {
  it('accepts a gate that names a connection of the pipeline and keeps the name', () => {
    expect(pipelineBlockAt(gateWith(gate()), 2)).toMatchObject({ kind: 'condition', onConnection: 'build-to-review' });
  });

  it('refuses a gate without onConnection, at its path', () => {
    const { onConnection: _removed, ...withoutConnection } = gate();
    expect(problemsOf(gateWith(withoutConnection))).toEqual([{ path: 'pipeline.blocks[2].onConnection', message: 'is required' }]);
  });

  it('refuses a gate whose onConnection names a flow, not a connection', () => {
    expect(problemsOf(gateWith(gate({ onConnection: 'build' })))).toEqual([
      { path: 'pipeline.blocks[2].onConnection', message: 'must name a connection block of the pipeline' },
    ]);
  });

  it('refuses a gate whose onConnection names no block of the pipeline', () => {
    expect(problemsOf(gateWith(gate({ onConnection: 'nowhere' })))).toEqual([
      { path: 'pipeline.blocks[2].onConnection', message: 'must name a connection block of the pipeline' },
    ]);
  });

  it('refuses onConnection on a Condition inside a child flow, as an unknown key', () => {
    expect(problemsOf(withFlow([check({ onConnection: 'build-to-review' })]))).toEqual([
      { path: `${CHECK_PATH}.onConnection`, message: 'is not a known key' },
    ]);
  });
});

describe('F-01 AC-008 a back route names an earlier item of its own list: a pipeline gate may name an earlier flow, a child Condition only its own blocks', () => {
  it('accepts a pipeline gate whose fail route goes back to an earlier flow of the pipeline', () => {
    expect(pipelineBlockAt(gateWith(gate({ failRoute: { kind: 'back', blockId: 'build' } })), 2)).toMatchObject({
      failRoute: { kind: 'back', blockId: 'build' },
    });
  });

  it('refuses a pipeline gate whose back route goes to a later flow', () => {
    expect(problemsOf(gateWith(gate({ failRoute: { kind: 'back', blockId: 'review' } })))).toEqual([
      { path: 'pipeline.blocks[2].failRoute.blockId', message: 'must name an earlier block in the same list' },
    ]);
  });

  it('refuses a pipeline gate whose back route names a block inside a child flow', () => {
    expect(problemsOf(gateWith(gate({ failRoute: { kind: 'back', blockId: 'implement' } })))).toEqual([
      { path: 'pipeline.blocks[2].failRoute.blockId', message: 'must name an earlier block in the same list' },
    ]);
  });

  it('refuses a child Condition whose back route names a sibling flow of the pipeline', () => {
    const config = configWith([START, flow('plan', [agent('draft')]), flow('build', [check({ failRoute: { kind: 'back', blockId: 'plan' } })]), END]);
    expect(problemsOf(config)).toEqual([
      { path: 'pipeline.blocks[2].blocks[1].failRoute.blockId', message: 'must name an earlier block in the same list' },
    ]);
  });

  it('refuses a child Condition whose back route names the pipeline Start', () => {
    expect(problemsOf(withFlow([check({ passRoute: { kind: 'back', blockId: 'start' } })]))).toEqual([
      { path: `${CHECK_PATH}.passRoute.blockId`, message: 'must name an earlier block in the same list' },
    ]);
  });
});
