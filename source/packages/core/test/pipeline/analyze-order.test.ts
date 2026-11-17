import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import type { Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { buildConfig } from './analyze-fixture.js';

// A config with problems from several rules, in two flows. The build flow has a tag that names no rule
// (references), and a retry with no round limit (routes). The review flow has no End (start and end) and a
// Connection that closes a loop (loops). The start and end rule runs first, but its finding in the second
// flow must still come after the finding of the first flow.
function problemConfig(): ProjectConfig {
  return buildConfig((config) => {
    const build = config.pipeline.flows[0];
    if (!build) {
      throw new Error('the fixture has no flow');
    }
    build.blocks = [
      { id: 'build-start', kind: 'start', connectedTo: { to: 'build-agent', label: 'feature-id' } },
      {
        id: 'build-agent',
        kind: 'agent',
        name: 'build',
        description: 'Builds the feature.',
        arguments: 'feature-id',
        ruleTags: ['missing-rule'],
        connectedTo: { to: 'build-check', label: 'code' },
      },
      {
        id: 'build-check',
        kind: 'check',
        description: 'Checks the build.',
        type: 'checks',
        connectedTo: { true: { to: 'build-end' }, false: { to: 'build-agent' } },
      },
      { id: 'build-end', kind: 'end', outcome: 'done' },
    ];
    build.connectedTo = { to: 'review', label: 'handoff' };
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
          connectedTo: { to: 'review-start', label: 'loop' },
        },
      ],
    };
    config.pipeline.flows.push(review);
  });
}

describe('F-03 AC-025 a config with problems from several rules returns every finding in document order', () => {
  it('F-03 AC-025 returns every finding, from every rule family, in flow then block order', () => {
    const findings = analyzeStructure(problemConfig());
    expect(findings.map((finding) => [finding.severity, finding.path])).toEqual([
      ['blocker', 'pipeline.flows[0].blocks[1].ruleTags[0]'],
      ['warning', 'pipeline.flows[0].blocks[2].connectedTo.false'],
      ['blocker', 'pipeline.flows[1]'],
      ['blocker', 'pipeline.flows[1].blocks[1].connectedTo'],
    ]);
  });
});
