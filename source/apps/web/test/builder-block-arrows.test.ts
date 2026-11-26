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
    id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
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
function loopFlow(falseRoute: model.Route = { to: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', roundLimit: 3 }): Flow {
  return flowWith([
    start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'),
    agent('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'planner', 'Writes the plan'),
    condition('c2b443aa-3d75-5a54-8874-426073a3fc41', { to: 'bf4df531-9a24-5612-8519-d9ed8b883586' }, falseRoute),
    end('bf4df531-9a24-5612-8519-d9ed8b883586'),
  ]);
}

function arrowFrom(arrows: readonly BlockArrow[], fromId: string, output: BlockArrow['output']): BlockArrow | undefined {
  return arrows.find((arrow) => arrow.fromId === fromId && arrow.output === output);
}

describe('F-12 AC-013 output points by kind', () => {
  it.each([
    ['Start', start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', ''), ['next']],
    ['Agent', agent('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', ''), ['next']],
    ['Condition', condition('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', { to: '' }, { stop: true }), ['true', 'false']],
    ['End', end('b37d90e6-d1ca-536d-9a73-4137aeec6b9b'), []],
  ] as const)('F-12 AC-013 gives a %s its output points', (_kind, block, expected) => {
    expect(outputsOf(block)).toEqual(expected);
  });
});

describe('F-12 AC-013 input points by kind', () => {
  it.each([
    ['Start', start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', ''), false],
    ['Agent', agent('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', ''), true],
    ['Condition', condition('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', { to: '' }, { stop: true }), true],
    ['End', end('b37d90e6-d1ca-536d-9a73-4137aeec6b9b'), true],
  ] as const)('F-12 AC-013 has the input point the rule gives a %s', (_kind, block, expected) => {
    expect(hasInput(block)).toBe(expected);
  });
});

describe('F-12 AC-008 forward arrows', () => {
  it('F-12 AC-008 draws an arrow from each set output to its target', () => {
    const arrows = flowArrows(loopFlow());
    const next = arrowFrom(arrows, 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', 'next');
    expect(next).toEqual({
      fromId: 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b',
      output: 'next',
      toId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa',
      isReturn: false,
      roundLimit: null,
      branchLabel: null,
      roundsLabel: null,
    });
    expect(arrowFrom(arrows, '3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'next')?.toId).toBe('c2b443aa-3d75-5a54-8874-426073a3fc41');
  });

  it('F-12 AC-008 labels the true output of a Condition "true" and its false output "false"', () => {
    const arrows = flowArrows(loopFlow({ to: 'bf4df531-9a24-5612-8519-d9ed8b883586' }));
    expect(arrowFrom(arrows, 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'true')?.branchLabel).toBe('true');
    expect(arrowFrom(arrows, 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'false')?.branchLabel).toBe('false');
  });

  it('F-12 AC-008 draws a false route to a later block as a forward arrow with no round limit', () => {
    const arrows = flowArrows(loopFlow({ to: 'bf4df531-9a24-5612-8519-d9ed8b883586' }));
    const falseArrow = arrowFrom(arrows, 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'false');
    expect(falseArrow?.isReturn).toBe(false);
    expect(falseArrow?.roundLimit).toBeNull();
    expect(falseArrow?.roundsLabel).toBeNull();
  });
});

describe('F-12 AC-008 return arrows', () => {
  it('F-12 AC-008 marks a false route back to an earlier Agent as a return with its round limit and label', () => {
    const falseArrow = arrowFrom(flowArrows(loopFlow()), 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'false');
    expect(falseArrow).toEqual({
      fromId: 'c2b443aa-3d75-5a54-8874-426073a3fc41',
      output: 'false',
      toId: '3c045e8c-3b6a-5804-b19c-75424d4e43aa',
      isReturn: true,
      roundLimit: 3,
      branchLabel: 'false',
      roundsLabel: 'up to 3 rounds',
    });
  });

  it('F-12 AC-008 keeps a return with an unset round limit with no limit label', () => {
    const falseArrow = arrowFrom(flowArrows(loopFlow({ to: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' })), 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'false');
    expect(falseArrow?.isReturn).toBe(true);
    expect(falseArrow?.roundLimit).toBeNull();
    expect(falseArrow?.roundsLabel).toBeNull();
  });

  it('F-12 AC-008 writes the limit as "up to N rounds" for each limit from 1 to 5', () => {
    for (const limit of [1, 2, 3, 4, 5]) {
      const falseArrow = arrowFrom(flowArrows(loopFlow({ to: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', roundLimit: limit })), 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'false');
      expect(falseArrow?.roundsLabel).toBe(`up to ${limit} rounds`);
    }
  });

  it('F-12 AC-008 an arrow into an End runs forward when the End comes after its source in the arrow order', () => {
    const flow = flowWith([start('s1', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'), condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: '' }, { to: 'dc76d30c-c949-5210-9231-2848444c3d42' }), end('dc76d30c-c949-5210-9231-2848444c3d42')]);
    expect(arrowFrom(flowArrows(flow), '41c27e6a-36d4-5f15-bbb3-31419251d0ef', 'false')).toMatchObject({ toId: 'dc76d30c-c949-5210-9231-2848444c3d42', isReturn: false, roundLimit: null });
  });

  it('F-12 AC-008 an arrow into an End is a return when the End comes before its source in the arrow order', () => {
    // c1 reaches the End e1 first in the arrow order; c2, reached by c1's false route after e1, routes back to e1,
    // which is earlier, so c2's false route is a return.
    const flow = flowWith([
      start('s1', '41c27e6a-36d4-5f15-bbb3-31419251d0ef'),
      condition('41c27e6a-36d4-5f15-bbb3-31419251d0ef', { to: 'dc76d30c-c949-5210-9231-2848444c3d42' }, { to: '68c39d16-f241-5c87-ba5b-396054d60783' }),
      condition('68c39d16-f241-5c87-ba5b-396054d60783', { to: '' }, { to: 'dc76d30c-c949-5210-9231-2848444c3d42' }),
      end('dc76d30c-c949-5210-9231-2848444c3d42'),
    ]);
    expect(arrowFrom(flowArrows(flow), '68c39d16-f241-5c87-ba5b-396054d60783', 'false')).toMatchObject({ toId: 'dc76d30c-c949-5210-9231-2848444c3d42', isReturn: true, roundLimit: null });
  });

  it('F-12 AC-008 treats a link to the source block itself as a return', () => {
    const flow = flowWith([
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'),
      condition('3c045e8c-3b6a-5804-b19c-75424d4e43aa', { to: 'c2b443aa-3d75-5a54-8874-426073a3fc41' }, { to: '3c045e8c-3b6a-5804-b19c-75424d4e43aa' }),
      end('c2b443aa-3d75-5a54-8874-426073a3fc41'),
    ]);
    expect(arrowFrom(flowArrows(flow), '3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'false')?.isReturn).toBe(true);
  });
});

describe('F-12 AC-020 outputs with no arrow', () => {
  it('F-12 AC-020 draws no arrow from an empty next, an empty true route or a stop route', () => {
    const flow = flowWith([
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', ''),
      agent('3c045e8c-3b6a-5804-b19c-75424d4e43aa', ''),
      condition('c2b443aa-3d75-5a54-8874-426073a3fc41', { to: '' }, { stop: true }),
      end('bf4df531-9a24-5612-8519-d9ed8b883586'),
    ]);
    expect(flowArrows(flow)).toEqual([]);
  });

  it('F-12 AC-020 skips an arrow to a block that is not in the flow', () => {
    const flow = flowWith([start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', 'e7e460f1-2436-540b-a6bb-31ed944a43fe'), end('3c045e8c-3b6a-5804-b19c-75424d4e43aa')]);
    expect(flowArrows(flow)).toEqual([]);
  });

  it('F-12 AC-020 gives no arrows for an empty flow', () => {
    expect(flowArrows(flowWith())).toEqual([]);
  });
});

describe('F-12 AC-011 arrow panel data', () => {
  it.each([
    ['Start to Agent', 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', 'next', 'Start', 'planner'],
    ['Agent to Condition', '3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'next', 'planner', 'Condition: Check.'],
    ['Condition true to End', 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'true', 'Condition: Check.', 'End'],
  ] as const)('F-12 AC-011 names the source and target of %s', (_label, fromId, output, source, target) => {
    const flow = flowWith([
      start('b37d90e6-d1ca-536d-9a73-4137aeec6b9b', '3c045e8c-3b6a-5804-b19c-75424d4e43aa'),
      agent('3c045e8c-3b6a-5804-b19c-75424d4e43aa', 'c2b443aa-3d75-5a54-8874-426073a3fc41', 'planner'),
      condition('c2b443aa-3d75-5a54-8874-426073a3fc41', { to: 'bf4df531-9a24-5612-8519-d9ed8b883586' }, { to: '3c045e8c-3b6a-5804-b19c-75424d4e43aa', roundLimit: 2 }),
      end('bf4df531-9a24-5612-8519-d9ed8b883586'),
    ]);
    const arrow = arrowFrom(flowArrows(flow), fromId, output);
    expect(arrow).toBeDefined();
    if (arrow === undefined) {
      return;
    }
    expect(arrowPanel(flow, arrow)).toEqual({ source, target });
  });

  it('F-12 AC-011 falls back to the id for an Agent with a blank name', () => {
    expect(blockName(agent('bd340ac7-507d-5fab-92e1-ff4770993105', '', ''))).toBe('bd340ac7-507d-5fab-92e1-ff4770993105');
  });

  it('F-12 AC-011 names a Condition without a description plainly', () => {
    expect(blockName(condition('c2b443aa-3d75-5a54-8874-426073a3fc41', { to: '' }, { stop: true }, ''))).toBe('Condition');
  });

  it('F-12 AC-011 throws when the arrow names a block the flow does not have', () => {
    const flow = loopFlow();
    const arrow = arrowFrom(flowArrows(flow), 'b37d90e6-d1ca-536d-9a73-4137aeec6b9b', 'next');
    expect(arrow).toBeDefined();
    if (arrow === undefined) {
      return;
    }
    expect(() => arrowPanel(flowWith([end('bf4df531-9a24-5612-8519-d9ed8b883586')]), arrow)).toThrow(/names a block the flow does not have/);
  });
});

describe('F-12 AC-008 determinism', () => {
  it('F-12 AC-008 gives the same arrows for the same flow', () => {
    expect(flowArrows(loopFlow())).toEqual(flowArrows(loopFlow()));
  });
});
