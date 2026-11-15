import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONNECTIONS,
  DEFAULT_WORKFLOWS,
  INPUT_CAPS,
  planGeneration,
  type ProjectConfig,
  type TemplateSource,
} from '@sddbuilder/core';
import type { ReviewModel } from '../src/analyze.js';
import { createApp, type GenerationPorts, type LimitPorts } from '../src/app.js';
import type { GenerationModel } from '../src/generate/generation-model.js';
import type { LogPort } from '../src/log.js';
import { ClientLimiter, CLIENT_LIMITS } from '../src/limits/client-limiter.js';
import { DailyCeiling } from '../src/limits/daily-ceiling.js';
import { fixedLimits } from './fixed-limits.js';
import { pipelineConfig } from './pipeline-config.js';

// Sentinels stand in for the brief (idea, module name, rule text), the project name, the model reply
// and the key. None of them may reach a response body or a log line.
const IDEA = 'SECRET-IDEA-F13';
const MODULE = 'SECRET-MODULE-F13';
const RULE = 'SECRET-RULE-F13';
const NAME = 'SECRET-NAME-F13';
const REPLY = 'SECRET-REPLY-F13';
const KEY = 'sk-ant-SECRET-KEY-F13';
const SENTINELS = [IDEA, MODULE, RULE, NAME, REPLY, KEY];

/** The address the fixed limits count for; a log line must never carry it. */
const ADDRESS = '203.0.113.7';

/** 2026-11-13 12:00:00 UTC, the clock of every limit in this file. */
const FIXED_NOW = Date.UTC(2026, 10, 13, 12, 0, 0);

const ANALYZE_URL = 'http://localhost/analyze';
const GENERATE_URL = 'http://localhost/generate';
const UNKNOWN_URL = 'http://localhost/unknown';

const config: ProjectConfig = {
  schemaVersion: 1,
  name: NAME,
  idea: `A tool for ${IDEA} that turns a product idea into a framework.`,
  stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
  architecture: {
    style: 'layered',
    modules: [{ name: MODULE, layer: 0, responsibility: 'Domain rules', dependsOn: [] }],
    notes: 'Core has no I/O.',
  },
  codeRules: [RULE],
  testRules: ['Use Vitest for unit tests.'],
  customSteps: [],
  workflows: structuredClone([...DEFAULT_WORKFLOWS]),
  connections: structuredClone([...DEFAULT_CONNECTIONS]),
  targets: ['claude'],
};

const configBody = JSON.stringify(config);

/** Over the idea cap: the caps refuse it with a 422 whose problems name the path only. */
const overCapBody = JSON.stringify({ ...config, idea: `${IDEA} ${'x'.repeat(INPUT_CAPS.ideaCharacters)}` });

/** The analyze bodies: pipeline configs that carry the same sentinels, and one over the pipeline idea cap. */
const analyzeBody = JSON.stringify(
  pipelineConfig({
    name: NAME,
    idea: `A tool for ${IDEA} that turns a product idea into a framework.`,
    rules: [{ id: 'privacy-rule', title: 'Privacy rule', text: RULE }],
  }),
);
const analyzeOverCapBody = JSON.stringify(pipelineConfig({ idea: `${IDEA} ${'x'.repeat(INPUT_CAPS.ideaCharacters)}` }));

/** Refused by the structural rules: every workflow appears twice, so the ids clash. */
const duplicatedBody = JSON.stringify({ ...config, workflows: [...config.workflows, ...config.workflows] });

const templates: TemplateSource = { get: () => 'Template text for the test.' };

/** A template source that fails with the brief, the key and a stack-like location in its message. */
const throwing: TemplateSource = {
  get: () => {
    throw new RangeError(`${IDEA} ${RULE} ${KEY} at /srv/app/internal.ts:12`);
  },
};

/** A reply with text for every planned file; each text carries the reply sentinel. */
function replyFor(): string {
  const reply: Record<string, string> = {};
  for (const entry of planGeneration(config, templates)) {
    reply[entry.path] = `Text of ${entry.path}. ${REPLY}\n\n${entry.layout}`;
  }
  return JSON.stringify(reply);
}

const replying: GenerationModel = { complete: () => Promise.resolve({ text: replyFor(), truncated: false }) };

function failingGeneration(error: Error): GenerationModel {
  return { complete: () => Promise.reject(error) };
}

function ports(model: GenerationModel, source: TemplateSource = templates): GenerationPorts {
  return { templates: source, model };
}

const reviewing: ReviewModel = { complete: () => Promise.resolve({ text: '[]', truncated: false }) };

function failingReview(error: Error): ReviewModel {
  return { complete: () => Promise.reject(error) };
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

/** The app for one case: the given log, limits and generation; the review model is the fake that returns `[]`. */
function appWith(
  log: LogPort,
  limits: LimitPorts,
  generation: GenerationPorts | null = null,
): ReturnType<typeof createApp> {
  return createApp({ limits, review: reviewing, log, generation });
}

function post(app: ReturnType<typeof createApp>, url: string, body: string): Response | Promise<Response> {
  return app.request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
}

/** Limits whose client has used every request of the minute, so the next one is refused with 429. */
function exhaustedLimits(): LimitPorts {
  const limiter = new ClientLimiter(() => FIXED_NOW);
  for (let i = 0; i < CLIENT_LIMITS.perMinute; i += 1) {
    limiter.admit(ADDRESS);
  }
  return { ...fixedLimits(), limiter, clientAddress: () => ADDRESS };
}

/** Limits whose review ceiling is spent before the first call. */
function reviewCeilingSpent(): LimitPorts {
  return { ...fixedLimits(), reviewCeiling: new DailyCeiling(0, () => FIXED_NOW) };
}

/** Limits whose generation ceiling is spent before the first call. */
function generateCeilingSpent(): LimitPorts {
  return { ...fixedLimits(), generateCeiling: new DailyCeiling(0, () => FIXED_NOW) };
}

/** Limits whose address lookup throws with the brief in its message, so the route answers 500. */
function throwingAddress(): LimitPorts {
  return {
    ...fixedLimits(),
    clientAddress: () => {
      throw new RangeError(`${IDEA} ${MODULE} at /srv/app/internal.ts:9`);
    },
  };
}

/**
 * One request, with the status it must return, the route it belongs to (`other` for a path that is not a route)
 * and the log lines it must produce. Each case runs against its own log port and its own limits.
 */
interface Case {
  label: string;
  route: '/analyze' | '/generate' | 'other';
  status: number;
  run: (log: LogPort) => Response | Promise<Response>;
  lines: string[];
}

const cases: Case[] = [
  {
    label: 'analyze body that is not JSON',
    route: '/analyze',
    status: 400,
    run: (log) => post(appWith(log, fixedLimits()), ANALYZE_URL, `{"idea": "${IDEA}"`),
    lines: [],
  },
  {
    label: 'analyze config the parser refuses',
    route: '/analyze',
    status: 400,
    run: (log) => post(appWith(log, fixedLimits()), ANALYZE_URL, JSON.stringify({ ...config, schemaVersion: 2 })),
    lines: [],
  },
  {
    label: 'analyze with the wrong method',
    route: '/analyze',
    status: 405,
    run: (log) => appWith(log, fixedLimits()).request(ANALYZE_URL, { method: 'GET' }),
    lines: [],
  },
  {
    label: 'analyze over the input caps',
    route: '/analyze',
    status: 422,
    run: (log) => post(appWith(log, fixedLimits()), ANALYZE_URL, analyzeOverCapBody),
    lines: ['event=input_refused route=/analyze status=422'],
  },
  {
    label: 'analyze over the per-client limit',
    route: '/analyze',
    status: 429,
    run: (log) => post(appWith(log, exhaustedLimits()), ANALYZE_URL, analyzeBody),
    lines: ['event=rate_limited route=/analyze status=429'],
  },
  {
    label: 'analyze with the review ceiling spent',
    route: '/analyze',
    status: 200,
    run: (log) => post(appWith(log, reviewCeilingSpent()), ANALYZE_URL, analyzeBody),
    lines: ['event=daily_ceiling_reached route=/analyze status=200'],
  },
  {
    label: 'analyze whose address lookup throws the brief',
    route: '/analyze',
    status: 500,
    run: (log) => post(appWith(log, throwingAddress()), ANALYZE_URL, analyzeBody),
    lines: ['event=unexpected_error route=/analyze status=500 error=RangeError'],
  },
  {
    label: 'generate body that is not JSON',
    route: '/generate',
    status: 400,
    run: (log) => post(appWith(log, fixedLimits(), ports(replying)), GENERATE_URL, `{"name": "${NAME}"`),
    lines: [],
  },
  {
    label: 'generate with the wrong method',
    route: '/generate',
    status: 405,
    run: (log) => appWith(log, fixedLimits(), ports(replying)).request(GENERATE_URL, { method: 'GET' }),
    lines: [],
  },
  {
    label: 'generate over the input caps',
    route: '/generate',
    status: 422,
    run: (log) => post(appWith(log, fixedLimits(), ports(replying)), GENERATE_URL, overCapBody),
    lines: ['event=input_refused route=/generate status=422'],
  },
  {
    label: 'generate config the structural rules refuse',
    route: '/generate',
    status: 422,
    run: (log) => post(appWith(log, fixedLimits(), ports(replying)), GENERATE_URL, duplicatedBody),
    lines: [],
  },
  {
    label: 'generate over the per-client limit',
    route: '/generate',
    status: 429,
    run: (log) => post(appWith(log, exhaustedLimits(), ports(replying)), GENERATE_URL, configBody),
    lines: ['event=rate_limited route=/generate status=429'],
  },
  {
    label: 'generate with the generation ceiling spent',
    route: '/generate',
    status: 429,
    run: (log) => post(appWith(log, generateCeilingSpent(), ports(replying)), GENERATE_URL, configBody),
    lines: ['event=daily_ceiling_reached route=/generate status=429'],
  },
  {
    label: 'generate with no generation model configured',
    route: '/generate',
    status: 503,
    run: (log) => post(appWith(log, fixedLimits()), GENERATE_URL, configBody),
    lines: [],
  },
  {
    label: 'generate with a model call that fails with the brief in its message',
    route: '/generate',
    status: 502,
    run: (log) => {
      const failure = new TypeError(`${IDEA} ${NAME} ${REPLY} ${KEY}`);
      return post(appWith(log, fixedLimits(), ports(failingGeneration(failure))), GENERATE_URL, configBody);
    },
    lines: ['event=generation_model_failed route=/generate error=TypeError'],
  },
  {
    label: 'generate with a reply that is not JSON',
    route: '/generate',
    status: 502,
    run: (log) => {
      const text = `not json ${REPLY}`;
      const notJson: GenerationModel = { complete: () => Promise.resolve({ text, truncated: false }) };
      return post(appWith(log, fixedLimits(), ports(notJson)), GENERATE_URL, configBody);
    },
    lines: [],
  },
  {
    label: 'generate with a template source that throws the brief',
    route: '/generate',
    status: 500,
    run: (log) => post(appWith(log, fixedLimits(), ports(replying, throwing)), GENERATE_URL, configBody),
    lines: ['event=unexpected_error route=/generate status=500 error=RangeError'],
  },
  {
    label: 'generate whose address lookup throws the brief',
    route: '/generate',
    status: 500,
    run: (log) => post(appWith(log, throwingAddress(), ports(replying)), GENERATE_URL, configBody),
    lines: ['event=unexpected_error route=/generate status=500 error=RangeError'],
  },
  {
    label: 'a path that is not a route, with the brief in the body',
    route: 'other',
    status: 404,
    run: (log) => post(appWith(log, fixedLimits(), ports(replying)), UNKNOWN_URL, configBody),
    lines: [],
  },
];

/**
 * Every error status each route can return, as the routes in `app.ts` produce them. A status added to a route
 * needs a case above, or this list and the cases disagree.
 */
const ROUTE_ERROR_STATUSES: Record<'/analyze' | '/generate', number[]> = {
  '/analyze': [400, 405, 422, 429, 500],
  '/generate': [400, 405, 422, 429, 500, 502, 503],
};

describe('F-13 AC-026 no error response carries the brief, the reply or the key', () => {
  it('F-13 AC-026 every error status of both routes has a sentinel case', () => {
    for (const route of ['/analyze', '/generate'] as const) {
      for (const status of ROUTE_ERROR_STATUSES[route]) {
        expect(cases.some((testCase) => testCase.route === route && testCase.status === status)).toBe(true);
      }
    }
    expect(cases.some((testCase) => testCase.route === 'other' && testCase.status === 404)).toBe(true);
  });

  for (const testCase of cases) {
    it(`F-13 AC-026 ${testCase.label} answers ${testCase.status} with no sentinel in the body or the log`, async () => {
      const log = recordingLog();

      const response = await testCase.run(log);
      const body = await response.text();

      expect(response.status).toBe(testCase.status);
      for (const secret of SENTINELS) {
        expect(body).not.toContain(secret);
        expect(log.lines.join('\n')).not.toContain(secret);
      }
    });
  }
});

describe('F-13 AC-028 refusal log lines carry the event, the route and the status only', () => {
  for (const testCase of cases.filter((c) => c.lines.length > 0)) {
    it(`F-13 AC-028 ${testCase.label} writes exactly the expected line and no client address`, async () => {
      const log = recordingLog();

      const response = await testCase.run(log);
      await response.text();

      expect(log.lines).toEqual(testCase.lines);
      expect(log.lines.join('\n')).not.toContain(ADDRESS);
    });
  }
});

describe('F-13 AC-027 a model error is logged by its name only', () => {
  it('F-13 AC-027 a rejected review call logs the error name, and the response carries no sentinel', async () => {
    const log = recordingLog();
    const failure = new RangeError(`${IDEA} ${REPLY} ${KEY}`);
    const app = createApp({ limits: fixedLimits(), review: failingReview(failure), log, generation: null });

    const response = await post(app, ANALYZE_URL, analyzeBody);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"status":"failed"');
    expect(log.lines).toEqual(['event=review_model_failed route=/analyze error=RangeError']);
    for (const secret of SENTINELS) {
      expect(body).not.toContain(secret);
      expect(log.lines.join('\n')).not.toContain(secret);
    }
  });

  it('F-13 AC-027 a rejected generation call logs the error name, and the response carries no sentinel', async () => {
    const log = recordingLog();
    const failure = new TypeError(`${IDEA} ${NAME} ${REPLY} ${KEY}`);

    const app = appWith(log, fixedLimits(), ports(failingGeneration(failure)));

    const response = await post(app, GENERATE_URL, configBody);
    const body = await response.text();

    expect(response.status).toBe(502);
    expect(log.lines).toEqual(['event=generation_model_failed route=/generate error=TypeError']);
    for (const secret of SENTINELS) {
      expect(body).not.toContain(secret);
      expect(log.lines.join('\n')).not.toContain(secret);
    }
  });
});
