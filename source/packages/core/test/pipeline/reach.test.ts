import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import type { Finding } from '../../src/pipeline/analyze/index.js';
import type { Agent, Block, Check, End, Flow, ProjectConfig, Route, Start } from '../../src/pipeline/model.js';
import { buildConfig } from './analyze-fixture.js';

interface Expected {
  severity: Finding['severity'];
  path: string;
  // A fragment of the message, so a test cannot pass on the wrong finding at the same path.
  text: string;
}

interface Case {
  name: string;
  config: ProjectConfig;
  expected: Expected[];
}

const NOT_REACHED = 'is not reached';

function startBlock(id: string, to?: string): Start {
  return { id, kind: 'start', ...(to === undefined ? {} : { connectedTo: { to, label: 'feature-id' } }) };
}

function agentBlock(id: string, to?: string): Agent {
  return {
    id,
    kind: 'agent',
    name: id,
    description: 'Runs the step.',
    arguments: 'feature-id',
    ...(to === undefined ? {} : { connectedTo: { to, label: 'next' } }),
  };
}

function endBlock(id: string): End {
  return { id, kind: 'end', outcome: 'done' };
}

function checkBlock(id: string, routeTrue: Route, routeFalse: Route): Check {
  return { id, kind: 'check', description: 'Checks the build.', type: 'checks', connectedTo: { true: routeTrue, false: routeFalse } };
}

// A flow of Start → Agent → End whose ids do not clash with the fixture's.
function flowNamed(id: string): Flow {
  return {
    id,
    name: id,
    description: 'A flow for the reachability tests.',
    arguments: 'feature-id',
    blocks: [startBlock(`${id}-start`, `${id}-agent`), agentBlock(`${id}-agent`, `${id}-end`), endBlock(`${id}-end`)],
  };
}

function flowAt(config: ProjectConfig, flowIndex: number): Flow {
  const flow = config.pipeline.flows[flowIndex];
  if (flow === undefined) {
    throw new Error(`The test has no flow ${flowIndex}.`);
  }
  return flow;
}

// Sets the Connection of a flow to another flow of the pipeline.
function connectFlow(config: ProjectConfig, flowIndex: number, to: string): void {
  flowAt(config, flowIndex).connectedTo = { to, label: 'next' };
}

// The build flow with a Check between the Agent and the End. The Check's true route goes to the End; its false route is
// given by the test.
function checkChain(falseRoute: Route): Block[] {
  return [
    startBlock('build-start', 'build-agent'),
    agentBlock('build-agent', 'build-check'),
    checkBlock('build-check', { to: 'build-end' }, falseRoute),
    endBlock('build-end'),
  ];
}

// A Check that retries an agent through a back route. `build-retry` has no Connection into it: only the Check's back
// route reaches it.
function retryChain(falseRoute: Route): Block[] {
  return [
    startBlock('build-start', 'build-agent'),
    agentBlock('build-agent', 'build-check'),
    agentBlock('build-retry', 'build-check'),
    checkBlock('build-check', { to: 'build-end' }, falseRoute),
    endBlock('build-end'),
  ];
}

const cases: Case[] = [
  {
    name: 'F-03 AC-019 a chain from the Start that reaches every block has no finding',
    config: buildConfig(),
    expected: [],
  },
  {
    name: 'F-03 AC-019 an Agent that no Connection reaches gives one blocker at the block',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = [
        startBlock('build-start', 'build-agent'),
        agentBlock('build-agent', 'build-end'),
        endBlock('build-end'),
        agentBlock('build-orphan', 'build-end'),
      ];
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0].blocks[3]', text: NOT_REACHED }],
  },
  {
    name: 'F-03 AC-019 two unreached blocks, each reached only from the other chain, give one blocker each',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = [
        startBlock('build-start', 'build-agent'),
        agentBlock('build-agent', 'build-end'),
        endBlock('build-end'),
        agentBlock('build-orphan-a', 'build-orphan-b'),
        agentBlock('build-orphan-b', 'build-end'),
      ];
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[3]', text: NOT_REACHED },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[4]', text: NOT_REACHED },
    ],
  },
  {
    name: 'F-03 AC-019 a Start with no Connection leaves every later block unreached',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = [
        startBlock('build-start'),
        agentBlock('build-agent', 'build-end'),
        endBlock('build-end'),
      ];
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[1]', text: NOT_REACHED },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: NOT_REACHED },
    ],
  },
  {
    name: 'F-03 AC-019 a Connection to a missing block is not followed, so the block after it is unreached',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = [
        startBlock('build-start', 'build-agent'),
        agentBlock('build-agent', 'build-missing'),
        endBlock('build-end'),
      ];
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[1].connectedTo', text: 'which is no block' },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: NOT_REACHED },
    ],
  },
  {
    name: 'F-03 AC-019 a Check route to a block reaches it, so the block has no finding',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = [
        startBlock('build-start', 'build-check'),
        checkBlock('build-check', { to: 'build-end' }, { to: 'build-fix' }),
        agentBlock('build-fix', 'build-end'),
        endBlock('build-end'),
      ];
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-019 a stop route is not followed, so the block it would have named is unreached',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = [
        startBlock('build-start', 'build-check'),
        checkBlock('build-check', { to: 'build-end' }, { stop: true }),
        agentBlock('build-fix', 'build-end'),
        endBlock('build-end'),
      ];
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: NOT_REACHED }],
  },
  {
    name: 'F-03 AC-020 a block reached only by a back route from a reached Check is reachable',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = retryChain({ to: 'build-retry', roundLimit: 2 });
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-020 the same block with no back route is unreached',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = retryChain({ stop: true });
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: NOT_REACHED }],
  },
  {
    name: 'F-03 AC-020 a back route from an unreached Check does not reach its target',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = [
        startBlock('build-start', 'build-agent'),
        agentBlock('build-agent', 'build-end'),
        agentBlock('build-retry', 'build-end'),
        checkBlock('build-check', { to: 'build-end' }, { to: 'build-retry', roundLimit: 2 }),
        endBlock('build-end'),
      ];
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: NOT_REACHED },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[3]', text: NOT_REACHED },
    ],
  },
  {
    name: 'F-03 AC-021 a flow that no flow Connection reaches from the first flow gives one blocker at the flow',
    config: buildConfig((config) => {
      config.pipeline.flows.push(flowNamed('review'));
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[1]', text: 'is not reached from the first flow' }],
  },
  {
    name: 'F-03 AC-022 a flow reached through a chain of flow Connections from the first flow has no finding',
    config: buildConfig((config) => {
      config.pipeline.flows.push(flowNamed('review'), flowNamed('test'));
      connectFlow(config, 0, 'review');
      connectFlow(config, 1, 'test');
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-022 a flow reached only from an unreached flow is unreached and gives a blocker',
    config: buildConfig((config) => {
      config.pipeline.flows.push(flowNamed('review'), flowNamed('test'));
      connectFlow(config, 1, 'test');
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[1]', text: 'is not reached from the first flow' },
      { severity: 'blocker', path: 'pipeline.flows[2]', text: 'is not reached from the first flow' },
    ],
  },
  {
    name: 'F-03 AC-023 an unreached flow with an unreached block gives one blocker at the flow, not one at the block',
    config: buildConfig((config) => {
      const review = flowNamed('review');
      review.blocks.push(agentBlock('review-orphan', 'review-end'));
      config.pipeline.flows.push(review);
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[1]', text: 'is not reached from the first flow' }],
  },
  {
    name: 'F-03 AC-023 an unreached flow whose blocks are all reached from its Start gives one blocker at the flow',
    config: buildConfig((config) => {
      config.pipeline.flows.push(flowNamed('review'));
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[1]', text: 'is not reached from the first flow' }],
  },
  {
    name: 'F-03 AC-023 a reached flow with no Start is not checked for block reachability',
    config: buildConfig((config) => {
      config.pipeline.flows.push({
        id: 'review',
        name: 'review',
        description: 'A flow for the reachability tests.',
        arguments: 'feature-id',
        blocks: [agentBlock('review-agent', 'review-end'), endBlock('review-end')],
      });
      connectFlow(config, 0, 'review');
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[1]', text: 'has no Start block' }],
  },
  {
    name: 'F-03 AC-019 a second Start is not the origin, so its own block is unreached and the flow is checked from the first Start',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = [
        startBlock('build-start'),
        agentBlock('build-agent', 'build-end'),
        endBlock('build-end'),
        startBlock('build-start-2', 'build-agent'),
      ];
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[1]', text: NOT_REACHED },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: NOT_REACHED },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[3]', text: 'more than one Start block' },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[3]', text: NOT_REACHED },
    ],
  },
  {
    name: 'F-03 AC-019 a flow with two Starts counts the first one, which reaches the chain',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = [
        startBlock('build-start', 'build-agent'),
        agentBlock('build-agent', 'build-end'),
        endBlock('build-end'),
        startBlock('build-start-2', 'build-end'),
      ];
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[3]', text: 'more than one Start block' },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[3]', text: NOT_REACHED },
    ],
  },
  {
    name: 'F-03 AC-019 a Check with both routes to the chain reaches every block it names',
    config: buildConfig((config) => {
      flowAt(config, 0).blocks = checkChain({ to: 'build-end' });
    }),
    expected: [],
  },
];

describe('F-03 AC-019 to AC-023 reachability from the Start and of flows', () => {
  it.each(cases)('$name', ({ config, expected }) => {
    const findings = analyzeStructure(config);
    expect(findings.map(({ severity, path }) => ({ severity, path }))).toEqual(
      expected.map(({ severity, path }) => ({ severity, path })),
    );
    expected.forEach((item, index) => {
      expect(findings[index]?.message).toContain(item.text);
    });
  });
});
