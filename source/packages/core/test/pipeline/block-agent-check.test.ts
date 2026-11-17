import { describe, expect, it } from 'vitest';
import { createProblems } from '../../src/pipeline/check/primitives.js';
import { parseBlock } from '../../src/pipeline/parse/block.js';

const AT = 'blocks[0]';
const BODY_CAP = 1000;

function run(value: unknown) {
  const problems = createProblems();
  const block = parseBlock(value, AT, problems);
  return { block, paths: problems.list.map((problem) => problem.path) };
}

function agent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'implement',
    kind: 'agent',
    name: 'implement',
    description: 'Writes the code for the task',
    arguments: 'the task id',
    ...overrides,
  };
}

function check(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'checks-pass',
    kind: 'check',
    description: 'The checks pass',
    type: 'checks',
    connectedTo: { true: { to: 'commit' }, false: { to: 'implement', roundLimit: 3 } },
    ...overrides,
  };
}

function diffCheck(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return check({ type: 'diff size', threshold: 400, ...overrides });
}

describe('F-02 AC-010 an agent needs name, description and arguments', () => {
  it('F-02 AC-010 accepts an agent with the required fields and returns no optional keys', () => {
    const result = run(agent());
    expect(result).toEqual({ block: agent(), paths: [] });
    expect(result.block).not.toHaveProperty('restrictions');
    expect(result.block).not.toHaveProperty('connectedTo');
    expect(result.block).not.toHaveProperty('body');
  });

  it.each(['name', 'description', 'arguments'])('F-02 AC-010 refuses an agent with no %s, at its path', (key) => {
    const value = agent();
    delete value[key];
    expect(run(value)).toEqual({ block: undefined, paths: [`${AT}.${key}`] });
  });

  it.each(['description', 'arguments'])('F-02 AC-010 accepts an empty or blank %s as text', (key) => {
    expect(run(agent({ [key]: '' })).paths).toEqual([]);
    expect(run(agent({ [key]: '   ' })).paths).toEqual([]);
  });

  it.each([
    { key: 'description', label: 'a number', value: 4 },
    { key: 'description', label: 'null', value: null },
    { key: 'arguments', label: 'a number', value: 4 },
    { key: 'arguments', label: 'null', value: null },
  ])('F-02 AC-010 refuses $key that is $label, with its path', ({ key, value }) => {
    expect(run(agent({ [key]: value }))).toEqual({ block: undefined, paths: [`${AT}.${key}`] });
  });

  it.each(['implement', 'review-2', 'a'])('F-02 AC-010 accepts the file-safe name %s', (name) => {
    expect(run(agent({ name })).paths).toEqual([]);
  });

  it.each([
    { label: 'an uppercase letter', value: 'Implement' },
    { label: 'a leading digit', value: '2review' },
    { label: 'an underscore', value: 'my_agent' },
    { label: 'a space', value: 'my agent' },
    { label: 'a dot', value: 'my.agent' },
    { label: 'a slash', value: 'a/b' },
    { label: 'a path climb', value: '../escape' },
    { label: 'an empty text', value: '' },
    { label: 'a number', value: 3 },
  ])('F-02 AC-010 refuses a name that is $label, with its path', ({ value }) => {
    expect(run(agent({ name: value }))).toEqual({ block: undefined, paths: [`${AT}.name`] });
  });
});

describe('F-02 AC-010 an agent accepts its optional fields with the value rules of each', () => {
  it('F-02 AC-010 accepts restrictions as text and returns it', () => {
    expect(run(agent({ restrictions: 'Do not edit the tests' }))).toEqual({
      block: agent({ restrictions: 'Do not edit the tests' }),
      paths: [],
    });
  });

  it('F-02 AC-010 refuses restrictions that is not text, with its path', () => {
    expect(run(agent({ restrictions: 4 })).paths).toEqual([`${AT}.restrictions`]);
  });

  it('F-02 AC-010 refuses an unknown key on an agent, with its path', () => {
    expect(run(agent({ extra: 1 })).paths).toEqual([`${AT}.extra`]);
  });
});

describe('F-02 AC-024 an agent body is at most 1,000 code points', () => {
  it('F-02 AC-024 accepts a body of exactly 1,000 characters', () => {
    expect(run(agent({ body: 'a'.repeat(BODY_CAP) })).paths).toEqual([]);
  });

  it('F-02 AC-024 refuses a body of 1,001 characters, with the path of body', () => {
    expect(run(agent({ body: 'a'.repeat(BODY_CAP + 1) }))).toEqual({
      block: undefined,
      paths: [`${AT}.body`],
    });
  });

  it('F-02 AC-024 counts code points: 1,000 emoji are accepted, 1,001 are refused', () => {
    expect(run(agent({ body: '😀'.repeat(BODY_CAP) })).paths).toEqual([]);
    expect(run(agent({ body: '😀'.repeat(BODY_CAP + 1) })).paths).toEqual([`${AT}.body`]);
  });
});

describe('F-02 AC-025 agent lists refuse a blank entry and a duplicate entry', () => {
  it.each(['tools', 'reads', 'writes', 'ruleTags'])('F-02 AC-025 accepts a list of distinct entries in %s', (key) => {
    const value = key === 'ruleTags' ? ['security', 'style'] : ['Read', 'Edit'];
    expect(run(agent({ [key]: value })).paths).toEqual([]);
  });

  it.each(['tools', 'reads', 'writes', 'ruleTags'])('F-02 AC-025 refuses a blank entry in %s, at its path', (key) => {
    const value = key === 'ruleTags' ? ['security', ' '] : ['Read', ' '];
    expect(run(agent({ [key]: value })).paths).toEqual([`${AT}.${key}[1]`]);
  });

  it.each(['tools', 'reads', 'writes', 'ruleTags'])(
    'F-02 AC-025 refuses a duplicate entry in %s, at the path of the second occurrence',
    (key) => {
      const value = key === 'ruleTags' ? ['security', 'security'] : ['Read', 'Read'];
      expect(run(agent({ [key]: value })).paths).toEqual([`${AT}.${key}[1]`]);
    },
  );

  it('F-02 AC-025 refuses a list that is not a list, with its path', () => {
    expect(run(agent({ tools: 'Read' })).paths).toEqual([`${AT}.tools`]);
  });
});

describe('F-02 AC-021 ruleTags entries follow the id rule', () => {
  it.each([
    { label: 'an uppercase letter', value: 'Security' },
    { label: 'a space', value: 'security rule' },
    { label: 'a leading digit', value: '1security' },
  ])('F-02 AC-021 refuses a ruleTags entry with $label, at its path', ({ value }) => {
    expect(run(agent({ ruleTags: ['style', value] })).paths).toEqual([`${AT}.ruleTags[1]`]);
  });
});

describe('F-02 AC-026 an agent model is one of the four model values', () => {
  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('F-02 AC-026 accepts the model %s', (model) => {
    expect(run(agent({ model })).paths).toEqual([]);
  });

  it.each([
    { label: 'an unknown name', value: 'gpt' },
    { label: 'a capitalised name', value: 'Haiku' },
    { label: 'null', value: null },
  ])('F-02 AC-026 refuses a model that is $label, with its path', ({ value }) => {
    expect(run(agent({ model: value })).paths).toEqual([`${AT}.model`]);
  });
});

describe('F-02 AC-019 an agent may omit connectedTo, and a connectedTo link must be valid', () => {
  it('F-02 AC-019 accepts an agent without connectedTo', () => {
    expect(run(agent())).toEqual({ block: agent(), paths: [] });
  });

  it('F-02 AC-019 accepts an agent with a connectedTo link', () => {
    const value = agent({ connectedTo: { to: 'review', label: 'code' } });
    expect(run(value)).toEqual({ block: value, paths: [] });
  });

  it('F-02 AC-016 refuses a connectedTo link with no label, with its path', () => {
    expect(run(agent({ connectedTo: { to: 'review' } })).paths).toEqual([`${AT}.connectedTo.label`]);
  });
});

describe('F-02 AC-005 an agent refuses outcome, which is an End key', () => {
  it('F-02 AC-005 refuses outcome on an agent, at its path', () => {
    expect(run(agent({ outcome: 'done' }))).toEqual({ block: undefined, paths: [`${AT}.outcome`] });
  });
});

describe('F-02 AC-012 a check needs a non-blank description and both outputs', () => {
  it('F-02 AC-012 accepts a checks check with its true and false outputs and returns it typed', () => {
    expect(run(check())).toEqual({ block: check(), paths: [] });
  });

  it.each([
    { label: 'an empty text', value: '' },
    { label: 'a blank text', value: '   ' },
    { label: 'a number', value: 3 },
    { label: 'null', value: null },
  ])('F-02 AC-012 refuses a description that is $label, with its path', ({ value }) => {
    expect(run(check({ description: value }))).toEqual({ block: undefined, paths: [`${AT}.description`] });
  });

  it('F-02 AC-012 refuses a check with no false output, at the path of that output', () => {
    expect(run(check({ connectedTo: { true: { to: 'commit' } } })).paths).toEqual([`${AT}.connectedTo.false`]);
  });

  it('F-02 AC-012 refuses a check with no true output, at the path of that output', () => {
    expect(run(check({ connectedTo: { false: { to: 'implement' } } })).paths).toEqual([`${AT}.connectedTo.true`]);
  });

  it('F-02 AC-012 refuses a check with neither output, naming both', () => {
    expect(run(check({ connectedTo: {} })).paths).toEqual([`${AT}.connectedTo.true`, `${AT}.connectedTo.false`]);
  });

  it('F-02 AC-012 refuses a connectedTo that is null, at its path', () => {
    expect(run(check({ connectedTo: null }))).toEqual({ block: undefined, paths: [`${AT}.connectedTo`] });
  });

  it('F-02 AC-012 refuses an unknown key inside connectedTo, with its path', () => {
    expect(
      run(check({ connectedTo: { true: { to: 'commit' }, false: { stop: true }, extra: { to: 'x' } } })).paths,
    ).toEqual([`${AT}.connectedTo.extra`]);
  });

  it('F-02 AC-012 refuses a route that has both to and stop, at the path of that output', () => {
    expect(run(check({ connectedTo: { true: { to: 'commit', stop: true }, false: { stop: true } } })).paths).toEqual([
      `${AT}.connectedTo.true`,
    ]);
  });

  it('F-02 AC-012 accepts a stop route as an output', () => {
    expect(run(check({ connectedTo: { true: { to: 'commit' }, false: { stop: true } } })).paths).toEqual([]);
  });
});

describe('F-02 AC-019 a check without connectedTo is refused', () => {
  it('F-02 AC-019 refuses a check with no connectedTo, at the path of connectedTo', () => {
    const value = check();
    delete value['connectedTo'];
    expect(run(value)).toEqual({ block: undefined, paths: [`${AT}.connectedTo`] });
  });
});

describe('F-02 AC-013 a check type is checks or diff size', () => {
  it.each([
    { label: 'an unknown word', value: 'diff' },
    { label: 'a capitalised word', value: 'Checks' },
    { label: 'null', value: null },
  ])('F-02 AC-013 refuses a type that is $label, with its path', ({ value }) => {
    expect(run(check({ type: value })).paths).toEqual([`${AT}.type`]);
  });

  it('F-02 AC-013 refuses a check with no type, with its path', () => {
    const value = check();
    delete value['type'];
    expect(run(value).paths).toEqual([`${AT}.type`]);
  });

  it('F-02 AC-013 accepts a checks check without threshold and returns no threshold key', () => {
    const result = run(check());
    expect(result.paths).toEqual([]);
    expect(result.block).not.toHaveProperty('threshold');
  });
});

describe('F-02 AC-013 a diff size check needs a positive whole number threshold', () => {
  it.each([1, 400])('F-02 AC-013 accepts a diff size check with threshold %s', (threshold) => {
    expect(run(diffCheck({ threshold }))).toEqual({ block: diffCheck({ threshold }), paths: [] });
  });

  it.each([
    { label: 'zero', value: 0 },
    { label: 'a negative number', value: -1 },
    { label: 'a fraction', value: 1.5 },
    { label: 'a text', value: '10' },
    { label: 'null', value: null },
  ])('F-02 AC-013 refuses a threshold that is $label, with its path', ({ value }) => {
    expect(run(diffCheck({ threshold: value }))).toEqual({ block: undefined, paths: [`${AT}.threshold`] });
  });

  it('F-02 AC-013 refuses a diff size check with no threshold, at the path of threshold', () => {
    const value = diffCheck();
    delete value['threshold'];
    expect(run(value)).toEqual({ block: undefined, paths: [`${AT}.threshold`] });
  });
});

describe('F-02 AC-005 a checks check refuses threshold', () => {
  it.each([
    { label: 'a positive number', value: 10 },
    { label: 'zero', value: 0 },
  ])('F-02 AC-005 refuses threshold that is $label on a checks check, with its path', ({ value }) => {
    expect(run(check({ threshold: value }))).toEqual({ block: undefined, paths: [`${AT}.threshold`] });
  });
});

describe('F-02 AC-004 an agent and a check refuse unknown keys, named by their path', () => {
  it('F-02 AC-004 names an unknown key on an agent', () => {
    expect(run(agent({ extra: 1 })).paths).toEqual([`${AT}.extra`]);
  });

  it('F-02 AC-004 names an unknown key on a check', () => {
    expect(run(check({ extra: 1 })).paths).toEqual([`${AT}.extra`]);
  });

  it('F-02 AC-004 names an unknown key on a diff size check, not only on a checks check', () => {
    expect(run(diffCheck({ extra: 1 })).paths).toEqual([`${AT}.extra`]);
  });
});
