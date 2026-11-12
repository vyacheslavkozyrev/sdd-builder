import { describe, expect, it } from 'vitest';
import { selectConditions, selectSteps, selectWorkflows } from '../src/index.js';
import { baseConfig, connection, workflow } from './fixtures.js';

describe('F-02 T009 select and order', () => {
  it('F-02 AC-012 workflows follow the map, not the tab order', () => {
    const config = baseConfig({
      workflows: [workflow('w3'), workflow('w2'), workflow('w1')],
      connections: [connection('w1', 'w2'), connection('w2', 'w3')],
    });
    expect(selectWorkflows(config).map((w) => w.id)).toEqual(['w1', 'w2', 'w3']);
  });

  it('F-02 AC-012 unconnected workflows keep their tab order', () => {
    const config = baseConfig({ workflows: [workflow('x'), workflow('y')], connections: [] });
    expect(selectWorkflows(config).map((w) => w.id)).toEqual(['x', 'y']);
  });

  it('F-02 AC-014 a disabled workflow takes no part in the ordering', () => {
    const config = baseConfig({
      workflows: [workflow('a'), workflow('b', { enabled: false }), workflow('c')],
      connections: [],
    });
    expect(selectWorkflows(config).map((w) => w.id)).toEqual(['a', 'c']);
  });

  it('F-02 AC-013 steps follow the tab and disabled steps are dropped', () => {
    const config = baseConfig();
    const implement = config.workflows.find((w) => w.id === 'implement-cycle');
    expect(implement).toBeDefined();
    expect(selectSteps(implement!, config).map((s) => s.stepId)).toEqual(['implement', 'code-review', 'unit-tests', 'commit']);
  });

  it('F-02 AC-013 a condition after a disabled step is not selected', () => {
    const config = baseConfig();
    const implement = config.workflows.find((w) => w.id === 'implement-cycle');
    const ids = selectConditions(implement!).map((c) => c.id);
    expect(ids).toContain('review-clean');
    expect(ids).not.toContain('checks-e2e');
  });
});
