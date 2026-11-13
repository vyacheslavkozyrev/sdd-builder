import { Hono } from 'hono';
import { analyze, type ReviewModel } from './analyze.js';
import { errorBody } from './http/errors.js';
import { readConfig } from './http/read-config.js';

/** The port the app writes log lines to. A line never carries a submitted value or an exception message. */
export interface LogPort {
  write(line: string): void;
}

export interface AppDeps {
  review: ReviewModel;
  log: LogPort;
}

/** Builds the HTTP app. Routes are stateless: nothing from a request is kept after the response. */
export function createApp({ review, log }: AppDeps): Hono {
  const app = new Hono();

  app.post('/analyze', async (c) => {
    const read = await readConfig(c.req.raw);
    if (!read.ok) {
      return c.json(read.body, read.status);
    }
    const result = await analyze(read.config, review);
    return c.json(result, 200);
  });

  app.all('/analyze', (c) => c.json(errorBody('method not allowed'), 405, { Allow: 'POST' }));

  app.notFound((c) => c.json(errorBody('not found'), 404));

  app.onError((err, c) => {
    const name = err instanceof Error ? err.name : 'UnknownError';
    log.write(`unexpected error: ${name}`);
    return c.json(errorBody('internal error'), 500);
  });

  return app;
}
