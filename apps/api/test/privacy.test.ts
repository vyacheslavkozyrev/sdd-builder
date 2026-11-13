import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CONNECTIONS,
  DEFAULT_WORKFLOWS,
  planGeneration,
  type ProjectConfig,
  type TemplateSource,
} from '@sddbuilder/core';
import type { ReviewModel } from '../src/analyze.js';
import { createApp, type GenerationPorts } from '../src/app.js';
import type { GenerationModel } from '../src/generate/generation-model.js';
import type { LogPort } from '../src/log.js';
import { reviewModelFrom } from '../src/wiring.js';

// Sentinels stand in for the brief, the model reply and the key. None of them may reach a log line,
// and the key may not reach a response body either.
const IDEA = 'SECRET-IDEA-PRIVACY';
const NAME = 'SECRET-NAME-PRIVACY';
const RULE = 'SECRET-RULE-PRIVACY';
const REPLY = 'SECRET-REPLY-PRIVACY';
const KEY = 'sk-ant-SECRET-KEY-PRIVACY';
const BRIEF_AND_REPLY = [IDEA, NAME, RULE, REPLY];

const ANALYZE_URL = 'http://localhost/analyze';
const GENERATE_URL = 'http://localhost/generate';

afterEach(() => {
  vi.unstubAllGlobals();
});

const config: ProjectConfig = {
  schemaVersion: 1,
  name: NAME,
  idea: `A tool for ${IDEA} that turns a product idea into a framework.`,
  stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
  architecture: {
    style: 'layered',
    modules: [{ name: 'core', layer: 0, responsibility: 'Domain rules', dependsOn: [] }],
    notes: 'Core has no I/O.',
  },
  codeRules: [RULE],
  testRules: ['Use Vitest for unit tests.'],
  customSteps: [],
  workflows: structuredClone([...DEFAULT_WORKFLOWS]),
  connections: structuredClone([...DEFAULT_CONNECTIONS]),
  targets: ['claude'],
};

/** Refused by the structural rules: every workflow appears twice, so the ids clash. */
const duplicated: ProjectConfig = { ...config, workflows: [...config.workflows, ...config.workflows] };

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

function failing(error: Error): GenerationModel {
  return { complete: () => Promise.reject(error) };
}

function ports(model: GenerationModel, source: TemplateSource = templates): GenerationPorts {
  return { templates: source, model };
}

function reviewReturning(text: string): ReviewModel {
  return { complete: () => Promise.resolve({ text, truncated: false }) };
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

function post(app: ReturnType<typeof createApp>, url: string, body: string): Response | Promise<Response> {
  return app.request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
}

/**
 * One request, run against a log port and a review model, with the status and the log lines it must produce.
 * A case that needs its own review model ignores the one it is given.
 */
interface Case {
  label: string;
  status: number;
  run: (log: LogPort, review: ReviewModel) => Response | Promise<Response>;
  lines: string[];
}

// Every request body carries the brief sentinels, so the log checks below also cover the body.
const configBody = JSON.stringify(config);

const cases: Case[] = [
  {
    label: 'analyze success',
    status: 200,
    run: (log, review) => post(createApp({ review, log, generation: null }), ANALYZE_URL, configBody),
    lines: [],
  },
  {
    label: 'analyze body that is not JSON',
    status: 400,
    run: (log, review) => post(createApp({ review, log, generation: null }), ANALYZE_URL, `{"idea": "${IDEA}"`),
    lines: [],
  },
  {
    label: 'analyze config the parser refuses',
    status: 400,
    run: (log, review) =>
      post(createApp({ review, log, generation: null }), ANALYZE_URL, JSON.stringify({ ...config, schemaVersion: 2 })),
    lines: [],
  },
  {
    label: 'analyze with a review model that fails with the brief in its message',
    status: 200,
    run: (log) => {
      const failure = new Error(`${IDEA} ${REPLY} ${KEY}`);
      return post(createApp({ review: { complete: () => Promise.reject(failure) }, log, generation: null }), ANALYZE_URL, configBody);
    },
    lines: [],
  },
  {
    label: 'analyze with the wrong method',
    status: 405,
    run: (log, review) => createApp({ review, log, generation: null }).request(ANALYZE_URL, { method: 'GET' }),
    lines: [],
  },
  {
    label: 'generate success',
    status: 200,
    run: (log, review) => post(createApp({ review, log, generation: ports(replying) }), GENERATE_URL, configBody),
    lines: [],
  },
  {
    label: 'generate body that is not JSON',
    status: 400,
    run: (log, review) => post(createApp({ review, log, generation: null }), GENERATE_URL, `{"name": "${NAME}"`),
    lines: [],
  },
  {
    label: 'generate config the structural rules refuse',
    status: 422,
    run: (log, review) => post(createApp({ review, log, generation: ports(failing(new Error(IDEA))) }), GENERATE_URL, JSON.stringify(duplicated)),
    lines: [],
  },
  {
    label: 'generate with no generation model configured',
    status: 503,
    run: (log, review) => post(createApp({ review, log, generation: null }), GENERATE_URL, configBody),
    lines: [],
  },
  {
    label: 'generate with a model call that fails with the brief in its message',
    status: 502,
    run: (log, review) =>
      post(
        createApp({ review, log, generation: ports(failing(new TypeError(`${IDEA} ${NAME} ${REPLY} ${KEY}`))) }),
        GENERATE_URL,
        configBody,
      ),
    lines: ['event=generation_model_failed route=/generate error=TypeError'],
  },
  {
    label: 'generate with a reply that is not JSON',
    status: 502,
    run: (log, review) => {
      const notJson: GenerationModel = { complete: () => Promise.resolve({ text: `not json ${REPLY}`, truncated: false }) };
      return post(createApp({ review, log, generation: ports(notJson) }), GENERATE_URL, configBody);
    },
    lines: [],
  },
  {
    label: 'generate with a template source that throws the brief',
    status: 500,
    run: (log, review) => post(createApp({ review, log, generation: ports(replying, throwing) }), GENERATE_URL, configBody),
    lines: ['event=unexpected_error route=/generate status=500 error=RangeError'],
  },
  {
    label: 'generate with the wrong method',
    status: 405,
    run: (log, review) => createApp({ review, log, generation: null }).request(GENERATE_URL, { method: 'GET' }),
    lines: [],
  },
];

describe('F-07 AC-024 the log never holds the brief, the reply text or the request body', () => {
  for (const testCase of cases) {
    it(`F-07 AC-024 ${testCase.label} logs no brief, reply or request body`, async () => {
      const log = recordingLog();
      const review = reviewReturning(`[{"severity":"info","subject":"testRules","message":"Name it. ${REPLY}"}]`);

      const response = await testCase.run(log, review);

      expect(response.status).toBe(testCase.status);
      expect(log.lines).toEqual(testCase.lines);
      const logged = log.lines.join('\n');
      for (const secret of BRIEF_AND_REPLY) {
        expect(logged).not.toContain(secret);
      }
    });
  }
});

describe('F-07 AC-027 an unexpected error is logged by its name only', () => {
  it('F-07 AC-027 logs the error name, the route and the status, with no message or stack', async () => {
    const log = recordingLog();
    const app = createApp({ review: reviewReturning('[]'), log, generation: ports(replying, throwing) });

    const response = await post(app, GENERATE_URL, configBody);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'internal error' });
    expect(log.lines).toEqual(['event=unexpected_error route=/generate status=500 error=RangeError']);
    expect(log.lines.join('\n')).not.toContain('internal.ts');
  });
});

/**
 * The provider is a stub on the global fetch, so the real analyzer wiring runs without network.
 * It records the headers of each request, so a test can see whether the key was sent.
 */
function stubProvider(status: number, body: unknown): string[] {
  const sent: string[] = [];
  vi.stubGlobal('fetch', (_input: unknown, init?: RequestInit) => {
    sent.push(JSON.stringify([...new Headers(init?.headers)]));
    return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
  });
  return sent;
}

const providerReply = { type: 'message', role: 'assistant', content: [{ type: 'text', text: '[]' }] };
const providerRefusal = { type: 'error', error: { type: 'invalid_request_error', message: 'bad request' } };

describe('F-07 AC-028 the API key never appears in a response body or a log line', () => {
  for (const testCase of cases) {
    it(`F-07 AC-028 ${testCase.label} leaves the key out of the body and the log`, async () => {
      stubProvider(200, providerReply);
      const log = recordingLog();

      const response = await testCase.run(log, reviewModelFrom({ ANTHROPIC_API_KEY: KEY }, log));
      const text = await response.text();

      expect(response.status).toBe(testCase.status);
      expect(text).not.toContain(KEY);
      expect(log.lines.join('\n')).not.toContain(KEY);
    });
  }

  it('F-07 AC-028 the key is sent to the provider on a successful analysis and kept out of the response', async () => {
    const sent = stubProvider(200, providerReply);
    const log = recordingLog();
    const app = createApp({ review: reviewModelFrom({ ANTHROPIC_API_KEY: KEY }, log), log, generation: null });

    const response = await post(app, ANALYZE_URL, configBody);
    const text = await response.text();

    expect(sent).toHaveLength(1);
    expect(sent.join('\n')).toContain(KEY);
    expect(text).toContain('"status":"ok"');
    expect(text).not.toContain(KEY);
  });

  it('F-07 AC-028 a provider refusal answers 200 with the key out of the body and the log', async () => {
    stubProvider(400, providerRefusal);
    const log = recordingLog();
    const app = createApp({ review: reviewModelFrom({ ANTHROPIC_API_KEY: KEY }, log), log, generation: null });

    const response = await post(app, ANALYZE_URL, configBody);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('"status":"failed"');
    expect(text).not.toContain(KEY);
    expect(log.lines.join('\n')).not.toContain(KEY);
  });

  it('F-07 AC-028 the missing-key path sends nothing to the provider and logs one line', async () => {
    const sent = stubProvider(200, providerReply);
    const log = recordingLog();
    const app = createApp({ review: reviewModelFrom({ ANTHROPIC_API_KEY: undefined }, log), log, generation: null });

    const response = await post(app, ANALYZE_URL, configBody);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(sent).toEqual([]);
    expect(log.lines).toEqual(['event=review_key_missing']);
    expect(text).not.toContain(KEY);
  });
});
