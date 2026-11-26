import { describe, expect, it } from 'vitest';
import type { AgentBlock, Block, ConditionBlock, Flow, Route } from '../../src/pipeline/model.js';
import { GenerationError } from '../../src/pipeline/generate/error.js';
import { walkFlow } from '../../src/pipeline/generate/walk.js';
import { withFlow } from './analyze-fixture.js';

// Block ids are GUIDs (F-16 AC-028). The helpers take a label: its GUID comes from this table (a GUID passes through),
// and the label names the agent file and reads in the description.
const IDS: Readonly<Record<string, string>> = {
  a: 'fdac7165-b540-5201-bca7-029a056ea40e',
  b: '2cb36792-5a03-58cf-a718-bba6be0b9122',
  check: '6235136f-9021-5aaf-9958-4bc813c4d9b1',
  choose: 'af78f2d7-cf1e-53ad-8067-e68a863db98c',
  draft: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63',
  end: '128fea8a-2e63-5352-bd64-02ceddc0d0cb',
  gate: '1f171f7c-f206-51eb-9702-05258a7247cd',
  orphan: '865733fd-e118-5be4-a9a2-a29035cef9df',
  publish: '9ed0bdfe-f040-5934-9233-bdec297f9995',
  review: '82c969a4-365a-5525-8168-6ae1093b1867',
  x: '6633b48d-142d-5c58-ad53-040e786cb000',
  y: '7ff41d95-5e13-5374-9be0-191b1e5e3d36',
  z: '673edc26-ac3f-545c-aab9-e2d3a5a98104',
};

function idOf(label: string): string {
  return IDS[label] ?? label;
}

function agent(index: number, label: string, next: string): AgentBlock {
  return { index, id: idOf(label), kind: 'agent', name: `${label}-agent`, description: `Runs ${label}.`, arguments: [], next: idOf(next) };
}

function condition(index: number, label: string, whenTrue: Route, whenFalse: Route): ConditionBlock {
  return { index, id: idOf(label), kind: 'condition', description: `Is ${label} met?`, true: whenTrue, false: whenFalse };
}

// A flow of the given blocks, built on the valid fixture so that every other part is well formed.
function flowWith(blocks: readonly Block[]): Flow {
  const config = withFlow((flow) => ({ ...flow, blocks }));
  const flow = config.pipeline.flows[0];
  if (flow === undefined) throw new Error('the fixture has no flow');
  return flow;
}

const END = { index: 99, id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'out.md' } as const;

// Start → draft → review; review's true route goes on to publish → gate → end, its false route returns to draft
// (a return with a round limit). The gate's false route stops the flow.
function fixtureFlow(): Flow {
  return flowWith([
    { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63' },
    agent(1, 'draft', 'review'),
    condition(2, 'review', { to: '9ed0bdfe-f040-5934-9233-bdec297f9995' }, { to: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63', roundLimit: 2 }),
    agent(3, 'publish', 'gate'),
    condition(4, 'gate', { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' }, { stop: true }),
    END,
  ]);
}

function idsOf(blocks: readonly Block[]): string[] {
  return blocks.map((block) => block.id);
}

describe('F-04 AC-015 the walk lists a flow in run order, once per block', () => {
  it('follows the next links and the true route, and stops at a {stop} route', () => {
    expect(idsOf(walkFlow(fixtureFlow()))).toEqual(['f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'ec22bab1-2420-5e5e-93ac-e548cae9ed63', '82c969a4-365a-5525-8168-6ae1093b1867', '9ed0bdfe-f040-5934-9233-bdec297f9995', '1f171f7c-f206-51eb-9702-05258a7247cd', '128fea8a-2e63-5352-bd64-02ceddc0d0cb']);
  });

  it('lists a return target once, although a route returns to it', () => {
    const ids = idsOf(walkFlow(fixtureFlow()));
    expect(ids.filter((id) => id === 'ec22bab1-2420-5e5e-93ac-e548cae9ed63')).toHaveLength(1);
  });

  it('follows the true route of a condition before its false route, depth first', () => {
    // choose: true → a → x → end; false → b → end. The true branch is listed whole before b.
    const flow = flowWith([
      { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: 'af78f2d7-cf1e-53ad-8067-e68a863db98c' },
      condition(1, 'choose', { to: 'fdac7165-b540-5201-bca7-029a056ea40e' }, { to: '2cb36792-5a03-58cf-a718-bba6be0b9122' }),
      agent(2, 'a', 'x'),
      agent(3, 'x', 'end'),
      agent(4, 'b', 'end'),
      END,
    ]);
    expect(idsOf(walkFlow(flow))).toEqual(['f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'af78f2d7-cf1e-53ad-8067-e68a863db98c', 'fdac7165-b540-5201-bca7-029a056ea40e', '6633b48d-142d-5c58-ad53-040e786cb000', '128fea8a-2e63-5352-bd64-02ceddc0d0cb', '2cb36792-5a03-58cf-a718-bba6be0b9122']);
  });

  it('lists a block reached by both routes of a condition once, at its first visit', () => {
    const flow = flowWith([
      { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: 'af78f2d7-cf1e-53ad-8067-e68a863db98c' },
      condition(1, 'choose', { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' }, { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' }),
      END,
    ]);
    expect(idsOf(walkFlow(flow))).toEqual(['f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'af78f2d7-cf1e-53ad-8067-e68a863db98c', '128fea8a-2e63-5352-bd64-02ceddc0d0cb']);
  });

  it('does not list a block that no route reaches', () => {
    const flow = flowWith([
      { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63' },
      agent(1, 'draft', 'end'),
      agent(2, 'orphan', 'end'),
      END,
    ]);
    expect(idsOf(walkFlow(flow))).toEqual(['f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'ec22bab1-2420-5e5e-93ac-e548cae9ed63', '128fea8a-2e63-5352-bd64-02ceddc0d0cb']);
  });

  it('a {stop} route on the true side ends only its branch; the false branch is still listed', () => {
    const flow = flowWith([
      { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '6235136f-9021-5aaf-9958-4bc813c4d9b1' },
      condition(1, 'check', { stop: true }, { to: '2cb36792-5a03-58cf-a718-bba6be0b9122' }),
      agent(2, 'b', 'end'),
      END,
    ]);
    expect(idsOf(walkFlow(flow))).toEqual(['f05559a1-554d-5c78-a9a6-bb9ce0bfc551', '6235136f-9021-5aaf-9958-4bc813c4d9b1', '2cb36792-5a03-58cf-a718-bba6be0b9122', '128fea8a-2e63-5352-bd64-02ceddc0d0cb']);
  });

  it('gives the same order whatever order the blocks are declared in', () => {
    const flow = fixtureFlow();
    const reversed = { ...flow, blocks: [...flow.blocks].reverse() };
    expect(idsOf(walkFlow(flow))).toEqual(['f05559a1-554d-5c78-a9a6-bb9ce0bfc551', 'ec22bab1-2420-5e5e-93ac-e548cae9ed63', '82c969a4-365a-5525-8168-6ae1093b1867', '9ed0bdfe-f040-5934-9233-bdec297f9995', '1f171f7c-f206-51eb-9702-05258a7247cd', '128fea8a-2e63-5352-bd64-02ceddc0d0cb']);
    expect(idsOf(walkFlow(reversed))).toEqual(idsOf(walkFlow(flow)));
  });
});

describe('F-04 AC-015 the walk refuses a flow it cannot follow (programmer error)', () => {
  it('throws a GenerationError naming the flow when it has no Start block', () => {
    const flow = flowWith([agent(0, 'draft', 'end'), END]);
    expect(() => walkFlow(flow)).toThrow(GenerationError);
    expect(() => walkFlow(flow)).toThrow('the flow ea365500-e6ec-5064-90ea-fb6cc4bb49d6 has no Start block');
  });

  it('throws a GenerationError naming the missing block when a next link leads to no block', () => {
    const flow = flowWith([{ index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '71b2ecbc-b1ec-5b8f-b792-a30a35989a2e' }, END]);
    expect(() => walkFlow(flow)).toThrow(GenerationError);
    expect(() => walkFlow(flow)).toThrow('routes to 71b2ecbc-b1ec-5b8f-b792-a30a35989a2e, which is no block of the flow');
  });

  it('throws a GenerationError naming the missing block when a route leads to no block', () => {
    const flow = flowWith([
      { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '6235136f-9021-5aaf-9958-4bc813c4d9b1' },
      condition(1, 'check', { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' }, { to: '5cf605ef-fd74-52e2-bfdc-767d5e93190c' }),
      END,
    ]);
    expect(() => walkFlow(flow)).toThrow('routes to 5cf605ef-fd74-52e2-bfdc-767d5e93190c, which is no block of the flow');
  });
});
