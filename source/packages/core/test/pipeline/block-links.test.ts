import { describe, expect, it } from 'vitest';
import { checkBlockLinks } from '../../src/pipeline/check/block-links.js';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readPipeline } from '../../src/pipeline/parse/pipeline.js';
import type { Block, Flow, ProjectConfig, Route } from '../../src/pipeline/model.js';

// The items of a fixture are numbered by position, as a parsed document numbers them (model `index`).
function numbered<T extends { readonly index: number }>(items: readonly T[]): T[] {
  return items.map((item, index) => ({ ...item, index }));
}

const start = (id: string, next: string): Block => ({ index: 0, id, kind: 'start', next });
const agent = (id: string, next: string): Block => ({
  index: 0,
  id,
  kind: 'agent',
  name: id,
  description: 'Agent',
  arguments: [],
  next,
});
const condition = (id: string, onTrue: Route, onFalse: Route): Block => ({
  index: 0,
  id,
  kind: 'condition',
  description: 'Check',
  true: onTrue,
  false: onFalse,
});
const end = (id: string): Block => ({ index: 0, id, kind: 'end', outcome: 'done', producedArtifact: 'Plan' });

function flow(id: string, blocks: Block[]): Flow {
  return {
    index: 0,
    id,
    name: id,
    arguments: [],
    body: 'Body',
    artifacts: [],
    approval: false,
    blocks: numbered(blocks),
  };
}

function config(...flows: Flow[]): Pick<ProjectConfig, 'pipeline'> {
  return { pipeline: { name: 'Pipeline', description: 'Desc', arguments: [], flows: numbered(flows) } };
}

const STOP: Route = { stop: true };

describe('F-02 AC-045 a start next names an agent or a condition of the same flow', () => {
  it('accepts a start whose next names an agent of the flow', () => {
    expect(checkBlockLinks(config(flow('plan', [start('s', 'a'), agent('a', 'e'), end('e')])))).toEqual([]);
  });

  it('accepts a start whose next names a condition of the flow', () => {
    const blocks = [start('s', 'c'), condition('c', { to: 'e' }, STOP), end('e')];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([]);
  });

  it('refuses a start whose next names the end block, at the path of next', () => {
    expect(checkBlockLinks(config(flow('plan', [start('s', 'e'), end('e')])))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.0.next',
        message: 'must name an agent or a condition of this flow, got the end block e',
      },
    ]);
  });

  it('refuses a start whose next names the start block itself, at the path of next', () => {
    expect(checkBlockLinks(config(flow('plan', [start('s', 's'), end('e')])))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.0.next',
        message: 'must name an agent or a condition of this flow, got the start block s',
      },
    ]);
  });
});

describe('F-02 AC-046 a start next that names another flow or no block is refused at next', () => {
  it('refuses a start whose next names a block of another flow', () => {
    const result = checkBlockLinks(
      config(
        flow('plan', [start('s', 'b'), end('e')]),
        flow('build', [start('s2', 'b2'), agent('b2', 'e2'), agent('b', 'e2'), end('e2')]),
      ),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.0.next',
        message: 'must name a block of this flow, got b, which is a block of another flow',
      },
    ]);
  });

  it('refuses a start whose next is an id that is no block', () => {
    expect(checkBlockLinks(config(flow('plan', [start('s', 'nowhere'), end('e')])))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.0.next',
        message: 'must name a block of this flow, got nowhere, which is no block of the pipeline',
      },
    ]);
  });
});

describe('F-02 AC-054 an agent next names an agent, a condition or the end of the same flow', () => {
  it.each([
    ['an agent', [start('s', 'a'), agent('a', 'b'), agent('b', 'e'), end('e')]],
    ['a condition', [start('s', 'a'), agent('a', 'c'), condition('c', { to: 'e' }, STOP), end('e')]],
    ['the end', [start('s', 'a'), agent('a', 'e'), end('e')]],
  ])('accepts an agent whose next names %s of the flow', (_label, blocks) => {
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([]);
  });

  it('refuses an agent whose next names the start block, at the path of next', () => {
    expect(checkBlockLinks(config(flow('plan', [start('s', 'a'), agent('a', 's'), end('e')])))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.next',
        message: 'must name an agent, a condition or the end of this flow, got the start block s',
      },
    ]);
  });

  it('refuses an agent whose next names a block of another flow, at the path of next', () => {
    const result = checkBlockLinks(
      config(
        flow('plan', [start('s', 'a'), agent('a', 'other'), end('e')]),
        flow('build', [start('s2', 'other'), agent('other', 'e2'), end('e2')]),
      ),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.next',
        message: 'must name a block of this flow, got other, which is a block of another flow',
      },
    ]);
  });

  it('refuses an agent whose next is an id that is no block, at the path of next', () => {
    expect(checkBlockLinks(config(flow('plan', [start('s', 'a'), agent('a', 'ghost'), end('e')])))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.next',
        message: 'must name a block of this flow, got ghost, which is no block of the pipeline',
      },
    ]);
  });
});

describe('F-02 AC-059 a plain route names a later block of the same flow', () => {
  it('accepts a route to a later agent, a later condition and the end', () => {
    const blocks = [
      start('s', 'a'),
      agent('a', 'c1'),
      condition('c1', { to: 'b' }, STOP),
      agent('b', 'c2'),
      condition('c2', { to: 'e' }, { to: 'e' }),
      end('e'),
    ];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([]);
  });

  it('refuses a plain route that names an earlier agent, at the path of to', () => {
    const blocks = [start('s', 'a'), agent('a', 'c'), condition('c', { to: 'a' }, { to: 'e' }), end('e')];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.true.to',
        message: 'must name a later block of this flow: a return to the earlier agent a needs a roundLimit',
      },
    ]);
  });

  it('refuses a plain route that names the condition itself, at the path of to', () => {
    const blocks = [start('s', 'a'), agent('a', 'c'), condition('c', { to: 'c' }, { to: 'e' }), end('e')];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.true.to',
        message: 'must name a later block of this flow, got c',
      },
    ]);
  });

  it('accepts a plain route that names a later condition of the flow', () => {
    const blocks = [
      start('s', 'a'),
      agent('a', 'c1'),
      condition('c1', { to: 'c2' }, STOP),
      condition('c2', { to: 'e' }, STOP),
      end('e'),
    ];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([]);
  });

  it('refuses a plain route that names the start block, at the path of to', () => {
    const blocks = [start('s', 'a'), agent('a', 'c'), condition('c', { to: 's' }, { to: 'e' }), end('e')];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.true.to',
        message: 'must name a later block of this flow, got s',
      },
    ]);
  });
});

describe('F-02 AC-060 a route with a roundLimit names an earlier agent of the same flow', () => {
  it('accepts a return to an earlier agent with a round limit of 1 and of 5', () => {
    const limitOne = [
      start('s', 'a'),
      agent('a', 'c'),
      condition('c', { to: 'e' }, { to: 'a', roundLimit: 1 }),
      end('e'),
    ];
    const limitFive = [
      start('s', 'a'),
      agent('a', 'c'),
      condition('c', { to: 'e' }, { to: 'a', roundLimit: 5 }),
      end('e'),
    ];
    expect(checkBlockLinks(config(flow('plan', limitOne)))).toEqual([]);
    expect(checkBlockLinks(config(flow('plan', limitFive)))).toEqual([]);
  });

  it('refuses a return with a round limit to an agent of another flow, at the path of to', () => {
    const result = checkBlockLinks(
      config(
        flow('plan', [
          start('s', 'a'),
          agent('a', 'c'),
          condition('c', { to: 'e' }, { to: 'x', roundLimit: 2 }),
          end('e'),
        ]),
        flow('build', [start('s2', 'x'), agent('x', 'e2'), end('e2')]),
      ),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.false.to',
        message: 'must name a block of this flow, got x, which is a block of another flow',
      },
    ]);
  });
});

describe('F-02 AC-061 a round-limited route that names a block other than an earlier agent is refused at to', () => {
  const REFUSED = 'must name an earlier agent of this flow for a return with a roundLimit';

  it('refuses a round-limited route to a later agent, at the path of to', () => {
    const blocks = [
      start('s', 'a'),
      agent('a', 'c'),
      condition('c', { to: 'e' }, { to: 'b', roundLimit: 2 }),
      agent('b', 'e'),
      end('e'),
    ];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.2.false.to', message: `${REFUSED}, got b` },
    ]);
  });

  it('refuses a round-limited route to a condition, at the path of to', () => {
    const blocks = [
      start('s', 'a'),
      agent('a', 'c1'),
      condition('c1', { to: 'c2' }, { to: 'e' }),
      condition('c2', { to: 'e' }, { to: 'c1', roundLimit: 2 }),
      end('e'),
    ];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.3.false.to', message: `${REFUSED}, got c1` },
    ]);
  });

  it('refuses a round-limited route to the end, at the path of to', () => {
    const blocks = [
      start('s', 'a'),
      agent('a', 'c'),
      condition('c', { to: 'e', roundLimit: 3 }, { to: 'e' }),
      end('e'),
    ];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.2.true.to', message: `${REFUSED}, got e` },
    ]);
  });

  it('refuses a round-limited route to the start block, at the path of to', () => {
    const blocks = [
      start('s', 'a'),
      agent('a', 'c'),
      condition('c', { to: 'e' }, { to: 's', roundLimit: 2 }),
      end('e'),
    ];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.2.false.to', message: `${REFUSED}, got s` },
    ]);
  });

  it('refuses a round-limited route to the condition itself, at the path of to', () => {
    const blocks = [
      start('s', 'a'),
      agent('a', 'c'),
      condition('c', { to: 'e' }, { to: 'c', roundLimit: 2 }),
      end('e'),
    ];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.2.false.to', message: `${REFUSED}, got c` },
    ]);
  });
});

describe('F-02 AC-062 a route to a block of another flow or to no block is refused at to', () => {
  it('refuses a plain route to a block of another flow, at the path of to', () => {
    const result = checkBlockLinks(
      config(
        flow('plan', [start('s', 'a'), agent('a', 'c'), condition('c', { to: 'other' }, { to: 'e' }), end('e')]),
        flow('build', [start('s2', 'other'), agent('other', 'e2'), end('e2')]),
      ),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.true.to',
        message: 'must name a block of this flow, got other, which is a block of another flow',
      },
    ]);
  });

  it('refuses a plain route to an id that is no block of the pipeline, at the path of to', () => {
    const blocks = [start('s', 'a'), agent('a', 'c'), condition('c', { to: 'e' }, { to: 'nowhere' }), end('e')];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.false.to',
        message: 'must name a block of this flow, got nowhere, which is no block of the pipeline',
      },
    ]);
  });

  it('refuses a round-limited route to an id that is no block, at the path of to', () => {
    const blocks = [
      start('s', 'a'),
      agent('a', 'c'),
      condition('c', { to: 'e' }, { to: 'nowhere', roundLimit: 2 }),
      end('e'),
    ];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.false.to',
        message: 'must name a block of this flow, got nowhere, which is no block of the pipeline',
      },
    ]);
  });

  it('accepts a stop route, which names no block', () => {
    const blocks = [start('s', 'a'), agent('a', 'c'), condition('c', STOP, { to: 'e' }), end('e')];
    expect(checkBlockLinks(config(flow('plan', blocks)))).toEqual([]);
  });
});

describe('F-02 AC-045 to AC-062 the problems come back in document order', () => {
  it('lists the start, the agent and the route problems of two flows in order', () => {
    const result = checkBlockLinks(
      config(
        flow('plan', [start('s', 'e'), agent('a', 'nowhere'), condition('c', { to: 'a' }, STOP), end('e')]),
      ),
    );
    expect(result.map((problem) => problem.path)).toEqual([
      'pipeline.flows.0.blocks.0.next',
      'pipeline.flows.0.blocks.1.next',
      'pipeline.flows.0.blocks.2.true.to',
    ]);
  });
});

describe('F-02 AC-019 AC-045 AC-059 a block link after a refused block is reported at the document index', () => {
  const pipelineOf = (...flows: unknown[]) => {
    const problems = createProblemCollector();
    const pipeline = readPipeline(
      { name: 'Pipeline', description: 'Desc', arguments: [], flows },
      'pipeline',
      problems,
    );
    expect(problems.list().every((problem) => problem.path.startsWith('pipeline.flows.0.blocks.0'))).toBe(true);
    if (pipeline === undefined) throw new Error('the pipeline was refused');
    return { pipeline };
  };

  it('refuses a start or agent next that names a start block, at the document index of the agent', () => {
    const value = {
      id: 'plan',
      name: 'Plan',
      body: 'Body',
      arguments: [],
      artifacts: [],
      approval: false,
      blocks: [
        { id: 'bad' },
        { id: 's', kind: 'start', next: 'a' },
        { id: 'a', kind: 'agent', name: 'review', description: 'Agent', arguments: [], next: 's' },
        { id: 'e', kind: 'end', outcome: 'done', producedArtifact: 'Plan' },
      ],
    };
    expect(checkBlockLinks(pipelineOf(value))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.next',
        message: 'must name an agent, a condition or the end of this flow, got the start block s',
      },
    ]);
  });

  it('refuses a return route without a roundLimit at the document index of the condition', () => {
    const value = {
      id: 'plan',
      name: 'Plan',
      body: 'Body',
      arguments: [],
      artifacts: [],
      approval: false,
      blocks: [
        { id: 'bad' },
        { id: 's', kind: 'start', next: 'a' },
        { id: 'a', kind: 'agent', name: 'review', description: 'Agent', arguments: [], next: 'c' },
        { id: 'c', kind: 'condition', description: 'Ok?', true: { to: 'a' }, false: { stop: true } },
        { id: 'e', kind: 'end', outcome: 'done', producedArtifact: 'Plan' },
      ],
    };
    expect(checkBlockLinks(pipelineOf(value))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.3.true.to',
        message: 'must name a later block of this flow: a return to the earlier agent a needs a roundLimit',
      },
    ]);
  });
});
