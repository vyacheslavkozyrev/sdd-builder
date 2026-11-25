import type Anthropic from '@anthropic-ai/sdk';
import { pipeline } from '@sddbuilder/core';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { ReviewClient } from '../src/review/anthropic.js';
import type { Settings } from '../src/settings.js';
import { buildAnalyzeDeps } from '../src/wiring.js';

// A sentinel key stands in for a real one. No test reaches the network: the client is a fake.
const SENTINEL = 'sk-sentinel-F14-key-000';

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
    const deps = buildAnalyzeDeps(settingsWith(undefined), factory, (line) => lines.push(line));
    const response = await postConfig(createApp(deps), JSON.stringify(validConfig()));

    expect(keys).toEqual([]);
    expect(response.status).toBe(200);
    const reply = (await response.json()) as { review: { status: string } };
    expect(reply.review.status).toBe('failed');
  });

  it('F-14 AC-023 the startup log line names ANTHROPIC_API_KEY as missing', () => {
    const lines: string[] = [];
    buildAnalyzeDeps(settingsWith(undefined), fakeFactory().factory, (line) => lines.push(line));

    expect(lines).toEqual(['startup review=off missing=ANTHROPIC_API_KEY']);
    expect(lines.join('\n')).toContain('ANTHROPIC_API_KEY');
  });
});

describe('F-14 AC-024 the key goes to the client factory only', () => {
  it('F-14 AC-024 with a key the factory is given the key once and the model calls the client with the analyzer model', async () => {
    const { factory, keys, calls } = fakeFactory();
    const deps = buildAnalyzeDeps(settingsWith(SENTINEL), factory, () => undefined);
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
    const app = createApp(buildAnalyzeDeps(settingsWith(SENTINEL), factory, () => undefined));
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
    const deps = buildAnalyzeDeps(settingsWith(SENTINEL), factory, (line) => lines.push(line));
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
