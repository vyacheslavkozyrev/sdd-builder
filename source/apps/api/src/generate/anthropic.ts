// The generation call to the Anthropic Messages API (F-15 AC-020, AC-021). One call per attempt, with fixed limits:
// `max_tokens` 32000 and a 300-second timeout per attempt. The SDK's own retries stay on. The client is passed in, so the
// call is tested with a fake and no test reaches the network.

import type Anthropic from '@anthropic-ai/sdk';
import type { GenerationRequest } from './prompt.js';

export const GENERATION_MAX_TOKENS = 32000;
export const GENERATION_TIMEOUT_MS = 300_000;

export interface GenerationCallParams {
  readonly body: Anthropic.MessageCreateParamsNonStreaming;
  readonly options: Anthropic.RequestOptions;
}

export interface GenerationClient {
  messages: {
    create(
      body: Anthropic.MessageCreateParamsNonStreaming,
      options?: Anthropic.RequestOptions,
    ): Promise<Anthropic.Message>;
  };
}

export interface GenerationReply {
  readonly text: string;
  readonly stopReason: Anthropic.Message['stop_reason'];
}

export function generationCallParams(model: string, request: GenerationRequest): GenerationCallParams {
  return {
    body: {
      model,
      max_tokens: GENERATION_MAX_TOKENS,
      system: request.prompt,
      messages: [{ role: 'user', content: request.content }],
    },
    options: { timeout: GENERATION_TIMEOUT_MS },
  };
}

// Makes one generation call and returns the text of the reply and its stop reason. A thrown error is not caught here:
// the caller decides what a failed call means.
export async function callGeneration(
  client: GenerationClient,
  model: string,
  request: GenerationRequest,
): Promise<GenerationReply> {
  const { body, options } = generationCallParams(model, request);
  const message = await client.messages.create(body, options);
  const text = message.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('');
  return { text, stopReason: message.stop_reason };
}
