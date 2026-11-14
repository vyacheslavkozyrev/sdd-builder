import { describe, expect, it } from 'vitest';
import { renderRules, type Workflow } from '../src/index.js';
import { baseConfig, connection, workflow } from './fixtures.js';

function implementCycle(): Workflow {
  const found = baseConfig().workflows.find((w) => w.id === 'implement-cycle');
  if (!found) {
    throw new Error('default implement-cycle workflow missing');
  }
  return found;
}

describe('F-02 T013 gate and branch rules', () => {
  it('F-02 AC-018 a quality gate after a step becomes a stop rule', () => {
    const rules = renderRules(baseConfig(), implementCycle());
    expect(rules).toContain('1. After step 1 (Implement): unless the staged change is at most 400 lines, stop and report. Otherwise continue.');
  });

  it('F-02 AC-017 a retry with no round limit says so', () => {
    const rules = renderRules(baseConfig(), implementCycle());
    expect(rules).toContain(
      '2. After step 2 (Code review): unless the review reports no blocker or warning, go back to step 1 (Implement), retrying until it passes (no limit set). Otherwise continue.',
    );
  });

  it('F-02 AC-017 a retry with a round limit states the limit and what happens when it is reached', () => {
    const base = baseConfig();
    const config = {
      ...base,
      workflows: base.workflows.map((w) =>
        w.id === 'implement-cycle'
          ? { ...w, conditions: w.conditions.map((c) => (c.id === 'review-clean' ? { ...c, roundLimit: 2 } : c)) }
          : w,
      ),
    };
    const rules = renderRules(config, config.workflows.find((w) => w.id === 'implement-cycle')!);
    expect(rules).toContain('retrying at most 2 times; if the limit is reached, stop and report');
  });

  it('F-02 AC-018 a gate on a map connection becomes a precondition at the top of the downstream workflow', () => {
    const base = baseConfig();
    const gated = {
      ...base,
      connections: base.connections.map((c) => (c.id === 'specify-implement' ? { ...c, gate: { id: 'approve', type: 'approval' as const, required: true } } : c)),
    };
    const rules = renderRules(gated, gated.workflows.find((w) => w.id === 'implement-cycle')!);
    expect(rules.split('\n')[0]).toBe('1. Precondition: unless the output of Specify is approved by the user, stop and report.');
  });

  it('F-02 AC-017 a workflow without rules has no rules text', () => {
    const plain = workflow('plain', { steps: [{ stepId: 'release', enabled: true }] });
    expect(renderRules(baseConfig({ connections: [] }), plain)).toBe('');
  });

  it('F-02 AC-018 a connection gate into a workflow appears only in that workflow', () => {
    const config = baseConfig({ connections: [connection('specify', 'verify-feature')] });
    const verify = config.workflows.find((w) => w.id === 'verify-feature')!;
    expect(renderRules(config, verify)).not.toContain('Precondition');
  });

  it('F-06 AC-029 a switched-off condition with an unwired output gives no rule', () => {
    const base = baseConfig();
    const cycle = implementCycle();
    const offCycle = {
      ...cycle,
      conditions: cycle.conditions.map((c) =>
        c.id === 'review-clean' ? { ...c, enabled: false, fail: undefined } : c,
      ),
    };
    const text = renderRules(base, offCycle);
    expect(text).not.toContain('review reports no blocker or warning');
    expect(text).toContain('1. After step 1 (Implement)');
    expect(text).not.toContain('After step 2 (Code review)');
  });

  it('F-06 AC-029 a switched-off condition gives the same rules as a removed one', () => {
    const base = baseConfig();
    const cycle = implementCycle();
    const offCycle = {
      ...cycle,
      conditions: cycle.conditions.map((c) => (c.id === 'review-clean' ? { ...c, enabled: false } : c)),
    };
    const removed = { ...cycle, conditions: cycle.conditions.filter((c) => c.id !== 'review-clean') };
    expect(renderRules(base, offCycle)).toBe(renderRules(base, removed));
  });
});
