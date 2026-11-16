import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { addBlock, addFlowConnection, deleteBlock, setBlockEnabled, setConditionRoutes } from '../src/builder/block-edit.js';
import { addFlow, deleteFlow, renameFlow, setFlowEnabled } from '../src/builder/flow-edit.js';
import { itemPath, marksAt, structuralMarks, unplacedMarks } from '../src/builder/marks.js';
import type { StructuralMark } from '../src/builder/marks.js';
import { addConnection } from '../src/builder/map-edit.js';
import { createBuilderState } from '../src/builder/state.js';

type ProjectConfig = pipeline.ProjectConfig;
type FlowBlock = pipeline.FlowBlock;
type ConditionBlock = pipeline.ConditionBlock;
type ConnectionBlock = pipeline.ConnectionBlock;

/** Unwraps a successful edit; fails the test with the refusal message otherwise. */
function applied<E extends { ok: true } | { ok: false; message: string }>(result: E): Extract<E, { ok: true }> {
  if (!result.ok) {
    throw new Error(`expected the edit to apply, got refusal: ${(result as { message: string }).message}`);
  }
  return result as Extract<E, { ok: true }>;
}

/** A deep copy of the default pipeline, so the shared default is never changed. */
function copyDefault(): ProjectConfig {
  return structuredClone(pipeline.defaultProjectConfig);
}

/** The index of a pipeline-level block, by id. */
function topIndex(config: ProjectConfig, id: string): number {
  const index = config.pipeline.blocks.findIndex((block) => block.id === id);
  if (index === -1) throw new Error(`no pipeline block "${id}"`);
  return index;
}

/** The flow with the given id, or a failure when the id names no flow. */
function flowNamed(config: ProjectConfig, flowId: string): FlowBlock {
  const block = config.pipeline.blocks[topIndex(config, flowId)];
  if (block?.kind !== 'flow') throw new Error(`"${flowId}" is not a flow`);
  return block;
}

/** The index of a block inside a flow, by id. */
function childIndex(config: ProjectConfig, flowId: string, blockId: string): number {
  const index = flowNamed(config, flowId).blocks.findIndex((block) => block.id === blockId);
  if (index === -1) throw new Error(`no block "${blockId}" in "${flowId}"`);
  return index;
}

/** The path of a block inside a flow, by ids. */
function childPathOf(config: ProjectConfig, flowId: string, blockId: string): string {
  return itemPath(topIndex(config, flowId), childIndex(config, flowId, blockId));
}

/** A copy of the config with one flow replaced by `change`. */
function editFlow(config: ProjectConfig, flowId: string, change: (flow: FlowBlock) => FlowBlock): ProjectConfig {
  const next = structuredClone(config);
  next.pipeline.blocks[topIndex(next, flowId)] = change(flowNamed(next, flowId));
  return next;
}

/** A copy of the config with one pipeline-level Connection replaced by `change`. */
function editConnection(config: ProjectConfig, id: string, change: (block: ConnectionBlock) => ConnectionBlock): ProjectConfig {
  const next = structuredClone(config);
  const index = topIndex(next, id);
  const block = next.pipeline.blocks[index];
  if (block?.kind !== 'connection') throw new Error(`"${id}" is not a connection`);
  next.pipeline.blocks[index] = change(block);
  return next;
}

/** A Condition with its round limit taken away. */
function withoutRoundLimit<B extends ConditionBlock>(condition: B): B {
  const copy: Partial<B> = { ...condition };
  delete copy.roundLimit;
  return copy as B;
}

/** The marks of one item, by its path. */
function marksOn(config: ProjectConfig, path: string): StructuralMark[] {
  return marksAt(structuralMarks(config), path);
}

/** Whether the F-01 parser accepts the configuration. It is given a copy, so it cannot change the state under test. */
function parserAccepts(config: ProjectConfig): boolean {
  return pipeline.parsePipelineConfig(structuredClone(config)).ok;
}

/** The default pipeline with a pipeline Connection that closes a cycle: `complete` runs back to `specify`. */
function withCycle(): { config: ProjectConfig; path: string } {
  const config = copyDefault();
  const at = config.pipeline.blocks.length - 1;
  const connection: ConnectionBlock = {
    kind: 'connection',
    id: 'complete-to-specify',
    enabled: true,
    from: 'complete',
    to: 'specify',
    artifact: 'loop',
  };
  config.pipeline.blocks.splice(at, 0, connection);
  return { config, path: itemPath(at) };
}

/** The default pipeline with two Connections in the build flow: the second one closes a cycle with the first. */
function withCycleInBuild(): { config: ProjectConfig; path: string } {
  const config = editFlow(copyDefault(), 'build', (flow) => {
    const forward: ConnectionBlock = {
      kind: 'connection',
      id: 'build-start-to-build-implement',
      enabled: true,
      from: 'build-start',
      to: 'build-implement',
      artifact: 'brief',
    };
    const back: ConnectionBlock = {
      kind: 'connection',
      id: 'build-implement-to-build-start',
      enabled: true,
      from: 'build-implement',
      to: 'build-start',
      artifact: 'loop',
    };
    return { ...flow, blocks: [...flow.blocks, forward, back] };
  });
  return { config, path: itemPath(topIndex(config, 'build'), flowNamed(config, 'build').blocks.length - 1) };
}

/** The default pipeline with the build flow's Agent block deleted: the two gates that retried to it are left unwired. */
function withDeletedAgent(): ProjectConfig {
  return applied(deleteBlock(copyDefault(), 'build', 'build-implement')).config;
}

describe('F-06 AC-009 a Connection that closes a cycle is marked and the edit is kept', () => {
  it('marks the closing Connection as a blocker at its own path', () => {
    const { config, path } = withCycle();
    expect(marksOn(config, path)).toEqual([
      {
        path,
        kind: 'connection',
        severity: 'blocker',
        message: 'connection "complete-to-specify" closes a cycle: "specify" already leads back to "complete"',
      },
    ]);
  });

  it('keeps the Connection in the configuration after it is marked', () => {
    const { config } = withCycle();
    expect(config.pipeline.blocks.find((block) => block.id === 'complete-to-specify')).toMatchObject({
      kind: 'connection',
      enabled: true,
    });
  });

  it('gives no mark when the closing Connection is switched off', () => {
    const { config, path } = withCycle();
    const off = editConnection(config, 'complete-to-specify', (block) => ({ ...block, enabled: false }));
    expect(marksOn(off, path)).toEqual([]);
  });

  it('marks a cycle between two blocks of a flow at the closing Connection', () => {
    const { config, path } = withCycleInBuild();
    expect(marksOn(config, path)).toContainEqual(
      expect.objectContaining({
        kind: 'connection',
        severity: 'blocker',
        message:
          'connection "build-implement-to-build-start" closes a cycle: "build-start" already leads back to "build-implement"',
      }),
    );
  });
});

describe('F-06 AC-022 a flow with no End block is marked until an End is added', () => {
  it('marks the flow that has no End block', () => {
    const config = editFlow(copyDefault(), 'specify', (flow) => ({
      ...flow,
      blocks: flow.blocks.filter((block) => block.kind !== 'end'),
    }));
    expect(marksOn(config, itemPath(topIndex(config, 'specify')))).toEqual([
      expect.objectContaining({ kind: 'flow', severity: 'blocker', message: 'flow "specify" has no End block' }),
    ]);
  });

  it('removes the mark when an End block is added', () => {
    const noEnd = editFlow(copyDefault(), 'specify', (flow) => ({
      ...flow,
      blocks: flow.blocks.filter((block) => block.kind !== 'end'),
    }));
    const edit = applied(addBlock(noEnd, 'specify', 'end', null));
    expect(marksOn(edit.config, itemPath(topIndex(edit.config, 'specify')))).toEqual([]);
  });
});

describe('F-06 AC-033 a disabled block or flow is not marked', () => {
  it('gives no mark to a flow that is switched off, even with no End block', () => {
    const noEnd = editFlow(copyDefault(), 'specify', (flow) => ({
      ...flow,
      blocks: flow.blocks.filter((block) => block.kind !== 'end'),
    }));
    const off = setFlowEnabled(noEnd, 'specify', false);
    expect(marksOn(off, itemPath(topIndex(off, 'specify')))).toEqual([]);
  });

  it('gives no mark to a block inside a switched-off flow', () => {
    const { config, path } = withCycleInBuild();
    expect(marksOn(config, path)).not.toEqual([]);
    const off = setFlowEnabled(config, 'build', false);
    const flowPath = itemPath(topIndex(off, 'build'));
    expect(structuralMarks(off).filter((mark) => mark.path.startsWith(flowPath))).toEqual([]);
  });

  it('gives no mark to a Condition that is switched off, even with an unwired output', () => {
    const unwired = withDeletedAgent();
    expect(marksOn(unwired, childPathOf(unwired, 'build', 'build-checks'))).not.toEqual([]);
    const off = setBlockEnabled(setBlockEnabled(unwired, 'build', 'build-review-gate', false), 'build', 'build-checks', false);
    expect(marksOn(off, childPathOf(off, 'build', 'build-review-gate'))).toEqual([]);
    expect(marksOn(off, childPathOf(off, 'build', 'build-checks'))).toEqual([]);
  });
});

describe('F-06 AC-036 a Condition with an unwired output is marked next to the item', () => {
  it('marks a flow Condition whose fail output goes back to a deleted block', () => {
    const config = withDeletedAgent();
    expect(marksOn(config, childPathOf(config, 'build', 'build-review-gate'))).toContainEqual(
      expect.objectContaining({
        kind: 'condition',
        severity: 'blocker',
        message: 'back route to "build-implement" is not a block of flow "build"',
      }),
    );
  });

  it('marks the other flow Condition that goes back to the deleted block', () => {
    const config = withDeletedAgent();
    expect(marksOn(config, childPathOf(config, 'build', 'build-checks'))).toContainEqual(
      expect.objectContaining({
        kind: 'condition',
        severity: 'blocker',
        message: 'back route to "build-implement" is not a block of flow "build"',
      }),
    );
  });
});

describe('F-06 AC-037 a flow with no Start or no End is marked; a second Start is refused', () => {
  it('marks a flow with no Start block', () => {
    const config = editFlow(copyDefault(), 'verify', (flow) => ({
      ...flow,
      blocks: flow.blocks.filter((block) => block.kind !== 'start'),
    }));
    expect(marksOn(config, itemPath(topIndex(config, 'verify')))).toEqual([
      expect.objectContaining({ kind: 'flow', message: 'flow "verify" has no Start block' }),
    ]);
  });

  it('refuses a second Start in a flow that already has one', () => {
    expect(addBlock(copyDefault(), 'verify', 'start', null).ok).toBe(false);
  });
});

describe('F-06 AC-037 a flow whose only Start or End is switched off is marked on the flow, not on the block', () => {
  it('F-06 AC-037 marks the owning flow when its only Start is off, and gives no mark to the Start', () => {
    const off = setBlockEnabled(copyDefault(), 'specify', 'specify-start', false);
    expect(marksOn(off, itemPath(topIndex(off, 'specify')))).toEqual([
      {
        path: itemPath(topIndex(off, 'specify')),
        kind: 'flow',
        severity: 'blocker',
        message: 'Start block "specify-start" is disabled; flow "specify" needs an enabled Start block',
      },
    ]);
    expect(marksOn(off, childPathOf(off, 'specify', 'specify-start'))).toEqual([]);
  });

  it('F-06 AC-037 marks the owning flow when its only End is off, and gives no mark to the End', () => {
    const off = setBlockEnabled(copyDefault(), 'specify', 'specify-end', false);
    expect(marksOn(off, itemPath(topIndex(off, 'specify')))).toEqual([
      {
        path: itemPath(topIndex(off, 'specify')),
        kind: 'flow',
        severity: 'blocker',
        message: 'End block "specify-end" is disabled; flow "specify" needs an enabled End block',
      },
    ]);
    expect(marksOn(off, childPathOf(off, 'specify', 'specify-end'))).toEqual([]);
  });

  it('F-06 AC-037 gives no flow mark when the flow itself is switched off with its Start off', () => {
    const off = setFlowEnabled(setBlockEnabled(copyDefault(), 'specify', 'specify-start', false), 'specify', false);
    expect(marksOn(off, itemPath(topIndex(off, 'specify')))).toEqual([]);
  });
});

describe('F-06 AC-038 the marks are the analyzer findings, placed on the item they name', () => {
  it('gives each mark the message and severity of a finding of pipeline.analyzeStructure', () => {
    const broken = deleteBlock(withCycle().config, 'build', 'build-implement');
    const config = applied(broken).config;
    const findings = pipeline.analyzeStructure(config);
    const marks = structuralMarks(config);
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) {
      expect(findings).toContainEqual(expect.objectContaining({ severity: mark.severity, message: mark.message }));
    }
  });

  it('marks the cycle with the message the analyzer gives for the same subject', () => {
    const { config, path } = withCycle();
    const finding = pipeline.analyzeStructure(config).find((f) => f.subject === path);
    expect(finding).toBeDefined();
    expect(marksOn(config, path)).toEqual([expect.objectContaining({ message: finding?.message, severity: 'blocker' })]);
  });
});

describe('F-06 AC-040 a retry with no round limit is a warning, not an error', () => {
  it('marks the retrying Condition as a warning and gives it no blocker', () => {
    const config = editFlow(copyDefault(), 'build', (flow) => ({
      ...flow,
      blocks: flow.blocks.map((block) =>
        block.id === 'build-review-gate' && block.kind === 'condition' ? withoutRoundLimit(block) : block,
      ),
    }));
    expect(marksOn(config, childPathOf(config, 'build', 'build-review-gate'))).toEqual([
      expect.objectContaining({
        kind: 'condition',
        severity: 'warning',
        message: 'condition "build-review-gate" retries to "build-implement" with no round limit',
      }),
    ]);
    expect(structuralMarks(config).some((mark) => mark.severity === 'blocker')).toBe(false);
  });
});

describe('F-06 AC-039 after any sequence of edits the state is accepted or carries a mark', () => {
  it('holds at every step of a fixed sequence of edits', () => {
    let config = copyDefault();
    let accepted = 0;
    const check = (step: string): void => {
      if (parserAccepts(config)) {
        accepted += 1;
        return;
      }
      const marks = structuralMarks(config).length + unplacedMarks(config).length;
      expect(marks, `after "${step}" the state is refused with no mark`).toBeGreaterThan(0);
    };

    const added = addFlow(config);
    config = added.config;
    const flowId = added.flowId;
    check('add a flow');

    config = applied(renameFlow(config, flowId, 'Scratch')).config;
    check('rename the flow');

    const agent = applied(addBlock(config, flowId, 'agent', null));
    config = agent.config;
    check('add an agent block');

    config = applied(addFlowConnection(config, flowId, `${flowId}-start`, agent.id, 'brief')).config;
    check('connect the Start to the agent');

    const condition = applied(addBlock(config, flowId, 'condition', agent.id));
    config = applied(
      setConditionRoutes(condition.config, flowId, condition.id, {
        pass: { kind: 'next' },
        fail: { kind: 'stop' },
        roundLimit: undefined,
      }),
    ).config;
    check('add a condition with routes');

    const end = applied(addBlock(config, flowId, 'end', null));
    config = end.config;
    check('add an End block');

    config = applied(deleteBlock(config, flowId, end.id)).config;
    check('delete the End block');

    config = applied(addBlock(config, flowId, 'end', null)).config;
    check('add the End block back');

    config = setBlockEnabled(config, flowId, agent.id, false);
    check('switch the agent off');

    config = setBlockEnabled(config, flowId, agent.id, true);
    check('switch the agent on');

    config = applied(addConnection(config, 'specify', flowId, 'hand over')).config;
    check('connect the specify flow to the new flow');

    config = applied(addConnection(config, flowId, 'specify', 'loop back')).config;
    check('connect the new flow back to specify (a cycle)');

    config = deleteFlow(config, flowId);
    check('delete the new flow');

    expect(accepted).toBeGreaterThan(0);
    expect(parserAccepts(config)).toBe(true);
    expect(structuralMarks(config).filter((mark) => mark.severity === 'blocker')).toEqual([]);
  });
});

describe('F-06 AC-039 a pipeline-level Start or End with no drawn item is listed under the Map', () => {
  it('F-06 AC-039 lists the finding that the pipeline has no End block, with no item to mark', () => {
    const config = copyDefault();
    config.pipeline.blocks = config.pipeline.blocks.filter((block) => block.id !== 'pipeline-end');
    expect(parserAccepts(config)).toBe(false);
    expect(unplacedMarks(config)).toContainEqual({ severity: 'blocker', message: 'the pipeline has no End block' });
  });

  it('F-06 AC-039 lists the finding that the pipeline has no Start block, with no item to mark', () => {
    const config = copyDefault();
    config.pipeline.blocks = config.pipeline.blocks.filter((block) => block.id !== 'pipeline-start');
    expect(parserAccepts(config)).toBe(false);
    expect(unplacedMarks(config)).toContainEqual({ severity: 'blocker', message: 'the pipeline has no Start block' });
  });

  it('F-06 AC-039 lists a switched-off pipeline End, which the Map does not draw', () => {
    const config = copyDefault();
    const end = config.pipeline.blocks[topIndex(config, 'pipeline-end')];
    if (end === undefined) throw new Error('no pipeline End');
    end.enabled = false;
    expect(parserAccepts(config)).toBe(false);
    expect(unplacedMarks(config)).toContainEqual({
      severity: 'blocker',
      message: 'End block "pipeline-end" is disabled; the pipeline needs an enabled End block',
    });
    expect(marksAt(structuralMarks(config), itemPath(topIndex(config, 'pipeline-end')))).toEqual([]);
  });

  it('F-06 AC-039 lists a switched-off pipeline Start, which the Map does not draw', () => {
    const config = copyDefault();
    const start = config.pipeline.blocks[topIndex(config, 'pipeline-start')];
    if (start === undefined) throw new Error('no pipeline Start');
    start.enabled = false;
    expect(unplacedMarks(config)).toContainEqual({
      severity: 'blocker',
      message: 'Start block "pipeline-start" is disabled; the pipeline needs an enabled Start block',
    });
    expect(marksAt(structuralMarks(config), itemPath(topIndex(config, 'pipeline-start')))).toEqual([]);
  });

  it('F-06 AC-039 lists nothing when the pipeline Start and End are enabled', () => {
    expect(unplacedMarks(copyDefault())).toEqual([]);
  });
});

describe('F-06 AC-039 the host configuration is held through the parser', () => {
  it('F-06 AC-039 holds a host configuration the parser accepts, as the parser returns it', () => {
    const state = createBuilderState({ initial: copyDefault() });
    expect(parserAccepts(state.current())).toBe(true);
    expect(state.current()).toEqual(pipeline.defaultProjectConfig);
  });

  it('F-06 AC-039 holds a host configuration the parser refuses as given, so its mark says why it is incomplete', () => {
    const incomplete = copyDefault();
    incomplete.pipeline.blocks = incomplete.pipeline.blocks.filter((block) => block.id !== 'pipeline-end');
    const state = createBuilderState({ initial: incomplete });
    expect(state.current()).toEqual(incomplete);
    expect(unplacedMarks(state.current())).toContainEqual({ severity: 'blocker', message: 'the pipeline has no End block' });
  });
});
