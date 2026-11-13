import Anthropic from '@anthropic-ai/sdk';
import type { ReviewModel, ReviewReply } from '../analyze.js';

/** The model used when SDDBUILDER_ANALYZER_MODEL is unset or empty (architecture.md §4). */
export const DEFAULT_ANALYZER_MODEL = 'claude-sonnet-5-5';

/** Upper bound on the reply length of one review. */
export const REVIEW_MAX_TOKENS = 8192;

/** Time the provider client waits for one review before it fails, in milliseconds. */
export const REVIEW_TIMEOUT_MS = 60_000;

/** The environment the adapter reads. Only the values it needs are named here. */
export interface AnalyzerEnv {
  ANTHROPIC_API_KEY?: string | undefined;
  SDDBUILDER_ANALYZER_MODEL?: string | undefined;
}

/** The part of the provider SDK the adapter uses; a fake can implement it in tests. */
export interface AnthropicLike {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: 'user'; content: string }>;
    }): Promise<{
      content: ReadonlyArray<{ type: string; text?: string }>;
      stop_reason?: string | null | undefined;
    }>;
  };
}

/**
 * Builds the review model on the Anthropic SDK. Throws at creation time when the
 * API key is missing or empty; the error names the variable, never its value.
 * The client is created here unless one is passed in.
 */
export function createAnthropicReviewModel(env: AnalyzerEnv, client?: AnthropicLike): ReviewModel {
  const apiKey = env.ANTHROPIC_API_KEY?.trim() ?? '';
  if (apiKey === '') {
    throw new Error('ANTHROPIC_API_KEY is not set; the analyzer needs it to call the model provider');
  }

  const model = env.SDDBUILDER_ANALYZER_MODEL?.trim() || DEFAULT_ANALYZER_MODEL;
  const api: AnthropicLike = client ?? new Anthropic({ apiKey, timeout: REVIEW_TIMEOUT_MS });

  return {
    async complete(prompt: string): Promise<ReviewReply> {
      const message = await api.messages.create({
        model,
        max_tokens: REVIEW_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = message.content.find((block) => block.type === 'text');
      return {
        text: text?.text ?? '',
        truncated: message.stop_reason === 'max_tokens',
      };
    },
  };
}
