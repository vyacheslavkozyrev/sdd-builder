import { describe, expect, it } from 'vitest';
import type { Context } from 'hono';
import { INPUT_CAPS, pipeline } from '@sddbuilder/core';
import type { ReviewModel, ReviewReply } from '../src/analyze.js';
import { createApp, type GenerationPorts } from '../src/app.js';
import { connectionAddress } from '../src/http/client-address.js';
import type { GenerationModel } from '../src/generate/generation-model.js';
import { ClientLimiter } from '../src/limits/client-limiter.js';
import { DailyCeiling } from '../src/limits/daily-ceiling.js';
import type { LogPort } from '../src/log.js';
import { pipelineConfig, withPipelineRules } from './pipeline-config.js';

const ANALYZE_URL = 'http://localhost/analyze';
const GENERATE_URL = 'http://localhost/generate';
/** 2026-11-13 12:00:30 UTC: 30 seconds into a minute window. */
const START = Date.UTC(2026, 10, 13, 12, 0, 30);
const ADDRESS = '203.0.113.7';

type App = ReturnType<typeof createApp>;

/** A clock the test moves by hand; the limiter reads it, so no test reads the wall clock. */
interface Clock {
  now: number;
  read: () => number;
}

function clockAt(now: number): Clock {
  const clock: Clock = { now, read: () => clock.now };
  return clock;
}

/** A review model that records each prompt and answers with an empty finding list. */
function recordingReview(): ReviewModel & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    complete: (prompt: string) => {
      calls.push(prompt);
      const reply: ReviewReply = { text: '[]', truncated: false };
      return Promise.resolve(reply);
    },
  };
}

/** A generation model that records each call; templates that throw show a request got past the limits. */
function recordingGeneration(): GenerationPorts & { calls: string[] } {
  const calls: string[] = [];
  const model: GenerationModel = {
    complete: (prompt: string) => {
      calls.push(prompt);
      return Promise.reject(new Error('the generation model must not be reached in this test'));
    },
  };
  return {
    calls,
    model,
    templates: {
      get: () => {
        throw new Error('the templates must not be read in this test');
      },
      paths: () => [],
    },
  };
}

function recordingLog(): LogPort {
  return { write: () => undefined };
}

function buildApp(
  clock: Clock,
  options: {
    address?: (c: Context) => string;
    generation?: GenerationPorts | null;
    review?: ReturnType<typeof recordingReview>;
  } = {},
): { app: App; review: ReturnType<typeof recordingReview> } {
  const review = options.review ?? recordingReview();
  const app = createApp({
    review,
    generation: options.generation ?? null,
    log: recordingLog(),
    limits: {
      limiter: new ClientLimiter(clock.read),
      clientAddress: options.address ?? (() => ADDRESS),
      reviewCeiling: new DailyCeiling(Number.MAX_SAFE_INTEGER, clock.read),
      generateCeiling: new DailyCeiling(Number.MAX_SAFE_INTEGER, clock.read),
    },
  });
  return { app, review };
}

/** A request body that is never read unless the app reads it: the stream does not pull until it is read. */
function unreadBody(onPull: () => void): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({ pull: onPull }, { highWaterMark: 0 });
}

function postConfig(app: App, url: string, config: unknown, env?: object): Response | Promise<Response> {
  return app.request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config) }, env);
}

/** Sends `count` valid analyze requests, each of which must be accepted (200). */
async function acceptMany(app: App, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(200);
  }
}

describe('F-13 AC-001 per-minute limit on the wire', () => {
  it('F-13 AC-001 answers 429 with Retry-After in whole seconds and the error body on the 11th request in a minute', async () => {
    const clock = clockAt(START);
    const { app, review } = buildApp(clock);
    await acceptMany(app, 10);

    const refused = await postConfig(app, ANALYZE_URL, pipelineConfig());

    expect(refused.status).toBe(429);
    expect(refused.headers.get('Retry-After')).toBe('30');
    expect(await refused.json()).toEqual({ error: 'rate limit exceeded' });
    expect(review.calls).toHaveLength(10);
  });

  it('F-13 AC-001 accepts again once the minute window has passed', async () => {
    const clock = clockAt(START);
    const { app } = buildApp(clock);
    await acceptMany(app, 10);
    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(429);

    clock.now = START + 30_000;

    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(200);
  });
});

describe('F-13 AC-003 limits are per client address', () => {
  it('F-13 AC-003 gives a second address its own count while the first is refused', async () => {
    const clock = clockAt(START);
    let current = '198.51.100.1';
    const { app } = buildApp(clock, { address: () => current });
    await acceptMany(app, 10);
    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(429);

    current = '198.51.100.2';

    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(200);
  });
});

describe('F-13 AC-004 one count covers both routes', () => {
  it('F-13 AC-004 adds /analyze and /generate requests to the same client total', async () => {
    const clock = clockAt(START);
    const { app } = buildApp(clock);
    // Generation is not configured, so each admitted /generate request answers 503: that is an accepted request.
    for (let i = 0; i < 5; i += 1) {
      expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(200);
      expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(503);
    }

    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(429);
    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(429);
  });
});

describe('F-13 AC-005 a rate-limited request is refused before its body is read and before any model call', () => {
  it('F-13 AC-005 never reads the body of a refused request and never calls the model', async () => {
    const clock = clockAt(START);
    const generation = recordingGeneration();
    const { app, review } = buildApp(clock, { generation });
    await acceptMany(app, 10);

    let pulled = 0;
    const onPull = () => {
      pulled += 1;
    };
    const refusedAnalyze = await app.request(
      new Request(ANALYZE_URL, { method: 'POST', body: unreadBody(onPull), duplex: 'half' } as RequestInit),
    );
    const refusedGenerate = await app.request(
      new Request(GENERATE_URL, { method: 'POST', body: unreadBody(onPull), duplex: 'half' } as RequestInit),
    );

    expect(refusedAnalyze.status).toBe(429);
    expect(refusedGenerate.status).toBe(429);
    expect(pulled).toBe(0);
    expect(review.calls).toHaveLength(10);
    expect(generation.calls).toHaveLength(0);
  });
});

describe('F-13 AC-007 requests that are not POST or not routes are not counted', () => {
  it('F-13 AC-007 leaves the limit untouched by 405 and 404 answers', async () => {
    const clock = clockAt(START);
    const { app } = buildApp(clock);
    for (let i = 0; i < 20; i += 1) {
      expect((await app.request(ANALYZE_URL, { method: 'GET' })).status).toBe(405);
      expect((await app.request(GENERATE_URL, { method: 'PUT' })).status).toBe(405);
      expect((await app.request('http://localhost/unknown', { method: 'POST' })).status).toBe(404);
    }

    await acceptMany(app, 10);
    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(429);
  });
});

describe('F-13 AC-008 the client address is the connection address', () => {
  it('F-13 AC-008 counts by the remote address, so a forwarded-address header changes nothing', async () => {
    const clock = clockAt(START);
    const { app } = buildApp(clock, { address: connectionAddress });
    const env = { incoming: { socket: { remoteAddress: '198.51.100.9' } } };
    for (let i = 0; i < 10; i += 1) {
      const response = await app.request(
        new Request(ANALYZE_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'X-Forwarded-For': `192.0.2.${i}` },
          body: JSON.stringify(pipelineConfig()),
        }),
        undefined,
        env,
      );
      expect(response.status).toBe(200);
    }

    const refused = await app.request(
      new Request(ANALYZE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Forwarded-For': '192.0.2.200' },
        body: JSON.stringify(pipelineConfig()),
      }),
      undefined,
      env,
    );

    expect(refused.status).toBe(429);

    const otherConnection = await app.request(
      new Request(ANALYZE_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(pipelineConfig()) }),
      undefined,
      { incoming: { socket: { remoteAddress: '198.51.100.10' } } },
    );
    expect(otherConnection.status).toBe(200);
  });
});

describe('F-13 AC-010 idea length cap', () => {
  it('F-04 AC-021 accepts an idea of exactly 8,000 characters on /analyze and refuses 8,001 with 422 before any model call', async () => {
    const clock = clockAt(START);
    const review = recordingReview();
    const { app } = buildApp(clock, { review, generation: null });

    const atLimit = await postConfig(app, ANALYZE_URL, pipelineConfig({ idea: 'a'.repeat(8000) }));
    expect(atLimit.status).toBe(200);

    const over = await postConfig(app, ANALYZE_URL, pipelineConfig({ idea: 'a'.repeat(8001) }));
    expect(over.status).toBe(422);
    expect(await over.json()).toEqual({
      error: 'project config is over the input caps',
      problems: ['idea: 8001 characters, the limit is 8000'],
    });
    expect(review.calls).toHaveLength(1);
  });

  it('F-13 AC-010 refuses an idea of 8,001 characters on /generate with 422 before any model call', async () => {
    const clock = clockAt(START);
    const generation = recordingGeneration();
    const { app } = buildApp(clock, { generation });

    const over = await postConfig(app, GENERATE_URL, pipelineConfig({ idea: 'a'.repeat(8001) }));

    expect(over.status).toBe(422);
    expect(generation.calls).toHaveLength(0);
  });
});

describe('F-13 AC-012 rule cap', () => {
  it('F-04 AC-021 accepts 60 rules and refuses 61 on /analyze with 422 before any model call', async () => {
    const clock = clockAt(START);
    const review = recordingReview();
    const { app } = buildApp(clock, { review });

    expect((await postConfig(app, ANALYZE_URL, withPipelineRules(60))).status).toBe(200);

    const over = await postConfig(app, ANALYZE_URL, withPipelineRules(61));
    expect(over.status).toBe(422);
    expect(await over.json()).toEqual({
      error: 'project config is over the input caps',
      problems: ['rules: 61 rules, the limit is 60'],
    });
    expect(review.calls).toHaveLength(1);
  });

  it('F-13 AC-012 counts every rule together on /generate and refuses 61 with 422', async () => {
    const { app } = buildApp(clockAt(START), { generation: null });

    expect((await postConfig(app, GENERATE_URL, withPipelineRules(60))).status).toBe(503);

    const over = await postConfig(app, GENERATE_URL, withPipelineRules(61));
    expect(over.status).toBe(422);
    expect(await over.json()).toEqual({
      error: 'project config is over the input caps',
      problems: ['rules: 61 rules, the limit is 60'],
    });
  });
});

describe('F-13 AC-015 the caps are applied on both routes', () => {
  const overCaps: Array<{ name: string; config: () => pipeline.ProjectConfig }> = [
    { name: 'idea', config: () => pipelineConfig({ idea: 'a'.repeat(INPUT_CAPS.ideaCharacters + 1) }) },
    { name: 'rules', config: () => withPipelineRules(INPUT_CAPS.rules + 1) },
  ];

  for (const { name, config } of overCaps) {
    for (const url of [ANALYZE_URL, GENERATE_URL]) {
      it(`F-13 AC-015 refuses one over-cap ${name} with 422 on ${url}`, async () => {
        const { app } = buildApp(clockAt(START), { generation: null });

        const response = await postConfig(app, url, config());

        expect(response.status).toBe(422);
      });
    }
  }

  it('F-13 AC-015 accepts a config exactly at every cap on both routes', async () => {
    const { app } = buildApp(clockAt(START), { generation: null });

    expect((await postConfig(app, ANALYZE_URL, pipelineConfig({ idea: 'a'.repeat(8000) }))).status).toBe(200);
    expect((await postConfig(app, ANALYZE_URL, withPipelineRules(60))).status).toBe(200);
    expect((await postConfig(app, GENERATE_URL, pipelineConfig({ idea: 'a'.repeat(8000) }))).status).toBe(503);
    expect((await postConfig(app, GENERATE_URL, withPipelineRules(60))).status).toBe(503);
  });
});

describe('F-13 AC-001 a request refused by an input cap does not use up the allowance', () => {
  for (const [name, url, over] of [
    ['/analyze', ANALYZE_URL, () => pipelineConfig({ idea: 'a'.repeat(8001) })],
    ['/generate', GENERATE_URL, () => pipelineConfig({ idea: 'a'.repeat(8001) })],
  ] as const) {
    it(`F-13 AC-001 a cap-refused request on ${name} is refunded, so the 10th valid request is still accepted`, async () => {
      const clock = clockAt(START);
      const { app } = buildApp(clock);
      await acceptMany(app, 9);
      for (let i = 0; i < 5; i += 1) {
        const refused = await postConfig(app, url, over());
        expect(refused.status).toBe(422);
      }

      expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(200);
      expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(429);
    });
  }
});

describe('F-13 AC-001 a request refused as invalid JSON (400) still counts', () => {
  it('F-13 AC-001 counts 10 invalid-JSON requests toward the minute limit, so the 11th is refused with 429', async () => {
    const clock = clockAt(START);
    const { app, review } = buildApp(clock);
    for (let i = 0; i < 10; i += 1) {
      const invalid = await app.request(ANALYZE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not json',
      });
      expect(invalid.status).toBe(400);
    }

    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(429);
    expect(review.calls).toHaveLength(0);
  });
});
