import { describe, expect, it } from 'vitest';
import { checkEndArtifacts } from '../../src/pipeline/check/end-artifact.js';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readPipeline } from '../../src/pipeline/parse/pipeline.js';
import type { Artifact, Block, EndBlock, Flow, ProjectConfig } from '../../src/pipeline/model.js';

// The items of a fixture are numbered by position, as a parsed document numbers them (model `index`).
function numbered<T extends { readonly index: number }>(items: readonly T[]): T[] {
  return items.map((item, index) => ({ ...item, index }));
}

const artifact = (label: string): Artifact => ({ label, template: 'template.md' });

function end(id: string, producedArtifact: string): EndBlock {
  return { index: 0, id, kind: 'end', outcome: 'done', producedArtifact };
}

function flow(id: string, artifacts: readonly Artifact[], blocks: readonly Block[]): Flow {
  return {
    index: 0,
    id,
    name: id,
    arguments: [],
    body: 'Body',
    artifacts,
    approval: false,
    blocks: numbered(blocks),
  };
}

function config(flows: readonly Flow[]): Pick<ProjectConfig, 'pipeline'> {
  return {
    pipeline: { name: 'Pipeline', description: 'Desc', arguments: [], flows: numbered(flows) },
  };
}

describe('F-02 AC-064 an end names an artifact of its flow', () => {
  it('accepts a producedArtifact that is the exact label of an artifact of the flow', () => {
    const flows = [flow('plan', [artifact('Plan'), artifact('Notes')], [end('finish', 'Notes')])];
    expect(checkEndArtifacts(config(flows))).toEqual([]);
  });

  it('refuses a label that no artifact of the flow has, at the path of producedArtifact', () => {
    const flows = [flow('plan', [artifact('Plan')], [end('finish', 'Report')])];
    expect(checkEndArtifacts(config(flows))).toEqual([
      { path: 'pipeline.flows.0.blocks.0.producedArtifact', message: 'must name an artifact of this flow, got Report' },
    ]);
  });

  it('refuses the empty string', () => {
    const flows = [flow('plan', [artifact('Plan')], [end('finish', '')])];
    expect(checkEndArtifacts(config(flows))).toEqual([
      { path: 'pipeline.flows.0.blocks.0.producedArtifact', message: 'must name an artifact of this flow, got ' },
    ]);
  });

  it('refuses "none" when no artifact of the flow is labelled none', () => {
    const flows = [flow('plan', [artifact('Plan')], [end('finish', 'none')])];
    expect(checkEndArtifacts(config(flows))).toEqual([
      { path: 'pipeline.flows.0.blocks.0.producedArtifact', message: 'must name an artifact of this flow, got none' },
    ]);
  });

  it('accepts "none" when an artifact of the flow is labelled none', () => {
    const flows = [flow('plan', [artifact('none')], [end('finish', 'none')])];
    expect(checkEndArtifacts(config(flows))).toEqual([]);
  });

  it('compares labels exactly, so a label that differs only in case is refused', () => {
    const flows = [flow('plan', [artifact('Plan')], [end('finish', 'plan')])];
    expect(checkEndArtifacts(config(flows))).toEqual([
      { path: 'pipeline.flows.0.blocks.0.producedArtifact', message: 'must name an artifact of this flow, got plan' },
    ]);
  });

  it('checks each end against the artifacts of its own flow, not of another flow', () => {
    const flows = [
      flow('plan', [artifact('Plan')], [end('finish', 'Plan')]),
      flow('build', [artifact('Code')], [end('ship', 'Plan')]),
    ];
    expect(checkEndArtifacts(config(flows))).toEqual([
      { path: 'pipeline.flows.1.blocks.0.producedArtifact', message: 'must name an artifact of this flow, got Plan' },
    ]);
  });
});

describe('F-02 AC-065 a flow with no artifacts cannot have a valid end', () => {
  it('refuses any producedArtifact on an end of a flow with no artifacts', () => {
    const flows = [flow('plan', [], [end('finish', 'Plan')])];
    expect(checkEndArtifacts(config(flows))).toEqual([
      { path: 'pipeline.flows.0.blocks.0.producedArtifact', message: 'must name an artifact of this flow, got Plan' },
    ]);
  });

  it('names the path of producedArtifact for every end of such a flow', () => {
    const flows = [flow('plan', [], [end('first', 'Plan'), end('second', 'none')])];
    expect(checkEndArtifacts(config(flows)).map((problem) => problem.path)).toEqual([
      'pipeline.flows.0.blocks.0.producedArtifact',
      'pipeline.flows.0.blocks.1.producedArtifact',
    ]);
  });
});

describe('F-02 AC-064 an end after a refused item is reported at its document index', () => {
  // Parses the document, so refused items are dropped from the lists and the kept items keep their document index.
  const parsed = (...flows: unknown[]) => {
    const problems = createProblemCollector();
    const pipeline = readPipeline({ name: 'Pipeline', description: 'Desc', arguments: [], flows }, 'pipeline', problems);
    if (pipeline === undefined) throw new Error('the pipeline was refused');
    return { pipeline };
  };

  it('reports an end at the document index of its block when a block before it was refused', () => {
    const { pipeline } = parsed({
      id: 'plan',
      name: 'Plan',
      body: 'Body',
      arguments: [],
      artifacts: [{ label: 'Plan', template: 'plan.md' }],
      approval: false,
      blocks: [
        { id: 'bad' },
        { id: 's', kind: 'start', next: 'a' },
        { id: 'a', kind: 'agent', name: 'review', description: 'Agent', arguments: [], next: 'e' },
        { id: 'e', kind: 'end', outcome: 'done', producedArtifact: 'Report' },
      ],
    });
    expect(checkEndArtifacts({ pipeline })).toEqual([
      { path: 'pipeline.flows.0.blocks.3.producedArtifact', message: 'must name an artifact of this flow, got Report' },
    ]);
  });

  it('reports an end at the document index of its flow when a flow before it was refused', () => {
    const { pipeline } = parsed(
      { id: 'bad' },
      {
        id: 'plan',
        name: 'Plan',
        body: 'Body',
        arguments: [],
        artifacts: [{ label: 'Plan', template: 'plan.md' }],
        approval: false,
        blocks: [
          { id: 's', kind: 'start', next: 'a' },
          { id: 'a', kind: 'agent', name: 'review', description: 'Agent', arguments: [], next: 'e' },
          { id: 'e', kind: 'end', outcome: 'done', producedArtifact: 'Report' },
        ],
      },
    );
    expect(checkEndArtifacts({ pipeline }).map((problem) => problem.path)).toEqual([
      'pipeline.flows.1.blocks.2.producedArtifact',
    ]);
  });
});

describe('F-02 AC-064 problems come in document order', () => {
  it('lists the problems of the first flow before those of the second', () => {
    const flows = [
      flow('plan', [artifact('Plan')], [end('a', 'Missing'), end('b', 'Plan')]),
      flow('build', [], [end('c', 'Code')]),
    ];
    expect(checkEndArtifacts(config(flows)).map((problem) => problem.path)).toEqual([
      'pipeline.flows.0.blocks.0.producedArtifact',
      'pipeline.flows.1.blocks.0.producedArtifact',
    ]);
  });
});
