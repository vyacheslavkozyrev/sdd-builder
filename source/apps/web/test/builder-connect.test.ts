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
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const result = connectFlows(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pipeline.flows.map((f) => [f.id, f.next])).toEqual([
      ['2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'],
      ['ea3211a4-b64b-5204-9451-6fe12fd7c655', undefined],
    ]);
  });

  it('leaves the other pipeline fields and flows untouched', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const result = connectFlows(before, '47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pipeline.name).toBe('Demo');
    expect(result.pipeline.flows[0]).toEqual(before.flows[0]);
    expect(result.pipeline.flows[2]).toEqual(before.flows[2]);
  });

  it('does not change the pipeline it was given', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const snapshot = structuredClone(before);
    connectFlows(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
    expect(before).toEqual(snapshot);
  });

  it('refuses a source that is not a flow of the pipeline', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const result = connectFlows(before, '083d3886-6635-54c4-bd03-441c22610371', 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
    expect(result).toEqual({ ok: false, reason: 'the source "083d3886-6635-54c4-bd03-441c22610371" is not a flow of this pipeline' });
  });

  it('refuses a target that is not a flow of the pipeline', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const result = connectFlows(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', '083d3886-6635-54c4-bd03-441c22610371');
    expect(result).toEqual({ ok: false, reason: 'the target "083d3886-6635-54c4-bd03-441c22610371" is not a flow of this pipeline' });
  });

  it('refuses a flow connected to itself', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(connectFlows(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', '2d8eebb4-9a34-5eae-ae8d-88813520de08')).toEqual({
      ok: false,
      reason: 'flow "2d8eebb4-9a34-5eae-ae8d-88813520de08" cannot be connected to itself',
    });
  });

  it('refuses a second outgoing arrow from a flow that already has a next', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(connectFlows(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515').ok).toBe(false);
  });

  it('refuses a loop: the target reaches the source along next links', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const result = connectFlows(before, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '2d8eebb4-9a34-5eae-ae8d-88813520de08');
    expect(result.ok).toBe(false);
  });

  it('refuses a direct loop when the target points straight back to the source', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', '2d8eebb4-9a34-5eae-ae8d-88813520de08'));
    const result = connectFlows(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655');
    expect(result.ok).toBe(false);
  });

  it('allows a link to a flow that no next reaches back from', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const result = connectFlows(before, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '47d4f7c9-a236-5d9b-b5a7-3f4724285515');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pipeline.flows.map((f) => [f.id, f.next])).toEqual([
      ['2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'],
      ['47d4f7c9-a236-5d9b-b5a7-3f4724285515', undefined],
      ['ea3211a4-b64b-5204-9451-6fe12fd7c655', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'],
    ]);
  });

  it('throws when a stored next names no flow (a programmer error)', () => {
    const broken = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'f3e6232e-93aa-572e-b8f6-2aa47177dd3d'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(() => connectFlows(broken, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '2d8eebb4-9a34-5eae-ae8d-88813520de08')).toThrow(/"f3e6232e-93aa-572e-b8f6-2aa47177dd3d", which is not in the pipeline/);
  });
});

describe('F-11 AC-011 refusal reasons', () => {
  it('gives each refusal its own reason text', () => {
    const notSource = reasonOf(connectFlows(pipelineOf(flow('f8bd72d7-8ffe-5484-ba72-d246813346f5'), flow('b0b6565e-0a17-54ad-b776-5ba6195fa34d')), 'x', 'b0b6565e-0a17-54ad-b776-5ba6195fa34d'));
    const notTarget = reasonOf(connectFlows(pipelineOf(flow('f8bd72d7-8ffe-5484-ba72-d246813346f5'), flow('b0b6565e-0a17-54ad-b776-5ba6195fa34d')), 'f8bd72d7-8ffe-5484-ba72-d246813346f5', 'x'));
    const self = reasonOf(connectFlows(pipelineOf(flow('f8bd72d7-8ffe-5484-ba72-d246813346f5'), flow('b0b6565e-0a17-54ad-b776-5ba6195fa34d')), 'f8bd72d7-8ffe-5484-ba72-d246813346f5', 'f8bd72d7-8ffe-5484-ba72-d246813346f5'));
    const second = reasonOf(connectFlows(pipelineOf(flow('f8bd72d7-8ffe-5484-ba72-d246813346f5', 'b0b6565e-0a17-54ad-b776-5ba6195fa34d'), flow('b0b6565e-0a17-54ad-b776-5ba6195fa34d'), flow('d9d115db-ccaa-5b8b-b143-1590799eb18b')), 'f8bd72d7-8ffe-5484-ba72-d246813346f5', 'd9d115db-ccaa-5b8b-b143-1590799eb18b'));
    const loop = reasonOf(connectFlows(pipelineOf(flow('f8bd72d7-8ffe-5484-ba72-d246813346f5'), flow('b0b6565e-0a17-54ad-b776-5ba6195fa34d', 'f8bd72d7-8ffe-5484-ba72-d246813346f5')), 'f8bd72d7-8ffe-5484-ba72-d246813346f5', 'b0b6565e-0a17-54ad-b776-5ba6195fa34d'));
    const reasons = [notSource, notTarget, self, second, loop];
    expect(new Set(reasons).size).toBe(reasons.length);
  });

  it('names the source flow in the reason for a second outgoing arrow', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(reasonOf(connectFlows(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'))).toContain('"2d8eebb4-9a34-5eae-ae8d-88813520de08"');
  });

  it('names the flow that already follows the source in the second-arrow reason', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(reasonOf(connectFlows(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'))).toContain('"ea3211a4-b64b-5204-9451-6fe12fd7c655"');
  });

  it('names the source and target in the loop reason', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const reason = reasonOf(connectFlows(before, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', '2d8eebb4-9a34-5eae-ae8d-88813520de08'));
    expect(reason).toContain('"ea3211a4-b64b-5204-9451-6fe12fd7c655"');
    expect(reason).toContain('"2d8eebb4-9a34-5eae-ae8d-88813520de08"');
  });

  it('gives the not-a-flow reason for a missing source and names that flow', () => {
    expect(reasonOf(connectFlows(pipelineOf(flow('f8bd72d7-8ffe-5484-ba72-d246813346f5')), 'f3e6232e-93aa-572e-b8f6-2aa47177dd3d', 'f8bd72d7-8ffe-5484-ba72-d246813346f5'))).toContain('"f3e6232e-93aa-572e-b8f6-2aa47177dd3d"');
  });

  it('leaves the pipeline equal to its value before a refused link', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const snapshot = structuredClone(before);
    const cases: Array<[string, string]> = [
      ['2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'],
      ['ea3211a4-b64b-5204-9451-6fe12fd7c655', '2d8eebb4-9a34-5eae-ae8d-88813520de08'],
      ['47d4f7c9-a236-5d9b-b5a7-3f4724285515', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'],
      ['f3e6232e-93aa-572e-b8f6-2aa47177dd3d', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'],
      ['47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'f3e6232e-93aa-572e-b8f6-2aa47177dd3d'],
    ];
    for (const [source, target] of cases) {
      const result = connectFlows(before, source, target);
      expect(result.ok).toBe(false);
    }
    expect(before).toEqual(snapshot);
  });
});
