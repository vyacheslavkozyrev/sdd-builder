import { describe, expect, it } from 'vitest';
import { reachRule, reachRules } from '../../src/pipeline/analyze/reach.js';
import type {
  AgentBlock,
  Block,
  ConditionBlock,
  Flow,
  ProjectConfig,
  Route,
  StartBlock,
} from '../../src/pipeline/model.js';
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

function agent(id: string, next: string): AgentBlock {
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

interface Expected {
  readonly path: string;
  readonly message: string;
}

const NOT_REACHED = 'must be reached from the Start of its flow, got no next or route that leads to it';

function reachProblems(config: ProjectConfig): Expected[] {
  return reachRule(config).map(({ path, message }) => ({ path, message }));
}

const reachCases: Array<[string, ProjectConfig, Expected[]]> = [
  [
    'F-03 AC-021 a flow in which every block is on a next link has no finding',
    pipelineOf(flowOf(0, 'build', [start('start', 'a'), agent('a', 'end'), end('end')])),
    [],
  ],
  [
    'F-03 AC-021 an agent that no next or route names gives a blocker at its path',
    pipelineOf(flowOf(0, 'build', [start('start', 'a'), agent('a', 'end'), agent('lost', 'end'), end('end')])),
    [{ path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-021 an end that no next names gives a blocker at its path',
    pipelineOf(
      flowOf(0, 'build', [start('start', 'a'), agent('a', 'mid'), agent('mid', 'end'), end('end'), end('loose')]),
    ),
    [{ path: 'pipeline.flows.0.blocks.4', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-022 a block reached only through the false route of a reached condition has no finding',
    pipelineOf(
      flowOf(0, 'build', [
        start('start', 'check'),
        condition('check', { true: STOP, false: { to: 'fix' } }),
        agent('fix', 'end'),
        end('end'),
      ]),
    ),
    [],
  ],
  [
    'F-03 AC-022 a block reached only through the true route of a reached condition has no finding',
    pipelineOf(
      flowOf(0, 'build', [
        start('start', 'check'),
        condition('check', { true: { to: 'fix' }, false: { to: 'end' } }),
        agent('fix', 'end'),
        end('end'),
      ]),
    ),
    [],
  ],
  [
    'F-03 AC-022 a block reached only by a return route with a roundLimit has no finding',
    pipelineOf(
      flowOf(0, 'build', [
        start('start', 'a'),
        agent('a', 'check'),
        condition('check', { true: { to: 'a', roundLimit: 2 }, false: { to: 'end' } }),
        end('end'),
      ]),
    ),
    [],
  ],
  [
    'F-03 AC-021 a block that only an unreached block leads to gives a blocker at its path',
    pipelineOf(flowOf(0, 'build', [start('start', 'a'), agent('a', 'end'), agent('b', 'end'), end('end')])),
    [{ path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-021 a stop route does not reach a block, so the block behind it gives a blocker',
    pipelineOf(
      flowOf(0, 'build', [
        start('start', 'check'),
        condition('check', { true: STOP, false: STOP }),
        agent('after', 'end'),
        end('end'),
      ]),
    ),
    [
      { path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED },
      { path: 'pipeline.flows.0.blocks.3', message: NOT_REACHED },
    ],
  ],
  [
    'F-03 AC-021 a route to a missing block is not followed, so the blocks behind it give a blocker',
    pipelineOf(
      flowOf(0, 'build', [
        start('start', 'check'),
        condition('check', { true: { to: 'gone' }, false: { to: 'end' } }),
        agent('fix', 'end'),
        end('end'),
      ]),
    ),
    [{ path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-021 a flow with two Starts is walked from the first, so the second Start gives a blocker',
    pipelineOf(flowOf(0, 'build', [start('start', 'a'), agent('a', 'end'), start('second', 'end'), end('end')])),
    [{ path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-021 a flow with no Start is skipped, so its blocks give no finding here',
    pipelineOf(flowOf(0, 'build', [agent('a', 'end'), end('end')])),
    [],
  ],
  [
    'F-03 AC-021 an unreached block in the second flow gives a blocker at the second flow path',
    pipelineOf(
      flowOf(0, 'build', [start('start', 'a'), agent('a', 'end'), end('end')]),
      flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end'), agent('lost', 'review-end')]),
    ),
    [{ path: 'pipeline.flows.1.blocks.2', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-021 a route into another flow does not reach that flow from here, so the blocks behind it give a blocker',
    pipelineOf(
      flowOf(0, 'build', [
        start('start', 'check'),
        condition('check', { true: { to: 'mid' }, false: STOP }),
        agent('after', 'end'),
        end('end'),
      ]),
      flowOf(1, 'review', [start('review-start', 'end-review'), end('end-review'), agent('mid', 'after')]),
    ),
    [
      { path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED },
      { path: 'pipeline.flows.0.blocks.3', message: NOT_REACHED },
      { path: 'pipeline.flows.1.blocks.2', message: NOT_REACHED },
    ],
  ],
];

describe('F-03 AC-021, AC-022 every block is reached from the Start of its flow', () => {
  it.each(reachCases)('%s', (_name, config, expected) => {
    expect(reachProblems(config)).toEqual(expected);
  });
});

describe('F-03 AC-021 a partial model is walked without a throw', () => {
  it('F-03 AC-021 a start with no next and an agent with no next are walked without a throw', () => {
    const agentNoNext = agent('a', 'end');
    const view: { next?: string } = agentNoNext;
    delete view.next;
    const config = pipelineOf(flowOf(0, 'build', [start('start', undefined), agentNoNext, end('end')]));
    expect(() => reachRule(config)).not.toThrow();
    expect(reachProblems(config)).toEqual([
      { path: 'pipeline.flows.0.blocks.1', message: NOT_REACHED },
      { path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED },
    ]);
  });

  it('F-03 AC-021 a condition with no routes is walked without a throw', () => {
    const config = pipelineOf(flowOf(0, 'build', [start('start', 'check'), condition('check', {}), end('end')]));
    expect(() => reachRule(config)).not.toThrow();
    expect(reachProblems(config)).toEqual([{ path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED }]);
  });
});

// A flow named by the `next` of another flow; the flow it names is the one that follows it.
function linked(flow: Flow, next: string): Flow {
  return { ...flow, next };
}

const NOT_FLOW_REACHED =
  'must be reached from the first flow of the pipeline along next links, got no next that leads to it';

function flowReachProblems(config: ProjectConfig): Expected[] {
  return reachRules(config).map(({ path, message }) => ({ path, message }));
}

const flowReachCases: Array<[string, ProjectConfig, Expected[]]> = [
  [
    'F-03 AC-023 a single flow is the first flow and gives no finding',
    pipelineOf(flowOf(0, 'build', [start('start', 'a'), agent('a', 'end'), end('end')])),
    [],
  ],
  [
    'F-03 AC-023 a flow named by the next of the first flow is reached and gives no finding',
    pipelineOf(
      linked(flowOf(0, 'build', [start('start', 'a'), agent('a', 'end'), end('end')]), 'review'),
      flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end')]),
    ),
    [],
  ],
  [
    'F-03 AC-023 a chain of next links reaches every flow in it and gives no finding',
    pipelineOf(
      linked(flowOf(0, 'build', [start('start', 'end'), end('end')]), 'review'),
      linked(flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end')]), 'ship'),
      flowOf(2, 'ship', [start('ship-start', 'ship-end'), end('ship-end')]),
    ),
    [],
  ],
  [
    'F-03 AC-023 a flow no next reaches gives one blocker at its flow path, and its blocks are not reported',
    pipelineOf(
      flowOf(0, 'build', [start('start', 'a'), agent('a', 'end'), end('end')]),
      flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end'), agent('lost', 'review-end')]),
    ),
    [{ path: 'pipeline.flows.1', message: NOT_FLOW_REACHED }],
  ],
  [
    'F-03 AC-023 a flow reached only from an unreached flow is unreached too, with one blocker each',
    pipelineOf(
      flowOf(0, 'build', [start('start', 'end'), end('end')]),
      linked(flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end')]), 'ship'),
      flowOf(2, 'ship', [start('ship-start', 'ship-end'), end('ship-end')]),
    ),
    [
      { path: 'pipeline.flows.1', message: NOT_FLOW_REACHED },
      { path: 'pipeline.flows.2', message: NOT_FLOW_REACHED },
    ],
  ],
  [
    'F-03 AC-024 two flows with no incoming next: the second gives a blocker at its path',
    pipelineOf(
      flowOf(0, 'build', [start('start', 'end'), end('end')]),
      flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end')]),
    ),
    [{ path: 'pipeline.flows.1', message: NOT_FLOW_REACHED }],
  ],
  [
    'F-03 AC-024 the first flow is the one no next names, here the second in pipeline order',
    pipelineOf(
      flowOf(0, 'build', [start('start', 'end'), end('end')]),
      linked(flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end')]), 'build'),
    ),
    [],
  ],
  [
    'F-03 AC-024 a next to a missing flow is not followed, so the flow it names is not reached',
    pipelineOf(
      linked(flowOf(0, 'build', [start('start', 'end'), end('end')]), 'ghost'),
      flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end')]),
    ),
    [{ path: 'pipeline.flows.1', message: NOT_FLOW_REACHED }],
  ],
  [
    'F-03 AC-023 a second flow with the id of a reached flow is not reported again as unreached (AC-025 reports it)',
    pipelineOf(
      flowOf(0, 'build', [start('start', 'end'), end('end')]),
      flowOf(1, 'build', [start('dup-start', 'dup-end'), end('dup-end')]),
    ),
    [],
  ],
  [
    'F-03 AC-024 a pipeline with no flow gives no finding here',
    pipelineOf(),
    [],
  ],
  [
    'F-03 AC-024 a loop of next links has no first flow, so it gives no finding here',
    pipelineOf(
      linked(flowOf(0, 'build', [start('start', 'end'), end('end')]), 'review'),
      linked(flowOf(1, 'review', [start('review-start', 'review-end'), end('review-end')]), 'build'),
    ),
    [],
  ],
];

describe('F-03 AC-023, AC-024 every flow is reached from the first flow of the pipeline', () => {
  it.each(flowReachCases)('%s', (_name, config, expected) => {
    expect(flowReachProblems(config)).toEqual(expected);
  });
});
