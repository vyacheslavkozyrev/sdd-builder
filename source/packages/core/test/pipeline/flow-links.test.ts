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
    expect(checkFlowNames(config(flow('a', undefined, 'Plan'), flow('b', undefined, 'Plan')))).toEqual([
      {
        path: 'pipeline.flows.1.name',
        message: 'must be unique among the flows, got Plan, which another flow already has',
      },
    ]);
  });

  it('accepts names that differ only in case', () => {
    expect(checkFlowNames(config(flow('a', undefined, 'plan'), flow('b', undefined, 'Plan')))).toEqual([]);
  });

  it('accepts flows with distinct names', () => {
    expect(checkFlowNames(config(flow('a', undefined, 'Plan'), flow('b', undefined, 'Build')))).toEqual([]);
  });

  it('refuses a third flow with the same name too, at its own path', () => {
    const problems = checkFlowNames(
      config(flow('a', undefined, 'Plan'), flow('b', undefined, 'Plan'), flow('c', undefined, 'Plan')),
    );
    expect(problems.map((problem) => problem.path)).toEqual(['pipeline.flows.1.name', 'pipeline.flows.2.name']);
  });
});

describe('F-02 AC-031 a flow next names a flow of the same pipeline', () => {
  it('accepts a next naming another flow of the pipeline', () => {
    expect(checkFlowLinks(config(flow('a', 'b'), flow('b')))).toEqual([]);
  });

  it('refuses a next naming an id that is no flow, at the path of the next', () => {
    expect(checkFlowLinks(config(flow('a', 'missing'), flow('b', 'a')))).toEqual([
      { path: 'pipeline.flows.0.next', message: 'must name a flow of this pipeline, got missing' },
    ]);
  });

  it('refuses a next naming a flow name rather than an id', () => {
    expect(checkFlowLinks(config(flow('a', 'Beta', 'Alpha'), flow('b', 'a', 'Beta')))).toEqual([
      { path: 'pipeline.flows.0.next', message: 'must name a flow of this pipeline, got Beta' },
    ]);
  });
});

describe('F-02 AC-032 a flow next naming its own id is refused', () => {
  it('refuses a next that names the flow itself, at the path of the next', () => {
    expect(checkFlowLinks(config(flow('a', 'a'), flow('b', 'a')))).toEqual([
      { path: 'pipeline.flows.0.next', message: 'must name another flow of this pipeline, not the flow itself' },
    ]);
  });

  it('refuses a self next in a single-flow pipeline', () => {
    expect(checkFlowLinks(config(flow('a', 'a')))).toEqual([
      { path: 'pipeline.flows.0.next', message: 'must name another flow of this pipeline, not the flow itself' },
    ]);
  });
});

describe('F-02 AC-033 at most one incoming next per flow', () => {
  it('refuses the second next that names the same flow, at the path of the second next', () => {
    expect(checkFlowLinks(config(flow('a', 'c'), flow('b', 'c'), flow('c')))).toEqual([
      {
        path: 'pipeline.flows.1.next',
        message: 'must not name a flow that another flow already names, got c',
      },
    ]);
  });

  it('accepts two flows that each name a different flow', () => {
    expect(checkFlowLinks(config(flow('a', 'b'), flow('b', 'c'), flow('c')))).toEqual([]);
  });
});

describe('F-02 AC-034 a chain of next links never returns to a flow already in the chain', () => {
  it('refuses a two-flow loop A to B to A at the next that closes it', () => {
    expect(checkFlowLinks(config(flow('a', 'b'), flow('b', 'a')))).toEqual([
      { path: 'pipeline.flows.1.next', message: 'must not lead back to a flow already in the chain of next links' },
    ]);
  });

  it('refuses a three-flow loop A to B to C to A at the next that closes it', () => {
    expect(checkFlowLinks(config(flow('a', 'b'), flow('b', 'c'), flow('c', 'a')))).toEqual([
      { path: 'pipeline.flows.2.next', message: 'must not lead back to a flow already in the chain of next links' },
    ]);
  });

  it('reports each loop once, at the next that closes it, in a pipeline with two loops', () => {
    const problems = checkFlowLinks(config(flow('a', 'b'), flow('b', 'a'), flow('c', 'd'), flow('d', 'c')));
    expect(problems.map((problem) => problem.path)).toEqual(['pipeline.flows.1.next', 'pipeline.flows.3.next']);
  });

  it('reports a loop entered from outside once, as the second incoming next of the flow it re-enters', () => {
    expect(checkFlowLinks(config(flow('a', 'b'), flow('b', 'c'), flow('c', 'b')))).toEqual([
      {
        path: 'pipeline.flows.2.next',
        message: 'must not name a flow that another flow already names, got b',
      },
    ]);
  });

  it('accepts a chain that ends without a next', () => {
    expect(checkFlowLinks(config(flow('a', 'b'), flow('b', 'c'), flow('c')))).toEqual([]);
  });
});

describe('F-02 AC-035 a flow in a pipeline of more than one flow is linked', () => {
  it('refuses a flow with neither an incoming nor an outgoing next, at the path of the flow', () => {
    expect(checkFlowLinks(config(flow('a', 'b'), flow('b'), flow('c')))).toEqual([
      {
        path: 'pipeline.flows.2',
        message: 'must be linked to another flow: a next here, or a next of another flow that names it',
      },
    ]);
  });

  it('accepts a flow with only an incoming next', () => {
    expect(checkFlowLinks(config(flow('a', 'b'), flow('b')))).toEqual([]);
  });

  it('accepts a flow with only an outgoing next', () => {
    expect(checkFlowLinks(config(flow('a'), flow('b', 'a')))).toEqual([]);
  });

  it('accepts a pipeline of one flow with no next', () => {
    expect(checkFlowLinks(config(flow('a')))).toEqual([]);
  });

  it('refuses every unlinked flow of the pipeline, in order', () => {
    const problems = checkFlowLinks(config(flow('a'), flow('b'), flow('c')));
    expect(problems.map((problem) => problem.path)).toEqual(['pipeline.flows.0', 'pipeline.flows.1', 'pipeline.flows.2']);
  });
});

describe('F-02 AC-019 AC-028 AC-031 a flow check after a refused flow is reported at the document index', () => {
  const validBlocks = [
    { id: 'start', kind: 'start', next: 'end' },
    { id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'Plan' },
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
            id: 'a',
            name: 'Plan',
            body: 'Body',
            arguments: [],
            artifacts: [],
            approval: false,
            blocks: validBlocks,
            next: 'missing',
          },
          { id: 'b', name: 'Plan', body: 'Body', arguments: [], artifacts: [], approval: false, blocks: validBlocks },
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
      { path: 'pipeline.flows.1.next', message: 'must name a flow of this pipeline, got missing' },
      {
        path: 'pipeline.flows.2',
        message: 'must be linked to another flow: a next here, or a next of another flow that names it',
      },
    ]);
  });
});
