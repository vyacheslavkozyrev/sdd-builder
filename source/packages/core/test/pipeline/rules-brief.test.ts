import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { parseProjectConfig } from '../../src/pipeline/parse/index.js';
import { readRules } from '../../src/pipeline/parse/rules.js';

const validRoot = { schemaVersion: 2, rules: [], pipeline: {} };
const validRule = { id: 'style', title: 'Style', text: 'Keep it short.' };

describe('F-02 AC-066 a rule requires id, title and text', () => {
  it('accepts a rule with exactly id, title and text', () => {
    expect(parseProjectConfig({ ...validRoot, rules: [validRule] })).toEqual([]);
  });

  it.each(['id', 'title', 'text'])('refuses a rule missing %s with a problem at the rule path', (key) => {
    const rule: Record<string, unknown> = { ...validRule };
    delete rule[key];
    expect(parseProjectConfig({ ...validRoot, rules: [rule] })).toEqual([
      { path: 'rules.0', message: `is missing the key ${key}` },
    ]);
  });

  it('refuses a rule with an unknown key with a problem at the rule path', () => {
    expect(parseProjectConfig({ ...validRoot, rules: [{ ...validRule, owner: 'me' }] })).toEqual([
      { path: 'rules.0', message: 'has an unknown key owner' },
    ]);
  });

  it('refuses a rule id that does not follow the id rule, at the path of the id', () => {
    expect(parseProjectConfig({ ...validRoot, rules: [{ ...validRule, id: 'Style Rule' }] })).toEqual([
      { path: 'rules.0.id', message: expect.stringContaining('must be an id') },
    ]);
  });

  it('refuses a rule that is not an object, at the rule path', () => {
    expect(parseProjectConfig({ ...validRoot, rules: ['style'] })).toEqual([
      { path: 'rules.0', message: expect.stringContaining('must be an object') },
    ]);
  });

  it('reports each invalid rule and keeps checking the rules after it', () => {
    expect(
      parseProjectConfig({
        ...validRoot,
        rules: [{ id: 'a' }, validRule, { ...validRule, id: 'B' }],
      }),
    ).toEqual([
      { path: 'rules.0', message: 'is missing the key title' },
      { path: 'rules.0', message: 'is missing the key text' },
      { path: 'rules.2.id', message: expect.stringContaining('must be an id') },
    ]);
  });
});

describe('F-02 AC-067 a rule title is at most 100 and a rule text at most 1,000 code points', () => {
  it('accepts a title of 100 code points', () => {
    expect(parseProjectConfig({ ...validRoot, rules: [{ ...validRule, title: 'a'.repeat(100) }] })).toEqual([]);
  });

  it('refuses a title of 101 code points with a problem at the path rules.0.title', () => {
    expect(parseProjectConfig({ ...validRoot, rules: [{ ...validRule, title: 'a'.repeat(101) }] })).toEqual([
      { path: 'rules.0.title', message: 'must be at most 100 characters' },
    ]);
  });

  it('accepts a text of 1,000 code points', () => {
    expect(parseProjectConfig({ ...validRoot, rules: [{ ...validRule, text: 'a'.repeat(1000) }] })).toEqual([]);
  });

  it('refuses a text of 1,001 code points with a problem at the path rules.0.text', () => {
    expect(parseProjectConfig({ ...validRoot, rules: [{ ...validRule, text: 'a'.repeat(1001) }] })).toEqual([
      { path: 'rules.0.text', message: 'must be at most 1000 characters' },
    ]);
  });
});

describe('F-02 AC-066 invalid rules are dropped and the others are kept', () => {
  it('returns the rules that parse, in document order, and reports the invalid ones', () => {
    const problems = createProblemCollector();
    const second = { id: 'second', title: 'Second', text: 'Keep it plain.' };
    const rules = readRules([{ id: 'a' }, validRule, { ...validRule, id: 'B' }, second], 'rules', problems);
    expect(rules).toEqual([
      { ...validRule, index: 1 },
      { ...second, index: 3 },
    ]);
    expect(problems.list().map((problem) => problem.path)).toEqual(['rules.0', 'rules.0', 'rules.2.id']);
  });

  it('returns undefined and one problem when rules is not a list', () => {
    const problems = createProblemCollector();
    expect(readRules({ id: 'style' }, 'rules', problems)).toBeUndefined();
    expect(problems.list()).toEqual([{ path: 'rules', message: expect.stringContaining('must be a list') }]);
  });
});

describe('F-02 AC-066 AC-074 AC-076 malformed values are reported at their path and never thrown', () => {
  it.each([
    ['rules is a number', { ...validRoot, rules: 5 }, ['rules']],
    ['rules holds null, a list, text and a number', { ...validRoot, rules: [null, [], 'x', 7] }, [
      'rules.0',
      'rules.1',
      'rules.2',
      'rules.3',
    ]],
    ['a rule has values of the wrong type', { ...validRoot, rules: [{ id: null, title: {}, text: [] }] }, [
      'rules.0.id',
      'rules.0.title',
      'rules.0.text',
    ]],
    ['stack is null', { ...validRoot, stack: null }, ['stack']],
    ['a stack field is a number', { ...validRoot, stack: { language: 7 } }, ['stack.language']],
    ['name is null', { ...validRoot, name: null }, ['name']],
    ['idea is a list', { ...validRoot, idea: ['text'] }, ['idea']],
  ])('%s', (_label, input, paths) => {
    let problems: readonly { readonly path: string }[] = [];
    expect(() => {
      problems = parseProjectConfig(input);
    }).not.toThrow();
    expect(problems.map((problem) => problem.path)).toEqual(paths);
  });
});

describe('F-02 AC-069 the rules list may be empty', () => {
  it('accepts a pipeline with no rules and no rule tags', () => {
    expect(parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: { flows: [] } })).toEqual([]);
  });
});

describe('F-02 AC-074 the brief fields may be absent', () => {
  it('accepts a config without name, idea, architecture and stack', () => {
    expect(parseProjectConfig(validRoot)).toEqual([]);
  });

  it('accepts a name of 100 code points', () => {
    expect(parseProjectConfig({ ...validRoot, name: 'a'.repeat(100) })).toEqual([]);
  });

  it('refuses a name of 101 code points with a problem at the path name', () => {
    expect(parseProjectConfig({ ...validRoot, name: 'a'.repeat(101) })).toEqual([
      { path: 'name', message: expect.stringContaining('at most 100') },
    ]);
  });
});

describe('F-02 AC-075 idea and architecture are at most 5,000 code points', () => {
  it.each(['idea', 'architecture'])('accepts %s of 5,000 code points', (key) => {
    expect(parseProjectConfig({ ...validRoot, [key]: 'a'.repeat(5000) })).toEqual([]);
  });

  it.each(['idea', 'architecture'])('refuses %s of 5,001 code points with a problem at its path', (key) => {
    expect(parseProjectConfig({ ...validRoot, [key]: 'a'.repeat(5001) })).toEqual([
      { path: key, message: expect.stringContaining('at most 5000') },
    ]);
  });
});

describe('F-02 AC-076 stack holds five optional text fields of up to 100 code points', () => {
  const fields = ['language', 'framework', 'platform', 'buildTool', 'testFramework'];

  it('accepts a stack with all five fields', () => {
    const stack = Object.fromEntries(fields.map((key) => [key, 'x']));
    expect(parseProjectConfig({ ...validRoot, stack })).toEqual([]);
  });

  it('accepts an empty stack object', () => {
    expect(parseProjectConfig({ ...validRoot, stack: {} })).toEqual([]);
  });

  it.each(fields)('accepts %s of 100 code points and refuses 101 with its path', (key) => {
    expect(parseProjectConfig({ ...validRoot, stack: { [key]: 'a'.repeat(100) } })).toEqual([]);
    expect(parseProjectConfig({ ...validRoot, stack: { [key]: 'a'.repeat(101) } })).toEqual([
      { path: `stack.${key}`, message: expect.stringContaining('at most 100') },
    ]);
  });

  it('refuses an unknown stack key with a problem at its path', () => {
    expect(parseProjectConfig({ ...validRoot, stack: { database: 'postgres' } })).toEqual([
      { path: 'stack.database', message: 'is not a known key' },
    ]);
  });

  it('refuses stack given as a string with a problem at the path stack', () => {
    expect(parseProjectConfig({ ...validRoot, stack: 'typescript' })).toEqual([
      { path: 'stack', message: expect.stringContaining('must be an object') },
    ]);
  });
});

describe('F-02 AC-088 length limits count code points, not UTF-16 units', () => {
  const emoji = '\u{1F600}';

  it('accepts a name of 100 emoji and refuses 101 emoji', () => {
    expect(parseProjectConfig({ ...validRoot, name: emoji.repeat(100) })).toEqual([]);
    expect(parseProjectConfig({ ...validRoot, name: emoji.repeat(101) })).toEqual([
      { path: 'name', message: expect.stringContaining('at most 100') },
    ]);
  });

  it('accepts a stack field of 100 emoji and refuses 101 emoji', () => {
    expect(parseProjectConfig({ ...validRoot, stack: { language: emoji.repeat(100) } })).toEqual([]);
    expect(parseProjectConfig({ ...validRoot, stack: { language: emoji.repeat(101) } })).toEqual([
      { path: 'stack.language', message: expect.stringContaining('at most 100') },
    ]);
  });

  it.each(['idea', 'architecture'])('accepts %s of 5,000 emoji and refuses 5,001 emoji', (key) => {
    expect(parseProjectConfig({ ...validRoot, [key]: emoji.repeat(5000) })).toEqual([]);
    expect(parseProjectConfig({ ...validRoot, [key]: emoji.repeat(5001) })).toEqual([
      { path: key, message: expect.stringContaining('at most 5000') },
    ]);
  });

  it('accepts a rule title of 100 emoji and refuses 101 emoji', () => {
    expect(parseProjectConfig({ ...validRoot, rules: [{ ...validRule, title: emoji.repeat(100) }] })).toEqual([]);
    expect(parseProjectConfig({ ...validRoot, rules: [{ ...validRule, title: emoji.repeat(101) }] })).toEqual([
      { path: 'rules.0.title', message: expect.stringContaining('at most 100') },
    ]);
  });

  it('accepts a rule text of 1,000 emoji and refuses 1,001 emoji', () => {
    expect(parseProjectConfig({ ...validRoot, rules: [{ ...validRule, text: emoji.repeat(1000) }] })).toEqual([]);
    expect(parseProjectConfig({ ...validRoot, rules: [{ ...validRule, text: emoji.repeat(1001) }] })).toEqual([
      { path: 'rules.0.text', message: expect.stringContaining('at most 1000') },
    ]);
  });
});
