import { describe, expect, it } from 'vitest';
import {
  argumentList,
  flowStepList,
  pipelineStepList,
  routeRuleList,
} from '../src/pipeline/generate/command-layouts.js';
import type {
  ChildBlock,
  ConditionBlock,
  ConnectionBlock,
  PipelineBlock,
  PipelineStartBlock,
} from '../src/pipeline/model.js';
import {
  agent,
  back,
  condition,
  end,
  flow,
  gate,
  NEXT,
  pipelineEnd,
  pipelineStart,
  start,
  STOP,
} from './pipeline-routes-fixtures.js';

/** A condition with a round limit, for the route rules that name one. */
function limited(block: ConditionBlock, roundLimit: number): ConditionBlock {
  return { ...block, roundLimit };
}

/** A connection that hands `artifact` from one block to another. */
function connection(id: string, from: string, to: string, enabled = true): ConnectionBlock {
  return { kind: 'connection', id, enabled, from, to, artifact: 'the spec' };
}

describe('F-03 AC-005 flowStepList numbers the enabled blocks of a flow in block order', () => {
  const rows: Array<{ name: string; blocks: ChildBlock[]; expected: string[] }> = [
    {
      name: 'every block enabled: one step each, in block order',
      blocks: [start('a-start'), agent('a1'), condition('c1', NEXT, STOP), end('a-end')],
      expected: [
        '1. Start the flow (`a-start`).',
        '2. Run the agent in `.claude/agents/a1.md`, once per task (`a1`).',
        '3. Check checks, decided by agent (`c1`). On pass, continue to the next step. On fail, stop the process.',
        '4. End the flow with outcome done (`a-end`).',
      ],
    },
    {
      name: 'a disabled agent is not listed and the numbers stay consecutive (negative case)',
      blocks: [start('a-start'), agent('a1', false), end('a-end')],
      expected: ['1. Start the flow (`a-start`).', '2. End the flow with outcome done (`a-end`).'],
    },
    {
      name: 'a disabled condition is not listed (negative case)',
      blocks: [start('a-start'), condition('c1', NEXT, STOP, false), agent('a1'), end('a-end')],
      expected: [
        '1. Start the flow (`a-start`).',
        '2. Run the agent in `.claude/agents/a1.md`, once per task (`a1`).',
        '3. End the flow with outcome done (`a-end`).',
      ],
    },
    {
      name: 'a connection between two enabled blocks names both ends',
      blocks: [start('a-start'), agent('a1'), connection('k1', 'a-start', 'a1'), end('a-end')],
      expected: [
        '1. Start the flow (`a-start`).',
        '2. Run the agent in `.claude/agents/a1.md`, once per task (`a1`).',
        '3. Hand over the spec from `a-start` to `a1` (`k1`).',
        '4. End the flow with outcome done (`a-end`).',
      ],
    },
    {
      name: 'a connection to a disabled block names the artifact only and no disabled id (negative case)',
      blocks: [start('a-start'), agent('a1', false), connection('k1', 'a1', 'a-end'), end('a-end')],
      expected: [
        '1. Start the flow (`a-start`).',
        '2. Hand over the spec (`k1`).',
        '3. End the flow with outcome done (`a-end`).',
      ],
    },
  ];

  it.each(rows)('F-03 AC-005 $name', ({ blocks, expected }) => {
    expect(flowStepList(flow('a', blocks))).toBe(expected.join('\n'));
  });
});

describe('F-03 AC-005 pipelineStepList lists the enabled flows and checks in pipeline order', () => {
  const rows: Array<{ name: string; blocks: PipelineBlock[]; expected: string[] }> = [
    {
      name: 'an enabled flow and an enabled gate, in pipeline order',
      blocks: [
        pipelineStart(),
        flow('a', [start('a-start')]),
        gate('g1', NEXT, STOP),
        flow('c', [start('c-start')]),
        pipelineEnd(),
      ],
      expected: [
        '1. Run the flow `a flow` (`a`), following `.claude/commands/a.md`.',
        '2. Check checks, decided by agent (`g1`).',
        '3. Run the flow `c flow` (`c`), following `.claude/commands/c.md`.',
      ],
    },
    {
      name: 'a disabled flow is not listed (negative case)',
      blocks: [pipelineStart(), flow('a', [start('a-start')]), flow('b', [start('b-start')], false), pipelineEnd()],
      expected: ['1. Run the flow `a flow` (`a`), following `.claude/commands/a.md`.'],
    },
    {
      name: 'a disabled gate is not listed (negative case)',
      blocks: [pipelineStart(), gate('g1', NEXT, STOP, false), flow('a', [start('a-start')]), pipelineEnd()],
      expected: ['1. Run the flow `a flow` (`a`), following `.claude/commands/a.md`.'],
    },
  ];

  it.each(rows)('F-03 AC-005 $name', ({ blocks, expected }) => {
    expect(pipelineStepList(blocks)).toBe(expected.join('\n'));
  });
});

describe('F-03 AC-006 routeRuleList names the target block and the round limit of each back route', () => {
  const rows: Array<{ name: string; blocks: Array<ChildBlock | PipelineBlock>; expected: string[] }> = [
    {
      name: 'a back route on pass with a round limit names the target and the limit',
      blocks: [limited(condition('c1', back('implement'), NEXT), 2)],
      expected: ['1. On pass, go back to `implement` and run again from there; round limit 2.'],
    },
    {
      name: 'a back route with no round limit says "no limit set"',
      blocks: [condition('c1', NEXT, back('implement'))],
      expected: ['1. On fail, go back to `implement` and run again from there; no limit set.'],
    },
    {
      name: 'back routes on both outcomes give one rule each, pass first',
      blocks: [limited(condition('c1', back('plan'), back('implement')), 3)],
      expected: [
        '1. On pass, go back to `plan` and run again from there; round limit 3.',
        '2. On fail, go back to `implement` and run again from there; round limit 3.',
      ],
    },
    {
      name: 'an outcome with no back route gets no rule (negative case)',
      blocks: [limited(condition('c1', back('implement'), STOP), 1)],
      expected: ['1. On pass, go back to `implement` and run again from there; round limit 1.'],
    },
    {
      name: 'a disabled condition with a back route gives no rule (negative case)',
      blocks: [condition('c1', back('implement'), NEXT, false)],
      expected: ['There are no back routes.'],
    },
    {
      name: 'a pipeline gate with a back route is read as a check',
      blocks: [pipelineStart(), gate('g1', back('a'), STOP), pipelineEnd()],
      expected: ['1. On pass, go back to `a` and run again from there; no limit set.'],
    },
    {
      name: 'no back route at all says so',
      blocks: [agent('a1'), condition('c1', NEXT, STOP)],
      expected: ['There are no back routes.'],
    },
  ];

  it.each(rows)('F-03 AC-006 $name', ({ blocks, expected }) => {
    expect(routeRuleList(blocks)).toBe(expected.join('\n'));
  });
});

describe('F-03 AC-005 argumentList lists the arguments of the pipeline Start block', () => {
  const withArguments: PipelineStartBlock = {
    kind: 'start',
    id: 'pipeline-start',
    enabled: true,
    arguments: [
      { name: 'featureName', required: true, hint: 'the first feature' },
      { name: 'note', required: false, hint: 'a note' },
    ],
  };
  const rows: Array<{ name: string; start: PipelineStartBlock; expected: string }> = [
    {
      name: 'no arguments: a line saying the pipeline takes none',
      start: pipelineStart(),
      expected: 'This pipeline takes no arguments.',
    },
    {
      name: 'two arguments: one line each with its required flag',
      start: withArguments,
      expected: '- `featureName` (required)\n- `note` (optional)',
    },
  ];

  it.each(rows)('F-03 AC-005 $name', ({ start, expected }) => {
    expect(argumentList(start)).toBe(expected);
  });
});
