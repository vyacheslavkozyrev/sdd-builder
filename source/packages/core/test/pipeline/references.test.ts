import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import type { Finding } from '../../src/pipeline/analyze/index.js';
import type { Flow, ProjectConfig, Route } from '../../src/pipeline/model.js';
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

// A second flow with its own Start, Agent and End, so a link can name a block of another flow.
function addReviewFlow(config: ProjectConfig): void {
  const review: Flow = {
    id: 'review',
    name: 'Review',
    description: 'Reviews the build.',
    arguments: 'feature-id',
    blocks: [
      { id: 'review-start', kind: 'start', connectedTo: { to: 'review-agent', label: 'feature-id' } },
      {
        id: 'review-agent',
        kind: 'agent',
        name: 'review',
        description: 'Reviews the build.',
        arguments: 'feature-id',
        connectedTo: { to: 'review-end', label: 'review' },
      },
      { id: 'review-end', kind: 'end', outcome: 'done' },
    ],
  };
  config.pipeline.flows.push(review);
}

// Puts a Check between the Start and the Agent of the first flow, with the given routes.
function insertCheck(config: ProjectConfig, routeTrue: Route, routeFalse: Route): void {
  const flow = config.pipeline.flows[0];
  flow?.blocks.splice(1, 0, {
    id: 'build-check',
    kind: 'check',
    description: 'Checks the build.',
    type: 'checks',
    connectedTo: { true: routeTrue, false: routeFalse },
  });
  const start = flow?.blocks[0];
  if (start?.kind === 'start') {
    start.connectedTo = { to: 'build-check', label: 'feature-id' };
  }
}

const cases: Case[] = [
  {
    name: 'F-03 AC-006 a connection that names a block of another flow gives a blocker at its path',
    config: buildConfig((config) => {
      addReviewFlow(config);
      const agent = config.pipeline.flows[0]?.blocks[1];
      if (agent?.kind === 'agent') {
        agent.connectedTo = { to: 'review-agent', label: 'code' };
      }
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[1].connectedTo',
        text: 'a block of another flow',
      },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: 'is not reached' },
      { severity: 'blocker', path: 'pipeline.flows[1]', text: 'is not reached from the first flow' },
    ],
  },
  {
    name: 'F-03 AC-006 a Start connection that names a block of another flow gives a blocker',
    config: buildConfig((config) => {
      addReviewFlow(config);
      const start = config.pipeline.flows[0]?.blocks[0];
      if (start?.kind === 'start') {
        start.connectedTo = { to: 'review-end', label: 'feature-id' };
      }
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[0].connectedTo',
        text: 'a block of another flow',
      },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[1]', text: 'is not reached' },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: 'is not reached' },
      { severity: 'blocker', path: 'pipeline.flows[1]', text: 'is not reached from the first flow' },
    ],
  },
  {
    name: 'F-03 AC-007 a connection that names no block gives a blocker at its path',
    config: buildConfig((config) => {
      const agent = config.pipeline.flows[0]?.blocks[1];
      if (agent?.kind === 'agent') {
        agent.connectedTo = { to: 'missing-block', label: 'code' };
      }
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[1].connectedTo',
        text: 'which is no block',
      },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: 'is not reached' },
    ],
  },
  {
    name: 'F-03 AC-007 a connection that names a flow id, not a block, gives a blocker',
    config: buildConfig((config) => {
      addReviewFlow(config);
      const agent = config.pipeline.flows[0]?.blocks[1];
      if (agent?.kind === 'agent') {
        agent.connectedTo = { to: 'review', label: 'code' };
      }
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[1].connectedTo',
        text: 'which is no block',
      },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: 'is not reached' },
      { severity: 'blocker', path: 'pipeline.flows[1]', text: 'is not reached from the first flow' },
    ],
  },
  {
    name: 'F-03 AC-009 a Check route that names a block of another flow gives a blocker at the route',
    config: buildConfig((config) => {
      addReviewFlow(config);
      insertCheck(config, { to: 'review-agent' }, { to: 'build-agent', roundLimit: 2 });
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[1].connectedTo.true',
        text: 'a block of another flow',
      },
      { severity: 'blocker', path: 'pipeline.flows[1]', text: 'is not reached from the first flow' },
    ],
  },
  {
    name: 'F-03 AC-009 a Check route that names no block gives a blocker at the route',
    config: buildConfig((config) => {
      insertCheck(config, { to: 'build-agent' }, { to: 'nowhere' });
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[1].connectedTo.false',
        text: 'which is no block',
      },
    ],
  },
  {
    name: 'F-03 AC-009 both routes of a Check are checked, each at its own path',
    config: buildConfig((config) => {
      addReviewFlow(config);
      insertCheck(config, { to: 'review-end' }, { to: 'nowhere' });
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[1].connectedTo.false',
        text: 'which is no block',
      },
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[1].connectedTo.true',
        text: 'a block of another flow',
      },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: 'is not reached' },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[3]', text: 'is not reached' },
      { severity: 'blocker', path: 'pipeline.flows[1]', text: 'is not reached from the first flow' },
    ],
  },
  {
    name: 'F-03 AC-010 a Check route with stop gives no finding',
    config: buildConfig((config) => {
      insertCheck(config, { to: 'build-agent' }, { stop: true });
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-010 a Check with both routes stopped gives no reference finding; the blocks after it are unreached',
    config: buildConfig((config) => {
      insertCheck(config, { stop: true }, { stop: true });
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2]', text: 'is not reached' },
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[3]', text: 'is not reached' },
    ],
  },
  {
    name: 'F-03 AC-009 a Check route to a block of its own flow gives no finding',
    config: buildConfig((config) => {
      insertCheck(config, { to: 'build-end' }, { to: 'build-agent', roundLimit: 3 });
    }),
    expected: [],
  },
];

describe('F-03 AC-006, AC-007, AC-009, AC-010 block and route references', () => {
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
