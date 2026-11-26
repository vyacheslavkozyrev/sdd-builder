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
    const lines = processDiagram(pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify')])).split('\n');
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
        flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify', { next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' }),
        flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Plan', { next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' }),
        flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', 'Build'),
      ]),
    );
    expect(diagram).toBe(
      ['flowchart', 'F1["Specify"]', 'F2["Plan"]', 'F3["Build"]', 'F1 --> F2', 'F2 --> F3'].join('\n'),
    );
  });

  it('orders the nodes by the next links, not by the order of the flows in the pipeline', () => {
    const diagram = processDiagram(
      pipelineWith([
        flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', 'Build'),
        flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Plan', { next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' }),
        flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify', { next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' }),
      ]),
    );
    expect(diagram).toBe(
      ['flowchart', 'F1["Specify"]', 'F2["Plan"]', 'F3["Build"]', 'F1 --> F2', 'F2 --> F3'].join('\n'),
    );
  });

  it('labels a node with the flow name, not the flow id', () => {
    const diagram = processDiagram(pipelineWith([flowWith('97e657c4-56fd-5c78-95f2-9287f437ca55', 'Specify the brief')]));
    expect(diagram.split('\n')[1]).toBe('F1["Specify the brief"]');
  });

  it('gives the same text for the same pipeline, every time', () => {
    const build = (): Pipeline =>
      pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify', { next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92', approval: true }), flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Plan')]);
    const first = processDiagram(build());
    expect(processDiagram(build())).toBe(first);
    expect(processDiagram(build())).toBe(first);
  });
});

describe('F-05 AC-032 each next link is one unlabelled edge, and the last flow gets no edge', () => {
  it('draws one edge from each flow with a next link to the flow it names', () => {
    const lines = processDiagram(
      pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify', { next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' }), flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Plan')]),
    ).split('\n');
    expect(lines.filter((line) => line.includes('-->'))).toEqual(['F1 --> F2']);
  });

  it('gives no edge for the last flow and no edge for a single flow', () => {
    expect(processDiagram(pipelineWith([flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Plan')]))).toBe('flowchart\nF1["Plan"]');
  });

  it('gives edges with no label text on them', () => {
    const lines = processDiagram(
      pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify', { next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' }), flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Plan')]),
    ).split('\n');
    expect(lines).toContain('F1 --> F2');
    expect(lines.some((line) => line.includes('|'))).toBe(false);
  });

  it('draws nothing for a flow after the chain that no next link reaches', () => {
    const diagram = processDiagram(
      pipelineWith([
        flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify', { next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' }),
        flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Plan'),
        flowWith('0be15872-56ad-51b7-9c6a-030f137023be', 'Loose'),
      ]),
    );
    expect(diagram).toBe(['flowchart', 'F1["Specify"]', 'F2["Plan"]', 'F1 --> F2'].join('\n'));
  });
});

describe('F-05 AC-034 a quote, bracket, brace, pipe or hash in a flow name is written as an entity code', () => {
  it.each([
    ['a double quote', 'Say "hi"', 'Say #quot;hi#quot;'],
    ['a square bracket', 'Run [now]', 'Run #91;now#93;'],
    ['a brace', 'Use {x}', 'Use #123;x#125;'],
    ['a pipe', 'a | b', 'a #124; b'],
    ['a hash', 'Issue #5', 'Issue #35;5'],
  ])('F-05 AC-034 writes %s in the label as its entity code', (_case, name, escaped) => {
    const diagram = processDiagram(pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', name)]));
    expect(diagram).toBe(`flowchart\nF1["${escaped}"]`);
  });

  it('F-05 AC-034 writes a hash before the other codes, so an entity code in a name is not escaped twice', () => {
    const diagram = processDiagram(pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', '#quot; "x"')]));
    expect(diagram.split('\n')[1]).toBe('F1["#35;quot; #quot;x#quot;"]');
  });

  it('F-05 AC-034 escapes every special character of one name and keeps the other characters', () => {
    const diagram = processDiagram(pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'A "b" [c] {d} | e # f')]));
    expect(diagram.split('\n')[1]).toBe('F1["A #quot;b#quot; #91;c#93; #123;d#125; #124; e #35; f"]');
  });

  it('F-05 AC-034 escapes the name before the approval word, which stays as written', () => {
    const diagram = processDiagram(pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Plan "v2"', { approval: true })]));
    expect(diagram.split('\n')[1]).toBe('F1["Plan #quot;v2#quot; approval"]');
  });

  it('F-05 AC-034 writes a line break in a name as a space, and a CRLF as one space', () => {
    const lines = processDiagram(
      pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Plan\nthe work', { next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' }), flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Build\r\nit\rnow')]),
    ).split('\n');
    expect(lines.slice(1, 3)).toEqual(['F1["Plan the work"]', 'F2["Build it now"]']);
  });

  it('F-05 AC-034 writes a Unicode line or paragraph separator in a name as a space', () => {
    const diagram = processDiagram(pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'a b c')]));
    expect(diagram.split('\n')[1]).toBe('F1["a b c"]');
  });

  it('F-05 AC-034 keeps the first line flowchart when a name holds special characters', () => {
    const diagram = processDiagram(pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'a "b"\nc')]));
    expect(diagram.split('\n')[0]).toBe('flowchart');
  });
});

describe('F-05 AC-035 the same configuration gives the same diagram text, byte for byte', () => {
  it('F-05 AC-035 gives the same text on two calls for a config with special characters and line breaks', () => {
    const build = (): Pipeline =>
      pipelineWith([
        flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify "the" [brief]\n{now}', { approval: true, next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' }),
        flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Plan | #1', { next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' }),
        flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', 'Build'),
      ]);
    const expected = [
      'flowchart',
      'F1["Specify #quot;the#quot; #91;brief#93; #123;now#125; approval"]',
      'F2["Plan #124; #35;1"]',
      'F3["Build"]',
      'F1 --> F2',
      'F2 --> F3',
    ].join('\n');
    expect(processDiagram(build())).toBe(expected);
    expect(processDiagram(build())).toBe(expected);
  });

  it('F-05 AC-035 gives the same text on two calls with the same pipeline object', () => {
    const pipeline = pipelineWith([
      flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Say "hi" {x}', { approval: true, next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' }),
      flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Plan'),
    ]);
    const first = processDiagram(pipeline);
    const second = processDiagram(pipeline);
    expect(second).toBe(first);
    expect(first.split('\n')[1]).toBe('F1["Say #quot;hi#quot; #123;x#125; approval"]');
  });
});

describe('F-05 AC-033 an approval flow ends its label with approval, and an approval-off flow has no such word', () => {
  it('ends the label of an approval flow with the word approval', () => {
    const diagram = processDiagram(pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify', { approval: true })]));
    expect(diagram.split('\n')[1]).toBe('F1["Specify approval"]');
  });

  it('has no approval word in the label of a flow with approval off', () => {
    const diagram = processDiagram(pipelineWith([flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify', { approval: false })]));
    expect(diagram.split('\n')[1]).toBe('F1["Specify"]');
    expect(diagram).not.toContain('approval');
  });

  it('gives an approval-off flow whose name holds the word its name as typed, with no suffix', () => {
    const diagram = processDiagram(pipelineWith([flowWith('82c969a4-365a-5525-8168-6ae1093b1867', 'Approval review', { approval: false })]));
    expect(diagram.split('\n')[1]).toBe('F1["Approval review"]');
  });

  it('marks each node by its own approval flag', () => {
    const lines = processDiagram(
      pipelineWith([
        flowWith('52ed1bec-f0b1-54bc-8e7b-21076ea2ac3a', 'Specify', { approval: true, next: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' }),
        flowWith('fc358416-c66a-5fef-9c5e-a282b75cbd92', 'Plan', { approval: false }),
      ]),
    ).split('\n');
    expect(lines.slice(1, 3)).toEqual(['F1["Specify approval"]', 'F2["Plan"]']);
  });
});
