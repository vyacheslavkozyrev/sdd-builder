import { describe, expect, it } from 'vitest';
import { flowArrowOrder } from '../../src/pipeline/flow-order.js';
import type { Block, Flow, Route } from '../../src/pipeline/model.js';

// The blocks are numbered by their position in the list, as a parsed document numbers them.
function flowOf(blocks: Block[]): Flow {
  return {
    index: 0,
    id: 'plan',
    name: 'plan',
    arguments: [],
    body: 'Body',
    artifacts: [],
    approval: false,
    blocks: blocks.map((block, index) => ({ ...block, index }) as Block),
  };
}

const start = (id: string, next: string): Block => ({ index: 0, id, kind: 'start', next });
const agent = (id: string, next: string): Block => ({
  index: 0,
  id,
  kind: 'agent',
  name: id,
  description: 'Agent',
  arguments: [],
  next,
});
const condition = (id: string, onTrue: Route, onFalse: Route): Block => ({
  index: 0,
  id,
  kind: 'condition',
  description: 'Check',
  true: onTrue,
  false: onFalse,
});
const end = (id: string): Block => ({ index: 0, id, kind: 'end', outcome: 'done', producedArtifact: 'out.md' });
const STOP: Route = { stop: true };

describe('F-12 AC-016 the arrow order of a flow starts at the Start', () => {
  it.each([
    [
      'a straight chain follows the arrows of next',
      [start('s', 'a'), agent('a', 'b'), agent('b', 'e'), end('e')],
      ['s', 'a', 'b', 'e'],
    ],
    [
      'the End is part of the walk, in the place the arrows reach it',
      [start('s', 'c'), condition('c', { to: 'e' }, { to: 'a' }), end('e'), agent('a', 'e')],
      ['s', 'c', 'e', 'a'],
    ],
    [
      'the true route is walked before the false route, breadth-first',
      [start('s', 'c'), condition('c', { to: 'x' }, { to: 'y' }), agent('y', 'z'), agent('x', 'z'), end('z')],
      ['s', 'c', 'x', 'y', 'z'],
    ],
    [
      'a block that two arrows reach is walked once, at the first arrow that reaches it',
      [start('s', 'a'), agent('a', 'b'), condition('b', { to: 'e' }, { to: 'e' }), end('e')],
      ['s', 'a', 'b', 'e'],
    ],
    [
      'blocks no arrow reaches follow the walked blocks in list order',
      [start('s', 'a'), agent('x', 'y'), agent('a', 'e'), agent('y', 'e'), end('e')],
      ['s', 'a', 'e', 'x', 'y'],
    ],
    [
      'an empty next, a stop route and a route to no block lead nowhere',
      [start('s', ''), condition('c', STOP, { to: '' }), agent('a', 'nowhere'), end('e')],
      ['s', 'c', 'a', 'e'],
    ],
    [
      'a flow with no Start keeps the list order',
      [agent('a', 'b'), agent('b', 'a'), end('e')],
      ['a', 'b', 'e'],
    ],
  ])('F-12 AC-016 %s', (_label, blocks, expected) => {
    expect(flowArrowOrder(flowOf(blocks))).toEqual(expected);
  });

  it('F-12 AC-016 returns every block of the flow exactly once', () => {
    const blocks = [start('s', 'c'), condition('c', { to: 'e' }, { to: 'a' }), agent('a', 'c'), agent('x', 'e'), end('e')];
    const order = flowArrowOrder(flowOf(blocks));

    expect([...order].sort()).toEqual(['a', 'c', 'e', 's', 'x']);
  });

  it('F-12 AC-016 does not change the flow it reads', () => {
    const flow = flowOf([start('s', 'a'), agent('a', 'e'), end('e')]);
    const before = JSON.stringify(flow);

    flowArrowOrder(flow);

    expect(JSON.stringify(flow)).toBe(before);
  });
});
