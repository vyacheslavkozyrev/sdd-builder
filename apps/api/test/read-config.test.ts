import { describe, expect, it } from 'vitest';
import type { ProjectConfig } from '@sddbuilder/core';
import { readConfig } from '../src/http/read-config.js';
import { errorBody } from '../src/http/errors.js';

const URL = 'http://localhost/analyze';

function sampleConfig(): ProjectConfig {
  return {
    schemaVersion: 1,
    name: 'Sample Project',
    idea: 'A tool that turns a product idea into a spec-driven project framework.',
    stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
    architecture: {
      style: 'layered',
      modules: [
        { name: 'core', layer: 0, responsibility: 'Domain rules', dependsOn: [] },
        { name: 'api', layer: 1, responsibility: 'HTTP', dependsOn: ['core'] },
      ],
      notes: 'Core has no I/O.',
    },
    codeRules: ['Validate input at the boundary.'],
    testRules: ['Use Vitest for unit tests.'],
    customSteps: [],
    workflows: [
      {
        id: 'implement-cycle',
        name: 'Implement',
        scope: 'task',
        iterationSource: 'plan.md',
        enabled: true,
        steps: [
          { stepId: 'implement', enabled: true },
          { stepId: 'unit-tests', enabled: true },
        ],
        conditions: [
          {
            id: 'tests-pass',
            afterStepId: 'unit-tests',
            gate: { id: 'tests-pass', type: 'checks', required: true },
            pass: { kind: 'next' },
            fail: { kind: 'step', stepId: 'implement' },
            roundLimit: 3,
          },
        ],
      },
    ],
    connections: [{ id: 'c1', from: 'specify', to: 'implement-cycle', artifact: 'plan.md' }],
    targets: ['claude'],
  };
}

/** A plain-object copy of the valid config, so a case can break one field. */
function asRecord(config: ProjectConfig): Record<string, unknown> {
  return JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
}

function jsonRequest(body: string): Request {
  return new Request(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

describe('F-07 AC-002 a body that is not JSON', () => {
  it.each([
    ['empty body', ''],
    ['truncated object', '{"name": '],
    ['plain text', 'not json at all'],
  ])('F-07 AC-002 returns 400 naming invalid JSON for %s', async (_label, body) => {
    const result = await readConfig(jsonRequest(body));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/not valid JSON/);
    expect(result.body.problems).toBeUndefined();
  });

  it('F-07 AC-002 returns 400 when the body was already read and cannot be read again', async () => {
    const request = jsonRequest(JSON.stringify(sampleConfig()));
    await request.text();

    const result = await readConfig(request);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('request body could not be read');
  });
});

describe('F-07 AC-003 a JSON body that is not a ProjectConfig', () => {
  it.each([
    ['not an object: an array', '[1, 2, 3]'],
    ['not an object: a string', '"a project"'],
    ['not an object: a number', '42'],
    ['not an object: null', 'null'],
  ])('F-07 AC-003 returns 400 with a problem list for %s', async (_label, body) => {
    const result = await readConfig(jsonRequest(body));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.error).toBe('project config is invalid');
    expect(result.body.problems?.length).toBeGreaterThan(0);
  });

  it.each([
    ['missing name', (c: Record<string, unknown>) => delete c['name'], 'name: is required'],
    [
      'schemaVersion other than 1',
      (c: Record<string, unknown>) => (c['schemaVersion'] = 2),
      'schemaVersion: must be 1',
    ],
    [
      'unknown target tool',
      (c: Record<string, unknown>) => (c['targets'] = ['unknown-tool']),
      'targets[0]: must be one of claude, cursor, copilot',
    ],
    [
      'step enabled is not a boolean',
      (c: Record<string, unknown>) => {
        const workflows = c['workflows'] as Record<string, unknown>[];
        const steps = workflows[0]?.['steps'] as Record<string, unknown>[];
        steps[0]!['enabled'] = 'yes';
      },
      'workflows[0].steps[0].enabled: must be a boolean',
    ],
    [
      'workflow steps is not an array',
      (c: Record<string, unknown>) => {
        const workflows = c['workflows'] as Record<string, unknown>[];
        workflows[0]!['steps'] = 'implement';
      },
      'workflows[0].steps: must be an array',
    ],
  ])('F-07 AC-003 lists the problem with its path for %s', async (_label, breakField, expectedProblem) => {
    const record = asRecord(sampleConfig());
    breakField(record);

    const result = await readConfig(jsonRequest(JSON.stringify(record)));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.body.problems).toEqual([expectedProblem]);
  });

  it('F-07 AC-003 lists every problem, one per field path', async () => {
    const record = asRecord(sampleConfig());
    delete record['name'];
    record['schemaVersion'] = 2;
    record['targets'] = ['unknown-tool'];

    const result = await readConfig(jsonRequest(JSON.stringify(record)));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.body.problems).toEqual([
      'schemaVersion: must be 1',
      'name: is required',
      'targets[0]: must be one of claude, cursor, copilot',
    ]);
  });

  it('F-07 AC-003 never puts a submitted value in a problem', async () => {
    const secret = 'SUBMITTED-SECRET-7f3a';
    const record = asRecord(sampleConfig());
    record['schemaVersion'] = secret;
    record['targets'] = [secret];
    const workflows = record['workflows'] as Record<string, unknown>[];
    workflows[0]!['steps'] = secret;

    const result = await readConfig(jsonRequest(JSON.stringify(record)));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const problems = result.body.problems ?? [];
    expect(problems.length).toBeGreaterThan(0);
    for (const problem of problems) {
      expect(problem).not.toContain(secret);
    }
    expect(JSON.stringify(result.body)).not.toContain(secret);
  });
});

describe('F-07 AC-003 a valid config', () => {
  it('F-07 AC-003 returns the config unchanged when the body is a valid ProjectConfig', async () => {
    const config = sampleConfig();

    const result = await readConfig(jsonRequest(JSON.stringify(config)));

    expect(result).toEqual({ ok: true, config });
  });
});

describe('F-07 AC-026 error body shape', () => {
  it.each([
    ['no problems', 'request body is not valid JSON', [], { error: 'request body is not valid JSON' }],
    ['one problem', 'project config is invalid', ['name: is required'], {
      error: 'project config is invalid',
      problems: ['name: is required'],
    }],
  ])('F-07 AC-026 builds the one error shape for %s', (_label, error, problems, expected) => {
    const body = errorBody(error, problems);

    expect(body).toEqual(expected);
    expect(typeof body.error).toBe('string');
    expect(Object.keys(body).every((key) => key === 'error' || key === 'problems')).toBe(true);
  });

  it('F-07 AC-026 leaves out problems when the list is empty', () => {
    expect('problems' in errorBody('request body could not be read')).toBe(false);
  });

  it('F-07 AC-026 carries no stack trace or server file path in a read error', async () => {
    const result = await readConfig(jsonRequest('{ broken'));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const text = JSON.stringify(result.body);
    expect(text).not.toMatch(/\bat .+\(.+\)/);
    expect(text).not.toMatch(/\/Users\/|\.ts:\d+/);
  });
});
