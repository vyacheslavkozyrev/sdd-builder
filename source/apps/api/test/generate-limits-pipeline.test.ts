import { describe, expect, it } from 'vitest';
import { INPUT_CAPS } from '@sddbuilder/core';
import type { ReviewModel, ReviewReply } from '../src/analyze.js';
import { createApp, type GenerationPorts } from '../src/app.js';
import type { GenerationModel } from '../src/generate/generation-model.js';
import { ClientLimiter, CLIENT_LIMITS } from '../src/limits/client-limiter.js';
import { DailyCeiling } from '../src/limits/daily-ceiling.js';
import { dailyLimitsFrom } from '../src/limits/env.js';
import { pipelineConfig, pipelineTemplates, refusedPipelineConfig } from './pipeline-config.js';

const ANALYZE_URL = 'http://localhost/analyze';
const GENERATE_URL = 'http://localhost/generate';
/** 2026-11-13 12:00:30 UTC: 30 seconds into a minute window, on the same UTC day for the whole minute. */
const START = Date.UTC(2026, 10, 13, 12, 0, 30);
const ADDRESS = '203.0.113.7';
const OK_REVIEW: ReviewReply = { text: '[]', truncated: false };

type App = ReturnType<typeof createApp>;

/** A clock the test moves by hand, so no test reads the wall clock. */
interface Clock {
  now: number;
  read: () => number;
}

function clockAt(now: number): Clock {
  const clock: Clock = { now, read: () => clock.now };
  return clock;
}

/** A review model that always answers with an empty finding list, and counts its calls. */
function countingReview(): ReviewModel & { calls: number } {
  const model: ReviewModel & { calls: number } = {
    calls: 0,
    complete: () => {
      model.calls += 1;
      return Promise.resolve(OK_REVIEW);
    },
  };
  return model;
}

/** A generation model that always fails, and counts its calls: a failed call still counts toward the ceiling. */
function failingGeneration(): GenerationPorts & { model: GenerationModel & { calls: number } } {
  const model: GenerationModel & { calls: number } = {
    calls: 0,
    complete: () => {
      model.calls += 1;
      return Promise.reject(new Error('the generation model failed'));
    },
  };
  return { model, templates: pipelineTemplates() };
}

function buildApp(
  clock: Clock,
  options: {
    generateLimit?: number;
    clientAddress?: () => string;
    review?: ReviewModel;
    generation?: GenerationPorts | null;
  } = {},
): App {
  return createApp({
    review: options.review ?? countingReview(),
    generation: options.generation === undefined ? failingGeneration() : options.generation,
    log: { write: () => undefined },
    limits: {
      limiter: new ClientLimiter(clock.read),
      clientAddress: options.clientAddress ?? (() => ADDRESS),
      reviewCeiling: new DailyCeiling(Number.MAX_SAFE_INTEGER, clock.read),
      generateCeiling: new DailyCeiling(options.generateLimit ?? Number.MAX_SAFE_INTEGER, clock.read),
    },
  });
}

function postConfig(app: App, url: string, config: unknown): Response | Promise<Response> {
  return app.request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(config),
  });
}

/** Sends `count` requests to `url`, each of which must be accepted (not 429). */
async function acceptMany(app: App, url: string, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    expect((await postConfig(app, url, pipelineConfig())).status).not.toBe(429);
  }
}

describe('F-07 AC-019 an unknown path gives 404', () => {
  it('F-07 AC-019 answers 404 with the error body for POST and GET on an unknown path', async () => {
    const app = buildApp(clockAt(START));

    const posted = await app.request('http://localhost/unknown', { method: 'POST' });
    const got = await app.request('http://localhost/unknown', { method: 'GET' });

    expect(posted.status).toBe(404);
    expect(await posted.json()).toEqual({ error: 'not found' });
    expect(got.status).toBe(404);
  });

  it('F-07 AC-019 answers 404 on a path that only differs from a route by a suffix', async () => {
    const app = buildApp(clockAt(START));

    for (const url of ['http://localhost/analyze/', 'http://localhost/generate/extra', 'http://localhost/']) {
      expect((await app.request(url, { method: 'POST' })).status).toBe(404);
    }
  });
});

describe('F-07 AC-019 a method other than POST on /analyze or /generate gives 405 with Allow: POST', () => {
  for (const url of [ANALYZE_URL, GENERATE_URL]) {
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      it(`F-07 AC-019 answers 405 with Allow: POST and the error body for ${method} on ${url}`, async () => {
        const app = buildApp(clockAt(START));

        const response = await app.request(url, { method });

        expect(response.status).toBe(405);
        expect(response.headers.get('Allow')).toBe('POST');
        expect(await response.json()).toEqual({ error: 'method not allowed' });
      });
    }
  }
});

describe('F-07 AC-019 the method and path answers do not count toward the per-client limit', () => {
  it('F-07 AC-019 leaves all 10 accepted requests of the minute available after 405 and 404 answers', async () => {
    const clock = clockAt(START);
    const review = countingReview();
    const generation = failingGeneration();
    const app = buildApp(clock, { review, generation });
    for (let i = 0; i < 30; i += 1) {
      expect((await app.request(ANALYZE_URL, { method: 'GET' })).status).toBe(405);
      expect((await app.request(GENERATE_URL, { method: 'PUT' })).status).toBe(405);
      expect((await app.request('http://localhost/unknown', { method: 'POST' })).status).toBe(404);
    }

    await acceptMany(app, ANALYZE_URL, 5);
    await acceptMany(app, GENERATE_URL, 5);
    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(429);
    expect(review.calls).toBe(5);
    expect(generation.model.calls).toBe(5);
  });
});

describe('F-07 AC-021 /analyze and /generate share one per-client count', () => {
  it('F-07 AC-021 counts 10 mixed requests and answers the 11th with 429 and Retry-After in whole seconds', async () => {
    const clock = clockAt(START);
    const app = buildApp(clock);
    for (let i = 0; i < CLIENT_LIMITS.perMinute; i += 1) {
      await acceptMany(app, i % 2 === 0 ? ANALYZE_URL : GENERATE_URL, 1);
    }

    const refused = await postConfig(app, GENERATE_URL, pipelineConfig());

    expect(refused.status).toBe(429);
    expect(refused.headers.get('Retry-After')).toBe('30');
    expect(await refused.json()).toEqual({ error: 'rate limit exceeded' });
  });

  it('F-07 AC-021 rounds Retry-After up to whole seconds when the window has a fraction left', async () => {
    // 12:00:30.250: 29.75 seconds remain in the minute, so Retry-After is 30, a whole number.
    const clock = clockAt(START + 250);
    const app = buildApp(clock);
    await acceptMany(app, GENERATE_URL, CLIENT_LIMITS.perMinute);

    const refused = await postConfig(app, ANALYZE_URL, pipelineConfig());

    expect(refused.status).toBe(429);
    expect(refused.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect(refused.headers.get('Retry-After')).toBe('30');
  });

  it('F-07 AC-021 accepts again on the next minute window after the shared count is used up', async () => {
    const clock = clockAt(START);
    const app = buildApp(clock);
    await acceptMany(app, ANALYZE_URL, 5);
    await acceptMany(app, GENERATE_URL, 5);
    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(429);

    clock.now = START + 30_000;

    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).not.toBe(429);
  });

  it('F-07 AC-021 a request refused by an input cap on /generate does not add to the shared count', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generation });
    await acceptMany(app, ANALYZE_URL, 9);
    const over = pipelineConfig({ idea: 'a'.repeat(INPUT_CAPS.ideaCharacters + 1) });
    for (let i = 0; i < 5; i += 1) {
      expect((await postConfig(app, GENERATE_URL, over)).status).toBe(422);
    }

    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).not.toBe(429);
    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(429);
  });

  it('F-07 AC-021 a request refused by the per-minute limit adds nothing to the day count', async () => {
    const clock = clockAt(START);
    const app = buildApp(clock);
    // Ten minutes, each with 10 accepted requests and 5 refused by the minute limit. Only the 100 accepted
    // requests may count toward the day, so every accepted request is still admitted in the tenth minute.
    for (let minute = 0; minute < 10; minute += 1) {
      clock.now = START + minute * 60_000;
      await acceptMany(app, ANALYZE_URL, CLIENT_LIMITS.perMinute);
      for (let i = 0; i < 5; i += 1) {
        expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(429);
      }
    }

    expect((await postConfig(app, ANALYZE_URL, pipelineConfig())).status).toBe(429);
  });
});

describe('F-07 AC-022 the generation daily ceiling', () => {
  it('F-07 AC-022 reads SDDBUILDER_GENERATE_DAILY_LIMIT and refuses at that ceiling with 429 and the error body', async () => {
    const limit = dailyLimitsFrom({ SDDBUILDER_GENERATE_DAILY_LIMIT: '2' }).generateDailyLimit;
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: limit, generation });

    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(502);
    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(502);
    const refused = await postConfig(app, GENERATE_URL, pipelineConfig());

    expect(refused.status).toBe(429);
    expect(await refused.json()).toEqual({ error: 'daily generation limit reached' });
    expect(generation.model.calls).toBe(2);
  });

  it('F-07 AC-022 makes no model call at the ceiling, even for a configuration that is otherwise valid', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: 0, generation });

    const refused = await postConfig(app, GENERATE_URL, pipelineConfig());

    expect(refused.status).toBe(429);
    expect(generation.model.calls).toBe(0);
  });

  it('F-07 AC-022 counts a failed model call (502) toward the ceiling', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: 1, generation });

    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(502);
    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(429);
    expect(generation.model.calls).toBe(1);
  });

  it('F-07 AC-022 does not count a 422 refusal toward the ceiling', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: 1, generation });

    expect((await postConfig(app, GENERATE_URL, refusedPipelineConfig())).status).toBe(422);
    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(502);
    expect(generation.model.calls).toBe(1);
  });

  it('F-07 AC-022 does not count a request refused by the per-minute limit toward the ceiling', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: 1, generation });
    await acceptMany(app, ANALYZE_URL, CLIENT_LIMITS.perMinute);
    const refused = await postConfig(app, GENERATE_URL, pipelineConfig());
    expect(refused.status).toBe(429);
    expect(await refused.json()).toEqual({ error: 'rate limit exceeded' });
    expect(generation.model.calls).toBe(0);

    clock.now = START + 30_000;

    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(502);
    expect(generation.model.calls).toBe(1);
  });

  it('F-07 AC-022 shares one ceiling across clients', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    let current = '198.51.100.1';
    const app = buildApp(clock, { generateLimit: 1, generation, clientAddress: () => current });

    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(502);
    current = '198.51.100.2';

    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(429);
    expect(generation.model.calls).toBe(1);
  });

  it('F-07 AC-022 reopens the ceiling on the next UTC day', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: 1, generation });
    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(502);
    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(429);

    clock.now = Date.UTC(2026, 10, 14, 0, 0, 0);

    expect((await postConfig(app, GENERATE_URL, pipelineConfig())).status).toBe(502);
    expect(generation.model.calls).toBe(2);
  });
});
