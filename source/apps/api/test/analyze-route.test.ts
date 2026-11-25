import { pipeline } from '@sddbuilder/core';
import type { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { analyzePipeline, type AnalysisResult, type ReviewModel } from '../src/analyze.js';
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

// A config the parser accepts and the analysis reads. It carries a brief, so the brief checks have something to read.
function successConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'Project',
    idea: 'A small web app for notes',
    architecture: 'A single service',
    stack: { language: 'TypeScript', framework: 'React' },
    rules: [],
    pipeline: pipeline.defaultPipeline,
    ...overrides,
  };
}

// A model fake that counts its calls and answers with a fixed reply, or throws when asked to.
function countingModel(answer: { text?: string; throws?: boolean }): { model: ReviewModel; calls: { review: number } } {
  const calls = { review: 0 };
  const model: ReviewModel = {
    review: async () => {
      calls.review += 1;
      if (answer.throws === true) throw new Error('provider unavailable');
      return { text: answer.text ?? '[]', stopReason: 'end_turn' };
    },
  };
  return { model, calls };
}

// The app wired to the real analysis with a fake model, so the body is built the same way the route builds it.
function analysisApp(model: ReviewModel | null): Hono {
  return createApp({
    analyze: (config) => analyzePipeline(config, model, () => {}),
    log: () => undefined,
  });
}

async function postConfig(app: Hono, config: Record<string, unknown>) {
  return app.request('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

describe('F-14 route success', () => {
  it('F-14 AC-001 a valid config answers 200 with a JSON body of findings and review', async () => {
    const { model } = countingModel({ text: '[]' });
    const response = await postConfig(analysisApp(model), successConfig());
    const reply: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    const body = reply as { findings: unknown[]; review: unknown };
    expect(Object.keys(body).sort()).toEqual(['findings', 'review']);
    expect(Array.isArray(body.findings)).toBe(true);
    expect(body.review).toEqual({ status: 'ok', findings: [], dropped: 0 });
  });

  it('F-14 AC-002 the findings are the analyzeStructure then analyzeBrief output of the same config', async () => {
    const config = successConfig({ idea: '' });
    const parsed = pipeline.parseProjectConfig(config);
    if (!parsed.ok) throw new Error('the fixture must parse');
    const expected = [...pipeline.analyzeStructure(parsed.config), ...pipeline.analyzeBrief(parsed.config)];
    const { model } = countingModel({ text: '[]' });

    const reply = (await (await postConfig(analysisApp(model), config)).json()) as { findings: unknown };

    expect(reply.findings).toEqual(expected);
  });

  // A parser-valid config gives no structural finding for this fixture, so the order between the two lists is shown
  // here with an injected analysis: the route must pass its findings on in the order it was given.
  it('F-14 AC-002 the route keeps the order of the analysis findings and does not reorder them', async () => {
    const brief: pipeline.Finding = {
      severity: 'blocker',
      rule: 'brief-idea',
      path: 'idea',
      message: 'must not be blank',
    };
    const structural: pipeline.Finding = {
      severity: 'warning',
      rule: 'block-reach',
      path: 'pipeline.flows.0.blocks.1',
      message: 'is not reached',
    };
    const app = createApp({
      analyze: async () => ({ findings: [brief, structural], review: { status: 'failed', findings: [], dropped: 0 } }),
      log: () => undefined,
    });

    const reply = (await (await postConfig(app, successConfig())).json()) as { findings: unknown };

    expect(reply.findings).toEqual([brief, structural]);
  });

  it('F-14 AC-003 two requests with the same body and the same fake model give the same response body', async () => {
    const { model } = countingModel({ text: '[]' });
    const app = analysisApp(model);

    const first = await (await postConfig(app, successConfig())).text();
    const second = await (await postConfig(app, successConfig())).text();

    expect(second).toBe(first);
  });

  it('F-14 AC-004 a config with no brief fields gets 200 and the brief blockers in findings', async () => {
    const { model } = countingModel({ text: '[]' });
    const config = successConfig({ name: '', idea: '', stack: { language: '', framework: '' } });
    const response = await postConfig(analysisApp(model), config);
    const reply = (await response.json()) as { findings: { path?: string }[] };
    const paths = reply.findings.map((finding) => finding.path);

    expect(response.status).toBe(200);
    expect(paths).toEqual(expect.arrayContaining(['name', 'idea', 'stack.language']));
  });

  it('F-14 AC-017 one request makes one model call, and a throwing call still answers 200 with one call', async () => {
    const ok = countingModel({ text: '[]' });
    await postConfig(analysisApp(ok.model), successConfig());
    expect(ok.calls.review).toBe(1);

    const failing = countingModel({ throws: true });
    const response = await postConfig(analysisApp(failing.model), successConfig());

    expect(response.status).toBe(200);
    expect(failing.calls.review).toBe(1);
  });
});
