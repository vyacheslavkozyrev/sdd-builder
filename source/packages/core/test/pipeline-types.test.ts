import { describe, expect, it } from 'vitest';
import type {
  ChildBlock,
  ConditionBlock,
  Flow,
  PipelineBlock,
  ProjectConfig,
  Route,
} from '../src/pipeline/index.js';

// Typed fixtures. `tsc --noEmit` checks them; the lines marked @ts-expect-error
// must fail to compile, so a model that accepts them breaks the typecheck.

const startBlock: ChildBlock = { kind: 'start', id: 'start', enabled: true };

const agentBlock: ChildBlock = {
  kind: 'agent',
  id: 'specify-agent',
  enabled: true,
  name: 'specifier',
  scope: 'feature',
  description: 'Drafts the stories.',
};

const approvalCondition: ConditionBlock = {
  kind: 'condition',
  id: 'approve-spec',
  enabled: true,
  description: 'The check passes.',
  checkType: 'approval',
  decidedBy: 'human',
  passRoute: { kind: 'next' },
  failRoute: { kind: 'stop' },
};

const checksCondition: ConditionBlock = {
  kind: 'condition',
  id: 'run-checks',
  enabled: true,
  description: 'The check passes.',
  checkType: 'checks',
  decidedBy: 'agent',
  passRoute: { kind: 'next' },
  failRoute: { kind: 'back', blockId: 'build-agent' },
  roundLimit: 3,
};

const disabledChecksCondition: ConditionBlock = {
  kind: 'condition',
  id: 'run-checks-off',
  enabled: false,
  description: 'The check passes.',
  checkType: 'checks',
  decidedBy: 'agent',
  passRoute: { kind: 'next' },
  failRoute: { kind: 'stop' },
};

const diffSizeCondition: ConditionBlock = {
  kind: 'condition',
  id: 'diff-size',
  enabled: true,
  description: 'The check passes.',
  checkType: 'diff-size',
  threshold: 400,
  decidedBy: 'agent',
  passRoute: { kind: 'next' },
  failRoute: { kind: 'stop' },
  roundLimit: 1,
};

const connectionBlock: ChildBlock = {
  kind: 'connection',
  id: 'spec-to-plan',
  enabled: true,
  from: 'specify-agent',
  to: 'plan-agent',
  artifact: 'stories.md',
};

const endBlock: ChildBlock = { kind: 'end', id: 'end', enabled: true, outcome: 'done' };

const specifyFlow: Flow = {
  id: 'specify',
  name: 'Specify',
  description: 'Turns the feature into user stories.',
  enabled: true,
  blocks: [startBlock, agentBlock, approvalCondition, endBlock],
};

const buildFlow: Flow = {
  id: 'build',
  name: 'Build',
  description: 'Implements each planned task.',
  enabled: true,
  blocks: [startBlock, agentBlock, checksCondition, disabledChecksCondition, diffSizeCondition, connectionBlock, endBlock],
};

const pipelineBlocks: PipelineBlock[] = [
  { kind: 'start', id: 'pipeline-start', enabled: true, arguments: [{ name: 'feature', required: true, hint: 'F-XX id' }] },
  { kind: 'flow', ...specifyFlow },
  { kind: 'condition', id: 'between', enabled: true, description: 'The check passes.', checkType: 'approval', decidedBy: 'human', passRoute: { kind: 'next' }, failRoute: { kind: 'stop' }, onConnection: 'specify-to-build' },
  { kind: 'connection', id: 'specify-to-build', enabled: true, from: 'specify', to: 'build', artifact: 'plan.md' },
  { kind: 'flow', ...buildFlow },
  { kind: 'end', id: 'pipeline-end', enabled: true, outcome: 'done' },
];

const config: ProjectConfig = {
  schemaVersion: 2,
  name: 'Example',
  idea: 'A small example project',
  stack: { language: 'TypeScript' },
  pipeline: { name: 'Default', blocks: pipelineBlocks },
  rules: [],
};

describe('F-01 AC-001 the model typechecks a pipeline with child flows and blocks', () => {
  it('holds one pipeline with its child flows and the blocks of each flow', () => {
    const flows = config.pipeline.blocks.filter((block) => block.kind === 'flow');
    expect(config.schemaVersion).toBe(2);
    expect(flows.map((flow) => flow.id)).toEqual(['specify', 'build']);
    expect(flows.map((flow) => flow.blocks.length)).toEqual([4, 7]);
  });

  it('gives a child flow its own start, and the pipeline its own start with arguments', () => {
    const pipelineStart = config.pipeline.blocks[0];
    expect(pipelineStart?.kind).toBe('start');
    if (pipelineStart?.kind === 'start') {
      expect(pipelineStart.arguments).toEqual([{ name: 'feature', required: true, hint: 'F-XX id' }]);
    }
    expect(specifyFlow.blocks[0]?.kind).toBe('start');
  });
});

describe('F-01 AC-002 a Flow block is held by the pipeline only, one nesting level', () => {
  it('accepts a Flow block in the pipeline', () => {
    expect(pipelineBlocks.filter((block) => block.kind === 'flow')).toHaveLength(2);
  });

  it('refuses a Flow block inside a child flow', () => {
    // @ts-expect-error a child flow holds blocks only, no Flow block (one nesting level)
    const nestedFlow: ChildBlock = { kind: 'flow', id: 'x', enabled: true, name: 'x', blocks: [] };
    expect(nestedFlow).toBeDefined();
  });
});

describe('F-01 AC-003 the block kinds are Start, Agent, Condition, Connection, End and Flow', () => {
  it('has a fixture of each block kind', () => {
    const kinds = new Set<string>([
      ...buildFlow.blocks.map((block) => block.kind),
      ...pipelineBlocks.map((block) => block.kind),
    ]);
    expect([...kinds].sort()).toEqual(['agent', 'condition', 'connection', 'end', 'flow', 'start']);
  });

  it('refuses a block kind outside the six', () => {
    // @ts-expect-error a kind outside the six is not a block
    const unknownKind: ChildBlock = { kind: 'skill', id: 'x', enabled: true };
    expect(unknownKind).toBeDefined();
  });

  it('refuses a pipeline gate that does not name the connection it sits on', () => {
    // @ts-expect-error a gate between flows names its connection (building-blocks §1, §3)
    const gateWithoutConnection: PipelineBlock = { kind: 'condition', id: 'g', enabled: true, description: 'The check passes.', checkType: 'approval', decidedBy: 'human', passRoute: { kind: 'next' }, failRoute: { kind: 'stop' } };
    expect(gateWithoutConnection).toBeDefined();
  });
});

describe('F-01 AC-003 each condition type has a typed fixture', () => {
  it('has a fixture of each of the three check types, the disabled checks Condition included', () => {
    const types = [approvalCondition, checksCondition, disabledChecksCondition, diffSizeCondition].map(
      (condition) => condition.checkType,
    );
    expect(types).toEqual(['approval', 'checks', 'checks', 'diff-size']);
  });

  it('gives a threshold to diff-size only, and refuses one on any other check type', () => {
    if (diffSizeCondition.checkType === 'diff-size') {
      expect(diffSizeCondition.threshold).toBe(400);
    }
    // @ts-expect-error a threshold belongs to diff-size only
    const approvalWithThreshold: ConditionBlock = { ...approvalCondition, threshold: 400 };
    // @ts-expect-error diff-size needs a threshold
    const diffSizeWithout: ConditionBlock = { kind: 'condition', id: 'd', enabled: true, description: 'The check passes.', checkType: 'diff-size', decidedBy: 'agent', passRoute: { kind: 'next' }, failRoute: { kind: 'stop' } };
    expect(approvalWithThreshold).toBeDefined();
    expect(diffSizeWithout).toBeDefined();
  });

  it('refuses a check type outside the three, review included, and a decider outside human and agent', () => {
    // @ts-expect-error a check type outside the three is not a condition
    const unknownCheck: ConditionBlock = { ...approvalCondition, checkType: 'lint' };
    // @ts-expect-error review is no longer a check type (F-06 AC-011)
    const reviewCheck: ConditionBlock = { ...approvalCondition, checkType: 'review' };
    expect(reviewCheck).toBeDefined();
    // @ts-expect-error decidedBy is human or agent
    const unknownDecider: ConditionBlock = { ...approvalCondition, decidedBy: 'bot' };
    expect(unknownCheck).toBeDefined();
    expect(unknownDecider).toBeDefined();
  });
});

describe('F-01 AC-004 every block and flow has an enabled flag', () => {
  it('holds a boolean enabled flag on each block and flow fixture', () => {
    const everyBlock: Array<ChildBlock | PipelineBlock | Flow> = [
      ...buildFlow.blocks,
      ...specifyFlow.blocks,
      ...pipelineBlocks,
      specifyFlow,
      buildFlow,
    ];
    for (const item of everyBlock) {
      expect(typeof item.enabled).toBe('boolean');
    }
  });

  it('refuses a block or flow without enabled, or with a non-boolean value', () => {
    // @ts-expect-error enabled is required
    const missingEnabled: ChildBlock = { kind: 'end', id: 'end', outcome: 'done' };
    // @ts-expect-error enabled is a boolean, not a string
    const stringEnabled: Flow = { id: 'f', name: 'f', enabled: 'yes', blocks: [] };
    expect(missingEnabled).toBeDefined();
    expect(stringEnabled).toBeDefined();
  });
});

describe('F-01 AC-003 routes are next, stop, or back to a block id', () => {
  it('has a fixture of each route kind', () => {
    const routes: Route[] = [{ kind: 'next' }, { kind: 'stop' }, { kind: 'back', blockId: 'build-agent' }];
    expect(routes.map((route) => route.kind)).toEqual(['next', 'stop', 'back']);
  });

  it('refuses a back route without a block id', () => {
    // @ts-expect-error a back route names the block it returns to
    const backWithoutTarget: Route = { kind: 'back' };
    expect(backWithoutTarget).toBeDefined();
  });
});
