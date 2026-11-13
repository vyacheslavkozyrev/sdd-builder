import { describe, expect, it } from 'vitest';
import {
  analyzeStructure,
  DEFAULT_CONNECTIONS,
  DEFAULT_WORKFLOWS,
  INPUT_CAPS,
  skippedAnalysis,
  type ProjectConfig,
} from '@sddbuilder/core';
import type { ReviewModel, ReviewReply } from '../src/analyze.js';
import { createApp, type GenerationPorts } from '../src/app.js';
import type { GenerationModel, GenerationReply } from '../src/generate/generation-model.js';
import { ClientLimiter, CLIENT_LIMITS } from '../src/limits/client-limiter.js';
import { DailyCeiling } from '../src/limits/daily-ceiling.js';

const ANALYZE_URL = 'http://localhost/analyze';
const GENERATE_URL = 'http://localhost/generate';
const IDEA = 'A tool that turns a product idea into a spec-driven project framework.';
/** 2026-11-13 12:00:30 UTC: 30 seconds into a minute window, so a one-minute step stays on the same UTC day. */
const START = Date.UTC(2026, 10, 13, 12, 0, 30);
const ADDRESS = '203.0.113.7';
const OK_REPLY: ReviewReply = { text: '[]', truncated: false };

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

/** A review model that answers call `n` (counting from 1) with `answer(n)`, and records how many calls it got. */
function reviewModel(answer: (call: number) => Promise<ReviewReply>): ReviewModel & { calls: number } {
  const model: ReviewModel & { calls: number } = {
    calls: 0,
    complete: () => {
      model.calls += 1;
      return answer(model.calls);
    },
  };
  return model;
}

/** A generation model that always fails, and records how many calls it got. */
function failingGeneration(): GenerationPorts & { model: GenerationModel & { calls: number } } {
  const model: GenerationModel & { calls: number } = {
    calls: 0,
    complete: () => {
      model.calls += 1;
      return Promise.reject(new Error('the generation model failed'));
    },
  };
  return { model, templates: { get: () => 'Template text for the test.' } };
}

function buildApp(
  clock: Clock,
  options: {
    reviewLimit?: number;
    generateLimit?: number;
    review?: ReviewModel;
    generation?: GenerationPorts | null;
  } = {},
): App {
  return createApp({
    review: options.review ?? reviewModel(() => Promise.resolve(OK_REPLY)),
    generation: options.generation ?? null,
    log: { write: () => undefined },
    limits: {
      limiter: new ClientLimiter(clock.read),
      clientAddress: () => ADDRESS,
      reviewCeiling: new DailyCeiling(options.reviewLimit ?? Number.MAX_SAFE_INTEGER, clock.read),
      generateCeiling: new DailyCeiling(options.generateLimit ?? Number.MAX_SAFE_INTEGER, clock.read),
    },
  });
}

function sampleConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
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
    ...overrides,
  };
}

/** A configuration the generator accepts: the default workflows and connections, so only the ceilings decide. */
function generatableConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return sampleConfig({
    workflows: structuredClone([...DEFAULT_WORKFLOWS]),
    connections: structuredClone([...DEFAULT_CONNECTIONS]),
    ...overrides,
  });
}

function postConfig(app: App, url: string, config: unknown): Response | Promise<Response> {
  return app.request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config) });
}

/** A configuration whose workflow id appears twice: generateProject refuses it structurally, before any model call. */
function duplicateWorkflowConfig(): ProjectConfig {
  const base = sampleConfig();
  const [first] = base.workflows;
  if (first === undefined) throw new Error('sample config has no workflow');
  return { ...base, workflows: [...base.workflows, { ...first }] };
}

describe('F-13 AC-016 the review ceiling skips the review at the limit', () => {
  it('F-13 AC-016 answers 200 with review skipped and does not call the model once the ceiling is reached', async () => {
    const clock = clockAt(START);
    const review = reviewModel(() => Promise.resolve(OK_REPLY));
    const app = buildApp(clock, { reviewLimit: 2, review });
    const config = sampleConfig();

    expect((await postConfig(app, ANALYZE_URL, config)).status).toBe(200);
    expect((await postConfig(app, ANALYZE_URL, config)).status).toBe(200);
    const skipped = await postConfig(app, ANALYZE_URL, config);

    expect(skipped.status).toBe(200);
    expect(await skipped.json()).toEqual({
      findings: analyzeStructure(config),
      review: { status: 'skipped', findings: [], dropped: 0 },
    });
    expect(review.calls).toBe(2);
  });
});

describe('F-13 AC-022 review.status accepts skipped', () => {
  it('F-13 AC-022 the skipped body equals skippedAnalysis for the same configuration', async () => {
    const clock = clockAt(START);
    const app = buildApp(clock, { reviewLimit: 0 });
    const config = sampleConfig();

    const response = await postConfig(app, ANALYZE_URL, config);

    expect(await response.json()).toEqual(skippedAnalysis(config));
  });

  it('F-13 AC-022 keeps status ok for a review that runs below the ceiling', async () => {
    const clock = clockAt(START);
    const app = buildApp(clock, { reviewLimit: 1 });

    const response = await postConfig(app, ANALYZE_URL, sampleConfig());

    expect(await response.json()).toMatchObject({ review: { status: 'ok' } });
  });
});

describe('F-13 AC-018 the generation ceiling answers 429 with the error body', () => {
  it('F-13 AC-018 refuses the call after the limit with 429 and does not call the model', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: 2, generation });

    expect((await postConfig(app, GENERATE_URL, generatableConfig())).status).toBe(502);
    expect((await postConfig(app, GENERATE_URL, generatableConfig())).status).toBe(502);
    const refused = await postConfig(app, GENERATE_URL, generatableConfig());

    expect(refused.status).toBe(429);
    expect(await refused.json()).toEqual({ error: 'daily generation limit reached' });
    expect(generation.model.calls).toBe(2);
  });
});

describe('F-13 AC-020 failed model calls still count toward the ceilings', () => {
  it('F-13 AC-020 counts a review that throws and a review reply that is not JSON', async () => {
    const clock = clockAt(START);
    const review = reviewModel((call) =>
      call === 1 ? Promise.reject(new Error('the review model failed')) : Promise.resolve({ text: 'not json', truncated: false }),
    );
    const app = buildApp(clock, { reviewLimit: 2, review });
    const config = sampleConfig();

    expect(await (await postConfig(app, ANALYZE_URL, config)).json()).toMatchObject({ review: { status: 'failed' } });
    expect(await (await postConfig(app, ANALYZE_URL, config)).json()).toMatchObject({ review: { status: 'failed' } });
    expect(await (await postConfig(app, ANALYZE_URL, config)).json()).toMatchObject({ review: { status: 'skipped' } });
    expect(review.calls).toBe(2);
  });

  it('F-13 AC-020 counts a generation call that fails toward the generation ceiling', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: 1, generation });

    expect((await postConfig(app, GENERATE_URL, generatableConfig())).status).toBe(502);
    expect((await postConfig(app, GENERATE_URL, generatableConfig())).status).toBe(429);
    expect(generation.model.calls).toBe(1);
  });

  it('F-13 AC-020 does not count a structural refusal from generation toward the generation ceiling', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: 1, generation });

    expect((await postConfig(app, GENERATE_URL, duplicateWorkflowConfig())).status).toBe(422);
    expect((await postConfig(app, GENERATE_URL, generatableConfig())).status).toBe(502);
    expect(generation.model.calls).toBe(1);
  });
});

describe('F-13 AC-021 requests refused by a rate limit or an input cap do not count', () => {
  it('F-13 AC-021 a request refused by the per-minute limit does not use a review ceiling count', async () => {
    const clock = clockAt(START);
    const review = reviewModel(() => Promise.resolve(OK_REPLY));
    // The ceiling is one more than the per-minute limit: a refused request that counted would skip the review below.
    const app = buildApp(clock, { reviewLimit: CLIENT_LIMITS.perMinute + 1, review });
    for (let i = 0; i < CLIENT_LIMITS.perMinute; i += 1) {
      expect((await postConfig(app, ANALYZE_URL, sampleConfig())).status).toBe(200);
    }
    expect((await postConfig(app, ANALYZE_URL, sampleConfig())).status).toBe(429);

    clock.now = START + 60_000;
    const body: unknown = await (await postConfig(app, ANALYZE_URL, sampleConfig())).json();

    expect(body).toMatchObject({ review: { status: 'ok' } });
    expect(review.calls).toBe(CLIENT_LIMITS.perMinute + 1);
  });

  it('F-13 AC-021 a request refused by an input cap does not use a review ceiling count', async () => {
    const clock = clockAt(START);
    const review = reviewModel(() => Promise.resolve(OK_REPLY));
    const app = buildApp(clock, { reviewLimit: 1, review });
    const over = sampleConfig({ idea: 'a'.repeat(INPUT_CAPS.ideaCharacters + 1) });

    expect((await postConfig(app, ANALYZE_URL, over)).status).toBe(422);
    const body: unknown = await (await postConfig(app, ANALYZE_URL, sampleConfig())).json();

    expect(body).toMatchObject({ review: { status: 'ok' } });
    expect(review.calls).toBe(1);
  });

  it('F-13 AC-021 a request refused by an input cap does not use a generation ceiling count', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: 1, generation });
    const over = generatableConfig({ idea: 'a'.repeat(INPUT_CAPS.ideaCharacters + 1) });

    expect((await postConfig(app, GENERATE_URL, over)).status).toBe(422);
    expect((await postConfig(app, GENERATE_URL, generatableConfig())).status).toBe(502);
    expect(generation.model.calls).toBe(1);
  });

  it('F-13 AC-021 a request refused by the per-minute limit does not use a generation ceiling count', async () => {
    const clock = clockAt(START);
    const generation = failingGeneration();
    const app = buildApp(clock, { generateLimit: CLIENT_LIMITS.perMinute + 1, generation });
    for (let i = 0; i < CLIENT_LIMITS.perMinute; i += 1) {
      expect((await postConfig(app, GENERATE_URL, generatableConfig())).status).toBe(502);
    }
    expect((await postConfig(app, GENERATE_URL, generatableConfig())).status).toBe(429);

    clock.now = START + 60_000;

    expect((await postConfig(app, GENERATE_URL, generatableConfig())).status).toBe(502);
    expect(generation.model.calls).toBe(CLIENT_LIMITS.perMinute + 1);
  });
});
