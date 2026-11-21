import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { identityAndTextRule } from '../../src/pipeline/analyze/text.js';
import type { AgentBlock, Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig, withFlow } from './analyze-fixture.js';

function withAgent(change: (agent: AgentBlock) => AgentBlock): ProjectConfig {
  return withFlow((flow: Flow) => ({
    ...flow,
    blocks: flow.blocks.map((block) => (block.kind === 'agent' ? change(block) : block)),
  }));
}

// The valid config with a second flow, index 1, whose id is `id`. The paths of its findings use the index.
function withSecondFlowId(id: string): ProjectConfig {
  const base = validConfig();
  const first = base.pipeline.flows[0];
  if (first === undefined) throw new Error('the fixture has no flow');
  const second: Flow = { ...first, index: 1, id };
  return { ...base, pipeline: { ...base.pipeline, flows: [first, second] } };
}

interface Expected {
  readonly rule: string;
  readonly path: string;
}

function blockersOf(config: ProjectConfig): Expected[] {
  return identityAndTextRule(config).map((finding) => ({ rule: finding.rule, path: finding.path }));
}

const FLOW_ID_0: Expected[] = [{ rule: 'flow-id', path: 'pipeline.flows.0.id' }];
const AGENT_NAME_1: Expected[] = [{ rule: 'agent-name', path: 'pipeline.flows.0.blocks.1.name' }];
const AGENT_DESCRIPTION_1: Expected[] = [
  { rule: 'agent-description', path: 'pipeline.flows.0.blocks.1.description' },
];

// The blank body cases are built without the parser, which refuses a blank body (flow.ts), so the
// analyzer's own blocker is still proved on a config the parser would not accept.
const cases: Array<[string, ProjectConfig, Expected[]]> = [
  ['F-03 AC-026 a valid flow id and names have no finding', validConfig(), []],
  [
    'F-03 AC-026 a flow id with an uppercase letter gives a blocker at the id path',
    withFlow((flow) => ({ ...flow, id: 'Build' })),
    FLOW_ID_0,
  ],
  [
    'F-03 AC-026 a flow id with an underscore gives a blocker at the id path',
    withFlow((flow) => ({ ...flow, id: 'build_flow' })),
    FLOW_ID_0,
  ],
  [
    'F-03 AC-026 a flow id that starts with a digit gives a blocker at the id path',
    withFlow((flow) => ({ ...flow, id: '1build' })),
    FLOW_ID_0,
  ],
  ['F-03 AC-026 an empty flow id gives a blocker at the id path', withFlow((flow) => ({ ...flow, id: '' })), FLOW_ID_0],
  [
    'F-03 AC-026 a flow id named pipeline gives a blocker at the id path',
    withFlow((flow) => ({ ...flow, id: 'pipeline' })),
    FLOW_ID_0,
  ],
  ['F-03 AC-026 a second flow with a bad id gives a blocker at its own index path', withSecondFlowId('Review'), [
    { rule: 'flow-id', path: 'pipeline.flows.1.id' },
  ]],
  ['F-03 AC-026 a single-letter flow id is file-safe and has no finding', withFlow((flow) => ({ ...flow, id: 'a' })), []],
  [
    'F-03 AC-026 a flow id with digits and hyphens has no finding',
    withFlow((flow) => ({ ...flow, id: 'build-2' })),
    [],
  ],
  [
    'F-03 AC-027 an agent name with an uppercase letter gives a blocker at the name path',
    withAgent((agent) => ({ ...agent, name: 'Build-Agent' })),
    AGENT_NAME_1,
  ],
  [
    'F-03 AC-027 an agent name with a space gives a blocker at the name path',
    withAgent((agent) => ({ ...agent, name: 'build agent' })),
    AGENT_NAME_1,
  ],
  ['F-03 AC-027 an empty agent name gives a blocker at the name path', withAgent((agent) => ({ ...agent, name: '' })), AGENT_NAME_1],
  [
    'F-03 AC-027 an agent name called pipeline is file-safe and has no finding',
    withAgent((agent) => ({ ...agent, name: 'pipeline' })),
    [],
  ],
  [
    'F-03 AC-028 a blank flow name gives a blocker at the name path',
    withFlow((flow) => ({ ...flow, name: '' })),
    [{ rule: 'flow-name', path: 'pipeline.flows.0.name' }],
  ],
  [
    'F-03 AC-028 a flow name of spaces only gives a blocker at the name path',
    withFlow((flow) => ({ ...flow, name: '   ' })),
    [{ rule: 'flow-name', path: 'pipeline.flows.0.name' }],
  ],
  [
    'F-03 AC-028 a blank flow body gives a blocker at the body path',
    withFlow((flow) => ({ ...flow, body: '\n\t ' })),
    [{ rule: 'flow-body', path: 'pipeline.flows.0.body' }],
  ],
  [
    'F-03 AC-028 an empty flow body gives a blocker at the body path',
    withFlow((flow) => ({ ...flow, body: '' })),
    [{ rule: 'flow-body', path: 'pipeline.flows.0.body' }],
  ],
  ['F-03 AC-028 an empty flow description has no finding', withFlow((flow) => ({ ...flow, description: '' })), []],
  ['F-03 AC-028 a flow with no arguments has no finding', withFlow((flow) => ({ ...flow, arguments: [] })), []],
  [
    'F-03 AC-029 an empty agent description gives a blocker at the description path',
    withAgent((agent) => ({ ...agent, description: '' })),
    AGENT_DESCRIPTION_1,
  ],
  [
    'F-03 AC-029 an agent description of spaces only gives a blocker at the description path',
    withAgent((agent) => ({ ...agent, description: '  ' })),
    AGENT_DESCRIPTION_1,
  ],
  [
    'F-03 AC-026 to AC-029 a blank flow name and a blank agent description give two blockers, flow first',
    withFlow((flow: Flow) => ({
      ...flow,
      name: ' ',
      blocks: flow.blocks.map((block) => (block.kind === 'agent' ? { ...block, description: '' } : block)),
    })),
    [{ rule: 'flow-name', path: 'pipeline.flows.0.name' }, ...AGENT_DESCRIPTION_1],
  ],
];

describe('F-03 identity and required text', () => {
  it.each(cases)('%s', (_name, config, expected) => {
    expect(identityAndTextRule(config).every((finding) => finding.severity === 'blocker')).toBe(true);
    expect(blockersOf(config)).toEqual(expected);
  });

  it('F-03 AC-026 is run by the analysis entry, so a flow id that is not file-safe is refused by analyzeStructure', () => {
    const badId = withFlow((flow) => ({ ...flow, id: 'Build' }));
    expect(analyzeStructure(badId)).toContainEqual(
      expect.objectContaining({ severity: 'blocker', rule: 'flow-id', path: 'pipeline.flows.0.id' }),
    );
  });
});
