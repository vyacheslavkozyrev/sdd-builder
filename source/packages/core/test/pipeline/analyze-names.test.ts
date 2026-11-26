import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { reuseRule } from '../../src/pipeline/analyze/reuse.js';
import type { AgentBlock, Argument, Block, Flow, ProjectConfig, Rule, RuleTag } from '../../src/pipeline/model.js';
import { validConfig, withFlow } from './analyze-fixture.js';

const RULE: Rule = { index: 0, id: 'e11673a5-c551-5a14-97b9-176a53e3b7f2', title: 'No secrets', text: 'Never write a secret.' };

function ruleTags(...ruleIds: string[]): RuleTag[] {
  return ruleIds.map((ruleId, index) => ({ ruleId, index }));
}

function withRules(config: ProjectConfig, rules: readonly Rule[]): ProjectConfig {
  return { ...config, rules };
}

function withAgents(change: (agent: AgentBlock) => AgentBlock): ProjectConfig {
  return withFlow((flow: Flow) => ({
    ...flow,
    blocks: flow.blocks.map((block) => (block.kind === 'agent' ? change(block) : block)),
  }));
}

// A second flow with its own block ids, so only the names under test can clash with the first flow.
function withSecondFlow(change: (flow: Flow) => Flow): ProjectConfig {
  const base = validConfig();
  const first = base.pipeline.flows[0];
  if (first === undefined) throw new Error('the fixture has no flow');
  const blocks: Block[] = [
    { index: 0, id: '6c18878e-a086-52e1-98b8-fdc2886e8d35', kind: 'start', next: 'e8a2e442-8bb9-5ea2-be8c-dceaff995e01' },
    {
      index: 1,
      id: 'e8a2e442-8bb9-5ea2-be8c-dceaff995e01',
      kind: 'agent',
      name: 'review-agent',
      description: 'Reviews the build.',
      arguments: [],
      next: '7b7048a2-e204-567d-8249-a221fe1c7f31',
    },
    { index: 2, id: '7b7048a2-e204-567d-8249-a221fe1c7f31', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
  ];
  const second = change({ ...first, index: 1, id: '82c969a4-365a-5525-8168-6ae1093b1867', name: 'Review', blocks });
  return { ...base, pipeline: { ...base.pipeline, flows: [first, second] } };
}

// The valid config with a second agent, named `name`, after the first agent in the same flow.
function withSecondAgentNamed(name: string): ProjectConfig {
  return withFlow((flow: Flow) => {
    const [start, agent, end] = flow.blocks;
    if (start === undefined || agent === undefined || end === undefined) throw new Error('the fixture is changed');
    const second: AgentBlock = {
      index: 2,
      id: 'e8a2e442-8bb9-5ea2-be8c-dceaff995e01',
      kind: 'agent',
      name,
      description: 'Builds again.',
      arguments: [],
      next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb',
    };
    return { ...flow, blocks: [start, agent, second, { ...end, index: 3 }] };
  });
}

function renameAgents(name: string): (flow: Flow) => Flow {
  return (flow) => ({
    ...flow,
    blocks: flow.blocks.map((block) => (block.kind === 'agent' ? { ...block, name } : block)),
  });
}

interface Expected {
  readonly rule: string;
  readonly path: string;
}

function blockersOf(config: ProjectConfig): Expected[] {
  return reuseRule(config).map((finding) => ({ rule: finding.rule, path: finding.path }));
}

const FLOW_ID_1: Expected[] = [{ rule: 'unique-id', path: 'pipeline.flows.1.id' }];
const AGENT_NAME_1_1: Expected[] = [{ rule: 'unique-id', path: 'pipeline.flows.1.blocks.1.name' }];
const AGENT_NAME_0_2: Expected[] = [{ rule: 'unique-id', path: 'pipeline.flows.0.blocks.2.name' }];

const cases: Array<[string, ProjectConfig, Expected[]]> = [
  ['F-03 AC-025 two flows with different ids have no finding', withSecondFlow((flow) => flow), []],
  [
    'F-03 AC-025 a repeated flow id gives a blocker at the later flow id path',
    withSecondFlow((flow) => ({ ...flow, id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' })),
    FLOW_ID_1,
  ],
  [
    'F-03 AC-027 a repeated agent name in another flow gives a blocker at the later name path',
    withSecondFlow(renameAgents('build-agent')),
    AGENT_NAME_1_1,
  ],
  [
    'F-03 AC-027 a repeated agent name in the same flow gives a blocker at the later name path',
    withSecondAgentNamed('build-agent'),
    AGENT_NAME_0_2,
  ],
  [
    'F-03 AC-027 agent names that differ have no finding',
    withSecondAgentNamed('test-agent'),
    [],
  ],
  [
    'F-03 AC-030 a pipeline rule tag that names an existing rule has no finding',
    withRules({ ...validConfig(), pipeline: { ...validConfig().pipeline, ruleTags: ruleTags('e11673a5-c551-5a14-97b9-176a53e3b7f2') } }, [RULE]),
    [],
  ],
  [
    'F-03 AC-030 a pipeline rule tag that names no rule gives a blocker at the tag path',
    { ...validConfig(), pipeline: { ...validConfig().pipeline, ruleTags: ruleTags('e11673a5-c551-5a14-97b9-176a53e3b7f2') } },
    [{ rule: 'rule-tag', path: 'pipeline.ruleTags.0' }],
  ],
  [
    'F-03 AC-030 a flow rule tag that names no rule gives a blocker at the tag path',
    withRules(
      withFlow((flow) => ({ ...flow, ruleTags: ruleTags('e11673a5-c551-5a14-97b9-176a53e3b7f2', '71b2ecbc-b1ec-5b8f-b792-a30a35989a2e') })),
      [RULE],
    ),
    [{ rule: 'rule-tag', path: 'pipeline.flows.0.ruleTags.1' }],
  ],
  [
    'F-03 AC-030 an agent rule tag that names no rule gives a blocker at the tag path',
    withRules(
      withAgents((agent) => ({ ...agent, ruleTags: ruleTags('71b2ecbc-b1ec-5b8f-b792-a30a35989a2e') })),
      [RULE],
    ),
    [{ rule: 'rule-tag', path: 'pipeline.flows.0.blocks.1.ruleTags.0' }],
  ],
  [
    'F-03 AC-030 a rule tag that differs from a rule id only in case gives a blocker',
    withRules(
      withAgents((agent) => ({ ...agent, ruleTags: ruleTags('No-Secrets') })),
      [RULE],
    ),
    [{ rule: 'rule-tag', path: 'pipeline.flows.0.blocks.1.ruleTags.0' }],
  ],
  [
    'F-03 AC-030 a tag on a project with no rules gives a blocker',
    withFlow((flow) => ({ ...flow, ruleTags: ruleTags('e11673a5-c551-5a14-97b9-176a53e3b7f2') })),
    [{ rule: 'rule-tag', path: 'pipeline.flows.0.ruleTags.0' }],
  ],
];

describe('F-03 AC-025, AC-027, AC-030 repeated ids, names and rule tags', () => {
  it.each(cases)('%s', (_name, config, expected) => {
    expect(blockersOf(config)).toEqual(expected);
  });

  it('F-03 AC-025 every finding of this rule is a blocker with a message', () => {
    const findings = reuseRule(withSecondFlow((flow) => ({ ...flow, id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' })));
    expect(findings).toEqual([
      expect.objectContaining({
        severity: 'blocker',
        rule: 'unique-id',
        path: 'pipeline.flows.1.id',
        message: expect.stringContaining('ea365500-e6ec-5064-90ea-fb6cc4bb49d6'),
      }),
    ]);
  });

  it('F-03 AC-025 a repeated flow id is reported by the analysis entry', () => {
    const result = analyzeStructure(withSecondFlow((flow) => ({ ...flow, id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' })));
    expect(result).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: 'unique-id', path: 'pipeline.flows.1.id' })]),
    );
  });
});

interface Placed {
  readonly path: string;
  readonly position: { readonly flow: number; readonly block: number; readonly slot: number };
}

function placedOf(config: ProjectConfig): Placed[] {
  return reuseRule(config).map((finding) => ({ path: finding.path, position: finding.position }));
}

const PIPELINE_LEVEL = { flow: -1, block: -1, slot: -1 };

function argument(index: number, id: string): Argument {
  return { index, id, required: false, hint: 'A hint.' };
}

const placedCases: Array<[string, ProjectConfig, Placed[]]> = [
  [
    'F-03 AC-025 a repeated rule id is placed at pipeline level, at the later rule',
    withRules(validConfig(), [RULE, { ...RULE, index: 1 }]),
    [{ path: 'rules.1.id', position: PIPELINE_LEVEL }],
  ],
  [
    'F-03 AC-026 a pipeline argument that clashes with a rule id is placed at pipeline level',
    {
      ...withRules(validConfig(), [RULE]),
      pipeline: { ...validConfig().pipeline, arguments: [argument(0, 'e11673a5-c551-5a14-97b9-176a53e3b7f2')] },
    },
    [{ path: 'pipeline.arguments.0.id', position: PIPELINE_LEVEL }],
  ],
  [
    'F-03 AC-030 a pipeline rule tag that names no rule is placed at pipeline level',
    { ...validConfig(), pipeline: { ...validConfig().pipeline, ruleTags: ruleTags('71b2ecbc-b1ec-5b8f-b792-a30a35989a2e') } },
    [{ path: 'pipeline.ruleTags.0', position: PIPELINE_LEVEL }],
  ],
  [
    'F-03 AC-025 a flow id that repeats is placed in its flow, at block -1 and slot -1',
    withSecondFlow((flow) => ({ ...flow, id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' })),
    [{ path: 'pipeline.flows.1.id', position: { flow: 1, block: -1, slot: -1 } }],
  ],
  [
    'F-03 AC-026 a flow argument that clashes with a flow id is placed in its flow, and so is the flow id',
    withFlow((flow) => ({ ...flow, arguments: [argument(0, 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6')] })),
    [
      { path: 'pipeline.flows.0.id', position: { flow: 0, block: -1, slot: -1 } },
      { path: 'pipeline.flows.0.arguments.0.id', position: { flow: 0, block: -1, slot: -1 } },
    ],
  ],
  [
    'F-03 AC-030 a flow rule tag that names no rule is placed in its flow',
    withFlow((flow) => ({ ...flow, ruleTags: ruleTags('71b2ecbc-b1ec-5b8f-b792-a30a35989a2e') })),
    [{ path: 'pipeline.flows.0.ruleTags.0', position: { flow: 0, block: -1, slot: -1 } }],
  ],
  [
    'F-03 AC-025 a block id that repeats in a later flow is placed in that block',
    withSecondFlow((flow) => ({
      ...flow,
      blocks: flow.blocks.map((block) => (block.index === 0 ? { ...block, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551' } : block)),
    })),
    [{ path: 'pipeline.flows.1.blocks.0.id', position: { flow: 1, block: 0, slot: -1 } }],
  ],
  [
    'F-03 AC-026 an argument row of an agent that clashes with a block id is placed in that block',
    withAgents((agent) => ({ ...agent, arguments: [argument(0, 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551')] })),
    [{ path: 'pipeline.flows.0.blocks.1.arguments.0.id', position: { flow: 0, block: 1, slot: -1 } }],
  ],
  [
    'F-03 AC-030 an agent rule tag that names no rule is placed in its block',
    withRules(
      withAgents((agent) => ({ ...agent, ruleTags: ruleTags('71b2ecbc-b1ec-5b8f-b792-a30a35989a2e') })),
      [RULE],
    ),
    [{ path: 'pipeline.flows.0.blocks.1.ruleTags.0', position: { flow: 0, block: 1, slot: -1 } }],
  ],
  [
    'F-03 AC-027 an agent name that repeats is placed in the block of the later agent',
    withSecondAgentNamed('build-agent'),
    [{ path: 'pipeline.flows.0.blocks.2.name', position: { flow: 0, block: 2, slot: -1 } }],
  ],
];

describe('F-03 AC-025, AC-026, AC-027, AC-030 position of a reused finding', () => {
  it.each(placedCases)('%s', (_name, config, expected) => {
    expect(placedOf(config)).toEqual(expected);
  });
});
