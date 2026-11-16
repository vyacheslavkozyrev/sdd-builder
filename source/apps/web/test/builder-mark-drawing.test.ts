import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { addBlock, deleteBlock } from '../src/builder/block-edit.js';
import { flowBlockPathOf, marksAt, pipelinePathOf, structuralMarks, unplacedMarks } from '../src/builder/marks.js';
import { mapTabView } from '../src/builder/map-tab-view.js';
import { flowTabView } from '../src/builder/tab-view.js';

type ProjectConfig = pipeline.ProjectConfig;
type FlowBlock = pipeline.FlowBlock;
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

/** A copy of the config with one flow replaced by `change`. */
function editFlow(config: ProjectConfig, flowId: string, change: (flow: FlowBlock) => FlowBlock): ProjectConfig {
  const next = structuredClone(config);
  const index = next.pipeline.blocks.findIndex((block) => block.kind === 'flow' && block.id === flowId);
  const flow = next.pipeline.blocks[index];
  if (flow?.kind !== 'flow') throw new Error(`"${flowId}" is not a flow`);
  next.pipeline.blocks[index] = change(flow);
  return next;
}

/** The default pipeline with a pipeline Connection that closes a cycle: `complete` runs back to `specify`. */
function withCycle(): ProjectConfig {
  const config = copyDefault();
  const connection: ConnectionBlock = {
    kind: 'connection',
    id: 'complete-to-specify',
    enabled: true,
    from: 'complete',
    to: 'specify',
    artifact: 'loop',
  };
  config.pipeline.blocks.splice(config.pipeline.blocks.length - 1, 0, connection);
  return config;
}

/** The default pipeline with the build flow's Agent block deleted: the two gates that retried to it are left unwired. */
function withDeletedAgent(): ProjectConfig {
  return applied(deleteBlock(copyDefault(), 'build', 'build-implement')).config;
}

/** The default pipeline with a flow that has no End block. */
function withoutEnd(flowId: string): ProjectConfig {
  return editFlow(copyDefault(), flowId, (flow) => ({
    ...flow,
    blocks: flow.blocks.filter((block) => block.kind !== 'end'),
  }));
}

describe('F-06 AC-009 the Map draws the cycle mark on the Connection that closes it, and keeps the arrow', () => {
  it('draws a blocker on the closing Connection, which the Map draws as an arrow', () => {
    const config = withCycle();
    const drawn = mapTabView(config).edges.map((edge) => edge.id);
    expect(drawn).toContain('complete-to-specify');
    expect(marksAt(structuralMarks(config), pipelinePathOf(config, 'complete-to-specify'))).toEqual([
      expect.objectContaining({
        kind: 'connection',
        severity: 'blocker',
        message: 'connection "complete-to-specify" closes a cycle: "specify" already leads back to "complete"',
      }),
    ]);
  });

  it('keeps the closing Connection in the configuration and on the Map after it is marked', () => {
    const config = withCycle();
    expect(config.pipeline.blocks.some((block) => block.id === 'complete-to-specify')).toBe(true);
    expect(mapTabView(config).edges.find((edge) => edge.id === 'complete-to-specify')?.enabled).toBe(true);
  });

  it('draws the blocker on the closing Connection of the flow tab, in its list of Connections', () => {
    const config = editFlow(copyDefault(), 'build', (flow) => ({
      ...flow,
      blocks: [
        ...flow.blocks,
        {
          kind: 'connection',
          id: 'build-start-to-build-implement',
          enabled: true,
          from: 'build-start',
          to: 'build-implement',
          artifact: 'brief',
        },
        {
          kind: 'connection',
          id: 'build-implement-to-build-start',
          enabled: true,
          from: 'build-implement',
          to: 'build-start',
          artifact: 'loop',
        },
      ],
    }));
    const arrows = flowTabView(config, 'build').arrows.map((arrow) => arrow.id);
    expect(arrows).toContain('build-implement-to-build-start');
    expect(
      marksAt(structuralMarks(config), flowBlockPathOf(config, 'build', 'build-implement-to-build-start')),
    ).toContainEqual(expect.objectContaining({ kind: 'connection', severity: 'blocker' }));
  });
});

describe('F-06 AC-022 the Map and the flow tab draw the no-End mark until an End is added', () => {
  it('draws a blocker on the flow node and on the flow heading of the flow with no End block', () => {
    const config = withoutEnd('specify');
    expect(mapTabView(config).nodes.map((node) => node.id)).toContain('specify');
    expect(marksAt(structuralMarks(config), pipelinePathOf(config, 'specify'))).toEqual([
      expect.objectContaining({ kind: 'flow', severity: 'blocker', message: 'flow "specify" has no End block' }),
    ]);
  });

  it('removes the drawn mark when an End block is added to the flow', () => {
    const edit = applied(addBlock(withoutEnd('specify'), 'specify', 'end', null));
    expect(marksAt(structuralMarks(edit.config), pipelinePathOf(edit.config, 'specify'))).toEqual([]);
  });
});

describe('F-06 AC-036 a Condition with an unwired output is drawn with its mark on its box', () => {
  it('draws a blocker on the unwired Condition box of the flow tab', () => {
    const config = withDeletedAgent();
    expect(flowTabView(config, 'build').boxes.map((box) => box.id)).toContain('build-review-gate');
    expect(marksAt(structuralMarks(config), flowBlockPathOf(config, 'build', 'build-review-gate'))).toContainEqual(
      expect.objectContaining({
        kind: 'condition',
        severity: 'blocker',
        message: 'back route to "build-implement" is not a block of flow "build"',
      }),
    );
  });

  it('draws the mark on the other unwired Condition box too', () => {
    const config = withDeletedAgent();
    expect(marksAt(structuralMarks(config), flowBlockPathOf(config, 'build', 'build-checks'))).toContainEqual(
      expect.objectContaining({ kind: 'condition', severity: 'blocker' }),
    );
  });

  it('draws no mark on a box that is wired, so the mark names only the Condition', () => {
    const config = withDeletedAgent();
    const marks = structuralMarks(config);
    const wired = flowTabView(config, 'build')
      .boxes.map((box) => box.id)
      .filter((id) => id !== 'build-review-gate' && id !== 'build-checks');
    expect(wired.length).toBeGreaterThan(0);
    for (const id of wired) {
      expect(marksAt(marks, flowBlockPathOf(config, 'build', id)), `box ${id}`).toEqual([]);
    }
  });
});

/** The default pipeline with a Connection that does not join two flows: `specify` runs into the gate `approve-stories`. */
function withStrayConnection(enabled = true): ProjectConfig {
  const config = copyDefault();
  const connection: ConnectionBlock = {
    kind: 'connection',
    id: 'stray',
    enabled,
    from: 'specify',
    to: 'approve-stories',
    artifact: 'stray',
  };
  config.pipeline.blocks.splice(config.pipeline.blocks.length - 1, 0, connection);
  return config;
}

describe('F-06 AC-039 a mark the Map does not draw is listed under the diagram, with its severity and message', () => {
  it('lists a Connection that does not join two flows, because the Map does not draw it', () => {
    const config = withStrayConnection();
    expect(mapTabView(config).edges.map((edge) => edge.id)).not.toContain('stray');
    expect(unplacedMarks(config)).toEqual([
      {
        severity: 'blocker',
        message:
          'Connection "stray" must join two flows of the pipeline; "approve-stories" is in another flow or in the pipeline, not a flow of the pipeline',
      },
    ]);
  });

  it('does not repeat a mark the Map draws: the cycle on a drawn Connection is placed, not listed', () => {
    const config = withCycle();
    expect(marksAt(structuralMarks(config), pipelinePathOf(config, 'complete-to-specify'))).toHaveLength(1);
    expect(unplacedMarks(config)).toEqual([]);
  });

  it('lists nothing for a disabled Connection that does not join two flows (AC-033: no mark on a disabled item)', () => {
    expect(unplacedMarks(withStrayConnection(false))).toEqual([]);
  });

  it('lists nothing for the default pipeline, and keeps the brief finding "rules is empty" out of the list', () => {
    expect(pipeline.analyzeStructure(copyDefault())).toContainEqual(
      expect.objectContaining({ subject: 'rules', message: 'rules is empty' }),
    );
    expect(unplacedMarks(copyDefault())).toEqual([]);
  });
});

describe('the mark path helpers name the item the Map and the flow tab draw', () => {
  it('throws on an unknown pipeline block id, a programmer error', () => {
    expect(() => pipelinePathOf(copyDefault(), 'no-such-block')).toThrow('Unknown pipeline block id no-such-block');
  });

  it('throws on an unknown flow id or block id inside a flow, a programmer error', () => {
    expect(() => flowBlockPathOf(copyDefault(), 'no-such-flow', 'build-start')).toThrow('Unknown flow id no-such-flow');
    expect(() => flowBlockPathOf(copyDefault(), 'build', 'no-such-block')).toThrow(
      'Unknown block id no-such-block in flow build',
    );
  });
});
