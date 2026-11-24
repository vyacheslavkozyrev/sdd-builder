// The HTTP application (F-14 AC-010, AC-011, AC-012). It holds the routes and the reply rules. Replies that are not a
// success carry `{ error }`.

import { Hono } from 'hono';

export function createApp(): Hono {
  const app = new Hono();

  // Any method other than POST on /analyze is refused before a route can run.
  app.use('/analyze', async (c, next) => {
    if (c.req.method !== 'POST') {
      return c.json({ error: 'Method not allowed' }, 405, { Allow: 'POST' });
    }
    await next();
  });

  app.notFound((c) => c.json({ error: 'Not found' }, 404));

  return app;
}
