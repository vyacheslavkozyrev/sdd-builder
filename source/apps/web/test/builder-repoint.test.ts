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
    expect(isLinkDrop('specify', left('plan'))).toBe(true);
  });

  it('does not count a drop on empty canvas, an arrow, a body or a right point', () => {
    const drops: Array<[string, DropTarget]> = [
      ['empty canvas', empty],
      ['an arrow', onArrow],
      ["a flow's box body", body('plan')],
      ["another flow's right point", right('plan')],
    ];
    for (const [name, drop] of drops) {
      expect(isLinkDrop('specify', drop), name).toBe(false);
    }
  });

  it("does not count a drop on the same flow's own left point", () => {
    expect(isLinkDrop('specify', left('specify'))).toBe(false);
  });

  it('creates a link when dropped on another flow left point', () => {
    const before = pipelineOf(flow('specify'), flow('plan'));
    const result = dropLink(before, 'specify', left('plan'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(nextsOf(result.pipeline)).toEqual([
      ['specify', 'plan'],
      ['plan', undefined],
    ]);
  });

  it('changes nothing when the drop does not count, and gives no reason', () => {
    const before = pipelineOf(flow('specify'), flow('plan'));
    const snapshot = structuredClone(before);
    const drops: DropTarget[] = [empty, onArrow, body('plan'), right('plan'), left('specify')];
    for (const drop of drops) {
      expect(dropLink(before, 'specify', drop)).toEqual({ kind: 'unchanged' });
    }
    expect(before).toEqual(snapshot);
  });

  it('refuses a counted drop that the connect rules refuse, with the reason', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('ux'), flow('plan'));
    const result = dropLink(before, 'specify', left('ux'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('"specify"');
  });

  it('refuses a counted drop that would close a loop, and keeps the pipeline', () => {
    const before = pipelineOf(flow('specify', 'ux'), flow('ux', 'plan'), flow('plan'));
    const snapshot = structuredClone(before);
    const result = dropLink(before, 'plan', left('specify'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('loop');
    expect(before).toEqual(snapshot);
  });
});

describe('F-11 AC-015 repointing the target end', () => {
  it('sets the source next to the flow the target end is dropped on', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'), flow('ux'));
    const arrow: Arrow = { source: 'specify', target: 'plan' };
    const result = repointArrow(before, arrow, 'target', left('ux'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(nextsOf(result.pipeline)).toEqual([
      ['specify', 'ux'],
      ['plan', undefined],
      ['ux', undefined],
    ]);
  });

  it('keeps the other fields of both flows when the target end moves', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'), flow('ux'));
    const result = repointArrow(before, { source: 'specify', target: 'plan' }, 'target', left('ux'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(result.pipeline.name).toBe('Demo');
    expect(result.pipeline.flows[1]).toEqual(before.flows[1]);
    expect(result.pipeline.flows[2]).toEqual(before.flows[2]);
    expect(result.pipeline.flows[0]).toEqual({ ...before.flows[0], next: 'ux' });
  });

  it('keeps the pipeline equal when the target end is dropped back on its own target', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'));
    const result = repointArrow(before, { source: 'specify', target: 'plan' }, 'target', left('plan'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(result.pipeline).toEqual(before);
  });

  it('changes nothing when the target end is dropped on a drop that does not count', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'), flow('ux'));
    const snapshot = structuredClone(before);
    const drops: DropTarget[] = [
      empty,
      onArrow,
      body('ux'),
      right('ux'),
      left('specify'),
      right('specify'),
    ];
    for (const drop of drops) {
      expect(repointArrow(before, { source: 'specify', target: 'plan' }, 'target', drop)).toEqual({
        kind: 'unchanged',
      });
    }
    expect(before).toEqual(snapshot);
  });

  it('refuses a target end dropped on a flow that is not in the pipeline, and keeps the pipeline', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: 'specify', target: 'plan' }, 'target', left('ghost'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('"ghost"');
    expect(before).toEqual(snapshot);
  });

  it('refuses a target end that would make a loop, with the reason, and keeps the pipeline', () => {
    // review -> specify -> plan. Moving the target end of specify onto review would close a loop.
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'), flow('review', 'specify'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: 'specify', target: 'plan' }, 'target', left('review'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('loop');
    expect(reasonOf(result)).toContain('"specify"');
    expect(before).toEqual(snapshot);
  });
});

describe('F-11 AC-015 repointing the source end', () => {
  it('moves the arrow to start from the flow whose right point the source end is dropped on', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'), flow('ux'));
    const result = repointArrow(before, { source: 'specify', target: 'plan' }, 'source', right('ux'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(nextsOf(result.pipeline)).toEqual([
      ['specify', undefined],
      ['plan', undefined],
      ['ux', 'plan'],
    ]);
  });

  it('clears the old source next and keeps the other fields of every flow', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'), flow('ux'));
    const result = repointArrow(before, { source: 'specify', target: 'plan' }, 'source', right('ux'));
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') return;
    expect(result.pipeline.flows[0]).toEqual(flow('specify'));
    expect(result.pipeline.flows[1]).toEqual(before.flows[1]);
    expect(result.pipeline.flows[2]).toEqual({ ...before.flows[2], next: 'plan' });
  });

  it('refuses a drop on a flow that already has a next, with the reason, and keeps the pipeline', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'), flow('ux', 'plan'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: 'specify', target: 'plan' }, 'source', right('ux'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('"ux"');
    expect(before).toEqual(snapshot);
  });

  it('refuses a drop that would make the arrow point from a flow to itself', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: 'specify', target: 'plan' }, 'source', right('plan'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('"plan"');
    expect(before).toEqual(snapshot);
  });

  it('refuses a source end dropped on a flow that is not in the pipeline, and keeps the pipeline', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: 'specify', target: 'plan' }, 'source', right('ghost'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('"ghost"');
    expect(before).toEqual(snapshot);
  });

  it('refuses a move that would close a loop, and keeps the pipeline', () => {
    // specify -> plan -> ux -> review; moving the source end onto review would make review -> plan.
    const before = pipelineOf(flow('specify', 'plan'), flow('plan', 'ux'), flow('ux', 'review'), flow('review'));
    const snapshot = structuredClone(before);
    const result = repointArrow(before, { source: 'specify', target: 'plan' }, 'source', right('review'));
    expect(result.kind).toBe('refused');
    expect(reasonOf(result)).toContain('loop');
    expect(before).toEqual(snapshot);
  });

  it('changes nothing when the source end is dropped on a drop that does not count', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'), flow('ux'));
    const snapshot = structuredClone(before);
    const drops: DropTarget[] = [
      empty,
      onArrow,
      body('ux'),
      left('ux'),
      right('specify'),
    ];
    for (const drop of drops) {
      expect(repointArrow(before, { source: 'specify', target: 'plan' }, 'source', drop)).toEqual({
        kind: 'unchanged',
      });
    }
    expect(before).toEqual(snapshot);
  });
});

describe('F-11 AC-015 repoint input and programmer errors', () => {
  it('does not change the pipeline it was given', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'), flow('ux'));
    const snapshot = structuredClone(before);
    repointArrow(before, { source: 'specify', target: 'plan' }, 'source', right('ux'));
    repointArrow(before, { source: 'specify', target: 'plan' }, 'target', left('ux'));
    expect(before).toEqual(snapshot);
  });

  it('throws when the arrow named is not in the pipeline (a programmer error)', () => {
    const before = pipelineOf(flow('specify', 'plan'), flow('plan'), flow('ux'));
    expect(() => repointArrow(before, { source: 'specify', target: 'ux' }, 'target', left('plan'))).toThrow(
      /no arrow from "specify" to "ux"/,
    );
    expect(() => repointArrow(before, { source: 'ghost', target: 'plan' }, 'source', right('ux'))).toThrow(
      /no arrow from "ghost" to "plan"/,
    );
  });
});
