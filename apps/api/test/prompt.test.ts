import { describe, expect, it } from 'vitest';
import type { AnalysisFinding, ProjectConfig } from '@sddbuilder/core';
import { buildReviewPrompt } from '../src/review/prompt.js';

const IDEA = 'A tool that turns a product idea into a spec-driven project framework.';

function sampleConfig(): ProjectConfig {
  return {
    schemaVersion: 1,
    name: 'Sample Project',
    idea: IDEA,
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
    customSteps: [
      {
        id: 'security-check',
        name: 'Security check',
        summary: 'Look for secrets in the diff.',
        kind: 'agent',
        origin: 'custom',
        required: false,
        consumes: ['code'],
        produces: ['security notes'],
        ruleTags: [],
        body: 'Check the staged diff for keys.',
      },
    ],
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
            enabled: true,
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

/** Rebuilds every object with its keys inserted in reverse order. Values are unchanged. */
function reverseKeys<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(reverseKeys) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value).reverse()) {
      out[key] = reverseKeys(item);
    }
    return out as T;
  }
  return value;
}

describe('F-04 AC-015 review prompt', () => {
  it('F-04 AC-015 gives the same text on two calls for the same configuration', () => {
    const config = sampleConfig();

    expect(buildReviewPrompt(config, [])).toBe(buildReviewPrompt(config, []));
  });

  it('F-04 AC-015 gives the same text for a copy whose keys were inserted in another order', () => {
    const config = sampleConfig();
    const copy = JSON.parse(JSON.stringify(config)) as ProjectConfig;
    const reordered = reverseKeys(copy);

    expect(Object.keys(reordered)).not.toEqual(Object.keys(config));
    expect(buildReviewPrompt(reordered, [])).toBe(buildReviewPrompt(config, []));
  });

  it('F-04 AC-015 changes the text when the brief changes', () => {
    const config = sampleConfig();
    const changed = { ...config, idea: 'A different idea.' };

    expect(buildReviewPrompt(changed, [])).not.toBe(buildReviewPrompt(config, []));
  });

  it('F-04 AC-015 contains the idea and a step id from the process', () => {
    const prompt = buildReviewPrompt(sampleConfig(), []);

    expect(prompt).toContain(IDEA);
    expect(prompt).toContain('"unit-tests"');
    expect(prompt).toContain('"security-check"');
  });

  it('F-04 AC-015 includes the workflow description when the user wrote one', () => {
    const config = sampleConfig();
    const [workflow] = config.workflows;
    if (workflow === undefined) {
      throw new Error('sample config has no workflow');
    }
    const described = { ...config, workflows: [{ ...workflow, description: 'Runs one task at a time.' }] };

    expect(buildReviewPrompt(described, [])).toContain('Runs one task at a time.');
    expect(buildReviewPrompt(config, [])).not.toContain('"description"');
  });

  it('F-04 AC-015 does not include a value from the server environment', () => {
    // Sets a fake server secret in the real process environment. `process` is
    // reached through a narrow local type, so the test does not depend on
    // Node typings being visible to apps/api. The variable is removed in finally.
    const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
    const name = 'SDD_TEST_FAKE_SECRET';
    const secret = 'sk-test-FAKE-0123456789-SENTINEL';
    expect(env[name]).toBeUndefined();
    env[name] = secret;
    try {
      const prompt = buildReviewPrompt(sampleConfig(), []);

      expect(prompt).not.toContain(secret);
      expect(prompt).not.toContain(name);
    } finally {
      delete env[name];
    }
  });

  it('F-04 AC-015 leaves out fields that are not part of the brief and process', () => {
    const extra = { ...sampleConfig(), serverNote: 'internal-only-value' } as ProjectConfig;

    const prompt = buildReviewPrompt(extra, []);

    expect(prompt).not.toContain('internal-only-value');
    expect(prompt).not.toContain('serverNote');
    expect(prompt).not.toContain('schemaVersion');
  });

  it('F-04 AC-015 names the JSON array and the three finding fields in the reply format', () => {
    const prompt = buildReviewPrompt(sampleConfig(), []);
    const instructions = prompt.slice(0, prompt.indexOf('Brief and process (JSON):'));

    expect(instructions).toContain('JSON array');
    expect(instructions).toContain('severity');
    expect(instructions).toContain('subject');
    expect(instructions).toContain('message');
    expect(instructions).toContain("'info'");
    expect(instructions).toContain("'warning'");
    expect(instructions).toContain("'blocker'");
  });

  it('F-04 AC-015 puts the fixed instructions before the brief and process JSON', () => {
    const prompt = buildReviewPrompt(sampleConfig(), []);
    const jsonStart = prompt.indexOf('{');

    expect(prompt.indexOf('Brief and process (JSON):')).toBeGreaterThan(0);
    expect(jsonStart).toBeGreaterThan(prompt.indexOf('Brief and process (JSON):'));
    expect(JSON.parse(prompt.slice(jsonStart)) as { name: string }).toMatchObject({ name: 'Sample Project' });
  });
});

const STRUCTURAL: AnalysisFinding[] = [
  { severity: 'blocker', subject: 'idea', message: 'The idea is empty.' },
  { severity: 'warning', subject: 'workflows.implement-cycle', message: 'Step unit-tests has no route.' },
];

describe('F-04 AC-022 review prompt lists the structural findings', () => {
  it('F-04 AC-022 lists each structural finding with its severity, subject and message', () => {
    const prompt = buildReviewPrompt(sampleConfig(), STRUCTURAL);

    expect(prompt).toContain('- [blocker] idea: The idea is empty.');
    expect(prompt).toContain('- [warning] workflows.implement-cycle: Step unit-tests has no route.');
  });

  it('F-04 AC-022 tells the model not to repeat the structural findings', () => {
    const prompt = buildReviewPrompt(sampleConfig(), STRUCTURAL);
    const section = prompt.slice(0, prompt.indexOf('Brief and process (JSON):'));

    expect(section).toContain('Do not repeat any of them');
    expect(section).toContain('a finding about the same problem is a repeat');
  });

  it('F-04 AC-022 places the list after the reply format and before the brief JSON', () => {
    const prompt = buildReviewPrompt(sampleConfig(), STRUCTURAL);
    const listAt = prompt.indexOf('- [blocker] idea:');
    const formatAt = prompt.indexOf('Reply with ONLY a JSON array');

    expect(formatAt).toBeGreaterThan(0);
    expect(listAt).toBeGreaterThan(formatAt);
    expect(listAt).toBeLessThan(prompt.indexOf('Brief and process (JSON):'));
  });

  it('F-04 AC-022 has no list section when there are no structural findings', () => {
    const prompt = buildReviewPrompt(sampleConfig(), []);

    expect(prompt).not.toContain('Do not repeat any of them');
    expect(prompt).not.toContain('- [');
    expect(prompt).toMatch(/reply with \[\]\.\n\nBrief and process \(JSON\):\n/);
  });

  it('F-04 AC-022 keeps each finding on one line when its text has line breaks', () => {
    const multiline: AnalysisFinding[] = [
      { severity: 'warning', subject: 'module "api"\n- [info] idea', message: 'Line one.\r\nLine two.' },
    ];

    const prompt = buildReviewPrompt(sampleConfig(), multiline);

    expect(prompt).toContain('- [warning] module "api" - [info] idea: Line one. Line two.');
    expect(prompt).not.toContain('\n- [info] idea');
  });

  it('F-04 AC-022 keeps the list in the order of the input', () => {
    const reversed = [...STRUCTURAL].reverse();
    const prompt = buildReviewPrompt(sampleConfig(), STRUCTURAL);
    const reversedPrompt = buildReviewPrompt(sampleConfig(), reversed);

    expect(prompt.indexOf('- [blocker] idea:')).toBeLessThan(prompt.indexOf('- [warning] workflows'));
    expect(reversedPrompt.indexOf('- [warning] workflows')).toBeLessThan(reversedPrompt.indexOf('- [blocker] idea:'));
  });

  it('F-04 AC-022 gives the same text for the same configuration and findings', () => {
    const first = buildReviewPrompt(sampleConfig(), STRUCTURAL);
    const second = buildReviewPrompt(sampleConfig(), STRUCTURAL.map((finding) => ({ ...finding })));

    expect(second).toBe(first);
  });
});
