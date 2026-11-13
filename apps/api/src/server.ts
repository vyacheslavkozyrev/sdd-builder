import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createApp, type GenerationPorts } from './app.js';
import { createAnthropicGenerationModel, type GenerationModel } from './generate/generation-model.js';
import { errorNameOf, formatLogLine, type LogPort } from './log.js';
import { reviewModelFrom } from './wiring.js';
import type { AnalyzerEnv } from './review/anthropic-model.js';
import { loadTemplates } from './templates.js';
import { dailyLimitsFrom } from './limits/env.js';
import { ClientLimiter } from './limits/client-limiter.js';
import { DailyCeiling } from './limits/daily-ceiling.js';
import { connectionAddress } from './http/client-address.js';

/** The port used when PORT is unset or empty. */
const DEFAULT_PORT = 3000;

/** The repository's `templates/` directory, relative to this file (apps/api/src). */
const TEMPLATES_DIR = fileURLToPath(new URL('../../../templates', import.meta.url));

const log: LogPort = { write: (line) => console.log(line) };

/** The only place that reads process.env: the analyzer and generation variables, passed on as data. */
function envFromProcess(): AnalyzerEnv {
  return {
    ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'],
    SDDBUILDER_ANALYZER_MODEL: process.env['SDDBUILDER_ANALYZER_MODEL'],
  };
}

/** Reads PORT: unset or empty gives the default; anything but a whole number from 1 to 65535 throws, naming PORT. */
function portFrom(raw: string | undefined): number {
  const text = raw?.trim() ?? '';
  if (text === '') {
    return DEFAULT_PORT;
  }
  const port = Number(text);
  if (!/^\d+$/.test(text) || port < 1 || port > 65535) {
    throw new Error('PORT must be a whole number from 1 to 65535');
  }
  return port;
}

/** The generation ports, or `null` when the model cannot be created (the key is missing). The failure is logged by name only. */
function generationPortsFrom(env: AnalyzerEnv): GenerationPorts | null {
  const templates = loadTemplates(TEMPLATES_DIR);
  let model: GenerationModel;
  try {
    model = createAnthropicGenerationModel(env);
  } catch (err) {
    log.write(formatLogLine({ event: 'generation_model_disabled', error: errorNameOf(err) }));
    return null;
  }
  return { templates, model };
}

const env = envFromProcess();
const port = portFrom(process.env['PORT']);
// Reads the daily ceilings at startup, so an invalid value stops the server before it listens (F-13 AC-017).
const daily = dailyLimitsFrom({
  SDDBUILDER_REVIEW_DAILY_LIMIT: process.env['SDDBUILDER_REVIEW_DAILY_LIMIT'],
  SDDBUILDER_GENERATE_DAILY_LIMIT: process.env['SDDBUILDER_GENERATE_DAILY_LIMIT'],
});
const now = (): number => Date.now();
const app = createApp({
  review: reviewModelFrom(env, log),
  generation: generationPortsFrom(env),
  log,
  limits: {
    limiter: new ClientLimiter(now),
    clientAddress: connectionAddress,
    reviewCeiling: new DailyCeiling(daily.reviewDailyLimit, now),
    generateCeiling: new DailyCeiling(daily.generateDailyLimit, now),
  },
});

serve({ fetch: app.fetch, port }, () => {
  log.write(formatLogLine({ event: 'server_started' }));
});
