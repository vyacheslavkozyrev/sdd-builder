import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { addConnection, addGate, gateTargetAt } from '../src/builder/map-edit.js';
import type { ConnectionBox, GateChoice, MapEdit } from '../src/builder/map-edit.js';

type ProjectConfig = pipeline.ProjectConfig;
type PipelineBlock = pipeline.PipelineBlock;
type PipelineConditionBlock = pipeline.PipelineConditionBlock;

/** Unwraps a successful edit; fails the test with the refusal message otherwise. */
function applied(result: MapEdit): Extract<MapEdit, { ok: true }> {
  if (!result.ok) {
    throw new Error(`expected the edit to apply, got refusal: ${result.message}`);
  }
  return result;
}

/** The refusal message of an edit that must be refused; fails the test when it applies. */
function refusal(result: MapEdit): string {
  if (result.ok) {
    throw new Error('expected the edit to be refused, but it applied');
  }
  return result.message;
}

/** The gate blocks of a configuration. */
function gatesOf(config: ProjectConfig): PipelineConditionBlock[] {
  return config.pipeline.blocks.filter((block): block is PipelineConditionBlock => block.kind === 'condition');
}

/** The block with the given id, or a failing assertion when it is missing. */
function blockOf(config: ProjectConfig, id: string): PipelineBlock {
  const block = config.pipeline.blocks.find((item) => item.id === id);
  if (block === undefined) throw new Error(`the block ${id} is missing`);
  return block;
}

/**
 * A configuration with a connection from specify to complete that has no gate yet. The default pipeline has no such
 * connection, so the test adds it with the same edit the Map uses.
 */
function withOpenConnection(): { config: ProjectConfig; connectionId: string } {
  const edit = applied(addConnection(pipeline.defaultProjectConfig, 'specify', 'complete', 'notes.md'));
  return { config: edit.config, connectionId: edit.id };
}

describe('F-06 AC-008 a connection between two flows', () => {
  it('F-06 AC-008 a connection drawn from one flow to another adds a connection with the artifact label', () => {
    const edit = applied(addConnection(pipeline.defaultProjectConfig, 'specify', 'complete', 'notes.md'));
    expect(blockOf(edit.config, edit.id)).toEqual({
      kind: 'connection',
      id: 'specify-to-complete',
      enabled: true,
      from: 'specify',
      to: 'complete',
      artifact: 'notes.md',
    });
  });

  it('F-06 AC-008 the artifact label is trimmed when it is stored', () => {
    const edit = applied(addConnection(pipeline.defaultProjectConfig, 'specify', 'complete', '  notes.md  '));
    expect(blockOf(edit.config, edit.id)).toMatchObject({ artifact: 'notes.md' });
  });

  it.each(['', '   ', '\t'])('F-06 AC-008 an empty artifact label %j is refused at entry', (artifact) => {
    const before = pipeline.defaultProjectConfig;
    const result = addConnection(before, 'specify', 'complete', artifact);
    expect(refusal(result)).toContain('artifact label');
    expect(before).toEqual(pipeline.defaultProjectConfig);
  });

  it('F-06 AC-008 a connection that closes a cycle is kept, not refused', () => {
    const edit = applied(addConnection(pipeline.defaultProjectConfig, 'complete', 'specify', 'notes.md'));
    expect(blockOf(edit.config, edit.id)).toMatchObject({ from: 'complete', to: 'specify' });
  });

  it('F-06 AC-008 a repeated connection id gets a numeric suffix', () => {
    const first = applied(addConnection(pipeline.defaultProjectConfig, 'specify', 'complete', 'notes.md'));
    const second = applied(addConnection(first.config, 'specify', 'complete', 'more.md'));
    expect(second.id).toBe('specify-to-complete-2');
  });

  it('F-06 AC-008 a connection is placed before the pipeline End', () => {
    const edit = applied(addConnection(pipeline.defaultProjectConfig, 'specify', 'complete', 'notes.md'));
    const ids = edit.config.pipeline.blocks.map((block) => block.id);
    expect(ids.at(-1)).toBe('pipeline-end');
    expect(ids.indexOf(edit.id)).toBeLessThan(ids.indexOf('pipeline-end'));
  });

  it('F-06 AC-008 a connection from an unknown flow id is a programmer error and throws', () => {
    expect(() => addConnection(pipeline.defaultProjectConfig, 'nope', 'complete', 'notes.md')).toThrow(
      'Unknown flow id: nope',
    );
  });
});

describe('F-06 AC-010 an approval on a connection', () => {
  it('F-06 AC-010 an approval placed on a connection is a condition with check type approval, decided by a human', () => {
    const { config, connectionId } = withOpenConnection();
    const edit = applied(addGate(config, connectionId, { checkType: 'approval' }));
    const gate = gatesOf(edit.config).find((item) => item.id === edit.id);
    expect(gate).toMatchObject({
      kind: 'condition',
      checkType: 'approval',
      decidedBy: 'human',
      onConnection: connectionId,
      enabled: true,
    });
  });

  it('F-06 AC-010 the approval description names the connection artifact', () => {
    const { config, connectionId } = withOpenConnection();
    const edit = applied(addGate(config, connectionId, { checkType: 'approval' }));
    expect(blockOf(edit.config, edit.id)).toMatchObject({
      description: 'the user approves notes.md as written.',
    });
  });

  it('F-06 AC-010 the approval routes are pass to the next flow and fail to stop', () => {
    const { config, connectionId } = withOpenConnection();
    const edit = applied(addGate(config, connectionId, { checkType: 'approval' }));
    expect(blockOf(edit.config, edit.id)).toMatchObject({
      passRoute: { kind: 'next' },
      failRoute: { kind: 'stop' },
    });
  });

  it('F-06 AC-010 the gate id is the connection id with -gate, and it is file-safe', () => {
    const { config, connectionId } = withOpenConnection();
    const edit = applied(addGate(config, connectionId, { checkType: 'approval' }));
    expect(edit.id).toBe('specify-to-complete-gate');
    expect(pipeline.isValidId(edit.id)).toBe(true);
  });
});

describe('F-06 AC-011 a check on a connection', () => {
  const checkChoices: GateChoice[] = [
    { checkType: 'checks' },
    { checkType: 'diff-size', threshold: 200 },
  ];

  it.each(checkChoices)('F-06 AC-011 a check of type %j is decided by an agent', (choice) => {
    const { config, connectionId } = withOpenConnection();
    const edit = applied(addGate(config, connectionId, choice));
    expect(blockOf(edit.config, edit.id)).toMatchObject({
      kind: 'condition',
      checkType: choice.checkType,
      decidedBy: 'agent',
      onConnection: connectionId,
    });
  });

  it('F-06 AC-011 a diff-size check keeps its line threshold', () => {
    const { config, connectionId } = withOpenConnection();
    const edit = applied(addGate(config, connectionId, { checkType: 'diff-size', threshold: 200 }));
    expect(blockOf(edit.config, edit.id)).toMatchObject({ checkType: 'diff-size', threshold: 200 });
  });

  it('F-06 AC-011 a checks gate has no threshold', () => {
    const { config, connectionId } = withOpenConnection();
    const edit = applied(addGate(config, connectionId, { checkType: 'checks' }));
    expect(blockOf(edit.config, edit.id)).not.toHaveProperty('threshold');
  });

  it('F-06 AC-011 the default check description is "the checks pass."', () => {
    const { config, connectionId } = withOpenConnection();
    const edit = applied(addGate(config, connectionId, { checkType: 'checks' }));
    expect(blockOf(edit.config, edit.id)).toMatchObject({ description: 'the checks pass.' });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'F-06 AC-011 a diff-size threshold of %s is refused, so the check is not added',
    (threshold) => {
      const { config, connectionId } = withOpenConnection();
      const before = config.pipeline.blocks.length;
      const result = addGate(config, connectionId, { checkType: 'diff-size', threshold });
      expect(refusal(result)).toContain('positive whole number');
      expect(config.pipeline.blocks.length).toBe(before);
    },
  );
});

describe('F-06 AC-012 one gate per connection', () => {
  it('F-06 AC-012 a second gate on a connection is refused with "one gate per connection"', () => {
    const { config, connectionId } = withOpenConnection();
    const first = applied(addGate(config, connectionId, { checkType: 'approval' }));
    const message = refusal(addGate(first.config, connectionId, { checkType: 'checks' }));
    expect(message).toContain('one gate per connection');
    expect(gatesOf(first.config).filter((gate) => gate.onConnection === connectionId)).toHaveLength(1);
  });

  it('F-06 AC-012 a connection with a default gate (the default pipeline) refuses an approval from the panel', () => {
    const connectionId = 'specify-to-ux';
    const message = refusal(addGate(pipeline.defaultProjectConfig, connectionId, { checkType: 'approval' }));
    expect(message).toContain('one gate per connection');
  });

  it('F-06 AC-012 a refused second gate leaves the configuration as it was', () => {
    const before = pipeline.defaultProjectConfig;
    refusal(addGate(before, 'specify-to-ux', { checkType: 'checks' }));
    expect(before).toEqual(pipeline.defaultProjectConfig);
  });

  it('F-06 AC-012 a gate is placed right after its connection', () => {
    const { config, connectionId } = withOpenConnection();
    const edit = applied(addGate(config, connectionId, { checkType: 'checks' }));
    const ids = edit.config.pipeline.blocks.map((block) => block.id);
    expect(ids.indexOf(edit.id)).toBe(ids.indexOf(connectionId) + 1);
  });

  it('F-06 AC-012 a gate id that is already taken gets a numeric suffix', () => {
    const { config, connectionId } = withOpenConnection();
    const withTaken: ProjectConfig = {
      ...config,
      pipeline: {
        ...config.pipeline,
        blocks: [
          ...config.pipeline.blocks,
          { kind: 'connection', id: 'specify-to-complete-gate', enabled: true, from: 'specify', to: 'plan', artifact: 'x' },
        ],
      },
    };
    const edit = applied(addGate(withTaken, connectionId, { checkType: 'checks' }));
    expect(edit.id).toBe('specify-to-complete-gate-2');
  });

  it('F-06 AC-012 a gate on an unknown connection id is a programmer error and throws', () => {
    expect(() => addGate(pipeline.defaultProjectConfig, 'nope', { checkType: 'checks' })).toThrow(
      'Unknown connection id: nope',
    );
  });
});

describe('F-06 AC-012 the drop target on a connection', () => {
  const boxes: ConnectionBox[] = [
    { connectionId: 'a-to-b', x: 100, y: 50, width: 80, height: 20 },
    { connectionId: 'b-to-c', x: 300, y: 50, width: 80, height: 20 },
  ];

  it('F-06 AC-012 a point inside a connection box resolves to that connection', () => {
    expect(gateTargetAt({ x: 120, y: 60 }, boxes)).toBe('a-to-b');
    expect(gateTargetAt({ x: 300, y: 50 }, boxes)).toBe('b-to-c');
  });

  it('F-06 AC-012 a point outside every box resolves to no connection', () => {
    expect(gateTargetAt({ x: 10, y: 10 }, boxes)).toBeNull();
    expect(gateTargetAt({ x: 100, y: 70 }, boxes)).toBeNull();
    expect(gateTargetAt({ x: 180, y: 60 }, boxes)).toBeNull();
  });

  it('F-06 AC-012 with no boxes nothing is a drop target', () => {
    expect(gateTargetAt({ x: 0, y: 0 }, [])).toBeNull();
  });

  it('F-06 AC-012 when boxes overlap, the first one in the list wins', () => {
    const overlapping: ConnectionBox[] = [
      { connectionId: 'first', x: 0, y: 0, width: 100, height: 100 },
      { connectionId: 'second', x: 50, y: 50, width: 100, height: 100 },
    ];
    expect(gateTargetAt({ x: 60, y: 60 }, overlapping)).toBe('first');
  });
});
