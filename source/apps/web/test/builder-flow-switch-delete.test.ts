import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { deleteFlow, deleteFlowQuestion, deletePipelineStart, setFlowEnabled } from '../src/builder/flow-edit.js';

type ProjectConfig = pipeline.ProjectConfig;
type PipelineBlock = pipeline.PipelineBlock;

/** The pipeline blocks of a configuration, by id. */
function blockIds(config: ProjectConfig): string[] {
  return config.pipeline.blocks.map((block) => block.id);
}

/** The flow with the given id, or a failing assertion when it is missing. */
function flowOf(config: ProjectConfig, flowId: string): pipeline.FlowBlock {
  const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === flowId);
  if (flow?.kind !== 'flow') throw new Error(`the flow ${flowId} is missing`);
  return flow;
}

/** A copy of the default configuration where the pipeline gate `gateId` has its fail route replaced. */
function withFailRoute(gateId: string, route: pipeline.Route): ProjectConfig {
  const config = structuredClone(pipeline.defaultProjectConfig);
  const blocks: PipelineBlock[] = config.pipeline.blocks.map((block) =>
    block.kind === 'condition' && block.id === gateId ? { ...block, failRoute: route } : block,
  );
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}

describe('F-06 AC-032 switching a flow off and on', () => {
  it('F-06 AC-032 switching a flow off sets it to disabled and keeps its blocks and properties', () => {
    const before = pipeline.defaultProjectConfig;
    const after = setFlowEnabled(before, 'ux', false);
    const flow = flowOf(after, 'ux');
    expect(flow.enabled).toBe(false);
    expect(flow).toEqual({ ...flowOf(before, 'ux'), enabled: false });
  });

  it('F-06 AC-032 the flow stays in its place in the pipeline when switched off', () => {
    const before = pipeline.defaultProjectConfig;
    const after = setFlowEnabled(before, 'ux', false);
    expect(blockIds(after)).toEqual(blockIds(before));
  });

  it('F-06 AC-032 switching the flow on again restores it to the state before it was switched off', () => {
    const before = pipeline.defaultProjectConfig;
    const restored = setFlowEnabled(setFlowEnabled(before, 'ux', false), 'ux', true);
    expect(restored).toEqual(before);
  });

  it('F-06 AC-032 switching a flow on that is already on changes nothing', () => {
    const before = pipeline.defaultProjectConfig;
    expect(setFlowEnabled(before, 'ux', true)).toEqual(before);
  });

  it('F-06 AC-032 does not change the other flows when one is switched off', () => {
    const before = pipeline.defaultProjectConfig;
    const after = setFlowEnabled(before, 'ux', false);
    for (const flowId of ['specify', 'plan', 'build', 'verify', 'complete']) {
      expect(flowOf(after, flowId)).toEqual(flowOf(before, flowId));
    }
  });

  it('F-06 AC-032 switching off an unknown flow is a programmer error and throws', () => {
    expect(() => setFlowEnabled(pipeline.defaultProjectConfig, 'no-such-flow', false)).toThrow(
      'Unknown flow id: no-such-flow',
    );
  });
});

describe('F-06 AC-034 deleting a flow asks for confirmation and removes its connections and gates', () => {
  it('F-06 AC-034 the confirmation question names the flow and says what happens to its routes', () => {
    const question = deleteFlowQuestion(pipeline.defaultProjectConfig, 'ux');
    expect(question).toContain('"UX"');
    expect(question).toContain('connections and gates');
    expect(question).toContain('left unwired');
  });

  it('F-06 AC-034 the confirmation question for an unknown flow is a programmer error and throws', () => {
    expect(() => deleteFlowQuestion(pipeline.defaultProjectConfig, 'no-such-flow')).toThrow(
      'Unknown flow id: no-such-flow',
    );
  });

  it('F-06 AC-034 deleting a flow removes it from the pipeline', () => {
    const after = deleteFlow(pipeline.defaultProjectConfig, 'ux');
    expect(blockIds(after)).not.toContain('ux');
    expect(after.pipeline.blocks.some((block) => block.kind === 'flow' && block.id === 'ux')).toBe(false);
  });

  it('F-06 AC-034 deleting a flow removes the connections that run from or to it', () => {
    const after = deleteFlow(pipeline.defaultProjectConfig, 'ux');
    const connections = after.pipeline.blocks.flatMap((block) => (block.kind === 'connection' ? [block.id] : []));
    expect(connections).not.toContain('specify-to-ux');
    expect(connections).not.toContain('ux-to-plan');
    expect(connections).toContain('plan-to-build');
  });

  it('F-06 AC-034 deleting a flow removes the gates that sit on its connections and keeps the others', () => {
    const after = deleteFlow(pipeline.defaultProjectConfig, 'ux');
    const gates = after.pipeline.blocks.flatMap((block) => (block.kind === 'condition' ? [block.id] : []));
    expect(gates).not.toContain('approve-stories');
    expect(gates).not.toContain('approve-screens');
    expect(gates).toContain('approve-plan');
  });

  it('F-06 AC-034 deleting a flow leaves the flow blocks it held out of the pipeline and keeps the other flows', () => {
    const before = pipeline.defaultProjectConfig;
    const after = deleteFlow(before, 'ux');
    expect(after.pipeline.blocks.every((block) => block.kind !== 'flow' || block.id !== 'ux')).toBe(true);
    expect(after.pipeline.blocks.filter((block) => block.kind === 'flow').map((block) => block.id)).toEqual([
      'specify',
      'plan',
      'build',
      'verify',
      'complete',
    ]);
    expect(flowOf(after, 'plan')).toEqual(flowOf(before, 'plan'));
  });

  it('F-06 AC-034 a route that pointed to the deleted flow stays and is marked by the structural analysis', () => {
    const config = withFailRoute('approve-plan', { kind: 'back', blockId: 'ux' });
    const after = deleteFlow(config, 'ux');
    const gate = after.pipeline.blocks.find((block) => block.kind === 'condition' && block.id === 'approve-plan');
    expect(gate).toMatchObject({ failRoute: { kind: 'back', blockId: 'ux' } });
    const marked = pipeline.analyzeStructure(after).filter((finding) => finding.severity === 'blocker');
    expect(marked).toContainEqual({
      severity: 'blocker',
      subject: 'pipeline.blocks[4]',
      message: 'back route to "ux" is not a flow of the pipeline',
    });
  });

  it('F-06 AC-034 the gates that sat on a deleted flow connections are reported as missing by the structural analysis', () => {
    const after = deleteFlow(pipeline.defaultProjectConfig, 'ux');
    const marked = pipeline.analyzeStructure(after).filter((finding) => finding.severity === 'blocker');
    expect(marked.map((finding) => finding.message).sort()).toEqual([
      'required gate "approve-screens" is missing',
      'required gate "approve-stories" is missing',
    ]);
  });

  it('F-06 AC-034 deleting a flow does not change the configuration it is given', () => {
    const before = structuredClone(pipeline.defaultProjectConfig);
    const snapshot = structuredClone(before);
    deleteFlow(before, 'ux');
    expect(before).toEqual(snapshot);
  });

  it('F-06 AC-034 deleting an unknown flow is a programmer error and throws', () => {
    expect(() => deleteFlow(pipeline.defaultProjectConfig, 'no-such-flow')).toThrow('Unknown flow id: no-such-flow');
  });
});

describe('F-06 AC-035 the pipeline Start cannot be deleted', () => {
  it('F-06 AC-035 refuses to delete the pipeline Start with a message that names the pipeline', () => {
    const config = pipeline.defaultProjectConfig;
    const result = deletePipelineStart(config);
    expect(result).toEqual({
      ok: false,
      message: `The Start of the pipeline "${config.pipeline.name}" cannot be deleted.`,
    });
  });

  it('F-06 AC-035 a refused delete of the pipeline Start leaves the configuration as it was', () => {
    const config = structuredClone(pipeline.defaultProjectConfig);
    const snapshot = structuredClone(config);
    deletePipelineStart(config);
    expect(config).toEqual(snapshot);
    expect(blockIds(config)).toContain('pipeline-start');
  });

  it('F-06 AC-035 a pipeline with no Start is a programmer error and throws', () => {
    const config = structuredClone(pipeline.defaultProjectConfig);
    const blocks = config.pipeline.blocks.filter((block) => block.kind !== 'start');
    expect(() => deletePipelineStart({ ...config, pipeline: { ...config.pipeline, blocks } })).toThrow(
      'The pipeline has no Start block',
    );
  });
});
