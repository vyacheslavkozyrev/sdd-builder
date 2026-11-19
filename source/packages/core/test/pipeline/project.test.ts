import { describe, expect, it } from 'vitest';
import { parseProjectConfig } from '../../src/pipeline/parse/index.js';

const validRoot = { schemaVersion: 2, rules: [], pipeline: {} };

describe('F-02 AC-002 schemaVersion must be the number 2', () => {
  const cases: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
    ['1', { ...validRoot, schemaVersion: 1 }],
    ['3', { ...validRoot, schemaVersion: 3 }],
    ['the string "2"', { ...validRoot, schemaVersion: '2' }],
    ['missing', { rules: [], pipeline: {} }],
  ];

  it.each(cases)('refuses schemaVersion %s with a problem at the path schemaVersion', (_label, input) => {
    expect(parseProjectConfig(input)).toEqual([expect.objectContaining({ path: 'schemaVersion' })]);
  });
});

describe('F-02 AC-003 an input that is not an object is refused at the root', () => {
  it.each([null, [], 'config', 7, undefined])('refuses %j with one problem at the root path', (input) => {
    expect(parseProjectConfig(input)).toEqual([
      { path: 'root', message: expect.stringContaining('must be an object') },
    ]);
  });
});

describe('F-02 AC-004 a missing required top-level key is refused at its path', () => {
  it('refuses a config without rules with a problem at rules', () => {
    expect(parseProjectConfig({ schemaVersion: 2, pipeline: {} })).toEqual([
      { path: 'rules', message: 'is required' },
    ]);
  });

  it('refuses a config without pipeline with a problem at pipeline', () => {
    expect(parseProjectConfig({ schemaVersion: 2, rules: [] })).toEqual([
      { path: 'pipeline', message: 'is required' },
    ]);
  });

  it('reports a missing required key after the problems of the keys that are present', () => {
    expect(parseProjectConfig({ schemaVersion: 1, extra: true })).toEqual([
      { path: 'schemaVersion', message: expect.stringContaining('must be the number 2') },
      { path: 'extra', message: 'is not a known key' },
      { path: 'rules', message: 'is required' },
      { path: 'pipeline', message: 'is required' },
    ]);
  });
});

describe('F-02 AC-005 every problem is returned, in document order', () => {
  it('returns one problem for each of three errors in three places, not only the first', () => {
    const input = { schemaVersion: 1, extra: true, rules: 'none', pipeline: {} };
    expect(parseProjectConfig(input)).toEqual([
      { path: 'schemaVersion', message: expect.stringContaining('must be the number 2') },
      { path: 'extra', message: 'is not a known key' },
      { path: 'rules', message: expect.stringContaining('must be a list') },
    ]);
  });
});

describe('F-02 AC-007 an unknown key at the root is refused and named by its path', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['a key the root does not declare', 'connectedTo'],
    ['a key that differs from a known one by case', 'Name'],
    ['an empty key', ''],
    ['a key named like an object prototype member', '__proto__'],
  ];

  it.each(cases)('refuses %s (%j) with a problem at its path', (_label, key) => {
    const input = JSON.parse(`{"schemaVersion":2,"rules":[],"pipeline":{},${JSON.stringify(key)}:1}`) as unknown;
    expect(parseProjectConfig(input)).toEqual([{ path: key, message: 'is not a known key' }]);
  });

  it('lists every unknown key, each with its own path, in document order', () => {
    expect(parseProjectConfig({ ...validRoot, zeta: 1, alpha: 2 })).toEqual([
      { path: 'zeta', message: 'is not a known key' },
      { path: 'alpha', message: 'is not a known key' },
    ]);
  });
});

describe('F-02 AC-010 an absent optional key is accepted; the same key with null is refused', () => {
  it('accepts a root with no optional keys', () => {
    expect(parseProjectConfig(validRoot)).toEqual([]);
  });

  it.each(['name', 'idea', 'architecture', 'stack'])('refuses %s set to null with a problem at its path', (key) => {
    expect(parseProjectConfig({ ...validRoot, [key]: null })).toEqual([
      { path: key, message: expect.stringContaining('must be') },
    ]);
  });
});
