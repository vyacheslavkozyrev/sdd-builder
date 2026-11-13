import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import {
  DEFAULT_CONNECTIONS,
  DEFAULT_WORKFLOWS,
  planGeneration,
  validateConfig,
  type ProjectConfig,
  type TemplateSource,
} from '@sddbuilder/core';
import type { ReviewModel } from '../src/analyze.js';
import { createApp, type LogPort } from '../src/app.js';
import type { GenerationModel, GenerationReply } from '../src/generate/generation-model.js';

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

/** A valid configuration with the default workflows and connections. */
function sampleConfig(name = 'Sample Project'): ProjectConfig {
  return {
    schemaVersion: 1,
    name,
    idea: 'A tool that turns a product idea into a spec-driven project framework.',
    stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
    architecture: {
      style: 'layered',
      modules: [{ name: 'core', layer: 0, responsibility: 'Domain rules', dependsOn: [] }],
      notes: 'Core has no I/O.',
    },
    codeRules: ['Validate input at the boundary.'],
    testRules: ['Use Vitest for unit tests.'],
    customSteps: [],
    workflows: structuredClone([...DEFAULT_WORKFLOWS]),
    connections: structuredClone([...DEFAULT_CONNECTIONS]),
    targets: ['claude'],
  };
}

/** A configuration the structural rules refuse: two workflows share one id. */
function duplicateIdConfig(): ProjectConfig {
  const config = sampleConfig();
  const first = config.workflows[0];
  if (first === undefined) throw new Error('sample config has no workflow');
  return { ...config, workflows: [...config.workflows, { ...first }] };
}

/** A small fixed templates source: every path gets the same plain text, with no placeholders or headings. */
function sampleTemplates(): TemplateSource {
  return { get: () => 'Template text for the test.' };
}

/** The text the fake model writes for a planned file: its path, then its planned layout (so the headings check passes). */
function textFor(path: string, layout: string): string {
  return `Text of ${path}.\n\n${layout}`;
}

/** A reply with text for every planned file, keyed in the reverse of plan order. */
function replyFor(config: ProjectConfig): string {
  const reply: Record<string, string> = {};
  for (const entry of [...planGeneration(config, sampleTemplates())].reverse()) {
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
  return createApp({ review: UNUSED_REVIEW, generation: { templates: sampleTemplates(), model }, log });
}

function postJson(app: ReturnType<typeof createApp>, url: string, body: unknown): Response | Promise<Response> {
  return app.request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('F-07 AC-007 POST /generate returns the zip of the planned files', () => {
  it('F-07 AC-007 returns 200 with the zip content type and attachment disposition', async () => {
    const config = sampleConfig();
    const app = appWith(scriptedModel([replyFor(config)]));

    const response = await postJson(app, GENERATE_URL, config);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('content-disposition')).toBe(ZIP_DISPOSITION);
  });

  it('F-07 AC-007 the zip holds the planned files in plan order with the model text', async () => {
    const config = sampleConfig();
    const plan = planGeneration(config, sampleTemplates());
    const app = appWith(scriptedModel([replyFor(config)]));

    const response = await postJson(app, GENERATE_URL, config);
    const zip = await JSZip.loadAsync(await response.arrayBuffer());

    expect(Object.keys(zip.files)).toEqual(plan.map((entry) => entry.path));
    for (const entry of plan) {
      expect(await zip.file(entry.path)?.async('string')).toBe(textFor(entry.path, entry.layout));
    }
  });
});

describe('F-07 AC-010 a refused configuration gives 422 with every problem and no model call', () => {
  it('F-07 AC-010 returns 422 listing every structural problem', async () => {
    const config = duplicateIdConfig();
    const model = scriptedModel([]);
    const app = appWith(model);

    const response = await postJson(app, GENERATE_URL, config);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: 'project config cannot be generated',
      problems: validateConfig(config),
    });
    expect(model.prompts).toHaveLength(0);
  });
});

describe('F-07 AC-011 bad input gives 400 through the same rules as /analyze, with no model call', () => {
  const bodies: [string, string, boolean][] = [
    ['a body that is not JSON', '{not json', false],
    ['an empty object', '{}', true],
    ['a JSON array', '[]', true],
    ['a config with a wrong schema version', JSON.stringify({ ...sampleConfig(), schemaVersion: 2 }), true],
  ];

  for (const url of [GENERATE_URL, ANALYZE_URL]) {
    for (const [label, body, hasProblems] of bodies) {
      it(`F-07 AC-011 returns 400 with error for ${label} on ${url}`, async () => {
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

  it('F-07 AC-011 checks the input before the generation configuration: 400, not 503', async () => {
    const app = createApp({ review: UNUSED_REVIEW, generation: null, log: recordingLog() });

    const response = await postJson(app, GENERATE_URL, '{not json');

    expect(response.status).toBe(400);
  });
});

describe('F-07 AC-014 and AC-017 model failures give 502 with problems and no zip', () => {
  it('F-07 AC-014 returns 502 with the findings of the last reply after two calls', async () => {
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
    it(`F-07 AC-017 returns 502 with one generic problem when ${label} on the first call`, async () => {
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

describe('F-07 AC-018 generation not configured gives 503 and no model call', () => {
  it('F-07 AC-018 returns 503 with the generation error and no zip', async () => {
    const log = recordingLog();
    const app = createApp({ review: UNUSED_REVIEW, generation: null, log });

    const response = await postJson(app, GENERATE_URL, sampleConfig());

    expect(response.status).toBe(503);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
    expect(await response.json()).toEqual({ error: 'generation is not configured on this server' });
    expect(log.lines).toEqual([]);
  });
});

describe('F-07 AC-019 the 502 body carries findings and paths only, never file text', () => {
  it('F-07 AC-019 leaves the text of a failed reply out of the response', async () => {
    const config = sampleConfig();
    const secret = 'SECRET-FILE-TEXT-7f3a';
    const firstPath = planGeneration(config, sampleTemplates())[0]?.path ?? '';
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

describe('F-07 AC-022 requests do not share results', () => {
  it('F-07 AC-022 the same body twice gives two independent 200 results with equal bytes', async () => {
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

  it('F-07 AC-022 the second request sees only its own configuration', async () => {
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

describe('F-07 AC-023 a request writes no file', () => {
  it('F-07 AC-023 a successful request calls no node:fs write function', async () => {
    const config = sampleConfig();
    const app = appWith(scriptedModel([replyFor(config)]));

    const response = await postJson(app, GENERATE_URL, config);
    await response.arrayBuffer();

    expect(response.status).toBe(200);
    for (const writer of fileWriters) {
      expect(writer).not.toHaveBeenCalled();
    }
  });

  it('F-07 AC-023 a refused request calls no node:fs write function', async () => {
    const app = appWith(scriptedModel([]));

    const response = await postJson(app, GENERATE_URL, duplicateIdConfig());
    await response.text();

    expect(response.status).toBe(422);
    for (const writer of fileWriters) {
      expect(writer).not.toHaveBeenCalled();
    }
  });
});

describe('F-07 AC-025 unknown paths and wrong methods on /generate', () => {
  it('F-07 AC-025 returns 404 with a JSON error for an unknown path', async () => {
    const response = await appWith(scriptedModel([])).request('http://localhost/nowhere');

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
    expect(await response.json()).toEqual({ error: 'not found' });
  });

  it('F-07 AC-025 returns 405 with Allow: POST for GET on /generate', async () => {
    const response = await appWith(scriptedModel([])).request(GENERATE_URL, { method: 'GET' });

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
    expect(await response.json()).toEqual({ error: 'method not allowed' });
  });
});

describe('F-07 AC-026 every error response has the one error shape', () => {
  const secret = 'secret detail at /srv/app/internal.ts';

  const scenarios: [string, boolean, () => Response | Promise<Response>][] = [
    ['400 for a body that is not JSON', false, () => postJson(appWith(scriptedModel([])), GENERATE_URL, '{not json')],
    ['405 for GET', false, () => appWith(scriptedModel([])).request(GENERATE_URL)],
    ['404 for an unknown path', false, () => appWith(scriptedModel([])).request('http://localhost/nowhere')],
    [
      '422 for a refused configuration',
      true,
      () => postJson(appWith(scriptedModel([])), GENERATE_URL, duplicateIdConfig()),
    ],
    ['502 for a failed reply', true, () => postJson(appWith(scriptedModel(['x', 'y'])), GENERATE_URL, sampleConfig())],
    [
      '503 when generation is not configured',
      false,
      () =>
        postJson(createApp({ review: UNUSED_REVIEW, generation: null, log: recordingLog() }), GENERATE_URL, sampleConfig()),
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
              },
              model: scriptedModel([]),
            },
            log: recordingLog(),
          }),
          GENERATE_URL,
          sampleConfig(),
        ),
    ],
  ];

  for (const [label, hasProblems, run] of scenarios) {
    it(`F-07 AC-026 ${label} is JSON with error, problems as strings where there are problems, and no stack or path`, async () => {
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
