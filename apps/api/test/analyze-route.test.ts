import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeStructure } from '@sddbuilder/core';
import type { ProjectConfig } from '@sddbuilder/core';
import { analyze, type ReviewModel, type ReviewReply } from '../src/analyze.js';
import { createApp } from '../src/app.js';
import { fixedLimits } from './fixed-limits.js';
import type { LogPort } from '../src/log.js';

// The analysis is wrapped so one case can make it throw an unexpected error; otherwise it runs as built.
vi.mock('../src/analyze.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/analyze.js')>();
  return { ...actual, analyze: vi.fn(actual.analyze) };
});

const IDEA = 'A tool that turns a product idea into a spec-driven project framework.';
const ANALYZE_URL = 'http://localhost/analyze';

// Each test starts with the real analysis and no queued one-shot failure, so a rejection cannot leak into the next test.
beforeEach(() => {
  vi.mocked(analyze).mockReset();
});

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
    connections: [{ id: 'c1', from: 'specify', to: 'implement-cycle', artifact: 'plan.md' }],
    targets: ['claude'],
  };
}

/** A configuration the structural rules refuse: two workflows share one id. */
function duplicateIdConfig(): ProjectConfig {
  const config = sampleConfig();
  const first = config.workflows[0];
  if (first === undefined) throw new Error('sample config has no workflow');
  return { ...config, workflows: [...config.workflows, { ...first }] };
}

interface FakeModel {
  model: ReviewModel;
  calls: string[];
}

/** A fake model that records each prompt and answers with the given behaviour. */
function fakeModel(behaviour: () => Promise<ReviewReply>): FakeModel {
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
  return fakeModel(() => Promise.resolve({ text, truncated: false }));
}

/** A log port that keeps every line it receives. */
function recordingLog(): LogPort & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    write: (line: string) => {
      lines.push(line);
    },
  };
}

function postAnalyze(app: ReturnType<typeof createApp>, body: unknown): Response | Promise<Response> {
  return app.request(ANALYZE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('F-07 AC-001 POST /analyze returns the analysis as JSON', () => {
  it('F-07 AC-001 returns 200 with a body equal to analyze(config, model)', async () => {
    const config = sampleConfig();
    const reply = JSON.stringify([
      { severity: 'info', subject: 'testRules', message: 'Name the coverage tool.' },
    ]);
    const expected = await analyze(config, replyWith(reply).model);
    vi.mocked(analyze).mockClear();
    const app = createApp({ limits: fixedLimits(), review: replyWith(reply).model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, config);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
    expect(await response.json()).toEqual(expected);
  });

  it('F-07 AC-001 calls the review model and analyze exactly once per request', async () => {
    const fake = replyWith('[]');
    vi.mocked(analyze).mockClear();
    const app = createApp({ limits: fixedLimits(), review: fake.model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, sampleConfig());

    expect(response.status).toBe(200);
    expect(vi.mocked(analyze)).toHaveBeenCalledTimes(1);
    expect(fake.calls).toHaveLength(1);
  });
});

describe('F-07 AC-004 a refused configuration is an analysis, not an HTTP error', () => {
  it('F-07 AC-004 returns 200 with blocker findings for a duplicate id', async () => {
    const config = duplicateIdConfig();
    const app = createApp({ limits: fixedLimits(), review: replyWith('[]').model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, config);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { findings: { severity: string }[] };
    expect(body.findings.some((finding) => finding.severity === 'blocker')).toBe(true);
    expect(body.findings).toEqual(analyzeStructure(config));
  });
});

describe('F-07 AC-005 a failed review still returns 200 with the structural findings', () => {
  const failures: [string, () => Promise<ReviewReply>][] = [
    [
      'the model throws',
      () => {
        throw new Error('provider unavailable');
      },
    ],
    ['the model times out', () => Promise.reject(new Error('timeout'))],
    [
      'the model replies with text that is not JSON',
      () => Promise.resolve({ text: 'Here are my thoughts.', truncated: false }),
    ],
  ];

  for (const [label, behaviour] of failures) {
    it(`F-07 AC-005 returns 200 with review.status failed when ${label}`, async () => {
      const config = duplicateIdConfig();
      const app = createApp({ limits: fixedLimits(), review: fakeModel(behaviour).model, log: recordingLog(), generation: null });

      const response = await postAnalyze(app, config);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        findings: analyzeStructure(config),
        review: { status: 'failed', findings: [], dropped: 0 },
      });
    });
  }
});

describe('F-13 AC-025 a truncated review reply gives 200 with review.status failed', () => {
  it('F-13 AC-025 returns 200 with the structural findings and review.status failed', async () => {
    const config = duplicateIdConfig();
    const truncated = fakeModel(() => Promise.resolve({ text: '[{"severity":"info"', truncated: true }));
    const app = createApp({ limits: fixedLimits(), review: truncated.model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, config);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      findings: analyzeStructure(config),
      review: { status: 'failed', findings: [], dropped: 0 },
    });
  });
});

describe('F-07 AC-025 unknown paths and wrong methods on /analyze', () => {
  it('F-07 AC-025 returns 404 with a JSON error for an unknown path', async () => {
    const app = createApp({ limits: fixedLimits(), review: replyWith('[]').model, log: recordingLog(), generation: null });

    const response = await app.request('http://localhost/nowhere');

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
    expect(await response.json()).toEqual({ error: 'not found' });
  });

  const methods = ['GET', 'PUT', 'DELETE'];

  for (const method of methods) {
    it(`F-07 AC-025 returns 405 with Allow: POST for ${method} on /analyze`, async () => {
      const app = createApp({ limits: fixedLimits(), review: replyWith('[]').model, log: recordingLog(), generation: null });

      const response = await app.request(ANALYZE_URL, { method });

      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('POST');
      expect(await response.json()).toEqual({ error: 'method not allowed' });
    });
  }
});

describe('F-07 AC-027 an unexpected exception gives a generic 500', () => {
  it('F-07 AC-027 returns 500 with a generic error and no exception text', async () => {
    const secret = 'secret detail at /srv/app/internal.ts';
    vi.mocked(analyze).mockRejectedValueOnce(new TypeError(secret));
    const log = recordingLog();
    const app = createApp({ limits: fixedLimits(), review: replyWith('[]').model, log, generation: null });

    const response = await postAnalyze(app, sampleConfig());

    expect(response.status).toBe(500);
    expect(vi.mocked(analyze)).toHaveBeenCalledTimes(1);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: 'internal error' });
    expect(text).not.toContain(secret);
  });

  it('F-07 AC-027 logs the error name only, never its message', async () => {
    const secret = 'secret detail at /srv/app/internal.ts';
    vi.mocked(analyze).mockRejectedValueOnce(new RangeError(secret));
    const log = recordingLog();
    const app = createApp({ limits: fixedLimits(), review: replyWith('[]').model, log, generation: null });

    await postAnalyze(app, sampleConfig());

    expect(log.lines).toEqual(['event=unexpected_error route=/analyze status=500 error=RangeError']);
    expect(log.lines.join('\n')).not.toContain(secret);
  });
});
