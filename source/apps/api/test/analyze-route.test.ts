import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { analyzePipeline, type ReviewModel, type ReviewReply } from '../src/analyze.js';
import type { LogPort } from '../src/log.js';
import { createApp } from '../src/app.js';
import { fixedLimits } from './fixed-limits.js';
import { pipelineConfig, withPipelineRules } from './pipeline-config.js';

/** A log port that discards its lines: these tests do not check the log. */
const quietLog: LogPort = { write: () => undefined };

// The analysis is wrapped so one case can make it throw an unexpected error; otherwise it runs as built.
vi.mock('../src/analyze.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/analyze.js')>();
  return { ...actual, analyzePipeline: vi.fn(actual.analyzePipeline) };
});

const IDEA = 'A tool that turns a product idea into a spec-driven project framework.';
const ANALYZE_URL = 'http://localhost/analyze';
/** A flat schemaVersion 1 body: the pipeline reader refuses it. */
const FLAT_BODY = JSON.stringify({
  schemaVersion: 1,
  name: 'Sample Project',
  idea: IDEA,
  stack: { language: 'TypeScript' },
  architecture: { style: 'layered', modules: [], notes: 'Core has no I/O.' },
  codeRules: [],
  testRules: [],
  customSteps: [],
  workflows: [],
  connections: [],
  targets: ['claude'],
});

// Each test starts with the real analysis and no queued one-shot failure, so a rejection cannot leak into the next test.
beforeEach(() => {
  vi.mocked(analyzePipeline).mockReset();
});

/** The default pipeline config: a valid schemaVersion 2 body with no blocker. */
function sampleConfig(): pipeline.ProjectConfig {
  return pipelineConfig();
}

/** A configuration the structural rules refuse: a blank idea is a blocker. */
function refusedConfig(): pipeline.ProjectConfig {
  return pipelineConfig({ idea: '' });
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

describe('F-04 AC-019 POST /analyze on a pipeline config returns the analysis', () => {
  it('F-04 AC-019 returns 200 with exactly findings and review for a valid schemaVersion 2 config', async () => {
    const config = sampleConfig();
    const app = createApp({ limits: fixedLimits(), review: replyWith('[]').model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, config);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { findings: unknown; review: { status: string } };
    expect(Object.keys(body).sort()).toEqual(['findings', 'review']);
    expect(body.findings).toEqual(pipeline.analyzeStructure(config));
    expect(body.review.status).toBe('ok');
  });
});

describe('F-04 AC-020 a body that fails the pipeline parse is refused before any model call', () => {
  it('F-04 AC-020 returns 400 with project config is invalid and its problems, and does not call the model', async () => {
    const fake = replyWith('[]');
    const app = createApp({ limits: fixedLimits(), review: fake.model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, { ...sampleConfig(), pipeline: 'not a pipeline' });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; problems: string[] };
    expect(body.error).toBe('project config is invalid');
    expect(body.problems.length).toBeGreaterThan(0);
    expect(fake.calls).toHaveLength(0);
  });

  it('F-04 AC-020 refuses a flat schemaVersion 1 body with 400 and does not call the model', async () => {
    const fake = replyWith('[]');
    const app = createApp({ limits: fixedLimits(), review: fake.model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, FLAT_BODY);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; problems: string[] };
    expect(body.error).toBe('project config is invalid');
    expect(body.problems).toContain('schemaVersion: must be 2');
    expect(fake.calls).toHaveLength(0);
  });
});

describe('F-04 AC-021 the pipeline input caps run before any model call on /analyze', () => {
  const overCaps: [string, () => pipeline.ProjectConfig, string[]][] = [
    ['an idea over 8,000 characters', () => pipelineConfig({ idea: 'a'.repeat(8001) }), ['idea: 8001 characters, the limit is 8000']],
    ['more than 60 rules', () => withPipelineRules(61), ['rules: 61 rules, the limit is 60']],
    [
      'an idea and rules over the caps together',
      () => pipelineConfig({ idea: 'a'.repeat(8001), rules: withPipelineRules(61).rules }),
      ['idea: 8001 characters, the limit is 8000', 'rules: 61 rules, the limit is 60'],
    ],
  ];

  for (const [label, config, problems] of overCaps) {
    it(`F-04 AC-021 refuses ${label} with 422 listing the problems, and does not call the model`, async () => {
      const fake = replyWith('[]');
      const app = createApp({ limits: fixedLimits(), review: fake.model, log: recordingLog(), generation: null });

      const response = await postAnalyze(app, config());

      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: 'project config is over the input caps', problems });
      expect(fake.calls).toHaveLength(0);
    });
  }

  it('F-04 AC-021 accepts an idea of exactly 8,000 characters and exactly 60 rules', async () => {
    const fake = replyWith('[]');
    const app = createApp({ limits: fixedLimits(), review: fake.model, log: recordingLog(), generation: null });

    expect((await postAnalyze(app, pipelineConfig({ idea: 'a'.repeat(8000) }))).status).toBe(200);
    expect((await postAnalyze(app, withPipelineRules(60))).status).toBe(200);
    expect(fake.calls).toHaveLength(2);
  });
});

describe('F-07 AC-001 POST /analyze returns the analysis as JSON', () => {
  it('F-07 AC-001 returns 200 with a body equal to analyzePipeline(config, model)', async () => {
    const config = sampleConfig();
    const reply = JSON.stringify([
      { severity: 'info', subject: 'rules', message: 'Name the coverage tool.' },
    ]);
    const expected = await analyzePipeline(config, replyWith(reply).model, quietLog);
    vi.mocked(analyzePipeline).mockClear();
    const app = createApp({ limits: fixedLimits(), review: replyWith(reply).model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, config);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
    expect(await response.json()).toEqual(expected);
  });

  it('F-07 AC-001 calls the review model and analyzePipeline exactly once per request', async () => {
    const fake = replyWith('[]');
    vi.mocked(analyzePipeline).mockClear();
    const app = createApp({ limits: fixedLimits(), review: fake.model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, sampleConfig());

    expect(response.status).toBe(200);
    expect(vi.mocked(analyzePipeline)).toHaveBeenCalledTimes(1);
    expect(fake.calls).toHaveLength(1);
  });
});

describe('F-07 AC-004 a refused configuration is an analysis, not an HTTP error', () => {
  it('F-07 AC-004 returns 200 with blocker findings for a blank idea', async () => {
    const config = refusedConfig();
    const app = createApp({ limits: fixedLimits(), review: replyWith('[]').model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, config);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { findings: { severity: string }[] };
    expect(body.findings.some((finding) => finding.severity === 'blocker')).toBe(true);
    expect(body.findings).toEqual(pipeline.analyzeStructure(config));
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
      const config = refusedConfig();
      const app = createApp({ limits: fixedLimits(), review: fakeModel(behaviour).model, log: recordingLog(), generation: null });

      const response = await postAnalyze(app, config);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        findings: pipeline.analyzeStructure(config),
        review: { status: 'failed', findings: [], dropped: 0 },
      });
    });
  }
});

describe('F-13 AC-025 a truncated review reply gives 200 with review.status failed', () => {
  it('F-13 AC-025 returns 200 with the structural findings and review.status failed', async () => {
    const config = refusedConfig();
    const truncated = fakeModel(() => Promise.resolve({ text: '[{"severity":"info"', truncated: true }));
    const app = createApp({ limits: fixedLimits(), review: truncated.model, log: recordingLog(), generation: null });

    const response = await postAnalyze(app, config);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      findings: pipeline.analyzeStructure(config),
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
    vi.mocked(analyzePipeline).mockRejectedValueOnce(new TypeError(secret));
    const log = recordingLog();
    const app = createApp({ limits: fixedLimits(), review: replyWith('[]').model, log, generation: null });

    const response = await postAnalyze(app, sampleConfig());

    expect(response.status).toBe(500);
    expect(vi.mocked(analyzePipeline)).toHaveBeenCalledTimes(1);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: 'internal error' });
    expect(text).not.toContain(secret);
  });

  it('F-07 AC-027 logs the error name only, never its message', async () => {
    const secret = 'secret detail at /srv/app/internal.ts';
    vi.mocked(analyzePipeline).mockRejectedValueOnce(new RangeError(secret));
    const log = recordingLog();
    const app = createApp({ limits: fixedLimits(), review: replyWith('[]').model, log, generation: null });

    await postAnalyze(app, sampleConfig());

    expect(log.lines).toEqual(['event=unexpected_error route=/analyze status=500 error=RangeError']);
    expect(log.lines.join('\n')).not.toContain(secret);
  });
});
