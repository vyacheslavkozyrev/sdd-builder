import { pipeline } from '@sddbuilder/core';
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { analyzePipeline, type ReviewModel } from '../src/analyze.js';
import { createApp, type AppDeps } from '../src/app.js';
import { withSubjects } from './subject.js';

// A fixed sentinel that stands in for brief content. It must never reach a log line or a file.
const SENTINEL = 'SENTINEL-IDEA-7f3a91';

const pipelineFixture: pipeline.Pipeline = {
  name: 'SDD',
  description: 'The process',
  arguments: [],
  flows: [],
};

function configFixture(idea: string, name = 'Project'): pipeline.ProjectConfig {
  return {
    schemaVersion: 2,
    name,
    idea,
    architecture: 'A small web app',
    stack: { language: 'TypeScript', framework: 'React' },
    rules: [],
    pipeline: pipelineFixture,
  };
}

// A body the parser accepts, built from the default pipeline, as the route reads it.
function routeBody(idea: string, name = 'Project'): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name,
    idea,
    architecture: 'A single service',
    stack: { language: 'TypeScript', framework: 'React' },
    rules: [],
    pipeline: pipeline.defaultPipeline,
  };
}

// A fake model that answers with a fixed reply, or throws an error with a fixed message.
function fakeModel(answer: { text?: string; stopReason?: string | null; throws?: string }): ReviewModel {
  return {
    review: async () => {
      if (answer.throws !== undefined) throw new Error(answer.throws);
      const stopReason = answer.stopReason === undefined ? 'end_turn' : answer.stopReason;
      return { text: answer.text ?? '[]', stopReason };
    },
  };
}

// Collects every log line of one analysis, so the test can search all of them.
async function analyzeLogged(config: pipeline.ProjectConfig, model: ReviewModel | null) {
  const lines: string[] = [];
  const result = await analyzePipeline(config, model, (line) => lines.push(line));
  return { result, lines };
}

// The relative paths of every file and folder under a root, sorted, so two listings can be compared.
function listTree(root: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(root, prefix)).sort()) {
    const rel = prefix === '' ? name : `${prefix}/${name}`;
    out.push(rel);
    if (statSync(join(root, rel)).isDirectory()) out.push(...listTree(root, rel));
  }
  return out;
}

const failurePaths: { label: string; model: ReviewModel | null }[] = [
  { label: 'no model', model: null },
  { label: 'a thrown error', model: fakeModel({ throws: 'connection reset' }) },
  { label: 'stop reason max_tokens', model: fakeModel({ text: '[', stopReason: 'max_tokens' }) },
  { label: 'a reply that is not JSON', model: fakeModel({ text: 'not json at all' }) },
  { label: 'a reply that is JSON but not an array', model: fakeModel({ text: '{"findings": []}' }) },
];

describe('F-06 the analysis keeps no brief content in logs', () => {
  it('F-06 AC-025 the sentinel idea appears in no log line on the success path', async () => {
    const model = fakeModel({ text: JSON.stringify([{ severity: 'info', subject: 'idea', message: 'Clear.' }]) });
    const { lines } = await analyzeLogged(configFixture(SENTINEL), model);

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).not.toContain(SENTINEL);
  });

  it.each(failurePaths)('F-06 AC-025 the sentinel idea appears in no log line on the failure path: $label', async ({
    model,
  }) => {
    const { lines } = await analyzeLogged(configFixture(SENTINEL), model);

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).not.toContain(SENTINEL);
  });

  it('F-06 AC-025 the log lines carry the event and the status only', async () => {
    const { lines } = await analyzeLogged(configFixture(SENTINEL), fakeModel({ text: '[]' }));

    expect(lines).toEqual(['route=/analyze event=review status=ok']);
  });

  it('F-06 AC-026 a thrown error whose message holds the sentinel leaves it out of the log lines and the result', async () => {
    const model = fakeModel({ throws: `provider echoed the brief: ${SENTINEL}` });
    const { result, lines } = await analyzeLogged(configFixture(SENTINEL), model);

    for (const line of lines) expect(line).not.toContain(SENTINEL);
    expect(JSON.stringify(result)).not.toContain(SENTINEL);
    expect(lines).toContain('route=/analyze event=review status=failed');
  });
});

describe('F-06 the analysis keeps no state between calls', () => {
  it('F-06 AC-024 two calls with different configs each return only their own findings', async () => {
    const first = configFixture('', '');
    const second = configFixture('A complete idea for a notes app', 'Notes');
    const model = fakeModel({ text: '[]' });

    const firstResult = await analyzePipeline(first, model, () => {});
    const secondResult = await analyzePipeline(second, model, () => {});

    expect(firstResult.findings).toEqual(
      withSubjects([...pipeline.analyzeStructure(first), ...pipeline.analyzeBrief(first)]),
    );
    expect(secondResult.findings).toEqual(
      withSubjects([...pipeline.analyzeStructure(second), ...pipeline.analyzeBrief(second)]),
    );
    expect(secondResult.findings).not.toEqual(firstResult.findings);
  });

  it('F-06 AC-024 the result of a call is not changed by a later call that fails', async () => {
    const config = configFixture('A complete idea for a notes app', 'Notes');
    const ok = await analyzePipeline(config, fakeModel({ text: '[]' }), () => {});
    const snapshot = structuredClone(ok);

    await analyzePipeline(configFixture('', ''), fakeModel({ throws: 'timeout' }), () => {});

    expect(ok).toEqual(snapshot);
  });
});

// Puts an environment variable back as it was, removing it when it was not set.
function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

// Gives each test a fresh temp folder that is the cwd, with TMPDIR and HOME pointing at it. The folder is removed
// afterwards, even when restoring the cwd or the environment fails. Returns a getter for the folder.
function useTempFolder(): () => string {
  let root = '';
  let previous: { cwd: string; tmpdir: string | undefined; home: string | undefined };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'sddbuilder-privacy-'));
    previous = { cwd: process.cwd(), tmpdir: process.env['TMPDIR'], home: process.env['HOME'] };
    process.chdir(root);
    process.env['TMPDIR'] = root;
    process.env['HOME'] = root;
  });

  afterEach(() => {
    try {
      process.chdir(previous.cwd);
    } finally {
      restoreEnv('TMPDIR', previous.tmpdir);
      restoreEnv('HOME', previous.home);
      rmSync(root, { recursive: true, force: true });
    }
  });

  return () => root;
}

describe('F-06 the analysis writes no file', () => {
  const folder = useTempFolder();

  it('F-06 AC-024 the analysis, run from a temp folder with TMPDIR and HOME set to it, leaves that folder unchanged', async () => {
    const root = folder();
    const before = listTree(root);

    await analyzeLogged(configFixture(SENTINEL), fakeModel({ text: '[]' }));
    await analyzeLogged(configFixture(SENTINEL), null);
    await analyzeLogged(configFixture(SENTINEL), fakeModel({ throws: 'timeout' }));

    expect(listTree(root)).toEqual(before);
  });
});

// The route requests the privacy cases send. The route runs the real analysis with a fake model unless a case
// replaces the analysis. Every line the route and the analysis log is collected, in order.
interface RouteRequest {
  readonly method?: string;
  // A stream is made per run: a body that fails while it is read (the stream errors on the first pull).
  readonly body: string | (() => ReadableStream<Uint8Array>);
  readonly analyze?: AppDeps['analyze'];
}

interface RouteRun {
  readonly status: number;
  readonly text: string;
  readonly lines: string[];
}

async function runRoute(request: RouteRequest): Promise<RouteRun> {
  const lines: string[] = [];
  const log = (line: string): void => {
    lines.push(line);
  };
  const model = fakeModel({ text: '[]' });
  const app = createApp({
    analyze: request.analyze ?? ((config) => analyzePipeline(config, model, log)),
    generate: async () => ({ kind: 'unavailable' }),
    log,
  });
  const body = typeof request.body === 'string' ? request.body : request.body();
  const init = {
    method: request.method ?? 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    duplex: 'half',
  } as RequestInit;
  const response = await app.request('/analyze', init);
  return { status: response.status, text: await response.text(), lines };
}

const sentinelBody = JSON.stringify(routeBody(SENTINEL));

// A body whose read fails with a message that holds the sentinel.
function unreadableBody(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.error(new Error(`read broke near ${SENTINEL}`));
    },
  });
}

const routeCases: { label: string; status: number; request: RouteRequest; lines: string[] }[] = [
  {
    label: 'a success (200)',
    status: 200,
    request: { body: sentinelBody },
    lines: ['route=/analyze event=review status=ok', 'route=/analyze event=answered status=200'],
  },
  {
    label: 'a parse refusal (400)',
    status: 400,
    request: { body: JSON.stringify({ ...routeBody(SENTINEL), schemaVersion: 1 }) },
    lines: ['route=/analyze event=refused status=400'],
  },
  {
    label: 'a body that is not JSON (400)',
    status: 400,
    request: { body: `{"idea":"${SENTINEL}` },
    lines: ['route=/analyze event=refused status=400'],
  },
  {
    label: 'a method other than POST (405)',
    status: 405,
    request: { method: 'PUT', body: sentinelBody },
    lines: ['route=/analyze event=refused status=405'],
  },
  {
    label: 'an error thrown by the analysis (500)',
    status: 500,
    request: {
      body: sentinelBody,
      analyze: async () => {
        throw new Error(`analysis broke near ${SENTINEL}`);
      },
    },
    lines: ['route=/analyze event=analysis-failed status=500'],
  },
  {
    label: 'a body that cannot be read (500)',
    status: 500,
    request: { body: unreadableBody },
    lines: ['route=/analyze event=body-unreadable status=500'],
  },
];

// A log line of the route or the analysis: `route=/analyze event=<name> status=<value>`, and nothing else.
const LOG_LINE = /^route=\/analyze event=[a-z][a-z-]* status=[a-z0-9]+$/;

function fieldNames(line: string): string[] {
  return line.split(' ').map((field) => field.slice(0, field.indexOf('=')));
}

describe('F-14 the route keeps no brief content in logs', () => {
  it.each(routeCases)('F-14 AC-025 the sentinel idea appears in no log line on $label', async ({ request, status }) => {
    const run = await runRoute(request);

    expect(run.status).toBe(status);
    expect(run.lines.length).toBeGreaterThan(0);
    for (const line of run.lines) expect(line).not.toContain(SENTINEL);
  });

  it.each(routeCases)('F-14 AC-026 each log line of a request carries the event, route and status only, on $label', async ({
    request,
    lines,
  }) => {
    const run = await runRoute(request);

    expect(run.lines).toEqual(lines);
    for (const line of run.lines) {
      expect(line).toMatch(LOG_LINE);
      expect(fieldNames(line)).toEqual(['route', 'event', 'status']);
    }
  });
});

describe('F-14 the route answers each request from its own brief only', () => {
  it('F-14 AC-027 two requests with different briefs each return only their own findings', async () => {
    const first = routeBody('', 'Project');
    const second = routeBody('A complete idea for a notes app', 'Notes');
    const expectedFor = (body: Record<string, unknown>): unknown => {
      const parsed = pipeline.parseProjectConfig(body);
      if (!parsed.ok) throw new Error('the fixture must parse');
      return withSubjects([...pipeline.analyzeStructure(parsed.config), ...pipeline.analyzeBrief(parsed.config)]);
    };

    const firstRun = await runRoute({ body: JSON.stringify(first) });
    const secondRun = await runRoute({ body: JSON.stringify(second) });
    const again = await runRoute({ body: JSON.stringify(first) });

    expect((JSON.parse(firstRun.text) as { findings: unknown }).findings).toEqual(expectedFor(first));
    expect((JSON.parse(secondRun.text) as { findings: unknown }).findings).toEqual(expectedFor(second));
    expect(secondRun.text).not.toEqual(firstRun.text);
    expect(again.text).toBe(firstRun.text);
  });
});

describe('F-14 the route writes no file and keeps no state', () => {
  const folder = useTempFolder();

  it('F-14 AC-027 every route case, run from a temp folder with TMPDIR and HOME set to it, leaves that folder unchanged', async () => {
    const root = folder();
    const before = listTree(root);

    for (const { request } of routeCases) await runRoute(request);

    expect(listTree(root)).toEqual(before);
  });
});
