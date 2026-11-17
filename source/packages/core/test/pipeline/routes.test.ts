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

// A second flow with its own Start, Agent and End, so a route can name a block of another flow.
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

// Puts a Check into the build flow at `index` (1 is after the Start, 2 is after the Agent), with the given routes.
// The block before it is connected to it, so the Check sits in the chain.
function insertCheck(config: ProjectConfig, index: number, routeTrue: Route, routeFalse: Route): void {
  const flow = config.pipeline.flows[0];
  flow?.blocks.splice(index, 0, {
    id: 'build-check',
    kind: 'check',
    description: 'Checks the build.',
    type: 'checks',
    connectedTo: { true: routeTrue, false: routeFalse },
  });
  const before = flow?.blocks[index - 1];
  if (before?.kind === 'start' || before?.kind === 'agent') {
    before.connectedTo = { to: 'build-check', label: 'code' };
  }
}

const cases: Case[] = [
  {
    name: 'F-03 AC-015 a back route to an earlier block with a round limit has no finding',
    config: buildConfig((config) => {
      insertCheck(config, 2, { to: 'build-agent', roundLimit: 2 }, { stop: true });
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-015 a back route to the Start with a round limit has no finding',
    config: buildConfig((config) => {
      insertCheck(config, 2, { to: 'build-start', roundLimit: 1 }, { stop: true });
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-016 a forward route to a later block has no finding',
    config: buildConfig((config) => {
      insertCheck(config, 1, { to: 'build-agent' }, { stop: true });
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-016 a forward route to a later block with a round limit has no finding',
    config: buildConfig((config) => {
      insertCheck(config, 2, { to: 'build-end', roundLimit: 3 }, { stop: true });
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-017 a route to the Check itself is a blocker at its path',
    config: buildConfig((config) => {
      insertCheck(config, 2, { to: 'build-check' }, { stop: true });
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0].blocks[2].connectedTo.true', text: 'the Check itself' }],
  },
  {
    name: 'F-03 AC-017 a route to the Check itself with a round limit is still a blocker and no warning',
    config: buildConfig((config) => {
      insertCheck(config, 2, { to: 'build-check', roundLimit: 2 }, { stop: true });
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0].blocks[2].connectedTo.true', text: 'the Check itself' }],
  },
  {
    name: 'F-03 AC-017 a false route to the Check itself is a blocker at the false path',
    config: buildConfig((config) => {
      insertCheck(config, 2, { stop: true }, { to: 'build-check' });
    }),
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0].blocks[2].connectedTo.false', text: 'the Check itself' }],
  },
  {
    name: 'F-03 AC-018 a back route with no round limit is a warning at its path',
    config: buildConfig((config) => {
      insertCheck(config, 2, { to: 'build-agent' }, { stop: true });
    }),
    expected: [{ severity: 'warning', path: 'pipeline.flows[0].blocks[2].connectedTo.true', text: 'no round limit' }],
  },
  {
    name: 'F-03 AC-018 a back route to the Start with no round limit is a warning at its path',
    config: buildConfig((config) => {
      insertCheck(config, 2, { stop: true }, { to: 'build-start' });
    }),
    expected: [{ severity: 'warning', path: 'pipeline.flows[0].blocks[2].connectedTo.false', text: 'no round limit' }],
  },
  {
    name: 'F-03 AC-018 two back routes with no round limit give one warning each, at their own paths',
    config: buildConfig((config) => {
      insertCheck(config, 2, { to: 'build-agent' }, { to: 'build-start' });
    }),
    expected: [
      { severity: 'warning', path: 'pipeline.flows[0].blocks[2].connectedTo.false', text: 'no round limit' },
      { severity: 'warning', path: 'pipeline.flows[0].blocks[2].connectedTo.true', text: 'no round limit' },
    ],
  },
  {
    name: 'F-03 AC-018 a back route with a round limit beside a back route with none gives one warning',
    config: buildConfig((config) => {
      insertCheck(config, 2, { to: 'build-agent', roundLimit: 2 }, { to: 'build-start' });
    }),
    expected: [{ severity: 'warning', path: 'pipeline.flows[0].blocks[2].connectedTo.false', text: 'no round limit' }],
  },
  {
    name: 'F-03 AC-015 a route to a block of another flow is skipped here, so only the reference blocker remains',
    config: buildConfig((config) => {
      addReviewFlow(config);
      insertCheck(config, 2, { to: 'review-agent' }, { stop: true });
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2].connectedTo.true', text: 'a block of another flow' },
    ],
  },
  {
    name: 'F-03 AC-015 a route to a missing block is skipped here, so only the reference blocker remains',
    config: buildConfig((config) => {
      insertCheck(config, 2, { to: 'build-missing' }, { stop: true });
    }),
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0].blocks[2].connectedTo.true', text: 'which is no block' },
    ],
  },
  {
    name: 'F-03 AC-015 a Check with stop on both routes has no route finding',
    config: buildConfig((config) => {
      insertCheck(config, 2, { stop: true }, { stop: true });
    }),
    expected: [],
  },
];

describe('F-03 AC-015 to AC-018 back routes, self routes and round limits', () => {
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

describe('F-03 AC-018 a config whose only findings are warnings has no blocker', () => {
  it('F-03 AC-018 a back route with no round limit leaves the config with warnings and no blocker', () => {
    const config = buildConfig((item) => {
      insertCheck(item, 2, { to: 'build-agent' }, { stop: true });
    });
    const findings = analyzeStructure(config);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.severity === 'warning')).toBe(true);
    expect(findings.some((finding) => finding.severity === 'blocker')).toBe(false);
  });
});
