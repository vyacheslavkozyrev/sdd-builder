import { describe, expect, it } from 'vitest';
import {
  codePoints,
  createProblemCollector,
  readBoolean,
  readId,
  readList,
  readModel,
  readObject,
  readOptional,
  readRequired,
  readText,
  type ProblemCollector,
} from '../../src/pipeline/check/primitives.js';

function collector(): ProblemCollector {
  return createProblemCollector();
}

describe('F-02 AC-005 problem collector keeps every problem with its path (the parser test is T002)', () => {
  it('keeps problems in the order they are added, each with its path', () => {
    const problems = collector();
    problems.add('name', 'first');
    problems.add('pipeline.flows[0].id', 'second');
    expect(problems.list()).toEqual([
      { path: 'name', message: 'first' },
      { path: 'pipeline.flows[0].id', message: 'second' },
    ]);
  });

  it('returns a copy, so the caller cannot change the collected list', () => {
    const problems = collector();
    problems.add('name', 'first');
    problems.list().push({ path: 'x', message: 'injected' });
    expect(problems.list()).toHaveLength(1);
  });
});

type Read = (value: unknown, path: string, problems: ProblemCollector) => unknown;

describe('F-02 AC-009 a value of the wrong JSON type is refused at its path', () => {
  const cases: ReadonlyArray<readonly [string, unknown, Read]> = [
    ['a string where a boolean is required (approval)', 'yes', readBoolean],
    ['an object where a list is required (arguments)', {}, readList],
    ['a number where text is required (name)', 3, (v, p, q) => readText(v, p, { max: 100 }, q)],
    ['a list where an object is required (pipeline)', [], readObject],
    ['a number where an id is required (id)', 1, readId],
    ['a number where a model is required (model)', 2, readModel],
  ];

  it.each(cases)('refuses %s with a problem at its path', (_label, value, read) => {
    const problems = collector();
    expect(read(value, 'key', problems)).toBeUndefined();
    expect(problems.list()).toEqual([
      { path: 'key', message: expect.stringContaining('must be') },
    ]);
  });

  it('refuses null for a required key', () => {
    const problems = collector();
    const result = readRequired({ next: null }, 'next', 'flow', problems, (v, p, q) => readId(v, p, q));
    expect(result).toBeUndefined();
    expect(problems.list()[0]?.path).toBe('flow.next');
  });

  it('accepts a value of the right type', () => {
    const problems = collector();
    expect(readBoolean(true, 'approval', problems)).toBe(true);
    expect(readList([], 'arguments', problems)).toEqual([]);
    expect(readText('Plan', 'name', { max: 100 }, problems)).toBe('Plan');
    expect(readObject({}, 'pipeline', problems)).toEqual({});
    expect(problems.list()).toEqual([]);
  });
});

describe('F-02 AC-010 an absent optional key is accepted, a null one is refused', () => {
  const read = (value: unknown, path: string, problems: ProblemCollector) =>
    readId(value, path, problems);

  it('accepts an absent optional key with no problem', () => {
    const problems = collector();
    expect(readOptional({}, 'next', 'flow', problems, read)).toBeUndefined();
    expect(problems.list()).toEqual([]);
  });

  it('refuses the same key with the value null, with the key path', () => {
    const problems = collector();
    expect(readOptional({ next: null }, 'next', 'flow', problems, read)).toBeUndefined();
    expect(problems.list()).toEqual([
      { path: 'flow.next', message: 'must be an id (text), got null' },
    ]);
  });

  it('reads a present optional key with a valid value', () => {
    const problems = collector();
    expect(readOptional({ next: 'build' }, 'next', 'flow', problems, read)).toBe('build');
    expect(problems.list()).toEqual([]);
  });

  it('reports a required key that is absent, at its path', () => {
    const problems = collector();
    expect(readRequired({}, 'id', 'flows[0]', problems, read)).toBeUndefined();
    expect(problems.list()).toEqual([{ path: 'flows[0].id', message: 'is required' }]);
  });
});

describe('F-02 AC-016 an argument id follows the id rule', () => {
  it.each(['feature-id', 'a', 'plan2', 'a'.repeat(60)])('accepts %s', (id) => {
    const problems = collector();
    expect(readId(id, 'arguments[0].id', problems)).toBe(id);
    expect(problems.list()).toEqual([]);
  });

  it.each([
    ['Feature_ID', 'upper case and underscore'],
    ['1st', 'starts with a digit'],
    ['feature id', 'contains a space'],
    ['feature.id', 'contains a dot'],
    ['', 'empty'],
    ['a'.repeat(61), 'longer than 60 code points'],
  ])('refuses %s (%s) with the path of the id', (id) => {
    const problems = collector();
    expect(readId(id, 'arguments[0].id', problems)).toBeUndefined();
    expect(problems.list()).toEqual([
      expect.objectContaining({ path: 'arguments[0].id' }),
    ]);
  });
});

describe('F-02 AC-029 a body is at most 1,000 code points', () => {
  const rule = { max: 1000 };

  it('accepts a body of exactly 1,000 code points', () => {
    const problems = collector();
    expect(readText('a'.repeat(1000), 'flows[0].body', rule, problems)).toHaveLength(1000);
    expect(problems.list()).toEqual([]);
  });

  it('refuses a body of 1,001 code points with the path of the body', () => {
    const problems = collector();
    expect(readText('a'.repeat(1001), 'flows[0].body', rule, problems)).toBeUndefined();
    expect(problems.list()).toEqual([
      { path: 'flows[0].body', message: 'must be at most 1000 characters' },
    ]);
  });

  it('accepts 1,000 emoji, because the count is in code points, not UTF-16 units', () => {
    const emoji = '😀'.repeat(1000);
    expect(emoji.length).toBe(2000);
    const problems = collector();
    expect(readText(emoji, 'flows[0].body', rule, problems)).toBe(emoji);
    expect(problems.list()).toEqual([]);
  });
});

describe('F-02 AC-030 a model takes one of four values', () => {
  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('accepts %s', (model) => {
    const problems = collector();
    expect(readModel(model, 'pipeline.model', problems)).toBe(model);
    expect(problems.list()).toEqual([]);
  });

  it.each(['Haiku', 'gpt', '', 'haiku ', null, 3])('refuses %s with its path', (value) => {
    const problems = collector();
    expect(readModel(value, 'pipeline.model', problems)).toBeUndefined();
    expect(problems.list()).toEqual([
      expect.objectContaining({ path: 'pipeline.model' }),
    ]);
  });
});

describe('F-02 AC-088 length limits count code points', () => {
  it('accepts a pipeline name of 100 emoji and refuses 101', () => {
    const problems = collector();
    expect(readText('😀'.repeat(100), 'pipeline.name', { max: 100, min: 1 }, problems)).toHaveLength(200);
    expect(problems.list()).toEqual([]);

    expect(readText('😀'.repeat(101), 'pipeline.name', { max: 100, min: 1 }, problems)).toBeUndefined();
    expect(problems.list()).toEqual([
      { path: 'pipeline.name', message: 'must be at most 100 characters' },
    ]);
  });

  it('counts a surrogate pair as one code point', () => {
    expect(codePoints('😀')).toBe(1);
    expect(codePoints('a😀b')).toBe(3);
    expect(codePoints('')).toBe(0);
  });

});

describe('F-02 AC-012 the pipeline name is 1 to 100 code points and not blank', () => {
  const nameRule = { max: 100, min: 1, nonBlank: true };

  it('refuses the empty string with the path pipeline.name', () => {
    const problems = collector();
    expect(readText('', 'pipeline.name', nameRule, problems)).toBeUndefined();
    expect(problems.list()).toEqual([{ path: 'pipeline.name', message: 'must not be blank' }]);
  });

  it('gives the minimum in the singular when it is 1 and no blank check is set', () => {
    const problems = collector();
    expect(readText('', 'pipeline.name', { max: 100, min: 1 }, problems)).toBeUndefined();
    expect(problems.list()).toEqual([
      { path: 'pipeline.name', message: 'must be at least 1 character' },
    ]);
  });

  it('refuses a name of spaces only with the path pipeline.name', () => {
    const problems = collector();
    expect(readText('   ', 'pipeline.name', nameRule, problems)).toBeUndefined();
    expect(problems.list()).toEqual([{ path: 'pipeline.name', message: 'must not be blank' }]);
  });

  it('accepts "SDD"', () => {
    const problems = collector();
    expect(readText('SDD', 'pipeline.name', nameRule, problems)).toBe('SDD');
    expect(problems.list()).toEqual([]);
  });
});

describe('F-02 AC-049 an agent description is not blank', () => {
  it('refuses the empty string, spaces only and a line break only, with the path of the description', () => {
    const rule = { max: 1000, nonBlank: true };
    for (const text of ['', '   ', '\n\t']) {
      const problems = collector();
      expect(readText(text, 'blocks[0].description', rule, problems)).toBeUndefined();
      expect(problems.list()).toEqual([
        expect.objectContaining({ path: 'blocks[0].description' }),
      ]);
    }
  });
});
