import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { deleteFlow } from '../src/builder/delete.js';
import type { Pipeline } from '../src/builder/delete.js';

type Flow = model.Flow;

// A flow with its owned parts filled in, so a test can see that they leave with it. `next` is set
// only when given.
function fullFlow(id: string, next?: string): Flow {
  const base: Flow = {
    index: 0,
    id,
    name: `Name of ${id}`,
    description: `About ${id}.`,
    arguments: [{ index: 0, id: 'topic', required: true, hint: 'The topic.' }],
    body: 'Do the work.',
    artifacts: [{ label: `${id} output`, template: `${id}.md` }],
    approval: true,
    ruleTags: [{ index: 0, ruleId: 'rule-a' }],
    blocks: [{ index: 0, id: `${id}-end`, kind: 'end', outcome: 'done', producedArtifact: `${id} output` }],
  };
  return next === undefined ? base : { ...base, next };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [{ index: 0, id: 'project', required: true, hint: 'The project.' }],
    flows: flows.map((f, i) => ({ ...f, index: i })),
  };
}

function idsOf(pipelineState: Pipeline): readonly string[] {
  return pipelineState.flows.map((flow) => flow.id);
}

describe('F-11 AC-030 delete removes the flow with what it owns', () => {
  it('removes the flow and keeps the pipeline fields', () => {
    const before = pipelineOf(fullFlow('a'), fullFlow('b'));
    const after = deleteFlow(before, 'a');
    expect(idsOf(after)).toEqual(['b']);
    expect(after.name).toBe('Demo');
    expect(after.description).toBe('A demo pipeline.');
    expect(after.arguments).toEqual(before.arguments);
  });

  it('removes a flow that carries arguments, artifacts, approval, rule tags and blocks', () => {
    const after = deleteFlow(pipelineOf(fullFlow('a'), fullFlow('b')), 'b');
    expect(after.flows).toHaveLength(1);
    expect(JSON.stringify(after)).not.toContain('b-end');
    expect(JSON.stringify(after)).not.toContain('b.md');
  });

  it('removes the flow own next', () => {
    const after = deleteFlow(pipelineOf(fullFlow('a', 'b'), fullFlow('b', 'c'), fullFlow('c')), 'b');
    expect(idsOf(after)).toEqual(['a', 'c']);
    expect(after.flows[0]?.next).toBeUndefined();
    expect('next' in (after.flows[0] ?? {})).toBe(false);
  });

  it('does not change its input', () => {
    const before = pipelineOf(fullFlow('a', 'b'), fullFlow('b'));
    const snapshot = JSON.stringify(before);
    deleteFlow(before, 'b');
    deleteFlow(before, 'a');
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

describe('F-11 AC-030 a flow whose next named the deleted flow loses that next', () => {
  it('removes next from the flow that pointed at the deleted flow', () => {
    const after = deleteFlow(pipelineOf(fullFlow('a', 'b'), fullFlow('b')), 'b');
    expect(after.flows[0]?.id).toBe('a');
    expect(after.flows[0]?.next).toBeUndefined();
  });

  it('removes only the next that named it, and keeps a next to another flow', () => {
    const after = deleteFlow(pipelineOf(fullFlow('a', 'b'), fullFlow('b'), fullFlow('c', 'a')), 'b');
    expect(after.flows.find((flow) => flow.id === 'a')?.next).toBeUndefined();
    expect(after.flows.find((flow) => flow.id === 'c')?.next).toBe('a');
  });

  it('keeps a next that names some other flow', () => {
    const after = deleteFlow(pipelineOf(fullFlow('a', 'c'), fullFlow('b'), fullFlow('c')), 'b');
    expect(after.flows.find((flow) => flow.id === 'a')?.next).toBe('c');
  });
});

describe('F-11 AC-030 the other flows keep all their fields', () => {
  it('leaves every field of the surviving flows unchanged', () => {
    const survivor = fullFlow('a', 'c');
    const before = pipelineOf(survivor, fullFlow('b', 'a'), fullFlow('c'));
    const after = deleteFlow(before, 'b');
    const kept = after.flows.find((flow) => flow.id === 'a');
    expect(kept).toEqual({ ...before.flows[0], index: 0 });
    expect(after.flows.find((flow) => flow.id === 'c')).toEqual({ ...before.flows[2], index: 1 });
  });

  it('renumbers the surviving flows so each index is its position', () => {
    const after = deleteFlow(pipelineOf(fullFlow('a'), fullFlow('b'), fullFlow('c')), 'a');
    expect(after.flows.map((flow) => flow.index)).toEqual([0, 1]);
    expect(idsOf(after)).toEqual(['b', 'c']);
  });
});

describe('F-11 AC-032 the last flow can be deleted', () => {
  it('deletes the only flow and leaves a pipeline with no flows', () => {
    const after = deleteFlow(pipelineOf(fullFlow('a')), 'a');
    expect(after.flows).toEqual([]);
    expect(after.name).toBe('Demo');
  });

  it('deletes the last remaining flow after others were deleted', () => {
    const first = deleteFlow(pipelineOf(fullFlow('a', 'b'), fullFlow('b')), 'a');
    const second = deleteFlow(first, 'b');
    expect(second.flows).toEqual([]);
  });
});

describe('F-11 AC-030 an unknown flow id is a programmer error', () => {
  it('throws for a flow id the pipeline does not hold', () => {
    expect(() => deleteFlow(pipelineOf(fullFlow('a')), 'missing')).toThrow(/no flow "missing"/);
  });

  it('throws on an empty pipeline', () => {
    expect(() => deleteFlow(pipelineOf(), 'a')).toThrow(/no flow "a"/);
  });

  it('throws when the id is only the name of a flow, not its id', () => {
    const flowNamed: Flow = { ...fullFlow('a'), name: 'b' };
    expect(() => deleteFlow(pipelineOf(flowNamed), 'b')).toThrow(/no flow "b"/);
  });
});
