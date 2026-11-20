import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { outputsRule } from '../../src/pipeline/analyze/outputs.js';
import { routesRule } from '../../src/pipeline/analyze/routes.js';
import type { Block, ConditionBlock, Flow, ProjectConfig, Route, StartBlock } from '../../src/pipeline/model.js';
import { validConfig } from './analyze-fixture.js';

type Slot = 'true' | 'false';
type Routes = Partial<Record<Slot, Route>>;

const SLOTS: readonly Slot[] = ['true', 'false'];
const STOP: Route = { stop: true };

// The blocks of a flow are built without an index; flowOf numbers them by position in the list.
function start(id: string, next: string | undefined): StartBlock {
  const block: StartBlock = { index: 0, id, kind: 'start', next: id };
  const view: { next?: string } = block;
  if (next === undefined) delete view.next;
  else view.next = next;
  return block;
}

function agent(id: string, next: string): Block {
  return { index: 0, id, kind: 'agent', name: id, description: 'Agent.', arguments: [], next };
}

// A condition whose routes are the ones given; a route left out is absent from the object, as a partial model has it.
function condition(id: string, routes: Routes): ConditionBlock {
  const block: ConditionBlock = { index: 0, id, kind: 'condition', description: 'Checks.', true: STOP, false: STOP };
  const view: Routes = block;
  for (const slot of SLOTS) {
    const route = routes[slot];
    if (route === undefined) delete view[slot];
    else view[slot] = route;
  }
  return block;
}

function end(id: string): Block {
  return { index: 0, id, kind: 'end', outcome: 'done', producedArtifact: 'out.md' };
}

function flowOf(index: number, id: string, blocks: Block[]): Flow {
  return {
    index,
    id,
    name: id,
    arguments: [],
    body: 'Runs the flow.',
    artifacts: [{ label: 'out.md', template: 'The output' }],
    approval: false,
    blocks: blocks.map((block, position) => ({ ...block, index: position })),
  };
}

function pipelineOf(...flows: Flow[]): ProjectConfig {
  const base = validConfig();
  return { ...base, pipeline: { ...base.pipeline, flows } };
}

// The build flow: start, agent a, condition check (index 2), agent b, end. Its routes are the ones given.
function linked(routes: Routes): ProjectConfig {
  return pipelineOf(
    flowOf(0, 'build', [start('start', 'a'), agent('a', 'check'), condition('check', routes), agent('b', 'end'), end('end')]),
  );
}

// The condition `check` at index 2 of pipeline.flows.0, with an earlier condition `first` at index 1.
function afterCondition(routes: Routes): ProjectConfig {
  return pipelineOf(
    flowOf(0, 'build', [
      start('start', 'first'),
      condition('first', { true: { to: 'check' }, false: STOP }),
      condition('check', routes),
      end('end'),
    ]),
  );
}

// The condition `check` at index 2 of pipeline.flows.0, with an earlier end `early` at index 1.
function afterEnd(routes: Routes): ProjectConfig {
  return pipelineOf(
    flowOf(0, 'build', [start('start', 'check'), end('early'), condition('check', routes), end('end')]),
  );
}

const TRUE_TO = 'pipeline.flows.0.blocks.2.true.to';
const FALSE_TO = 'pipeline.flows.0.blocks.2.false.to';
const CONDITION = 'pipeline.flows.0.blocks.2';
const START_NEXT = 'pipeline.flows.0.blocks.0.next';
const NOT_REACHED = 'must be reached from the Start of its flow, got no next or route that leads to it';

interface Expected {
  readonly path: string;
  readonly message: string;
}

function routeProblems(config: ProjectConfig): Expected[] {
  return routesRule(config).map(({ path, message }) => ({ path, message }));
}

const SAME_FLOW_LATER = (to: string) => `must name a later block of this flow, got ${to}`;
const EARLIER_AGENT_NEEDS_LIMIT = (to: string) =>
  `must name a later block of this flow: a return to the earlier agent ${to} needs a roundLimit`;
const RETURN_NEEDS_AGENT = (to: string) =>
  `must name an earlier agent of this flow for a return with a roundLimit, got ${to}`;
const OTHER_FLOW = (to: string) => `must name a block of this flow, got ${to}, which is a block of another flow`;
const NO_BLOCK = (to: string) => `must name a block of this flow, got ${to}, which is no block of the pipeline`;

const routeCases: Array<[string, ProjectConfig, Expected[]]> = [
  [
    'F-03 AC-016 a true route to a block of another flow gives a blocker at the to path',
    pipelineOf(
      flowOf(0, 'build', [
        start('start', 'a'),
        agent('a', 'check'),
        condition('check', { true: { to: 'review-end' }, false: STOP }),
        end('end'),
      ]),
      flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end')]),
    ),
    [{ path: TRUE_TO, message: OTHER_FLOW('review-end') }],
  ],
  [
    'F-03 AC-016 a false route to a block of another flow gives a blocker at the to path',
    pipelineOf(
      flowOf(0, 'build', [
        start('start', 'a'),
        agent('a', 'check'),
        condition('check', { true: STOP, false: { to: 'review-end' } }),
        end('end'),
      ]),
      flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end')]),
    ),
    [{ path: FALSE_TO, message: OTHER_FLOW('review-end') }],
  ],
  [
    'F-03 AC-016 a true route to an id that is no block gives a blocker at the to path',
    linked({ true: { to: 'nowhere' }, false: STOP }),
    [{ path: TRUE_TO, message: NO_BLOCK('nowhere') }],
  ],
  [
    'F-03 AC-016 a false route to an id that is no block gives a blocker at the to path',
    linked({ true: { to: 'end' }, false: { to: 'nowhere', roundLimit: 1 } }),
    [{ path: FALSE_TO, message: NO_BLOCK('nowhere') }],
  ],
  [
    'F-03 AC-017 a route to the condition itself gives a blocker at the to path, without a roundLimit',
    linked({ true: { to: 'check' }, false: STOP }),
    [{ path: TRUE_TO, message: SAME_FLOW_LATER('check') }],
  ],
  [
    'F-03 AC-017 a route to the condition itself gives a blocker at the to path, with a roundLimit',
    linked({ true: { to: 'check', roundLimit: 1 }, false: STOP }),
    [{ path: TRUE_TO, message: RETURN_NEEDS_AGENT('check') }],
  ],
  [
    'F-03 AC-017 a route to an earlier start gives a blocker at the to path, without a roundLimit',
    linked({ true: { to: 'start' }, false: STOP }),
    [{ path: TRUE_TO, message: SAME_FLOW_LATER('start') }],
  ],
  [
    'F-03 AC-017 a route to an earlier start gives a blocker at the to path, with a roundLimit',
    linked({ true: { to: 'start', roundLimit: 2 }, false: STOP }),
    [{ path: TRUE_TO, message: RETURN_NEEDS_AGENT('start') }],
  ],
  [
    'F-03 AC-017 a route to an earlier condition gives a blocker at the to path, without a roundLimit',
    afterCondition({ true: STOP, false: { to: 'first' } }),
    [{ path: FALSE_TO, message: SAME_FLOW_LATER('first') }],
  ],
  [
    'F-03 AC-017 a route to an earlier condition gives a blocker at the to path, with a roundLimit',
    afterCondition({ true: { to: 'first', roundLimit: 1 }, false: STOP }),
    [{ path: TRUE_TO, message: RETURN_NEEDS_AGENT('first') }],
  ],
  [
    'F-03 AC-017 a route to an earlier end gives a blocker at the to path, without a roundLimit',
    afterEnd({ true: { to: 'early' }, false: STOP }),
    [{ path: TRUE_TO, message: SAME_FLOW_LATER('early') }],
  ],
  [
    'F-03 AC-017 a route to an earlier end gives a blocker at the to path, with a roundLimit',
    afterEnd({ true: STOP, false: { to: 'early', roundLimit: 3 } }),
    [{ path: FALSE_TO, message: RETURN_NEEDS_AGENT('early') }],
  ],
  [
    'F-03 AC-018 a roundLimit on a route to a later agent gives a blocker at the to path',
    linked({ true: { to: 'b', roundLimit: 2 }, false: STOP }),
    [{ path: TRUE_TO, message: RETURN_NEEDS_AGENT('b') }],
  ],
  [
    'F-03 AC-018 a roundLimit on a route to a later end gives a blocker at the to path',
    linked({ true: STOP, false: { to: 'end', roundLimit: 1 } }),
    [{ path: FALSE_TO, message: RETURN_NEEDS_AGENT('end') }],
  ],
  [
    'F-03 AC-019 a return to an earlier agent without a roundLimit gives a blocker at the to path',
    linked({ true: { to: 'a' }, false: STOP }),
    [{ path: TRUE_TO, message: EARLIER_AGENT_NEEDS_LIMIT('a') }],
  ],
  [
    'F-03 AC-019 a false return to an earlier agent without a roundLimit gives a blocker at the to path',
    linked({ true: { to: 'b' }, false: { to: 'a' } }),
    [{ path: FALSE_TO, message: EARLIER_AGENT_NEEDS_LIMIT('a') }],
  ],
  [
    'F-03 AC-020 a return to an earlier agent with a roundLimit has no finding',
    linked({ true: { to: 'a', roundLimit: 3 }, false: STOP }),
    [],
  ],
  [
    'F-03 AC-020 a route to a later block of the same flow has no finding',
    linked({ true: { to: 'b' }, false: { to: 'end' } }),
    [],
  ],
  [
    'F-03 AC-020 a stop route has no finding on either output',
    linked({ true: STOP, false: STOP }),
    [],
  ],
  [
    'F-03 AC-020 a return with a roundLimit and a later route together have no finding',
    linked({ true: { to: 'a', roundLimit: 1 }, false: { to: 'b' } }),
    [],
  ],
];

describe('F-03 AC-016, AC-017, AC-018, AC-019, AC-020 route targets of a condition', () => {
  it.each(routeCases)('%s', (_name, config, expected) => {
    expect(routeProblems(config)).toEqual(expected);
  });
});

describe('F-03 AC-013 a retry route to an earlier agent with a roundLimit is not a loop', () => {
  it('F-03 AC-013 a condition that retries an earlier agent gives no finding of the analysis', () => {
    expect(analyzeStructure(linked({ true: { to: 'a', roundLimit: 2 }, false: { to: 'b' } }))).toEqual([]);
  });

  it('F-03 AC-013 the retry route gives no route or link finding', () => {
    const config = linked({ true: { to: 'a', roundLimit: 2 }, false: STOP });
    expect(routesRule(config)).toEqual([]);
  });
});

const outputCases: Array<[string, ProjectConfig, Expected[]]> = [
  [
    'F-03 AC-015 a condition with no true route gives a blocker at the condition path, naming the true output',
    linked({ false: STOP }),
    [{ path: CONDITION, message: 'must have a true route, got none' }],
  ],
  [
    'F-03 AC-015 a condition with no false route gives a blocker at the condition path, naming the false output',
    linked({ true: { to: 'b' } }),
    [{ path: CONDITION, message: 'must have a false route, got none' }],
  ],
  [
    'F-03 AC-015 a condition with neither route gives one blocker per missing output, true first',
    linked({}),
    [
      { path: CONDITION, message: 'must have a true route, got none' },
      { path: CONDITION, message: 'must have a false route, got none' },
    ],
  ],
  [
    'F-03 AC-015 a condition with both routes has no finding',
    linked({ true: { to: 'b' }, false: STOP }),
    [],
  ],
];

describe('F-03 AC-015 both outputs of every condition are wired', () => {
  it.each(outputCases)('%s', (_name, config, expected) => {
    const found = outputsRule(config).map(({ path, message }) => ({ path, message }));
    expect(found).toEqual(expected);
  });
});

describe('F-03 AC-035 a partial model is analysed without a throw', () => {
  // A start with no next and a condition with no routes: the model that the parser would have refused.
  function partial(): ProjectConfig {
    return pipelineOf(
      flowOf(0, 'build', [start('start', undefined), agent('a', 'check'), condition('check', {}), agent('b', 'end'), end('end')]),
    );
  }

  it('F-03 AC-035 a condition with no routes and a start with no next give findings without a throw', () => {
    const config = partial();
    expect(() => routesRule(config)).not.toThrow();
    expect(() => analyzeStructure(config)).not.toThrow();
    const found = analyzeStructure(config).map(({ rule, path, message }) => ({ rule, path, message }));
    expect(found).toEqual([
      { rule: 'block-link', path: START_NEXT, message: 'must name a block of this flow, got nothing' },
      { rule: 'block-reach', path: 'pipeline.flows.0.blocks.1', message: NOT_REACHED },
      { rule: 'condition-output', path: CONDITION, message: 'must have a true route, got none' },
      { rule: 'condition-output', path: CONDITION, message: 'must have a false route, got none' },
      { rule: 'block-reach', path: CONDITION, message: NOT_REACHED },
      { rule: 'block-reach', path: 'pipeline.flows.0.blocks.3', message: NOT_REACHED },
      { rule: 'block-reach', path: 'pipeline.flows.0.blocks.4', message: NOT_REACHED },
    ]);
  });

  it('F-03 AC-035 a condition with no routes gives no route finding, since there is no route to check', () => {
    expect(routeProblems(partial())).toEqual([]);
  });

  // flowOf leaves out `next` and `description` and gives `arguments` as an empty list: a single flow with none of
  // the optional keys is valid, so the gaps of AC-035 are not reported for them.
  it('F-03 AC-035 a flow with no next, no description and no arguments is analysed without a throw and gives no finding', () => {
    const config = pipelineOf(flowOf(0, 'build', [start('start', 'a'), agent('a', 'end'), end('end')]));
    expect(config.pipeline.flows[0]).not.toHaveProperty('next');
    expect(config.pipeline.flows[0]).not.toHaveProperty('description');
    expect(() => analyzeStructure(config)).not.toThrow();
    expect(analyzeStructure(config)).toEqual([]);
  });
});
