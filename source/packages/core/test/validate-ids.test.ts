import { describe, expect, it } from 'vitest';
import { assertValidConfig, InvalidConfigError, validateConfig } from '../src/index.js';
import { baseConfig } from './fixtures.js';

describe('F-02 T005 duplicate ids', () => {
  it('F-02 AC-001 a valid default configuration has no duplicate ids', () => {
    expect(validateConfig(baseConfig())).toEqual([]);
    expect(() => assertValidConfig(baseConfig())).not.toThrow();
  });

  it('F-02 AC-001 a custom step with a catalog step id names both occurrences', () => {
    const config = baseConfig({
      customSteps: [{ id: 'verify', name: 'Verify again', summary: '', kind: 'command', origin: 'custom', required: false, consumes: [], produces: [], ruleTags: [], body: '' }],
    });
    const problems = validateConfig(config);
    expect(problems).toEqual(['duplicate id "verify": defined as catalog step and custom step']);
  });

  it('F-02 AC-001 a custom step that repeats a custom step id is refused', () => {
    const step = { id: 'lint-report', name: 'Lint report', summary: '', kind: 'script' as const, origin: 'custom' as const, required: false, consumes: [], produces: [], ruleTags: [], body: '' };
    expect(validateConfig(baseConfig({ customSteps: [step, { ...step, name: 'Other' }] }))).toEqual([
      'duplicate id "lint-report": defined as custom step and custom step',
    ]);
  });

  it('F-02 AC-011 every duplicate is listed in one InvalidConfigError', () => {
    const custom = (id: string) => ({ id, name: id, summary: '', kind: 'script' as const, origin: 'custom' as const, required: false, consumes: [], produces: [], ruleTags: [], body: '' });
    const config = baseConfig({ customSteps: [custom('plan'), custom('commit'), custom('commit')] });
    let caught: unknown;
    try {
      assertValidConfig(config);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(InvalidConfigError);
    expect((caught as InvalidConfigError).problems).toHaveLength(2);
  });
});
