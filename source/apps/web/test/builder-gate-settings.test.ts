import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { addConnection, addGate, failRouteOptions, setGateSettings } from '../src/builder/map-edit.js';
import type { GateSettings, MapEdit } from '../src/builder/map-edit.js';
import { checkDescription, checkRoundLimit, checkThreshold, unboundedRetryWarning } from '../src/builder/entry-checks.js';

type ProjectConfig = pipeline.ProjectConfig;
type PipelineBlock = pipeline.PipelineBlock;
type PipelineConditionBlock = pipeline.PipelineConditionBlock;
type Route = pipeline.Route;

/** Unwraps a successful edit; fails the test with the refusal message otherwise. */
function applied(result: MapEdit): Extract<MapEdit, { ok: true }> {
  if (!result.ok) {
    throw new Error(`expected the edit to apply, got refusal: ${result.message}`);
  }
  return result;
}

/** The refusal message of an edit that must be refused; fails the test when it applies. */
function refusal(result: MapEdit): string {
  if (result.ok) {
    throw new Error('expected the edit to be refused, but it applied');
  }
  return result.message;
}

/** The block with the given id, or a failing assertion when it is missing. */
function blockOf(config: ProjectConfig, id: string): PipelineBlock {
  const block = config.pipeline.blocks.find((item) => item.id === id);
  if (block === undefined) throw new Error(`the block ${id} is missing`);
  return block;
}

/** The gate with the given id of a configuration. */
function gateOf(config: ProjectConfig, id: string): PipelineConditionBlock {
  const block = blockOf(config, id);
  if (block.kind !== 'condition') throw new Error(`the block ${id} is not a gate`);
  return block;
}

/** Settings that are valid for the default approval on the plan connection; a test changes one field. */
function validSettings(overrides: Partial<GateSettings> = {}): GateSettings {
  return {
    description: 'the user approves the plan as written.',
    failRoute: { kind: 'back', blockId: 'specify' },
    roundLimit: '',
    ...overrides,
  };
}

/** A configuration with a diff-size gate on a new connection from plan to verify (flows after plan). */
function withDiffSizeGate(): { config: ProjectConfig; gateId: string } {
  const connection = applied(addConnection(pipeline.defaultProjectConfig, 'plan', 'verify', 'code.md'));
  const gate = applied(addGate(connection.config, connection.id, { checkType: 'diff-size', threshold: 200 }));
  return { config: gate.config, gateId: gate.id };
}

describe('F-06 AC-013 a diff-size threshold in lines', () => {
  it('F-06 AC-013 a positive whole number is accepted as the threshold and stored', () => {
    const { config, gateId } = withDiffSizeGate();
    const edit = applied(setGateSettings(config, gateId, validSettings({ threshold: 400, failRoute: { kind: 'stop' } })));
    expect(gateOf(edit.config, gateId)).toMatchObject({ checkType: 'diff-size', threshold: 400 });
  });

  it.each([
    ['zero', 0],
    ['a negative number', -5],
    ['a fraction', 1.5],
    ['not a number', Number.NaN],
    ['infinity', Number.POSITIVE_INFINITY],
  ])('F-06 AC-013 a threshold that is %s is refused at entry and nothing is saved', (_label, threshold) => {
    const { config, gateId } = withDiffSizeGate();
    const message = refusal(setGateSettings(config, gateId, validSettings({ threshold, failRoute: { kind: 'stop' } })));
    expect(message).toContain('positive whole number of lines');
    expect(gateOf(config, gateId)).toMatchObject({ threshold: 200 });
  });

  it('F-06 AC-013 a diff-size gate with no threshold given is refused at entry', () => {
    const { config, gateId } = withDiffSizeGate();
    refusal(setGateSettings(config, gateId, validSettings({ failRoute: { kind: 'stop' } })));
  });

  it('F-06 AC-013 the entry check accepts 1 and refuses 0 and 2.5', () => {
    expect(checkThreshold(1)).toEqual({ ok: true, value: 1 });
    expect(checkThreshold(0).ok).toBe(false);
    expect(checkThreshold(2.5).ok).toBe(false);
  });
});

describe('F-06 AC-014 the routes of a gate', () => {
  it('F-06 AC-014 the fail route is offered as stop, or back to the source flow or an earlier flow', () => {
    const config = pipeline.defaultProjectConfig;
    expect(failRouteOptions(config, 'approve-plan')).toEqual([
      { kind: 'stop' },
      { kind: 'back', blockId: 'specify' },
      { kind: 'back', blockId: 'ux' },
      { kind: 'back', blockId: 'plan' },
    ]);
  });

  it('F-06 AC-014 the first flow offers only stop and a back route to itself', () => {
    expect(failRouteOptions(pipeline.defaultProjectConfig, 'approve-stories')).toEqual([
      { kind: 'stop' },
      { kind: 'back', blockId: 'specify' },
    ]);
  });

  it('F-06 AC-014 a back route to a later flow is refused at entry', () => {
    const config = pipeline.defaultProjectConfig;
    for (const blockId of ['build', 'verify', 'complete']) {
      const message = refusal(setGateSettings(config, 'approve-plan', validSettings({ failRoute: { kind: 'back', blockId } })));
      expect(message).toContain('stop, or back to an earlier flow');
    }
  });

  it('F-06 AC-014 the fail routes of the default pipeline gates are accepted as they are', () => {
    const config = pipeline.defaultProjectConfig;
    const defaults: Array<[string, Route]> = [
      ['approve-stories', { kind: 'back', blockId: 'specify' }],
      ['approve-screens', { kind: 'back', blockId: 'ux' }],
      ['approve-plan', { kind: 'back', blockId: 'plan' }],
      ['approve-checklist', { kind: 'back', blockId: 'verify' }],
    ];
    for (const [gateId, failRoute] of defaults) {
      const current = gateOf(config, gateId);
      const edit = applied(
        setGateSettings(config, gateId, {
          description: current.description,
          failRoute,
          roundLimit: '',
        }),
      );
      expect(gateOf(edit.config, gateId).failRoute).toEqual(failRoute);
      expect(gateOf(edit.config, gateId).passRoute).toEqual({ kind: 'next' });
    }
  });

  it('F-06 AC-014 a route that is not a stop or a back route is refused at entry', () => {
    refusal(setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ failRoute: { kind: 'next' } })));
  });

  it('F-06 AC-014 a stop fail route is saved and the pass route stays the next flow', () => {
    const edit = applied(
      setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ failRoute: { kind: 'stop' } })),
    );
    expect(gateOf(edit.config, 'approve-plan')).toMatchObject({
      failRoute: { kind: 'stop' },
      passRoute: { kind: 'next' },
    });
  });

  it('F-06 AC-014 a back route to an earlier flow is saved', () => {
    const edit = applied(
      setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ failRoute: { kind: 'back', blockId: 'ux' } })),
    );
    expect(gateOf(edit.config, 'approve-plan').failRoute).toEqual({ kind: 'back', blockId: 'ux' });
  });
});

describe('F-06 AC-015 the round limit of a back route', () => {
  const retry = { kind: 'back' as const, blockId: 'specify' };

  it.each([
    ['empty', '', undefined],
    ['a spaced number', ' 3 ', 3],
    ['a number', '5', 5],
  ])('F-06 AC-015 a round limit that is %s is accepted', (_label, roundLimit, expected) => {
    const edit = applied(setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ failRoute: retry, roundLimit })));
    expect(gateOf(edit.config, 'approve-plan').roundLimit).toBe(expected);
  });

  it.each([
    ['zero', '0'],
    ['a negative number', '-1'],
    ['a fraction', '1.5'],
    ['an exponent', '1e2'],
    ['a word', 'many'],
  ])('F-06 AC-015 a round limit of %s is refused at entry', (_label, roundLimit) => {
    const message = refusal(setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ failRoute: retry, roundLimit })));
    expect(message).toContain('round limit is a positive whole number');
  });

  it('F-06 AC-015 a round limit is not kept when the fail route is stop', () => {
    const edit = applied(
      setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ failRoute: { kind: 'stop' }, roundLimit: '3' })),
    );
    expect(gateOf(edit.config, 'approve-plan').roundLimit).toBeUndefined();
  });

  it('F-06 AC-015 a back route with no round limit shows the unbounded retry warning', () => {
    const edit = applied(setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ failRoute: retry })));
    expect(unboundedRetryWarning(gateOf(edit.config, 'approve-plan'))).toBe(
      'The retry of "approve-plan" is unbounded: it has no round limit.',
    );
  });

  it('F-06 AC-015 a back route with a round limit shows no warning', () => {
    const edit = applied(setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ failRoute: retry, roundLimit: '2' })));
    expect(unboundedRetryWarning(gateOf(edit.config, 'approve-plan'))).toBeNull();
  });

  it('F-06 AC-015 a stop route shows no unbounded retry warning', () => {
    expect(unboundedRetryWarning(gateOf(pipeline.defaultProjectConfig, 'checks-built'))).toBeNull();
  });

  it('F-06 AC-015 the entry check reads an empty text as no limit', () => {
    expect(checkRoundLimit('   ')).toEqual({ ok: true, value: undefined });
    expect(checkRoundLimit('0').ok).toBe(false);
  });
});

describe('F-06 AC-016 a gate description is required', () => {
  it('F-06 AC-016 an empty description is refused at entry and nothing is saved', () => {
    const before = gateOf(pipeline.defaultProjectConfig, 'approve-plan').description;
    const message = refusal(setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ description: '' })));
    expect(message).toContain('needs a description');
    expect(gateOf(pipeline.defaultProjectConfig, 'approve-plan').description).toBe(before);
  });

  it.each([['spaces only', '   '], ['a tab and a newline', '\t\n']])(
    'F-06 AC-016 a description of %s is refused at entry',
    (_label, description) => {
      refusal(setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ description })));
    },
  );

  it('F-06 AC-016 a description is stored trimmed', () => {
    const edit = applied(
      setGateSettings(pipeline.defaultProjectConfig, 'approve-plan', validSettings({ description: '  the plan is complete.  ' })),
    );
    expect(gateOf(edit.config, 'approve-plan').description).toBe('the plan is complete.');
  });

  it('F-06 AC-016 the entry check refuses a blank text', () => {
    expect(checkDescription(' \n ').ok).toBe(false);
    expect(checkDescription('ok')).toEqual({ ok: true, value: 'ok' });
  });
});
