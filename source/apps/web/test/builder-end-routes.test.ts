import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import type { pipeline as model } from '@sddbuilder/core';
import { addBlock } from '../src/builder/blocks.js';
import { linkBlocks } from '../src/builder/blockLink.js';

type Flow = model.Flow;

// A flow with one outcome artifact, so an End that produces it is valid.
function emptyFlow(): Flow {
  return {
    index: 0,
    id: '888b47d9-bbf6-5511-b91e-e344ce1da719',
    name: 'Verify',
    arguments: [],
    body: 'Verify the stories.',
    artifacts: [{ label: 'report.md', template: 'The report' }],
    approval: false,
    blocks: [],
  };
}

// Start, then a Condition and an End, in the order given: the End is created before the Condition or
// after it. The Condition's true route is linked to the End, and the Start to the Condition. The
// Condition's description and the End's artifact are set, so the analyzer could only report the route.
function conditionToEnd(endFirst: boolean): Flow {
  let flow = addBlock(emptyFlow(), 'start').flow;
  let condition = '';
  let end = '';
  const addCondition = (): void => {
    const added = addBlock(flow, 'condition');
    flow = added.flow;
    condition = added.blockId;
  };
  const addEnd = (): void => {
    const added = addBlock(flow, 'end');
    flow = added.flow;
    end = added.blockId;
  };
  if (endFirst) {
    addEnd();
    addCondition();
  } else {
    addCondition();
    addEnd();
  }
  const startId = flow.blocks.find((block) => block.kind === 'start')?.id ?? '';
  const linkedStart = linkBlocks(flow, startId, 'next', condition);
  if (!linkedStart.ok) throw new Error(linkedStart.reason);
  const linked = linkBlocks(linkedStart.flow, condition, 'true', end);
  if (!linked.ok) throw new Error(linked.reason);
  return withText(linked.flow, condition);
}

// The condition gets a description and every End an artifact the flow owns.
function withText(flow: Flow, conditionId: string): Flow {
  return {
    ...flow,
    blocks: flow.blocks.map((block) => {
      if (block.kind === 'condition' && block.id === conditionId) {
        return { ...block, description: 'The stories are complete.' };
      }
      if (block.kind === 'end') return { ...block, producedArtifact: 'report.md' };
      return block;
    }),
  };
}

function analyzeFlow(flow: Flow) {
  return pipeline.analyzeStructure({
    schemaVersion: 2,
    rules: [],
    pipeline: { name: 'Demo', description: 'A demo pipeline.', arguments: [], flows: [flow] },
  });
}

describe('F-12 (no criterion: Verify device fix 2026-11-24) a Condition route to an End is a later block', () => {
  it.each([
    ['End added first', true],
    ['End added last', false],
  ])('F-12 (no criterion: Verify device fix 2026-11-24) gives no blocker for the true route when the %s', (_label, endFirst) => {
    const flow = conditionToEnd(endFirst);

    const condition = flow.blocks.find((block) => block.kind === 'condition');
    const end = flow.blocks.find((block) => block.kind === 'end');
    if (condition?.kind !== 'condition' || end?.kind !== 'end') throw new Error('the flow lacks a condition or an end');
    expect(condition.true).toEqual({ to: end.id });
    expect(end.index).toBeGreaterThan(condition.index);

    const routeBlockers = analyzeFlow(flow).filter(
      (finding) => finding.severity === 'blocker' && /\.true\.to$/.test(finding.path),
    );
    expect(routeBlockers).toEqual([]);
  });

  it('F-12 (no criterion: Verify device fix 2026-11-24) keeps every End after the non-End blocks of the list', () => {
    const flow = conditionToEnd(true);

    expect(flow.blocks.map((block) => block.kind)).toEqual(['start', 'condition', 'end']);
    expect(flow.blocks.map((block) => block.index)).toEqual([0, 1, 2]);
  });
});
