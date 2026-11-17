import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import type { Finding } from '../../src/pipeline/analyze/index.js';
import type { ProjectConfig } from '../../src/pipeline/model.js';
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

const cases: Case[] = [
  {
    name: 'F-03 AC-001 a flow with one Start and one End has no finding',
    config: buildConfig(),
    expected: [],
  },
  {
    name: 'F-03 AC-002 a flow with no Start block gives a blocker at the flow',
    config: buildConfig((config) => {
      const flow = config.pipeline.flows[0];
      if (flow) {
        flow.blocks = flow.blocks.filter((block) => block.kind !== 'start');
      }
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0]', text: 'no Start block' }],
  },
  {
    name: 'F-03 AC-003 a flow with two Start blocks gives a blocker at the second Start',
    config: buildConfig((config) => {
      const flow = config.pipeline.flows[0];
      flow?.blocks.splice(1, 0, { id: 'build-start-2', kind: 'start' });
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[1]',
        text: 'more than one Start block',
      },
    ],
  },
  {
    name: 'F-03 AC-003 a second flow with two Start blocks is named by its own index',
    config: buildConfig((config) => {
      const first = config.pipeline.flows[0];
      if (first) {
        const second = structuredClone(first);
        second.id = 'review';
        second.blocks.splice(0, 0, { id: 'test-start-2', kind: 'start' });
        config.pipeline.flows.push(second);
      }
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[1].blocks[1]',
        text: 'more than one Start block',
      },
    ],
  },
  {
    name: 'F-03 AC-004 a flow with no End block gives a blocker at the flow',
    config: buildConfig((config) => {
      const flow = config.pipeline.flows[0];
      if (flow) {
        flow.blocks = flow.blocks.filter((block) => block.kind !== 'end');
      }
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0]', text: 'no End block' }],
  },
  {
    name: 'F-03 AC-004 an empty flow gives one blocker for the Start and one for the End',
    config: buildConfig((config) => {
      const flow = config.pipeline.flows[0];
      if (flow) {
        flow.blocks = [];
      }
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0]', text: 'no Start block' },
      { severity: 'blocker', path: 'pipeline.flows[0]', text: 'no End block' },
    ],
  },
  {
    name: 'F-03 AC-005 a pipeline with no flow gives a blocker at the flows path',
    config: buildConfig((config) => {
      config.pipeline.flows = [];
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows', text: 'no flow' }],
  },
];

describe('F-03 AC-001 to AC-005 start and end blocks of each flow', () => {
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
