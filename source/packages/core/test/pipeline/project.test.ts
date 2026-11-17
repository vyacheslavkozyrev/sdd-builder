import { describe, expect, it } from 'vitest';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';

function rule(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'no-secrets', title: 'No secrets', text: 'Never commit keys.', ...overrides };
}

function validPipeline(): Record<string, unknown> {
  return {
    name: 'Feature flow',
    description: 'Runs one feature from brief to commit.',
    arguments: [],
    flows: [{ id: 'build', name: 'Build', description: 'Builds one task', arguments: '', blocks: [] }],
  };
}

function root(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { schemaVersion: 2, rules: [rule()], pipeline: validPipeline(), ...overrides };
}

function pathsOf(input: unknown): string[] {
  const result = parseProjectConfig(input);
  if (result.ok) {
    return ['<config returned>'];
  }
  return result.problems.map((problem) => problem.path);
}

describe('F-02 AC-002 schemaVersion must be the number 2', () => {
  it.each([
    { label: 'the number 1', value: 1 },
    { label: 'the number 3', value: 3 },
    { label: 'the string "2"', value: '2' },
    { label: 'a missing schemaVersion', value: undefined },
    { label: 'null', value: null },
  ])('F-02 AC-002 refuses $label at the path schemaVersion', ({ value }) => {
    const input = root({ schemaVersion: value });
    if (value === undefined) {
      delete input['schemaVersion'];
    }
    const result = parseProjectConfig(input);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('config');
    expect(pathsOf(input)).toEqual(['schemaVersion']);
  });
});

describe('F-02 AC-003 the root must be an object', () => {
  it.each([
    { label: 'null', value: null },
    { label: 'an array', value: [root()] },
    { label: 'a string', value: 'config' },
    { label: 'a number', value: 42 },
    { label: 'a boolean', value: true },
    { label: 'undefined', value: undefined },
  ])('F-02 AC-003 refuses $label with one problem at the root path', ({ value }) => {
    const result = parseProjectConfig(value);
    expect(result).toEqual({ ok: false, problems: [expect.objectContaining({ path: '' })] });
  });
});

describe('F-02 AC-004 unknown keys at the root and rule levels', () => {
  it('F-02 AC-004 names the unknown key at the root', () => {
    expect(pathsOf(root({ extra: 1 }))).toEqual(['extra']);
  });

  it('F-02 AC-004 names the unknown key of a rule with its index', () => {
    expect(pathsOf(root({ rules: [rule({ extra: true })] }))).toEqual([
      'rules[0].extra',
    ]);
  });
});

describe('F-02 AC-023 rule ids are unique', () => {
  it('F-02 AC-023 refuses a rule id equal to an earlier rule id, at the second rule', () => {
    const input = root({ rules: [rule(), rule({ title: 'Other' })] });
    expect(pathsOf(input)).toEqual(['rules[1].id']);
  });

  it('F-02 AC-023 refuses a third rule that repeats the first id, with its own path', () => {
    const input = root({
      rules: [rule({ id: 'a-rule' }), rule({ id: 'b-rule' }), rule({ id: 'a-rule' })],
    });
    expect(pathsOf(input)).toEqual(['rules[2].id']);
  });

  it('F-02 AC-023 returns the config when the rule ids are distinct', () => {
    const input = root({ rules: [rule({ id: 'a-rule' }), rule({ id: 'b-rule' })] });
    expect(parseProjectConfig(input).ok).toBe(true);
  });
});

describe('F-02 AC-027 a rule needs id, title and text, all non-blank', () => {
  it.each([
    { label: 'no id', value: rule({ id: undefined }), paths: ['rules[0].id'] },
    { label: 'no title', value: rule({ title: undefined }), paths: ['rules[0].title'] },
    { label: 'no text', value: rule({ text: undefined }), paths: ['rules[0].text'] },
    { label: 'a blank title', value: rule({ title: '   ' }), paths: ['rules[0].title'] },
    { label: 'an empty text', value: rule({ text: '' }), paths: ['rules[0].text'] },
    { label: 'a text that is not a string', value: rule({ text: 7 }), paths: ['rules[0].text'] },
    { label: 'an id that is not an id', value: rule({ id: 'No Secrets' }), paths: ['rules[0].id'] },
    { label: 'an unknown key', value: rule({ hint: 'x' }), paths: ['rules[0].hint'] },
    { label: 'a rule that is not an object', value: 'no-secrets', paths: ['rules[0]'] },
  ])('F-02 AC-027 refuses a rule with $label, at its path', ({ value, paths }) => {
    const input = root({ rules: [value] });
    expect(pathsOf(input)).toEqual([...paths]);
  });

  it('F-02 AC-027 refuses rules that are not a list', () => {
    expect(pathsOf(root({ rules: 'none' }))).toEqual(['rules']);
  });

  it('F-02 AC-027 refuses a missing rules list', () => {
    const input = root();
    delete input['rules'];
    expect(pathsOf(input)).toEqual(['rules']);
  });
});

describe('F-02 AC-028 all problems come back in document order', () => {
  it('F-02 AC-028 returns every problem, each with its path and a message', () => {
    const input = root({
      schemaVersion: 1,
      rules: [rule({ title: ' ' }), rule({ id: 'no-secrets' }), rule({ id: 'other-rule', text: 7 })],
    });
    const result = parseProjectConfig(input);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.problems.map((problem) => problem.path)).toEqual([
      'schemaVersion',
      'rules[0].title',
      'rules[1].id',
      'rules[2].text',
    ]);
    for (const problem of result.problems) {
      expect(problem.message).not.toBe('');
    }
  });
});

describe('F-02 AC-028 problems follow the order the keys were written in', () => {
  it('F-02 AC-028 keeps a root key that comes before schemaVersion ahead of it', () => {
    const input = { rules: [rule({ title: ' ' })], schemaVersion: 1, pipeline: validPipeline() };
    expect(pathsOf(input)).toEqual(['rules[0].title', 'schemaVersion']);
  });

  it('F-02 AC-028 puts an unknown root key where it was written, between known keys', () => {
    const input = { rules: [rule({ title: ' ' })], extra: 1, schemaVersion: 1, pipeline: validPipeline() };
    expect(pathsOf(input)).toEqual(['rules[0].title', 'extra', 'schemaVersion']);
  });

  it('F-02 AC-028 reports a duplicate id in the order its key was written, after or before the title', () => {
    const titleFirst = { title: ' ', text: 'Text.', id: 'no-secrets' };
    expect(pathsOf(root({ rules: [rule(), titleFirst] }))).toEqual([
      'rules[1].title',
      'rules[1].id',
    ]);
    const idFirst = { id: 'no-secrets', title: ' ', text: 'Text.' };
    expect(pathsOf(root({ rules: [rule(), idFirst] }))).toEqual([
      'rules[1].id',
      'rules[1].title',
    ]);
  });
});

describe('F-02 AC-029 the parser never throws and returns one of two results', () => {
  it.each([
    { label: 'undefined', value: undefined },
    { label: 'a symbol', value: Symbol('config') },
    { label: 'NaN', value: Number.NaN },
    { label: 'an empty string', value: '' },
    { label: 'an empty object', value: {} },
    { label: 'rules that are a string', value: { schemaVersion: 2, rules: 'x' } },
    { label: 'a rule that is null', value: { schemaVersion: 2, rules: [null] } },
    { label: 'a rule with a number id', value: { schemaVersion: 2, rules: [{ id: 1 }] } },
    { label: 'a rule list with a hole', value: { schemaVersion: 2, rules: [, rule()] } },
    { label: 'a pipeline that is a string', value: root({ pipeline: 'x' }) },
  ])('F-02 AC-029 returns problems and no config for $label', ({ value }) => {
    const result = parseProjectConfig(value);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('config');
    if (!result.ok) {
      expect(result.problems.length).toBeGreaterThan(0);
    }
  });
});
