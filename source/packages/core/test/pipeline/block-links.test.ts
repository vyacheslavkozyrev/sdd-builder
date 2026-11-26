import { describe, expect, it } from 'vitest';
import { checkBlockLinks } from '../../src/pipeline/check/block-links.js';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readPipeline } from '../../src/pipeline/parse/pipeline.js';
import type { Block, Flow, ProjectConfig, Route } from '../../src/pipeline/model.js';

// The items of a fixture are numbered by position, as a parsed document numbers them (model `index`).
function numbered<T extends { readonly index: number }>(items: readonly T[]): T[] {
  return items.map((item, index) => ({ ...item, index }));
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
const end = (id: string): Block => ({ index: 0, id, kind: 'end', outcome: 'done', producedArtifact: 'Plan' });

function flow(id: string, blocks: Block[]): Flow {
  return {
    index: 0,
    id,
    name: id,
    arguments: [],
    body: 'Body',
    artifacts: [],
    approval: false,
    blocks: numbered(blocks),
  };
}

function config(...flows: Flow[]): Pick<ProjectConfig, 'pipeline'> {
  return { pipeline: { name: 'Pipeline', description: 'Desc', arguments: [], flows: numbered(flows) } };
}

const STOP: Route = { stop: true };

describe('F-02 AC-045 a start next names an agent or a condition of the same flow', () => {
  it('accepts a start whose next names an agent of the flow', () => {
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])))).toEqual([]);
  });

  it('accepts a start whose next names a condition of the flow', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, STOP), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([]);
  });

  it('refuses a start whose next names the end block, at the path of next', () => {
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.0.next',
        message: 'must name an agent or a condition of this flow, got the end block c6aa4797-99c3-5de1-a1c5-ff4762474687',
      },
    ]);
  });

  it('refuses a start whose next names the start block itself, at the path of next', () => {
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'aaa4a9fb-6e34-59bf-ab3d-968d23868808'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.0.next',
        message: 'must name an agent or a condition of this flow, got the start block aaa4a9fb-6e34-59bf-ab3d-968d23868808',
      },
    ]);
  });
});

describe('F-02 AC-046 a start next that names another flow or no block is refused at next', () => {
  it('refuses a start whose next names a block of another flow', () => {
    const result = checkBlockLinks(
      config(
        flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', '2cb36792-5a03-58cf-a718-bba6be0b9122'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]),
        flow('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', [start('57bc00b7-057c-5a30-9b7f-720507f075a7', '959d1153-a597-5b9b-b72d-c32e552fb0cb'), agent('959d1153-a597-5b9b-b72d-c32e552fb0cb', '209887a4-405a-54db-9cb0-96e58323b4e1'), agent('2cb36792-5a03-58cf-a718-bba6be0b9122', '209887a4-405a-54db-9cb0-96e58323b4e1'), end('209887a4-405a-54db-9cb0-96e58323b4e1')]),
      ),
    );
    // The Agent `2cb36792-5a03-58cf-a718-bba6be0b9122` is no arrow's target, so it follows the End `209887a4-405a-54db-9cb0-96e58323b4e1` in the arrow order: its next is a loop.
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.0.next',
        message: 'must name a block of this flow, got 2cb36792-5a03-58cf-a718-bba6be0b9122, which is a block of another flow',
      },
      { path: 'pipeline.flows.1.blocks.2.next', message: 'must name a later block of this flow; a return needs a condition with roundLimit' },
    ]);
  });

  it('refuses a start whose next is an id that is no block', () => {
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'a5767084-cb93-5669-9a85-49c86b4893f6'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.0.next',
        message: 'must name a block of this flow, got a5767084-cb93-5669-9a85-49c86b4893f6, which is no block of the pipeline',
      },
    ]);
  });
});

describe('F-02 AC-054 an agent next names an agent, a condition or the end of the same flow', () => {
  it.each([
    ['an agent', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), agent('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]],
    ['a condition', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, STOP), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]],
    ['the end', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]],
  ])('accepts an agent whose next names %s of the flow', (_label, blocks) => {
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([]);
  });

  it('refuses an agent whose next names the start block, at the path of next', () => {
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'aaa4a9fb-6e34-59bf-ab3d-968d23868808'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.next',
        message: 'must name an agent, a condition or the end of this flow, got the start block aaa4a9fb-6e34-59bf-ab3d-968d23868808',
      },
    ]);
  });

  it('refuses an agent whose next names a block of another flow, at the path of next', () => {
    const result = checkBlockLinks(
      config(
        flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '30b57840-f4f0-5cbd-a397-6f2bb1e2cb0d'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]),
        flow('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', [start('57bc00b7-057c-5a30-9b7f-720507f075a7', '30b57840-f4f0-5cbd-a397-6f2bb1e2cb0d'), agent('30b57840-f4f0-5cbd-a397-6f2bb1e2cb0d', '209887a4-405a-54db-9cb0-96e58323b4e1'), end('209887a4-405a-54db-9cb0-96e58323b4e1')]),
      ),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.next',
        message: 'must name a block of this flow, got 30b57840-f4f0-5cbd-a397-6f2bb1e2cb0d, which is a block of another flow',
      },
    ]);
  });

  it('refuses an agent whose next is an id that is no block, at the path of next', () => {
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'fefe19ec-a6a7-59a9-9c48-697c7903d1ff'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.next',
        message: 'must name a block of this flow, got fefe19ec-a6a7-59a9-9c48-697c7903d1ff, which is no block of the pipeline',
      },
    ]);
  });
});

describe('F-02 AC-054 a next names a later block of the same flow, so a loop is refused at next', () => {
  const LOOP = 'must name a later block of this flow; a return needs a condition with roundLimit';

  it('refuses an agent whose next names the agent itself, at the path of next', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'fdac7165-b540-5201-bca7-029a056ea40e'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.1.next', message: LOOP },
    ]);
  });

  it('refuses an agent whose next names an earlier agent of the flow, at the path of next', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), agent('2cb36792-5a03-58cf-a718-bba6be0b9122', 'fdac7165-b540-5201-bca7-029a056ea40e'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.2.next', message: LOOP },
    ]);
  });

  it('refuses an agent whose next names an earlier condition of the flow, at the path of next', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: '2cb36792-5a03-58cf-a718-bba6be0b9122' }, STOP), agent('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c3250c18-d047-5f77-9456-b24446aad79a'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.3.next', message: LOOP },
    ]);
  });

  it('accepts an agent whose next names a later agent of the flow', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), agent('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([]);
  });

  it('accepts a start whose next names an agent listed before the start, since the arrow order from Start decides', () => {
    const blocks = [agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([]);
  });
});

describe('F-02 AC-059 a plain route names a later block of the same flow', () => {
  it('accepts a route to a later agent, a later condition and the end', () => {
    const blocks = [
      start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
      agent('fdac7165-b540-5201-bca7-029a056ea40e', 'f970b5b8-121a-53a9-aa9f-265963505100'),
      condition('f970b5b8-121a-53a9-aa9f-265963505100', { to: '2cb36792-5a03-58cf-a718-bba6be0b9122' }, STOP),
      agent('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c8671d84-1ff2-5ef5-bd2e-437e928d23cc'),
      condition('c8671d84-1ff2-5ef5-bd2e-437e928d23cc', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }),
      end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
    ];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([]);
  });

  it('refuses a plain route that names an earlier agent, at the path of to', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'fdac7165-b540-5201-bca7-029a056ea40e' }, { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.true.to',
        message: 'must name a later block of this flow: a return to the earlier agent fdac7165-b540-5201-bca7-029a056ea40e needs a roundLimit',
      },
    ]);
  });

  it('refuses a plain route that names the condition itself, at the path of to', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c3250c18-d047-5f77-9456-b24446aad79a' }, { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.true.to',
        message: 'must name a later block of this flow, got c3250c18-d047-5f77-9456-b24446aad79a',
      },
    ]);
  });

  it('accepts a plain route that names a later condition of the flow', () => {
    const blocks = [
      start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
      agent('fdac7165-b540-5201-bca7-029a056ea40e', 'f970b5b8-121a-53a9-aa9f-265963505100'),
      condition('f970b5b8-121a-53a9-aa9f-265963505100', { to: 'c8671d84-1ff2-5ef5-bd2e-437e928d23cc' }, STOP),
      condition('c8671d84-1ff2-5ef5-bd2e-437e928d23cc', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, STOP),
      end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
    ];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([]);
  });

  it('refuses a plain route that names the start block, at the path of to', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'aaa4a9fb-6e34-59bf-ab3d-968d23868808' }, { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.true.to',
        message: 'must name a later block of this flow, got aaa4a9fb-6e34-59bf-ab3d-968d23868808',
      },
    ]);
  });
});

describe('F-02 AC-060 a route with a roundLimit names an earlier agent of the same flow', () => {
  it('accepts a return to an earlier agent with a round limit of 1 and of 5', () => {
    const limitOne = [
      start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
      agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'),
      condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'fdac7165-b540-5201-bca7-029a056ea40e', roundLimit: 1 }),
      end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
    ];
    const limitFive = [
      start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
      agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'),
      condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'fdac7165-b540-5201-bca7-029a056ea40e', roundLimit: 5 }),
      end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
    ];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', limitOne)))).toEqual([]);
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', limitFive)))).toEqual([]);
  });

  it('refuses a return with a round limit to an agent of another flow, at the path of to', () => {
    const result = checkBlockLinks(
      config(
        flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [
          start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
          agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'),
          condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: '6633b48d-142d-5c58-ad53-040e786cb000', roundLimit: 2 }),
          end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
        ]),
        flow('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', [start('57bc00b7-057c-5a30-9b7f-720507f075a7', '6633b48d-142d-5c58-ad53-040e786cb000'), agent('6633b48d-142d-5c58-ad53-040e786cb000', '209887a4-405a-54db-9cb0-96e58323b4e1'), end('209887a4-405a-54db-9cb0-96e58323b4e1')]),
      ),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.false.to',
        message: 'must name a block of this flow, got 6633b48d-142d-5c58-ad53-040e786cb000, which is a block of another flow',
      },
    ]);
  });
});

describe('F-02 AC-061 a round-limited route that names a block other than an earlier agent is refused at to', () => {
  const REFUSED = 'must name an earlier agent of this flow for a return with a roundLimit';

  it('refuses a round-limited route to a later agent, at the path of to', () => {
    const blocks = [
      start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
      agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'),
      condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: '2cb36792-5a03-58cf-a718-bba6be0b9122', roundLimit: 2 }),
      agent('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'),
      end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
    ];
    // The End is reached from the condition's true route first, so it is earlier than `2cb36792-5a03-58cf-a718-bba6be0b9122` in the arrow order
    // and the Agent `2cb36792-5a03-58cf-a718-bba6be0b9122`'s next to the End is a return that no plain route may make (F-12 order).
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.2.false.to', message: `${REFUSED}, got 2cb36792-5a03-58cf-a718-bba6be0b9122` },
      { path: 'pipeline.flows.0.blocks.3.next', message: 'must name a later block of this flow; a return needs a condition with roundLimit' },
    ]);
  });

  it('refuses a round-limited route to a condition, at the path of to', () => {
    const blocks = [
      start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
      agent('fdac7165-b540-5201-bca7-029a056ea40e', 'f970b5b8-121a-53a9-aa9f-265963505100'),
      condition('f970b5b8-121a-53a9-aa9f-265963505100', { to: 'c8671d84-1ff2-5ef5-bd2e-437e928d23cc' }, { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }),
      condition('c8671d84-1ff2-5ef5-bd2e-437e928d23cc', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'f970b5b8-121a-53a9-aa9f-265963505100', roundLimit: 2 }),
      end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
    ];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.3.false.to', message: `${REFUSED}, got f970b5b8-121a-53a9-aa9f-265963505100` },
    ]);
  });

  it('refuses a round-limited route to the end, at the path of to', () => {
    const blocks = [
      start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
      agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'),
      condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687', roundLimit: 3 }, { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }),
      end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
    ];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.2.true.to', message: `${REFUSED}, got c6aa4797-99c3-5de1-a1c5-ff4762474687` },
    ]);
  });

  it('refuses a round-limited route to the start block, at the path of to', () => {
    const blocks = [
      start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
      agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'),
      condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'aaa4a9fb-6e34-59bf-ab3d-968d23868808', roundLimit: 2 }),
      end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
    ];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.2.false.to', message: `${REFUSED}, got aaa4a9fb-6e34-59bf-ab3d-968d23868808` },
    ]);
  });

  it('refuses a round-limited route to the condition itself, at the path of to', () => {
    const blocks = [
      start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
      agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'),
      condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'c3250c18-d047-5f77-9456-b24446aad79a', roundLimit: 2 }),
      end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
    ];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      { path: 'pipeline.flows.0.blocks.2.false.to', message: `${REFUSED}, got c3250c18-d047-5f77-9456-b24446aad79a` },
    ]);
  });
});

describe('F-02 AC-062 a route to a block of another flow or to no block is refused at to', () => {
  it('refuses a plain route to a block of another flow, at the path of to', () => {
    const result = checkBlockLinks(
      config(
        flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: '30b57840-f4f0-5cbd-a397-6f2bb1e2cb0d' }, { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]),
        flow('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', [start('57bc00b7-057c-5a30-9b7f-720507f075a7', '30b57840-f4f0-5cbd-a397-6f2bb1e2cb0d'), agent('30b57840-f4f0-5cbd-a397-6f2bb1e2cb0d', '209887a4-405a-54db-9cb0-96e58323b4e1'), end('209887a4-405a-54db-9cb0-96e58323b4e1')]),
      ),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.true.to',
        message: 'must name a block of this flow, got 30b57840-f4f0-5cbd-a397-6f2bb1e2cb0d, which is a block of another flow',
      },
    ]);
  });

  it('refuses a plain route to an id that is no block of the pipeline, at the path of to', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'a5767084-cb93-5669-9a85-49c86b4893f6' }), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.false.to',
        message: 'must name a block of this flow, got a5767084-cb93-5669-9a85-49c86b4893f6, which is no block of the pipeline',
      },
    ]);
  });

  it('refuses a round-limited route to an id that is no block, at the path of to', () => {
    const blocks = [
      start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'),
      agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'),
      condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }, { to: 'a5767084-cb93-5669-9a85-49c86b4893f6', roundLimit: 2 }),
      end('c6aa4797-99c3-5de1-a1c5-ff4762474687'),
    ];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.false.to',
        message: 'must name a block of this flow, got a5767084-cb93-5669-9a85-49c86b4893f6, which is no block of the pipeline',
      },
    ]);
  });

  it('accepts a stop route, which names no block', () => {
    const blocks = [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'fdac7165-b540-5201-bca7-029a056ea40e'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'), condition('c3250c18-d047-5f77-9456-b24446aad79a', STOP, { to: 'c6aa4797-99c3-5de1-a1c5-ff4762474687' }), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')];
    expect(checkBlockLinks(config(flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', blocks)))).toEqual([]);
  });
});

describe('F-02 AC-045 to AC-062 the problems come back in document order', () => {
  it('lists the start, the agent and the route problems of two flows in order', () => {
    const result = checkBlockLinks(
      config(
        flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808', 'c6aa4797-99c3-5de1-a1c5-ff4762474687'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'a5767084-cb93-5669-9a85-49c86b4893f6'), condition('c3250c18-d047-5f77-9456-b24446aad79a', { to: 'fdac7165-b540-5201-bca7-029a056ea40e' }, STOP), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]),
      ),
    );
    expect(result.map((problem) => problem.path)).toEqual([
      'pipeline.flows.0.blocks.0.next',
      'pipeline.flows.0.blocks.1.next',
      'pipeline.flows.0.blocks.2.true.to',
    ]);
  });
});

describe('F-02 AC-019 AC-045 AC-059 a block link after a refused block is reported at the document index', () => {
  const pipelineOf = (...flows: unknown[]) => {
    const problems = createProblemCollector();
    const pipeline = readPipeline(
      { name: 'Pipeline', description: 'Desc', arguments: [], flows },
      'pipeline',
      problems,
    );
    expect(problems.list().every((problem) => problem.path.startsWith('pipeline.flows.0.blocks.0'))).toBe(true);
    if (pipeline === undefined) throw new Error('the pipeline was refused');
    return { pipeline };
  };

  it('refuses a start or agent next that names a start block, at the document index of the agent', () => {
    const value = {
      id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92',
      name: 'Plan',
      body: 'Body',
      arguments: [],
      artifacts: [],
      approval: false,
      blocks: [
        { id: 'f816750f-bf56-554f-9106-e5f4c800be80' },
        { id: 'aaa4a9fb-6e34-59bf-ab3d-968d23868808', kind: 'start', next: 'fdac7165-b540-5201-bca7-029a056ea40e' },
        { id: 'fdac7165-b540-5201-bca7-029a056ea40e', kind: 'agent', name: 'review', description: 'Agent', arguments: [], next: 'aaa4a9fb-6e34-59bf-ab3d-968d23868808' },
        { id: 'c6aa4797-99c3-5de1-a1c5-ff4762474687', kind: 'end', outcome: 'done', producedArtifact: 'Plan' },
      ],
    };
    expect(checkBlockLinks(pipelineOf(value))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.next',
        message: 'must name an agent, a condition or the end of this flow, got the start block aaa4a9fb-6e34-59bf-ab3d-968d23868808',
      },
    ]);
  });

  it('refuses a return route without a roundLimit at the document index of the condition', () => {
    const value = {
      id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92',
      name: 'Plan',
      body: 'Body',
      arguments: [],
      artifacts: [],
      approval: false,
      blocks: [
        { id: 'f816750f-bf56-554f-9106-e5f4c800be80' },
        { id: 'aaa4a9fb-6e34-59bf-ab3d-968d23868808', kind: 'start', next: 'fdac7165-b540-5201-bca7-029a056ea40e' },
        { id: 'fdac7165-b540-5201-bca7-029a056ea40e', kind: 'agent', name: 'review', description: 'Agent', arguments: [], next: 'c3250c18-d047-5f77-9456-b24446aad79a' },
        { id: 'c3250c18-d047-5f77-9456-b24446aad79a', kind: 'condition', description: 'Ok?', true: { to: 'fdac7165-b540-5201-bca7-029a056ea40e' }, false: { stop: true } },
        { id: 'c6aa4797-99c3-5de1-a1c5-ff4762474687', kind: 'end', outcome: 'done', producedArtifact: 'Plan' },
      ],
    };
    expect(checkBlockLinks(pipelineOf(value))).toEqual([
      {
        path: 'pipeline.flows.0.blocks.3.true.to',
        message: 'must name a later block of this flow: a return to the earlier agent fdac7165-b540-5201-bca7-029a056ea40e needs a roundLimit',
      },
    ]);
  });
});
