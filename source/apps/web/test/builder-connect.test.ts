import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { connectFlows } from '../src/builder/connect.js';
import type { Pipeline } from '../src/builder/connect.js';

type Flow = model.Flow;

// A flow with the required fields only. `next` is set only when given.
function flow(id: string, next?: string): Flow {
  const base: Flow = {
    index: 0,
    id,
    name: id,
    arguments: [],
    body: 'Do the work.',
    artifacts: [],
    approval: false,
    blocks: [],
  };
  return next === undefined ? base : { ...base, next };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((f, i) => ({ ...f, index: i })),
  };
}

function reasonOf(result: ReturnType<typeof connectFlows>): string {
  if (result.ok) {
    throw new Error('expected a refusal, got a connected pipeline');
  }
  return result.reason;
}

describe('F-11 AC-010 connect sets next', () => {
  it('sets the source next to the target id', () => {
    const before = pipelineOf(flow('specify'), flow('plan'));
    const result = connectFlows(before, 'specify', 'plan');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pipeline.flows.map((f) => [f.id, f.next])).toEqual([
      ['specify', 'plan'],
      ['plan', undefined],
    ]);
  });

  it('leaves the other pipeline fields and flows untouched', () => {
    const before = pipelineOf(flow('specify'), flow('ux'), flow('plan'));
    const result = connectFlows(before, 'ux', 'plan');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pipeline.name).toBe('Demo');
    expect(result.pipeline.flows[0]).toEqual(before.flows[0]);
    expect(result.pipeline.flows[2]).toEqual(before.flows[2]);
  });

  it('does not change the pipeline it was given', () => {
    const before = pipelineOf(flow('specify'), flow('plan'));
    const snapshot = structuredClone(before);
    connectFlows(before, 'specify', 'plan');
    expect(before).toEqual(snapshot);
  });

  it('refuses a source that is not a flow of the pipeline', () => {
    const before = pipelineOf(flow('specify'), flow('plan'));
    const result = connectFlows(before, 'missing', 'plan');
    expect(result).toEqual({ ok: false, reason: 'the source "missing" is not a flow of this pipeline' });
  });

  it('refuses a target that is not a flow of the pipeline', () => {
    const before = pipelineOf(flow('specify'), flow('plan'));
    const result = connectFlows(before, 'specify', 'missing');
    expect(result).toEqual({ ok: false, reason: 'the target "missing" is not a flow of this pipeline' });
  });

  it('refuses a flow connected to itself', () => {
    const before = pipelineOf(flow('specify'), flow('plan'));
    expect(connectFlows(before, 'specify', 'specify')).toEqual({
      ok: false,
      reason: 'flow "specify" cannot be connected to itself',
    });
  });

  it('refuses a second outgoing arrow from a flow that already has a next', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('ux'), flow('plan'));
    expect(connectFlows(before, 'specify', 'ux').ok).toBe(false);
  });

  it('refuses a loop: the target reaches the source along next links', () => {
    const before = pipelineOf(flow('specify', 'ux'), flow('ux', 'plan'), flow('plan'));
    const result = connectFlows(before, 'plan', 'specify');
    expect(result.ok).toBe(false);
  });

  it('refuses a direct loop when the target points straight back to the source', () => {
    const before = pipelineOf(flow('specify'), flow('plan', 'specify'));
    const result = connectFlows(before, 'specify', 'plan');
    expect(result.ok).toBe(false);
  });

  it('allows a link to a flow that no next reaches back from', () => {
    const before = pipelineOf(flow('specify', 'ux'), flow('ux'), flow('plan'));
    const result = connectFlows(before, 'plan', 'ux');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pipeline.flows.map((f) => [f.id, f.next])).toEqual([
      ['specify', 'ux'],
      ['ux', undefined],
      ['plan', 'ux'],
    ]);
  });

  it('throws when a stored next names no flow (a programmer error)', () => {
    const broken = pipelineOf(flow('specify', 'ghost'), flow('plan'));
    expect(() => connectFlows(broken, 'plan', 'specify')).toThrow(/"ghost", which is not in the pipeline/);
  });
});

describe('F-11 AC-011 refusal reasons', () => {
  it('gives each refusal its own reason text', () => {
    const notSource = reasonOf(connectFlows(pipelineOf(flow('a'), flow('b')), 'x', 'b'));
    const notTarget = reasonOf(connectFlows(pipelineOf(flow('a'), flow('b')), 'a', 'x'));
    const self = reasonOf(connectFlows(pipelineOf(flow('a'), flow('b')), 'a', 'a'));
    const second = reasonOf(connectFlows(pipelineOf(flow('a', 'b'), flow('b'), flow('c')), 'a', 'c'));
    const loop = reasonOf(connectFlows(pipelineOf(flow('a'), flow('b', 'a')), 'a', 'b'));
    const reasons = [notSource, notTarget, self, second, loop];
    expect(new Set(reasons).size).toBe(reasons.length);
  });

  it('names the source flow in the reason for a second outgoing arrow', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('ux'), flow('plan'));
    expect(reasonOf(connectFlows(before, 'specify', 'ux'))).toContain('"specify"');
  });

  it('names the flow that already follows the source in the second-arrow reason', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('ux'), flow('plan'));
    expect(reasonOf(connectFlows(before, 'specify', 'ux'))).toContain('"plan"');
  });

  it('names the source and target in the loop reason', () => {
    const before = pipelineOf(flow('specify', 'ux'), flow('ux', 'plan'), flow('plan'));
    const reason = reasonOf(connectFlows(before, 'plan', 'specify'));
    expect(reason).toContain('"plan"');
    expect(reason).toContain('"specify"');
  });

  it('gives the not-a-flow reason for a missing source and names that flow', () => {
    expect(reasonOf(connectFlows(pipelineOf(flow('a')), 'ghost', 'a'))).toContain('"ghost"');
  });

  it('leaves the pipeline equal to its value before a refused link', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('ux'), flow('plan'));
    const snapshot = structuredClone(before);
    const cases: Array<[string, string]> = [
      ['specify', 'ux'],
      ['plan', 'specify'],
      ['ux', 'ux'],
      ['ghost', 'ux'],
      ['ux', 'ghost'],
    ];
    for (const [source, target] of cases) {
      const result = connectFlows(before, source, target);
      expect(result.ok).toBe(false);
    }
    expect(before).toEqual(snapshot);
  });
});
