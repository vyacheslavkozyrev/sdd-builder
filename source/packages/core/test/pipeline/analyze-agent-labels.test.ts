import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { agentLabelsRule } from '../../src/pipeline/analyze/agent-labels.js';
import type { AgentBlock, Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig, withFlow } from './analyze-fixture.js';

// The valid config (outcome artifact `out.md`) with its agent at index 1 given `reads` and `writes`.
function withLabels(reads: readonly string[] | undefined, writes: readonly string[] | undefined): ProjectConfig {
  return withFlow((flow: Flow) => ({
    ...flow,
    blocks: flow.blocks.map((block) =>
      block.kind === 'agent'
        ? ({
            ...block,
            ...(reads === undefined ? {} : { reads }),
            ...(writes === undefined ? {} : { writes }),
          } satisfies AgentBlock)
        : block,
    ),
  }));
}

// A two-flow pipeline: the agent of the first flow reads `reads` and writes `writes`; the second flow lists `plan.md`.
function withTwoFlows(reads: readonly string[], writes: readonly string[]): ProjectConfig {
  const config = withLabels(reads, writes);
  const first = config.pipeline.flows[0];
  if (first === undefined) throw new Error('the fixture has no flow');
  const second: Flow = {
    ...first,
    index: 1,
    id: 'plan',
    name: 'Plan',
    artifacts: [{ label: 'plan.md', template: 'The plan' }],
    blocks: [],
  };
  return { ...config, pipeline: { ...config.pipeline, flows: [first, second] } };
}

const cases: Array<[string, ProjectConfig, Array<{ path: string }>]> = [
  ['F-12 AC-026 an Agent with no reads or writes has no finding', withLabels(undefined, undefined), []],
  ['F-12 AC-026 an empty reads and writes list has no finding', withLabels([], []), []],
  ['F-12 AC-026 a read of the flow outcome artifact has no finding', withLabels(['out.md'], []), []],
  ['F-12 AC-026 a write of the flow outcome artifact has no finding', withLabels([], ['out.md']), []],
  [
    'F-12 AC-026 a read of an outcome artifact of another flow has no finding',
    withTwoFlows(['plan.md'], ['out.md']),
    [],
  ],
  [
    'F-12 AC-026 a read that is not an outcome artifact is refused at its reads path',
    withLabels(['notes.md'], undefined),
    [{ path: 'pipeline.flows.0.blocks.1.reads.0' }],
  ],
  [
    'F-12 AC-026 a write that is not an outcome artifact is refused at its writes path',
    withLabels(undefined, ['notes.md']),
    [{ path: 'pipeline.flows.0.blocks.1.writes.0' }],
  ],
  [
    'F-12 AC-026 the second unknown label is refused at its own index',
    withLabels(['out.md', 'notes.md', 'todo.md'], undefined),
    [{ path: 'pipeline.flows.0.blocks.1.reads.1' }, { path: 'pipeline.flows.0.blocks.1.reads.2' }],
  ],
  [
    'F-12 AC-026 an unknown label in both lists is refused at both paths, reads first',
    withLabels(['notes.md'], ['todo.md']),
    [{ path: 'pipeline.flows.0.blocks.1.reads.0' }, { path: 'pipeline.flows.0.blocks.1.writes.0' }],
  ],
  [
    'F-12 AC-026 a label is matched exactly, not by its case',
    withLabels(['OUT.md'], undefined),
    [{ path: 'pipeline.flows.0.blocks.1.reads.0' }],
  ],
];

describe('F-12 AC-026 Agent reads and writes name outcome artifacts', () => {
  it.each(cases)('%s', (_name, config, expected) => {
    const findings = agentLabelsRule(config);
    expect(findings.every((finding) => finding.severity === 'blocker' && finding.rule === 'agent-label')).toBe(true);
    expect(findings.map((finding) => ({ path: finding.path }))).toEqual(expected);
  });

  it('F-12 AC-026 an unknown label is refused by analyzeStructure with the same blocker and message', () => {
    expect(analyzeStructure(withLabels(['notes.md'], undefined))).toContainEqual({
      severity: 'blocker',
      rule: 'agent-label',
      path: 'pipeline.flows.0.blocks.1.reads.0',
      message: 'must name an outcome artifact of a flow, got notes.md',
    });
  });
});
