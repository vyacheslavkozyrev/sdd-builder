import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
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

const GENERATE_URL = 'http://localhost/generate';
const ANALYZE_URL = 'http://localhost/analyze';
const ZIP_DISPOSITION = 'attachment; filename="sddbuilder-project.zip"';
const UNUSED_REVIEW: ReviewModel = {
  complete: () => Promise.reject(new Error('the review model is not used by /generate')),
};

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
