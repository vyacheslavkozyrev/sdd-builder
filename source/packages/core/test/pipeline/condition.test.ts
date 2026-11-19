import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readCondition } from '../../src/pipeline/parse/condition.js';

const COND = 'pipeline.flows.0.blocks.2';
const TRUE = `${COND}.true`;
const FALSE = `${COND}.false`;
const validCondition = {
  id: 'pre',
  kind: 'condition',
  description: 'The brief is complete.',
  true: { to: 'frame' },
  false: { stop: true },
};

function readC(value: unknown, path = COND) {
  const problems = createProblemCollector();
  const block = readCondition(value, path, problems);
  return { block, problems: problems.list() };
}

describe('F-02 AC-056 a condition requires id, kind, description, true and false', () => {
  it('accepts a condition with exactly id, kind, description, true and false', () => {
    expect(readC(validCondition)).toEqual({
      block: {
        id: 'pre',
        kind: 'condition',
        description: 'The brief is complete.',
        true: { to: 'frame' },
        false: { stop: true },
      },
      problems: [],
    });
  });

  it.each(['id', 'kind', 'description', 'true', 'false'])(
    'refuses a condition missing %s at the path of the condition',
    (key) => {
      const value: Record<string, unknown> = { ...validCondition };
      delete value[key];
      expect(readC(value)).toEqual({
        block: undefined,
        problems: [{ path: COND, message: `is missing the key ${key}` }],
      });
    },
  );

  it('refuses a condition whose kind is not condition', () => {
    expect(readC({ ...validCondition, kind: 'agent' })).toEqual({
      block: undefined,
      problems: [{ path: `${COND}.kind`, message: 'must be condition, got text' }],
    });
  });

  it.each([['condition'], [null], [[]], [1]])('refuses the value %j, which is not an object, at the block path', (value) => {
    expect(readC(value)).toEqual({
      block: undefined,
      problems: [{ path: COND, message: expect.stringContaining('must be an object') }],
    });
  });
});

describe('F-02 AC-057 a condition description is text that is not blank and at most 1,000 code points', () => {
  it.each([
    ['one character', 'a'],
    ['1,000 ASCII characters', 'a'.repeat(1000)],
    ['1,000 emoji (one code point each)', '😀'.repeat(1000)],
  ])('accepts a description of %s', (_label, description) => {
    expect(readC({ ...validCondition, description }).problems).toEqual([]);
  });

  it.each(['', '   ', '\n\t'])('refuses the blank description %j at the path of description', (description) => {
    expect(readC({ ...validCondition, description })).toEqual({
      block: undefined,
      problems: [{ path: `${COND}.description`, message: 'must not be blank' }],
    });
  });

  it('refuses a description of 1,001 characters at the path of description', () => {
    expect(readC({ ...validCondition, description: 'a'.repeat(1001) })).toEqual({
      block: undefined,
      problems: [{ path: `${COND}.description`, message: 'must be at most 1000 characters' }],
    });
  });

  it('refuses a description of 1,001 code points, even when it is 2,002 UTF-16 units', () => {
    expect(readC({ ...validCondition, description: '😀'.repeat(1001) }).problems).toEqual([
      { path: `${COND}.description`, message: 'must be at most 1000 characters' },
    ]);
  });

  it('refuses a description that is not text at the path of description', () => {
    expect(readC({ ...validCondition, description: 1 })).toEqual({
      block: undefined,
      problems: [{ path: `${COND}.description`, message: 'must be text, got a number' }],
    });
  });
});

describe('F-02 AC-058 a route is exactly {to}, {to, roundLimit} or {stop: true}', () => {
  it.each([
    [{ to: 'frame' }, { to: 'frame' }],
    [{ to: 'frame', roundLimit: 2 }, { to: 'frame', roundLimit: 2 }],
    [{ stop: true }, { stop: true }],
  ])('accepts the route %j on the true side', (route, expected) => {
    expect(readC({ ...validCondition, true: route }).block?.true).toEqual(expected);
  });

  it.each([
    ['the empty object', {}],
    ['a route with both to and stop', { to: 'frame', stop: true }],
    ['stop false', { stop: false }],
    ['roundLimit without to', { roundLimit: 2 }],
  ])('refuses %s at the path of the route', (_label, route) => {
    expect(readC({ ...validCondition, true: route })).toEqual({
      block: undefined,
      problems: [{ path: TRUE, message: 'must be {to}, {to, roundLimit} or {stop: true}' }],
    });
  });

  it('refuses a route whose stop is combined with roundLimit at the path of the route', () => {
    expect(readC({ ...validCondition, false: { stop: true, roundLimit: 1 } }).problems).toEqual([
      { path: FALSE, message: 'must be {to}, {to, roundLimit} or {stop: true}' },
    ]);
  });

  it('refuses a route that is not an object at the path of the route', () => {
    expect(readC({ ...validCondition, false: 'frame' }).problems).toEqual([
      { path: FALSE, message: expect.stringContaining('must be an object') },
    ]);
  });

  it('refuses a route with an unknown key at the path of that key', () => {
    expect(readC({ ...validCondition, true: { to: 'frame', gate: true } })).toEqual({
      block: undefined,
      problems: [{ path: `${TRUE}.gate`, message: 'has an unknown key gate' }],
    });
  });

  it('refuses a route whose to is not an id at the path of to', () => {
    expect(readC({ ...validCondition, true: { to: 'Frame Step' } }).problems).toEqual([
      { path: `${TRUE}.to`, message: expect.stringContaining('must be an id') },
    ]);
  });
});

describe('F-02 AC-060 a round limit is an integer from 1 to 5', () => {
  it.each([1, 5])('accepts the round limit %s', (roundLimit) => {
    expect(readC({ ...validCondition, false: { to: 'frame', roundLimit } }).problems).toEqual([]);
  });

  it.each([
    [0, 'must be a whole number from 1 to 5, got a number'],
    [6, 'must be a whole number from 1 to 5, got a number'],
    [2.5, 'must be a whole number from 1 to 5, got a number'],
    ['2', 'must be a whole number from 1 to 5, got text'],
  ])('refuses the round limit %j at the path of roundLimit', (roundLimit, message) => {
    expect(readC({ ...validCondition, false: { to: 'frame', roundLimit } })).toEqual({
      block: undefined,
      problems: [{ path: `${FALSE}.roundLimit`, message }],
    });
  });
});

describe('F-02 AC-008 the retired keys are refused on a condition and its routes', () => {
  it.each(['connectedTo', 'checks', 'enabled', 'disabled'])(
    'refuses %s on a condition at the path of that key',
    (key) => {
      expect(readC({ ...validCondition, [key]: true })).toEqual({
        block: undefined,
        problems: [{ path: `${COND}.${key}`, message: `has an unknown key ${key}` }],
      });
    },
  );

  it.each(['gate', 'label'])('refuses %s on a route at the path of that key', (key) => {
    expect(readC({ ...validCondition, true: { to: 'frame', [key]: 'x' } })).toEqual({
      block: undefined,
      problems: [{ path: `${TRUE}.${key}`, message: `has an unknown key ${key}` }],
    });
  });
});
