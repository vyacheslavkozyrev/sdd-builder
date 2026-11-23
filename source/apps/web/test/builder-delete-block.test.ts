import { describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import {
  LAST_END_DELETE_REFUSAL,
  START_DELETE_REFUSAL,
  arrowsRemovedBy,
  deleteBlock,
  deleteRefusal,
} from '../src/builder/deleteBlock.js';

type Flow = core.Flow;
type Block = core.Block;

// The flow `write`: Start to the Agent `agent-a`, which goes to the Condition `check`. The true route
// of `check` goes to the End `finish`; its false route returns to `agent-a` with a round limit. A second
// End `stopped-end` is not reached. The arrows are: start to agent-a, agent-a to check, check true to
// finish, check false back to agent-a.
const START: Block = { index: 0, id: 'start', kind: 'start', next: 'agent-a' };
const AGENT: Block = {
  index: 1,
  id: 'agent-a',
  kind: 'agent',
  name: 'Writer',
  description: 'Writes the draft.',
  arguments: [],
  next: 'check',
};
const CHECK: Block = {
  index: 2,
  id: 'check',
  kind: 'condition',
  description: 'The draft is complete.',
  true: { to: 'finish' },
  false: { to: 'agent-a', roundLimit: 3 },
};
const FINISH: Block = { index: 3, id: 'finish', kind: 'end', outcome: 'done', producedArtifact: '' };
const STOPPED: Block = { index: 4, id: 'stopped-end', kind: 'end', outcome: 'stopped', producedArtifact: '' };

function writeFlow(blocks: Block[] = [START, AGENT, CHECK, FINISH, STOPPED]): Flow {
  return {
    index: 0,
    id: 'write',
    name: 'write',
    description: 'The write step.',
    arguments: [],
    body: 'Write the draft.',
    artifacts: [{ label: 'draft.md', template: 'the draft' }],
    approval: true,
    blocks,
    next: 'review',
  };
}

function blockOf(flow: Flow, id: string): Block {
  const found = flow.blocks.find((block) => block.id === id);
  if (found === undefined) {
    throw new Error(`test flow has no block ${id}`);
  }
  return found;
}

describe('F-12 AC-039 delete block: the arrow count for the confirmation', () => {
  it('counts the arrows that start at the block and the arrows that end at it', () => {
    // agent-a: start to it, it to check, and check false back to it.
    expect(arrowsRemovedBy(writeFlow(), 'agent-a')).toBe(3);
  });

  it('counts an arrow that starts and ends at the block once', () => {
    // start to agent-a, agent-a to itself (counted once), and check false back to agent-a.
    const flow = writeFlow([START, { ...AGENT, next: 'agent-a' }, CHECK, FINISH, STOPPED]);
    expect(arrowsRemovedBy(flow, 'agent-a')).toBe(3);
  });

  it('counts only the arrows of the block, and a block with no arrows gives zero', () => {
    expect(arrowsRemovedBy(writeFlow(), 'check')).toBe(3);
    expect(arrowsRemovedBy(writeFlow(), 'stopped-end')).toBe(0);
  });

  it('does not count a route that names no block of the flow', () => {
    const flow = writeFlow([
      START,
      { ...AGENT, next: 'missing' },
      CHECK,
      FINISH,
      STOPPED,
    ]);
    // start to agent-a and check false back to agent-a; agent-a's next names no block.
    expect(arrowsRemovedBy(flow, 'agent-a')).toBe(2);
  });
});

describe('F-12 AC-040 delete block: the block and its arrows are removed', () => {
  it('removes the block and every arrow that starts or ends at it', () => {
    const result = deleteBlock(writeFlow(), 'agent-a');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.flow.blocks.map((block) => block.id)).toEqual(['start', 'check', 'finish', 'stopped-end']);
    expect(blockOf(result.flow, 'start')).toEqual({ ...START, next: '' });
    expect(blockOf(result.flow, 'check')).toEqual({
      ...CHECK,
      false: { stop: true },
    });
  });

  it('keeps the other blocks properties, and the input flow is not changed', () => {
    const flow = writeFlow();
    const before = structuredClone(flow);
    const result = deleteBlock(flow, 'stopped-end');
    expect(result.ok).toBe(true);
    expect(flow).toEqual(before);
    if (result.ok) {
      expect(result.flow.blocks.map((block) => block.id)).toEqual(['start', 'agent-a', 'check', 'finish']);
      expect(blockOf(result.flow, 'agent-a')).toEqual(AGENT);
      expect(blockOf(result.flow, 'check')).toEqual(CHECK);
      expect(blockOf(result.flow, 'finish')).toEqual(FINISH);
    }
  });

  it('keeps each kept block index as it was', () => {
    const result = deleteBlock(writeFlow(), 'stopped-end');
    expect(result.ok && result.flow.blocks.map((block) => block.index)).toEqual([0, 1, 2, 3]);
  });
});

describe('F-12 AC-041 delete block: a route to the deleted block is cleared, nothing is rewired', () => {
  it('clears a true route that pointed to the deleted block to an empty route', () => {
    const result = deleteBlock(writeFlow(), 'finish');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(blockOf(result.flow, 'check')).toEqual({ ...CHECK, true: { to: '' } });
    }
  });

  it('clears a false route that pointed to the deleted block to stop', () => {
    const result = deleteBlock(writeFlow(), 'agent-a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(blockOf(result.flow, 'check')).toMatchObject({ false: { stop: true } });
    }
  });

  it('clears both routes of a Condition that pointed to the deleted block', () => {
    const flow = writeFlow([
      START,
      AGENT,
      { ...CHECK, true: { to: 'stopped-end' }, false: { to: 'stopped-end', roundLimit: 2 } },
      FINISH,
      STOPPED,
    ]);
    const result = deleteBlock(flow, 'stopped-end');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(blockOf(result.flow, 'check')).toEqual({ ...CHECK, true: { to: '' }, false: { stop: true } });
    }
  });

  it('clears a Start or Agent next that pointed to the deleted block to empty', () => {
    const result = deleteBlock(writeFlow(), 'check');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(blockOf(result.flow, 'agent-a')).toEqual({ ...AGENT, next: '' });
    }
  });

  it('leaves a route to another block as it was and rewires nothing', () => {
    const result = deleteBlock(writeFlow(), 'stopped-end');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(blockOf(result.flow, 'start')).toEqual(START);
      expect(blockOf(result.flow, 'check')).toEqual(CHECK);
    }
  });
});

describe('F-12 AC-042 delete block: the flow Start cannot be deleted', () => {
  it('refuses to delete the Start with the reason shown beside its control', () => {
    expect(deleteRefusal(writeFlow(), 'start')).toBe('A flow keeps its Start block.');
    expect(START_DELETE_REFUSAL).toBe('A flow keeps its Start block.');
    expect(deleteBlock(writeFlow(), 'start')).toEqual({ ok: false, reason: 'A flow keeps its Start block.' });
  });
});

describe('F-12 AC-043 delete block: the last End cannot be deleted', () => {
  it('refuses to delete the only End with the reason shown beside its control', () => {
    const flow = writeFlow([START, AGENT, CHECK, FINISH]);
    expect(deleteRefusal(flow, 'finish')).toBe('A flow keeps at least one End block.');
    expect(LAST_END_DELETE_REFUSAL).toBe('A flow keeps at least one End block.');
    expect(deleteBlock(flow, 'finish')).toEqual({ ok: false, reason: 'A flow keeps at least one End block.' });
  });

  it('allows deleting an End while another End remains', () => {
    expect(deleteRefusal(writeFlow(), 'finish')).toBeNull();
    expect(deleteRefusal(writeFlow(), 'stopped-end')).toBeNull();
    const result = deleteBlock(writeFlow(), 'finish');
    expect(result.ok && result.flow.blocks.filter((block) => block.kind === 'end').map((block) => block.id)).toEqual([
      'stopped-end',
    ]);
  });

  it('allows deleting an Agent or a Condition', () => {
    expect(deleteRefusal(writeFlow(), 'agent-a')).toBeNull();
    expect(deleteRefusal(writeFlow(), 'check')).toBeNull();
  });

  it('throws for a block id the flow does not have', () => {
    expect(() => deleteBlock(writeFlow(), 'no-such-block')).toThrow('flow write has no block no-such-block');
  });
});

describe('F-12 AC-044 delete block: the flow stays on the same flow', () => {
  it('keeps the flow id, name, artifacts, next and approval when a block is deleted', () => {
    const flow = writeFlow();
    const result = deleteBlock(flow, 'agent-a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.flow.id).toBe(flow.id);
      expect(result.flow.name).toBe(flow.name);
      expect(result.flow.artifacts).toEqual(flow.artifacts);
      expect(result.flow.next).toBe('review');
      expect(result.flow.approval).toBe(true);
      expect(result.flow.index).toBe(0);
    }
  });
});
