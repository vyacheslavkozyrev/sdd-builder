import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../src/analyze.js';
import { createApp, type AppDeps } from '../src/app.js';

// An analysis fake that counts its calls and answers with an empty analysis. A request that reaches the model call
// would show up in the count.
function fakeDeps(): { deps: AppDeps; calls: { analyze: number } } {
  const calls = { analyze: 0 };
  const result: AnalysisResult = { findings: [], review: { status: 'failed', findings: [], dropped: 0 } };
  const deps: AppDeps = {
    analyze: async () => {
      calls.analyze += 1;
      return result;
    },
    log: () => undefined,
  };
  return { deps, calls };
}

describe('F-14 route skeleton', () => {
  it.each(['GET', 'PUT', 'PATCH', 'DELETE'])(
    'F-14 AC-010 %s on /analyze answers 405 with Allow: POST and makes no model call',
    async (method) => {
      const { deps, calls } = fakeDeps();
      const response = await createApp(deps).request('/analyze', { method });

      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('POST');
      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(await response.json()).toEqual({ error: 'Method not allowed' });
      expect(calls.analyze).toBe(0);
    },
  );

  it('F-14 AC-011 POST /generate answers 404 with a JSON error and makes no model call', async () => {
    const { deps, calls } = fakeDeps();
    const response = await createApp(deps).request('/generate', { method: 'POST' });

    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'Not found' });
    expect(calls.analyze).toBe(0);
  });

  it.each(['GET', 'POST', 'PUT'])(
    'F-14 AC-011 %s on an unknown path answers 404 with a JSON error and makes no model call',
    async (method) => {
      const { deps, calls } = fakeDeps();
      const response = await createApp(deps).request('/unknown', { method });

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Not found' });
      expect(calls.analyze).toBe(0);
    },
  );

  it.each(['GET', 'PUT', 'PATCH', 'DELETE'])(
    'F-14 AC-012 %s on an unknown path answers 404, not 405',
    async (method) => {
      const { deps } = fakeDeps();
      const response = await createApp(deps).request('/nope', { method });

      expect(response.status).toBe(404);
      expect(response.headers.get('Allow')).toBeNull();
    },
  );
});
