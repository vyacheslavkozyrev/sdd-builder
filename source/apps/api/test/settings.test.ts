import { describe, expect, it } from 'vitest';
import { readSettings, type Environment } from '../src/settings.js';

describe('F-14 AC-020 PORT', () => {
  it.each([
    ['unset', {}, 3000],
    ['8080', { PORT: '8080' }, 8080],
    ['1 (lower bound)', { PORT: '1' }, 1],
    ['65535 (upper bound)', { PORT: '65535' }, 65535],
  ])('listens on the port when PORT is %s', (_label, env: Environment, port) => {
    expect(readSettings(env).port).toBe(port);
  });
});

describe('F-14 AC-021 PORT refusal', () => {
  it.each([
    ['0', '0'],
    ['65536', '65536'],
    ['80.5', '80.5'],
    ['abc', 'abc'],
    ['a negative number', '-1'],
    ['an empty string', ''],
  ])('refuses PORT set to %s, and the error names PORT only', (_label, value) => {
    expect(() => readSettings({ PORT: value })).toThrowError(/^Invalid PORT: /);
    expect(() => readSettings({ PORT: value })).not.toThrowError(/SDDBUILDER_ANALYZER_MODEL|ANTHROPIC_API_KEY/);
  });
});

describe('F-14 AC-022 SDDBUILDER_ANALYZER_MODEL', () => {
  it.each([
    ['unset', {}, 'claude-sonnet-5-5'],
    ['set to a model name', { SDDBUILDER_ANALYZER_MODEL: 'claude-opus-5-5' }, 'claude-opus-5-5'],
    ['an empty string', { SDDBUILDER_ANALYZER_MODEL: '' }, 'claude-sonnet-5-5'],
    ['only spaces', { SDDBUILDER_ANALYZER_MODEL: '   ' }, 'claude-sonnet-5-5'],
  ])('uses the model when SDDBUILDER_ANALYZER_MODEL is %s', (_label, env: Environment, model) => {
    expect(readSettings(env).analyzerModel).toBe(model);
  });
});

describe('F-14 AC-023 ANTHROPIC_API_KEY is not an error when absent', () => {
  it.each([
    ['unset', {}, undefined],
    ['set', { ANTHROPIC_API_KEY: 'key-value' }, 'key-value'],
    ['an empty string', { ANTHROPIC_API_KEY: '' }, undefined],
    ['only spaces', { ANTHROPIC_API_KEY: '   ' }, undefined],
  ])('reads the key when ANTHROPIC_API_KEY is %s without failing', (_label, env: Environment, apiKey) => {
    expect(readSettings(env).apiKey).toBe(apiKey);
  });
});
