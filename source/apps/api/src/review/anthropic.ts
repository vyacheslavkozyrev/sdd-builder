// The review call to the Anthropic Messages API (architecture.md §4, decision 37; US-003). The limits are fixed:
// `max_tokens` 8192, a 60-second timeout per attempt and no SDK retry, so one analysis makes one call. The model is
// passed in; this module reads no environment variable and logs nothing.

import type Anthropic from '@anthropic-ai/sdk';
import type { ReviewRequest } from './prompt.js';

export const REVIEW_MAX_TOKENS = 8192;
export const REVIEW_TIMEOUT_MS = 60000;
export const REVIEW_MAX_RETRIES = 0;

// The body of the Messages call and the request options that go with it (the SDK takes them as two arguments).
export interface ReviewCallParams {
  readonly body: Anthropic.MessageCreateParamsNonStreaming;
  readonly options: { readonly timeout: number; readonly maxRetries: number };
}

// The reply text (its text blocks, joined in order) and the stop reason, which is `max_tokens` when the reply was
// cut short.
export interface ReviewReply {
  readonly text: string;
  readonly stopReason: string | null;
}

export function reviewCallParams(model: string, request: ReviewRequest): ReviewCallParams {
  return {
    body: {
      model,
      max_tokens: REVIEW_MAX_TOKENS,
      system: request.prompt,
      messages: [{ role: 'user', content: request.json }],
    },
    options: { timeout: REVIEW_TIMEOUT_MS, maxRetries: REVIEW_MAX_RETRIES },
  };
}

// Makes the one review call with a client the caller built. Errors from the SDK are not caught here: the analysis
// decides what a thrown error means.
export async function callReview(
  client: Anthropic,
  model: string,
  request: ReviewRequest,
): Promise<ReviewReply> {
  const { body, options } = reviewCallParams(model, request);
  const message = await client.messages.create(body, options);
  const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
  return { text, stopReason: message.stop_reason };
}
