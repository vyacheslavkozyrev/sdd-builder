import { describe, expect, it } from 'vitest';
import {
  GENERATION_MAX_TOKENS,
  GENERATION_TIMEOUT_MS,
  createAnthropicGenerationModel,
} from '../src/generate/generation-model.js';
import type { GenerationClientLike } from '../src/generate/generation-model.js';
import type { AnthropicClientOptions } from '../src/review/anthropic-model.js';

const KEY = 'test-key-value-0123456789';

interface RecordedCall {
  model: string;
  max_tokens: number;
  messages: Array<{ role: 'user'; content: string }>;
}

function fakeClient(
  content: ReadonlyArray<{ type: string; text?: string }>,
  stopReason?: string | null,
): { client: GenerationClientLike; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const client: GenerationClientLike = {
    messages: {
      create: (params) => {
        calls.push(params);
        return Promise.resolve({ content, stop_reason: stopReason });
      },
    },
  };
  return { client, calls };
}

describe('F-07 AC-016 adapter sets truncated', () => {
  it('F-07 AC-016 sets truncated to true when the stop reason is the length limit', async () => {
    const { client, calls } = fakeClient([{ type: 'text', text: '{"files":' }], 'max_tokens');
    const model = createAnthropicGenerationModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    const reply = await model.complete('prompt');

    expect(reply).toEqual({ text: '{"files":', truncated: true });
    expect(calls[0]?.max_tokens).toBe(GENERATION_MAX_TOKENS);
    expect(GENERATION_MAX_TOKENS).toBe(32000);
  });

  it('F-07 AC-016 sets truncated to false when the stop reason is end_turn', async () => {
    const { client } = fakeClient([{ type: 'text', text: '{"files":[]}' }], 'end_turn');
    const model = createAnthropicGenerationModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    const reply = await model.complete('prompt');

    expect(reply).toEqual({ text: '{"files":[]}', truncated: false });
  });

  it('F-07 AC-016 treats a missing stop reason as not truncated', async () => {
    const { client } = fakeClient([{ type: 'text', text: 'ok' }], null);
    const model = createAnthropicGenerationModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    const reply = await model.complete('prompt');

    expect(reply.truncated).toBe(false);
  });

  it('F-07 AC-016 gives an empty text when the reply has no text block', async () => {
    const { client } = fakeClient([{ type: 'tool_use' }], 'end_turn');
    const model = createAnthropicGenerationModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    const reply = await model.complete('prompt');

    expect(reply).toEqual({ text: '', truncated: false });
  });

  it('F-07 AC-016 sends the prompt as the single user message with the model from the environment', async () => {
    const { client, calls } = fakeClient([{ type: 'text', text: 'ok' }], 'end_turn');
    const model = createAnthropicGenerationModel(
      { ANTHROPIC_API_KEY: KEY, SDDBUILDER_ANALYZER_MODEL: 'claude-test-model-1' },
      () => client,
    );

    await model.complete('the generation prompt');

    expect(calls[0]).toEqual({
      model: 'claude-test-model-1',
      max_tokens: GENERATION_MAX_TOKENS,
      messages: [{ role: 'user', content: 'the generation prompt' }],
    });
  });
});

describe('F-07 AC-017 provider error in the adapter', () => {
  it('F-07 AC-017 lets a provider error reject after exactly one call, with no retry in the adapter', async () => {
    const calls: RecordedCall[] = [];
    const client: GenerationClientLike = {
      messages: {
        create: (params) => {
          calls.push(params);
          return Promise.reject(new Error('provider unavailable'));
        },
      },
    };
    const model = createAnthropicGenerationModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await expect(model.complete('prompt')).rejects.toThrow('provider unavailable');
    expect(calls).toHaveLength(1);
  });
});

describe('F-13 AC-023 generation client and call limits', () => {
  it('F-13 AC-023 gives the client factory the key and a 300-second timeout', () => {
    const received: AnthropicClientOptions[] = [];
    const { client } = fakeClient([]);
    createAnthropicGenerationModel({ ANTHROPIC_API_KEY: KEY }, (options) => {
      received.push(options);
      return client;
    });

    expect(received).toEqual([{ apiKey: KEY, timeout: 300_000 }]);
    expect(GENERATION_TIMEOUT_MS).toBe(300_000);
  });

  it('F-13 AC-023 makes every generation call with max_tokens 32000', async () => {
    const { client, calls } = fakeClient([{ type: 'text', text: '{}' }], 'end_turn');
    const model = createAnthropicGenerationModel({ ANTHROPIC_API_KEY: KEY }, () => client);

    await model.complete('first prompt');
    await model.complete('second prompt');

    expect(calls.map((call) => call.max_tokens)).toEqual([32000, 32000]);
  });
});

describe('F-07 AC-018 missing key at creation', () => {
  it('F-07 AC-018 throws at creation when the key is unset, naming the variable', () => {
    expect(() => createAnthropicGenerationModel({})).toThrow(/ANTHROPIC_API_KEY/);
  });

  it.each(['', '   ', '\t\n'])(
    'F-07 AC-018 throws at creation when the key is blank (%j), naming the variable and not the value',
    (blank) => {
      let message = '';
      try {
        createAnthropicGenerationModel({ ANTHROPIC_API_KEY: blank });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).toContain('ANTHROPIC_API_KEY');
      expect(message.trim()).not.toBe('');
    },
  );
});
