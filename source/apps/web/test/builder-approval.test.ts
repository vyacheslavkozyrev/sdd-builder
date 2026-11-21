import { describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import { setFlowApproval } from '../src/builder/fields.js';
import type { Pipeline, Rule, RowResult } from '../src/builder/fields.js';

type Flow = core.Flow;

// A flow with the required fields only; `next` is set only when given.
function flow(id: string, name: string = id, next?: string): Flow {
  const base: Flow = {
    index: 0,
    id,
    name,
    description: `The ${name} step.`,
    arguments: [],
    body: `Do the ${name} work.`,
    artifacts: [{ label: `${id}.md`, template: 'output.md' }],
    approval: false,
    blocks: [],
  };
  return next === undefined ? base : { ...base, next };
}

// A flow with every field set, so a change to any field other than `approval` would show.
function fullFlow(id: string, next?: string): Flow {
  return {
    ...flow(id, `Full ${id}`, next),
    model: 'sonnet',
    arguments: [{ index: 0, id: 'topic', required: true, hint: 'The topic.' }],
    ruleTags: [{ index: 0, ruleId: 'style' }],
  };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [{ index: 0, id: 'project', required: false, hint: 'The project.' }],
    model: 'haiku',
    flows: flows.map((item, index) => ({ ...item, index })),
  };
}

// Two connected flows, the first with approval off and every field set.
function linkedPipeline(): Pipeline {
  return pipelineOf(fullFlow('plan', 'build'), flow('build'));
}

const RULES: readonly Rule[] = [{ index: 0, id: 'style', title: 'style', text: 'The style rule.' }];

// The flow `id` of a pipeline, read after an edit that must have been accepted.
function flowOf(pipelineState: Pipeline, id: string): Flow {
  const found = pipelineState.flows.find((item) => item.id === id);
  if (found === undefined) throw new Error(`no flow ${id}`);
  return found;
}

// The pipeline of an accepted result. A refusal fails the test.
function accepted(result: RowResult): Pipeline {
  if (!result.ok) throw new Error(`expected the approval to be accepted, got: ${result.reason}`);
  return result.pipeline;
}

describe('F-11 AC-027 Human approval is a checkbox: ticking it turns approval on', () => {
  it('sets the approval of the flow to true', () => {
    const after = accepted(setFlowApproval(linkedPipeline(), RULES, 'plan', true));
    expect(flowOf(after, 'plan').approval).toBe(true);
  });

  it('keeps the approval of the flow on when it is ticked again', () => {
    const once = accepted(setFlowApproval(linkedPipeline(), RULES, 'plan', true));
    const twice = accepted(setFlowApproval(once, RULES, 'plan', true));
    expect(flowOf(twice, 'plan').approval).toBe(true);
    expect(twice).toEqual(once);
  });
});

describe('F-11 AC-027 Human approval is a checkbox: unticking it turns approval off', () => {
  it('sets the approval of the flow to false', () => {
    const on = accepted(setFlowApproval(linkedPipeline(), RULES, 'plan', true));
    const after = accepted(setFlowApproval(on, RULES, 'plan', false));
    expect(flowOf(after, 'plan').approval).toBe(false);
  });

  it('returns the pipeline it had before ticking when it is ticked and unticked', () => {
    const saved = linkedPipeline();
    const on = accepted(setFlowApproval(saved, RULES, 'plan', true));
    const back = accepted(setFlowApproval(on, RULES, 'plan', false));
    expect(back).toEqual(saved);
  });
});

describe('F-11 AC-027 Human approval changes nothing but the approval value of its flow', () => {
  it('keeps every other field of the flow it changes', () => {
    const saved = linkedPipeline();
    const after = accepted(setFlowApproval(saved, RULES, 'plan', true));
    expect(flowOf(after, 'plan')).toEqual({ ...flowOf(saved, 'plan'), approval: true });
  });

  it('keeps every other flow of the pipeline as it was', () => {
    const saved = linkedPipeline();
    const after = accepted(setFlowApproval(saved, RULES, 'plan', true));
    expect(flowOf(after, 'build')).toEqual(flowOf(saved, 'build'));
  });

  it('keeps the pipeline-level fields as they were', () => {
    const saved = linkedPipeline();
    const after = accepted(setFlowApproval(saved, RULES, 'build', true));
    const { flows: _savedFlows, ...savedRest } = saved;
    const { flows: _afterFlows, ...afterRest } = after;
    expect(afterRest).toEqual(savedRest);
  });

  it('changes only the approval of the one flow named, among several flows', () => {
    const saved = pipelineOf(fullFlow('plan', 'build'), flow('build', 'Build', 'ship'), flow('ship'));
    const after = accepted(setFlowApproval(saved, RULES, 'build', true));
    expect(after.flows.map((item) => item.approval)).toEqual([false, true, false]);
    expect(after.flows.map((item) => ({ ...item, approval: false }))).toEqual(
      saved.flows.map((item) => ({ ...item, approval: false })),
    );
  });

  it('does not change the saved pipeline it was given', () => {
    const saved = linkedPipeline();
    const snapshot = structuredClone(saved);
    setFlowApproval(saved, RULES, 'plan', true);
    expect(saved).toEqual(snapshot);
  });
});

describe('F-11 AC-027 Human approval throws a programmer error for a flow that the pipeline does not have', () => {
  it('throws a programmer error for a flow id that is not in the pipeline', () => {
    expect(() => setFlowApproval(linkedPipeline(), RULES, 'missing', true)).toThrow(
      'F-11: the pipeline has no flow "missing"',
    );
  });
});
