import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import {
  arrowPanel,
  blockName,
  flowArrows,
  hasInput,
  outputsOf,
  type BlockArrow,
} from '../src/builder/blockArrows.js';

type Flow = model.Flow;
type Block = model.Block;

// A flow with the required fields only and the given blocks.
function flowWith(blocks: readonly Block[] = []): Flow {
  return {
    index: 0,
    id: 'plan',
    name: 'plan',
    arguments: [],
    body: 'Do the work.',
    artifacts: [],
    approval: false,
    blocks,
  };
}

function start(id: string, next: string): Block {
  return { index: 0, id, kind: 'start', next };
}

function agent(id: string, next: string, name = id, description = ''): Block {
  return { index: 0, id, kind: 'agent', name, description, arguments: [], next };
}

function condition(
  id: string,
  trueRoute: model.Route,
  falseRoute: model.Route,
  description = 'Check.',
): Block {
  return { index: 0, id, kind: 'condition', description, true: trueRoute, false: falseRoute };
}

function end(id: string): Block {
  return { index: 0, id, kind: 'end', outcome: 'done', producedArtifact: '' };
}

// Start, planner, a Condition whose false route returns to the planner with a limit of 3, and End.
// Layout columns: block-1 0, block-2 1, block-3 2, block-4 3.
function loopFlow(falseRoute: model.Route = { to: 'block-2', roundLimit: 3 }): Flow {
  return flowWith([
    start('block-1', 'block-2'),
    agent('block-2', 'block-3', 'planner', 'Writes the plan'),
    condition('block-3', { to: 'block-4' }, falseRoute),
    end('block-4'),
  ]);
}

function arrowFrom(arrows: readonly BlockArrow[], fromId: string, output: BlockArrow['output']): BlockArrow | undefined {
  return arrows.find((arrow) => arrow.fromId === fromId && arrow.output === output);
}

describe('F-12 AC-013 output points by kind', () => {
  it.each([
    ['Start', start('block-1', ''), ['next']],
    ['Agent', agent('block-1', ''), ['next']],
    ['Condition', condition('block-1', { to: '' }, { stop: true }), ['true', 'false']],
    ['End', end('block-1'), []],
  ] as const)('F-12 AC-013 gives a %s its output points', (_kind, block, expected) => {
    expect(outputsOf(block)).toEqual(expected);
  });
});

describe('F-12 AC-013 input points by kind', () => {
  it.each([
    ['Start', start('block-1', ''), false],
    ['Agent', agent('block-1', ''), true],
    ['Condition', condition('block-1', { to: '' }, { stop: true }), true],
    ['End', end('block-1'), true],
  ] as const)('F-12 AC-013 has the input point the rule gives a %s', (_kind, block, expected) => {
    expect(hasInput(block)).toBe(expected);
  });
});

describe('F-12 AC-008 forward arrows', () => {
  it('F-12 AC-008 draws an arrow from each set output to its target', () => {
    const arrows = flowArrows(loopFlow());
    const next = arrowFrom(arrows, 'block-1', 'next');
    expect(next).toEqual({
      fromId: 'block-1',
      output: 'next',
      toId: 'block-2',
      isReturn: false,
      roundLimit: null,
      branchLabel: null,
      roundsLabel: null,
    });
    expect(arrowFrom(arrows, 'block-2', 'next')?.toId).toBe('block-3');
  });

  it('F-12 AC-008 labels the true output of a Condition "true" and its false output "false"', () => {
    const arrows = flowArrows(loopFlow({ to: 'block-4' }));
    expect(arrowFrom(arrows, 'block-3', 'true')?.branchLabel).toBe('true');
    expect(arrowFrom(arrows, 'block-3', 'false')?.branchLabel).toBe('false');
  });

  it('F-12 AC-008 draws a false route to a later block as a forward arrow with no round limit', () => {
    const arrows = flowArrows(loopFlow({ to: 'block-4' }));
    const falseArrow = arrowFrom(arrows, 'block-3', 'false');
    expect(falseArrow?.isReturn).toBe(false);
    expect(falseArrow?.roundLimit).toBeNull();
    expect(falseArrow?.roundsLabel).toBeNull();
  });
});

describe('F-12 AC-008 return arrows', () => {
  it('F-12 AC-008 marks a false route back to an earlier Agent as a return with its round limit and label', () => {
    const falseArrow = arrowFrom(flowArrows(loopFlow()), 'block-3', 'false');
    expect(falseArrow).toEqual({
      fromId: 'block-3',
      output: 'false',
      toId: 'block-2',
      isReturn: true,
      roundLimit: 3,
      branchLabel: 'false',
      roundsLabel: 'up to 3 rounds',
    });
  });

  it('F-12 AC-008 keeps a return with an unset round limit with no limit label', () => {
    const falseArrow = arrowFrom(flowArrows(loopFlow({ to: 'block-2' })), 'block-3', 'false');
    expect(falseArrow?.isReturn).toBe(true);
    expect(falseArrow?.roundLimit).toBeNull();
    expect(falseArrow?.roundsLabel).toBeNull();
  });

  it('F-12 AC-008 writes the limit as "up to N rounds" for each limit from 1 to 5', () => {
    for (const limit of [1, 2, 3, 4, 5]) {
      const falseArrow = arrowFrom(flowArrows(loopFlow({ to: 'block-2', roundLimit: limit })), 'block-3', 'false');
      expect(falseArrow?.roundsLabel).toBe(`up to ${limit} rounds`);
    }
  });

  it('F-12 AC-008 treats a link to the source block itself as a return', () => {
    const flow = flowWith([
      start('block-1', 'block-2'),
      condition('block-2', { to: 'block-3' }, { to: 'block-2' }),
      end('block-3'),
    ]);
    expect(arrowFrom(flowArrows(flow), 'block-2', 'false')?.isReturn).toBe(true);
  });
});

describe('F-12 AC-020 outputs with no arrow', () => {
  it('F-12 AC-020 draws no arrow from an empty next, an empty true route or a stop route', () => {
    const flow = flowWith([
      start('block-1', ''),
      agent('block-2', ''),
      condition('block-3', { to: '' }, { stop: true }),
      end('block-4'),
    ]);
    expect(flowArrows(flow)).toEqual([]);
  });

  it('F-12 AC-020 skips an arrow to a block that is not in the flow', () => {
    const flow = flowWith([start('block-1', 'block-9'), end('block-2')]);
    expect(flowArrows(flow)).toEqual([]);
  });

  it('F-12 AC-020 gives no arrows for an empty flow', () => {
    expect(flowArrows(flowWith())).toEqual([]);
  });
});

describe('F-12 AC-011 arrow panel data', () => {
  it.each([
    ['Start to Agent', 'block-1', 'next', 'Start', 'planner'],
    ['Agent to Condition', 'block-2', 'next', 'planner', 'Condition: Check.'],
    ['Condition true to End', 'block-3', 'true', 'Condition: Check.', 'End'],
  ] as const)('F-12 AC-011 names the source and target of %s', (_label, fromId, output, source, target) => {
    const flow = flowWith([
      start('block-1', 'block-2'),
      agent('block-2', 'block-3', 'planner'),
      condition('block-3', { to: 'block-4' }, { to: 'block-2', roundLimit: 2 }),
      end('block-4'),
    ]);
    const arrow = arrowFrom(flowArrows(flow), fromId, output);
    expect(arrow).toBeDefined();
    if (arrow === undefined) {
      return;
    }
    expect(arrowPanel(flow, arrow)).toEqual({ source, target });
  });

  it('F-12 AC-011 falls back to the id for an Agent with a blank name', () => {
    expect(blockName(agent('block-7', '', ''))).toBe('block-7');
  });

  it('F-12 AC-011 names a Condition without a description plainly', () => {
    expect(blockName(condition('block-3', { to: '' }, { stop: true }, ''))).toBe('Condition');
  });

  it('F-12 AC-011 throws when the arrow names a block the flow does not have', () => {
    const flow = loopFlow();
    const arrow = arrowFrom(flowArrows(flow), 'block-1', 'next');
    expect(arrow).toBeDefined();
    if (arrow === undefined) {
      return;
    }
    expect(() => arrowPanel(flowWith([end('block-4')]), arrow)).toThrow(/names a block the flow does not have/);
  });
});

describe('F-12 AC-008 determinism', () => {
  it('F-12 AC-008 gives the same arrows for the same flow', () => {
    expect(flowArrows(loopFlow())).toEqual(flowArrows(loopFlow()));
  });
});
