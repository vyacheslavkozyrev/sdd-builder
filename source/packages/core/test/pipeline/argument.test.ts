import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readArguments } from '../../src/pipeline/parse/argument.js';

const LIST = 'pipeline.arguments';
const validRow = { id: 'feature-id', required: true, hint: 'F-XX' };

function read(value: unknown, path = LIST) {
  const problems = createProblemCollector();
  const rows = readArguments(value, path, problems);
  return { rows, problems: problems.list() };
}

describe('F-02 AC-015 an argument row requires id, required and hint', () => {
  it('accepts a row with exactly id, required and hint', () => {
    expect(read([validRow])).toEqual({ rows: [validRow], problems: [] });
  });

  it.each(['id', 'required', 'hint'])('refuses a row missing %s with a problem at the row path', (key) => {
    const row: Record<string, unknown> = { ...validRow };
    delete row[key];
    expect(read([row])).toEqual({
      rows: [],
      problems: [{ path: `${LIST}.0`, message: `is missing the key ${key}` }],
    });
  });

  it('refuses a row with an unknown key at the row path', () => {
    expect(read([{ ...validRow, default: 'x' }])).toEqual({
      rows: [],
      problems: [{ path: `${LIST}.0`, message: 'has an unknown key default' }],
    });
  });

  it('refuses a row that is not an object at the row path', () => {
    expect(read(['feature-id'])).toEqual({
      rows: [],
      problems: [{ path: `${LIST}.0`, message: expect.stringContaining('must be an object') }],
    });
  });

  it('accepts an empty list', () => {
    expect(read([])).toEqual({ rows: [], problems: [] });
  });

  it('refuses a value that is not a list at the list path', () => {
    expect(read({ id: 'feature-id' })).toEqual({
      rows: undefined,
      problems: [{ path: LIST, message: expect.stringContaining('must be a list') }],
    });
  });

  it('keeps the valid rows and reports each invalid row', () => {
    const result = read([validRow, { id: 'x' }, { ...validRow, id: 'other-id' }]);
    expect(result.rows).toEqual([validRow, { id: 'other-id', required: true, hint: 'F-XX' }]);
    expect(result.problems).toEqual([
      { path: `${LIST}.1`, message: 'is missing the key required' },
      { path: `${LIST}.1`, message: 'is missing the key hint' },
    ]);
  });
});

describe('F-02 AC-016 an argument id follows the id rule', () => {
  it.each(['feature-id', 'a', 'f1-2-3', 'a'.repeat(60)])('accepts the id %s', (id) => {
    expect(read([{ ...validRow, id }]).problems).toEqual([]);
  });

  it.each([
    ['Feature_ID'],
    ['1st'],
    ['feature id'],
    ['feature.id'],
    [''],
    ['a'.repeat(61)],
  ])('refuses the id %s with a problem at the path of the id', (id) => {
    expect(read([{ ...validRow, id }])).toEqual({
      rows: [],
      problems: [{ path: `${LIST}.0.id`, message: expect.stringContaining('must be an id') }],
    });
  });

  it.each([[null], [1], [['feature-id']]])('refuses an id that is not text (%s) at the path of the id', (id) => {
    expect(read([{ ...validRow, id }])).toEqual({
      rows: [],
      problems: [{ path: `${LIST}.0.id`, message: expect.stringContaining('must be an id (text)') }],
    });
  });
});

describe('F-02 AC-017 required is a boolean and hint is text of up to 100 code points', () => {
  it.each([true, false])('accepts required %s', (required) => {
    expect(read([{ ...validRow, required }]).problems).toEqual([]);
  });

  it.each([['true'], ['false'], [1], [null]])(
    'refuses required given as %s at the path of required',
    (required) => {
      expect(read([{ ...validRow, required }])).toEqual({
        rows: [],
        problems: [{ path: `${LIST}.0.required`, message: expect.stringContaining('true or false') }],
      });
    },
  );

  it.each([[5], [null]])('refuses a hint that is not text (%s) at the path of the hint', (hint) => {
    expect(read([{ ...validRow, hint }])).toEqual({
      rows: [],
      problems: [{ path: `${LIST}.0.hint`, message: expect.stringContaining('must be text') }],
    });
  });

  it('accepts a hint of exactly 100 characters', () => {
    expect(read([{ ...validRow, hint: 'h'.repeat(100) }]).problems).toEqual([]);
  });

  it('refuses a hint of 101 characters at the path of the hint', () => {
    expect(read([{ ...validRow, hint: 'h'.repeat(101) }])).toEqual({
      rows: [],
      problems: [{ path: `${LIST}.0.hint`, message: 'must be at most 100 characters' }],
    });
  });

  it('counts a hint in code points, so 100 emoji are accepted and 101 are refused', () => {
    expect(read([{ ...validRow, hint: '😀'.repeat(100) }]).problems).toEqual([]);
    expect(read([{ ...validRow, hint: '😀'.repeat(101) }]).problems).toEqual([
      { path: `${LIST}.0.hint`, message: 'must be at most 100 characters' },
    ]);
  });
});

describe('F-02 AC-019 the same rows are checked wherever they sit', () => {
  it.each(['pipeline.arguments', 'flows.0.arguments', 'flows.0.blocks.2.arguments'])(
    'names the list %s in the path of a problem',
    (path) => {
      expect(read([{ ...validRow, id: 'Bad' }], path).problems).toEqual([
        { path: `${path}.0.id`, message: expect.stringContaining('must be an id') },
      ]);
    },
  );
});
