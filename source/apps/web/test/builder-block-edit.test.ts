import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import {
  addBlock,
  addFlowConnection,
  backRouteTargets,
  moveBlock,
  setConditionRoutes,
} from '../src/builder/block-edit.js';
import type { BlockEdit } from '../src/builder/block-edit.js';

type ProjectConfig = pipeline.ProjectConfig;
type ChildBlock = pipeline.ChildBlock;

/** Unwraps a successful edit; fails the test with the refusal message otherwise. */
function applied(result: BlockEdit): Extract<BlockEdit, { ok: true }> {
  if (!result.ok) {
    throw new Error(`expected the edit to apply, got refusal: ${result.message}`);
  }
  return result;
}

/** The refusal message of an edit that must be refused; fails the test when it applies. */
function refusal(result: BlockEdit): string {
  if (result.ok) {
    throw new Error('expected the edit to be refused, but it applied');
  }
  return result.message;
}

/** A configuration whose flow `build` holds exactly the given blocks; the other flows are the default ones. */
function withBuildBlocks(blocks: ChildBlock[]): ProjectConfig {
  const config = structuredClone(pipeline.defaultProjectConfig);
  const pipelineBlocks = config.pipeline.blocks.map((block) =>
    block.kind === 'flow' && block.id === 'build' ? { ...block, blocks } : block,
  );
  return { ...config, pipeline: { ...config.pipeline, blocks: pipelineBlocks } };
}

/** The blocks of the flow `build`, by id, in order. */
function buildIds(config: ProjectConfig): string[] {
  const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === 'build');
  if (flow?.kind !== 'flow') throw new Error('the flow build is missing');
  return flow.blocks.map((block) => block.id);
}

/** The blocks of the flow `build`, as they are. */
function buildBlocks(config: ProjectConfig): ChildBlock[] {
  const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === 'build');
  if (flow?.kind !== 'flow') throw new Error('the flow build is missing');
  return flow.blocks;
}

const START: ChildBlock = { kind: 'start', id: 'build-start', enabled: true };
const AGENT_A: ChildBlock = {
  kind: 'agent',
  id: 'build-a',
  enabled: true,
  name: 'build-a',
  scope: 'task',
  description: 'does a',
};
const AGENT_B: ChildBlock = {
  kind: 'agent',
  id: 'build-b',
  enabled: true,
  name: 'build-b',
  scope: 'task',
  description: 'does b',
};
const CHECK: ChildBlock = {
  kind: 'condition',
  id: 'build-check',
  enabled: true,
  checkType: 'checks',
  decidedBy: 'agent',
  description: 'the checks pass.',
  passRoute: { kind: 'next' },
  failRoute: { kind: 'stop' },
};
const END: ChildBlock = { kind: 'end', id: 'build-end', enabled: true, outcome: 'done' };

describe('F-06 AC-017 blocks of a flow in order', () => {
  it('F-06 AC-017 a new Agent block lands before the End when no block is selected', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    const edit = applied(addBlock(config, 'build', 'agent', null));
    expect(buildIds(edit.config)).toEqual(['build-start', 'build-a', 'build-agent', 'build-end']);
  });

  it('F-06 AC-017 the Start stays first and the End stays last after a block is added', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    for (const kind of ['agent', 'condition'] as const) {
      const ids = buildIds(applied(addBlock(config, 'build', kind, 'build-start')).config);
      expect(ids[0]).toBe('build-start');
      expect(ids[ids.length - 1]).toBe('build-end');
    }
  });

  it('F-06 AC-017 a new End is placed last in the flow', () => {
    const config = withBuildBlocks([START, AGENT_A, AGENT_B]);
    const edit = applied(addBlock(config, 'build', 'end', 'build-a'));
    expect(buildIds(edit.config)).toEqual(['build-start', 'build-a', 'build-b', 'build-end']);
  });

  it('F-06 AC-017 a block added after the selected End goes before the End blocks', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    const edit = applied(addBlock(config, 'build', 'agent', 'build-end'));
    expect(buildIds(edit.config)).toEqual(['build-start', 'build-a', 'build-agent', 'build-end']);
  });

  it('F-06 AC-017 a block with an unknown selected id is a programmer error and throws', () => {
    const config = withBuildBlocks([START, END]);
    expect(() => addBlock(config, 'build', 'agent', 'no-such-block')).toThrow(/Unknown block id/);
  });

  it('F-06 AC-017 an unknown flow id is a programmer error and throws', () => {
    expect(() => addBlock(pipeline.defaultProjectConfig, 'no-such-flow', 'agent', null)).toThrow(/Unknown flow id/);
  });
});

describe('F-06 AC-018 the toolbox and a second Start', () => {
  it('F-06 AC-018 a second Start in a flow is refused and the flow is unchanged', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    const message = refusal(addBlock(config, 'build', 'start', null));
    expect(message).toMatch(/one Start/);
    expect(buildBlocks(config)).toEqual([START, AGENT_A, END]);
  });

  it('F-06 AC-018 a Start is accepted in a flow that has none, and goes first', () => {
    const config = withBuildBlocks([AGENT_A, END]);
    const edit = applied(addBlock(config, 'build', 'start', 'build-a'));
    expect(buildIds(edit.config)).toEqual(['build-start', 'build-a', 'build-end']);
  });

  it('F-06 AC-018 an added block gets an id that no other pipeline block uses', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    const first = applied(addBlock(config, 'build', 'agent', null));
    const second = applied(addBlock(first.config, 'build', 'agent', null));
    expect(first.id).toBe('build-agent');
    expect(second.id).toBe('build-agent-2');
    expect(new Set(buildIds(second.config)).size).toBe(buildIds(second.config).length);
  });
});

describe('F-06 AC-019 moving a block', () => {
  it('F-06 AC-019 moving a block down swaps it with the next one and keeps the others in order', () => {
    const config = withBuildBlocks([START, AGENT_A, AGENT_B, CHECK, END]);
    const edit = applied(moveBlock(config, 'build', 'build-a', 'down'));
    expect(buildIds(edit.config)).toEqual(['build-start', 'build-b', 'build-a', 'build-check', 'build-end']);
  });

  it('F-06 AC-019 moving a block up swaps it with the one before and keeps the others in order', () => {
    const config = withBuildBlocks([START, AGENT_A, AGENT_B, CHECK, END]);
    const edit = applied(moveBlock(config, 'build', 'build-check', 'up'));
    expect(buildIds(edit.config)).toEqual(['build-start', 'build-a', 'build-check', 'build-b', 'build-end']);
  });

  it('F-06 AC-019 moving the Start is refused and the flow is unchanged', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    const message = refusal(moveBlock(config, 'build', 'build-start', 'down'));
    expect(message).toMatch(/Start stays first/);
    expect(buildIds(config)).toEqual(['build-start', 'build-a', 'build-end']);
  });

  it('F-06 AC-019 moving a block above the Start is refused', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    expect(refusal(moveBlock(config, 'build', 'build-a', 'up'))).toMatch(/Start stays first/);
  });

  it('F-06 AC-019 moving the last block of the flow down is refused at the bottom', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    expect(refusal(moveBlock(config, 'build', 'build-end', 'down'))).toMatch(/bottom/);
  });

  it('F-06 AC-019 moving a block past an End block is refused so the End stays last', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    expect(refusal(moveBlock(config, 'build', 'build-a', 'down'))).toMatch(/End blocks stay last/);
    expect(buildIds(config)).toEqual(['build-start', 'build-a', 'build-end']);
  });

  it('F-06 AC-021 moving a block so a back route points to a later block is refused', () => {
    const config = withBuildBlocks([START, AGENT_A, { ...CHECK, failRoute: { kind: 'back', blockId: 'build-a' } }, END]);
    expect(refusal(moveBlock(config, 'build', 'build-a', 'down'))).toMatch(/back route/);
    expect(buildIds(config)).toEqual(['build-start', 'build-a', 'build-check', 'build-end']);
  });

  it('F-06 AC-021 moving a Condition whose back route still points to an earlier block is allowed', () => {
    const config = withBuildBlocks([START, AGENT_A, AGENT_B, { ...CHECK, failRoute: { kind: 'back', blockId: 'build-a' } }, END]);
    const edit = applied(moveBlock(config, 'build', 'build-check', 'up'));
    expect(buildIds(edit.config)).toEqual(['build-start', 'build-a', 'build-check', 'build-b', 'build-end']);
  });

  it('F-06 AC-019 moving the first block up is refused at the top', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    expect(refusal(moveBlock(config, 'build', 'build-start', 'up'))).toMatch(/top/);
  });

  it('F-06 AC-019 moving a block with an unknown id is a programmer error and throws', () => {
    const config = withBuildBlocks([START, END]);
    expect(() => moveBlock(config, 'build', 'no-such-block', 'up')).toThrow(/Unknown block id/);
  });
});

describe('F-06 AC-020 a Connection inside a flow', () => {
  it('F-06 AC-020 a Connection joins two blocks of the same flow and keeps the artifact label', () => {
    const config = withBuildBlocks([START, AGENT_A, AGENT_B, END]);
    const edit = applied(addFlowConnection(config, 'build', 'build-a', 'build-b', '  the task list  '));
    const connection = buildBlocks(edit.config).find((block) => block.kind === 'connection');
    expect(connection).toEqual({
      kind: 'connection',
      id: 'build-a-to-build-b',
      enabled: true,
      from: 'build-a',
      to: 'build-b',
      artifact: 'the task list',
    });
  });

  it('F-06 AC-020 a Connection to a block in another flow is refused and the flow is unchanged', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    expect(refusal(addFlowConnection(config, 'build', 'build-a', 'ux-start', 'x'))).toMatch(/one flow/);
    expect(buildBlocks(config)).toEqual([START, AGENT_A, END]);
  });

  it('F-06 AC-020 a Connection with an unknown block id is a programmer error and throws', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    expect(() => addFlowConnection(config, 'build', 'build-a', 'no-such-block', 'x')).toThrow(/Unknown block id/);
  });

  it('F-06 AC-020 a Connection with an empty artifact label is refused', () => {
    const config = withBuildBlocks([START, AGENT_A, AGENT_B, END]);
    expect(refusal(addFlowConnection(config, 'build', 'build-a', 'build-b', '   '))).toMatch(/artifact label/);
  });

  it('F-06 AC-020 a Connection from a block to itself is refused', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    expect(refusal(addFlowConnection(config, 'build', 'build-a', 'build-a', 'x'))).toMatch(/two different blocks/);
  });

  it('F-06 AC-020 a repeated Connection gets an id no other block uses', () => {
    const config = withBuildBlocks([START, AGENT_A, AGENT_B, END]);
    const first = applied(addFlowConnection(config, 'build', 'build-a', 'build-b', 'x'));
    const second = applied(addFlowConnection(first.config, 'build', 'build-a', 'build-b', 'y'));
    expect(second.id).toBe('build-a-to-build-b-2');
  });

  it('F-06 AC-020 a Connection is placed before the End blocks', () => {
    const config = withBuildBlocks([START, AGENT_A, AGENT_B, END]);
    const edit = applied(addFlowConnection(config, 'build', 'build-start', 'build-a', 'x'));
    expect(buildIds(edit.config).at(-1)).toBe('build-end');
  });
});

describe('F-06 AC-021 a Condition inside a flow', () => {
  it('F-06 AC-021 a Condition routes to the next block, stop, or a back route to an earlier block of the same flow', () => {
    const config = withBuildBlocks([START, AGENT_A, CHECK, END]);
    const edit = applied(
      setConditionRoutes(config, 'build', 'build-check', {
        pass: { kind: 'next' },
        fail: { kind: 'back', blockId: 'build-a' },
        roundLimit: 3,
      }),
    );
    expect(buildBlocks(edit.config)[2]).toEqual({
      ...CHECK,
      failRoute: { kind: 'back', blockId: 'build-a' },
      roundLimit: 3,
    });
  });

  it('F-06 AC-021 the back route offers only the earlier blocks of the same flow', () => {
    const config = withBuildBlocks([START, AGENT_A, CHECK, AGENT_B, END]);
    expect(backRouteTargets(config, 'build', 'build-check')).toEqual(['build-start', 'build-a']);
  });

  it('F-06 AC-021 a back route to a block after the Condition is refused', () => {
    const config = withBuildBlocks([START, AGENT_A, CHECK, AGENT_B, END]);
    const message = refusal(
      setConditionRoutes(config, 'build', 'build-check', {
        pass: { kind: 'next' },
        fail: { kind: 'back', blockId: 'build-b' },
        roundLimit: undefined,
      }),
    );
    expect(message).toMatch(/earlier block/);
    expect(buildBlocks(config)[2]).toEqual(CHECK);
  });

  it('F-06 AC-021 a back route to the Condition itself is refused as not earlier', () => {
    const config = withBuildBlocks([START, CHECK, END]);
    expect(
      refusal(
        setConditionRoutes(config, 'build', 'build-check', {
          pass: { kind: 'back', blockId: 'build-check' },
          fail: { kind: 'stop' },
          roundLimit: undefined,
        }),
      ),
    ).toMatch(/earlier block/);
  });

  it('F-06 AC-021 a back route to a block of another flow is refused', () => {
    const config = withBuildBlocks([START, AGENT_A, CHECK, END]);
    expect(
      refusal(
        setConditionRoutes(config, 'build', 'build-check', {
          pass: { kind: 'next' },
          fail: { kind: 'back', blockId: 'ux-start' },
          roundLimit: undefined,
        }),
      ),
    ).toMatch(/earlier block/);
  });

  it('F-06 AC-021 a round limit that is not a positive whole number is refused', () => {
    const config = withBuildBlocks([START, AGENT_A, CHECK, END]);
    for (const roundLimit of [0, -1, 1.5, Number.NaN]) {
      expect(
        refusal(
          setConditionRoutes(config, 'build', 'build-check', {
            pass: { kind: 'next' },
            fail: { kind: 'back', blockId: 'build-a' },
            roundLimit,
          }),
        ),
      ).toMatch(/round limit/);
    }
  });

  it('F-06 AC-021 a round limit is dropped when no route goes back', () => {
    const config = withBuildBlocks([START, AGENT_A, CHECK, END]);
    const edit = applied(
      setConditionRoutes(config, 'build', 'build-check', { pass: { kind: 'next' }, fail: { kind: 'stop' }, roundLimit: 4 }),
    );
    expect(buildBlocks(edit.config)[2]).toEqual(CHECK);
    expect(buildBlocks(edit.config)[2]).not.toHaveProperty('roundLimit');
  });

  it('F-06 AC-021 setting a Condition with no round limit leaves it unset', () => {
    const config = withBuildBlocks([START, AGENT_A, CHECK, END]);
    const edit = applied(
      setConditionRoutes(config, 'build', 'build-check', {
        pass: { kind: 'next' },
        fail: { kind: 'back', blockId: 'build-a' },
        roundLimit: undefined,
      }),
    );
    expect(buildBlocks(edit.config)[2]).not.toHaveProperty('roundLimit');
  });

  it('F-06 AC-021 setting routes on a block that is not a Condition is a programmer error and throws', () => {
    const config = withBuildBlocks([START, AGENT_A, END]);
    expect(() =>
      setConditionRoutes(config, 'build', 'build-a', { pass: { kind: 'next' }, fail: { kind: 'stop' }, roundLimit: undefined }),
    ).toThrow(/not a Condition/);
  });
});
