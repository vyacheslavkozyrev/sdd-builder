import { describe, expect, it } from 'vitest';
import { selectSteps, selectWorkflows } from '../src/selection.js';
import { baseConfig, connection, workflow } from './fixtures.js';

describe('F-07 AC-028 selectWorkflows', () => {
  it('F-07 AC-028 orders enabled workflows after the ones connected into them on a map with no cycle', () => {
    const config = baseConfig({
      workflows: [workflow('a'), workflow('b'), workflow('c')],
      connections: [connection('b', 'a')],
    });

    expect(selectWorkflows(config).map((w) => w.id)).toEqual(['b', 'a', 'c']);
  });

  it('F-07 AC-028 leaves a disabled workflow out of the order, so a loop through it is not a cycle', () => {
    const config = baseConfig({
      workflows: [workflow('a'), workflow('b', { enabled: false })],
      connections: [connection('a', 'b'), connection('b', 'a')],
    });

    expect(selectWorkflows(config).map((w) => w.id)).toEqual(['a']);
  });

  it('F-07 AC-028 throws, naming the cycle, for a map whose workflows connect in a loop', () => {
    const config = baseConfig({
      workflows: [workflow('a'), workflow('b')],
      connections: [connection('a', 'b'), connection('b', 'a')],
    });

    expect(() => selectWorkflows(config)).toThrow(/selectWorkflows: the map has a cycle/);
  });
});

describe('F-07 AC-028 selectSteps', () => {
  it('F-07 AC-028 returns the enabled steps of a workflow in tab order with their catalog definitions', () => {
    const steps = selectSteps(
      workflow('a', {
        steps: [
          { stepId: 'plan', enabled: true },
          { stepId: 'commit', enabled: false },
          { stepId: 'verify', enabled: true },
        ],
      }),
      baseConfig(),
    );

    expect(steps.map((s) => s.stepId)).toEqual(['plan', 'verify']);
    expect(steps.map((s) => s.definition.id)).toEqual(['plan', 'verify']);
  });

  it('F-07 AC-028 resolves a step id that is not in the catalog to the custom step of the configuration', () => {
    const custom = {
      id: 'lint-report',
      name: 'Lint report',
      summary: 'Summarise the lint output.',
      kind: 'script' as const,
      origin: 'custom' as const,
      required: false,
      consumes: [],
      produces: ['lint.md'],
      ruleTags: [],
      body: 'Run the linter and summarise the output.',
    };
    const steps = selectSteps(
      workflow('a', { steps: [{ stepId: 'lint-report', enabled: true }] }),
      baseConfig({ customSteps: [custom] }),
    );

    expect(steps).toEqual([{ stepId: 'lint-report', definition: custom }]);
  });

  it('F-07 AC-028 throws, naming the unknown step, for a step id that is neither in the catalog nor custom', () => {
    const unknown = workflow('a', { steps: [{ stepId: 'no-such-step', enabled: true }] });

    expect(() => selectSteps(unknown, baseConfig())).toThrow(/selectSteps: unknown step "no-such-step"/);
  });
});
