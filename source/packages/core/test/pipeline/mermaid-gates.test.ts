import { describe, expect, it } from 'vitest';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { processDiagram } from '../../src/pipeline/generate/mermaid.js';
import { baseValues } from '../../src/pipeline/generate/values-agent.js';
import type { Flow, Gate, Pipeline, ProjectConfig } from '../../src/pipeline/model.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';

// A pipeline of two flows, Specify then Build, joined by a FlowLink that carries the given gate.
function pipelineWithGate(label: string, gate: Gate): Pipeline {
  const link = { to: 'build', label, gate };
  const specify: Flow = {
    id: 'specify',
    name: 'Specify',
    description: 'A flow.',
    arguments: '',
    blocks: [{ id: 'end-1', kind: 'end', outcome: 'done' }],
    connectedTo: link,
  };
  const build: Flow = {
    id: 'build',
    name: 'Build',
    description: 'A flow.',
    arguments: '',
    blocks: [{ id: 'end-2', kind: 'end', outcome: 'done' }],
  };
  return {
    name: 'Fixture pipeline',
    description: 'A pipeline for the Mermaid gate diagram.',
    arguments: [],
    flows: [specify, build],
  };
}

interface Case {
  name: string;
  gate: Gate;
  label: string;
  expected: string[];
}

const cases: Case[] = [
  {
    name: 'F-05 AC-028 an approval gate is a decision node between the two flows, with an edge labelled pass',
    gate: { kind: 'approval', description: 'The user approves the spec' },
    label: 'spec ready',
    expected: [
      'flowchart TD',
      '  F1["Specify"]',
      '  F2["Build"]',
      '  G1{"Approval: The user approves the spec"}',
      '  F1 -->|"spec ready"| G1',
      '  G1 -->|"pass"| F2',
    ],
  },
  {
    name: 'F-05 AC-028 a check gate is a decision node between the two flows, with an edge labelled pass',
    gate: { kind: 'check', description: 'The diff is small', type: 'diff size', threshold: 200 },
    label: 'spec ready',
    expected: [
      'flowchart TD',
      '  F1["Specify"]',
      '  F2["Build"]',
      '  G1{"Check: The diff is small"}',
      '  F1 -->|"spec ready"| G1',
      '  G1 -->|"pass"| F2',
    ],
  },
  {
    name: 'F-05 AC-028 a gate with an empty FlowLink label keeps the edge into the gate unlabelled',
    gate: { kind: 'approval', description: 'The user approves' },
    label: '',
    expected: [
      'flowchart TD',
      '  F1["Specify"]',
      '  F2["Build"]',
      '  G1{"Approval: The user approves"}',
      '  F1 --> G1',
      '  G1 -->|"pass"| F2',
    ],
  },
  {
    name: 'F-05 AC-029 a gate description with a double quote is escaped as #quot;',
    gate: { kind: 'approval', description: 'The user says "yes"' },
    label: 'spec ready',
    expected: [
      'flowchart TD',
      '  F1["Specify"]',
      '  F2["Build"]',
      '  G1{"Approval: The user says #quot;yes#quot;"}',
      '  F1 -->|"spec ready"| G1',
      '  G1 -->|"pass"| F2',
    ],
  },
  {
    name: 'F-05 AC-029 a gate description with brackets and a pipe is written as entity codes',
    gate: { kind: 'check', description: 'Checks [a] {b} | c', type: 'checks' },
    label: 'spec ready',
    expected: [
      'flowchart TD',
      '  F1["Specify"]',
      '  F2["Build"]',
      '  G1{"Check: Checks #91;a#93; #123;b#125; #124; c"}',
      '  F1 -->|"spec ready"| G1',
      '  G1 -->|"pass"| F2',
    ],
  },
];

// The default configuration, parsed afresh on each call from a copy of the default pipeline.
function parseDefaultConfig(): ProjectConfig {
  const parsed = parseProjectConfig({
    schemaVersion: 2,
    rules: [],
    pipeline: structuredClone(defaultPipeline),
  });
  if (!parsed.ok) {
    throw new Error('the default pipeline does not parse');
  }
  return parsed.config;
}

describe('processDiagram gates', () => {
  for (const testCase of cases) {
    it(testCase.name, () => {
      const text = processDiagram(pipelineWithGate(testCase.label, testCase.gate));
      expect(text.split('\n')).toEqual(testCase.expected);
    });
  }

  it('F-05 AC-028 a gate on a FlowLink back to an earlier flow runs its pass edge to that flow', () => {
    const pipeline: Pipeline = {
      name: 'Fixture pipeline',
      description: 'A pipeline for the Mermaid gate diagram.',
      arguments: [],
      flows: [
        {
          id: 'plan',
          name: 'Plan',
          description: 'A flow.',
          arguments: '',
          blocks: [],
          connectedTo: { to: 'build', label: 'plan ready' },
        },
        {
          id: 'build',
          name: 'Build',
          description: 'A flow.',
          arguments: '',
          blocks: [],
          connectedTo: { to: 'plan', label: 'rework', gate: { kind: 'check', description: 'Tests pass', type: 'checks' } },
        },
        { id: 'review', name: 'Review', description: 'A flow.', arguments: '', blocks: [] },
      ],
    };
    expect(processDiagram(pipeline).split('\n')).toEqual([
      'flowchart TD',
      '  F1["Plan"]',
      '  F2["Build"]',
      '  F3["Review"]',
      '  G2{"Check: Tests pass"}',
      '  F1 -->|"plan ready"| F2',
      '  F2 -->|"rework"| G2',
      '  G2 -->|"pass"| F1',
    ]);
  });

  it('F-05 AC-030 the same configuration gives the same diagram text when it is parsed twice', () => {
    const first = processDiagram(parseDefaultConfig().pipeline);
    const second = processDiagram(parseDefaultConfig().pipeline);
    expect(second).toBe(first);
  });

  it('F-05 AC-030 the same pipeline gives the same diagram text on two calls', () => {
    const pipeline = pipelineWithGate('spec ready', { kind: 'approval', description: 'The user approves' });
    expect(processDiagram(pipeline)).toBe(processDiagram(pipeline));
  });

  // The process.md value is the diagram of the pipeline; AC-026 names the process.md block it fills.
  it('F-05 AC-026 the base values carry the process diagram of the pipeline as processDiagram', () => {
    const config = parseDefaultConfig();
    expect(baseValues(config).processDiagram).toBe(processDiagram(config.pipeline));
  });
});
