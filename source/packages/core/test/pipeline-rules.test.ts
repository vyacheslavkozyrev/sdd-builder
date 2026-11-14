import { describe, expect, it } from 'vitest';
import defaultJson from '../../../templates/pipeline/default.json' with { type: 'json' };
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';

/** A valid config with the smallest valid pipeline and no rules. Tests change one part of a fresh copy. */
function validConfig(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: {
      name: 'main-pipeline',
      blocks: [
        { kind: 'start', id: 'start', enabled: true, arguments: [] },
        { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
      ],
    },
    rules: [],
  };
}

function rule(id: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { id, title: `${id} title`, text: `${id} text`, ...extra };
}

function problemsOf(value: unknown): PipelineProblem[] {
  const result = parsePipelineConfig(value);
  if (result.ok) throw new Error('expected the config to be refused');
  return result.problems;
}

describe('F-02 AC-028 the rules list parses into entries with id, title and text', () => {
  it('accepts an empty rules list', () => {
    const result = parsePipelineConfig(validConfig());
    expect(result.ok && result.config.rules).toEqual([]);
  });

  it('returns each entry with its id, title and text, in order', () => {
    const config = validConfig();
    config['rules'] = [rule('code'), rule('qa')];
    const result = parsePipelineConfig(config);
    expect(result.ok && result.config.rules).toEqual([
      { id: 'code', title: 'code title', text: 'code text' },
      { id: 'qa', title: 'qa title', text: 'qa text' },
    ]);
  });

  it('parses the default pipeline with an empty rules list', () => {
    const result = parsePipelineConfig(defaultJson);
    expect(result.ok && result.config.rules).toEqual([]);
  });

  it('reports a missing rules key as required', () => {
    const config = validConfig();
    delete config['rules'];
    expect(problemsOf(config)).toEqual([{ path: 'rules', message: 'is required' }]);
  });

  it.each([
    ['an object', { id: 'code', title: 'Code', text: 'Text' }],
    ['a string', 'code'],
    ['null', null],
  ])('refuses a rules value that is not a list (%s)', (_label, bad) => {
    const config = validConfig();
    config['rules'] = bad;
    expect(problemsOf(config)).toEqual([{ path: 'rules', message: 'must be a list' }]);
  });

  it('refuses a rule that is not an object, at its index', () => {
    const config = validConfig();
    config['rules'] = ['code'];
    expect(problemsOf(config)).toEqual([{ path: 'rules[0]', message: 'must be an object' }]);
  });

  it('refuses an unknown key in a rule, at the path of the key', () => {
    const config = validConfig();
    config['rules'] = [rule('code', { severity: 'high' })];
    expect(problemsOf(config)).toEqual([{ path: 'rules[0].severity', message: 'is not a known key' }]);
  });

  it.each(['title', 'text'])('reports a rule without %s as required', (key) => {
    const config = validConfig();
    const entry = rule('code');
    delete entry[key];
    config['rules'] = [entry];
    expect(problemsOf(config)).toEqual([{ path: `rules[0].${key}`, message: 'is required' }]);
  });

  it.each([
    ['title', 42],
    ['title', null],
    ['text', ['a', 'b']],
    ['text', true],
  ])('refuses a rule whose %s is not a string (%j)', (key, bad) => {
    const config = validConfig();
    config['rules'] = [rule('code', { [key]: bad })];
    expect(problemsOf(config)).toEqual([{ path: `rules[0].${key}`, message: 'must be a string' }]);
  });

  it('reports a rule without an id as required', () => {
    const config = validConfig();
    config['rules'] = [{ title: 'Code', text: 'Text' }];
    expect(problemsOf(config)).toEqual([{ path: 'rules[0].id', message: 'is required' }]);
  });
});

describe('F-02 AC-008 a rule id follows the id rule and is unique among rules', () => {
  it.each([
    ['uppercase letters', 'Code'],
    ['a space', 'code style'],
    ['a dot', 'code.style'],
    ['a leading digit', '1code'],
    ['a path separator', 'code/style'],
    ['an empty string', ''],
  ])('refuses a rule id with %s, at the id path', (_label, id) => {
    const config = validConfig();
    config['rules'] = [rule(id)];
    expect(problemsOf(config)).toEqual([
      { path: 'rules[0].id', message: 'must be lowercase letters, digits and hyphens, starting with a letter' },
    ]);
  });

  it('accepts a rule id of lowercase letters, digits and hyphens', () => {
    const config = validConfig();
    config['rules'] = [rule('code-style-2')];
    expect(parsePipelineConfig(config).ok).toBe(true);
  });

  it('refuses a rule id that repeats another rule id, naming the second path', () => {
    const config = validConfig();
    config['rules'] = [rule('code'), rule('qa'), rule('code')];
    expect(problemsOf(config)).toEqual([{ path: 'rules[2].id', message: 'is already used by another rule' }]);
  });

  it('allows the same id as a block or argument: uniqueness is among rules only', () => {
    const config = validConfig();
    config['rules'] = [rule('start')];
    expect(parsePipelineConfig(config).ok).toBe(true);
  });
});
