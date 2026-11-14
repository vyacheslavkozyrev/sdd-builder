import type { ReviewModel } from './analyze.js';
import { errorNameOf, formatLogLine, type LogPort } from './log.js';
import { createAnthropicReviewModel, type AnalyzerEnv } from './review/anthropic-model.js';

/**
 * Builds the review model the server uses, from the environment passed in. When the model cannot be
 * created, it logs one line that names the cause (a missing key, or the error name, never a value) and
 * returns a model whose `complete` rejects, so `/analyze` still answers with the structural findings
 * and `review.status` `failed`.
 */
export function reviewModelFrom(env: AnalyzerEnv, log: LogPort): ReviewModel {
  try {
    return createAnthropicReviewModel(env);
  } catch (err) {
    const key = env.ANTHROPIC_API_KEY?.trim() ?? '';
    if (key === '') {
      log.write(formatLogLine({ event: 'review_key_missing' }));
    } else {
      log.write(formatLogLine({ event: 'review_model_disabled', error: errorNameOf(err) }));
    }
    return unavailableModel();
  }
}

function unavailableModel(): ReviewModel {
  return { complete: () => Promise.reject(new Error('review model unavailable')) };
}
