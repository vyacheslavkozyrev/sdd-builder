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
    generate: async () => ({ kind: 'unavailable' }),
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
    generate: async () => ({ kind: 'unavailable' }),
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
      generate: async () => ({ kind: 'unavailable' }),
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

// The structural and brief findings the analysis builds for a config, in the order the route returns them.
function expectedFindings(config: Record<string, unknown>): pipeline.Finding[] {
  const parsed = pipeline.parseProjectConfig(config);
  if (!parsed.ok) throw new Error('the fixture must parse');
  return [...pipeline.analyzeStructure(parsed.config), ...pipeline.analyzeBrief(parsed.config)];
}

describe('F-14 route unexpected errors', () => {
  it('F-14 AC-018 an error thrown by the analysis outside the model call answers 500 with a generic message and no part of the error text', async () => {
    const sentinel = 'sentinel-analysis-3c9e';
    const app = createApp({
      analyze: async () => {
        throw new Error(`analysis broke near ${sentinel}`);
      },
      generate: async () => ({ kind: 'unavailable' }),
      log: () => undefined,
    });
    const response = await postConfig(app, successConfig());
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toEqual({ error: 'Internal error' });
    expect(text).not.toContain(sentinel);
    expect(text).not.toContain('sentinel');
    expect(text).not.toContain('analysis broke');
  });

  it('F-14 AC-018 the 500 path logs the event and the status only, never the error text', async () => {
    const sentinel = 'sentinel-analysis-8b21';
    const lines: string[] = [];
    const app = createApp({
      analyze: async () => {
        throw new Error(sentinel);
      },
      generate: async () => ({ kind: 'unavailable' }),
      log: (line) => lines.push(line),
    });
    await postConfig(app, successConfig());

    expect(lines).toEqual(['route=/analyze event=analysis-failed status=500']);
    expect(lines.join('\n')).not.toContain(sentinel);
  });

  it('F-14 AC-019 the 500 reply is JSON with the error field the 400 replies use', async () => {
    const app = createApp({
      analyze: async () => {
        throw new Error('sentinel-analysis-5d07');
      },
      generate: async () => ({ kind: 'unavailable' }),
      log: () => undefined,
    });
    const response = await postConfig(app, successConfig());

    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    const body = (await response.json()) as Record<string, unknown>;
    expect(Object.keys(body)).toEqual(['error']);
    expect(typeof body.error).toBe('string');

    const refused = await app.request('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    const refusedBody = (await refused.json()) as Record<string, unknown>;
    expect(refused.status).toBe(400);
    expect(Object.keys(refusedBody)).toEqual(['error']);
  });
});

describe('F-14 route review failures', () => {
  it('F-14 AC-013 with no model a valid config answers 200 with a failed review and the findings in full', async () => {
    const config = successConfig({ idea: '' });
    const expected = expectedFindings(config);
    const response = await postConfig(analysisApp(null), config);
    const reply = (await response.json()) as { findings: unknown; review: unknown };

    expect(response.status).toBe(200);
    expect(expected.length).toBeGreaterThan(0);
    expect(reply.findings).toEqual(expected);
    expect(reply.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
  });

  it('F-14 AC-014 a model call that throws answers 200 with a failed review and the thrown message in no part of the response', async () => {
    const secret = 'upstream-detail-7f3a sk-test-token';
    const model: ReviewModel = {
      review: async () => {
        throw new Error(secret);
      },
    };
    const config = successConfig({ idea: '' });
    const response = await postConfig(analysisApp(model), config);
    const text = await response.text();
    const reply = JSON.parse(text) as { findings: unknown; review: unknown };

    expect(response.status).toBe(200);
    expect(reply.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
    expect(reply.findings).toEqual(expectedFindings(config));
    expect(text).not.toContain(secret);
    expect(text).not.toContain('upstream-detail');
    expect(text).not.toContain('sk-test-token');
  });

  it('F-14 AC-015 a model reply that is not JSON answers 200 with a failed review', async () => {
    const { model, calls } = countingModel({ text: 'Here is my review: looks fine' });
    const config = successConfig({ idea: '' });
    const response = await postConfig(analysisApp(model), config);
    const reply = (await response.json()) as { findings: unknown; review: unknown };

    expect(response.status).toBe(200);
    expect(calls.review).toBe(1);
    expect(reply.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
    expect(reply.findings).toEqual(expectedFindings(config));
  });

  it('F-14 AC-016 a valid reply answers 200 with an ok review of the entries checkReview keeps, a model blocker as warning', async () => {
    const reply = [
      { severity: 'blocker', subject: 'idea', message: 'The idea does not name a user.' },
      { severity: 'info', subject: 'stack', message: 'Consider a test runner.' },
      { severity: 'critical', subject: 'stack', message: 'Unknown severity, dropped.' },
      { severity: 'warning', subject: ' ', message: 'Blank subject, dropped.' },
    ];
    const { model } = countingModel({ text: JSON.stringify(reply) });
    const config = successConfig({ idea: '' });
    const response = await postConfig(analysisApp(model), config);
    const body = (await response.json()) as { findings: unknown; review: unknown };

    expect(response.status).toBe(200);
    expect(body.review).toEqual(pipeline.checkReview(JSON.stringify(reply)));
    expect(body.review).toEqual({
      status: 'ok',
      findings: [
        { severity: 'warning', subject: 'idea', message: 'The idea does not name a user.' },
        { severity: 'info', subject: 'stack', message: 'Consider a test runner.' },
      ],
      dropped: 2,
    });
    expect(body.findings).toEqual(expectedFindings(config));
  });
});
