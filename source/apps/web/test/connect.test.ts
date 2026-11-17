import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import {
  ALREADY_CONNECTED_REASON,
  BLANK_LABEL_REASON,
  SELF_CONNECTION_REASON,
  SOURCE_NOT_IN_PIPELINE_REASON,
  TARGET_NOT_IN_PIPELINE_REASON,
  connectFlows,
} from '../src/builder/connect.js';

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
