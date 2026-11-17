import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import {
  ALREADY_CONNECTED_REASON,
  BLANK_LABEL_REASON,
  NO_ARROW_REASON,
  SELF_CONNECTION_REASON,
  SOURCE_NOT_IN_PIPELINE_REASON,
  TARGET_NOT_IN_PIPELINE_REASON,
  connectFlows,
  connectionConfirmation,
  removeConnection,
  repointConnection,
} from '../src/builder/connect.js';
import type { Connection } from '../src/builder/model.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

function flow(id: string, extra: Partial<Flow> = {}): Flow {
  return { id, name: `Name ${id}`, description: '', arguments: '', blocks: [], ...extra };
}

function config(flows: Flow[]): Pipeline {
  return { name: 'pipeline', description: '', arguments: [], flows };
}

describe('F-11 AC-013 artifact label of a new connection', () => {
  const refused: Array<[string, string]> = [
    ['empty', ''],
    ['of spaces only', '   '],
    ['of tabs and newlines only', '\t\n '],
  ];

  for (const [label, value] of refused) {
    it(`F-11 AC-013 refuses a label that is ${label}, with the reason, and adds no connection`, () => {
      const before = config([flow('specify'), flow('plan')]);
      const result = connectFlows(before, { source: 'specify', target: 'plan', label: value });
      expect(result).toEqual({ ok: false, reason: BLANK_LABEL_REASON });
      expect(before.flows[0]?.connectedTo).toBeUndefined();
    });
  }

  it('F-11 AC-013 accepts a valid label and adds the connection on the source flow', () => {
    const result = connectFlows(config([flow('specify'), flow('plan')]), {
      source: 'specify',
      target: 'plan',
      label: 'spec.md',
    });
    expect(result).toEqual({
      ok: true,
      pipeline: config([flow('specify', { connectedTo: { to: 'plan', label: 'spec.md' } }), flow('plan')]),
    });
  });

  it('F-11 AC-013 does not change the pipeline it is given when the label is refused', () => {
    const before = config([flow('specify'), flow('plan')]);
    const snapshot = structuredClone(before);
    connectFlows(before, { source: 'specify', target: 'plan', label: ' ' });
    expect(before).toEqual(snapshot);
  });
});

describe('F-11 AC-014 connect to next flow', () => {
  it('F-11 AC-014 creates a connection from the source flow to the chosen target, with the label given', () => {
    const result = connectFlows(config([flow('specify'), flow('plan'), flow('build')]), {
      source: 'plan',
      target: 'build',
      label: 'plan.md',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pipeline.flows[1]?.connectedTo).toEqual({ to: 'build', label: 'plan.md' });
      expect(result.pipeline.flows[0]?.connectedTo).toBeUndefined();
    }
  });

  it('F-11 AC-014 refuses a target that is not in the pipeline, with the reason', () => {
    const result = connectFlows(config([flow('specify')]), { source: 'specify', target: 'ghost', label: 'a' });
    expect(result).toEqual({ ok: false, reason: TARGET_NOT_IN_PIPELINE_REASON });
  });

  it('F-11 AC-014 refuses a source that is not in the pipeline, with the reason', () => {
    const result = connectFlows(config([flow('plan')]), { source: 'ghost', target: 'plan', label: 'a' });
    expect(result).toEqual({ ok: false, reason: SOURCE_NOT_IN_PIPELINE_REASON });
  });

  it('F-11 AC-014 refuses a flow connected to itself, with the reason, and adds no connection', () => {
    const before = config([flow('specify'), flow('plan')]);
    const result = connectFlows(before, { source: 'specify', target: 'specify', label: 'spec.md' });
    expect(result).toEqual({ ok: false, reason: SELF_CONNECTION_REASON });
    expect(before.flows[0]?.connectedTo).toBeUndefined();
  });

  it('F-11 AC-014 refuses a second arrow from a flow that already has one, and keeps the existing arrow', () => {
    const existing = config([
      flow('specify', { connectedTo: { to: 'plan', label: 'spec.md' } }),
      flow('plan'),
      flow('build'),
    ]);
    const result = connectFlows(existing, { source: 'specify', target: 'build', label: 'other.md' });
    expect(result).toEqual({ ok: false, reason: ALREADY_CONNECTED_REASON });
    expect(existing.flows[0]?.connectedTo).toEqual({ to: 'plan', label: 'spec.md' });
  });

  it('F-11 AC-014 allows a flow to be the target of more than one arrow', () => {
    const result = connectFlows(
      config([flow('specify', { connectedTo: { to: 'build', label: 'a' } }), flow('plan'), flow('build')]),
      { source: 'plan', target: 'build', label: 'b' },
    );
    expect(result.ok).toBe(true);
  });

  it('F-11 AC-014 keeps the other flows and the pipeline fields unchanged', () => {
    const argument = { id: 'topic', required: true, hint: 'h' };
    const result = connectFlows(
      { name: 'pipeline', description: 'd', arguments: [argument], flows: [flow('specify'), flow('plan')] },
      { source: 'specify', target: 'plan', label: 'spec.md' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pipeline.name).toBe('pipeline');
      expect(result.pipeline.description).toBe('d');
      expect(result.pipeline.arguments).toEqual([argument]);
      expect(result.pipeline.flows[1]).toEqual(flow('plan'));
    }
  });
});

const checkGate = { kind: 'check', description: 'Tests pass', type: 'checks' } as const;

describe('F-11 AC-015 repoint an arrow end', () => {
  it('F-11 AC-015 moves the target and keeps the label and the gate', () => {
    const before = config([
      flow('build', { connectedTo: { to: 'verify', label: 'code', gate: checkGate } }),
      flow('verify'),
      flow('ship'),
    ]);
    const result = repointConnection(before, 'build', { end: 'target', flow: 'ship' });
    expect(result).toEqual({
      ok: true,
      pipeline: config([
        flow('build', { connectedTo: { to: 'ship', label: 'code', gate: checkGate } }),
        flow('verify'),
        flow('ship'),
      ]),
    });
  });

  it('F-11 AC-015 moves the source and keeps the label and the gate on the moved arrow', () => {
    const before = config([
      flow('ux', { connectedTo: { to: 'plan', label: 'spec.md', gate: checkGate } }),
      flow('specify'),
      flow('plan'),
    ]);
    const result = repointConnection(before, 'ux', { end: 'source', flow: 'specify' });
    expect(result).toEqual({
      ok: true,
      pipeline: config([
        flow('ux'),
        flow('specify', { connectedTo: { to: 'plan', label: 'spec.md', gate: checkGate } }),
        flow('plan'),
      ]),
    });
  });

  it('F-11 AC-015 moves an arrow without a gate and adds no gate', () => {
    const result = repointConnection(
      config([flow('a', { connectedTo: { to: 'b', label: 'x' } }), flow('b'), flow('c')]),
      'a',
      { end: 'source', flow: 'c' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pipeline.flows[2]?.connectedTo).toEqual({ to: 'b', label: 'x' });
      expect(result.pipeline.flows[2]?.connectedTo).not.toHaveProperty('gate');
    }
  });

  it('F-11 AC-015 refuses a target that is not in the pipeline, with the reason, and changes nothing', () => {
    const before = config([flow('a', { connectedTo: { to: 'b', label: 'x' } }), flow('b')]);
    const snapshot = structuredClone(before);
    const result = repointConnection(before, 'a', { end: 'target', flow: 'ghost' });
    expect(result).toEqual({ ok: false, reason: TARGET_NOT_IN_PIPELINE_REASON });
    expect(before).toEqual(snapshot);
  });

  it('F-11 AC-015 refuses a target that is the flow itself, with the reason', () => {
    const before = config([flow('a', { connectedTo: { to: 'b', label: 'x' } }), flow('b')]);
    const result = repointConnection(before, 'a', { end: 'target', flow: 'a' });
    expect(result).toEqual({ ok: false, reason: SELF_CONNECTION_REASON });
  });

  it('F-11 AC-015 refuses a source that is not in the pipeline, with the reason', () => {
    const before = config([flow('a', { connectedTo: { to: 'b', label: 'x' } }), flow('b')]);
    const result = repointConnection(before, 'a', { end: 'source', flow: 'ghost' });
    expect(result).toEqual({ ok: false, reason: SOURCE_NOT_IN_PIPELINE_REASON });
  });

  it('F-11 AC-015 refuses moving the source onto the arrow target, with the reason', () => {
    const before = config([flow('a', { connectedTo: { to: 'b', label: 'x' } }), flow('b')]);
    const result = repointConnection(before, 'a', { end: 'source', flow: 'b' });
    expect(result).toEqual({ ok: false, reason: SELF_CONNECTION_REASON });
  });

  it('F-11 AC-015 refuses moving the source onto a flow that already has an arrow, and keeps both arrows', () => {
    const before = config([
      flow('a', { connectedTo: { to: 'b', label: 'x' } }),
      flow('c', { connectedTo: { to: 'b', label: 'y' } }),
      flow('b'),
    ]);
    const snapshot = structuredClone(before);
    const result = repointConnection(before, 'a', { end: 'source', flow: 'c' });
    expect(result).toEqual({ ok: false, reason: ALREADY_CONNECTED_REASON });
    expect(before).toEqual(snapshot);
  });

  it('F-11 AC-015 refuses a repoint of a flow that has no arrow, with the reason', () => {
    const result = repointConnection(config([flow('a'), flow('b')]), 'a', { end: 'target', flow: 'b' });
    expect(result).toEqual({ ok: false, reason: NO_ARROW_REASON });
  });

  it('F-11 AC-015 keeps the pipeline when the source is moved to the flow that already is the source', () => {
    const before = config([flow('a', { connectedTo: { to: 'b', label: 'x', gate: checkGate } }), flow('b')]);
    const result = repointConnection(before, 'a', { end: 'source', flow: 'a' });
    expect(result).toEqual({ ok: true, pipeline: before });
  });

  it('F-11 AC-015 does not change the pipeline it is given when a move succeeds', () => {
    const before = config([
      flow('a', { connectedTo: { to: 'b', label: 'x', gate: checkGate } }),
      flow('b'),
      flow('c'),
    ]);
    const snapshot = structuredClone(before);
    repointConnection(before, 'a', { end: 'source', flow: 'c' });
    repointConnection(before, 'a', { end: 'target', flow: 'c' });
    expect(before).toEqual(snapshot);
  });
});

describe('F-11 AC-016 delete an arrow', () => {
  it('F-11 AC-016 removes the connection and its gate, and keeps the flows', () => {
    const result = removeConnection(
      config([flow('build', { connectedTo: { to: 'verify', label: 'code', gate: checkGate } }), flow('verify')]),
      'build',
    );
    expect(result).toEqual({ ok: true, pipeline: config([flow('build'), flow('verify')]) });
  });

  it('F-11 AC-016 removes an arrow that has no gate, and leaves no connectedTo key behind', () => {
    const result = removeConnection(
      config([flow('build', { connectedTo: { to: 'verify', label: 'code' } }), flow('verify')]),
      'build',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pipeline.flows[0]).not.toHaveProperty('connectedTo');
    }
  });

  it('F-11 AC-016 refuses to remove an arrow from a flow that has none, with the reason', () => {
    const before = config([flow('a'), flow('b')]);
    expect(removeConnection(before, 'a')).toEqual({ ok: false, reason: NO_ARROW_REASON });
    expect(removeConnection(before, 'ghost')).toEqual({ ok: false, reason: NO_ARROW_REASON });
  });

  it('F-11 AC-016 does not change the pipeline it is given', () => {
    const before = config([flow('a', { connectedTo: { to: 'b', label: 'x', gate: checkGate } }), flow('b')]);
    const snapshot = structuredClone(before);
    removeConnection(before, 'a');
    expect(before).toEqual(snapshot);
  });

  it('F-11 AC-016 confirmation names the arrow, its artifact and its gate', () => {
    const connection: Connection = { source: 'build', target: 'verify', label: 'code', gate: checkGate };
    const text = connectionConfirmation(connection);
    expect(text.title).toBe('Delete the arrow build → verify?');
    expect(text.detail).toContain('"code"');
    expect(text.detail).toContain('Tests pass');
  });

  it('F-11 AC-016 confirmation names no gate when the arrow has none', () => {
    const connection: Connection = { source: 'build', target: 'verify', label: 'code', gate: undefined };
    const text = connectionConfirmation(connection);
    expect(text.detail).not.toContain('gate');
    expect(text.detail).toContain('"code"');
  });
});
