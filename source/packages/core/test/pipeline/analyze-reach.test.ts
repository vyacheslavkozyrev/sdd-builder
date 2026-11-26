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
  return { index: 0, id, kind: 'agent', name: `agent-${id.slice(0, 8)}`, description: 'Agent.', arguments: [], next };
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
    pipelineOf(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')])),
    [],
  ],
  [
    'F-03 AC-021 an agent that no next or route names gives a blocker at its path',
    pipelineOf(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), agent('aff75377-fc4e-5e2d-86df-56fabbe73e57', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')])),
    [{ path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-021 an end that no next names gives a blocker at its path',
    pipelineOf(
      flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '256790b3-b8f2-567b-849a-76ca748e9df1'), agent('256790b3-b8f2-567b-849a-76ca748e9df1', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('0be15872-56ad-51b7-9c6a-030f137023be')]),
    ),
    [{ path: 'pipeline.flows.0.blocks.4', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-022 a block reached only through the false route of a reached condition has no finding',
    pipelineOf(
      flowOf(0, 'build', [
        start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '6235136f-9021-5aaf-9958-4bc813c4d9b1'),
        condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', { true: STOP, false: { to: 'fb20d976-aaae-5232-a31f-1c0c78dc1ba6' } }),
        agent('fb20d976-aaae-5232-a31f-1c0c78dc1ba6', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
        end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
      ]),
    ),
    [],
  ],
  [
    'F-03 AC-022 a block reached only through the true route of a reached condition has no finding',
    pipelineOf(
      flowOf(0, 'build', [
        start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '6235136f-9021-5aaf-9958-4bc813c4d9b1'),
        condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', { true: { to: 'fb20d976-aaae-5232-a31f-1c0c78dc1ba6' }, false: { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' } }),
        agent('fb20d976-aaae-5232-a31f-1c0c78dc1ba6', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
        end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
      ]),
    ),
    [],
  ],
  [
    'F-03 AC-022 a block reached only by a return route with a roundLimit has no finding',
    pipelineOf(
      flowOf(0, 'build', [
        start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'),
        agent('fdac7165-b540-5201-bca7-029a056ea40e', '6235136f-9021-5aaf-9958-4bc813c4d9b1'),
        condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', { true: { to: 'fdac7165-b540-5201-bca7-029a056ea40e', roundLimit: 2 }, false: { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' } }),
        end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
      ]),
    ),
    [],
  ],
  [
    'F-03 AC-021 a block that only an unreached block leads to gives a blocker at its path',
    pipelineOf(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), agent('2cb36792-5a03-58cf-a718-bba6be0b9122', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')])),
    [{ path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-021 a stop route does not reach a block, so the block behind it gives a blocker',
    pipelineOf(
      flowOf(0, 'build', [
        start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '6235136f-9021-5aaf-9958-4bc813c4d9b1'),
        condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', { true: STOP, false: STOP }),
        agent('28c6375c-66ac-5f5f-bba2-06dde4ec862b', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
        end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
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
        start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '6235136f-9021-5aaf-9958-4bc813c4d9b1'),
        condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', { true: { to: '5cf605ef-fd74-52e2-bfdc-767d5e93190c' }, false: { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' } }),
        agent('fb20d976-aaae-5232-a31f-1c0c78dc1ba6', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
        end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
      ]),
    ),
    [{ path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-021 a flow with two Starts is walked from the first, so the second Start gives a blocker',
    pipelineOf(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), start('9c7ec703-c07d-5128-b056-24c54e49081f', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')])),
    [{ path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-021 a flow with no Start is skipped, so its blocks give no finding here',
    pipelineOf(flowOf(0, 'build', [agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')])),
    [],
  ],
  [
    'F-03 AC-021 an unreached block in the second flow gives a blocker at the second flow path',
    pipelineOf(
      flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]),
      flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6'), agent('aff75377-fc4e-5e2d-86df-56fabbe73e57', 'def27884-40ef-5051-92b3-a6cfebcbd2c6')]),
    ),
    [{ path: 'pipeline.flows.1.blocks.2', message: NOT_REACHED }],
  ],
  [
    'F-03 AC-021 a route into another flow does not reach that flow from here, so the blocks behind it give a blocker',
    pipelineOf(
      flowOf(0, 'build', [
        start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '6235136f-9021-5aaf-9958-4bc813c4d9b1'),
        condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', { true: { to: '256790b3-b8f2-567b-849a-76ca748e9df1' }, false: STOP }),
        agent('28c6375c-66ac-5f5f-bba2-06dde4ec862b', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
        end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
      ]),
      flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', '08c6f6ac-249f-5c96-8996-e07992525b0d'), end('08c6f6ac-249f-5c96-8996-e07992525b0d'), agent('256790b3-b8f2-567b-849a-76ca748e9df1', '28c6375c-66ac-5f5f-bba2-06dde4ec862b')]),
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
    const agentNoNext = agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb');
    const view: { next?: string } = agentNoNext;
    delete view.next;
    const config = pipelineOf(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', undefined), agentNoNext, end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]));
    expect(() => reachRule(config)).not.toThrow();
    expect(reachProblems(config)).toEqual([
      { path: 'pipeline.flows.0.blocks.1', message: NOT_REACHED },
      { path: 'pipeline.flows.0.blocks.2', message: NOT_REACHED },
    ]);
  });

  it('F-03 AC-021 a condition with no routes is walked without a throw', () => {
    const config = pipelineOf(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '6235136f-9021-5aaf-9958-4bc813c4d9b1'), condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', {}), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]));
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
    pipelineOf(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')])),
    [],
  ],
  [
    'F-03 AC-023 a flow named by the next of the first flow is reached and gives no finding',
    pipelineOf(
      linked(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]), 'review'),
      flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6')]),
    ),
    [],
  ],
  [
    'F-03 AC-023 a chain of next links reaches every flow in it and gives no finding',
    pipelineOf(
      linked(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]), 'review'),
      linked(flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6')]), 'ship'),
      flowOf(2, 'ship', [start('acec2cf4-bf5f-5b96-87e2-ce9e09a1fcf6', '7dd4c0a7-cf14-598f-b071-e81b1b3788f0'), end('7dd4c0a7-cf14-598f-b071-e81b1b3788f0')]),
    ),
    [],
  ],
  [
    'F-03 AC-023 a flow no next reaches gives one blocker at its flow path, and its blocks are not reported',
    pipelineOf(
      flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]),
      flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6'), agent('aff75377-fc4e-5e2d-86df-56fabbe73e57', 'def27884-40ef-5051-92b3-a6cfebcbd2c6')]),
    ),
    [{ path: 'pipeline.flows.1', message: NOT_FLOW_REACHED }],
  ],
  [
    'F-03 AC-023 a flow reached only from an unreached flow is unreached too, with one blocker each',
    pipelineOf(
      flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]),
      linked(flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6')]), 'ship'),
      flowOf(2, 'ship', [start('acec2cf4-bf5f-5b96-87e2-ce9e09a1fcf6', '7dd4c0a7-cf14-598f-b071-e81b1b3788f0'), end('7dd4c0a7-cf14-598f-b071-e81b1b3788f0')]),
    ),
    [
      { path: 'pipeline.flows.1', message: NOT_FLOW_REACHED },
      { path: 'pipeline.flows.2', message: NOT_FLOW_REACHED },
    ],
  ],
  [
    'F-03 AC-024 two flows with no incoming next: the second gives a blocker at its path',
    pipelineOf(
      flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]),
      flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6')]),
    ),
    [{ path: 'pipeline.flows.1', message: NOT_FLOW_REACHED }],
  ],
  [
    'F-03 AC-024 the first flow is the one no next names, here the second in pipeline order',
    pipelineOf(
      flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]),
      linked(flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6')]), 'build'),
    ),
    [],
  ],
  [
    'F-03 AC-024 a next to a missing flow is not followed, so the flow it names is not reached',
    pipelineOf(
      linked(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]), 'ghost'),
      flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6')]),
    ),
    [{ path: 'pipeline.flows.1', message: NOT_FLOW_REACHED }],
  ],
  [
    'F-03 AC-023 a second flow with the id of a reached flow is not reported again as unreached (AC-025 reports it)',
    pipelineOf(
      flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]),
      flowOf(1, 'build', [start('e9818273-1527-5328-8ff9-38504119069e', '8c532a8c-bc15-5f04-b9a7-e62329ffce47'), end('8c532a8c-bc15-5f04-b9a7-e62329ffce47')]),
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
      linked(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]), 'review'),
      linked(flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6')]), 'build'),
    ),
    [],
  ],
];

describe('F-03 AC-023, AC-024 every flow is reached from the first flow of the pipeline', () => {
  it.each(flowReachCases)('%s', (_name, config, expected) => {
    expect(flowReachProblems(config)).toEqual(expected);
  });
});
