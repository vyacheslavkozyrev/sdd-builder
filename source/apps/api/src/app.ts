// The HTTP application (F-14 AC-005 to AC-012). It holds the routes and the reply rules. Replies that are not a
// success carry `{ error }`. The analysis and the log are injected, so tests can count the model calls with a fake.

import type { pipeline } from '@sddbuilder/core';
import { Hono } from 'hono';
import type { AnalysisResult } from './analyze.js';
import { readProjectConfig } from './http/body.js';

export interface AppDeps {
  readonly analyze: (config: pipeline.ProjectConfig) => Promise<AnalysisResult>;
  readonly log: (line: string) => void;
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  // Any method other than POST on /analyze is refused before a route can run.
  app.use('/analyze', async (c, next) => {
    if (c.req.method !== 'POST') {
      return c.json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
    }
    await next();
  });

  app.post('/analyze', async (c) => {
    const body = readProjectConfig(await c.req.text());
    if (!body.ok) {
      deps.log('route=/analyze event=refused status=400');
      return body.problems === null
        ? c.json({ error: body.error }, 400)
        : c.json({ error: body.error, problems: body.problems }, 400);
    }
    // One analysis, one model call at most (AC-017). The reply carries the findings and the review, nothing else.
    const result = await deps.analyze(body.config);
    return c.json({ findings: result.findings, review: result.review }, 200);
  });

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  return app;
}
