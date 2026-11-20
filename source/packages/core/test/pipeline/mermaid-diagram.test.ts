import { describe, expect, it } from 'vitest';
import type { Flow, Pipeline } from '../../src/pipeline/model.js';
import { processDiagram } from '../../src/pipeline/generate/mermaid.js';
import { validConfig } from './analyze-fixture.js';

// A flow with the given id, name, approval and next link. Its blocks are a Start and an End, which the diagram does
// not draw.
function flowWith(id: string, name: string, options: { approval?: boolean; next?: string } = {}): Flow {
  return {
    index: 0,
    id,
    name,
    arguments: [],
    body: '',
    artifacts: [],
    approval: options.approval ?? false,
    ...(options.next === undefined ? {} : { next: options.next }),
    blocks: [
      { index: 0, id: `${id}-start`, kind: 'start', next: `${id}-end` },
      { index: 1, id: `${id}-end`, kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
    ],
  };
}

function pipelineWith(flows: readonly Flow[]): Pipeline {
  const base = validConfig().pipeline;
  return { ...base, flows: flows.map((flow, i) => ({ ...flow, index: i })) };
}

describe('F-05 the diagram text starts with the flowchart line (the fence of AC-030 is a later task)', () => {
  it('has flowchart as its first line and no other line before the nodes', () => {
    const lines = processDiagram(pipelineWith([flowWith('specify', 'Specify')])).split('\n');
    expect(lines[0]).toBe('flowchart');
    expect(lines[1]).toBe('F1["Specify"]');
  });

  it('gives only the flowchart line when there are no flows', () => {
    expect(processDiagram(pipelineWith([]))).toBe('flowchart');
  });
});

describe('F-05 AC-031 the diagram has one node per flow in the order of the next links from the first flow', () => {
  it('numbers the nodes F1, F2 and so on, labelled with each flow name', () => {
    const diagram = processDiagram(
      pipelineWith([
        flowWith('specify', 'Specify', { next: 'plan' }),
        flowWith('plan', 'Plan', { next: 'build' }),
        flowWith('build', 'Build'),
      ]),
    );
    expect(diagram).toBe(
      ['flowchart', 'F1["Specify"]', 'F2["Plan"]', 'F3["Build"]', 'F1 --> F2', 'F2 --> F3'].join('\n'),
    );
  });

  it('orders the nodes by the next links, not by the order of the flows in the pipeline', () => {
    const diagram = processDiagram(
      pipelineWith([
        flowWith('build', 'Build'),
        flowWith('plan', 'Plan', { next: 'build' }),
        flowWith('specify', 'Specify', { next: 'plan' }),
      ]),
    );
    expect(diagram).toBe(
      ['flowchart', 'F1["Specify"]', 'F2["Plan"]', 'F3["Build"]', 'F1 --> F2', 'F2 --> F3'].join('\n'),
    );
  });

  it('labels a node with the flow name, not the flow id', () => {
    const diagram = processDiagram(pipelineWith([flowWith('spec-1', 'Specify the brief')]));
    expect(diagram.split('\n')[1]).toBe('F1["Specify the brief"]');
  });

  it('gives the same text for the same pipeline, every time', () => {
    const build = (): Pipeline =>
      pipelineWith([flowWith('specify', 'Specify', { next: 'plan', approval: true }), flowWith('plan', 'Plan')]);
    const first = processDiagram(build());
    expect(processDiagram(build())).toBe(first);
    expect(processDiagram(build())).toBe(first);
  });
});

describe('F-05 AC-032 each next link is one unlabelled edge, and the last flow gets no edge', () => {
  it('draws one edge from each flow with a next link to the flow it names', () => {
    const lines = processDiagram(
      pipelineWith([flowWith('specify', 'Specify', { next: 'plan' }), flowWith('plan', 'Plan')]),
    ).split('\n');
    expect(lines.filter((line) => line.includes('-->'))).toEqual(['F1 --> F2']);
  });

  it('gives no edge for the last flow and no edge for a single flow', () => {
    expect(processDiagram(pipelineWith([flowWith('plan', 'Plan')]))).toBe('flowchart\nF1["Plan"]');
  });

  it('gives edges with no label text on them', () => {
    const lines = processDiagram(
      pipelineWith([flowWith('specify', 'Specify', { next: 'plan' }), flowWith('plan', 'Plan')]),
    ).split('\n');
    expect(lines).toContain('F1 --> F2');
    expect(lines.some((line) => line.includes('|'))).toBe(false);
  });

  it('draws nothing for a flow after the chain that no next link reaches', () => {
    const diagram = processDiagram(
      pipelineWith([
        flowWith('specify', 'Specify', { next: 'plan' }),
        flowWith('plan', 'Plan'),
        flowWith('loose', 'Loose'),
      ]),
    );
    expect(diagram).toBe(['flowchart', 'F1["Specify"]', 'F2["Plan"]', 'F1 --> F2'].join('\n'));
  });
});

describe('F-05 AC-033 an approval flow ends its label with approval, and an approval-off flow has no such word', () => {
  it('ends the label of an approval flow with the word approval', () => {
    const diagram = processDiagram(pipelineWith([flowWith('specify', 'Specify', { approval: true })]));
    expect(diagram.split('\n')[1]).toBe('F1["Specify approval"]');
  });

  it('has no approval word in the label of a flow with approval off', () => {
    const diagram = processDiagram(pipelineWith([flowWith('specify', 'Specify', { approval: false })]));
    expect(diagram.split('\n')[1]).toBe('F1["Specify"]');
    expect(diagram).not.toContain('approval');
  });

  it('marks each node by its own approval flag', () => {
    const lines = processDiagram(
      pipelineWith([
        flowWith('specify', 'Specify', { approval: true, next: 'plan' }),
        flowWith('plan', 'Plan', { approval: false }),
      ]),
    ).split('\n');
    expect(lines.slice(1, 3)).toEqual(['F1["Specify approval"]', 'F2["Plan"]']);
  });
});
