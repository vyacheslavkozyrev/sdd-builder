import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readFlow } from '../../src/pipeline/parse/flow.js';

const FLOW = 'pipeline.flows.0';
const validBlocks = [
  { id: 'start', kind: 'start', next: 'end' },
  { id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
];
const validFlow = {
  id: 'plan',
  name: 'Plan',
  body: 'Plans the work.',
  arguments: [],
  artifacts: [],
  approval: false,
  blocks: validBlocks,
};

function readF(value: unknown, path = FLOW, index = 0) {
  const problems = createProblemCollector();
  const flow = readFlow(value, path, problems, index);
  return { flow, problems: problems.list() };
}

function refusedAt(value: unknown, path: string, message: string) {
  const result = readF(value);
  expect(result.flow).toBeUndefined();
  expect(result.problems).toContainEqual({ path, message });
}

describe('F-02 AC-020 a flow requires id, name, body, arguments, artifacts, approval and blocks', () => {
  it('accepts a flow with every required key', () => {
    expect(readF(validFlow)).toEqual({
      flow: {
        index: 0,
        id: 'plan',
        name: 'Plan',
        body: 'Plans the work.',
        arguments: [],
        artifacts: [],
        approval: false,
        blocks: [
          { index: 0, id: 'start', kind: 'start', next: 'end' },
          { index: 1, id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
        ],
      },
      problems: [],
    });
  });

  it.each(['id', 'name', 'body', 'arguments', 'artifacts', 'approval', 'blocks'])(
    'refuses a flow missing %s at the path of the flow',
    (key) => {
      const value: Record<string, unknown> = { ...validFlow };
      delete value[key];
      refusedAt(value, FLOW, `is missing the key ${key}`);
    },
  );

  it('refuses a flow that is not an object, at the flow path', () => {
    refusedAt(['plan'], FLOW, 'must be an object, got a list');
  });
});

describe('F-02 AC-021 a flow may omit description, model, ruleTags and next', () => {
  it('accepts a flow with all four optional keys omitted', () => {
    const { flow, problems } = readF(validFlow);
    expect(problems).toEqual([]);
    expect(flow).not.toHaveProperty('description');
    expect(flow).not.toHaveProperty('model');
    expect(flow).not.toHaveProperty('ruleTags');
    expect(flow).not.toHaveProperty('next');
  });

  it('accepts empty arguments and empty artifacts lists', () => {
    expect(readF({ ...validFlow, arguments: [], artifacts: [] }).problems).toEqual([]);
  });

  it('keeps the optional keys when they are present and valid', () => {
    const { flow, problems } = readF({
      ...validFlow,
      description: 'The plan.',
      model: 'sonnet',
      ruleTags: ['style'],
      next: 'build',
    });
    expect(problems).toEqual([]);
    expect(flow).toMatchObject({
      description: 'The plan.',
      model: 'sonnet',
      ruleTags: [{ ruleId: 'style', index: 0 }],
      next: 'build',
    });
  });
});

describe('F-02 AC-007 AC-008 a flow refuses an unknown or retired key at the path of that key', () => {
  it.each(['connectedTo', 'checks', 'enabled', 'disabled', 'x'])(
    'refuses the key %s with its path',
    (key) => {
      refusedAt({ ...validFlow, [key]: 'value' }, `${FLOW}.${key}`, `has an unknown key ${key}`);
    },
  );
});

describe('F-02 AC-022 approval is a boolean', () => {
  it.each([true, false])('accepts approval %s', (approval) => {
    expect(readF({ ...validFlow, approval }).problems).toEqual([]);
  });

  it.each([
    ['"on"', 'text'],
    ['1', 'a number'],
    ['null', 'null'],
  ])('refuses approval given as %s at the path approval', (json, described) => {
    const value = { ...validFlow, approval: JSON.parse(json) as unknown };
    refusedAt(value, `${FLOW}.approval`, `must be true or false, got ${described}`);
  });
});

describe('F-02 AC-023 a flow description is up to 1,000 code points, and its model takes the four values', () => {
  it('accepts a description of exactly 1,000 code points', () => {
    expect(readF({ ...validFlow, description: 'a'.repeat(1000) }).problems).toEqual([]);
  });

  it('refuses a description of 1,001 code points at its path', () => {
    refusedAt(
      { ...validFlow, description: 'a'.repeat(1001) },
      `${FLOW}.description`,
      'must be at most 1000 characters',
    );
  });

  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('accepts the model %s', (model) => {
    expect(readF({ ...validFlow, model }).problems).toEqual([]);
  });
});

describe('F-02 AC-030 a flow model takes haiku, sonnet, opus or inherit', () => {
  it.each(['Haiku', 'gpt'])('refuses the model %s at the path model', (model) => {
    const result = readF({ ...validFlow, model });
    expect(result.flow).toBeUndefined();
    expect(result.problems).toEqual([
      { path: `${FLOW}.model`, message: `must be one of haiku, sonnet, opus, inherit, got text` },
    ]);
  });
});

describe('F-02 AC-024 AC-071 AC-072 a flow ruleTags list follows the rule-tag rules', () => {
  it('accepts a list of distinct ids', () => {
    expect(readF({ ...validFlow, ruleTags: ['style', 'tests'] }).problems).toEqual([]);
  });

  it('drops a tag that is not an id at the path of the tag, and keeps the flow and the other tags', () => {
    const { flow, problems } = readF({ ...validFlow, ruleTags: ['style', 'Style Rule', 'tests'] });
    expect(problems).toEqual([
      {
        path: `${FLOW}.ruleTags.1`,
        message:
          'must be an id: lowercase letters, digits and hyphens, starting with a letter, at most 60 characters',
      },
    ]);
    expect(flow).toMatchObject({
      ruleTags: [
        { ruleId: 'style', index: 0 },
        { ruleId: 'tests', index: 2 },
      ],
    });
  });

  it('drops a tag listed twice at the path of the second entry, and keeps the flow', () => {
    const { flow, problems } = readF({ ...validFlow, ruleTags: ['style', 'style', 'tests'] });
    expect(problems).toEqual([
      { path: `${FLOW}.ruleTags.1`, message: 'repeats style; each entry must be listed once' },
    ]);
    expect(flow).toMatchObject({
      ruleTags: [
        { ruleId: 'style', index: 0 },
        { ruleId: 'tests', index: 2 },
      ],
    });
  });
});

describe('F-02 AC-025 a flow id follows the id rule', () => {
  it.each(['Plan', 'plan_1', '1plan', ''])('refuses the id %j at the path of the id', (id) => {
    const result = readF({ ...validFlow, id });
    expect(result.flow).toBeUndefined();
    expect(result.problems).toContainEqual({
      path: `${FLOW}.id`,
      message:
        'must be an id: lowercase letters, digits and hyphens, starting with a letter, at most 60 characters',
    });
  });

  it('accepts an id of 60 characters', () => {
    expect(readF({ ...validFlow, id: `a${'b'.repeat(59)}` }).problems).toEqual([]);
  });
});

describe('F-02 AC-027 a flow name is 1 to 100 code points and not blank', () => {
  it('accepts the name Plan', () => {
    expect(readF(validFlow).problems).toEqual([]);
  });

  it('accepts a name of 1 code point and a name of 100 code points', () => {
    expect(readF({ ...validFlow, name: 'n' }).problems).toEqual([]);
    expect(readF({ ...validFlow, name: 'n'.repeat(100) }).problems).toEqual([]);
  });

  it.each(['', '   ', 'n'.repeat(101)])('refuses the name %j at the path of the name', (name) => {
    const result = readF({ ...validFlow, name });
    expect(result.flow).toBeUndefined();
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.path).toBe(`${FLOW}.name`);
  });
});

describe('F-02 AC-021 AC-023 AC-024 a present but invalid optional key makes the flow undefined', () => {
  it.each([
    [
      'next',
      'Build Step',
      'must be an id: lowercase letters, digits and hyphens, starting with a letter, at most 60 characters',
    ],
    ['ruleTags', 'style', 'must be a list, got text'],
    ['description', null, 'must be text, got null'],
  ])('refuses the optional key %s given as %j, and leaves the flow undefined', (key, value, message) => {
    refusedAt({ ...validFlow, [key]: value }, `${FLOW}.${key}`, message);
  });
});

describe('F-02 AC-020 nothing throws: a value that is not a valid flow is refused, not raised', () => {
  it.each([
    [null, 'must be an object, got null'],
    ['plan', 'must be an object, got text'],
    [5, 'must be an object, got a number'],
  ])('refuses the value %j as a flow', (value, message) => {
    refusedAt(value, FLOW, message);
  });

  it('refuses required keys of the wrong type without throwing', () => {
    const result = readF({ ...validFlow, arguments: 'x', artifacts: null, blocks: 5 });
    expect(result.flow).toBeUndefined();
    expect(result.problems.map((problem) => problem.path)).toEqual([
      `${FLOW}.arguments`,
      `${FLOW}.artifacts`,
      `${FLOW}.blocks`,
    ]);
  });
});

describe('F-02 AC-029 F-11 AC-022 a flow body is not blank and up to 1,000 code points', () => {
  it.each(['', '   ', '\n\t'])('refuses the blank body %j at the path of the body', (body) => {
    refusedAt({ ...validFlow, body }, `${FLOW}.body`, 'must not be blank');
  });

  it('accepts a body of exactly 1,000 code points', () => {
    expect(readF({ ...validFlow, body: 'b'.repeat(1000) }).problems).toEqual([]);
  });

  it('refuses a body of 1,001 code points at the path of the body', () => {
    refusedAt({ ...validFlow, body: 'b'.repeat(1001) }, `${FLOW}.body`, 'must be at most 1000 characters');
  });

  it('accepts a body of 1,000 emoji, counted in code points', () => {
    expect(readF({ ...validFlow, body: '😀'.repeat(1000) }).problems).toEqual([]);
  });
});

describe('F-02 AC-039 the artifacts of a flow keep the order of their array', () => {
  it('returns the artifacts in document order', () => {
    const artifacts = [
      { label: 'b.md', template: 'second' },
      { label: 'a.md', template: 'first' },
    ];
    const { flow, problems } = readF({ ...validFlow, artifacts });
    expect(problems).toEqual([]);
    expect(flow?.artifacts).toEqual(artifacts);
  });

  it('accepts an empty artifacts list', () => {
    expect(readF({ ...validFlow, artifacts: [] }).flow?.artifacts).toEqual([]);
  });
});
