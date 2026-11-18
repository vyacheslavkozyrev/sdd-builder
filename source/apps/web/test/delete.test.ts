import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import { UNKNOWN_FLOW_REASON, deleteFlow } from '../src/builder/delete.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

function flow(id: string, extra: Partial<Flow> = {}): Flow {
  return { id, name: `Name ${id}`, description: '', arguments: '', blocks: [], ...extra };
}

function config(flows: Flow[]): Pipeline {
  return { name: 'pipeline', description: '', arguments: [], flows };
}

const gate = { kind: 'approval' as const, description: 'Owner signs off' };

// specify -> plan -> build -> ship, with a gate on the plan -> build arrow, and an extra flow not connected.
function chain(): Pipeline {
  return config([
    flow('specify', { connectedTo: { to: 'plan', label: 'spec.md' } }),
    flow('plan', { connectedTo: { to: 'build', label: 'plan.md', gate } }),
    flow('build', { connectedTo: { to: 'ship', label: 'code' } }),
    flow('ship'),
    flow('notes'),
  ]);
}

describe('F-11 AC-031 confirmation names every connection of the flow', () => {
  it('F-11 AC-031 lists the outgoing arrow and the incoming arrow of a middle flow, each with its gate', () => {
    const result = deleteFlow(chain(), 'plan');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.removed).toEqual([
      { source: 'specify', target: 'plan', label: 'spec.md', gate: undefined },
      { source: 'plan', target: 'build', label: 'plan.md', gate },
    ]);
  });

  it('F-11 AC-031 lists the gate of an incoming arrow that is removed with the flow', () => {
    const before = config([
      flow('specify', { connectedTo: { to: 'plan', label: 'spec.md', gate } }),
      flow('plan'),
    ]);
    const result = deleteFlow(before, 'plan');
    expect(result.ok && result.removed).toEqual([
      { source: 'specify', target: 'plan', label: 'spec.md', gate },
    ]);
  });

  it('F-11 AC-031 lists nothing when the flow has no connection', () => {
    const before = chain();
    const result = deleteFlow(before, 'notes');
    expect(result).toEqual({
      ok: true,
      pipeline: { ...before, flows: before.flows.filter((f) => f.id !== 'notes') },
      removed: [],
    });
  });

  it('F-11 AC-031 lists a flow whose arrow points to itself once, with its gate', () => {
    const before = config([flow('loop', { connectedTo: { to: 'loop', label: 'again', gate } }), flow('other')]);
    const result = deleteFlow(before, 'loop');
    expect(result).toEqual({
      ok: true,
      pipeline: config([flow('other')]),
      removed: [{ source: 'loop', target: 'loop', label: 'again', gate }],
    });
  });

  it('F-11 AC-031 lists each incoming arrow when several flows point to the deleted flow', () => {
    const before = config([
      flow('a', { connectedTo: { to: 'hub', label: 'x' } }),
      flow('b', { connectedTo: { to: 'hub', label: 'y', gate } }),
      flow('hub', { connectedTo: { to: 'c', label: 'z' } }),
      flow('c'),
    ]);
    const result = deleteFlow(before, 'hub');
    expect(result.ok && result.removed.map((arrow) => arrow.source)).toEqual(['a', 'b', 'hub']);
  });

  it('F-11 AC-031 does not change the pipeline it is given', () => {
    const before = chain();
    const snapshot = structuredClone(before);
    deleteFlow(before, 'plan');
    expect(before).toEqual(snapshot);
  });
});

describe('F-11 AC-032 a confirmed delete removes the flow, its connections and their gates', () => {
  it('F-11 AC-032 removes the flow from the flow list', () => {
    const result = deleteFlow(chain(), 'plan');
    expect(result.ok && result.pipeline.flows.map((f) => f.id)).toEqual(['specify', 'build', 'ship', 'notes']);
  });

  it('F-11 AC-032 removes the outgoing arrow and its gate with the flow', () => {
    const result = deleteFlow(chain(), 'plan');
    expect(result.ok && result.pipeline.flows.find((f) => f.id === 'plan')).toBeUndefined();
    expect(result.ok && result.pipeline.flows.some((f) => f.connectedTo?.gate !== undefined)).toBe(false);
  });

  it('F-11 AC-032 removes the arrow that points to the flow and leaves its source flow without a connection', () => {
    const result = deleteFlow(chain(), 'plan');
    expect(result.ok && result.pipeline.flows.find((f) => f.id === 'specify')).toEqual(
      flow('specify'),
    );
  });

  it('F-11 AC-032 leaves no connectedTo key behind on a source flow whose arrow was removed', () => {
    const result = deleteFlow(chain(), 'plan');
    const specify = result.ok ? result.pipeline.flows.find((f) => f.id === 'specify') : undefined;
    expect(specify !== undefined && 'connectedTo' in specify).toBe(false);
  });

  it('F-11 AC-032 keeps the other flows, their arrows and their gates unchanged', () => {
    const before = chain();
    const result = deleteFlow(before, 'plan');
    expect(result.ok && result.pipeline.flows.find((f) => f.id === 'build')).toEqual(
      before.flows.find((f) => f.id === 'build'),
    );
    expect(result.ok && result.pipeline.flows.find((f) => f.id === 'ship')).toEqual(
      before.flows.find((f) => f.id === 'ship'),
    );
    expect(result.ok && result.pipeline.flows.find((f) => f.id === 'notes')).toEqual(
      before.flows.find((f) => f.id === 'notes'),
    );
  });

  it('F-11 AC-032 keeps the pipeline fields unchanged', () => {
    const before = { ...chain(), description: 'the process' };
    const result = deleteFlow(before, 'plan');
    expect(result.ok && result.pipeline.name).toBe('pipeline');
    expect(result.ok && result.pipeline.description).toBe('the process');
    expect(result.ok && result.pipeline.arguments).toEqual([]);
  });

  it('F-11 AC-032 deletes a flow that is the source of an arrow to a flow that stays', () => {
    const result = deleteFlow(chain(), 'build');
    expect(result.ok && result.pipeline.flows.map((f) => f.id)).toEqual([
      'specify',
      'plan',
      'ship',
      'notes',
    ]);
    const plan = result.ok ? result.pipeline.flows.find((f) => f.id === 'plan') : undefined;
    expect(plan !== undefined && 'connectedTo' in plan).toBe(false);
  });

  it('F-11 AC-032 does not change the pipeline it is given', () => {
    const before = chain();
    const snapshot = structuredClone(before);
    deleteFlow(before, 'specify');
    expect(before).toEqual(snapshot);
  });
});

describe('F-11 AC-033 deleting the last flow', () => {
  it('F-11 AC-033 allows deleting the only flow, and leaves the pipeline with no flow', () => {
    const result = deleteFlow(config([flow('only')]), 'only');
    expect(result).toEqual({ ok: true, pipeline: config([]), removed: [] });
  });

  it('F-11 AC-033 allows deleting the last remaining flow after the others are gone', () => {
    const one = deleteFlow(config([flow('a', { connectedTo: { to: 'b', label: 'x' } }), flow('b')]), 'a');
    expect(one.ok).toBe(true);
    if (!one.ok) return;
    const last = deleteFlow(one.pipeline, 'b');
    expect(last).toEqual({ ok: true, pipeline: config([]), removed: [] });
  });
});

describe('F-11 AC-031 refusal of an unknown flow id', () => {
  it('F-11 AC-031 refuses a flow id that is not in the pipeline, with the reason, and changes nothing', () => {
    const before = chain();
    const snapshot = structuredClone(before);
    const result = deleteFlow(before, 'missing');
    expect(result).toEqual({ ok: false, reason: UNKNOWN_FLOW_REASON });
    expect(before).toEqual(snapshot);
  });

  it('F-11 AC-031 refuses any id on an empty pipeline, with the reason', () => {
    expect(deleteFlow(config([]), 'specify')).toEqual({ ok: false, reason: UNKNOWN_FLOW_REASON });
  });
});
