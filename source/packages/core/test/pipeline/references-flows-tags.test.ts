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

// A second flow with its own Start, Agent and End, so a flow link can name a flow of the pipeline.
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

// Adds a rule with the given id to `rules`. The rule text is not checked here.
function addRule(config: ProjectConfig, id: string): void {
  config.rules.push({ id, title: `Rule ${id}`, text: 'A rule for the tag tests.' });
}

// Sets the rule tags of the Agent of the first flow, the block at index 1 in the valid fixture.
function setAgentTags(config: ProjectConfig, ruleTags: string[]): void {
  const agent = config.pipeline.flows[0]?.blocks[1];
  if (agent?.kind === 'agent') {
    agent.ruleTags = ruleTags;
  }
}

const cases: Case[] = [
  {
    name: 'F-03 AC-008 a flow connection that names a flow of the pipeline is accepted',
    config: buildConfig((config) => {
      addReviewFlow(config);
      const build = config.pipeline.flows[0];
      if (build) {
        build.connectedTo = { to: 'review', label: 'built' };
      }
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-008 a flow connection with an approval gate is checked the same way and accepted',
    config: buildConfig((config) => {
      addReviewFlow(config);
      const build = config.pipeline.flows[0];
      if (build) {
        build.connectedTo = {
          to: 'review',
          label: 'built',
          gate: { kind: 'approval', description: 'The owner approves the build.' },
        };
      }
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-008 a flow without a connection gives no finding',
    config: buildConfig((config) => {
      addReviewFlow(config);
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-008 a flow connection that names no flow gives a blocker at its path',
    config: buildConfig((config) => {
      const build = config.pipeline.flows[0];
      if (build) {
        build.connectedTo = { to: 'missing-flow', label: 'built' };
      }
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].connectedTo',
        text: 'which is no flow of the pipeline',
      },
    ],
  },
  {
    name: 'F-03 AC-008 a flow connection that names a block id, not a flow, gives a blocker',
    config: buildConfig((config) => {
      addReviewFlow(config);
      const build = config.pipeline.flows[0];
      if (build) {
        build.connectedTo = { to: 'review-agent', label: 'built' };
      }
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].connectedTo',
        text: '"review-agent"',
      },
    ],
  },
  {
    name: 'F-03 AC-008 a flow connection on the second flow that names no flow gives a blocker at that flow path',
    config: buildConfig((config) => {
      addReviewFlow(config);
      const review = config.pipeline.flows[1];
      if (review) {
        review.connectedTo = { to: 'nowhere', label: 'reviewed' };
      }
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
    name: 'F-03 AC-011 a pipeline rule tag that names a rule gives no finding',
    config: buildConfig((config) => {
      addRule(config, 'style');
      config.pipeline.ruleTags = ['style'];
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-011 a pipeline rule tag that names no rule gives a blocker at the tag',
    config: buildConfig((config) => {
      addRule(config, 'style');
      config.pipeline.ruleTags = ['style', 'security'];
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.ruleTags[1]',
        text: 'names no rule',
      },
    ],
  },
  {
    name: 'F-03 AC-011 a pipeline rule tag with no rules at all gives a blocker',
    config: buildConfig((config) => {
      config.pipeline.ruleTags = ['style'];
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.ruleTags[0]',
        text: 'names no rule',
      },
    ],
  },
  {
    name: 'F-03 AC-011 a flow rule tag that names no rule gives a blocker at the tag',
    config: buildConfig((config) => {
      addRule(config, 'style');
      const build = config.pipeline.flows[0];
      if (build) {
        build.ruleTags = ['style', 'security'];
      }
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].ruleTags[1]',
        text: 'names no rule',
      },
    ],
  },
  {
    name: 'F-03 AC-011 a flow rule tag that names a flow id, not a rule, gives a blocker',
    config: buildConfig((config) => {
      addReviewFlow(config);
      const build = config.pipeline.flows[0];
      if (build) {
        build.ruleTags = ['review'];
      }
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].ruleTags[0]',
        text: 'names no rule',
      },
    ],
  },
  {
    name: 'F-03 AC-011 an agent rule tag that names a rule gives no finding',
    config: buildConfig((config) => {
      addRule(config, 'style');
      setAgentTags(config, ['style']);
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-011 an agent rule tag that names no rule gives a blocker at the tag',
    config: buildConfig((config) => {
      addRule(config, 'style');
      setAgentTags(config, ['missing-rule']);
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[1].ruleTags[0]',
        text: 'names no rule',
      },
    ],
  },
  {
    name: 'F-03 AC-011 an absent rule tag list gives no finding',
    config: buildConfig((config) => {
      addRule(config, 'style');
    }),
    expected: [],
  },
  {
    name: 'F-03 AC-011 tags on the pipeline, a flow and an agent each give their own blocker in document order',
    config: buildConfig((config) => {
      config.pipeline.ruleTags = ['missing-a'];
      const build = config.pipeline.flows[0];
      if (build) {
        build.ruleTags = ['missing-b'];
      }
      setAgentTags(config, ['missing-c']);
    }),
    expected: [
      {
        severity: 'blocker',
        path: 'pipeline.ruleTags[0]',
        text: 'names no rule',
      },
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].ruleTags[0]',
        text: 'names no rule',
      },
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].blocks[1].ruleTags[0]',
        text: 'names no rule',
      },
    ],
  },
];

describe('F-03 AC-008, AC-011 flow links and rule tags', () => {
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
