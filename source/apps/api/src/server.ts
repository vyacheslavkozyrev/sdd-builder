// The entry point (F-14 AC-020, AC-021). It reads the environment once, builds the app and serves it on the port.
// The listen line logs the port only. The environment is read here and nowhere else in the API.

import Anthropic from '@anthropic-ai/sdk';
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { readSettings } from './settings.js';
import { buildAnalyzeDeps } from './wiring.js';

const log = (line: string): void => {
  console.log(line);
};

const settings = readSettings(process.env);
const app = createApp(buildAnalyzeDeps(settings, (apiKey) => new Anthropic({ apiKey }), log));

serve({ fetch: app.fetch, port: settings.port }, (info) => {
  log(`listening port=${info.port}`);
});
