// Wires the analysis to its model (F-14 AC-023, AC-024, F-06 AC-013). The API key reaches the client factory and nothing
// else: it is not logged, not returned and not read from the environment here. Without a key the model is null, the
// analysis runs with no review, and the startup log line names the missing key.

import type { ReviewModel } from './analyze.js';
import { analyzePipeline } from './analyze.js';
import type { AppDeps } from './app.js';
import { callReview, type ReviewClient } from './review/anthropic.js';
import type { Settings } from './settings.js';

export function buildAnalyzeDeps(
  settings: Settings,
  clientFactory: (apiKey: string) => ReviewClient,
  log: (line: string) => void,
): AppDeps {
  const model = reviewModel(settings, clientFactory, log);
  return {
    analyze: (config) => analyzePipeline(config, model, log),
    generate: async () => ({ kind: 'unavailable' }),
    log,
  };
}

function reviewModel(
  settings: Settings,
  clientFactory: (apiKey: string) => ReviewClient,
  log: (line: string) => void,
): ReviewModel | null {
  if (settings.apiKey === undefined) {
    log('startup review=off missing=ANTHROPIC_API_KEY');
    return null;
  }
  const client = clientFactory(settings.apiKey);
  return {
    review: (request) => callReview(client, settings.analyzerModel, request),
  };
}
