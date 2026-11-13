import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_ANALYZER_MODEL } from '../review/anthropic-model.js';
import type { AnalyzerEnv } from '../review/anthropic-model.js';

/** Upper bound on the reply length of one generation call (Amendment 2026-11-12 in F-07 progress). */
export const GENERATION_MAX_TOKENS = 32000;

/**
 * Time the provider client waits for one generation before it fails, in milliseconds.
 * 300 s, not the review's 60 s: one call writes the whole plan, a reply of up to
 * GENERATION_MAX_TOKENS takes minutes. A client-level timeout also keeps the SDK from
 * refusing a non-streaming call with this max_tokens (its 10-minute guard applies only without one).
 */
export const GENERATION_TIMEOUT_MS = 300_000;

/** The result of one generation call: the reply text, and whether the length limit cut it short. */
export interface GenerationReply {
  text: string;
  truncated: boolean;
}

/** The port the generator uses to ask the model for the text of the framework files. */
export interface GenerationModel {
  complete(prompt: string): Promise<GenerationReply>;
}

/** The part of the provider SDK the generation adapter uses; a fake can implement it in tests. */
export interface GenerationClientLike {
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
 * Builds the generation model on the Anthropic SDK. Throws at creation time when the
 * API key is missing or empty; the error names the variable, never its value.
 * The client is created here unless one is passed in.
 */
export function createAnthropicGenerationModel(
  env: AnalyzerEnv,
  client?: GenerationClientLike,
): GenerationModel {
  const apiKey = env.ANTHROPIC_API_KEY?.trim() ?? '';
  if (apiKey === '') {
    throw new Error('ANTHROPIC_API_KEY is not set; the generator needs it to call the model provider');
  }

  const model = env.SDDBUILDER_ANALYZER_MODEL?.trim() || DEFAULT_ANALYZER_MODEL;
  const api: GenerationClientLike =
    client ?? new Anthropic({ apiKey, timeout: GENERATION_TIMEOUT_MS });

  return {
    async complete(prompt: string): Promise<GenerationReply> {
      const message = await api.messages.create({
        model,
        max_tokens: GENERATION_MAX_TOKENS,
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
