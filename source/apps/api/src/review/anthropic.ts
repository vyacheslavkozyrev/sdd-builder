// The review call to the Anthropic Messages API (F-06 AC-008, AC-009, decision 37 (c)). One call per analysis, with
// fixed limits: `max_tokens` 8192, a 60-second timeout per attempt and no SDK retry. The client is passed in, so the
// call is tested with a fake and no test reaches the network.

import type Anthropic from '@anthropic-ai/sdk';
import type { ReviewRequest } from './prompt.js';

export const REVIEW_MAX_TOKENS = 8192;
export const REVIEW_TIMEOUT_MS = 60_000;

export interface ReviewCallParams {
  readonly body: Anthropic.MessageCreateParamsNonStreaming;
  readonly options: Anthropic.RequestOptions;
}

export interface ReviewClient {
  messages: {
    create(
      body: Anthropic.MessageCreateParamsNonStreaming,
      options?: Anthropic.RequestOptions,
    ): Promise<Anthropic.Message>;
  };
}

export interface ReviewReply {
  readonly text: string;
  readonly stopReason: Anthropic.Message['stop_reason'];
}

export function reviewCallParams(model: string, request: ReviewRequest): ReviewCallParams {
  return {
    body: {
      model,
      max_tokens: REVIEW_MAX_TOKENS,
      system: request.prompt,
      messages: [{ role: 'user', content: request.content }],
    },
    options: { timeout: REVIEW_TIMEOUT_MS, maxRetries: 0 },
  };
}

// Makes the one review call and returns the text of the reply and its stop reason. A thrown error is not caught here:
// the caller decides what a failed call means.
export async function callReview(client: ReviewClient, model: string, request: ReviewRequest): Promise<ReviewReply> {
  const { body, options } = reviewCallParams(model, request);
  const message = await client.messages.create(body, options);
  const text = message.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('');
  return { text, stopReason: message.stop_reason };
}
