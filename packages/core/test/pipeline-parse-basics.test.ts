import { describe, expect, it } from 'vitest';
import { isValidId } from '../src/pipeline/ids.js';
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';

/** The smallest pipeline block list that passes the structure rules: one Start and one End. */
function validBlocks(): Record<string, unknown>[] {
  return [
    { kind: 'start', id: 'start', enabled: true, arguments: [] },
    { kind: 'end', id: 'end', enabled: true },
  ];
}

/** A valid top-level config with the smallest valid pipeline. Tests change one part of a fresh copy. */
function validConfig(): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: { name: 'main-pipeline', blocks: validBlocks() },
  };
}

function problemsOf(value: unknown): PipelineProblem[] {
  const result = parsePipelineConfig(value);
  if (result.ok) throw new Error('expected the config to be refused');
  return result.problems;
}

function paths(problems: PipelineProblem[]): string[] {
  return problems.map((problem) => problem.path);
}

describe('F-01 AC-018 a value that is not an object gives one problem at the empty path', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'config'],
    ['a number', 2],
    ['a boolean', true],
    ['an array', [validConfig()]],
  ])('refuses %s with one problem at the root', (_label, value) => {
    expect(problemsOf(value)).toEqual([{ path: '', message: 'must be an object' }]);
  });

  it('accepts a valid object without problems', () => {
    const result = parsePipelineConfig(validConfig());
    expect(result.ok).toBe(true);
  });
});

describe('F-01 AC-019 a missing or wrong-typed field gives a problem with its path', () => {
  it.each(['schemaVersion', 'name', 'idea', 'stack', 'pipeline'])(
    'reports %s as required when it is missing',
    (key) => {
      const config = validConfig();
      delete config[key];
      expect(problemsOf(config)).toEqual([{ path: key, message: 'is required' }]);
    },
  );

  it.each([
    ['name', 42, 'must be a string'],
    ['idea', null, 'must be a string'],
    ['stack', 'TypeScript', 'must be an object'],
    ['pipeline', [], 'must be an object'],
  ])('refuses %s of the wrong type with the message "%s"', (key, bad, message) => {
    const config = validConfig();
    config[key] = bad;
    expect(problemsOf(config)).toEqual([{ path: key, message }]);
  });

  it('reports a missing stack language and a missing pipeline blocks list at their nested paths', () => {
    const config = validConfig();
    config['stack'] = {};
    config['pipeline'] = { name: 'main-pipeline' };
    expect(problemsOf(config)).toEqual([
      { path: 'stack.language', message: 'is required' },
      { path: 'pipeline.blocks', message: 'is required' },
    ]);
  });

  it('returns every problem, not only the first', () => {
    const config = validConfig();
    config['schemaVersion'] = 1;
    config['name'] = 7;
    delete config['idea'];
    config['stack'] = { language: 3 };
    config['pipeline'] = { name: 'main-pipeline', blocks: 'none' };
    expect(paths(problemsOf(config))).toEqual([
      'schemaVersion',
      'name',
      'idea',
      'stack.language',
      'pipeline.blocks',
    ]);
  });
});

describe('F-01 AC-020 an unknown key gives a problem with the key path', () => {
  it('refuses an unknown key at the root', () => {
    const config = validConfig();
    config['extra'] = true;
    expect(problemsOf(config)).toEqual([{ path: 'extra', message: 'is not a known key' }]);
  });

  it('refuses an unknown key inside stack', () => {
    const config = validConfig();
    config['stack'] = { language: 'TypeScript', colour: 'blue' };
    expect(problemsOf(config)).toEqual([{ path: 'stack.colour', message: 'is not a known key' }]);
  });

  it('refuses an unknown key inside pipeline', () => {
    const config = validConfig();
    config['pipeline'] = { name: 'main-pipeline', blocks: validBlocks(), notes: 'x' };
    expect(problemsOf(config)).toEqual([{ path: 'pipeline.notes', message: 'is not a known key' }]);
  });
});

describe('F-01 AC-021 ids follow the id rule', () => {
  it.each(['start', 'main-flow', 'a1', 'review-2-fix'])('accepts %s', (id) => {
    expect(isValidId(id)).toBe(true);
  });

  it.each(['', 'Main', 'main flow', 'main/flow', 'main.flow', '1main', '-main', 'main_flow', 'héllo', 'main\n'])(
    'refuses %j',
    (id) => {
      expect(isValidId(id)).toBe(false);
    },
  );

  it('accepts a pipeline name in free text, since the pipeline name is not a file id', () => {
    const config = validConfig();
    config['pipeline'] = { name: 'Main Pipeline', blocks: validBlocks() };
    expect(parsePipelineConfig(config).ok).toBe(true);
  });
});

describe('F-01 AC-023 schemaVersion must be 2', () => {
  it('accepts schemaVersion 2', () => {
    expect(parsePipelineConfig(validConfig()).ok).toBe(true);
  });

  it.each([1, 3, 0, '2', 2.5, null, true])('refuses schemaVersion %j with a problem at schemaVersion', (bad) => {
    const config = validConfig();
    config['schemaVersion'] = bad;
    expect(problemsOf(config)).toEqual([{ path: 'schemaVersion', message: 'must be 2' }]);
  });
});
