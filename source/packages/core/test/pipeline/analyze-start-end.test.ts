import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { startAndEndRule } from '../../src/pipeline/analyze/start-end.js';
import type { Block, Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig, withFlow } from './analyze-fixture.js';

const START_0: Block = { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '8ab88d48-0e83-5f68-ade2-07a171b5ac0c' };
const SECOND_START: Block = { index: 1, id: '6c18878e-a086-52e1-98b8-fdc2886e8d35', kind: 'start', next: '8ab88d48-0e83-5f68-ade2-07a171b5ac0c' };
const AGENT: Block = {
  index: 2,
  id: '8ab88d48-0e83-5f68-ade2-07a171b5ac0c',
  kind: 'agent',
  name: 'build-agent',
  description: 'Builds the project.',
  arguments: [],
  next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb',
};
const END_3: Block = { index: 3, id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'out.md' };
const SECOND_END: Block = { index: 4, id: '7b7048a2-e204-567d-8249-a221fe1c7f31', kind: 'end', outcome: 'stopped', producedArtifact: 'out.md' };

function withBlocks(blocks: readonly Block[]): ProjectConfig {
  return withFlow((flow: Flow) => ({ ...flow, blocks }));
}

interface Expected {
  readonly rule: string;
  readonly path: string;
}

function blockersOf(config: ProjectConfig): Expected[] {
  return startAndEndRule(config).map((finding) => ({ rule: finding.rule, path: finding.path }));
}

const cases: Array<[string, ProjectConfig, Expected[]]> = [
  ['F-03 AC-001 a flow with one Start and one End has no finding', validConfig(), []],
  [
    'F-03 AC-002 a flow with no Start gives a blocker at the flow path',
    withBlocks([AGENT, END_3]),
    [{ rule: 'flow-start', path: 'pipeline.flows.0' }],
  ],
  [
    'F-03 AC-003 a flow with two Starts gives a blocker at the second Start path',
    withBlocks([START_0, SECOND_START, AGENT, END_3]),
    [{ rule: 'flow-start', path: 'pipeline.flows.0.blocks.1' }],
  ],
  [
    'F-03 AC-003 a flow with three Starts gives a blocker at each Start after the first',
    withBlocks([START_0, SECOND_START, { ...SECOND_START, index: 2, id: '1d5ee48d-ad29-524c-8bce-97db436e42a6' }, AGENT, END_3]),
    [
      { rule: 'flow-start', path: 'pipeline.flows.0.blocks.1' },
      { rule: 'flow-start', path: 'pipeline.flows.0.blocks.2' },
    ],
  ],
  [
    'F-03 AC-004 a flow with no End gives a blocker at the flow path',
    withBlocks([START_0, AGENT]),
    [{ rule: 'flow-end', path: 'pipeline.flows.0' }],
  ],
  [
    'F-03 AC-004 a flow with two End blocks has no finding',
    withBlocks([START_0, AGENT, END_3, SECOND_END]),
    [],
  ],
  [
    'F-03 AC-005 an empty flow gives the missing Start, then the missing End, both at the flow path',
    withBlocks([]),
    [
      { rule: 'flow-start', path: 'pipeline.flows.0' },
      { rule: 'flow-end', path: 'pipeline.flows.0' },
    ],
  ],
  [
    'F-03 AC-006 a pipeline with no flow gives a blocker at root.pipeline.flows',
    { ...validConfig(), pipeline: { ...validConfig().pipeline, flows: [] } },
    [{ rule: 'pipeline-flows', path: 'pipeline.flows' }],
  ],
  [
    'F-03 AC-002 names the flow by its index, not by its position in the list',
    {
      ...validConfig(),
      pipeline: {
        ...validConfig().pipeline,
        flows: [
          ...validConfig().pipeline.flows,
          {
            index: 1,
            id: '9c7ec703-c07d-5128-b056-24c54e49081f',
            name: 'Second',
            arguments: [],
            body: 'Runs the second agent.',
            artifacts: [],
            approval: false,
            blocks: [
              {
                index: 0,
                id: 'e8a2e442-8bb9-5ea2-be8c-dceaff995e01',
                kind: 'agent',
                name: 'second-agent',
                description: 'Second.',
                arguments: [],
                next: '7b7048a2-e204-567d-8249-a221fe1c7f31',
              },
            ],
          },
        ],
      },
    },
    [
      { rule: 'flow-start', path: 'pipeline.flows.1' },
      { rule: 'flow-end', path: 'pipeline.flows.1' },
    ],
  ],
];

describe('F-03 Start and End per flow', () => {
  it.each(cases)('%s', (_name, config, expected) => {
    const findings = startAndEndRule(config);
    expect(findings.every((finding) => finding.severity === 'blocker' && finding.message !== '')).toBe(true);
    expect(blockersOf(config)).toEqual(expected);
  });

  it('F-03 AC-006 is run by the analysis entry, so a pipeline with no flow is refused by analyzeStructure', () => {
    const noFlows = { ...validConfig(), pipeline: { ...validConfig().pipeline, flows: [] } };
    expect(analyzeStructure(noFlows)).toContainEqual(
      expect.objectContaining({ severity: 'blocker', rule: 'pipeline-flows', path: 'pipeline.flows' }),
    );
  });
});
