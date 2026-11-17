import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import type { Finding } from '../../src/pipeline/analyze/index.js';
import { buildConfig } from './analyze-fixture.js';

interface Expected {
  severity: Finding['severity'];
  path: string;
  // A fragment of the message, so a test cannot pass on a different finding at the same path.
  text: string;
}

interface Case {
  name: string;
  flowIds: string[];
  expected: Expected[];
}

// Each flow is a copy of the fixture flow with the given id. Copies repeat block ids and flow ids, which other
// rules report; the test looks only at the findings of the generated-names rule.
const cases: Case[] = [
  {
    name: 'F-04 AC-019 a single flow named build is not a clash',
    flowIds: ['build'],
    expected: [],
  },
  {
    name: 'F-04 AC-019 a flow whose id is pipeline is a blocker at the flow path',
    flowIds: ['pipeline'],
    expected: [{ severity: 'blocker', path: 'pipeline.flows[0]', text: 'clashes with pipeline.md' }],
  },
  {
    name: 'F-04 AC-019 a second flow whose id is pipeline is named by its own index',
    flowIds: ['build', 'pipeline'],
    expected: [{ severity: 'blocker', path: 'pipeline.flows[1]', text: 'clashes with pipeline.md' }],
  },
  {
    name: 'F-04 AC-019 every flow whose id is pipeline gives its own blocker',
    flowIds: ['pipeline', 'review', 'pipeline'],
    expected: [
      { severity: 'blocker', path: 'pipeline.flows[0]', text: 'clashes with pipeline.md' },
      { severity: 'blocker', path: 'pipeline.flows[2]', text: 'clashes with pipeline.md' },
    ],
  },
  {
    name: 'F-04 AC-019 ids that only contain pipeline are not a clash',
    flowIds: ['pipelines', 'pipeline-review', 'my-pipeline'],
    expected: [],
  },
];

describe('F-04 AC-019 a flow named pipeline is refused by the structural analysis', () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      const config = buildConfig((config) => {
        const first = config.pipeline.flows[0];
        if (!first) {
          throw new Error('the fixture has one flow');
        }
        config.pipeline.flows = testCase.flowIds.map((id) => ({ ...structuredClone(first), id }));
      });
      const findings = analyzeStructure(config).filter((finding) => finding.message.includes('pipeline.md'));
      expect(findings).toHaveLength(testCase.expected.length);
      testCase.expected.forEach((expected, index) => {
        const finding = findings[index];
        expect(finding?.severity).toBe(expected.severity);
        expect(finding?.path).toBe(expected.path);
        expect(finding?.message).toContain(expected.text);
      });
    });
  }
});
