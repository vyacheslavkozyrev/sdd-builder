import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import { pipeline } from '@sddbuilder/core';
import type { ReviewModel } from '../src/analyze.js';
import { createApp } from '../src/app.js';
import { fixedLimits } from './fixed-limits.js';
import { pipelineConfig, pipelineTemplates, refusedPipelineConfig } from './pipeline-config.js';
import type { LogPort } from '../src/log.js';
import {
  createAnthropicGenerationModel,
  type GenerationClientLike,
  type GenerationModel,
  type GenerationReply,
} from '../src/generate/generation-model.js';

// Every node:fs write function is wrapped so a test can prove that a request wrote nothing; the wrapped call still runs.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    write: vi.fn(actual.write),
    writeSync: vi.fn(actual.writeSync),
    writev: vi.fn(actual.writev),
    writevSync: vi.fn(actual.writevSync),
    writeFileSync: vi.fn(actual.writeFileSync),
    appendFileSync: vi.fn(actual.appendFileSync),
    mkdirSync: vi.fn(actual.mkdirSync),
    mkdtempSync: vi.fn(actual.mkdtempSync),
    copyFileSync: vi.fn(actual.copyFileSync),
    cpSync: vi.fn(actual.cpSync),
    renameSync: vi.fn(actual.renameSync),
    rmSync: vi.fn(actual.rmSync),
    rmdirSync: vi.fn(actual.rmdirSync),
    unlinkSync: vi.fn(actual.unlinkSync),
    truncateSync: vi.fn(actual.truncateSync),
    ftruncateSync: vi.fn(actual.ftruncateSync),
    symlinkSync: vi.fn(actual.symlinkSync),
    linkSync: vi.fn(actual.linkSync),
    chmodSync: vi.fn(actual.chmodSync),
    chownSync: vi.fn(actual.chownSync),
    utimesSync: vi.fn(actual.utimesSync),
    openSync: vi.fn(actual.openSync),
    createWriteStream: vi.fn(actual.createWriteStream),
    promises: await import('node:fs/promises'),
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    writeFile: vi.fn(actual.writeFile),
    appendFile: vi.fn(actual.appendFile),
    mkdir: vi.fn(actual.mkdir),
    mkdtemp: vi.fn(actual.mkdtemp),
    copyFile: vi.fn(actual.copyFile),
    cp: vi.fn(actual.cp),
    rename: vi.fn(actual.rename),
    rm: vi.fn(actual.rm),
    rmdir: vi.fn(actual.rmdir),
    unlink: vi.fn(actual.unlink),
    truncate: vi.fn(actual.truncate),
    symlink: vi.fn(actual.symlink),
    link: vi.fn(actual.link),
    chmod: vi.fn(actual.chmod),
    chown: vi.fn(actual.chown),
    utimes: vi.fn(actual.utimes),
    open: vi.fn(actual.open),
  };
});

const GENERATE_URL = 'http://localhost/generate';
const ANALYZE_URL = 'http://localhost/analyze';
const ZIP_DISPOSITION = 'attachment; filename="sddbuilder-project.zip"';
const UNUSED_REVIEW: ReviewModel = {
  complete: () => Promise.reject(new Error('the review model is not used by /generate')),
};

const fileWriters = [
  fs.write,
  fs.writeSync,
  fs.writev,
  fs.writevSync,
  fs.writeFileSync,
  fs.appendFileSync,
  fs.mkdirSync,
  fs.mkdtempSync,
  fs.copyFileSync,
  fs.cpSync,
  fs.renameSync,
  fs.rmSync,
  fs.rmdirSync,
  fs.unlinkSync,
  fs.truncateSync,
  fs.ftruncateSync,
  fs.symlinkSync,
  fs.linkSync,
  fs.chmodSync,
  fs.chownSync,
  fs.utimesSync,
  fs.openSync,
  fs.createWriteStream,
  fsp.writeFile,
  fsp.appendFile,
  fsp.mkdir,
  fsp.mkdtemp,
  fsp.copyFile,
  fsp.cp,
  fsp.rename,
  fsp.rm,
  fsp.rmdir,
  fsp.unlink,
  fsp.truncate,
  fsp.symlink,
  fsp.link,
  fsp.chmod,
  fsp.chown,
  fsp.utimes,
  fsp.open,
];

beforeEach(() => {
  for (const writer of fileWriters) {
    vi.mocked(writer).mockClear();
  }
});

/** A valid pipeline configuration (the default pipeline); the name is the only field a test varies. */
function sampleConfig(name = 'Sample Project'): pipeline.ProjectConfig {
  return pipelineConfig({ name });
}

/** A configuration the structural rules refuse: the first flow names a rule tag that no rule has. */
function refusedConfig(): pipeline.ProjectConfig {
  return refusedPipelineConfig();
}

/** The findings `/generate` answers a refused configuration with: `<path>: <message>` per problem. */
function refusalsOf(config: pipeline.ProjectConfig): string[] {
  return pipeline.configProblems(config).map((problem) => `${problem.path}: ${problem.message}`);
}

/** The text the fake model writes for a planned file: its path, then its planned layout (so the headings check passes). */
function textFor(path: string, layout: string): string {
  return `Text of ${path}.\n\n${layout}`;
}

/** A reply with text for every planned file, keyed in the reverse of plan order. */
function replyFor(config: pipeline.ProjectConfig): string {
  const reply: Record<string, string> = {};
  for (const entry of [...pipeline.planGeneration(config, pipelineTemplates())].reverse()) {
    reply[entry.path] = textFor(entry.path, entry.layout);
  }
  return JSON.stringify(reply);
}

/** A model fake that answers each call in turn with a reply text or a rejection, records every prompt, and rejects extra calls. */
interface FakeModel extends GenerationModel {
  prompts: string[];
}

function scriptedModel(steps: readonly (string | Error)[]): FakeModel {
  const prompts: string[] = [];
  return {
    prompts,
    complete(prompt: string): Promise<GenerationReply> {
      prompts.push(prompt);
      const step = steps[prompts.length - 1];
      if (step === undefined) {
        return Promise.reject(new Error('unexpected extra model call'));
      }
      if (step instanceof Error) {
        return Promise.reject(step);
      }
      return Promise.resolve({ text: step, truncated: false });
    },
  };
}

/** A log port that keeps every line it receives. */
function recordingLog(): LogPort & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    write: (line: string) => {
      lines.push(line);
    },
  };
}

function appWith(model: GenerationModel, log: LogPort = recordingLog()): ReturnType<typeof createApp> {
  return createApp({ limits: fixedLimits(), review: UNUSED_REVIEW, generation: { templates: pipelineTemplates(), model }, log });
}

function postJson(app: ReturnType<typeof createApp>, url: string, body: unknown): Response | Promise<Response> {
  return app.request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('F-07 AC-014 POST /generate returns the zip of the planned files', () => {
  it('F-07 AC-014 returns 200 with the zip content type and attachment disposition', async () => {
    const config = sampleConfig();
    const app = appWith(scriptedModel([replyFor(config)]));

    const response = await postJson(app, GENERATE_URL, config);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('content-disposition')).toBe(ZIP_DISPOSITION);
  });

  it('F-07 AC-009 the zip holds the planned files in plan order with the model text', async () => {
    const config = sampleConfig();
    const plan = pipeline.planGeneration(config, pipelineTemplates());
    const app = appWith(scriptedModel([replyFor(config)]));

    const response = await postJson(app, GENERATE_URL, config);
    const zip = await JSZip.loadAsync(await response.arrayBuffer());

    expect(Object.keys(zip.files)).toEqual(plan.map((entry) => entry.path));
    for (const entry of plan) {
      expect(await zip.file(entry.path)?.async('string')).toBe(textFor(entry.path, entry.layout));
    }
  });
});

describe('F-07 AC-009 a reply with invisible characters in its .claude keys still gives the zip', () => {
  it('F-07 AC-009 returns 200 with the planned zip after one call when a zero-width space precedes each .claude key', async () => {
    const config = sampleConfig();
    const plan = pipeline.planGeneration(config, pipelineTemplates());
    const claudePaths = plan.map((entry) => entry.path).filter((path) => path.startsWith('.claude/'));
    expect(claudePaths.length).toBeGreaterThan(0);
    const reply: Record<string, string> = {};
    for (const entry of [...plan].reverse()) {
      const key = entry.path.startsWith('.claude/') ? `​${entry.path}` : entry.path;
      reply[key] = textFor(entry.path, entry.layout);
    }
    const model = scriptedModel([JSON.stringify(reply)]);
    const app = appWith(model);

    const response = await postJson(app, GENERATE_URL, config);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    expect(Object.keys(zip.files)).toEqual(plan.map((entry) => entry.path));
    expect(model.prompts).toHaveLength(1);
  });
});

describe('F-07 AC-010 a failed reply and a passing retry give the zip after two calls', () => {
  it('F-07 AC-010 returns 200 with the zip after a failed reply and a passing retry, after two calls', async () => {
    const config = sampleConfig();
    const plan = pipeline.planGeneration(config, pipelineTemplates());
    const firstPath = plan[0]?.path ?? '';
    const incomplete: Record<string, string> = JSON.parse(replyFor(config)) as Record<string, string>;
    delete incomplete[firstPath];
    const model = scriptedModel([JSON.stringify(incomplete), replyFor(config)]);
    const app = appWith(model);

    const response = await postJson(app, GENERATE_URL, config);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('content-disposition')).toBe(ZIP_DISPOSITION);
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    expect(Object.keys(zip.files)).toEqual(plan.map((entry) => entry.path));
    expect(model.prompts).toHaveLength(2);
    expect(model.prompts[1]).toContain(`planned file "${firstPath}" is missing from the reply`);
  });
});

describe('F-07 AC-006 a refused configuration gives 422 with every problem and no model call', () => {
  it('F-07 AC-006 returns 422 listing every structural problem', async () => {
    const config = refusedConfig();
    const model = scriptedModel([]);
    const app = appWith(model);

    const response = await postJson(app, GENERATE_URL, config);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'project config cannot be generated',
      problems: refusalsOf(config),
    });
    expect(model.prompts).toHaveLength(0);
  });
});

describe('F-07 AC-002 AC-003 AC-004 bad input gives 400 with no model call, on both routes', () => {
  const bodies: [string, string, boolean, string][] = [
    ['a body that is not JSON', '{not json', false, 'F-07 AC-003'],
    ['an empty object', '{}', true, 'F-07 AC-004'],
    ['a JSON array', '[]', true, 'F-07 AC-004'],
    ['a config with a wrong schema version', JSON.stringify({ ...sampleConfig(), schemaVersion: 1 }), true, 'F-07 AC-002'],
  ];

  for (const url of [GENERATE_URL, ANALYZE_URL]) {
    for (const [label, body, hasProblems, criterion] of bodies) {
      it(`${criterion} returns 400 with error for ${label} on ${url}`, async () => {
        const model = scriptedModel([]);
        const app = appWith(model);

        const response = await postJson(app, url, body);

        expect(response.status).toBe(400);
        const json = (await response.json()) as { error: unknown; problems?: unknown };
        expect(typeof json.error).toBe('string');
        expect(Array.isArray(json.problems)).toBe(hasProblems);
        expect(model.prompts).toHaveLength(0);
      });
    }
  }

  it('F-07 AC-003 checks the input before the generation configuration: 400, not 503', async () => {
    const app = createApp({ limits: fixedLimits(), review: UNUSED_REVIEW, generation: null, log: recordingLog() });

    const response = await postJson(app, GENERATE_URL, '{not json');

    expect(response.status).toBe(400);
  });
});

describe('F-07 AC-011 and AC-012 model failures give 502 with problems and no zip', () => {
  it('F-07 AC-011 returns 502 with the findings of the last reply after two calls', async () => {
    const config = sampleConfig();
    const model = scriptedModel(['not json at all', '[]']);
    const app = appWith(model);

    const response = await postJson(app, GENERATE_URL, config);

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
    expect(await response.json()).toEqual({
      error: 'the model reply failed the checks',
      problems: ['reply must be a JSON object mapping file paths to text'],
    });
    expect(model.prompts).toHaveLength(2);
  });

  const callFailures: [string, Error][] = [
    ['the model throws', new TypeError('provider unreachable')],
    ['the model call fails with a timeout error', new Error('timeout')],
  ];

  for (const [label, failure] of callFailures) {
    it(`F-07 AC-012 returns 502 with one generic problem when ${label} on the first call`, async () => {
      const model = scriptedModel([failure]);
      const app = appWith(model);

      const response = await postJson(app, GENERATE_URL, sampleConfig());

      expect(response.status).toBe(502);
      expect(await response.json()).toEqual({
        error: 'the model did not return the project',
        problems: ['the model call failed'],
      });
      expect(model.prompts).toHaveLength(1);
    });
  }
});

describe('F-13 AC-024 a generation timeout gives 502 with no file text', () => {
  it('F-13 AC-024 returns 502 with the generic problem and no file text when the provider call times out', async () => {
    const timeout = Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' });
    const client: GenerationClientLike = { messages: { create: () => Promise.reject(timeout) } };
    const model = createAnthropicGenerationModel({ ANTHROPIC_API_KEY: 'test-key-value-0123456789' }, () => client);
    const log = recordingLog();
    const app = appWith(model, log);

    const response = await postJson(app, GENERATE_URL, sampleConfig());
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(JSON.parse(text)).toEqual({
      error: 'the model did not return the project',
      problems: ['the model call failed'],
    });
    expect(log.lines.join('\n')).toContain('APIConnectionTimeoutError');
    expect(log.lines.join('\n')).not.toContain('Request timed out');
  });
});

describe('F-07 AC-013 generation not configured gives 503 and no model call', () => {
  it('F-07 AC-013 returns 503 with the generation error and no zip', async () => {
    const log = recordingLog();
    const app = createApp({ limits: fixedLimits(), review: UNUSED_REVIEW, generation: null, log });

    const response = await postJson(app, GENERATE_URL, sampleConfig());

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
    expect(await response.json()).toEqual({ error: 'generation is not configured on this server' });
    expect(log.lines).toEqual([]);
  });
});

describe('F-07 AC-011 the 502 body carries findings and paths only, never file text', () => {
  it('F-07 AC-011 leaves the text of a failed reply out of the response', async () => {
    const config = sampleConfig();
    const secret = 'SECRET-FILE-TEXT-7f3a';
    const firstPath = pipeline.planGeneration(config, pipelineTemplates())[0]?.path ?? '';
    const failedReply = JSON.stringify({ [firstPath]: { body: secret } });
    const app = appWith(scriptedModel([failedReply, failedReply]));

    const response = await postJson(app, GENERATE_URL, config);
    const text = await response.text();

    expect(response.status).toBe(502);
    expect(text).not.toContain(secret);
    const json = JSON.parse(text) as { problems: string[] };
    expect(json.problems.join('\n')).toContain(firstPath);
  });
});

describe('requests do not share results', () => {
  it('F-07 AC-015 the same body twice gives two independent 200 results with equal bytes', async () => {
    const config = sampleConfig();
    const model = scriptedModel([replyFor(config), replyFor(config)]);
    const app = appWith(model);

    const first = await postJson(app, GENERATE_URL, config);
    const second = await postJson(app, GENERATE_URL, config);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(model.prompts).toHaveLength(2);
    expect(Buffer.from(await second.arrayBuffer()).equals(Buffer.from(await first.arrayBuffer()))).toBe(true);
  });

  it('the second request sees only its own configuration', async () => {
    const alpha = sampleConfig('Alpha Project');
    const beta = sampleConfig('Beta Project');
    const model = scriptedModel([replyFor(alpha), replyFor(beta)]);
    const app = appWith(model);

    await postJson(app, GENERATE_URL, alpha);
    const second = await postJson(app, GENERATE_URL, beta);

    expect(second.status).toBe(200);
    expect(model.prompts[1]).toContain('Beta Project');
    expect(model.prompts[1]).not.toContain('Alpha Project');
  });
});

describe('a request writes no file', () => {
  it('a successful request calls no node:fs write function', async () => {
    const config = sampleConfig();
    const app = appWith(scriptedModel([replyFor(config)]));

    const response = await postJson(app, GENERATE_URL, config);
    await response.arrayBuffer();

    expect(response.status).toBe(200);
    for (const writer of fileWriters) {
      expect(writer).not.toHaveBeenCalled();
    }
  });

  it('a refused request calls no node:fs write function', async () => {
    const app = appWith(scriptedModel([]));

    const response = await postJson(app, GENERATE_URL, refusedConfig());
    await response.text();

    expect(response.status).toBe(422);
    for (const writer of fileWriters) {
      expect(writer).not.toHaveBeenCalled();
    }
  });
});

describe('F-07 AC-019 unknown paths and wrong methods on /generate', () => {
  it('F-07 AC-019 returns 404 with a JSON error for an unknown path', async () => {
    const response = await appWith(scriptedModel([])).request('http://localhost/nowhere');

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
    expect(await response.json()).toEqual({ error: 'not found' });
  });

  it('F-07 AC-019 returns 405 with Allow: POST for GET on /generate', async () => {
    const response = await appWith(scriptedModel([])).request(GENERATE_URL, { method: 'GET' });

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(await response.json()).toEqual({ error: 'method not allowed' });
  });
});

describe('every error response has the one error shape', () => {
  const secret = 'secret detail at /srv/app/internal.ts';

  const scenarios: [string, boolean, () => Response | Promise<Response>][] = [
    ['400 for a body that is not JSON', false, () => postJson(appWith(scriptedModel([])), GENERATE_URL, '{not json')],
    ['405 for GET', false, () => appWith(scriptedModel([])).request(GENERATE_URL)],
    ['404 for an unknown path', false, () => appWith(scriptedModel([])).request('http://localhost/nowhere')],
    [
      '422 for a refused configuration',
      true,
      () => postJson(appWith(scriptedModel([])), GENERATE_URL, refusedConfig()),
    ],
    ['502 for a failed reply', true, () => postJson(appWith(scriptedModel(['x', 'y'])), GENERATE_URL, sampleConfig())],
    [
      '503 when generation is not configured',
      false,
      () =>
        postJson(createApp({ limits: fixedLimits(), review: UNUSED_REVIEW, generation: null, log: recordingLog() }), GENERATE_URL, sampleConfig()),
    ],
    [
      '500 when the templates throw',
      false,
      () =>
        postJson(
          createApp({
            review: UNUSED_REVIEW,
            generation: {
              templates: {
                get: () => {
                  throw new Error(secret);
                },
                paths: () => [],
              },
              model: scriptedModel([]),
            },
            log: recordingLog(),
            limits: fixedLimits(),
          }),
          GENERATE_URL,
          sampleConfig(),
        ),
    ],
  ];

  for (const [label, hasProblems, run] of scenarios) {
    it(`${label} is JSON with error, problems as strings where there are problems, and no stack or path`, async () => {
      const response = await run();
      const text = await response.text();

      expect(response.headers.get('content-type')).toMatch(/application\/json/);
      const json = JSON.parse(text) as Record<string, unknown>;
      expect(Object.keys(json).every((key) => key === 'error' || key === 'problems')).toBe(true);
      expect(typeof json['error']).toBe('string');
      expect(json['problems'] !== undefined).toBe(hasProblems);
      if (hasProblems) {
        expect(Array.isArray(json['problems'])).toBe(true);
        for (const problem of json['problems'] as unknown[]) {
          expect(typeof problem).toBe('string');
        }
      }
      expect(text).not.toContain(secret);
      expect(text).not.toContain('stack');
      expect(text).not.toMatch(/\bat\s+\S+\s+\(|\.[cm]?[jt]s:\d+|node_modules/);
    });
  }
});
