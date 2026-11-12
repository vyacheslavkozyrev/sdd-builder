import { describe, expect, it } from 'vitest';
import { validateConfig, type ProjectConfig } from '../src/index.js';
import { baseConfig } from './fixtures.js';

function withWorkflow(config: ProjectConfig, id: string, change: (w: ProjectConfig['workflows'][number]) => ProjectConfig['workflows'][number]): ProjectConfig {
  return { ...config, workflows: config.workflows.map((w) => (w.id === id ? change(w) : w)) };
}

describe('F-02 T008 required steps, gates, limits and custom steps', () => {
  it('a default configuration passes the policy checks', () => {
    expect(validateConfig(baseConfig())).toEqual([]);
  });

  it('F-02 AC-006 a required step missing from its workflow is refused', () => {
    const config = withWorkflow(baseConfig(), 'implement-cycle', (w) => ({ ...w, steps: w.steps.filter((s) => s.stepId !== 'commit') }));
    expect(validateConfig(config)).toEqual(['workflow "implement-cycle": required step "commit" is missing']);
  });

  it('F-02 AC-006 a required step switched off is refused', () => {
    const config = withWorkflow(baseConfig(), 'implement-cycle', (w) => ({ ...w, steps: w.steps.map((s) => (s.stepId === 'code-review' ? { ...s, enabled: false } : s)) }));
    expect(validateConfig(config)).toEqual(['workflow "implement-cycle": required step "code-review" is disabled']);
  });

  it('F-02 AC-006 a required workflow that is missing is refused', () => {
    const base = baseConfig();
    const config = { ...base, workflows: base.workflows.filter((w) => w.id !== 'specify'), connections: base.connections.filter((c) => c.from !== 'specify') };
    expect(validateConfig(config)).toEqual(['required workflow "specify" is missing or disabled']);
  });

  it('F-02 AC-006 a required gate missing from its workflow is refused', () => {
    const config = withWorkflow(baseConfig(), 'implement-cycle', (w) => ({ ...w, conditions: w.conditions.filter((c) => c.id !== 'review-clean') }));
    expect(validateConfig(config)).toEqual(['workflow "implement-cycle": required gate "review-clean" is missing']);
  });

  it('F-02 AC-007 an unknown gate type is refused', () => {
    const config = withWorkflow(baseConfig(), 'implement-cycle', (w) => ({
      ...w,
      conditions: w.conditions.map((c) => (c.id === 'checks-unit' ? { ...c, gate: { ...c.gate, type: 'shell' as never } } : c)),
    }));
    expect(validateConfig(config)).toEqual([
      'condition "checks-unit": gate type "shell" is not one of approval, checks, review, diff-size',
    ]);
  });

  it('F-02 AC-008 a round limit that is zero, negative or fractional is refused', () => {
    for (const roundLimit of [0, -1, 1.5]) {
      const config = withWorkflow(baseConfig(), 'implement-cycle', (w) => ({
        ...w,
        conditions: w.conditions.map((c) => (c.id === 'review-clean' ? { ...c, roundLimit } : c)),
      }));
      expect(validateConfig(config)).toEqual([
        `condition "review-clean": round limit must be a positive integer, got ${roundLimit}`,
      ]);
    }
  });

  it('F-02 AC-008 a positive whole round limit and an absent one are both accepted', () => {
    const withLimit = withWorkflow(baseConfig(), 'implement-cycle', (w) => ({
      ...w,
      conditions: w.conditions.map((c) => (c.id === 'review-clean' ? { ...c, roundLimit: 2 } : c)),
    }));
    expect(validateConfig(withLimit)).toEqual([]);
    expect(validateConfig(baseConfig())).toEqual([]);
  });

  it('F-02 AC-009 a custom step marked required is refused', () => {
    const custom = { id: 'security-review', name: 'Security review', summary: '', kind: 'command' as const, origin: 'custom' as const, required: true, consumes: [], produces: [], ruleTags: [], body: '' };
    expect(validateConfig(baseConfig({ customSteps: [custom] }))).toEqual(['custom step "security-review" cannot be required']);
  });

  it('F-02 AC-007 a connection gate with an unknown type is refused', () => {
    const config = baseConfig();
    const connections = config.connections.map((c) => (c.id === 'specify-implement' ? { ...c, gate: { id: 'g', type: 'wish' as never, required: false } } : c));
    expect(validateConfig({ ...config, connections })).toEqual([
      'connection "specify-implement": gate type "wish" is not one of approval, checks, review, diff-size',
    ]);
  });
});
