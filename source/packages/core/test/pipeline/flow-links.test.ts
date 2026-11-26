import { describe, expect, it } from 'vitest';
import { checkFlowLinks, checkFlowNames } from '../../src/pipeline/check/flow-links.js';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readPipeline } from '../../src/pipeline/parse/pipeline.js';
import type { Flow, ProjectConfig } from '../../src/pipeline/model.js';

// The flows of a fixture are numbered by position, as a parsed document numbers them (model `index`).
function numbered<T extends { readonly index: number }>(items: readonly T[]): T[] {
  return items.map((item, index) => ({ ...item, index }));
}

function flow(id: string, next?: string, name: string = id): Flow {
  return {
    index: 0,
    id,
    name,
    arguments: [],
    body: 'Body',
    artifacts: [],
    approval: false,
    blocks: [],
    ...(next === undefined ? {} : { next }),
  };
}

function config(...flows: Flow[]): Pick<ProjectConfig, 'pipeline'> {
  return { pipeline: { name: 'Pipeline', description: 'Desc', arguments: [], flows: numbered(flows) } };
}

describe('F-02 AC-028 two flows with the same name are refused at the second name', () => {
  it('refuses a second flow whose name equals the first flow name, at the path of its name', () => {
    expect(checkFlowNames(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', undefined, 'Plan'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', undefined, 'Plan')))).toEqual([
      {
        path: 'pipeline.flows.1.name',
        message: 'must be unique among the flows, got Plan, which another flow already has',
      },
    ]);
  });

  it('accepts names that differ only in case', () => {
    expect(checkFlowNames(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', undefined, 'plan'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', undefined, 'Plan')))).toEqual([]);
  });

  it('accepts flows with distinct names', () => {
    expect(checkFlowNames(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', undefined, 'Plan'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', undefined, 'Build')))).toEqual([]);
  });

  it('refuses a third flow with the same name too, at its own path', () => {
    const problems = checkFlowNames(
      config(flow('fdac7165-b540-5201-bca7-029a056ea40e', undefined, 'Plan'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', undefined, 'Plan'), flow('c3250c18-d047-5f77-9456-b24446aad79a', undefined, 'Plan')),
    );
    expect(problems.map((problem) => problem.path)).toEqual(['pipeline.flows.1.name', 'pipeline.flows.2.name']);
  });
});

describe('F-02 AC-031 a flow next names a flow of the same pipeline', () => {
  it('accepts a next naming another flow of the pipeline', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122')))).toEqual([]);
  });

  it('refuses a next naming an id that is no flow, at the path of the next', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', '71b2ecbc-b1ec-5b8f-b792-a30a35989a2e'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'fdac7165-b540-5201-bca7-029a056ea40e')))).toEqual([
      { path: 'pipeline.flows.0.next', message: 'must name a flow of this pipeline, got 71b2ecbc-b1ec-5b8f-b792-a30a35989a2e' },
    ]);
  });

  it('refuses a next naming a flow name rather than an id', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', 'Beta', 'Alpha'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'fdac7165-b540-5201-bca7-029a056ea40e', 'Beta')))).toEqual([
      { path: 'pipeline.flows.0.next', message: 'must name a flow of this pipeline, got Beta' },
    ]);
  });
});

describe('F-02 AC-032 a flow next naming its own id is refused', () => {
  it('refuses a next that names the flow itself, at the path of the next', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', 'fdac7165-b540-5201-bca7-029a056ea40e'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'fdac7165-b540-5201-bca7-029a056ea40e')))).toEqual([
      { path: 'pipeline.flows.0.next', message: 'must name another flow of this pipeline, not the flow itself' },
    ]);
  });

  it('refuses a self next in a single-flow pipeline', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', 'fdac7165-b540-5201-bca7-029a056ea40e')))).toEqual([
      { path: 'pipeline.flows.0.next', message: 'must name another flow of this pipeline, not the flow itself' },
    ]);
  });
});

describe('F-02 AC-033 at most one incoming next per flow', () => {
  it('refuses the second next that names the same flow, at the path of the second next', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', 'c3250c18-d047-5f77-9456-b24446aad79a'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c3250c18-d047-5f77-9456-b24446aad79a'), flow('c3250c18-d047-5f77-9456-b24446aad79a')))).toEqual([
      {
        path: 'pipeline.flows.1.next',
        message: 'must not name a flow that another flow already names, got c3250c18-d047-5f77-9456-b24446aad79a',
      },
    ]);
  });

  it('accepts two flows that each name a different flow', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c3250c18-d047-5f77-9456-b24446aad79a'), flow('c3250c18-d047-5f77-9456-b24446aad79a')))).toEqual([]);
  });
});

describe('F-02 AC-034 a chain of next links never returns to a flow already in the chain', () => {
  it('refuses a two-flow loop A to B to A at the next that closes it', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'fdac7165-b540-5201-bca7-029a056ea40e')))).toEqual([
      { path: 'pipeline.flows.1.next', message: 'must not lead back to a flow already in the chain of next links' },
    ]);
  });

  it('refuses a three-flow loop A to B to C to A at the next that closes it', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c3250c18-d047-5f77-9456-b24446aad79a'), flow('c3250c18-d047-5f77-9456-b24446aad79a', 'fdac7165-b540-5201-bca7-029a056ea40e')))).toEqual([
      { path: 'pipeline.flows.2.next', message: 'must not lead back to a flow already in the chain of next links' },
    ]);
  });

  it('reports each loop once, at the next that closes it, in a pipeline with two loops', () => {
    const problems = checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'fdac7165-b540-5201-bca7-029a056ea40e'), flow('c3250c18-d047-5f77-9456-b24446aad79a', '0585a347-b77b-53a4-9ca2-8a21639b426f'), flow('0585a347-b77b-53a4-9ca2-8a21639b426f', 'c3250c18-d047-5f77-9456-b24446aad79a')));
    expect(problems.map((problem) => problem.path)).toEqual(['pipeline.flows.1.next', 'pipeline.flows.3.next']);
  });

  it('reports a loop entered from outside once, as the second incoming next of the flow it re-enters', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c3250c18-d047-5f77-9456-b24446aad79a'), flow('c3250c18-d047-5f77-9456-b24446aad79a', '2cb36792-5a03-58cf-a718-bba6be0b9122')))).toEqual([
      {
        path: 'pipeline.flows.2.next',
        message: 'must not name a flow that another flow already names, got 2cb36792-5a03-58cf-a718-bba6be0b9122',
      },
    ]);
  });

  it('accepts a chain that ends without a next', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'c3250c18-d047-5f77-9456-b24446aad79a'), flow('c3250c18-d047-5f77-9456-b24446aad79a')))).toEqual([]);
  });
});

describe('F-02 AC-035 a flow in a pipeline of more than one flow is linked', () => {
  it('refuses a flow with neither an incoming nor an outgoing next, at the path of the flow', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('c3250c18-d047-5f77-9456-b24446aad79a')))).toEqual([
      {
        path: 'pipeline.flows.2',
        message: 'must be linked to another flow: a next here, or a next of another flow that names it',
      },
    ]);
  });

  it('accepts a flow with only an incoming next', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e', '2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122')))).toEqual([]);
  });

  it('accepts a flow with only an outgoing next', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122', 'fdac7165-b540-5201-bca7-029a056ea40e')))).toEqual([]);
  });

  it('accepts a pipeline of one flow with no next', () => {
    expect(checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e')))).toEqual([]);
  });

  it('refuses every unlinked flow of the pipeline, in order', () => {
    const problems = checkFlowLinks(config(flow('fdac7165-b540-5201-bca7-029a056ea40e'), flow('2cb36792-5a03-58cf-a718-bba6be0b9122'), flow('c3250c18-d047-5f77-9456-b24446aad79a')));
    expect(problems.map((problem) => problem.path)).toEqual(['pipeline.flows.0', 'pipeline.flows.1', 'pipeline.flows.2']);
  });
});

describe('F-02 AC-019 AC-028 AC-031 a flow check after a refused flow is reported at the document index', () => {
  const validBlocks = [
    { id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' },
    { id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'Plan' },
  ];

  it('reports a repeated name and a next that names no flow at the document index of the flow', () => {
    const problems = createProblemCollector();
    const pipeline = readPipeline(
      {
        name: 'Pipeline',
        description: 'Desc',
        arguments: [],
        flows: [
          {},
          {
            id: 'fdac7165-b540-5201-bca7-029a056ea40e',
            name: 'Plan',
            body: 'Body',
            arguments: [],
            artifacts: [],
            approval: false,
            blocks: validBlocks,
            next: '71b2ecbc-b1ec-5b8f-b792-a30a35989a2e',
          },
          { id: '2cb36792-5a03-58cf-a718-bba6be0b9122', name: 'Plan', body: 'Body', arguments: [], artifacts: [], approval: false, blocks: validBlocks },
        ],
      },
      'pipeline',
      problems,
    );
    expect(problems.list().every((problem) => problem.path.startsWith('pipeline.flows.0'))).toBe(true);
    if (pipeline === undefined) throw new Error('the pipeline was refused');

    expect(checkFlowNames({ pipeline })).toEqual([
      {
        path: 'pipeline.flows.2.name',
        message: 'must be unique among the flows, got Plan, which another flow already has',
      },
    ]);
    expect(checkFlowLinks({ pipeline })).toEqual([
      { path: 'pipeline.flows.1.next', message: 'must name a flow of this pipeline, got 71b2ecbc-b1ec-5b8f-b792-a30a35989a2e' },
      {
        path: 'pipeline.flows.2',
        message: 'must be linked to another flow: a next here, or a next of another flow that names it',
      },
    ]);
  });
});
