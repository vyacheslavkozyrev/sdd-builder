import { describe, expect, it } from 'vitest';
import { DEFAULT_CONNECTIONS, DEFAULT_STEP_CATALOG, DEFAULT_WORKFLOWS, defaultConditions, getCatalogStep } from '../src/index.js';
import type { GateType } from '../src/index.js';

const FIXED_GATES: readonly GateType[] = ['approval', 'checks', 'review', 'diff-size'];

describe('F-02 T003 catalog', () => {
  it('F-02 AC-006 catalog marks the required steps of the reference process as required', () => {
    const required = DEFAULT_STEP_CATALOG.filter((s) => s.required).map((s) => s.id);
    expect(required).toEqual(expect.arrayContaining(['define-feature', 'plan', 'implement', 'code-review', 'unit-tests', 'commit', 'verify']));
    expect(DEFAULT_STEP_CATALOG.find((s) => s.id === 'e2e-tests')?.required).toBe(false);
  });

  it('F-02 AC-006 every required catalog step is enabled in its workflow', () => {
    for (const workflow of DEFAULT_WORKFLOWS.filter((w) => w.enabled)) {
      for (const entry of workflow.steps) {
        const step = getCatalogStep(entry.stepId);
        if (step.required) {
          expect(entry.enabled, `${step.id} in ${workflow.id}`).toBe(true);
        }
      }
    }
  });

  it('F-02 AC-007 every catalog gate uses one of the four fixed gate types', () => {
    for (const condition of defaultConditions()) {
      expect(FIXED_GATES).toContain(condition.gate.type);
    }
  });

  it('catalog step ids are unique', () => {
    const ids = DEFAULT_STEP_CATALOG.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('describes the map as Specify, Implement, Verify and Release', () => {
    expect(DEFAULT_CONNECTIONS.map((c) => `${c.from}>${c.to}`)).toEqual(['specify>implement-cycle', 'implement-cycle>verify-feature', 'verify-feature>release-project']);
    expect(getCatalogStep('plan').kind).toBe('command');
    expect(() => getCatalogStep('nope')).toThrow('Unknown catalog step id: nope');
  });
});
