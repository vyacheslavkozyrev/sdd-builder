import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { linksRule } from '../../src/pipeline/analyze/links.js';
import type { Block, Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig } from './analyze-fixture.js';

// Flow and block ids are GUIDs (F-16 AC-028). A flow's blocks take its id with the last twelve digits set to the
// block's number, so two flows never clash. The Agent's name is file-safe and follows its flow.
const BUILD = 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6';
const REVIEW = '82c969a4-365a-5525-8168-6ae1093b1867';
const SHIP = 'f4e2c5aa-5035-5119-b2b4-a7c7bc0ede7c';
const NOWHERE = 'a5767084-cb93-5669-9a85-49c86b4893f6';

function blockId(flowId: string, number: number): string {
  return `${flowId.slice(0, 24)}${String(number).padStart(12, '0')}`;
}

function linear(flowId: string): Block[] {
  const start = blockId(flowId, 1);
  const agent = blockId(flowId, 2);
  const end = blockId(flowId, 3);
  return [
    { index: 0, id: start, kind: 'start', next: agent },
    {
      index: 1,
      id: agent,
      kind: 'agent',
      name: `agent-${flowId.slice(0, 8)}`,
      description: 'Builds the project.',
      arguments: [],
      next: end,
    },
    { index: 2, id: end, kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
  ];
}

// A flow at `index`, with `next` set only when given (exactOptionalPropertyTypes keeps the key absent otherwise).
function flow(index: number, id: string, next: string | undefined, blocks: Block[] = linear(id)): Flow {
  const base: Flow = {
    index,
    id,
    name: id,
    arguments: [],
    body: 'Runs the flow.',
    artifacts: [{ label: 'out.md', template: 'The output' }],
    approval: false,
    blocks,
  };
  return next === undefined ? base : { ...base, next };
}

function pipelineOf(...flows: Flow[]): ProjectConfig {
  return { ...validConfig(), pipeline: { ...validConfig().pipeline, flows } };
}

function withBlocks(blocks: Block[]): ProjectConfig {
  return pipelineOf(flow(0, BUILD, undefined, blocks));
}

// The block list of the build flow with the Agent's `next` changed.
function agentNext(next: string): Block[] {
  return linear(BUILD).map((block) => (block.kind === 'agent' ? { ...block, next } : block));
}

// The block list of the build flow with the Start's `next` changed.
function startNext(next: string): Block[] {
  return linear(BUILD).map((block) => (block.kind === 'start' ? { ...block, next } : block));
}

interface Expected {
  readonly rule: string;
  readonly path: string;
}

function blockersOf(config: ProjectConfig): Expected[] {
  return linksRule(config).map((finding) => ({ rule: finding.rule, path: finding.path }));
}

const FLOW_NEXT_0: Expected = { rule: 'flow-link', path: 'pipeline.flows.0.next' };
const FLOW_NEXT_1: Expected = { rule: 'flow-link', path: 'pipeline.flows.1.next' };
const FLOW_NEXT_2: Expected = { rule: 'flow-link', path: 'pipeline.flows.2.next' };
const FLOW_0: Expected = { rule: 'flow-link', path: 'pipeline.flows.0' };
const FLOW_1: Expected = { rule: 'flow-link', path: 'pipeline.flows.1' };
const FLOW_2: Expected = { rule: 'flow-link', path: 'pipeline.flows.2' };
const AGENT_NEXT_0_1: Expected = { rule: 'block-link', path: 'pipeline.flows.0.blocks.1.next' };
const START_NEXT_0_0: Expected = { rule: 'block-link', path: 'pipeline.flows.0.blocks.0.next' };

const flowCases: Array<[string, ProjectConfig, Expected[]]> = [
  [
    'F-03 AC-007 a next that names a flow of the pipeline has no finding',
    pipelineOf(flow(0, BUILD, REVIEW), flow(1, REVIEW, undefined)),
    [],
  ],
  [
    'F-03 AC-007 a next that names no flow gives a blocker at the next path',
    pipelineOf(flow(0, BUILD, REVIEW), flow(1, REVIEW, NOWHERE)),
    [FLOW_NEXT_1],
  ],
  [
    'F-03 AC-008 a next that names its own flow gives a blocker at the next path',
    pipelineOf(flow(0, BUILD, BUILD)),
    [FLOW_NEXT_0],
  ],
  [
    'F-03 AC-009 two flows whose next names the same flow give a blocker at the second next',
    pipelineOf(flow(0, BUILD, SHIP), flow(1, REVIEW, SHIP), flow(2, SHIP, undefined)),
    [FLOW_NEXT_1],
  ],
  [
    'F-03 AC-010 two flows with no link give a blocker at each flow path',
    pipelineOf(flow(0, BUILD, undefined), flow(1, REVIEW, undefined)),
    [FLOW_0, FLOW_1],
  ],
  [
    'F-03 AC-010 a flow with no link in a pipeline of three flows gives a blocker at its path',
    pipelineOf(flow(0, BUILD, REVIEW), flow(1, REVIEW, undefined), flow(2, SHIP, undefined)),
    [FLOW_2],
  ],
  [
    'F-03 AC-010 a single flow with no next has no finding',
    pipelineOf(flow(0, BUILD, undefined)),
    [],
  ],
  [
    'F-03 AC-011 a two-flow loop gives one blocker at the next that closes it',
    pipelineOf(flow(0, BUILD, REVIEW), flow(1, REVIEW, BUILD)),
    [FLOW_NEXT_1],
  ],
  [
    'F-03 AC-011 a three-flow loop gives one blocker at the next that closes it',
    pipelineOf(flow(0, BUILD, REVIEW), flow(1, REVIEW, SHIP), flow(2, SHIP, BUILD)),
    [FLOW_NEXT_2],
  ],
  [
    'F-03 AC-011 a chain that ends without a next has no finding',
    pipelineOf(flow(0, BUILD, REVIEW), flow(1, REVIEW, undefined)),
    [],
  ],
  [
    'F-03 AC-011 a chain of three flows that ends without a next has no finding',
    pipelineOf(flow(0, BUILD, REVIEW), flow(1, REVIEW, SHIP), flow(2, SHIP, undefined)),
    [],
  ],
];

const blockCases: Array<[string, ProjectConfig, Expected[]]> = [
  [
    'F-03 AC-012 an agent whose next names itself gives a blocker at its next path',
    withBlocks(agentNext('b9adae55-085d-5130-b511-e904610f3627')),
    [AGENT_NEXT_0_1],
  ],
  [
    'F-03 AC-012 a chain of agents that returns to an earlier agent gives one blocker at the closing next',
    withBlocks([
      { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: 'fd4283d1-dbb3-5741-9530-d76f88fbfa1a' },
      { index: 1, id: 'fd4283d1-dbb3-5741-9530-d76f88fbfa1a', kind: 'agent', name: 'first', description: 'First.', arguments: [], next: 'e8a2e442-8bb9-5ea2-be8c-dceaff995e01' },
      { index: 2, id: 'e8a2e442-8bb9-5ea2-be8c-dceaff995e01', kind: 'agent', name: 'second', description: 'Second.', arguments: [], next: 'fd4283d1-dbb3-5741-9530-d76f88fbfa1a' },
      { index: 3, id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
    ]),
    [{ rule: 'block-link', path: 'pipeline.flows.0.blocks.2.next' }],
  ],
  [
    'F-03 AC-012 a chain of blocks that moves forward and ends at the End has no finding',
    withBlocks(linear(BUILD)),
    [],
  ],
];

const crossFlowCases: Array<[string, ProjectConfig, Expected[]]> = [
  [
    'F-03 AC-014 an agent next that names a block of another flow gives a blocker at the next path',
    pipelineOf(
      flow(0, BUILD, REVIEW, agentNext(blockId(REVIEW, 3))),
      flow(1, REVIEW, undefined),
    ),
    [AGENT_NEXT_0_1],
  ],
  [
    'F-03 AC-014 an agent next that names no block gives a blocker at the next path',
    pipelineOf(flow(0, BUILD, undefined, agentNext(NOWHERE))),
    [AGENT_NEXT_0_1],
  ],
  [
    'F-03 AC-014 an agent next that names the start of its own flow gives a blocker at the next path (F-02 kind rule)',
    withBlocks(agentNext('3fff52cc-43dd-53cf-9d5a-408b257fecce')),
    [AGENT_NEXT_0_1],
  ],
  [
    'F-03 AC-014 a start next that names an agent of another flow gives a blocker at the next path',
    pipelineOf(flow(0, BUILD, REVIEW, startNext(blockId(REVIEW, 2))), flow(1, REVIEW, undefined)),
    [START_NEXT_0_0],
  ],
  [
    'F-03 AC-014 a start next that names no block gives a blocker at the next path',
    pipelineOf(flow(0, BUILD, undefined, startNext(NOWHERE))),
    [START_NEXT_0_0],
  ],
  [
    'F-03 AC-014 a start next that names the end of its own flow gives a blocker at the next path (F-02 kind rule)',
    pipelineOf(flow(0, BUILD, undefined, startNext(blockId(BUILD, 3)))),
    // The Agent is no arrow's target, so it follows the End in the arrow order: its next names an earlier block.
    [START_NEXT_0_0, { rule: 'block-link', path: 'pipeline.flows.0.blocks.1.next' }],
  ],
  [
    'F-03 AC-014 a valid config has no link finding',
    validConfig(),
    [],
  ],
  [
    'F-03 AC-016 a condition route that names a missing block is left to the route rule, not the links rule',
    withBlocks([
      { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '6235136f-9021-5aaf-9958-4bc813c4d9b1' },
      { index: 1, id: '6235136f-9021-5aaf-9958-4bc813c4d9b1', kind: 'condition', description: 'Checks.', true: { to: '71b2ecbc-b1ec-5b8f-b792-a30a35989a2e' }, false: { stop: true } },
      { index: 2, id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
    ]),
    [],
  ],
];

describe('F-03 AC-007, AC-008, AC-009, AC-010, AC-011 links between flows', () => {
  it.each(flowCases)('%s', (_name, config, expected) => {
    expect(blockersOf(config)).toEqual(expected);
  });
});

describe('F-03 AC-012, AC-014 links between blocks of one flow', () => {
  it.each([...blockCases, ...crossFlowCases])('%s', (_name, config, expected) => {
    expect(blockersOf(config)).toEqual(expected);
  });
});

describe('F-03 AC-007, AC-011, AC-014 findings of the links rule', () => {
  it('F-03 AC-007 every finding of this rule is a blocker with a message', () => {
    const findings = linksRule(pipelineOf(flow(0, BUILD, REVIEW), flow(1, REVIEW, NOWHERE)));
    expect(findings).toEqual([
      expect.objectContaining({
        severity: 'blocker',
        rule: 'flow-link',
        path: 'pipeline.flows.1.next',
        message: expect.stringContaining(NOWHERE),
      }),
    ]);
  });

  it('F-03 AC-011 a loop among flows is reported by the analysis entry', () => {
    const result = analyzeStructure(pipelineOf(flow(0, BUILD, REVIEW), flow(1, REVIEW, BUILD)));
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: 'flow-link', path: 'pipeline.flows.1.next' })]),
    );
  });

  it('F-03 AC-014 a block next that names another flow is reported by the analysis entry', () => {
    const result = analyzeStructure(
      pipelineOf(flow(0, BUILD, REVIEW, agentNext(blockId(REVIEW, 3))), flow(1, REVIEW, undefined)),
    );
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: 'block-link', path: 'pipeline.flows.0.blocks.1.next' })]),
    );
  });
});
