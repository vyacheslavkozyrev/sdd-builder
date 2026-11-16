import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { deleteBlock, deleteBlockQuestion, setBlockEnabled } from '../src/builder/block-edit.js';
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

/**
 * A configuration whose flow `build` holds the blocks below: its Start, the agents `a` and `b`, a Condition `c` whose
 * fail route goes back to `a`, and the End. The connections run start to a, a to b and b to the End. The other flows
 * are the default ones.
 */
function withBuildFlow(): ProjectConfig {
  const config = structuredClone(pipeline.defaultProjectConfig);
  const blocks: ChildBlock[] = [
    { kind: 'start', id: 'build-start', enabled: true },
    { kind: 'agent', id: 'a', enabled: true, name: 'alpha', scope: 'project', description: 'the alpha agent.' },
    {
      kind: 'condition',
      id: 'c',
      enabled: true,
      checkType: 'checks',
      decidedBy: 'agent',
      description: 'the checks pass.',
      passRoute: { kind: 'next' },
      failRoute: { kind: 'back', blockId: 'a' },
      roundLimit: 2,
    },
    { kind: 'agent', id: 'b', enabled: true, name: 'beta', scope: 'project', description: 'the beta agent.' },
    { kind: 'connection', id: 'start-to-a', enabled: true, from: 'build-start', to: 'a', artifact: 'brief' },
    { kind: 'connection', id: 'a-to-b', enabled: true, from: 'a', to: 'b', artifact: 'draft' },
    { kind: 'connection', id: 'b-to-end', enabled: true, from: 'b', to: 'build-end', artifact: 'work' },
    { kind: 'end', id: 'build-end', enabled: true, outcome: 'done' },
  ];
  const pipelineBlocks = config.pipeline.blocks.map((block) =>
    block.kind === 'flow' && block.id === 'build' ? { ...block, blocks } : block,
  );
  return { ...config, pipeline: { ...config.pipeline, blocks: pipelineBlocks } };
}

/** The blocks of the flow `build`, in order. */
function buildBlocks(config: ProjectConfig): ChildBlock[] {
  const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === 'build');
  if (flow?.kind !== 'flow') throw new Error('the flow build is missing');
  return flow.blocks;
}

/** The ids of the blocks of the flow `build`, in order. */
function buildIds(config: ProjectConfig): string[] {
  return buildBlocks(config).map((block) => block.id);
}

describe('F-06 AC-032 switching a block off and on', () => {
  it('F-06 AC-032 switching a block off sets it to disabled and keeps its properties', () => {
    const before = withBuildFlow();
    const after = setBlockEnabled(before, 'build', 'b', false);
    const block = buildBlocks(after).find((item) => item.id === 'b');
    expect(block).toEqual({ ...buildBlocks(before).find((item) => item.id === 'b'), enabled: false });
  });

  it('F-06 AC-032 a block switched off stays in its place in the flow', () => {
    const before = withBuildFlow();
    const after = setBlockEnabled(before, 'build', 'a', false);
    expect(buildIds(after)).toEqual(buildIds(before));
  });

  it('F-06 AC-032 switching the block on again restores it to the state before it was switched off', () => {
    const before = withBuildFlow();
    const restored = setBlockEnabled(setBlockEnabled(before, 'build', 'c', false), 'build', 'c', true);
    expect(restored).toEqual(before);
  });

  it('F-06 AC-032 switching a Condition off keeps its routes and round limit', () => {
    const after = setBlockEnabled(withBuildFlow(), 'build', 'c', false);
    const condition = buildBlocks(after).find((item) => item.id === 'c');
    expect(condition).toMatchObject({
      enabled: false,
      failRoute: { kind: 'back', blockId: 'a' },
      roundLimit: 2,
    });
  });

  it('F-06 AC-032 switching a block off does not change the other blocks or flows', () => {
    const before = withBuildFlow();
    const after = setBlockEnabled(before, 'build', 'b', false);
    for (const id of ['build-start', 'a', 'c', 'start-to-a', 'a-to-b', 'b-to-end', 'build-end']) {
      expect(buildBlocks(after).find((item) => item.id === id)).toEqual(
        buildBlocks(before).find((item) => item.id === id),
      );
    }
    expect(after.pipeline.blocks.filter((block) => block.kind === 'flow' && block.id !== 'build')).toEqual(
      before.pipeline.blocks.filter((block) => block.kind === 'flow' && block.id !== 'build'),
    );
  });

  it('F-06 AC-032 switching an unknown block is a programmer error and throws', () => {
    expect(() => setBlockEnabled(withBuildFlow(), 'build', 'no-such-block', false)).toThrow(
      'Unknown block id no-such-block in flow build',
    );
  });

  it('F-06 AC-032 switching a block in an unknown flow is a programmer error and throws', () => {
    expect(() => setBlockEnabled(withBuildFlow(), 'no-such-flow', 'a', false)).toThrow(
      'Unknown flow id: no-such-flow',
    );
  });
});

describe('F-06 AC-034 deleting a block asks for confirmation and removes its connections', () => {
  it('F-06 AC-034 the confirmation question names the agent and says what happens to its routes', () => {
    const question = deleteBlockQuestion(withBuildFlow(), 'build', 'b');
    expect(question).toContain('Delete beta?');
    expect(question).toContain('Its connections are removed.');
    expect(question).toContain('left unwired');
  });

  it('F-06 AC-034 the confirmation question names a Condition by its id', () => {
    expect(deleteBlockQuestion(withBuildFlow(), 'build', 'c')).toContain('Delete c?');
  });

  it('F-06 AC-034 the confirmation question for an unknown block is a programmer error and throws', () => {
    expect(() => deleteBlockQuestion(withBuildFlow(), 'build', 'no-such-block')).toThrow(
      'Unknown block id no-such-block in flow build',
    );
  });

  it('F-06 AC-034 deleting a block removes it from its flow and keeps the order of the others', () => {
    const after = applied(deleteBlock(withBuildFlow(), 'build', 'b'));
    expect(after.id).toBe('b');
    expect(buildIds(after.config)).toEqual(['build-start', 'a', 'c', 'start-to-a', 'build-end']);
  });

  it('F-06 AC-034 deleting a block removes the connections that run from or to it and keeps the others', () => {
    const after = applied(deleteBlock(withBuildFlow(), 'build', 'b')).config;
    const connections = buildBlocks(after).flatMap((block) => (block.kind === 'connection' ? [block.id] : []));
    expect(connections).toEqual(['start-to-a']);
  });

  it('F-06 AC-034 a route that pointed to the deleted block is left unwired and keeps its target', () => {
    const after = applied(deleteBlock(withBuildFlow(), 'build', 'a')).config;
    const condition = buildBlocks(after).find((block) => block.id === 'c');
    expect(condition).toMatchObject({ failRoute: { kind: 'back', blockId: 'a' } });
  });

  it('F-06 AC-034 deleting a block leaves the other flows as they were', () => {
    const before = withBuildFlow();
    const after = applied(deleteBlock(before, 'build', 'b')).config;
    expect(after.pipeline.blocks.filter((block) => block.kind === 'flow' && block.id !== 'build')).toEqual(
      before.pipeline.blocks.filter((block) => block.kind === 'flow' && block.id !== 'build'),
    );
  });

  it('F-06 AC-034 deleting a block does not change the configuration it is given', () => {
    const before = withBuildFlow();
    const snapshot = structuredClone(before);
    deleteBlock(before, 'build', 'b');
    expect(before).toEqual(snapshot);
  });

  it('F-06 AC-034 deleting an unknown block is a programmer error and throws', () => {
    expect(() => deleteBlock(withBuildFlow(), 'build', 'no-such-block')).toThrow(
      'Unknown block id no-such-block in flow build',
    );
  });
});

describe('F-06 AC-035 the Start of a flow cannot be deleted', () => {
  it('F-06 AC-035 refuses to delete the Start of a flow with a message that names the flow', () => {
    const config = withBuildFlow();
    expect(refusal(deleteBlock(config, 'build', 'build-start'))).toBe(
      'Refused: the Start block of Build cannot be deleted. A flow has one Start.',
    );
  });

  it('F-06 AC-035 a refused delete of a flow Start leaves the configuration as it was', () => {
    const config = withBuildFlow();
    const snapshot = structuredClone(config);
    deleteBlock(config, 'build', 'build-start');
    expect(config).toEqual(snapshot);
    expect(buildIds(config)).toContain('build-start');
  });
});
