// The entry point (F-14 AC-020, AC-021, F-15 AC-002). It reads the environment and the templates once, builds the app and
// serves it on the port. The listen line logs the port only. The environment is read here and nowhere else in the API.

import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadTemplates } from './generate/load-templates.js';
import { readSettings } from './settings.js';
import { buildDeps } from './wiring.js';

const log = (line: string): void => {
  console.log(line);
};

const settings = readSettings(process.env);
// This file is src/server.ts, so the templates folder (source/templates) is three levels up.
const templates = loadTemplates(fileURLToPath(new URL('../../../templates/', import.meta.url)));
const app = createApp(buildDeps(settings, (apiKey) => new Anthropic({ apiKey }), templates, log));

serve({ fetch: app.fetch, port: settings.port }, (info) => {
  log(`listening port=${info.port}`);
});
