import { pipeline } from '@sddbuilder/core';
import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../src/analyze.js';
import { createApp, type AppDeps } from '../src/app.js';

// A fixed sentinel that stands in for brief content. It must never appear in a 400 reply.
const SENTINEL = 'SENTINEL-IDEA-5c1d02';

// A config the parser accepts. Each case changes one part of it.
function validConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'Project',
    idea: 'A small web app',
    architecture: 'A single service',
    stack: { language: 'TypeScript', framework: 'React' },
    rules: [],
    pipeline: pipeline.defaultPipeline,
    ...overrides,
  };
}

// An analysis fake that counts its calls. A body that is refused must never reach it.
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

async function post(body: string) {
  const { deps, calls } = fakeDeps();
  const response = await createApp(deps).request('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return { response, text: await response.text(), calls };
}

const refusals: { label: string; body: string; error: string; problems: string[] | null }[] = [
  { label: 'an empty body', body: '', error: 'The request body is empty', problems: null },
  { label: 'a lone brace', body: '{', error: 'The request body is not JSON', problems: null },
  {
    label: 'a JSON array',
    body: '[]',
    error: 'The project config is not valid',
    problems: ['root: must be an object, got a list'],
  },
  {
    label: 'a body with several missing keys',
    body: '{"schemaVersion":2}',
    error: 'The project config is not valid',
    problems: ['rules: is required', 'pipeline: is required'],
  },
  {
    label: 'an unknown key, named by its path',
    body: JSON.stringify(validConfig({ extra: 'not a known key' })),
    error: 'The project config is not valid',
    problems: ['extra: is not a known key'],
  },
  {
    label: 'a flat schemaVersion 1 body',
    body: '{"schemaVersion":1,"name":"Project","idea":"A small web app"}',
    error: 'The project config is not valid',
    problems: [
      'schemaVersion: must be the number 2, got a number',
      'rules: is required',
      'pipeline: is required',
    ],
  },
];

describe('F-14 analyze body', () => {
  it.each(refusals)('F-14 AC-005 AC-006 AC-007 AC-008 refuses $label with 400 and no model call', async ({
    body,
    error,
    problems,
  }) => {
    const { response, text, calls } = await post(body);
    const reply: unknown = JSON.parse(text);

    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(reply).toEqual(problems === null ? { error } : { error, problems });
    expect(calls.analyze).toBe(0);
  });

  it('F-14 AC-006 does not refuse a config the parser accepts', async () => {
    const { response } = await post(JSON.stringify(validConfig()));

    expect(response.status).not.toBe(400);
  });

  it('F-14 AC-009 a sentinel idea in a body that is not JSON appears in no 400 reply', async () => {
    const { response, text, calls } = await post(`{"idea": "${SENTINEL}`);

    expect(response.status).toBe(400);
    expect(text).not.toContain(SENTINEL);
    expect(calls.analyze).toBe(0);
  });

  it('F-14 AC-009 a sentinel idea appears in no 400 reply, including one with a parse problem elsewhere', async () => {
    const { response, text, calls } = await post(JSON.stringify(validConfig({ idea: SENTINEL, name: 42 })));

    expect(response.status).toBe(400);
    expect(text).toContain('name:');
    expect(text).not.toContain(SENTINEL);
    expect(calls.analyze).toBe(0);
  });

  it('F-14 AC-008 an unknown key value is not repeated in the reply', async () => {
    const { text } = await post(JSON.stringify(validConfig({ extra: SENTINEL })));

    expect(text).toContain('extra:');
    expect(text).not.toContain(SENTINEL);
  });
});
