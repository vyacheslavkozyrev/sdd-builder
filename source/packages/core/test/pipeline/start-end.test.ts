import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readEnd } from '../../src/pipeline/parse/end.js';
import { readStart } from '../../src/pipeline/parse/start.js';

const START = 'pipeline.flows.0.blocks.0';
const END = 'pipeline.flows.0.blocks.5';
const validStart = { id: 'start', kind: 'start', next: 'frame' };
const validEnd = { id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'Brief' };

function readS(value: unknown, path = START) {
  const problems = createProblemCollector();
  const block = readStart(value, path, problems);
  return { block, problems: problems.list() };
}

function readE(value: unknown, path = END) {
  const problems = createProblemCollector();
  const block = readEnd(value, path, problems);
  return { block, problems: problems.list() };
}

describe('F-02 AC-044 a start block requires id, kind and next', () => {
  it('accepts a start with exactly id, kind and next', () => {
    expect(readS(validStart)).toEqual({
      block: { id: 'start', kind: 'start', next: 'frame' },
      problems: [],
    });
  });

  it.each(['id', 'kind', 'next'])('refuses a start missing %s at the block path', (key) => {
    const value: Record<string, unknown> = { ...validStart };
    delete value[key];
    expect(readS(value)).toEqual({
      block: undefined,
      problems: [{ path: START, message: `is missing the key ${key}` }],
    });
  });

  it.each(['description', 'name', 'x'])('refuses a start with the unknown key %s at the path of that key', (key) => {
    expect(readS({ ...validStart, [key]: 'text' })).toEqual({
      block: undefined,
      problems: [{ path: `${START}.${key}`, message: `has an unknown key ${key}` }],
    });
  });

  it('refuses a start whose kind is not start', () => {
    expect(readS({ ...validStart, kind: 'end' })).toEqual({
      block: undefined,
      problems: [{ path: `${START}.kind`, message: 'must be start, got text' }],
    });
  });

  it('refuses a start whose next is not an id, at the path of next', () => {
    expect(readS({ ...validStart, next: 'Frame Step' })).toEqual({
      block: undefined,
      problems: [{ path: `${START}.next`, message: expect.stringContaining('must be an id') }],
    });
  });

  it('refuses a start whose id is not an id, at the path of id', () => {
    expect(readS({ ...validStart, id: 'Start Block' })).toEqual({
      block: undefined,
      problems: [{ path: `${START}.id`, message: expect.stringContaining('must be an id') }],
    });
  });

  it.each([['start'], [null], [[]], [1]])('refuses the value %j, which is not an object, at the block path', (value) => {
    expect(readS(value)).toEqual({
      block: undefined,
      problems: [{ path: START, message: expect.stringContaining('must be an object') }],
    });
  });
});

describe('F-02 AC-063 an end block requires id, kind, outcome and producedArtifact', () => {
  it('accepts an end with exactly id, kind, outcome and producedArtifact', () => {
    expect(readE(validEnd)).toEqual({
      block: { id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'Brief' },
      problems: [],
    });
  });

  it.each(['id', 'kind', 'outcome', 'producedArtifact'])('refuses an end missing %s at the block path', (key) => {
    const value: Record<string, unknown> = { ...validEnd };
    delete value[key];
    expect(readE(value)).toEqual({
      block: undefined,
      problems: [{ path: END, message: `is missing the key ${key}` }],
    });
  });

  it('refuses an end whose id is not an id, at the path of id', () => {
    expect(readE({ ...validEnd, id: 'End Block' })).toEqual({
      block: undefined,
      problems: [{ path: `${END}.id`, message: expect.stringContaining('must be an id') }],
    });
  });

  it.each([['end'], [null], [[]], [1]])('refuses the value %j, which is not an object, at the block path', (value) => {
    expect(readE(value)).toEqual({
      block: undefined,
      problems: [{ path: END, message: expect.stringContaining('must be an object') }],
    });
  });

  it('accepts the outcome stopped', () => {
    expect(readE({ ...validEnd, outcome: 'stopped' }).block?.outcome).toBe('stopped');
  });

  it.each([['success'], [''], [null], [1]])('refuses the outcome %j at the path of outcome', (outcome) => {
    expect(readE({ ...validEnd, outcome })).toEqual({
      block: undefined,
      problems: [{ path: `${END}.outcome`, message: expect.stringMatching(/^must be done or stopped, got /) }],
    });
  });

  it('refuses an end with the key next at the path of next', () => {
    expect(readE({ ...validEnd, next: 'frame' })).toEqual({
      block: undefined,
      problems: [{ path: `${END}.next`, message: 'has an unknown key next' }],
    });
  });

  it('refuses an empty producedArtifact at the path of producedArtifact', () => {
    expect(readE({ ...validEnd, producedArtifact: '' })).toEqual({
      block: undefined,
      problems: [
        { path: `${END}.producedArtifact`, message: 'must be at least 1 character' },
      ],
    });
  });

  it.each(['a', 'a'.repeat(200), '😀'.repeat(200)])(
    'accepts a producedArtifact at the edges of 1 to 200 characters (%s)',
    (producedArtifact) => {
      expect(readE({ ...validEnd, producedArtifact }).problems).toEqual([]);
    },
  );

  it('refuses a producedArtifact longer than 200 characters', () => {
    expect(readE({ ...validEnd, producedArtifact: 'a'.repeat(201) }).problems).toEqual([
      { path: `${END}.producedArtifact`, message: 'must be at most 200 characters' },
    ]);
  });

  it('refuses a producedArtifact that is not text, at the path of producedArtifact', () => {
    expect(readE({ ...validEnd, producedArtifact: 1 })).toEqual({
      block: undefined,
      problems: [{ path: `${END}.producedArtifact`, message: 'must be text, got a number' }],
    });
  });

  it('refuses an end whose kind is not end', () => {
    expect(readE({ ...validEnd, kind: 'start' })).toEqual({
      block: undefined,
      problems: [{ path: `${END}.kind`, message: 'must be end, got text' }],
    });
  });
});

describe('F-02 AC-008 the retired keys are refused on a start and an end block', () => {
  it.each(['connectedTo', 'checks', 'enabled', 'disabled'])(
    'refuses %s on a start block at the path of that key',
    (key) => {
      expect(readS({ ...validStart, [key]: true })).toEqual({
        block: undefined,
        problems: [{ path: `${START}.${key}`, message: `has an unknown key ${key}` }],
      });
    },
  );

  it.each(['connectedTo', 'checks', 'enabled', 'disabled'])(
    'refuses %s on an end block at the path of that key',
    (key) => {
      expect(readE({ ...validEnd, [key]: true })).toEqual({
        block: undefined,
        problems: [{ path: `${END}.${key}`, message: `has an unknown key ${key}` }],
      });
    },
  );
});
