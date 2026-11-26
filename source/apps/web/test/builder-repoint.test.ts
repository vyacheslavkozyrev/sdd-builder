import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { dropLink, isLinkDrop, repointArrow } from '../src/builder/connect.js';
import type { Arrow, DropResult, DropTarget, Pipeline } from '../src/builder/connect.js';

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

const left = (id: string): DropTarget => ({ kind: 'point', flow: id, side: 'left' });
const right = (id: string): DropTarget => ({ kind: 'point', flow: id, side: 'right' });
const body = (id: string): DropTarget => ({ kind: 'body', flow: id });
const empty: DropTarget = { kind: 'empty' };
const onArrow: DropTarget = { kind: 'arrow' };

function reasonOf(result: DropResult): string {
  if (result.kind !== 'refused') {
    throw new Error(`expected a refusal, got ${result.kind}`);
  }
  return result.reason;
}

function nextsOf(pipelineState: Pipeline): Array<[string, string | undefined]> {
  return pipelineState.flows.map((f) => [f.id, f.next]);
}

describe('F-11 AC-012 a drop counts only on another flow\'s left point', () => {
  it('counts a drop on the left point of another flow', () => {
    expect(isLinkDrop('2d8eebb4-9a34-5eae-ae8d-88813520de08', left('ea3211a4-b64b-5204-9451-6fe12fd7c655'))).toBe(true);
  });

  it('does not count a drop on empty canvas, an arrow, a body or a right point', () => {
    const drops: Array<[string, DropTarget]> = [
      ['empty canvas', empty],
      ['an arrow', onArrow],
      ["a flow's box body", body('plan')],
      ["another flow's right point", right('plan')],
    ];
    for (const [name, drop] of drops) {
      expect(isLinkDrop('2d8eebb4-9a34-5eae-ae8d-88813520de08', drop), name).toBe(false);
    }
  });

  it("does not count a drop on the same flow's own left point", () => {
    expect(isLinkDrop('2d8eebb4-9a34-5eae-ae8d-88813520de08', left('2d8eebb4-9a34-5eae-ae8d-88813520de08'))).toBe(false);
  });

  it('creates a link when dropped on another flow left point', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const result = dropLink(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', left('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(nextsOf(result.pipeline)).toEqual([
      ['2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'],
      ['ea3211a4-b64b-5204-9451-6fe12fd7c655', undefined],
    ]);
  });

  it('changes nothing when the drop does not count, and gives no reason', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const snapshot = structuredClone(before);
    const drops: DropTarget[] = [empty, onArrow, body('ea3211a4-b64b-5204-9451-6fe12fd7c655'), right('ea3211a4-b64b-5204-9451-6fe12fd7c655'), left('2d8eebb4-9a34-5eae-ae8d-88813520de08')];
    for (const drop of drops) {
      expect(dropLink(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', drop)).toEqual({ kind: 'unchanged' });
    }
    expect(before).toEqual(snapshot);
  });

  it('refuses a counted drop that the connect rules refuse, with the reason', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const result = dropLink(before, '2d8eebb4-9a34-5eae-ae8d-88813520de08', left('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('"2d8eebb4-9a34-5eae-ae8d-88813520de08"');
  });

  it('refuses a counted drop that would close a loop, and keeps the pipeline', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const snapshot = structuredClone(before);
    const result = dropLink(before, 'ea3211a4-b64b-5204-9451-6fe12fd7c655', left('2d8eebb4-9a34-5eae-ae8d-88813520de08'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('loop');
    expect(before).toEqual(snapshot);
  });
});

describe('F-11 AC-015 repointing the target end', () => {
  it('sets the source next to the flow the target end is dropped on', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    const arrow: Arrow = { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' };
    const result = repointArrow(before, arrow, 'target', left('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(nextsOf(result.pipeline)).toEqual([
      ['2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'],
      ['ea3211a4-b64b-5204-9451-6fe12fd7c655', undefined],
      ['47d4f7c9-a236-5d9b-b5a7-3f4724285515', undefined],
    ]);
  });

  it('keeps the other fields of both flows when the target end moves', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    const result = repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'target', left('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(result.pipeline.name).toBe('Demo');
    expect(result.pipeline.flows[1]).toEqual(before.flows[1]);
    expect(result.pipeline.flows[2]).toEqual(before.flows[2]);
    expect(result.pipeline.flows[0]).toEqual({ ...before.flows[0], next: '47d4f7c9-a236-5d9b-b5a7-3f4724285515' });
  });

  it('keeps the pipeline equal when the target end is dropped back on its own target', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const result = repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'target', left('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(result.pipeline).toEqual(before);
  });

  it('changes nothing when the target end is dropped on a drop that does not count', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    const snapshot = structuredClone(before);
    const drops: DropTarget[] = [
      empty,
      onArrow,
      body('47d4f7c9-a236-5d9b-b5a7-3f4724285515'),
      right('47d4f7c9-a236-5d9b-b5a7-3f4724285515'),
      left('2d8eebb4-9a34-5eae-ae8d-88813520de08'),
      right('2d8eebb4-9a34-5eae-ae8d-88813520de08'),
    ];
    for (const drop of drops) {
      expect(repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'target', drop)).toEqual({
        kind: 'unchanged',
      });
    }
    expect(before).toEqual(snapshot);
  });

  it('refuses a target end dropped on a flow that is not in the pipeline, and keeps the pipeline', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'target', left('f3e6232e-93aa-572e-b8f6-2aa47177dd3d'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('"f3e6232e-93aa-572e-b8f6-2aa47177dd3d"');
    expect(before).toEqual(snapshot);
  });

  it('refuses a target end that would make a loop, with the reason, and keeps the pipeline', () => {
    // review -> specify -> plan. Moving the target end of specify onto review would close a loop.
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('3220de8a-cda2-5056-9296-97da044f7176', '2d8eebb4-9a34-5eae-ae8d-88813520de08'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'target', left('3220de8a-cda2-5056-9296-97da044f7176'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('loop');
    expect(reasonOf(result)).toContain('"2d8eebb4-9a34-5eae-ae8d-88813520de08"');
    expect(before).toEqual(snapshot);
  });
});

describe('F-11 AC-015 repointing the source end', () => {
  it('moves the arrow to start from the flow whose right point the source end is dropped on', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    const result = repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'source', right('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(nextsOf(result.pipeline)).toEqual([
      ['2d8eebb4-9a34-5eae-ae8d-88813520de08', undefined],
      ['ea3211a4-b64b-5204-9451-6fe12fd7c655', undefined],
      ['47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'],
    ]);
  });

  it('clears the old source next and keeps the other fields of every flow', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    const result = repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'source', right('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(result.pipeline.flows[0]).toEqual(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'));
    expect(result.pipeline.flows[1]).toEqual(before.flows[1]);
    expect(result.pipeline.flows[2]).toEqual({ ...before.flows[2], next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' });
  });

  it('refuses a drop on a flow that already has a next, with the reason, and keeps the pipeline', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'source', right('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('"47d4f7c9-a236-5d9b-b5a7-3f4724285515"');
    expect(before).toEqual(snapshot);
  });

  it('refuses a drop that would make the arrow point from a flow to itself', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'source', right('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('"ea3211a4-b64b-5204-9451-6fe12fd7c655"');
    expect(before).toEqual(snapshot);
  });

  it('refuses a source end dropped on a flow that is not in the pipeline, and keeps the pipeline', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'source', right('f3e6232e-93aa-572e-b8f6-2aa47177dd3d'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('"f3e6232e-93aa-572e-b8f6-2aa47177dd3d"');
    expect(before).toEqual(snapshot);
  });

  it('refuses a move that would close a loop, and keeps the pipeline', () => {
    // specify -> plan -> ux -> review; moving the source end onto review would make review -> plan.
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515', '3220de8a-cda2-5056-9296-97da044f7176'), flow('3220de8a-cda2-5056-9296-97da044f7176'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'source', right('3220de8a-cda2-5056-9296-97da044f7176'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('loop');
    expect(before).toEqual(snapshot);
  });

  it('changes nothing when the source end is dropped on a drop that does not count', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    const snapshot = structuredClone(before);
    const drops: DropTarget[] = [
      empty,
      onArrow,
      body('47d4f7c9-a236-5d9b-b5a7-3f4724285515'),
      left('47d4f7c9-a236-5d9b-b5a7-3f4724285515'),
      right('2d8eebb4-9a34-5eae-ae8d-88813520de08'),
    ];
    for (const drop of drops) {
      expect(repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'source', drop)).toEqual({
        kind: 'unchanged',
      });
    }
    expect(before).toEqual(snapshot);
  });
});

describe('F-11 AC-015 repoint input and programmer errors', () => {
  it('does not change the pipeline it was given', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    const snapshot = structuredClone(before);
    repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'source', right('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'target', left('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    expect(before).toEqual(snapshot);
  });

  it('throws when the arrow named is not in the pipeline (a programmer error)', () => {
    const before = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'));
    expect(() => repointArrow(before, { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: '47d4f7c9-a236-5d9b-b5a7-3f4724285515' }, 'target', left('ea3211a4-b64b-5204-9451-6fe12fd7c655'))).toThrow(
      /no arrow from "2d8eebb4-9a34-5eae-ae8d-88813520de08" to "47d4f7c9-a236-5d9b-b5a7-3f4724285515"/,
    );
    expect(() => repointArrow(before, { source: 'f3e6232e-93aa-572e-b8f6-2aa47177dd3d', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }, 'source', right('47d4f7c9-a236-5d9b-b5a7-3f4724285515'))).toThrow(
      /no arrow from "f3e6232e-93aa-572e-b8f6-2aa47177dd3d" to "ea3211a4-b64b-5204-9451-6fe12fd7c655"/,
    );
  });
});
