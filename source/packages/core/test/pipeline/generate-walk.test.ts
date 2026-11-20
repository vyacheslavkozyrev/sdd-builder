import { describe, expect, it } from 'vitest';
import type { AgentBlock, Block, ConditionBlock, Flow, Route } from '../../src/pipeline/model.js';
import { GenerationError } from '../../src/pipeline/generate/error.js';
import { walkFlow } from '../../src/pipeline/generate/walk.js';
import { withFlow } from './analyze-fixture.js';

function agent(index: number, id: string, next: string): AgentBlock {
  return { index, id, kind: 'agent', name: `${id}-agent`, description: `Runs ${id}.`, arguments: [], next };
}

function condition(index: number, id: string, whenTrue: Route, whenFalse: Route): ConditionBlock {
  return { index, id, kind: 'condition', description: `Is ${id} met?`, true: whenTrue, false: whenFalse };
}

// A flow of the given blocks, built on the valid fixture so that every other part is well formed.
function flowWith(blocks: readonly Block[]): Flow {
  const config = withFlow((flow) => ({ ...flow, blocks }));
  const flow = config.pipeline.flows[0];
  if (flow === undefined) throw new Error('the fixture has no flow');
  return flow;
}

const END = { index: 99, id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' } as const;

// Start → draft → review; review's true route goes on to publish → gate → end, its false route returns to draft
// (a return with a round limit). The gate's false route stops the flow.
function fixtureFlow(): Flow {
  return flowWith([
    { index: 0, id: 'start', kind: 'start', next: 'draft' },
    agent(1, 'draft', 'review'),
    condition(2, 'review', { to: 'publish' }, { to: 'draft', roundLimit: 2 }),
    agent(3, 'publish', 'gate'),
    condition(4, 'gate', { to: 'end' }, { stop: true }),
    END,
  ]);
}

function idsOf(blocks: readonly Block[]): string[] {
  return blocks.map((block) => block.id);
}

describe('F-04 AC-015 the walk lists a flow in run order, once per block', () => {
  it('follows the next links and the true route, and stops at a {stop} route', () => {
    expect(idsOf(walkFlow(fixtureFlow()))).toEqual(['start', 'draft', 'review', 'publish', 'gate', 'end']);
  });

  it('lists a return target once, although a route returns to it', () => {
    const ids = idsOf(walkFlow(fixtureFlow()));
    expect(ids.filter((id) => id === 'draft')).toHaveLength(1);
  });

  it('follows the true route of a condition before its false route, depth first', () => {
    // choose: true → a → x → end; false → b → end. The true branch is listed whole before b.
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'choose' },
      condition(1, 'choose', { to: 'a' }, { to: 'b' }),
      agent(2, 'a', 'x'),
      agent(3, 'x', 'end'),
      agent(4, 'b', 'end'),
      END,
    ]);
    expect(idsOf(walkFlow(flow))).toEqual(['start', 'choose', 'a', 'x', 'end', 'b']);
  });

  it('lists a block reached by both routes of a condition once, at its first visit', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'choose' },
      condition(1, 'choose', { to: 'end' }, { to: 'end' }),
      END,
    ]);
    expect(idsOf(walkFlow(flow))).toEqual(['start', 'choose', 'end']);
  });

  it('does not list a block that no route reaches', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'draft' },
      agent(1, 'draft', 'end'),
      agent(2, 'orphan', 'end'),
      END,
    ]);
    expect(idsOf(walkFlow(flow))).toEqual(['start', 'draft', 'end']);
  });

  it('a {stop} route on the true side ends only its branch; the false branch is still listed', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'check' },
      condition(1, 'check', { stop: true }, { to: 'b' }),
      agent(2, 'b', 'end'),
      END,
    ]);
    expect(idsOf(walkFlow(flow))).toEqual(['start', 'check', 'b', 'end']);
  });

  it('gives the same order whatever order the blocks are declared in', () => {
    const flow = fixtureFlow();
    const reversed = { ...flow, blocks: [...flow.blocks].reverse() };
    expect(idsOf(walkFlow(flow))).toEqual(['start', 'draft', 'review', 'publish', 'gate', 'end']);
    expect(idsOf(walkFlow(reversed))).toEqual(idsOf(walkFlow(flow)));
  });
});

describe('F-04 AC-015 the walk refuses a flow it cannot follow (programmer error)', () => {
  it('throws a GenerationError naming the flow when it has no Start block', () => {
    const flow = flowWith([agent(0, 'draft', 'end'), END]);
    expect(() => walkFlow(flow)).toThrow(GenerationError);
    expect(() => walkFlow(flow)).toThrow('the flow build has no Start block');
  });

  it('throws a GenerationError naming the missing block when a next link leads to no block', () => {
    const flow = flowWith([{ index: 0, id: 'start', kind: 'start', next: 'missing' }, END]);
    expect(() => walkFlow(flow)).toThrow(GenerationError);
    expect(() => walkFlow(flow)).toThrow('routes to missing, which is no block of the flow');
  });

  it('throws a GenerationError naming the missing block when a route leads to no block', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'check' },
      condition(1, 'check', { to: 'end' }, { to: 'gone' }),
      END,
    ]);
    expect(() => walkFlow(flow)).toThrow('routes to gone, which is no block of the flow');
  });
});
