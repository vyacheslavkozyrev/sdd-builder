import type Anthropic from '@anthropic-ai/sdk';
import { pipeline } from '@sddbuilder/core';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { GenerationTemplates } from '../src/generate/load-templates.js';
import type { ReviewClient } from '../src/review/anthropic.js';
import type { Settings } from '../src/settings.js';
import { buildDeps } from '../src/wiring.js';

// A sentinel key stands in for a real one. No test reaches the network: the client is a fake.
const SENTINEL = 'sk-sentinel-F14-key-000';

// Fixed layouts given as data: no template file is read.
const TEMPLATES: GenerationTemplates = {
  base: [{ path: 'CLAUDE.md', layout: 'Project instructions.' }],
  pipeline: 'Pipeline.',
  flow: 'Flow.',
  agent: 'Agent.',
  rule: 'Rule.',
};

function settingsWith(apiKey: string | undefined): Settings {
  return { port: 3000, analyzerModel: 'model-under-test', generatorModel: 'generator-under-test', apiKey };
}

// A fake client factory. It records the key it is given and the client it makes; the client records each call and
// answers with a fixed reply, or throws an error that carries the sentinel when asked to.
function fakeFactory(answer: { throwsSentinel?: boolean } = {}) {
  const keys: string[] = [];
  const calls: { body: Anthropic.MessageCreateParamsNonStreaming; options: Anthropic.RequestOptions | undefined }[] = [];
  const factory = (apiKey: string): ReviewClient => {
    keys.push(apiKey);
    return {
      messages: {
        create: async (body, options) => {
          calls.push({ body, options });
          if (answer.throwsSentinel === true) throw new Error(`provider rejected ${SENTINEL}`);
          return {
            content: [{ type: 'text', text: '[]' }],
            stop_reason: 'end_turn',
          } as Anthropic.Message;
        },
      },
    };
  };
  return { factory, keys, calls };
}

function validConfig(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'Project',
    idea: 'A small web app for notes',
    architecture: 'A single service',
    stack: { language: 'TypeScript', framework: 'React' },
    rules: [],
    pipeline: pipeline.defaultPipeline,
  };
}

async function postConfig(app: ReturnType<typeof createApp>, body: string) {
  return app.request('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('F-14 AC-023 wiring without ANTHROPIC_API_KEY', () => {
  it('F-14 AC-023 with no key the client factory is never called and the analysis runs with no model', async () => {
    const { factory, keys } = fakeFactory();
    const lines: string[] = [];
    const deps = buildDeps(settingsWith(undefined), factory, TEMPLATES, (line) => lines.push(line));
    const response = await postConfig(createApp(deps), JSON.stringify(validConfig()));

    expect(keys).toEqual([]);
    expect(response.status).toBe(200);
    const reply = (await response.json()) as { review: { status: string } };
    expect(reply.review.status).toBe('failed');
  });

  it('F-14 AC-023 the startup log line names ANTHROPIC_API_KEY as missing', () => {
    const lines: string[] = [];
    buildDeps(settingsWith(undefined), fakeFactory().factory, TEMPLATES, (line) => lines.push(line));

    expect(lines).toEqual(['startup review=off generation=off missing=ANTHROPIC_API_KEY']);
    expect(lines.join('\n')).toContain('ANTHROPIC_API_KEY');
  });
});

describe('F-14 AC-024 the key goes to the client factory only', () => {
  it('F-14 AC-024 with a key the factory is given the key once and the model calls the client with the analyzer model', async () => {
    const { factory, keys, calls } = fakeFactory();
    const deps = buildDeps(settingsWith(SENTINEL), factory, TEMPLATES, () => undefined);
    const response = await postConfig(createApp(deps), JSON.stringify(validConfig()));

    expect(response.status).toBe(200);
    expect(keys).toEqual([SENTINEL]);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.body.model).toBe('model-under-test');
    expect(JSON.stringify(calls[0]?.body)).not.toContain(SENTINEL);
    expect(JSON.stringify(calls[0]?.options)).not.toContain(SENTINEL);
  });

  it('F-14 AC-024 the sentinel key appears in no response of the app, on success, 400, 404 or 405', async () => {
    const { factory } = fakeFactory();
    const app = createApp(buildDeps(settingsWith(SENTINEL), factory, TEMPLATES, () => undefined));
    const responses = [
      await postConfig(app, JSON.stringify(validConfig())),
      await postConfig(app, '{"not": "a config"'),
      await app.request('/analyze', { method: 'GET' }),
      await app.request('/nope', { method: 'POST' }),
    ];

    const texts = await Promise.all(responses.map((response) => response.text()));
    expect(responses.map((response) => response.status)).toEqual([200, 400, 405, 404]);
    for (const text of texts) {
      expect(text).not.toContain(SENTINEL);
    }
  });

  it('F-14 AC-024 the sentinel key appears in no log line, even when the review call throws an error that carries it', async () => {
    const { factory } = fakeFactory({ throwsSentinel: true });
    const lines: string[] = [];
    const deps = buildDeps(settingsWith(SENTINEL), factory, TEMPLATES, (line) => lines.push(line));
    const app = createApp(deps);
    const response = await postConfig(app, JSON.stringify(validConfig()));
    await postConfig(app, '{"not": "a config"');

    expect(response.status).toBe(200);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).not.toContain(SENTINEL);
    }
  });
});

async function postGenerate(app: ReturnType<typeof createApp>, body: string) {
  return app.request('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('F-15 AC-022 generation without ANTHROPIC_API_KEY', () => {
  it('F-15 AC-022 with no key POST /generate gives 503 with an error and the client factory is never called', async () => {
    const { factory, keys, calls } = fakeFactory();
    const response = await postGenerate(
      createApp(buildDeps(settingsWith(undefined), factory, TEMPLATES, () => undefined)),
      JSON.stringify(validConfig()),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toHaveProperty('error');
    expect(keys).toEqual([]);
    expect(calls).toEqual([]);
  });
});

describe('F-15 AC-023 the generation model is the generator model setting', () => {
  it('F-15 AC-023 every generation call names settings.generatorModel', async () => {
    const { factory, calls } = fakeFactory();
    const response = await postGenerate(
      createApp(buildDeps(settingsWith(SENTINEL), factory, TEMPLATES, () => undefined)),
      JSON.stringify(validConfig()),
    );

    expect(response.status).toBe(502);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.body.model).toBe('generator-under-test');
    }
  });
});

describe('F-15 AC-024 generation keeps the key server-side', () => {
  it('F-15 AC-024 the sentinel key appears in no generate response or log line, even when the provider error carries it', async () => {
    const { factory, keys } = fakeFactory({ throwsSentinel: true });
    const lines: string[] = [];
    const app = createApp(buildDeps(settingsWith(SENTINEL), factory, TEMPLATES, (line) => lines.push(line)));
    const responses = [
      await postGenerate(app, JSON.stringify(validConfig())),
      await postGenerate(app, '{"not": "a config"'),
      await app.request('/generate', { method: 'GET' }),
    ];

    const texts = await Promise.all(responses.map((response) => response.text()));
    expect(keys).toEqual([SENTINEL]);
    expect(responses.map((response) => response.status)).toEqual([502, 400, 405]);
    for (const text of texts) {
      expect(text).not.toContain(SENTINEL);
    }
    expect(lines).toContain('route=/generate event=provider-error status=502');
    for (const line of lines) {
      expect(line).not.toContain(SENTINEL);
    }
  });
});
