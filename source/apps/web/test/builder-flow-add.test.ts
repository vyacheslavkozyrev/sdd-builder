import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { addFlow, renameFlow, setFlowId } from '../src/builder/flow-edit.js';
import type { ConfigEdit } from '../src/builder/flow-edit.js';

type ProjectConfig = pipeline.ProjectConfig;
type PipelineBlock = pipeline.PipelineBlock;

/** Unwraps a successful edit; fails the test with the refusal message otherwise. */
function applied(result: ConfigEdit): ProjectConfig {
  if (!result.ok) {
    throw new Error(`expected the edit to apply, got refusal: ${result.message}`);
  }
  return result.config;
}

function refusedWith(result: ConfigEdit): string {
  if (result.ok) {
    throw new Error('expected the edit to be refused');
  }
  return result.message;
}

/** The ids of the flows of the pipeline, in order. */
function flowIds(config: ProjectConfig): string[] {
  return config.pipeline.blocks.flatMap((block) => (block.kind === 'flow' ? [block.id] : []));
}

/** Every id in the pipeline, as a list (blocks, flows and the blocks inside them). */
function allIds(config: ProjectConfig): string[] {
  return config.pipeline.blocks.flatMap((block) =>
    block.kind === 'flow' ? [block.id, ...block.blocks.map((child) => child.id)] : [block.id],
  );
}

/** A copy of the default configuration where the flow `flowId` has its child blocks replaced. */
function withFlowBlocks(flowId: string, childIds: string[]): ProjectConfig {
  const config = structuredClone(pipeline.defaultProjectConfig);
  const blocks: PipelineBlock[] = config.pipeline.blocks.map((block) => {
    if (block.kind !== 'flow' || block.id !== flowId) return block;
    return { ...block, blocks: block.blocks.map((child, index) => ({ ...child, id: childIds[index] ?? child.id })) };
  });
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}

const FILE_SAFE = /^[a-z][a-z0-9-]*$/;

describe('F-06 AC-006 the + adds a flow after the last tab', () => {
  it('F-06 AC-006 places the new flow after the last flow of the pipeline', () => {
    const before = pipeline.defaultProjectConfig;
    const { config, flowId } = addFlow(before);
    const ids = flowIds(config);
    expect(ids.slice(0, -1)).toEqual(flowIds(before));
    expect(ids[ids.length - 1]).toBe(flowId);
  });

  it('F-06 AC-006 the new flow has a file-safe id that no other id in the pipeline uses', () => {
    const before = pipeline.defaultProjectConfig;
    const { config, flowId } = addFlow(before);
    expect(flowId).toMatch(FILE_SAFE);
    expect(allIds(before).filter((id) => id === flowId)).toHaveLength(0);
    expect(allIds(config).filter((id) => id === flowId)).toHaveLength(1);
  });

  it('F-06 AC-006 the new flow holds one Start block and one End block, both enabled, and is enabled itself', () => {
    const { config, flowId } = addFlow(pipeline.defaultProjectConfig);
    const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === flowId);
    if (flow?.kind !== 'flow') throw new Error('the new flow is missing');
    expect(flow.enabled).toBe(true);
    expect(flow.blocks.map((child) => child.kind)).toEqual(['start', 'end']);
    expect(flow.blocks.every((child) => child.enabled)).toBe(true);
  });

  it('F-06 AC-006 the new flow has a default name', () => {
    const { config, flowId } = addFlow(pipeline.defaultProjectConfig);
    const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === flowId);
    expect(flow).toMatchObject({ kind: 'flow', name: 'New flow' });
  });

  it('F-06 AC-006 the user can change the default name of the new flow', () => {
    const { config, flowId } = addFlow(pipeline.defaultProjectConfig);
    const renamed = applied(renameFlow(config, flowId, '  Release  '));
    const flow = renamed.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === flowId);
    expect(flow).toMatchObject({ name: 'Release' });
  });

  it('F-06 AC-006 a blank name is refused and the flow keeps its name', () => {
    const { config, flowId } = addFlow(pipeline.defaultProjectConfig);
    expect(refusedWith(renameFlow(config, flowId, '   '))).toBe('A flow needs a name.');
  });

  it('F-06 AC-006 adding flows one after another gives each a new id', () => {
    const first = addFlow(pipeline.defaultProjectConfig);
    const second = addFlow(first.config);
    expect(second.flowId).not.toBe(first.flowId);
    expect(flowIds(second.config).slice(-2)).toEqual([first.flowId, second.flowId]);
  });

  it('F-06 AC-006 skips an id whose Start or End id is already taken', () => {
    const takenStart = withFlowBlocks('complete', ['complete-start', 'new-flow-end']);
    expect(addFlow(takenStart).flowId).toBe('new-flow-2');
    const takenEnd = withFlowBlocks('complete', ['new-flow-start', 'complete-end']);
    expect(addFlow(takenEnd).flowId).toBe('new-flow-2');
    expect(addFlow(pipeline.defaultProjectConfig).flowId).toBe('new-flow');
  });

  it('F-06 AC-006 skips an id that another flow already uses', () => {
    const renamed = applied(setFlowId(pipeline.defaultProjectConfig, 'complete', 'new-flow'));
    const { flowId } = addFlow(renamed);
    expect(flowId).toBe('new-flow-2');
  });

  it('F-06 AC-006 leaves the other flows, their blocks and the connections as they were', () => {
    const before = pipeline.defaultProjectConfig;
    const { config, flowId } = addFlow(before);
    const others = config.pipeline.blocks.filter((block) => !(block.kind === 'flow' && block.id === flowId));
    expect(others).toEqual(before.pipeline.blocks);
  });

  it('F-06 AC-006 does not change the configuration it was given', () => {
    const before = structuredClone(pipeline.defaultProjectConfig);
    addFlow(pipeline.defaultProjectConfig);
    expect(pipeline.defaultProjectConfig).toEqual(before);
  });
});

describe('F-06 AC-007 a flow id is file-safe and unique, or the flow keeps its id', () => {
  it('F-06 AC-007 accepts a free file-safe id and changes the flow', () => {
    const config = applied(setFlowId(pipeline.defaultProjectConfig, 'complete', 'finish'));
    expect(flowIds(config)).toContain('finish');
    expect(flowIds(config)).not.toContain('complete');
  });

  it('F-06 AC-007 writes an accepted id to the connections that run from or to the flow', () => {
    const config = applied(setFlowId(pipeline.defaultProjectConfig, 'ux', 'design'));
    const connections = config.pipeline.blocks.flatMap((block) => (block.kind === 'connection' ? [block] : []));
    expect(connections.filter((c) => c.from === 'design' || c.to === 'design').length).toBeGreaterThan(0);
    expect(connections.some((c) => c.from === 'ux' || c.to === 'ux')).toBe(false);
  });

  it('F-06 AC-007 an id that repeats a flow id is refused and names the id the flow keeps', () => {
    const message = refusedWith(setFlowId(pipeline.defaultProjectConfig, 'plan', 'ux'));
    expect(message).toBe('Flow id "ux" is already used in the pipeline. The flow keeps "plan".');
  });

  it('F-06 AC-007 an id that repeats a block id in the pipeline is refused', () => {
    expect(refusedWith(setFlowId(pipeline.defaultProjectConfig, 'plan', 'ux-start'))).toContain('already used');
    expect(refusedWith(setFlowId(pipeline.defaultProjectConfig, 'plan', 'pipeline-start'))).toContain('already used');
  });

  it('F-06 AC-007 an id that repeats the id of a disabled block is still refused', () => {
    const config = structuredClone(pipeline.defaultProjectConfig);
    const disabled: PipelineBlock[] = config.pipeline.blocks.map((block) =>
      block.kind === 'flow' && block.id === 'ux' ? { ...block, enabled: false } : block,
    );
    const withDisabled = { ...config, pipeline: { ...config.pipeline, blocks: disabled } };
    expect(refusedWith(setFlowId(withDisabled, 'plan', 'ux'))).toContain('already used');
  });

  it.each([
    ['an upper-case letter', 'Plan'],
    ['an underscore', 'my_flow'],
    ['a space', 'my flow'],
    ['a slash', 'a/b'],
    ['a dot path', '../escape'],
    ['a leading digit', '1flow'],
    ['a leading hyphen', '-flow'],
    ['an empty id', ''],
    ['a non-ASCII letter', 'flöw'],
  ])('F-06 AC-007 refuses an id with %s and the flow keeps its id', (_label, newId) => {
    const message = refusedWith(setFlowId(pipeline.defaultProjectConfig, 'plan', newId));
    expect(message).toContain('is refused');
    expect(message).toContain('The flow keeps "plan".');
  });

  it('F-06 AC-007 keeping the same id is accepted and changes nothing', () => {
    const before = pipeline.defaultProjectConfig;
    expect(applied(setFlowId(before, 'plan', 'plan'))).toEqual(before);
  });

  it('F-06 AC-007 a refused id leaves the configuration it was given as it was', () => {
    const before = structuredClone(pipeline.defaultProjectConfig);
    setFlowId(pipeline.defaultProjectConfig, 'plan', 'ux');
    expect(pipeline.defaultProjectConfig).toEqual(before);
  });

  it('F-06 AC-007 an unknown flow id is a programmer error and throws', () => {
    expect(() => setFlowId(pipeline.defaultProjectConfig, 'no-such-flow', 'fine')).toThrow('Unknown flow id');
    expect(() => renameFlow(pipeline.defaultProjectConfig, 'pipeline-start', 'x')).toThrow('Unknown flow id');
  });
});
