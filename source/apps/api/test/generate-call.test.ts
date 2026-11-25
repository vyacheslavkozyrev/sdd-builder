import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import {
  callGeneration,
  GENERATION_MAX_TOKENS,
  GENERATION_TIMEOUT_MS,
  generationCallParams,
  type GenerationClient,
} from '../src/generate/anthropic.js';
import type { GenerationRequest } from '../src/generate/prompt.js';

const request: GenerationRequest = { prompt: 'Write the files.', content: '{"files":[]}' };

interface RecordedCall {
  readonly body: Anthropic.MessageCreateParamsNonStreaming;
  readonly options: Anthropic.RequestOptions | undefined;
}

// A fake client: it records each call and answers with a fixed message, or throws when asked to.
function fakeClient(answer: { content?: Anthropic.ContentBlock[]; throws?: string }) {
  const calls: RecordedCall[] = [];
  const client: GenerationClient = {
    messages: {
      create: async (body, options) => {
        calls.push({ body, options });
        if (answer.throws !== undefined) throw new Error(answer.throws);
        return {
          content: answer.content ?? [{ type: 'text', text: '{}', citations: null }],
          stop_reason: 'end_turn',
        } as Anthropic.Message;
      },
    },
  };
  return { client, calls };
}

describe('F-15 AC-021 generation call limits', () => {
  it('F-15 AC-021 sends max_tokens 32000 and a client timeout of 300 seconds', async () => {
    const { client, calls } = fakeClient({});
    await callGeneration(client, 'model-x', request);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.body.max_tokens).toBe(32000);
    expect(calls[0]?.options?.timeout).toBe(300_000);
    expect(GENERATION_MAX_TOKENS).toBe(32000);
    expect(GENERATION_TIMEOUT_MS).toBe(300_000);
  });

  it('F-15 AC-021 leaves the SDK retries on (no maxRetries override on the call)', async () => {
    const { client, calls } = fakeClient({});
    await callGeneration(client, 'model-x', request);
    expect(calls[0]?.options).not.toHaveProperty('maxRetries');
    expect(generationCallParams('model-x', request).options).not.toHaveProperty('maxRetries');
  });

  it('F-15 AC-021 passes the model and the prompt and content of the request', async () => {
    const { client, calls } = fakeClient({});
    await callGeneration(client, 'model-x', request);
    expect(calls[0]?.body.model).toBe('model-x');
    expect(calls[0]?.body.system).toBe('Write the files.');
    expect(calls[0]?.body.messages).toEqual([{ role: 'user', content: '{"files":[]}' }]);
  });
});

describe('F-15 AC-020 one call per attempt', () => {
  it('F-15 AC-020 makes exactly one call for a successful reply', async () => {
    const { client, calls } = fakeClient({ content: [{ type: 'text', text: 'ok', citations: null }] });
    await callGeneration(client, 'model-x', request);
    expect(calls).toHaveLength(1);
  });

  it('F-15 AC-020 propagates a thrown provider error after one call and does not retry', async () => {
    const { client, calls } = fakeClient({ throws: 'provider failure' });
    await expect(callGeneration(client, 'model-x', request)).rejects.toThrow('provider failure');
    expect(calls).toHaveLength(1);
  });

});

describe('F-15 AC-018 reply text of the one call', () => {
  it('F-15 AC-018 joins the reply text from its text blocks and ignores other blocks', async () => {
    const { client } = fakeClient({
      content: [
        { type: 'text', text: '{"a":', citations: null },
        { type: 'tool_use', id: 'x', name: 'n', input: {} } as Anthropic.ContentBlock,
        { type: 'text', text: '"b"}', citations: null },
      ],
    });
    const reply = await callGeneration(client, 'model-x', request);
    expect(reply.text).toBe('{"a":"b"}');
    expect(reply.stopReason).toBe('end_turn');
  });

  it('F-15 AC-018 gives an empty text and the stop reason when the reply has no text block', async () => {
    const { client } = fakeClient({ content: [] });
    const reply = await callGeneration(client, 'model-x', request);
    expect(reply.text).toBe('');
    expect(reply.stopReason).toBe('end_turn');
  });
});
