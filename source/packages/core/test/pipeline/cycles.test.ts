import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import type { Finding } from '../../src/pipeline/analyze/index.js';
import type { Flow, ProjectConfig } from '../../src/pipeline/model.js';
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

// A second flow of Start → Agent → End, with ids that do not clash with the fixture's.
function flowNamed(id: string): Flow {
  return {
    id,
    name: id,
    description: 'A flow for the loop tests.',
    arguments: 'feature-id',
    blocks: [
      { id: `${id}-start`, kind: 'start', connectedTo: { to: `${id}-agent`, label: 'feature-id' } },
      {
        id: `${id}-agent`,
        kind: 'agent',
        name: `${id}-agent`,
        description: 'Runs the step.',
        arguments: 'feature-id',
        connectedTo: { to: `${id}-end`, label: 'done' },
      },
      { id: `${id}-end`, kind: 'end', outcome: 'done' },
    ],
  };
}

// Sets the Connection of a Start, Agent or Approval block of a flow.
function connect(config: ProjectConfig, flowIndex: number, blockId: string, to: string): void {
  const block = config.pipeline.flows[flowIndex]?.blocks.find((item) => item.id === blockId);
  if (block === undefined || block.kind === 'check' || block.kind === 'end') {
    throw new Error(`The test has no connecting block "${blockId}" in flow ${flowIndex}.`);
  }
  block.connectedTo = { to, label: 'next' };
}

// Sets the Connection of a flow to another flow of the pipeline.
function connectFlow(config: ProjectConfig, flowIndex: number, to: string): void {
  const flow = config.pipeline.flows[flowIndex];
  if (flow === undefined) {
    throw new Error(`The test has no flow ${flowIndex}.`);
  }
  flow.connectedTo = { to, label: 'next' };
}

// Inserts an Approval block before the End of the build flow, so a loop can run through three blocks.
function addBuildApproval(config: ProjectConfig): void {
  config.pipeline.flows[0]?.blocks.splice(2, 0, {
    id: 'build-approval',
    kind: 'approval',
    description: 'The owner approves the build.',
  });
}

const cases: Case[] = [
  {
    name: 'F-03 AC-012 a chain of Connections with no loop has no finding',
    config: buildConfig(),
    expected: [],
  },
  {
    name: 'F-03 AC-012 a Connection back to the Start closes a loop and is reported at that Connection',
    config: buildConfig((config) => {
      connect(config, 0, 'build-agent', 'build-start');
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0].blocks[1].connectedTo', text: 'closes a loop' }],
  },
  {
    name: 'F-03 AC-012 a loop of three blocks gives one blocker at the Connection that closes it',
    config: buildConfig((config) => {
      addBuildApproval(config);
      connect(config, 0, 'build-agent', 'build-approval');
      connect(config, 0, 'build-approval', 'build-agent');
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0].blocks[2].connectedTo', text: 'closes a loop' }],
  },
  {
    name: 'F-03 AC-012 a block whose Connection names itself is a loop',
    config: buildConfig((config) => {
      connect(config, 0, 'build-agent', 'build-agent');
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0].blocks[1].connectedTo', text: 'closes a loop' }],
  },
  {
    name: 'F-03 AC-012 two loops in one flow give one blocker each, in document order',
    config: buildConfig((config) => {
      addBuildApproval(config);
      connect(config, 0, 'build-agent', 'build-agent');
      connect(config, 0, 'build-approval', 'build-approval');
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[1].connectedTo', text: 'closes a loop' },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2].connectedTo', text: 'closes a loop' },
    ],
  },
  {
    name: 'F-03 AC-012 a loop in a second flow is reported at that flow, not the first',
    config: buildConfig((config) => {
      config.pipeline.flows.push(flowNamed('review'));
      connect(config, 1, 'review-agent', 'review-start');
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[1].blocks[1].connectedTo', text: 'closes a loop' }],
  },
  {
    name: 'F-03 AC-012 a Connection to a missing block is not followed, so only the reference blocker remains',
    config: buildConfig((config) => {
      connect(config, 0, 'build-agent', 'build-missing');
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[1].connectedTo', text: 'which is no block' },
    ],
  },
  {
    name: 'F-03 AC-012 a Connection to a block of another flow is not followed, so only the reference blockers remain',
    config: buildConfig((config) => {
      config.pipeline.flows.push(flowNamed('review'));
      connect(config, 0, 'build-agent', 'review-agent');
      connect(config, 1, 'review-agent', 'build-agent');
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[1].connectedTo', text: 'a block of another flow' },
      { severity: 'blocker', path: 'pipeline.flows[1].blocks[1].connectedTo', text: 'a block of another flow' },
    ],
  },
  {
    name: 'F-03 AC-013 a chain of flow Connections with no loop has no finding',
    config: buildConfig((config) => {
      config.pipeline.flows.push(flowNamed('review'));
      connectFlow(config, 0, 'review');
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-013 a flow Connection that closes a loop between two flows gives one blocker at the flow link',
    config: buildConfig((config) => {
      config.pipeline.flows.push(flowNamed('review'));
      connectFlow(config, 0, 'review');
      connectFlow(config, 1, 'build');
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[1].connectedTo', text: 'closes a loop' }],
  },
  {
    name: 'F-03 AC-013 a loop of three flows gives one blocker at the flow link that closes it',
    config: buildConfig((config) => {
      config.pipeline.flows.push(flowNamed('review'), flowNamed('test'));
      connectFlow(config, 0, 'review');
      connectFlow(config, 1, 'test');
      connectFlow(config, 2, 'build');
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[2].connectedTo', text: 'closes a loop' }],
  },
  {
    name: 'F-03 AC-013 a flow whose Connection names itself is a loop',
    config: buildConfig((config) => {
      connectFlow(config, 0, 'build');
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0].connectedTo', text: 'closes a loop' }],
  },
  {
    name: 'F-03 AC-013 a flow Connection to a missing flow is not followed, so only the reference blocker remains',
    config: buildConfig((config) => {
      config.pipeline.flows.push(flowNamed('review'));
      connectFlow(config, 0, 'review');
      connectFlow(config, 1, 'missing-flow');
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[1].connectedTo',
        text: 'which is no flow of the pipeline',
      },
    ],
  },
  {
    name: 'F-03 AC-014 a Check route back to an earlier block is not a Connection, so it is no loop',
    config: buildConfig((config) => {
      config.pipeline.flows[0]?.blocks.splice(2, 0, {
        id: 'build-check',
        kind: 'check',
        description: 'The build passes its checks.',
        type: 'checks',
        connectedTo: { true: { to: 'build-agent' }, false: { stop: true } },
      });
      connect(config, 0, 'build-agent', 'build-check');
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-014 a Check route back to the Start is not a Connection, so it is no loop',
    config: buildConfig((config) => {
      config.pipeline.flows[0]?.blocks.splice(2, 0, {
        id: 'build-check',
        kind: 'check',
        description: 'The build passes its checks.',
        type: 'checks',
        connectedTo: { true: { to: 'build-start' }, false: { stop: true } },
      });
      connect(config, 0, 'build-agent', 'build-check');
    }),
    expected: [],
  },
];

describe('F-03 AC-012 to AC-014 loops among Connections', () => {
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
