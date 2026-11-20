import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { linksRule } from '../../src/pipeline/analyze/links.js';
import type { Block, Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig } from './analyze-fixture.js';

// A flow with Start → Agent → End under its own ids (prefixed by the flow id), so two flows never clash.
function linear(prefix: string): Block[] {
  return [
    { index: 0, id: `${prefix}-start`, kind: 'start', next: `${prefix}-agent` },
    {
      index: 1,
      id: `${prefix}-agent`,
      kind: 'agent',
      name: `${prefix}-agent`,
      description: 'Builds the project.',
      arguments: [],
      next: `${prefix}-end`,
    },
    { index: 2, id: `${prefix}-end`, kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
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
  return pipelineOf(flow(0, 'build', undefined, blocks));
}

// The block list of the build flow with the Agent's `next` changed.
function agentNext(next: string): Block[] {
  return linear('build').map((block) => (block.kind === 'agent' ? { ...block, next } : block));
}

// The block list of the build flow with the Start's `next` changed.
function startNext(next: string): Block[] {
  return linear('build').map((block) => (block.kind === 'start' ? { ...block, next } : block));
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
    pipelineOf(flow(0, 'build', 'review'), flow(1, 'review', undefined)),
    [],
  ],
  [
    'F-03 AC-007 a next that names no flow gives a blocker at the next path',
    pipelineOf(flow(0, 'build', 'review'), flow(1, 'review', 'nowhere')),
    [FLOW_NEXT_1],
  ],
  [
    'F-03 AC-008 a next that names its own flow gives a blocker at the next path',
    pipelineOf(flow(0, 'build', 'build')),
    [FLOW_NEXT_0],
  ],
  [
    'F-03 AC-009 two flows whose next names the same flow give a blocker at the second next',
    pipelineOf(flow(0, 'build', 'ship'), flow(1, 'review', 'ship'), flow(2, 'ship', undefined)),
    [FLOW_NEXT_1],
  ],
  [
    'F-03 AC-010 two flows with no link give a blocker at each flow path',
    pipelineOf(flow(0, 'build', undefined), flow(1, 'review', undefined)),
    [FLOW_0, FLOW_1],
  ],
  [
    'F-03 AC-010 a flow with no link in a pipeline of three flows gives a blocker at its path',
    pipelineOf(flow(0, 'build', 'review'), flow(1, 'review', undefined), flow(2, 'ship', undefined)),
    [FLOW_2],
  ],
  [
    'F-03 AC-010 a single flow with no next has no finding',
    pipelineOf(flow(0, 'build', undefined)),
    [],
  ],
  [
    'F-03 AC-011 a two-flow loop gives one blocker at the next that closes it',
    pipelineOf(flow(0, 'build', 'review'), flow(1, 'review', 'build')),
    [FLOW_NEXT_1],
  ],
  [
    'F-03 AC-011 a three-flow loop gives one blocker at the next that closes it',
    pipelineOf(flow(0, 'build', 'review'), flow(1, 'review', 'ship'), flow(2, 'ship', 'build')),
    [FLOW_NEXT_2],
  ],
  [
    'F-03 AC-011 a chain that ends without a next has no finding',
    pipelineOf(flow(0, 'build', 'review'), flow(1, 'review', undefined)),
    [],
  ],
  [
    'F-03 AC-011 a chain of three flows that ends without a next has no finding',
    pipelineOf(flow(0, 'build', 'review'), flow(1, 'review', 'ship'), flow(2, 'ship', undefined)),
    [],
  ],
];

const blockCases: Array<[string, ProjectConfig, Expected[]]> = [
  [
    'F-03 AC-012 an agent whose next names itself gives a blocker at its next path',
    withBlocks(agentNext('build-agent')),
    [AGENT_NEXT_0_1],
  ],
  [
    'F-03 AC-012 a chain of agents that returns to an earlier agent gives one blocker at the closing next',
    withBlocks([
      { index: 0, id: 'start', kind: 'start', next: 'agent-1' },
      { index: 1, id: 'agent-1', kind: 'agent', name: 'first', description: 'First.', arguments: [], next: 'agent-2' },
      { index: 2, id: 'agent-2', kind: 'agent', name: 'second', description: 'Second.', arguments: [], next: 'agent-1' },
      { index: 3, id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
    ]),
    [{ rule: 'block-link', path: 'pipeline.flows.0.blocks.2.next' }],
  ],
  [
    'F-03 AC-012 a chain of blocks that moves forward and ends at the End has no finding',
    withBlocks(linear('build')),
    [],
  ],
];

const crossFlowCases: Array<[string, ProjectConfig, Expected[]]> = [
  [
    'F-03 AC-014 an agent next that names a block of another flow gives a blocker at the next path',
    pipelineOf(
      flow(0, 'build', 'review', agentNext('review-end')),
      flow(1, 'review', undefined),
    ),
    [AGENT_NEXT_0_1],
  ],
  [
    'F-03 AC-014 an agent next that names no block gives a blocker at the next path',
    pipelineOf(flow(0, 'build', undefined, agentNext('nowhere'))),
    [AGENT_NEXT_0_1],
  ],
  [
    'F-03 AC-014 an agent next that names the start of its own flow gives a blocker at the next path (F-02 kind rule)',
    withBlocks(agentNext('build-start')),
    [AGENT_NEXT_0_1],
  ],
  [
    'F-03 AC-014 a start next that names an agent of another flow gives a blocker at the next path',
    pipelineOf(flow(0, 'build', 'review', startNext('review-agent')), flow(1, 'review', undefined)),
    [START_NEXT_0_0],
  ],
  [
    'F-03 AC-014 a start next that names no block gives a blocker at the next path',
    pipelineOf(flow(0, 'build', undefined, startNext('nowhere'))),
    [START_NEXT_0_0],
  ],
  [
    'F-03 AC-014 a start next that names the end of its own flow gives a blocker at the next path (F-02 kind rule)',
    pipelineOf(flow(0, 'build', undefined, startNext('build-end'))),
    [START_NEXT_0_0],
  ],
  [
    'F-03 AC-014 a valid config has no link finding',
    validConfig(),
    [],
  ],
  [
    'F-03 AC-014 a condition route that names a missing block is left to the route rule (T006)',
    withBlocks([
      { index: 0, id: 'start', kind: 'start', next: 'check' },
      { index: 1, id: 'check', kind: 'condition', description: 'Checks.', true: { to: 'missing' }, false: { stop: true } },
      { index: 2, id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
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
    const findings = linksRule(pipelineOf(flow(0, 'build', 'review'), flow(1, 'review', 'nowhere')));
    expect(findings).toEqual([
      expect.objectContaining({
        severity: 'blocker',
        rule: 'flow-link',
        path: 'pipeline.flows.1.next',
        message: expect.stringContaining('nowhere'),
      }),
    ]);
  });

  it('F-03 AC-011 a loop among flows is reported by the analysis entry', () => {
    const result = analyzeStructure(pipelineOf(flow(0, 'build', 'review'), flow(1, 'review', 'build')));
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: 'flow-link', path: 'pipeline.flows.1.next' })]),
    );
  });

  it('F-03 AC-014 a block next that names another flow is reported by the analysis entry', () => {
    const result = analyzeStructure(
      pipelineOf(flow(0, 'build', 'review', agentNext('review-end')), flow(1, 'review', undefined)),
    );
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: 'block-link', path: 'pipeline.flows.0.blocks.1.next' })]),
    );
  });
});
