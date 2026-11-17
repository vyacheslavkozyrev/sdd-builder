import { describe, expect, it } from 'vitest';
import { createProblems } from '../../src/pipeline/check/primitives.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';
import { parsePipeline } from '../../src/pipeline/parse/pipeline.js';

const AT = 'pipeline';
const BODY_CAP = 1000;

function run(value: unknown) {
  const problems = createProblems();
  const pipeline = parsePipeline(value, AT, problems);
  return {
    pipeline,
    paths: problems.list.map((problem) => problem.path),
  };
}

function flow(id = 'build'): Record<string, unknown> {
  return {
    id,
    name: 'Build',
    description: 'Builds one task',
    arguments: 'the task id',
    blocks: [
      { id: `${id}-start`, kind: 'start' },
      { id: `${id}-finish`, kind: 'end', outcome: 'done' },
    ],
  };
}

function argument(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'feature-id', required: true, hint: 'The feature, for example F-02', ...overrides };
}

function pipeline(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Feature flow',
    description: 'Runs one feature from brief to commit.',
    arguments: [argument()],
    flows: [flow()],
    ...overrides,
  };
}

function config(pipelineValue: unknown): Record<string, unknown> {
  return {
    schemaVersion: 2,
    rules: [{ id: 'no-secrets', title: 'No secrets', text: 'Never commit keys.' }],
    pipeline: pipelineValue,
  };
}

describe('F-02 AC-001 a valid full config is returned typed, with no problems', () => {
  it('F-02 AC-001 returns the typed config for a full fixture with rules and one pipeline', () => {
    const input = {
      schemaVersion: 2,
      rules: [
        { id: 'no-secrets', title: 'No secrets', text: 'Never commit keys.' },
        { id: 'small-diffs', title: 'Small diffs', text: 'Keep a change small.' },
      ],
      pipeline: pipeline({
        model: 'inherit',
        tools: ['Read', 'Edit'],
        ruleTags: ['no-secrets'],
        body: 'Run the flows in order.',
        flows: [
          {
            id: 'build',
            name: 'Build',
            description: 'Builds one task',
            arguments: 'the task id',
            model: 'sonnet',
            ruleTags: ['small-diffs'],
            body: 'Build the task.',
            blocks: [
              { id: 'start', kind: 'start', connectedTo: { to: 'work', label: 'begin' } },
              {
                id: 'work',
                kind: 'agent',
                name: 'implement',
                description: 'Writes the code',
                arguments: '',
                tools: ['Edit'],
                connectedTo: { to: 'finish', label: 'done' },
              },
              { id: 'finish', kind: 'end', outcome: 'done' },
            ],
            connectedTo: { to: 'review', label: 'next', gate: { kind: 'approval', description: 'The user approves' } },
          },
          flow('review'),
        ],
      }),
    };
    const result = parseProjectConfig(input);
    expect(result).toEqual({ ok: true, config: input });
    expect(result.ok && result.config.pipeline.flows.map((item) => item.id)).toEqual(['build', 'review']);
  });
});

describe('F-02 AC-006 a pipeline needs name, description and flows', () => {
  it('F-02 AC-006 accepts a pipeline with name, description, arguments and flows', () => {
    const result = run(pipeline());
    expect(result.paths).toEqual([]);
    expect(result.pipeline).toEqual({
      name: 'Feature flow',
      description: 'Runs one feature from brief to commit.',
      arguments: [{ id: 'feature-id', required: true, hint: 'The feature, for example F-02' }],
      flows: [expect.objectContaining({ id: 'build' })],
    });
  });

  it.each(['name', 'description', 'arguments', 'flows'])(
    'F-02 AC-006 refuses a pipeline without %s, at its path',
    (key) => {
      const value = pipeline();
      delete value[key];
      expect(run(value).paths).toEqual([`pipeline.${key}`]);
    },
  );

  it('F-02 AC-006 refuses a pipeline whose arguments key is absent, at pipeline.arguments', () => {
    const value = pipeline();
    delete value['arguments'];
    const result = run(value);
    expect(result.pipeline).toBeUndefined();
    expect(result.paths).toEqual(['pipeline.arguments']);
  });

  it('F-02 AC-006 accepts an empty arguments list, because the key is present', () => {
    const result = run(pipeline({ arguments: [] }));
    expect(result.paths).toEqual([]);
    expect(result.pipeline?.arguments).toEqual([]);
  });

  it.each([
    { label: 'a blank name', value: pipeline({ name: '  ' }), path: 'pipeline.name' },
    { label: 'an empty name', value: pipeline({ name: '' }), path: 'pipeline.name' },
    { label: 'a blank description', value: pipeline({ description: ' ' }), path: 'pipeline.description' },
    { label: 'a name that is not text', value: pipeline({ name: 3 }), path: 'pipeline.name' },
    { label: 'flows that are not a list', value: pipeline({ flows: 'build' }), path: 'pipeline.flows' },
  ])('F-02 AC-006 refuses $label, at its path', ({ value, path }) => {
    expect(run(value).paths).toEqual([path]);
  });

  it('F-02 AC-006 accepts an empty flows list', () => {
    expect(run(pipeline({ flows: [] })).paths).toEqual([]);
  });

  it('F-02 AC-006 keeps the flows in the order of the array', () => {
    const result = run(pipeline({ flows: [flow('zeta'), flow('alpha'), flow('mid')] }));
    expect(result.pipeline?.flows.map((item) => item.id)).toEqual(['zeta', 'alpha', 'mid']);
  });

  it('F-02 AC-006 refuses a flow that fails, at its index in the flows list', () => {
    const broken = { ...flow('second'), name: ' ' };
    expect(run(pipeline({ flows: [flow('first'), broken] })).paths).toEqual(['pipeline.flows[1].name']);
  });
});

describe('F-02 AC-008 pipeline arguments are structured', () => {
  it('F-02 AC-008 accepts a list of arguments with id, required and hint', () => {
    const result = run(
      pipeline({
        arguments: [argument(), argument({ id: 'note', required: false, hint: '' })],
      }),
    );
    expect(result.paths).toEqual([]);
    expect(result.pipeline?.arguments).toEqual([
      { id: 'feature-id', required: true, hint: 'The feature, for example F-02' },
      { id: 'note', required: false, hint: '' },
    ]);
  });

  it.each([
    { label: 'the string "true"', value: 'true' },
    { label: 'the number 1', value: 1 },
    { label: 'null', value: null },
    { label: 'a missing value', value: undefined },
  ])('F-02 AC-008 refuses a required that is $label, at its path', ({ value }) => {
    const item = argument();
    if (value === undefined) {
      delete item['required'];
    } else {
      item['required'] = value;
    }
    expect(run(pipeline({ arguments: [item] })).paths).toEqual(['pipeline.arguments[0].required']);
  });

  it.each([
    { label: 'an id that is not an id', value: argument({ id: 'Feature' }), path: 'pipeline.arguments[0].id' },
    { label: 'a missing id', value: argument({ id: undefined }), path: 'pipeline.arguments[0].id' },
    { label: 'a missing hint', value: argument({ hint: undefined }), path: 'pipeline.arguments[0].hint' },
    { label: 'a hint that is not text', value: argument({ hint: 4 }), path: 'pipeline.arguments[0].hint' },
  ])('F-02 AC-008 refuses an argument with $label, at its path', ({ value, path }) => {
    expect(run(pipeline({ arguments: [value] })).paths).toEqual([path]);
  });

  it('F-02 AC-008 refuses an argument that is a string, at its index', () => {
    expect(run(pipeline({ arguments: ['feature-id'] })).paths).toEqual(['pipeline.arguments[0]']);
  });

  it('F-02 AC-008 refuses arguments that are not a list', () => {
    expect(run(pipeline({ arguments: { id: 'feature-id' } })).paths).toEqual(['pipeline.arguments']);
  });
});

describe('F-02 AC-004 unknown keys at the pipeline and argument levels', () => {
  it('F-02 AC-004 names an unknown key of the pipeline with its path', () => {
    expect(run(pipeline({ extra: true })).paths).toEqual(['pipeline.extra']);
  });

  it('F-02 AC-004 names an unknown key of an argument with the index of the argument', () => {
    expect(run(pipeline({ arguments: [argument({ extra: 'x' })] })).paths).toEqual([
      'pipeline.arguments[0].extra',
    ]);
  });

  it('F-02 AC-004 reaches the pipeline through the config and names the same path', () => {
    const result = parseProjectConfig(config(pipeline({ extra: true })));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems.map((problem) => problem.path)).toEqual(['pipeline.extra']);
    }
  });
});

describe('F-02 AC-024 the pipeline body is at most 1,000 code points', () => {
  it('F-02 AC-024 accepts a body of exactly 1,000 characters', () => {
    const result = run(pipeline({ body: 'a'.repeat(BODY_CAP) }));
    expect(result.paths).toEqual([]);
    expect(result.pipeline?.body).toHaveLength(BODY_CAP);
  });

  it('F-02 AC-024 refuses a body of 1,001 characters, at pipeline.body', () => {
    expect(run(pipeline({ body: 'a'.repeat(BODY_CAP + 1) })).paths).toEqual(['pipeline.body']);
  });

  it('F-02 AC-024 counts code points, so 1,000 emoji are accepted', () => {
    expect(run(pipeline({ body: '😀'.repeat(BODY_CAP) })).paths).toEqual([]);
  });

  it('F-02 AC-024 refuses 1,001 emoji, which are more than 1,000 code points', () => {
    expect(run(pipeline({ body: '😀'.repeat(BODY_CAP + 1) })).paths).toEqual(['pipeline.body']);
  });

  it('F-02 AC-024 refuses a body that is not text', () => {
    expect(run(pipeline({ body: 12 })).paths).toEqual(['pipeline.body']);
  });
});

describe('F-02 AC-025 pipeline tools and ruleTags refuse blank and duplicate entries', () => {
  it('F-02 AC-025 accepts distinct, non-blank tools and rule tags', () => {
    const result = run(pipeline({ tools: ['Read', 'Edit'], ruleTags: ['no-secrets', 'small-diffs'] }));
    expect(result.paths).toEqual([]);
    expect(result.pipeline?.tools).toEqual(['Read', 'Edit']);
    expect(result.pipeline?.ruleTags).toEqual(['no-secrets', 'small-diffs']);
  });

  it.each([
    { label: 'a blank tool', key: 'tools', value: ['Read', ' '], path: 'pipeline.tools[1]' },
    { label: 'a duplicate tool', key: 'tools', value: ['Read', 'Edit', 'Read'], path: 'pipeline.tools[2]' },
    { label: 'a blank rule tag', key: 'ruleTags', value: ['', 'no-secrets'], path: 'pipeline.ruleTags[0]' },
    { label: 'a duplicate rule tag', key: 'ruleTags', value: ['no-secrets', 'no-secrets'], path: 'pipeline.ruleTags[1]' },
    { label: 'a rule tag that is not an id', key: 'ruleTags', value: ['No Secrets'], path: 'pipeline.ruleTags[0]' },
  ])('F-02 AC-025 refuses $label, with the path of the entry', ({ key, value, path }) => {
    expect(run(pipeline({ [key]: value })).paths).toEqual([path]);
  });

  it('F-02 AC-025 refuses tools and rule tags that are not lists', () => {
    expect(run(pipeline({ tools: 'Read' })).paths).toEqual(['pipeline.tools']);
    expect(run(pipeline({ ruleTags: 'no-secrets' })).paths).toEqual(['pipeline.ruleTags']);
  });
});

describe('F-02 AC-026 pipeline model accepts the four model values', () => {
  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('F-02 AC-026 accepts the model %s', (model) => {
    const result = run(pipeline({ model }));
    expect(result.paths).toEqual([]);
    expect(result.pipeline?.model).toBe(model);
  });

  it.each([
    { label: 'an unknown name', value: 'gpt' },
    { label: 'a capitalised name', value: 'Sonnet' },
    { label: 'a number', value: 2 },
    { label: 'null', value: null },
  ])('F-02 AC-026 refuses $label, at pipeline.model', ({ value }) => {
    expect(run(pipeline({ model: value })).paths).toEqual(['pipeline.model']);
  });

  it('F-02 AC-026 leaves model out of the typed value when the key is absent', () => {
    const result = run(pipeline());
    expect(result.pipeline).not.toHaveProperty('model');
  });
});
