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

// The build flow: start, agent a, condition check (index 2), agent b, end. Its routes are the ones given.
function linked(routes: Routes): ProjectConfig {
  return pipelineOf(
    flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '6235136f-9021-5aaf-9958-4bc813c4d9b1'), condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', routes), agent('2cb36792-5a03-58cf-a718-bba6be0b9122', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]),
  );
}

// The condition `6235136f-9021-5aaf-9958-4bc813c4d9b1` at index 2 of pipeline.flows.0, with an earlier condition `5c0f2c3f-cca2-5a06-a76c-9f46c2f59923` at index 1.
function afterCondition(routes: Routes): ProjectConfig {
  return pipelineOf(
    flowOf(0, 'build', [
      start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '5c0f2c3f-cca2-5a06-a76c-9f46c2f59923'),
      condition('5c0f2c3f-cca2-5a06-a76c-9f46c2f59923', { true: { to: '6235136f-9021-5aaf-9958-4bc813c4d9b1' }, false: STOP }),
      condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', routes),
      end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
    ]),
  );
}

// The condition `6235136f-9021-5aaf-9958-4bc813c4d9b1` at index 2 of pipeline.flows.0, with an earlier end `f425ace6-acef-578b-9f1b-799f436aaed0` at index 1.
function afterEnd(routes: Routes): ProjectConfig {
  return pipelineOf(
    flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '6235136f-9021-5aaf-9958-4bc813c4d9b1'), end('f425ace6-acef-578b-9f1b-799f436aaed0'), condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', routes), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]),
  );
}

// The condition `6235136f-9021-5aaf-9958-4bc813c4d9b1` at index 3. The End `f425ace6-acef-578b-9f1b-799f436aaed0` is listed before it but reached first in the arrow order (from
// the condition `5c0f2c3f-cca2-5a06-a76c-9f46c2f59923`), so the End is earlier than `6235136f-9021-5aaf-9958-4bc813c4d9b1` (F-12 order).
function endReachedFirst(routes: Routes): ProjectConfig {
  return pipelineOf(
    flowOf(0, 'build', [
      start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '5c0f2c3f-cca2-5a06-a76c-9f46c2f59923'),
      condition('5c0f2c3f-cca2-5a06-a76c-9f46c2f59923', { true: { to: 'f425ace6-acef-578b-9f1b-799f436aaed0' }, false: { to: '6235136f-9021-5aaf-9958-4bc813c4d9b1' } }),
      end('f425ace6-acef-578b-9f1b-799f436aaed0'),
      condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', routes),
      end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
    ]),
  );
}

const TRUE_TO = 'pipeline.flows.0.blocks.2.true.to';
const CHECK_TRUE_TO = 'pipeline.flows.0.blocks.3.true.to';
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
        start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'),
        agent('fdac7165-b540-5201-bca7-029a056ea40e', '6235136f-9021-5aaf-9958-4bc813c4d9b1'),
        condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', { true: { to: 'def27884-40ef-5051-92b3-a6cfebcbd2c6' }, false: STOP }),
        end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
      ]),
      flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6')]),
    ),
    [{ path: TRUE_TO, message: OTHER_FLOW('def27884-40ef-5051-92b3-a6cfebcbd2c6') }],
  ],
  [
    'F-03 AC-016 a false route to a block of another flow gives a blocker at the to path',
    pipelineOf(
      flowOf(0, 'build', [
        start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'),
        agent('fdac7165-b540-5201-bca7-029a056ea40e', '6235136f-9021-5aaf-9958-4bc813c4d9b1'),
        condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', { true: STOP, false: { to: 'def27884-40ef-5051-92b3-a6cfebcbd2c6' } }),
        end('128fea8a-2e63-5352-bd64-02ceddc0d0cb'),
      ]),
      flowOf(1, 'review', [start('ee8941a1-1a19-501e-93a2-0ee51a418e30', 'def27884-40ef-5051-92b3-a6cfebcbd2c6'), end('def27884-40ef-5051-92b3-a6cfebcbd2c6')]),
    ),
    [{ path: FALSE_TO, message: OTHER_FLOW('def27884-40ef-5051-92b3-a6cfebcbd2c6') }],
  ],
  [
    'F-03 AC-016 a true route to an id that is no block gives a blocker at the to path',
    linked({ true: { to: 'a5767084-cb93-5669-9a85-49c86b4893f6' }, false: STOP }),
    [{ path: TRUE_TO, message: NO_BLOCK('a5767084-cb93-5669-9a85-49c86b4893f6') }],
  ],
  [
    'F-03 AC-016 a false route to an id that is no block gives a blocker at the to path',
    linked({ true: { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' }, false: { to: 'a5767084-cb93-5669-9a85-49c86b4893f6', roundLimit: 1 } }),
    [{ path: FALSE_TO, message: NO_BLOCK('a5767084-cb93-5669-9a85-49c86b4893f6') }],
  ],
  [
    'F-03 AC-017 a route to the condition itself gives a blocker at the to path, without a roundLimit',
    linked({ true: { to: '6235136f-9021-5aaf-9958-4bc813c4d9b1' }, false: STOP }),
    [{ path: TRUE_TO, message: SAME_FLOW_LATER('6235136f-9021-5aaf-9958-4bc813c4d9b1') }],
  ],
  [
    'F-03 AC-017 a route to the condition itself gives a blocker at the to path, with a roundLimit',
    linked({ true: { to: '6235136f-9021-5aaf-9958-4bc813c4d9b1', roundLimit: 1 }, false: STOP }),
    [{ path: TRUE_TO, message: RETURN_NEEDS_AGENT('6235136f-9021-5aaf-9958-4bc813c4d9b1') }],
  ],
  [
    'F-03 AC-017 a route to an earlier start gives a blocker at the to path, without a roundLimit',
    linked({ true: { to: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551' }, false: STOP }),
    [{ path: TRUE_TO, message: SAME_FLOW_LATER('f05559a1-554d-5c78-a9a6-bb9ce0bfc551') }],
  ],
  [
    'F-03 AC-017 a route to an earlier start gives a blocker at the to path, with a roundLimit',
    linked({ true: { to: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', roundLimit: 2 }, false: STOP }),
    [{ path: TRUE_TO, message: RETURN_NEEDS_AGENT('f05559a1-554d-5c78-a9a6-bb9ce0bfc551') }],
  ],
  [
    'F-03 AC-017 a route to an earlier condition gives a blocker at the to path, without a roundLimit',
    afterCondition({ true: STOP, false: { to: '5c0f2c3f-cca2-5a06-a76c-9f46c2f59923' } }),
    [{ path: FALSE_TO, message: SAME_FLOW_LATER('5c0f2c3f-cca2-5a06-a76c-9f46c2f59923') }],
  ],
  [
    'F-03 AC-017 a route to an earlier condition gives a blocker at the to path, with a roundLimit',
    afterCondition({ true: { to: '5c0f2c3f-cca2-5a06-a76c-9f46c2f59923', roundLimit: 1 }, false: STOP }),
    [{ path: TRUE_TO, message: RETURN_NEEDS_AGENT('5c0f2c3f-cca2-5a06-a76c-9f46c2f59923') }],
  ],
  [
    'F-03 AC-017 a route to an earlier end gives a blocker at the to path, without a roundLimit',
    endReachedFirst({ true: { to: 'f425ace6-acef-578b-9f1b-799f436aaed0' }, false: STOP }),
    [{ path: CHECK_TRUE_TO, message: SAME_FLOW_LATER('f425ace6-acef-578b-9f1b-799f436aaed0') }],
  ],
  [
    'F-03 AC-017 a route to an earlier end gives a blocker at the to path, with a roundLimit',
    afterEnd({ true: STOP, false: { to: 'f425ace6-acef-578b-9f1b-799f436aaed0', roundLimit: 3 } }),
    [{ path: FALSE_TO, message: RETURN_NEEDS_AGENT('f425ace6-acef-578b-9f1b-799f436aaed0') }],
  ],
  [
    'F-03 AC-018 a roundLimit on a route to a later agent gives a blocker at the to path',
    linked({ true: { to: '2cb36792-5a03-58cf-a718-bba6be0b9122', roundLimit: 2 }, false: STOP }),
    [{ path: TRUE_TO, message: RETURN_NEEDS_AGENT('2cb36792-5a03-58cf-a718-bba6be0b9122') }],
  ],
  [
    'F-03 AC-018 a roundLimit on a route to a later end gives a blocker at the to path',
    linked({ true: STOP, false: { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', roundLimit: 1 } }),
    [{ path: FALSE_TO, message: RETURN_NEEDS_AGENT('128fea8a-2e63-5352-bd64-02ceddc0d0cb') }],
  ],
  [
    'F-03 AC-019 a return to an earlier agent without a roundLimit gives a blocker at the to path',
    linked({ true: { to: 'fdac7165-b540-5201-bca7-029a056ea40e' }, false: STOP }),
    [{ path: TRUE_TO, message: EARLIER_AGENT_NEEDS_LIMIT('fdac7165-b540-5201-bca7-029a056ea40e') }],
  ],
  [
    'F-03 AC-019 a false return to an earlier agent without a roundLimit gives a blocker at the to path',
    linked({ true: { to: '2cb36792-5a03-58cf-a718-bba6be0b9122' }, false: { to: 'fdac7165-b540-5201-bca7-029a056ea40e' } }),
    [{ path: FALSE_TO, message: EARLIER_AGENT_NEEDS_LIMIT('fdac7165-b540-5201-bca7-029a056ea40e') }],
  ],
  [
    'F-03 AC-020 a return to an earlier agent with a roundLimit has no finding',
    linked({ true: { to: 'fdac7165-b540-5201-bca7-029a056ea40e', roundLimit: 3 }, false: STOP }),
    [],
  ],
  [
    'F-03 AC-020 a route to a later block of the same flow has no finding',
    linked({ true: { to: '2cb36792-5a03-58cf-a718-bba6be0b9122' }, false: { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' } }),
    [],
  ],
  [
    'F-03 AC-020 a stop route has no finding on either output',
    linked({ true: STOP, false: STOP }),
    [],
  ],
  [
    'F-03 AC-020 a return with a roundLimit and a later route together have no finding',
    linked({ true: { to: 'fdac7165-b540-5201-bca7-029a056ea40e', roundLimit: 1 }, false: { to: '2cb36792-5a03-58cf-a718-bba6be0b9122' } }),
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
    expect(analyzeStructure(linked({ true: { to: 'fdac7165-b540-5201-bca7-029a056ea40e', roundLimit: 2 }, false: { to: '2cb36792-5a03-58cf-a718-bba6be0b9122' } }))).toEqual([]);
  });

  it('F-03 AC-013 the retry route gives no route or link finding', () => {
    const config = linked({ true: { to: 'fdac7165-b540-5201-bca7-029a056ea40e', roundLimit: 2 }, false: STOP });
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
    linked({ true: { to: '2cb36792-5a03-58cf-a718-bba6be0b9122' } }),
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
    linked({ true: { to: '2cb36792-5a03-58cf-a718-bba6be0b9122' }, false: STOP }),
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
      flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', undefined), agent('fdac7165-b540-5201-bca7-029a056ea40e', '6235136f-9021-5aaf-9958-4bc813c4d9b1'), condition('6235136f-9021-5aaf-9958-4bc813c4d9b1', {}), agent('2cb36792-5a03-58cf-a718-bba6be0b9122', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]),
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
    const config = pipelineOf(flowOf(0, 'build', [start('f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '128fea8a-2e63-5352-bd64-02ceddc0d0cb'), end('128fea8a-2e63-5352-bd64-02ceddc0d0cb')]));
    expect(config.pipeline.flows[0]).not.toHaveProperty('next');
    expect(config.pipeline.flows[0]).not.toHaveProperty('description');
    expect(() => analyzeStructure(config)).not.toThrow();
    expect(analyzeStructure(config)).toEqual([]);
  });
});
