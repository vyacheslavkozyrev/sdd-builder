import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import {
  editConditionDescription,
  falseRouteOf,
  falseRouteText,
  setConditionRoundLimit,
  trueRouteText,
  type ConditionFieldResult,
} from '../src/builder/blockCondition.js';
import type { Pipeline, Rule } from '../src/builder/fields.js';

type Block = model.Block;
type ConditionBlock = model.ConditionBlock;

const RULES: readonly Rule[] = [{ index: 0, id: 'plain-style', title: 'Plain style', text: 'Write plainly.' }];

// A plan flow with an Agent `review`, a return `check` (false to review, limit 3), a forward Condition `gate`
// (false to the End, no limit), a Condition `halt` that stops on false, and the End `done`. Agent `review` is
// the Agent the return points to; `check` is the block the tests edit.
function savedPipeline(): Pipeline {
  const blocks: Block[] = [
    { index: 0, id: 'start', kind: 'start', next: 'review' },
    {
      index: 1,
      id: 'review',
      kind: 'agent',
      name: 'review',
      description: 'Reviews the plan.',
      arguments: [],
      next: 'check',
    },
    {
      index: 2,
      id: 'check',
      kind: 'condition',
      description: 'The reviewer approves.',
      true: { to: 'gate' },
      false: { to: 'review', roundLimit: 3 },
    },
    {
      index: 3,
      id: 'gate',
      kind: 'condition',
      description: 'The plan is complete.',
      true: { to: 'done' },
      false: { to: 'done' },
    },
    {
      index: 4,
      id: 'halt',
      kind: 'condition',
      description: 'Nothing else.',
      true: { to: '' },
      false: { stop: true },
    },
    { index: 5, id: 'done', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ];
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: [
      {
        index: 0,
        id: 'plan',
        name: 'Plan',
        arguments: [],
        body: 'Plan the work.',
        artifacts: [{ label: 'plan.md', template: 'output.md' }],
        approval: true,
        blocks,
      },
    ],
  };
}

function conditionOf(pipelineState: Pipeline, id: string): ConditionBlock {
  const block = pipelineState.flows[0]?.blocks.find((item) => item.id === id);
  if (block === undefined || block.kind !== 'condition') throw new Error(`no Condition ${id}`);
  return block;
}

// The saved pipeline with the return `check` holding no round limit (AC-017).
function withoutRoundLimit(): Pipeline {
  const pipelineState = savedPipeline();
  const flow = flowOf(pipelineState);
  return {
    ...pipelineState,
    flows: [
      {
        ...flow,
        blocks: flow.blocks.map((block) =>
          block.id === 'check' && block.kind === 'condition' ? { ...block, false: { to: 'review' } } : block,
        ),
      },
    ],
  };
}

function flowOf(pipelineState: Pipeline) {
  const flow = pipelineState.flows[0];
  if (flow === undefined) throw new Error('no flow');
  return flow;
}

// The result of an edit that must have been accepted; a refusal fails the test with its reason.
function acceptedOf(result: ConditionFieldResult): Pipeline {
  if (!result.ok) throw new Error(`expected the edit to be accepted, refused: ${result.reason}`);
  return result.pipeline;
}

// The reason of an edit that must have been refused; an accepted edit fails the test.
function refusedOf(result: ConditionFieldResult): string {
  if (result.ok) throw new Error('expected the edit to be refused');
  return result.reason;
}

describe('F-12 AC-030 Condition description', () => {
  it('saves a description as written', () => {
    const saved = acceptedOf(editConditionDescription(savedPipeline(), RULES, 'plan', 'check', 'Checks the tests.'));
    expect(conditionOf(saved, 'check').description).toBe('Checks the tests.');
  });

  it.each([[''], ['   ']])('refuses the blank description %j with the parser reason and keeps the saved one', (value) => {
    const pipelineState = savedPipeline();
    expect(editConditionDescription(pipelineState, RULES, 'plan', 'check', value)).toEqual({
      ok: false,
      field: 'description',
      reason: 'must not be blank',
    });
    expect(conditionOf(pipelineState, 'check').description).toBe('The reviewer approves.');
  });

  it('refuses a description longer than 1000 characters and accepts 1000', () => {
    const pipelineState = savedPipeline();
    expect(editConditionDescription(pipelineState, RULES, 'plan', 'check', 'a'.repeat(1001))).toEqual({
      ok: false,
      field: 'description',
      reason: 'must be at most 1000 characters',
    });
    const saved = acceptedOf(editConditionDescription(pipelineState, RULES, 'plan', 'check', 'a'.repeat(1000)));
    expect(conditionOf(saved, 'check').description).toHaveLength(1000);
  });

  it('leaves the other blocks and their arrows as they were', () => {
    const pipelineState = savedPipeline();
    const saved = acceptedOf(editConditionDescription(pipelineState, RULES, 'plan', 'check', 'Checks the tests.'));
    expect(flowOf(saved).blocks.filter((block) => block.id !== 'check')).toEqual(
      flowOf(pipelineState).blocks.filter((block) => block.id !== 'check'),
    );
    expect(conditionOf(saved, 'check').false).toEqual({ to: 'review', roundLimit: 3 });
  });
});

describe('F-12 AC-031 true route text', () => {
  it('shows the block the true arrow leads to as "Next: <name>"', () => {
    expect(trueRouteText(flowOf(savedPipeline()), conditionOf(savedPipeline(), 'check'))).toBe(
      'Next: Condition: The plan is complete.',
    );
  });

  it('shows "No arrow yet" when the true output is empty', () => {
    expect(trueRouteText(flowOf(savedPipeline()), conditionOf(savedPipeline(), 'halt'))).toBe('No arrow yet');
  });
});

describe('F-12 AC-032 false route text', () => {
  const pipelineState = savedPipeline();
  const flow = flowOf(pipelineState);

  it('shows "Stop the flow and ask the user" when there is no arrow', () => {
    expect(falseRouteText(flow, conditionOf(pipelineState, 'halt'))).toBe('Stop the flow and ask the user');
  });

  it('shows "Goes to <name>" for a later block', () => {
    expect(falseRouteText(flow, conditionOf(pipelineState, 'gate'))).toBe('Goes to End');
    expect(falseRouteOf(flow, conditionOf(pipelineState, 'gate'))).toEqual({ kind: 'forward', target: 'done' });
  });

  it('shows "Returns to <name>, up to N rounds" for a return to an earlier Agent', () => {
    expect(falseRouteText(flow, conditionOf(pipelineState, 'check'))).toBe('Returns to review, up to 3 rounds');
    expect(falseRouteOf(flow, conditionOf(pipelineState, 'check'))).toEqual({
      kind: 'return',
      target: 'review',
      roundLimit: 3,
    });
  });

  it('says the limit is not set for a return that has none', () => {
    const unset = withoutRoundLimit();
    expect(falseRouteText(flowOf(unset), conditionOf(unset, 'check'))).toBe(
      'Returns to review, round limit not set',
    );
  });
});

describe('F-12 AC-033 round limit', () => {
  it.each([
    ['1', 1],
    ['3', 3],
    ['5', 5],
    [' 4 ', 4],
  ])('accepts the limit %j as %i', (text, expected) => {
    const saved = acceptedOf(setConditionRoundLimit(savedPipeline(), RULES, 'plan', 'check', text));
    expect(conditionOf(saved, 'check').false).toEqual({ to: 'review', roundLimit: expected });
  });

  it.each([
    ['0'],
    ['6'],
    ['2.5'],
    ['1.0'],
    ['-1'],
    ['abc'],
    [''],
    ['   '],
  ])('refuses the limit %j with the reason of AC-033 and keeps the saved limit', (text) => {
    const pipelineState = savedPipeline();
    const result = setConditionRoundLimit(pipelineState, RULES, 'plan', 'check', text);
    expect(refusedOf(result)).toBe('A return allows 1 to 5 rounds.');
    expect(conditionOf(pipelineState, 'check').false).toEqual({ to: 'review', roundLimit: 3 });
  });

  it('sets a limit on a return whose limit is unset', () => {
    const saved = acceptedOf(setConditionRoundLimit(withoutRoundLimit(), RULES, 'plan', 'check', '2'));
    expect(conditionOf(saved, 'check').false).toEqual({ to: 'review', roundLimit: 2 });
  });

  it('is a programmer error to set a limit on a forward route, which shows no field (AC-034)', () => {
    expect(() => setConditionRoundLimit(savedPipeline(), RULES, 'plan', 'gate', '2')).toThrow(/not a return/);
  });
});

describe('F-12 AC-034 round field only for a return', () => {
  it('has no round limit on a forward route and on a stop route', () => {
    const pipelineState = savedPipeline();
    const flow = flowOf(pipelineState);
    expect(falseRouteOf(flow, conditionOf(pipelineState, 'gate'))).toEqual({ kind: 'forward', target: 'done' });
    expect(falseRouteOf(flow, conditionOf(pipelineState, 'halt'))).toEqual({ kind: 'stop' });
    expect(falseRouteText(flow, conditionOf(pipelineState, 'gate'))).not.toContain('rounds');
    expect(falseRouteText(flow, conditionOf(pipelineState, 'halt'))).not.toContain('rounds');
  });

  it('is a programmer error to set a limit on a stop route', () => {
    expect(() => setConditionRoundLimit(savedPipeline(), RULES, 'plan', 'halt', '2')).toThrow(/not a return/);
  });
});

describe('Condition edits: programmer errors', () => {
  it('throws for a block that is not a Condition', () => {
    expect(() => editConditionDescription(savedPipeline(), RULES, 'plan', 'review', 'x')).toThrow(/not a Condition/);
  });

  it('throws for an unknown flow or block', () => {
    expect(() => editConditionDescription(savedPipeline(), RULES, 'nope', 'check', 'x')).toThrow(/no flow/);
    expect(() => editConditionDescription(savedPipeline(), RULES, 'plan', 'nope', 'x')).toThrow(/no block/);
  });
});
