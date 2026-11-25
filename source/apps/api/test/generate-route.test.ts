import { pipeline } from '@sddbuilder/core';
import JSZip from 'jszip';
import type { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../src/analyze.js';
import type { GenerationReply } from '../src/generate/anthropic.js';
import type { GenerationTemplates } from '../src/generate/load-templates.js';
import { generateProject, type GenerationModel } from '../src/generate/service.js';
import { createApp, type AppDeps } from '../src/app.js';

// Fixed layouts, given as data: no template file is read. The same layouts the service tests use.
const TEMPLATES: GenerationTemplates = {
  base: [{ path: 'CLAUDE.md', layout: 'Project instructions.' }],
  pipeline: 'Pipeline.',
  flow: 'Flow.',
  agent: 'Agent.',
  rule: 'Rule.',
};

const IDEA = 'A demo project with a private idea sentence';

// A request body with one flow, Start, Agent and End, and no rules. It is the wire form the parser reads (no `index`
// keys: the parser numbers the flows and the blocks itself). It is planned, with only warnings.
function bodyFixture(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'Demo',
    idea: IDEA,
    architecture: 'A small service',
    stack: { language: 'TypeScript' },
    rules: [],
    pipeline: {
      name: 'SDD',
      description: 'The process',
      arguments: [],
      flows: [
        {
          id: 'build',
          name: 'Build',
          arguments: [],
          body: 'Runs the build agent.',
          artifacts: [{ label: 'out.md', template: 'The output' }],
          approval: false,
          blocks: [
            { id: 'start', kind: 'start', next: 'agent' },
            { id: 'agent', kind: 'agent', name: 'build-agent', description: 'Builds the project.', arguments: [], next: 'end' },
            { id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
          ],
        },
      ],
    },
  };
}

// The same body with no Start block: the parser accepts it, and the structural check gives a blocker.
function blockedBody(): Record<string, unknown> {
  const body = bodyFixture();
  const pipelineValue = body.pipeline as { flows: { blocks: Record<string, unknown>[] }[] };
  const flow = pipelineValue.flows[0];
  if (flow === undefined) throw new Error('the fixture has no flow');
  flow.blocks = flow.blocks.filter((block) => block.kind !== 'start');
  return body;
}

// The config the parser builds from a body. The fixtures are parser-valid, so a failure here is a fixture error.
function configOf(body: Record<string, unknown>): pipeline.ProjectConfig {
  const parsed = pipeline.parseProjectConfig(body);
  if (!parsed.ok) throw new Error('the fixture body does not parse');
  return parsed.config;
}

function plannedPaths(body: Record<string, unknown>): string[] {
  const result = pipeline.planGeneration(configOf(body), TEMPLATES);
  if (!result.ok) throw new Error('the fixture body has a blocker');
  return result.files.map((file) => file.path);
}

// A reply with one text for every planned path, as one JSON object.
function goodReply(paths: readonly string[]): GenerationReply {
  return {
    text: JSON.stringify(Object.fromEntries(paths.map((path) => [path, 'File text.']))),
    stopReason: 'end_turn',
  };
}

function badReply(): GenerationReply {
  return { text: 'Sorry, here is the project without JSON.', stopReason: 'end_turn' };
}

// A model fake that counts its calls and answers with the next reply in the list. An Error entry is thrown. A call past
// the end of the list throws, so a route that makes more calls than planned fails the test.
function countingModel(answers: readonly (GenerationReply | Error)[]): { model: GenerationModel; calls: { n: number } } {
  const calls = { n: 0 };
  const model: GenerationModel = {
    generate: async () => {
      calls.n += 1;
      const answer = answers[calls.n - 1];
      if (answer === undefined) throw new Error('the fake model has no reply left');
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
  return { model, calls };
}

interface Harness {
  readonly app: Hono;
  readonly lines: string[];
  readonly analyze: { n: number };
  readonly model: { n: number };
}

// The app wired like the route is wired: the real service with a fake model (or no model), and an analysis fake that
// must never be called on this route.
function harness(answers: readonly (GenerationReply | Error)[] | null): Harness {
  const lines: string[] = [];
  const analyze = { n: 0 };
  const counted = answers === null ? null : countingModel(answers);
  const deps: AppDeps = {
    analyze: async (): Promise<AnalysisResult> => {
      analyze.n += 1;
      return { findings: [], review: { status: 'failed', findings: [], dropped: 0 } };
    },
    generate: (config) => generateProject(config, { templates: TEMPLATES, model: counted?.model ?? null }),
    log: (line) => lines.push(line),
  };
  return { app: createApp(deps), lines, analyze, model: counted?.calls ?? { n: 0 } };
}

async function postJson(app: Hono, body: unknown): Promise<Response> {
  return app.request('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('F-15 AC-001 a valid configuration answers 200 with the zip', () => {
  it('F-15 AC-001 gives 200 with the zip content type and the attachment file name', async () => {
    const config = bodyFixture();
    const h = harness([goodReply(plannedPaths(config))]);
    const response = await postJson(h.app, config);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/zip');
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="sddbuilder-project.zip"');
  });

  it('F-15 AC-001 the body is the zip of every planned path, in plan order', async () => {
    const config = bodyFixture();
    const paths = plannedPaths(config);
    const h = harness([goodReply(paths)]);
    const response = await postJson(h.app, config);
    const zip = await JSZip.loadAsync(new Uint8Array(await response.arrayBuffer()));

    expect(Object.keys(zip.files)).toEqual(paths);
    expect(h.analyze.n).toBe(0);
  });
});

describe('F-15 AC-006 AC-007 a refused configuration answers 422 with every blocker and no files', () => {
  it('F-15 AC-006 lists every blocker as a path and reason, in the order configProblems gives them, with no model call', async () => {
    const config = blockedBody();
    const expected = pipeline
      .configProblems(configOf(config))
      .filter((finding) => finding.severity === 'blocker')
      .map((finding) => `${finding.path}: ${finding.message}`);
    const h = harness([goodReply(['CLAUDE.md'])]);
    const response = await postJson(h.app, config);
    const body = (await response.json()) as { problems: string[] };

    expect(response.status).toBe(422);
    expect(expected.length).toBeGreaterThan(0);
    expect(body.problems).toEqual(expected);
    expect(h.model.n).toBe(0);
  });

  it('F-15 AC-007 the 422 reply holds only the error and the problems, with no zip and no files field', async () => {
    const h = harness([goodReply(['CLAUDE.md'])]);
    const response = await postJson(h.app, blockedBody());
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(Object.keys(body).sort()).toEqual(['error', 'problems']);
    expect(body.error).toBe('The project config cannot be generated');
    expect(body).not.toHaveProperty('files');
    expect(body).not.toHaveProperty('zip');
  });
});

describe('F-15 AC-011 AC-012 AC-013 AC-014 a refused body answers 400 and makes no model call', () => {
  it('F-15 AC-011 a body that is not JSON gets 400 with an error and no model call', async () => {
    const h = harness([goodReply(['CLAUDE.md'])]);
    const response = await h.app.request('/generate', { method: 'POST', body: '{not json' });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'The request body is not JSON' });
    expect(h.model.n).toBe(0);
  });

  it('F-15 AC-012 a JSON body the parser refuses gets 400 with problems that name the unknown key', async () => {
    const h = harness([goodReply(['CLAUDE.md'])]);
    const response = await postJson(h.app, { ...bodyFixture(), surpriseKey: 'x' });
    const body = (await response.json()) as { error: string; problems: string[] };

    expect(response.status).toBe(400);
    expect(body.error).toBe('The project config is not valid');
    expect(body.problems.some((problem) => problem.includes('surpriseKey'))).toBe(true);
    expect(body.problems.every((problem) => /^[^:]+: /.test(problem))).toBe(true);
    expect(h.model.n).toBe(0);
  });

  it('F-15 AC-013 a flat schemaVersion 1 body gets 400 and no model call', async () => {
    const h = harness([goodReply(['CLAUDE.md'])]);
    const response = await postJson(h.app, { schemaVersion: 1, name: 'Demo', idea: IDEA });

    expect(response.status).toBe(400);
    expect(h.model.n).toBe(0);
  });

  it('F-15 AC-014 an empty body gets 400 with an error and no model call', async () => {
    const h = harness([goodReply(['CLAUDE.md'])]);
    const response = await h.app.request('/generate', { method: 'POST', body: '' });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'The request body is empty' });
    expect(h.model.n).toBe(0);
  });
});

describe('F-15 AC-019 AC-027 model failures and unexpected errors', () => {
  it('F-15 AC-019 when the second reply also fails the answer is 502 with problems and no file text', async () => {
    const config = bodyFixture();
    const h = harness([badReply(), badReply()]);
    const response = await postJson(h.app, config);
    const text = await response.text();
    const body = JSON.parse(text) as Record<string, unknown>;

    expect(response.status).toBe(502);
    expect(Object.keys(body).sort()).toEqual(['error', 'problems']);
    expect(body.error).toBe('The generated files did not pass the checks');
    expect(body.problems).toEqual(['(reply): is not one JSON object']);
    expect(text).not.toContain('Sorry, here is the project');
    expect(text).not.toContain('File text.');
    expect(h.model.n).toBe(2);
  });

  it('F-15 AC-019 a provider error answers 502 with the generic message and one model call', async () => {
    const config = bodyFixture();
    const h = harness([new Error('upstream detail sk-sentinel-route-1')]);
    const response = await postJson(h.app, config);
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(JSON.parse(text)).toEqual({ error: 'Generation failed' });
    expect(text).not.toContain('upstream detail');
    expect(h.model.n).toBe(1);
  });

  it('F-15 AC-022 a valid configuration with no model answers 503 with no call', async () => {
    const h = harness(null);
    const response = await postJson(h.app, bodyFixture());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Generation is not configured' });
    expect(h.analyze.n).toBe(0);
  });

  it('F-15 AC-027 an error that escapes the generator answers 500 with the generic message and no error text', async () => {
    const sentinel = 'sentinel-route-duplicate-output-4e1d';
    const lines: string[] = [];
    const app = createApp({
      analyze: async () => ({ findings: [], review: { status: 'failed', findings: [], dropped: 0 } }),
      generate: async () => {
        throw new Error(`duplicate output path ${sentinel}`);
      },
      log: (line) => lines.push(line),
    });
    const response = await postJson(app, bodyFixture());
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(JSON.parse(text)).toEqual({ error: 'Internal error' });
    expect(text).not.toContain(sentinel);
    expect(text).not.toContain('duplicate output');
    expect(lines).toEqual(['route=/generate event=failed status=500']);
  });
});

describe('F-15 AC-025 AC-026 method and path rules', () => {
  it.each(['GET', 'PUT', 'PATCH', 'DELETE'])(
    'F-15 AC-025 %s on /generate answers 405 with Allow: POST, reads no body and makes no model call',
    async (method) => {
      const h = harness([goodReply(['CLAUDE.md'])]);
      // A GET cannot carry a body; the other methods carry one, and the route must leave it unread.
      const request = new Request('http://localhost/generate', method === 'GET' ? { method } : { method, body: '{}' });
      const response = await h.app.fetch(request);

      expect(response.status).toBe(405);
      expect(response.headers.get('Allow')).toBe('POST');
      expect(await response.json()).toEqual({ error: 'Method not allowed' });
      expect(request.bodyUsed).toBe(false);
      expect(h.model.n).toBe(0);
      expect(h.lines).toEqual(['route=/generate event=method-refused status=405']);
    },
  );

  it.each([
    ['POST', '/generate/x'],
    ['GET', '/generate/x'],
    ['POST', '/generate/'],
  ])('F-15 AC-026 %s %s answers 404 with an error and makes no model call', async (method, path) => {
    const h = harness([goodReply(['CLAUDE.md'])]);
    const response = await h.app.request(path, { method });

    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(await response.json()).toEqual({ error: 'Not found' });
    expect(h.model.n).toBe(0);
  });
});

describe('F-15 AC-028 nothing is kept between requests', () => {
  it('F-15 AC-028 a second request with the same body gives the same bytes as the first', async () => {
    const config = bodyFixture();
    const reply = goodReply(plannedPaths(config));
    const h = harness([reply, reply]);

    const first = new Uint8Array(await (await postJson(h.app, config)).arrayBuffer());
    const second = await postJson(h.app, config);

    expect(second.status).toBe(200);
    expect(new Uint8Array(await second.arrayBuffer())).toEqual(first);
    expect(h.model.n).toBe(2);
  });
});

describe('F-15 AC-029 each request writes one log line with the route, event and status only', () => {
  // Each row: the request body text, the model replies (null for no model), and the one line the request writes.
  const rows: { name: string; text: string; answers: (GenerationReply | Error)[] | null; line: string }[] = [
    {
      name: 'a zip',
      text: JSON.stringify(bodyFixture()),
      answers: [goodReply(plannedPaths(bodyFixture()))],
      line: 'route=/generate event=generated status=200',
    },
    {
      name: 'a refusal',
      text: JSON.stringify(blockedBody()),
      answers: [goodReply(['CLAUDE.md'])],
      line: 'route=/generate event=refused status=422',
    },
    {
      name: 'a body that is not JSON',
      text: '{not json',
      answers: [goodReply(['CLAUDE.md'])],
      line: 'route=/generate event=refused-body status=400',
    },
    {
      name: 'an empty body',
      text: '',
      answers: [goodReply(['CLAUDE.md'])],
      line: 'route=/generate event=refused-body status=400',
    },
    {
      name: 'no model',
      text: JSON.stringify(bodyFixture()),
      answers: null,
      line: 'route=/generate event=unavailable status=503',
    },
    {
      name: 'two bad replies',
      text: JSON.stringify(bodyFixture()),
      answers: [badReply(), badReply()],
      line: 'route=/generate event=bad-reply status=502',
    },
    {
      name: 'a provider error',
      text: JSON.stringify(bodyFixture()),
      answers: [new Error('provider')],
      line: 'route=/generate event=provider-error status=502',
    },
  ];

  it.each(rows)('F-15 AC-029 $name writes exactly one line with route, event and status', async ({ text, answers, line }) => {
    const h = harness(answers);
    await h.app.request('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: text,
    });

    expect(h.lines).toEqual([line]);
    expect(h.lines.join('\n')).not.toContain(IDEA);
    expect(h.lines.join('\n')).not.toContain('Sorry');
  });

  it('F-15 AC-029 a zip request writes no line with file text or the brief idea', async () => {
    const body = bodyFixture();
    const h = harness([goodReply(plannedPaths(body))]);
    await postJson(h.app, body);

    expect(h.lines).toHaveLength(1);
    expect(h.lines[0]).not.toContain('File text.');
    expect(h.lines[0]).not.toContain(IDEA);
  });
});
