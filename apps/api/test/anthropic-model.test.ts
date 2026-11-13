import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeStructure, DEFAULT_CONNECTIONS, DEFAULT_WORKFLOWS } from '@sddbuilder/core';
import type { ProjectConfig } from '@sddbuilder/core';
import { analyze } from '../src/analyze.js';
import {
  DEFAULT_ANALYZER_MODEL,
  REVIEW_MAX_TOKENS,
  REVIEW_TIMEOUT_MS,
  createAnthropicReviewModel,
} from '../src/review/anthropic-model.js';
import type { AnthropicClientOptions, AnthropicLike } from '../src/review/anthropic-model.js';

/** A valid configuration with the default workflows and connections. */
function reviewSampleConfig(): ProjectConfig {
  return {
    schemaVersion: 1,
    name: 'Sample Project',
    idea: 'A tool that turns a product idea into a spec-driven project framework.',
    stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
    architecture: {
      style: 'layered',
      modules: [{ name: 'core', layer: 0, responsibility: 'Domain rules', dependsOn: [] }],
      notes: 'Core has no I/O.',
    },
    codeRules: ['Validate input at the boundary.'],
    testRules: ['Use Vitest for unit tests.'],
    customSteps: [],
    workflows: structuredClone([...DEFAULT_WORKFLOWS]),
    connections: structuredClone([...DEFAULT_CONNECTIONS]),
    targets: ['claude'],
  };
}

// The SDK constructor is replaced so the test can read the options it was given.
// No client makes a network call.
const { constructorOptions } = vi.hoisted(() => ({ constructorOptions: [] as unknown[] }));

vi.mock('@anthropic-ai/sdk', () => {
  class FakeAnthropic {
    messages = {
      create: (): Promise<never> => Promise.reject(new Error('the real SDK must not be called in tests')),
    };
    constructor(options: unknown) {
      constructorOptions.push(options);
    }
  }
  return { default: FakeAnthropic };
});

const KEY = 'test-key-value-0123456789';

interface RecordedCall {
  model: string;
  max_tokens: number;
  messages: Array<{ role: 'user'; content: string }>;
}

function fakeClient(
  content: ReadonlyArray<{ type: string; text?: string }>,
  stopReason?: string | null,
): {
  client: AnthropicLike;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const client: AnthropicLike = {
    messages: {
      create: (params) => {
        calls.push(params);
        return Promise.resolve({ content, stop_reason: stopReason });
      },
    },
  };
  return { client, calls };
}

afterEach(() => {
  constructorOptions.length = 0;
  vi.unstubAllEnvs();
});

describe('F-04 AC-021 model selection', () => {
  it('F-04 AC-021 uses the default model when SDDBUILDER_ANALYZER_MODEL is unset', async () => {
    const { client, calls } = fakeClient([{ type: 'text', text: 'ok' }]);
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await model.complete('prompt');

    expect(DEFAULT_ANALYZER_MODEL).toBe('claude-sonnet-5-5');
    expect(calls[0]?.model).toBe('claude-sonnet-5-5');
  });

  it('F-04 AC-021 uses the default model when SDDBUILDER_ANALYZER_MODEL is empty', async () => {
    const { client, calls } = fakeClient([{ type: 'text', text: 'ok' }]);
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY, SDDBUILDER_ANALYZER_MODEL: '' }, () => client);

    await model.complete('prompt');

    expect(calls[0]?.model).toBe(DEFAULT_ANALYZER_MODEL);
  });

  it('F-04 AC-021 uses the value of SDDBUILDER_ANALYZER_MODEL when it is set', async () => {
    const { client, calls } = fakeClient([{ type: 'text', text: 'ok' }]);
    const model = createAnthropicReviewModel(
      { ANTHROPIC_API_KEY: KEY, SDDBUILDER_ANALYZER_MODEL: 'claude-test-model-1' },
      () => client,
    );

    await model.complete('prompt');

    expect(calls[0]?.model).toBe('claude-test-model-1');
  });
});

describe('F-04 AC-021 API key', () => {
  it.each([
    ['unset', {}],
    ['empty', { ANTHROPIC_API_KEY: '' }],
    ['whitespace only', { ANTHROPIC_API_KEY: '   ' }],
  ])('F-04 AC-021 throws at creation when the API key is %s, naming the variable', (_label, env) => {
    expect(() => createAnthropicReviewModel(env)).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('F-04 AC-021 does not echo other environment values into the missing-key error', () => {
    let message = '';
    try {
      createAnthropicReviewModel({ ANTHROPIC_API_KEY: '', SDDBUILDER_ANALYZER_MODEL: KEY });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toMatch(/ANTHROPIC_API_KEY/);
    expect(message).not.toContain(KEY);
  });

  it('F-04 AC-021 creates the SDK client with the key from the environment and a fixed timeout', () => {
    createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY });

    expect(constructorOptions).toEqual([{ apiKey: KEY, timeout: REVIEW_TIMEOUT_MS }]);
    expect(REVIEW_TIMEOUT_MS).toBe(60_000);
  });

  it('F-04 AC-021 does not create an SDK client when a factory is passed in', () => {
    const { client } = fakeClient([]);
    createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    expect(constructorOptions).toEqual([]);
  });

  it('F-04 AC-021 ignores process.env when the environment passed in has no key', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', KEY);

    expect(() => createAnthropicReviewModel({})).toThrow(/ANTHROPIC_API_KEY/);
    expect(constructorOptions).toEqual([]);
  });
});

describe('F-04 AC-021 request and reply', () => {
  it('F-04 AC-021 sends the model, max_tokens and the prompt as the single user message', async () => {
    const { client, calls } = fakeClient([{ type: 'text', text: 'advice' }]);
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await model.complete('the review prompt');

    expect(calls).toEqual([
      {
        model: DEFAULT_ANALYZER_MODEL,
        max_tokens: REVIEW_MAX_TOKENS,
        messages: [{ role: 'user', content: 'the review prompt' }],
      },
    ]);
  });

  it('F-04 AC-021 returns the text of a text block in the reply', async () => {
    const { client } = fakeClient([{ type: 'text', text: 'Add a rollback step.' }]);
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await expect(model.complete('prompt')).resolves.toEqual({ text: 'Add a rollback step.', truncated: false });
  });

  it('F-04 AC-021 returns the first text block when other blocks come first', async () => {
    const { client } = fakeClient([
      { type: 'thinking' },
      { type: 'text', text: 'first text' },
      { type: 'text', text: 'second text' },
    ]);
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await expect(model.complete('prompt')).resolves.toEqual({ text: 'first text', truncated: false });
  });

  it('F-04 AC-021 returns an empty string when the reply has no text block', async () => {
    const { client } = fakeClient([{ type: 'thinking' }]);
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await expect(model.complete('prompt')).resolves.toEqual({ text: '', truncated: false });
  });

  it('F-04 AC-021 returns an empty string when the reply has no content', async () => {
    const { client } = fakeClient([]);
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await expect(model.complete('prompt')).resolves.toEqual({ text: '', truncated: false });
  });
});

describe('F-13 AC-023 review client and call limits', () => {
  it('F-13 AC-023 gives the client factory the key and a 60-second timeout', () => {
    const received: AnthropicClientOptions[] = [];
    const { client } = fakeClient([]);
    createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, (options) => {
      received.push(options);
      return client;
    });

    expect(received).toEqual([{ apiKey: KEY, timeout: 60_000 }]);
    expect(REVIEW_TIMEOUT_MS).toBe(60_000);
  });

  it('F-13 AC-023 makes every review call with max_tokens 8192', async () => {
    const { client, calls } = fakeClient([{ type: 'text', text: '[]' }], 'end_turn');
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await model.complete('first prompt');
    await model.complete('second prompt');

    expect(calls.map((call) => call.max_tokens)).toEqual([8192, 8192]);
    expect(REVIEW_MAX_TOKENS).toBe(8192);
  });
});

describe('F-13 AC-024 review rejection gives failed with the structural findings', () => {
  it('F-13 AC-024 returns failed with the structural findings when the review call is rejected', async () => {
    const config = reviewSampleConfig();
    const client: AnthropicLike = {
      messages: {
        create: () =>
          Promise.reject(Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' })),
      },
    };
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    const result = await analyze(config, model);

    expect(result).toEqual({
      findings: analyzeStructure(config),
      review: { status: 'failed', findings: [], dropped: 0 },
    });
  });
});

describe('F-13 AC-025 adapter sets truncated from the stop reason', () => {
  it('F-13 AC-025 sets truncated to true when the stop reason is max_tokens', async () => {
    const { client } = fakeClient([{ type: 'text', text: '[{"severity":' }], 'max_tokens');
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await expect(model.complete('prompt')).resolves.toEqual({ text: '[{"severity":', truncated: true });
  });

  it('F-13 AC-025 sets truncated to false when the stop reason is end_turn', async () => {
    const { client } = fakeClient([{ type: 'text', text: '[]' }], 'end_turn');
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await expect(model.complete('prompt')).resolves.toEqual({ text: '[]', truncated: false });
  });

  it('F-13 AC-025 treats a missing stop reason as not truncated', async () => {
    const { client } = fakeClient([{ type: 'text', text: '[]' }]);
    const model = createAnthropicReviewModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await expect(model.complete('prompt')).resolves.toEqual({ text: '[]', truncated: false });
  });
});
