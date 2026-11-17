import { describe, expect, it } from 'vitest';
import {
  bodyText,
  booleanValue,
  checkKeys,
  createProblems,
  enumValue,
  idValue,
  modelValue,
  nonBlankText,
  positiveWholeNumber,
  textList,
  type Problems,
} from '../../src/pipeline/check/primitives.js';

function run<T>(check: (value: unknown, path: string, problems: Problems) => T | undefined, value: unknown) {
  const problems = createProblems();
  const result = check(value, 'path', problems);
  return { result, paths: problems.list.map((p) => p.path) };
}

describe('F-02 AC-021 id rule', () => {
  it.each([
    { label: 'a single letter', value: 'a' },
    { label: 'letters only', value: 'specify' },
    { label: 'letters, digits and hyphens', value: 'feature-id-2' },
  ])('F-02 AC-021 accepts $label', ({ value }) => {
    expect(run(idValue, value)).toEqual({ result: value, paths: [] });
  });

  it.each([
    { label: 'an uppercase letter', value: 'Specify' },
    { label: 'a leading digit', value: '1flow' },
    { label: 'an underscore', value: 'feature_id' },
    { label: 'a space', value: 'feature id' },
    { label: 'a dot', value: 'feature.id' },
    { label: 'an empty value', value: '' },
    { label: 'a leading hyphen', value: '-flow' },
    { label: 'a number', value: 42 },
    { label: 'no value', value: undefined },
  ])('F-02 AC-021 refuses $label with its path', ({ value }) => {
    expect(run(idValue, value)).toEqual({ result: undefined, paths: ['path'] });
  });
});

describe('F-02 AC-024 body cap in code points', () => {
  it.each([
    { label: 'an empty body', value: '' },
    { label: 'exactly 1,000 letters', value: 'a'.repeat(1000) },
    { label: 'exactly 1,000 emoji (2,000 UTF-16 units)', value: '\u{1F600}'.repeat(1000) },
  ])('F-02 AC-024 accepts $label', ({ value }) => {
    expect(run(bodyText, value)).toEqual({ result: value, paths: [] });
  });

  it.each([
    { label: '1,001 letters', value: 'a'.repeat(1001) },
    { label: '1,001 emoji', value: '\u{1F600}'.repeat(1001) },
    { label: 'an unbounded text of 50,000 letters', value: 'a'.repeat(50_000) },
  ])('F-02 AC-024 refuses $label with its path', ({ value }) => {
    expect(run(bodyText, value)).toEqual({ result: undefined, paths: ['path'] });
  });

  it('F-02 AC-024 refuses a body that is not text, with its path', () => {
    expect(run(bodyText, 12)).toEqual({ result: undefined, paths: ['path'] });
  });
});

describe('F-02 AC-025 lists refuse blank and duplicate entries', () => {
  it.each([
    { label: 'an empty list', value: [], paths: [] },
    { label: 'distinct entries', value: ['read', 'write'], paths: [] },
    { label: 'a blank entry', value: ['read', ' '], paths: ['path[1]'] },
    { label: 'an empty entry first', value: ['', 'read'], paths: ['path[0]'] },
    { label: 'a duplicate, at the second occurrence', value: ['read', 'read'], paths: ['path[1]'] },
    { label: 'two problems, in document order', value: ['read', ' ', 'read'], paths: ['path[1]', 'path[2]'] },
    { label: 'a non-text entry', value: [1], paths: ['path[0]'] },
    { label: 'a value that is not a list', value: 'read', paths: ['path'] },
  ])('F-02 AC-025 $label', ({ value, paths }) => {
    const { paths: found } = run(textList, value);
    expect(found).toEqual(paths);
  });

  it('F-02 AC-025 keeps the entries of a valid list', () => {
    expect(run(textList, ['read', 'write'])).toEqual({ result: ['read', 'write'], paths: [] });
  });

  it('F-02 AC-025 refuses a hole in a sparse list with its path, not a silent drop', () => {
    const sparse: unknown[] = [];
    sparse[1] = 'read';
    expect(run(textList, sparse)).toEqual({ result: undefined, paths: ['path[0]'] });
  });
});

describe('F-02 AC-026 model values', () => {
  it.each([
    { label: 'haiku', value: 'haiku' },
    { label: 'sonnet', value: 'sonnet' },
    { label: 'opus', value: 'opus' },
    { label: 'inherit', value: 'inherit' },
  ])('F-02 AC-026 accepts $label', ({ value }) => {
    expect(run(modelValue, value)).toEqual({ result: value, paths: [] });
  });

  it.each([
    { label: 'an uppercase name', value: 'Haiku' },
    { label: 'a full model id', value: 'claude-haiku-5-5' },
    { label: 'an empty value', value: '' },
    { label: 'a number', value: 3 },
  ])('F-02 AC-026 refuses $label with its path', ({ value }) => {
    expect(run(modelValue, value)).toEqual({ result: undefined, paths: ['path'] });
  });
});

// These are the shared value rules that later levels apply (their criteria are proven where the level is parsed, T003 to T007).
describe('F-02 shared value rules used by the block and argument levels', () => {
  it.each([
    { label: 'text', value: 'Specify the feature', ok: true },
    { label: 'text with surrounding spaces', value: '  padded  ', ok: true },
    { label: 'an empty text', value: '', ok: false },
    { label: 'a blank text', value: '   ', ok: false },
    { label: 'a number', value: 7, ok: false },
    { label: 'null', value: null, ok: false },
  ])('F-02 shared rule, non-blank text: $label', ({ value, ok }) => {
    expect(run(nonBlankText, value).paths).toEqual(ok ? [] : ['path']);
  });

  it.each([
    { label: 'one', value: 1, ok: true },
    { label: 'a large whole number', value: 400, ok: true },
    { label: 'zero', value: 0, ok: false },
    { label: 'a negative number', value: -1, ok: false },
    { label: 'a fraction', value: 1.5, ok: false },
    { label: 'NaN', value: Number.NaN, ok: false },
    { label: 'infinity', value: Number.POSITIVE_INFINITY, ok: false },
    { label: 'a numeric string', value: '2', ok: false },
    { label: 'a value beyond the safe integer range', value: 2 ** 53, ok: false },
  ])('F-02 shared rule, positive whole number: $label', ({ value, ok }) => {
    expect(run(positiveWholeNumber, value).paths).toEqual(ok ? [] : ['path']);
  });

  it.each([
    { label: 'true', value: true, ok: true },
    { label: 'false', value: false, ok: true },
    { label: 'the string "true"', value: 'true', ok: false },
    { label: 'the number 1', value: 1, ok: false },
    { label: 'no value', value: undefined, ok: false },
  ])('F-02 shared rule, boolean: $label', ({ value, ok }) => {
    expect(run(booleanValue, value).paths).toEqual(ok ? [] : ['path']);
  });

  it.each([
    { label: 'the first option', value: 'checks', ok: true },
    { label: 'the second option', value: 'diff size', ok: true },
    { label: 'a different case', value: 'Checks', ok: false },
    { label: 'an empty value', value: '', ok: false },
    { label: 'no value', value: undefined, ok: false },
  ])('F-02 shared rule, enum: $label', ({ value, ok }) => {
    const check = (v: unknown, path: string, problems: Problems) =>
      enumValue(v, ['checks', 'diff size'] as const, path, problems);
    expect(run(check, value).paths).toEqual(ok ? [] : ['path']);
  });
});

describe('F-02 AC-004 unknown-key check (each level applies it to its own keys)', () => {
  it.each([
    { label: 'no extra keys', object: { id: 'a', name: 'b' }, paths: [] },
    { label: 'one unknown key', object: { id: 'a', colour: 'red' }, paths: ['rules[0].colour'] },
    {
      label: 'two unknown keys, in document order',
      object: { id: 'a', x: 1, y: 2 },
      paths: ['rules[0].x', 'rules[0].y'],
    },
  ])('F-02 AC-004 checks $label', ({ object, paths }) => {
    const problems = createProblems();
    checkKeys(object, ['id', 'name'], 'rules[0]', problems);
    expect(problems.list.map((p) => p.path)).toEqual(paths);
  });
});
