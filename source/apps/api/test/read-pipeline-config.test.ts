import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readPipelineConfig } from '../src/http/read-pipeline-config.js';

const ENDPOINT = 'http://localhost/analyze';

/** The default pipeline (templates/pipeline/default.json), read as the request body a client would send. */
const DEFAULT_PIPELINE_JSON = readFileSync(
  fileURLToPath(new URL('../../../templates/pipeline/default.json', import.meta.url)),
  'utf8',
);

function jsonRequest(body: string): Request {
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

/** A plain-object copy of the default pipeline body, so a case can break one field. */
function defaultRecord(): Record<string, unknown> {
  return JSON.parse(DEFAULT_PIPELINE_JSON) as Record<string, unknown>;
}

describe('F-04 AC-020 a valid schemaVersion 2 pipeline body', () => {
  it('F-04 AC-020 reads the default pipeline config as a valid body', async () => {
    const result = await readPipelineConfig(jsonRequest(DEFAULT_PIPELINE_JSON));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.schemaVersion).toBe(2);
    expect(result.config.pipeline.blocks.length).toBeGreaterThan(0);
  });
});

describe('F-04 AC-020 a body that fails the pipeline parse', () => {
  it('F-04 AC-020 returns 400 with the problem list and the fixed error message', async () => {
    const record = defaultRecord();
    record['schemaVersion'] = 3;

    const result = await readPipelineConfig(jsonRequest(JSON.stringify(record)));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('project config is invalid');
    expect(result.body.problems).toEqual(['schemaVersion: must be 2']);
  });

  it('F-04 AC-020 names the path of a nested problem as <path>: <reason>', async () => {
    const record = defaultRecord();
    record['stack'] = 'TypeScript';

    const result = await readPipelineConfig(jsonRequest(JSON.stringify(record)));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.problems?.length).toBeGreaterThan(0);
    for (const problem of result.body.problems ?? []) {
      expect(problem).toMatch(/^[^:]+: .+/);
    }
    expect(result.body.problems).toContainEqual(expect.stringMatching(/^stack: /));
  });

  it('F-04 AC-020 names a non-object body at the root as (root)', async () => {
    const result = await readPipelineConfig(jsonRequest('[]'));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('project config is invalid');
    expect(result.body.problems).toEqual(['(root): must be an object']);
  });

  it('F-04 AC-020 never puts a submitted value in a problem', async () => {
    const secret = 'SUBMITTED-SECRET-b81c';
    const record = defaultRecord();
    record['schemaVersion'] = secret;
    record['stack'] = secret;
    record['pipeline'] = secret;

    const result = await readPipelineConfig(jsonRequest(JSON.stringify(record)));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const problems = result.body.problems ?? [];
    expect(problems.length).toBeGreaterThan(0);
    for (const problem of problems) {
      expect(problem).not.toContain(secret);
    }
    expect(JSON.stringify(result.body)).not.toContain(secret);
  });

  it('F-04 AC-020 refuses a flat schemaVersion 1 body with 400', async () => {
    const flat = { schemaVersion: 1, name: 'Flat', idea: 'A flat config.' };

    const result = await readPipelineConfig(jsonRequest(JSON.stringify(flat)));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('project config is invalid');
    expect(result.body.problems).toContain('schemaVersion: must be 2');
  });

  it('F-04 AC-020 refuses the default flat config shape with schemaVersion 1 and no pipeline', async () => {
    const flat: Record<string, unknown> = { ...defaultRecord(), schemaVersion: 1 };
    delete flat['pipeline'];

    const result = await readPipelineConfig(jsonRequest(JSON.stringify(flat)));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.problems).toContain('schemaVersion: must be 2');
    expect(result.body.problems).toContain('pipeline: is required');
  });
});

describe('F-04 AC-020 a body that is not JSON', () => {
  it.each([
    ['empty body', ''],
    ['truncated object', '{"name": '],
    ['plain text', 'not json at all'],
  ])('F-04 AC-020 returns 400 naming invalid JSON for %s', async (_label, body) => {
    const result = await readPipelineConfig(jsonRequest(body));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('request body is not valid JSON');
    expect(result.body.problems).toBeUndefined();
  });

  it('F-04 AC-020 returns 400 when the body was already read and cannot be read again', async () => {
    const request = jsonRequest(DEFAULT_PIPELINE_JSON);
    await request.text();

    const result = await readPipelineConfig(request);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('request body could not be read');
  });
});
