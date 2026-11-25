// Wires the analysis and the generation to their models (F-14 AC-023, AC-024, F-06 AC-013, F-15 AC-022 to AC-024). The API
// key reaches the client factory and nothing else: it is not logged, not returned and not read from the environment here.
// Without a key both models are null, the analysis runs with no review and generation answers 503, and the startup log
// line names the missing key.

import type { AppDeps } from './app.js';
import type { ReviewModel } from './analyze.js';
import { analyzePipeline } from './analyze.js';
import { callGeneration, type GenerationClient } from './generate/anthropic.js';
import type { GenerationModel } from './generate/service.js';
import { generateProject } from './generate/service.js';
import type { GenerationTemplates } from './generate/load-templates.js';
import { callReview, type ReviewClient } from './review/anthropic.js';
import type { Settings } from './settings.js';

export type ClientFactory = (apiKey: string) => ReviewClient & GenerationClient;

export function buildDeps(
  settings: Settings,
  clientFactory: ClientFactory,
  templates: GenerationTemplates,
  log: (line: string) => void,
): AppDeps {
  const client = startClient(settings, clientFactory, log);
  const review: ReviewModel | null =
    client === null ? null : { review: (request) => callReview(client, settings.analyzerModel, request) };
  const model: GenerationModel | null =
    client === null ? null : { generate: (request) => callGeneration(client, settings.generatorModel, request) };
  return {
    analyze: (config) => analyzePipeline(config, review, log),
    generate: (config) => generateProject(config, { templates, model }),
    log,
  };
}

// One client for both calls. The factory is called once, and only when a key is configured.
function startClient(
  settings: Settings,
  clientFactory: ClientFactory,
  log: (line: string) => void,
): (ReviewClient & GenerationClient) | null {
  if (settings.apiKey === undefined) {
    log('startup review=off generation=off missing=ANTHROPIC_API_KEY');
    return null;
  }
  return clientFactory(settings.apiKey);
}
