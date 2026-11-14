import { describe, expect, it } from 'vitest';
import { validateConfig, type Condition, type RouteTarget, type Workflow } from '../src/index.js';
import { baseConfig, withDefaults, workflow } from './fixtures.js';

const gate = (id: string) => ({ id, type: 'checks' as const, required: false });

/** Overrides for a malformed condition: an output may be left unwired (undefined). */
type ConditionOverrides = Omit<Partial<Condition>, 'pass' | 'fail'> & {
  pass?: RouteTarget | undefined;
  fail?: RouteTarget | undefined;
};

/** A workflow with steps a, b, c in order and one condition after b. */
function threeSteps(condition: ConditionOverrides, steps?: Workflow['steps']): Workflow {
  return workflow('w', {
    steps: steps ?? [
      { stepId: 'release', enabled: true },
      { stepId: 'verify', enabled: true },
      { stepId: 'commit', enabled: true },
    ],
    // The cast builds the unwired output the validator must refuse; the model type requires `pass`.
    conditions: [
      { id: 'c1', enabled: true, afterStepId: 'verify', gate: gate('c1'), pass: { kind: 'next' }, fail: { kind: 'stop' }, ...condition } as Condition,
    ],
  });
}

describe('F-02 T007 routes and wired outputs', () => {
  it('F-02 AC-004 a valid retry to an earlier step in the same workflow is accepted', () => {
    const config = baseConfig({ workflows: withDefaults([threeSteps({ fail: { kind: 'step', stepId: 'release' } })]), connections: [] });
    expect(validateConfig(config)).toEqual([]);
  });

  it('F-02 AC-005 a condition with no fail output is refused', () => {
    const config = baseConfig({ workflows: withDefaults([threeSteps({ fail: undefined })]), connections: [] });
    expect(validateConfig(config)).toEqual(['condition "c1": fail output is not wired']);
  });

  it('F-02 AC-005 a condition with no pass output is refused', () => {
    const config = baseConfig({ workflows: withDefaults([threeSteps({ pass: undefined })]), connections: [] });
    expect(validateConfig(config)).toEqual(['condition "c1": pass output is not wired']);
  });

  it('F-02 AC-004 a route into another workflow is refused', () => {
    const config = baseConfig({ workflows: withDefaults([threeSteps({ fail: { kind: 'step', stepId: 'nowhere-here' } })]), connections: [] });
    expect(validateConfig(config)).toEqual(['condition "c1": fail route targets step "nowhere-here", which is not in workflow "w"']);
  });

  it('F-02 AC-004 a fail route that goes forward is refused', () => {
    const config = baseConfig({ workflows: withDefaults([threeSteps({ fail: { kind: 'step', stepId: 'commit' } })]), connections: [] });
    expect(validateConfig(config)).toEqual([
      'condition "c1": fail route must go back to an earlier step; "commit" is not earlier than "verify"',
    ]);
  });

  it('F-02 AC-010 a route into a disabled step is refused', () => {
    const steps = [
      { stepId: 'release', enabled: false },
      { stepId: 'verify', enabled: true },
      { stepId: 'commit', enabled: true },
    ];
    const config = baseConfig({ workflows: withDefaults([threeSteps({ fail: { kind: 'step', stepId: 'release' } }, steps)]), connections: [] });
    expect(validateConfig(config)).toEqual(['condition "c1": fail route targets disabled step "release"']);
  });

  it('F-02 AC-004 a pass route that goes back is refused', () => {
    const config = baseConfig({ workflows: withDefaults([threeSteps({ pass: { kind: 'step', stepId: 'release' } })]), connections: [] });
    expect(validateConfig(config)).toEqual([
      'condition "c1": pass route must go forward; "release" is not after "verify"',
    ]);
  });

  it('F-02 AC-010 a condition after a disabled step is dropped and its routes are not checked', () => {
    const steps = [
      { stepId: 'release', enabled: true },
      { stepId: 'verify', enabled: false },
      { stepId: 'commit', enabled: true },
    ];
    const config = baseConfig({ workflows: withDefaults([threeSteps({ fail: { kind: 'step', stepId: 'commit' } }, steps)]), connections: [] });
    expect(validateConfig(config)).toEqual([]);
  });

  it('F-06 AC-029 a switched-off condition with an unwired output gives no finding', () => {
    const config = baseConfig({
      workflows: withDefaults([threeSteps({ enabled: false, fail: undefined })]),
      connections: [],
    });
    expect(validateConfig(config)).toEqual([]);
  });

  it('F-06 AC-029 a switched-off condition with a forward fail route gives no finding', () => {
    const config = baseConfig({
      workflows: withDefaults([threeSteps({ enabled: false, fail: { kind: 'step', stepId: 'commit' } })]),
      connections: [],
    });
    expect(validateConfig(config)).toEqual([]);
  });

  it('F-06 AC-029 a switched-on condition with the same unwired output is still refused', () => {
    const config = baseConfig({
      workflows: withDefaults([threeSteps({ enabled: true, fail: undefined })]),
      connections: [],
    });
    expect(validateConfig(config)).toEqual(['condition "c1": fail output is not wired']);
  });
});
