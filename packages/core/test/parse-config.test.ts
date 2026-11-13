import { describe, expect, it } from 'vitest';
import { parseProjectConfig, type ConfigProblem } from '../src/parse-config.js';
import { baseConfig } from './fixtures.js';

/** A valid submission as untrusted input: a JSON round trip gives an `unknown`, as a request body does. */
function submission(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...(JSON.parse(JSON.stringify(baseConfig())) as Record<string, unknown>), ...overrides };
}

/** A valid submission with one field removed. */
function withoutField(field: string): Record<string, unknown> {
  const value = submission();
  delete value[field];
  return value;
}

/** The problems of a rejected submission, or a failure if it was accepted. */
function problemsOf(value: unknown): ConfigProblem[] {
  const result = parseProjectConfig(value);
  if (result.ok) {
    throw new Error('expected the submission to be rejected');
  }
  return result.problems;
}

describe('F-07 AC-003 top-level config checks', () => {
  it('F-07 AC-003 accepts a valid top level and returns the submitted values', () => {
    expect(parseProjectConfig(submission())).toEqual({ ok: true, config: submission() });
  });

  it.each(['claude', 'cursor', 'copilot'])('F-07 AC-003 accepts the known target %s', (target) => {
    expect(parseProjectConfig(submission({ targets: [target] }))).toMatchObject({ ok: true });
  });

  const rows: { name: string; value: unknown; expected: ConfigProblem[] }[] = [
    {
      name: 'a missing name is a problem naming the name field',
      value: withoutField('name'),
      expected: [{ path: 'name', reason: 'is required' }],
    },
    {
      name: 'a missing schemaVersion is a problem naming the schemaVersion field',
      value: withoutField('schemaVersion'),
      expected: [{ path: 'schemaVersion', reason: 'is required' }],
    },
    {
      name: 'a missing targets list is a problem naming the targets field',
      value: withoutField('targets'),
      expected: [{ path: 'targets', reason: 'is required' }],
    },
    {
      name: 'a stack that is not an object is a problem naming the stack field',
      value: submission({ stack: 'node' }),
      expected: [{ path: 'stack', reason: 'must be an object' }],
    },
    {
      name: 'code rules that are not an array are a problem naming the codeRules field',
      value: submission({ codeRules: 'rule' }),
      expected: [{ path: 'codeRules', reason: 'must be an array' }],
    },
    {
      name: 'a name that is not a string is a problem naming the name field',
      value: submission({ name: 42 }),
      expected: [{ path: 'name', reason: 'must be a string' }],
    },
    {
      name: 'a schemaVersion of 2 is a problem',
      value: submission({ schemaVersion: 2 }),
      expected: [{ path: 'schemaVersion', reason: 'must be 1' }],
    },
    {
      name: 'a schemaVersion given as the string "1" is a problem',
      value: submission({ schemaVersion: '1' }),
      expected: [{ path: 'schemaVersion', reason: 'must be 1' }],
    },
    {
      name: 'an unknown target names its index and gives no value',
      value: submission({ targets: ['claude', 'gemini'] }),
      expected: [{ path: 'targets[1]', reason: 'must be one of claude, cursor, copilot' }],
    },
    {
      name: 'a target that is not a string is a problem',
      value: submission({ targets: [7] }),
      expected: [{ path: 'targets[0]', reason: 'must be one of claude, cursor, copilot' }],
    },
    {
      name: 'targets that is not an array is a problem',
      value: submission({ targets: 'claude' }),
      expected: [{ path: 'targets', reason: 'must be an array' }],
    },
    {
      name: 'a code rule that is not a string names its index',
      value: submission({ codeRules: ['ok', 3] }),
      expected: [{ path: 'codeRules[1]', reason: 'must be a string' }],
    },
  ];

  it.each(rows)('F-07 AC-003 $name', ({ value, expected }) => {
    expect(problemsOf(value)).toEqual(expected);
  });

  it('F-07 AC-003 collects every problem, not only the first', () => {
    expect(problemsOf(submission({ schemaVersion: 3, name: null, targets: ['x'] }))).toEqual([
      { path: 'schemaVersion', reason: 'must be 1' },
      { path: 'name', reason: 'must be a string' },
      { path: 'targets[0]', reason: 'must be one of claude, cursor, copilot' },
    ]);
  });

  it('F-07 AC-003 a problem never contains the submitted value', () => {
    const secret = 'sk-test-SECRET-VALUE-123';
    const problems = problemsOf(submission({ name: secret, targets: [secret] }));
    expect(JSON.stringify(problems)).not.toContain(secret);
  });

  it.each([
    { name: 'null', value: null },
    { name: 'an array', value: [] },
    { name: 'a string', value: 'config' },
  ])('F-07 AC-003 a body that is $name is rejected at the top path', ({ value }) => {
    expect(problemsOf(value)).toEqual([{ path: '$', reason: 'must be a JSON object' }]);
  });
});

/** A valid submission whose first workflow has `changes` applied over it. */
function withFirstWorkflow(changes: Record<string, unknown>): Record<string, unknown> {
  const value = submission();
  const [first, ...rest] = value['workflows'] as Record<string, unknown>[];
  return { ...value, workflows: [{ ...first, ...changes }, ...rest] };
}

/** A valid submission whose first workflow has one field removed. */
function withoutWorkflowField(field: string): Record<string, unknown> {
  const value = withFirstWorkflow({});
  const [first, ...rest] = value['workflows'] as Record<string, unknown>[];
  const workflow = { ...first };
  delete workflow[field];
  return { ...value, workflows: [workflow, ...rest] };
}

describe('F-07 AC-003 workflow checks', () => {
  it('F-07 AC-003 accepts workflows whose steps are well formed', () => {
    expect(parseProjectConfig(withFirstWorkflow({ steps: [{ stepId: 'design', enabled: false }] }))).toMatchObject({
      ok: true,
    });
  });

  const rows: { name: string; value: unknown; expected: ConfigProblem[] }[] = [
    {
      name: 'a step enabled that is not a boolean names the step path',
      value: withFirstWorkflow({ steps: [{ stepId: 'design', enabled: 'yes' }] }),
      expected: [{ path: 'workflows[0].steps[0].enabled', reason: 'must be a boolean' }],
    },
    {
      name: 'a step enabled that is missing is required',
      value: withFirstWorkflow({ steps: [{ stepId: 'design' }] }),
      expected: [{ path: 'workflows[0].steps[0].enabled', reason: 'is required' }],
    },
    {
      name: 'a step enabled that is 1 is not a boolean',
      value: withFirstWorkflow({ steps: [{ stepId: 'design', enabled: 1 }] }),
      expected: [{ path: 'workflows[0].steps[0].enabled', reason: 'must be a boolean' }],
    },
    {
      name: 'a bad step names its own index',
      value: withFirstWorkflow({
        steps: [
          { stepId: 'design', enabled: true },
          { stepId: 'build', enabled: 'no' },
        ],
      }),
      expected: [{ path: 'workflows[0].steps[1].enabled', reason: 'must be a boolean' }],
    },
    {
      name: 'a step that is not an object is a problem at its path',
      value: withFirstWorkflow({ steps: ['design'] }),
      expected: [{ path: 'workflows[0].steps[0]', reason: 'must be an object' }],
    },
    {
      name: 'a stepId that is not a string is a problem',
      value: withFirstWorkflow({ steps: [{ stepId: 7, enabled: true }] }),
      expected: [{ path: 'workflows[0].steps[0].stepId', reason: 'must be a string' }],
    },
    {
      name: 'a step without stepId is required',
      value: withFirstWorkflow({ steps: [{ enabled: true }] }),
      expected: [{ path: 'workflows[0].steps[0].stepId', reason: 'is required' }],
    },
    {
      name: 'workflow steps that are not an array are a problem',
      value: withFirstWorkflow({ steps: 'design' }),
      expected: [{ path: 'workflows[0].steps', reason: 'must be an array' }],
    },
    {
      name: 'a workflow without steps is required',
      value: withoutWorkflowField('steps'),
      expected: [{ path: 'workflows[0].steps', reason: 'is required' }],
    },
    {
      name: 'a workflow without an id is required',
      value: withoutWorkflowField('id'),
      expected: [{ path: 'workflows[0].id', reason: 'is required' }],
    },
    {
      name: 'a workflow id that is not a string is a problem',
      value: withFirstWorkflow({ id: 3 }),
      expected: [{ path: 'workflows[0].id', reason: 'must be a string' }],
    },
    {
      name: 'a workflow without a name is required',
      value: withoutWorkflowField('name'),
      expected: [{ path: 'workflows[0].name', reason: 'is required' }],
    },
    {
      name: 'a workflow name that is not a string is a problem',
      value: withFirstWorkflow({ name: null }),
      expected: [{ path: 'workflows[0].name', reason: 'must be a string' }],
    },
    {
      name: 'a workflow without a scope is required',
      value: withoutWorkflowField('scope'),
      expected: [{ path: 'workflows[0].scope', reason: 'is required' }],
    },
    {
      name: 'an unknown scope is a problem listing the scopes',
      value: withFirstWorkflow({ scope: 'epic' }),
      expected: [{ path: 'workflows[0].scope', reason: 'must be one of project, feature, task' }],
    },
    {
      name: 'an iterationSource that is not a string is a problem',
      value: withFirstWorkflow({ iterationSource: ['plan.md'] }),
      expected: [{ path: 'workflows[0].iterationSource', reason: 'must be a string' }],
    },
    {
      name: 'a workflow without iterationSource is required',
      value: withoutWorkflowField('iterationSource'),
      expected: [{ path: 'workflows[0].iterationSource', reason: 'is required' }],
    },
    {
      name: 'a workflow enabled that is the string "true" is a problem',
      value: withFirstWorkflow({ enabled: 'true' }),
      expected: [{ path: 'workflows[0].enabled', reason: 'must be a boolean' }],
    },
    {
      name: 'a workflow without enabled is required',
      value: withoutWorkflowField('enabled'),
      expected: [{ path: 'workflows[0].enabled', reason: 'is required' }],
    },
    {
      name: 'a workflow that is not an object is a problem at its index',
      value: submission({ workflows: ['design'] }),
      expected: [{ path: 'workflows[0]', reason: 'must be an object' }],
    },
    {
      name: 'workflows that are not an array are a problem',
      value: submission({ workflows: 'design' }),
      expected: [{ path: 'workflows', reason: 'must be an array' }],
    },
    {
      name: 'a missing workflows list is required',
      value: withoutField('workflows'),
      expected: [{ path: 'workflows', reason: 'is required' }],
    },
  ];

  it.each(rows)('F-07 AC-003 $name', ({ value, expected }) => {
    expect(problemsOf(value)).toEqual(expected);
  });

  it('F-07 AC-003 a workflow problem never contains the submitted value', () => {
    const secret = 'sk-test-SECRET-VALUE-456';
    const problems = problemsOf(withFirstWorkflow({ name: secret, steps: [{ stepId: secret, enabled: secret }] }));
    expect(JSON.stringify(problems)).not.toContain(secret);
  });
});

/** A copy of `base` with `changes` applied and the `removed` keys deleted. */
function objectWith(
  base: Record<string, unknown>,
  changes: Record<string, unknown>,
  removed: string[] = [],
): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...base, ...changes };
  for (const key of removed) {
    delete copy[key];
  }
  return copy;
}

/** A valid gate as untrusted input. */
function validGate(): Record<string, unknown> {
  return { id: 'review-gate', type: 'review', required: true };
}

/** A valid condition: a review gate, a pass route to the next step and a fail route that stops. */
function validCondition(): Record<string, unknown> {
  return { id: 'review', afterStepId: 'design', gate: validGate(), pass: { kind: 'next' }, fail: { kind: 'stop' } };
}

/** A valid submission whose first workflow has one condition: `changes` applied, `removed` keys deleted. */
function withCondition(changes: Record<string, unknown>, removed: string[] = []): Record<string, unknown> {
  return withFirstWorkflow({ conditions: [objectWith(validCondition(), changes, removed)] });
}

describe('F-07 AC-003 workflow description and condition checks', () => {
  it('F-07 AC-003 accepts a valid condition and returns the submitted values', () => {
    expect(parseProjectConfig(withCondition({}))).toEqual({ ok: true, config: withCondition({}) });
  });

  it.each([
    { name: 'a fail route that is absent', value: withCondition({}, ['fail']) },
    { name: 'a pass route to a named step', value: withCondition({ pass: { kind: 'step', stepId: 'build' } }) },
    { name: 'a pass route that stops', value: withCondition({ pass: { kind: 'stop' } }) },
    { name: 'a fail route to a named step', value: withCondition({ fail: { kind: 'step', stepId: 'design' } }) },
    {
      name: 'a threshold and a round limit',
      value: withCondition({
        gate: objectWith(validGate(), { type: 'diff-size', threshold: 400 }),
        roundLimit: 3,
      }),
    },
    { name: 'a gate type checks', value: withCondition({ gate: objectWith(validGate(), { type: 'checks' }) }) },
    { name: 'a gate type approval', value: withCondition({ gate: objectWith(validGate(), { type: 'approval' }) }) },
    { name: 'a gate type diff-size', value: withCondition({ gate: objectWith(validGate(), { type: 'diff-size' }) }) },
  ])('F-07 AC-003 accepts a condition with $name', ({ value }) => {
    expect(parseProjectConfig(value)).toMatchObject({ ok: true });
  });

  it('F-07 AC-003 an absent fail route is kept absent, not turned into a route', () => {
    const result = parseProjectConfig(withCondition({}, ['fail']));
    if (!result.ok) {
      throw new Error('expected the submission to be accepted');
    }
    expect(result.config.workflows[0]?.conditions[0]).not.toHaveProperty('fail');
  });

  it.each([
    {
      name: 'a workflow without conditions is required',
      value: withoutWorkflowField('conditions'),
      expected: [{ path: 'workflows[0].conditions', reason: 'is required' }],
    },
    {
      name: 'conditions that are not an array are a problem',
      value: withFirstWorkflow({ conditions: 'review' }),
      expected: [{ path: 'workflows[0].conditions', reason: 'must be an array' }],
    },
    {
      name: 'a condition that is not an object names its index',
      value: withFirstWorkflow({ conditions: ['review'] }),
      expected: [{ path: 'workflows[0].conditions[0]', reason: 'must be an object' }],
    },
    {
      name: 'a condition without an id is required',
      value: withCondition({}, ['id']),
      expected: [{ path: 'workflows[0].conditions[0].id', reason: 'is required' }],
    },
    {
      name: 'a condition id that is not a string is a problem',
      value: withCondition({ id: 4 }),
      expected: [{ path: 'workflows[0].conditions[0].id', reason: 'must be a string' }],
    },
    {
      name: 'a condition without afterStepId is required',
      value: withCondition({}, ['afterStepId']),
      expected: [{ path: 'workflows[0].conditions[0].afterStepId', reason: 'is required' }],
    },
    {
      name: 'a condition afterStepId that is not a string is a problem',
      value: withCondition({ afterStepId: null }),
      expected: [{ path: 'workflows[0].conditions[0].afterStepId', reason: 'must be a string' }],
    },
    {
      name: 'a condition without a gate is required',
      value: withCondition({}, ['gate']),
      expected: [{ path: 'workflows[0].conditions[0].gate', reason: 'is required' }],
    },
    {
      name: 'a gate that is not an object is a problem at the gate path',
      value: withCondition({ gate: 'review' }),
      expected: [{ path: 'workflows[0].conditions[0].gate', reason: 'must be an object' }],
    },
    {
      name: 'a gate type outside the fixed set lists the allowed types',
      value: withCondition({ gate: objectWith(validGate(), { type: 'lint' }) }),
      expected: [
        {
          path: 'workflows[0].conditions[0].gate.type',
          reason: 'must be one of approval, checks, review, diff-size',
        },
      ],
    },
    {
      name: 'a gate without a type is required',
      value: withCondition({ gate: objectWith(validGate(), {}, ['type']) }),
      expected: [{ path: 'workflows[0].conditions[0].gate.type', reason: 'is required' }],
    },
    {
      name: 'a gate id that is not a string is a problem',
      value: withCondition({ gate: objectWith(validGate(), { id: true }) }),
      expected: [{ path: 'workflows[0].conditions[0].gate.id', reason: 'must be a string' }],
    },
    {
      name: 'a gate threshold that is a string is a problem',
      value: withCondition({ gate: objectWith(validGate(), { threshold: '400' }) }),
      expected: [{ path: 'workflows[0].conditions[0].gate.threshold', reason: 'must be a number' }],
    },
    {
      name: 'a gate required that is the string "true" is a problem',
      value: withCondition({ gate: objectWith(validGate(), { required: 'true' }) }),
      expected: [{ path: 'workflows[0].conditions[0].gate.required', reason: 'must be a boolean' }],
    },
    {
      name: 'a gate without required is required',
      value: withCondition({ gate: objectWith(validGate(), {}, ['required']) }),
      expected: [{ path: 'workflows[0].conditions[0].gate.required', reason: 'is required' }],
    },
    {
      name: 'a condition without a pass route is required',
      value: withCondition({}, ['pass']),
      expected: [{ path: 'workflows[0].conditions[0].pass', reason: 'is required' }],
    },
    {
      name: 'a pass route that is null is a problem',
      value: withCondition({ pass: null }),
      expected: [{ path: 'workflows[0].conditions[0].pass', reason: 'must be an object' }],
    },
    {
      name: 'a pass route with an unknown kind lists the kinds',
      value: withCondition({ pass: { kind: 'loop' } }),
      expected: [{ path: 'workflows[0].conditions[0].pass.kind', reason: 'must be one of next, step, stop' }],
    },
    {
      name: 'a pass route of kind step without stepId is required',
      value: withCondition({ pass: { kind: 'step' } }),
      expected: [{ path: 'workflows[0].conditions[0].pass.stepId', reason: 'is required' }],
    },
    {
      name: 'a fail route of kind step whose stepId is not a string is a problem',
      value: withCondition({ fail: { kind: 'step', stepId: 3 } }),
      expected: [{ path: 'workflows[0].conditions[0].fail.stepId', reason: 'must be a string' }],
    },
    {
      name: 'a fail route that is null is refused: only an absent route is unwired',
      value: withCondition({ fail: null }),
      expected: [{ path: 'workflows[0].conditions[0].fail', reason: 'must be an object' }],
    },
    {
      name: 'a fail route that is a string is a problem',
      value: withCondition({ fail: 'stop' }),
      expected: [{ path: 'workflows[0].conditions[0].fail', reason: 'must be an object' }],
    },
    {
      name: 'a fail route with an unknown kind lists the kinds',
      value: withCondition({ fail: { kind: 'retry' } }),
      expected: [{ path: 'workflows[0].conditions[0].fail.kind', reason: 'must be one of next, step, stop' }],
    },
    {
      name: 'a roundLimit that is a string is a problem',
      value: withCondition({ roundLimit: '3' }),
      expected: [{ path: 'workflows[0].conditions[0].roundLimit', reason: 'must be a number' }],
    },
    {
      name: 'a workflow description that is not a string is a problem',
      value: withFirstWorkflow({ description: 3 }),
      expected: [{ path: 'workflows[0].description', reason: 'must be a string' }],
    },
    {
      name: 'a workflow description that is null is a problem, not an absent description',
      value: withFirstWorkflow({ description: null }),
      expected: [{ path: 'workflows[0].description', reason: 'must be a string' }],
    },
  ])('F-07 AC-003 $name', ({ value, expected }) => {
    expect(problemsOf(value)).toEqual(expected);
  });

  it('F-07 AC-003 accepts a workflow description when it is a string', () => {
    expect(parseProjectConfig(withFirstWorkflow({ description: 'Designs the feature.' }))).toMatchObject({ ok: true });
  });

  it('F-07 AC-003 accepts a workflow without a description', () => {
    expect(parseProjectConfig(withoutWorkflowField('description'))).toMatchObject({ ok: true });
  });

  it('F-07 AC-003 a condition problem never contains the submitted value', () => {
    const secret = 'sk-test-SECRET-VALUE-789';
    const problems = problemsOf(
      withCondition({
        id: secret,
        afterStepId: secret,
        gate: objectWith(validGate(), { type: secret, threshold: secret }),
        pass: { kind: secret, stepId: secret },
        fail: { kind: secret },
        roundLimit: secret,
      }),
    );
    expect(problems.length).toBeGreaterThan(0);
    expect(JSON.stringify(problems)).not.toContain(secret);
  });
});
