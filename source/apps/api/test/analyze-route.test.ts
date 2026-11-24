import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('F-14 route skeleton', () => {
  it.each(['GET', 'PUT', 'PATCH', 'DELETE'])(
    'F-14 AC-010 %s on /analyze answers 405 with Allow: POST',
    async (method) => {
      const response = await createApp().request('/analyze', { method });

      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('POST');
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(await response.json()).toEqual({ error: 'Method not allowed' });
    },
  );

  it('F-14 AC-011 POST /generate answers 404 with a JSON error', async () => {
    const response = await createApp().request('/generate', { method: 'POST' });

    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it.each(['GET', 'POST', 'PUT'])(
    'F-14 AC-011 %s on an unknown path answers 404 with a JSON error',
    async (method) => {
      const response = await createApp().request('/unknown', { method });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Not found' });
    },
  );

  it.each(['GET', 'PUT', 'PATCH', 'DELETE'])(
    'F-14 AC-012 %s on an unknown path answers 404, not 405',
    async (method) => {
      const response = await createApp().request('/nope', { method });

      expect(response.status).toBe(404);
      expect(response.headers.get('Allow')).toBeNull();
    },
  );
});
