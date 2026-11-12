import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '@sddbuilder/core';
import type { ProjectConfig } from '@sddbuilder/core';
import { analyze, type ReviewModel } from '../src/analyze.js';

const IDEA = 'A tool that turns a product idea into a spec-driven project framework.';

function sampleConfig(idea: string = IDEA): ProjectConfig {
  return {
    schemaVersion: 1,
    name: 'Sample Project',
    idea,
    stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
    architecture: {
      style: 'layered',
      modules: [
        { name: 'core', layer: 0, responsibility: 'Domain rules', dependsOn: [] },
        { name: 'api', layer: 1, responsibility: 'HTTP', dependsOn: ['core'] },
      ],
      notes: 'Core has no I/O.',
    },
    codeRules: ['Validate input at the boundary.'],
    testRules: ['Use Vitest for unit tests.'],
    customSteps: [],
    workflows: [
      {
        id: 'implement-cycle',
        name: 'Implement',
        scope: 'task',
        iterationSource: 'plan.md',
        enabled: true,
        steps: [
          { stepId: 'implement', enabled: true },
          { stepId: 'unit-tests', enabled: true },
        ],
        conditions: [
          {
            id: 'tests-pass',
            afterStepId: 'unit-tests',
            gate: { id: 'tests-pass', type: 'checks', required: true },
            pass: { kind: 'next' },
            fail: { kind: 'step', stepId: 'implement' },
            roundLimit: 3,
          },
        ],
      },
    ],
    connections: [
      { id: 'c1', from: 'specify', to: 'implement-cycle', artifact: 'plan.md' },
    ],
    targets: ['claude'],
  };
}

/** A configuration with a structural blocker (an empty idea), so the structural findings are not empty. */
function configWithStructuralFindings(): ProjectConfig {
  return sampleConfig('');
}

interface FakeModel {
  model: ReviewModel;
  calls: string[];
}

/** A fake model that records each prompt and answers with the given behaviour. */
function fakeModel(behaviour: () => Promise<string>): FakeModel {
  const calls: string[] = [];
  return {
    calls,
    model: {
      complete: (prompt: string) => {
        calls.push(prompt);
        return behaviour();
      },
    },
  };
}

function replyWith(text: string): FakeModel {
  return fakeModel(() => Promise.resolve(text));
}

describe('F-04 AC-013 review failure keeps the structural findings', () => {
  it('F-04 AC-013 gives a failed review with no findings when the model throws', async () => {
    const config = configWithStructuralFindings();
    const fake = fakeModel(() => {
      throw new Error('provider unavailable');
    });

    const result = await analyze(config, fake.model);

    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
    expect(result.findings).toEqual(analyzeStructure(config));
  });

  it('F-04 AC-013 gives a failed review with no findings when the model rejects', async () => {
    const config = configWithStructuralFindings();
    const fake = fakeModel(() => Promise.reject(new Error('timeout')));

    const result = await analyze(config, fake.model);

    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
    expect(result.findings).toEqual(analyzeStructure(config));
  });
});

describe('F-04 AC-014 review with findings and without', () => {
  it('F-04 AC-014 gives an ok review with no findings for an empty array, structural findings unchanged', async () => {
    const config = configWithStructuralFindings();

    const result = await analyze(config, replyWith('[]').model);

    expect(result.review).toEqual({ status: 'ok', findings: [], dropped: 0 });
    expect(result.findings).toEqual(analyzeStructure(config));
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('F-04 AC-014 gives an ok review with the model findings for a valid array', async () => {
    const config = configWithStructuralFindings();
    const reply = JSON.stringify([
      { severity: 'info', subject: 'testRules', message: 'Name the coverage tool.' },
    ]);

    const result = await analyze(config, replyWith(reply).model);

    expect(result.review).toEqual({
      status: 'ok',
      findings: [{ severity: 'info', subject: 'testRules', message: 'Name the coverage tool.' }],
      dropped: 0,
    });
    expect(result.findings).toEqual(analyzeStructure(config));
  });
});

describe('F-04 AC-018 unusable reply gives a failed review', () => {
  it('F-04 AC-018 gives a failed review with dropped 0 for a reply that is not JSON', async () => {
    const config = configWithStructuralFindings();

    const result = await analyze(config, replyWith('Here are my thoughts: none.').model);

    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
    expect(result.findings).toEqual(analyzeStructure(config));
  });

  it('F-04 AC-018 gives a failed review for a JSON reply that is not an array', async () => {
    const config = configWithStructuralFindings();
    const reply = JSON.stringify({ findings: [{ severity: 'info', subject: 'a', message: 'b' }] });

    const result = await analyze(config, replyWith(reply).model);

    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
    expect(result.findings).toEqual(analyzeStructure(config));
  });

  const nonArrayReplies = ['42', 'null', '"[]"', 'true', '{"severity":"info","subject":"a","message":"b"}'];

  for (const reply of nonArrayReplies) {
    it(`F-04 AC-018 gives a failed review with dropped 0 for the JSON value ${reply}`, async () => {
      const config = configWithStructuralFindings();

      const result = await analyze(config, replyWith(reply).model);

      expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
      expect(result.findings).toEqual(analyzeStructure(config));
    });
  }
});

describe('F-04 AC-019 the review never changes the structural findings', () => {
  const replies = [
    '[]',
    '[{"severity":"blocker","subject":"idea","message":"Contradicts the structure."}]',
    '[{"severity":"info","subject":"","message":"no subject"}]',
    'not json',
    '{"x":1}',
    '42',
    'null',
  ];

  for (const reply of replies) {
    it(`F-04 AC-019 keeps the structural findings equal to analyzeStructure for reply ${reply}`, async () => {
      const config = configWithStructuralFindings();
      const expected = analyzeStructure(config);

      const result = await analyze(config, replyWith(reply).model);

      expect(result.findings).toEqual(expected);
    });
  }

  it('F-04 AC-019 does not add a model blocker to the structural findings', async () => {
    const config = configWithStructuralFindings();
    const reply = '[{"severity":"blocker","subject":"idea","message":"Blocks the build."}]';

    const result = await analyze(config, replyWith(reply).model);

    expect(result.findings).toEqual(analyzeStructure(config));
    expect(result.review.findings).toEqual([
      { severity: 'warning', subject: 'idea', message: 'Blocks the build.' },
    ]);
  });
});

describe('F-04 AC-020 one model call per request', () => {
  it('F-04 AC-020 calls the model exactly once for a valid reply', async () => {
    const fake = replyWith('[]');

    await analyze(configWithStructuralFindings(), fake.model);

    expect(fake.calls).toHaveLength(1);
  });

  it('F-04 AC-020 calls the model exactly once when its reply is invalid', async () => {
    const fake = replyWith('not json');

    await analyze(configWithStructuralFindings(), fake.model);

    expect(fake.calls).toHaveLength(1);
  });

  it('F-04 AC-020 calls the model exactly once when it fails', async () => {
    const fake = fakeModel(() => Promise.reject(new Error('down')));

    await analyze(configWithStructuralFindings(), fake.model);

    expect(fake.calls).toHaveLength(1);
  });
});
