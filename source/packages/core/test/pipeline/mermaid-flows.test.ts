import { describe, expect, it } from 'vitest';
import { processDiagram } from '../../src/pipeline/generate/mermaid.js';
import type { Flow, Pipeline } from '../../src/pipeline/model.js';

interface FlowSpec {
  id?: string;
  name: string;
  // The label of the FlowLink; absent when the flow has no FlowLink.
  label?: string;
  // The flow the FlowLink names; defaults to the next flow in pipeline order.
  to?: string;
}

// A pipeline of the given flows in order; each flow has one End block, which the diagram does not read.
function pipelineOf(specs: FlowSpec[]): Pipeline {
  const ids = specs.map((spec, index) => spec.id ?? `flow-${index + 1}`);
  return {
    name: 'Fixture pipeline',
    description: 'A pipeline for the Mermaid flow diagram.',
    arguments: [],
    flows: specs.map((spec, index): Flow => {
      const flow: Flow = {
        id: ids[index] ?? `flow-${index + 1}`,
        name: spec.name,
        description: 'A flow.',
        arguments: '',
        blocks: [{ id: `end-${index + 1}`, kind: 'end', outcome: 'done' }],
      };
      if (spec.label !== undefined) {
        flow.connectedTo = { to: spec.to ?? ids[index + 1] ?? 'none', label: spec.label };
      }
      return flow;
    }),
  };
}

interface Case {
  name: string;
  flows: FlowSpec[];
  expected: string[];
}

const cases: Case[] = [
  {
    name: 'F-05 AC-026 the first line of the diagram is flowchart TD',
    flows: [{ name: 'Build' }],
    expected: ['flowchart TD', '  F1["Build"]'],
  },
  {
    name: 'F-05 AC-026 a pipeline with no flows gives the header line only',
    flows: [],
    expected: ['flowchart TD'],
  },
  {
    name: 'F-05 AC-027 one node per flow, joined by edges in pipeline order',
    flows: [
      { name: 'Specify', label: 'spec ready' },
      { name: 'Plan', label: 'plan approved' },
      { name: 'Build' },
    ],
    expected: [
      'flowchart TD',
      '  F1["Specify"]',
      '  F2["Plan"]',
      '  F3["Build"]',
      '  F1 -->|"spec ready"| F2',
      '  F2 -->|"plan approved"| F3',
    ],
  },
  {
    name: 'F-05 AC-027 node ids are F1, F2, … and never the flow id, even for a flow named end',
    flows: [
      { id: 'end', name: 'end', label: 'done' },
      { id: 'start', name: 'Start' },
    ],
    expected: ['flowchart TD', '  F1["end"]', '  F2["Start"]', '  F1 -->|"done"| F2'],
  },
  {
    name: 'F-05 AC-027 a flow with no FlowLink gets a plain edge to the next flow',
    flows: [{ name: 'Build' }, { name: 'Review' }],
    expected: ['flowchart TD', '  F1["Build"]', '  F2["Review"]', '  F1 --> F2'],
  },
  {
    name: 'F-05 AC-027 an edge runs to the flow its FlowLink names when that is not the next flow',
    flows: [
      { id: 'spec', name: 'Specify', label: 'skip plan', to: 'build' },
      { id: 'plan', name: 'Plan' },
      { id: 'build', name: 'Build' },
    ],
    expected: [
      'flowchart TD',
      '  F1["Specify"]',
      '  F2["Plan"]',
      '  F3["Build"]',
      '  F1 -->|"skip plan"| F3',
      '  F2 --> F3',
    ],
  },
  {
    name: 'F-05 AC-027 a flow with no FlowLink in the middle gets an unlabelled edge to the next flow',
    flows: [{ name: 'Specify', label: 'spec ready' }, { name: 'Plan' }, { name: 'Build' }],
    expected: [
      'flowchart TD',
      '  F1["Specify"]',
      '  F2["Plan"]',
      '  F3["Build"]',
      '  F1 -->|"spec ready"| F2',
      '  F2 --> F3',
    ],
  },
  {
    name: 'F-05 AC-027 an edge may run back to an earlier flow, as a loop',
    flows: [
      { id: 'plan', name: 'Plan', label: 'plan ready' },
      { id: 'build', name: 'Build', label: 'rework', to: 'plan' },
      { id: 'review', name: 'Review' },
    ],
    expected: [
      'flowchart TD',
      '  F1["Plan"]',
      '  F2["Build"]',
      '  F3["Review"]',
      '  F1 -->|"plan ready"| F2',
      '  F2 -->|"rework"| F1',
    ],
  },
  {
    name: 'F-05 AC-027 the last flow with no FlowLink gets no edge',
    flows: [{ name: 'Plan', label: 'plan approved' }, { name: 'Build' }],
    expected: ['flowchart TD', '  F1["Plan"]', '  F2["Build"]', '  F1 -->|"plan approved"| F2'],
  },
  {
    name: 'F-05 AC-029 a flow name with a double quote is written as #quot;',
    flows: [{ name: 'Say "hi"' }],
    expected: ['flowchart TD', '  F1["Say #quot;hi#quot;"]'],
  },
  {
    name: 'F-05 AC-029 a line break in a flow name is written as a space',
    flows: [{ name: 'Check\r\nnow' }],
    expected: ['flowchart TD', '  F1["Check  now"]'],
  },
  {
    name: 'F-05 AC-029 a flow name with brackets and braces is written as entity codes',
    flows: [{ name: 'Check [a] {b}' }],
    expected: ['flowchart TD', '  F1["Check #91;a#93; #123;b#125;"]'],
  },
  {
    name: 'F-05 AC-029 a flow name with a pipe and a hash is written as entity codes',
    flows: [{ name: 'A|B #1' }],
    expected: ['flowchart TD', '  F1["A#124;B #35;1"]'],
  },
  {
    name: 'F-05 AC-029 a hash in a name is escaped once, not twice',
    flows: [{ name: '#quot;' }],
    expected: ['flowchart TD', '  F1["#35;quot;"]'],
  },
  {
    name: 'F-05 AC-029 an edge label with a pipe and a quote is escaped',
    flows: [{ name: 'Build', label: 'a | "b"' }, { name: 'Review' }],
    expected: [
      'flowchart TD',
      '  F1["Build"]',
      '  F2["Review"]',
      '  F1 -->|"a #124; #quot;b#quot;"| F2',
    ],
  },
  {
    name: 'F-05 AC-029 an empty edge label gives a plain edge with no label',
    flows: [{ name: 'Build', label: '' }, { name: 'Review' }],
    expected: ['flowchart TD', '  F1["Build"]', '  F2["Review"]', '  F1 --> F2'],
  },
  {
    name: 'F-05 AC-029 an empty flow name is an empty quoted label',
    flows: [{ name: '' }],
    expected: ['flowchart TD', '  F1[""]'],
  },
];

describe('processDiagram', () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      const text = processDiagram(pipelineOf(testCase.flows));
      expect(text.split('\n')).toEqual(testCase.expected);
    });
  }

  it('F-05 AC-027 refuses a FlowLink to a flow that is not in the pipeline', () => {
    const pipeline = pipelineOf([{ name: 'Specify', label: 'ok', to: 'missing' }, { name: 'Build' }]);
    expect(() => processDiagram(pipeline)).toThrow(/not in the pipeline/);
  });
});
