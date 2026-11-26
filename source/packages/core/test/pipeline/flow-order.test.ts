import { describe, expect, it } from 'vitest';
import { flowArrowOrder } from '../../src/pipeline/flow-order.js';
import type { Block, Flow, Route } from '../../src/pipeline/model.js';

// The blocks are numbered by their position in the list, as a parsed document numbers them.
function flowOf(blocks: Block[]): Flow {
  return {
    index: 0,
    id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92',
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
  name: `agent-${id.slice(0, 8)}`,
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
      [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), agent('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')],
      ['aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'],
    ],
    [
      'the End is part of the walk, in the place the arrows reach it',
      [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'fdac7165-b540-5201-bca7-029a056ea40e' }), end('c6aa4797-99c3-5de1-a1c5-ff4762474687'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c6aa4797-99c3-5de1-a1c5-ff4762474687')],
      ['aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'c3250c18-d047-5f77-9456-b24446aad79a', 'c6aa4797-99c3-5de1-a1c5-ff4762474687', 'fdac7165-b540-5201-bca7-029a056ea40e'],
    ],
    [
      'the true route is walked before the false route, breadth-first',
      [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: '6633b48d-142d-5c58-ad53-040e786cb000' }, { to: '7ff41d95-5e13-5374-9be0-191b1e5e3d36' }), agent('7ff41d95-5e13-5374-9be0-191b1e5e3d36', '673edc26-ac3f-545c-aab9-e2d3a5a98104'), agent('6633b48d-142d-5c58-ad53-040e786cb000', '673edc26-ac3f-545c-aab9-e2d3a5a98104'), end('673edc26-ac3f-545c-aab9-e2d3a5a98104')],
      ['aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'c3250c18-d047-5f77-9456-b24446aad79a', '6633b48d-142d-5c58-ad53-040e786cb000', '7ff41d95-5e13-5374-9be0-191b1e5e3d36', '673edc26-ac3f-545c-aab9-e2d3a5a98104'],
    ],
    [
      'a block that two arrows reach is walked once, at the first arrow that reaches it',
      [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), condition('2cb36792-5a03-58cf-a718-bba6be0b9122', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')],
      ['aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'],
    ],
    [
      'blocks no arrow reaches follow the walked blocks in list order',
      [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('6633b48d-142d-5c58-ad53-040e786cb000', '7ff41d95-5e13-5374-9be0-191b1e5e3d36'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), agent('7ff41d95-5e13-5374-9be0-191b1e5e3d36', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')],
      ['aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e', 'c6aa4797-99c3-5de1-a1c5-ff4762474687', '6633b48d-142d-5c58-ad53-040e786cb000', '7ff41d95-5e13-5374-9be0-191b1e5e3d36'],
    ],
    [
      'an empty next, a stop route and a route to no block lead nowhere',
      [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', ''), condition('c3250c18-d047-5f77-9456-b24446aad79a', STOP, { to: '' }), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'a5767084-cb93-5669-9a85-49c86b4893f6'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')],
      ['aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'c3250c18-d047-5f77-9456-b24446aad79a', 'fdac7165-b540-5201-bca7-029a056ea40e', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'],
    ],
    [
      'a flow with no Start keeps the list order',
      [agent('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), agent('2cb36792-5a03-58cf-a718-bba6be0b9122', 'fdac7165-b540-5201-bca7-029a056ea40e'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')],
      ['fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'],
    ],
  ])('F-12 AC-016 %s', (_label, blocks, expected) => {
    expect(flowArrowOrder(flowOf(blocks))).toEqual(expected);
  });

  it('F-12 AC-016 returns every block of the flow exactly once', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'fdac7165-b540-5201-bca7-029a056ea40e' }), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'), agent('6633b48d-142d-5c58-ad53-040e786cb000', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    const order = flowArrowOrder(flowOf(blocks));

    expect([...order].sort()).toEqual(['6633b48d-142d-5c58-ad53-040e786cb000', 'aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'c3250c18-d047-5f77-9456-b24446aad79a', 'c6aa4797-99c3-5de1-a1c5-ff4762474687', 'fdac7165-b540-5201-bca7-029a056ea40e']);
  });

  it('F-12 AC-016 does not change the flow it reads', () => {
    const flow = flowOf([start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]);
    const before = JSON.stringify(flow);

    flowArrowOrder(flow);

    expect(JSON.stringify(flow)).toBe(before);
  });
});
