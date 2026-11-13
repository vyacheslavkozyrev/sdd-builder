import type { ReviewModel } from './analyze.js';
import type { LogPort } from './app.js';
import { createAnthropicReviewModel, type AnalyzerEnv } from './review/anthropic-model.js';

/**
 * Builds the review model the server uses, from the environment passed in. When the model cannot be
 * created, it logs one line that names the cause (the variable or the error name, never a value) and
 * returns a model whose `complete` rejects, so `/analyze` still answers with the structural findings
 * and `review.status` `failed`.
 */
export function reviewModelFrom(env: AnalyzerEnv, log: LogPort): ReviewModel {
  try {
    return createAnthropicReviewModel(env);
  } catch (err) {
    const key = env.ANTHROPIC_API_KEY?.trim() ?? '';
    const reason = key === '' ? 'ANTHROPIC_API_KEY is not set' : errorName(err);
    log.write(`review model disabled: ${reason}`);
    return unavailableModel();
  }
}

function unavailableModel(): ReviewModel {
  return { complete: () => Promise.reject(new Error('review model unavailable')) };
}

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : 'UnknownError';
}
