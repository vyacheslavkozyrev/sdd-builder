import { describe, expect, it } from 'vitest';
import { selectBlocks, type Selection } from '../src/pipeline/generate/select.js';
import type { ConnectionBlock, PipelineBlock } from '../src/pipeline/model.js';
import {
  NEXT,
  agent,
  configWith,
  end,
  flow,
  gate,
  pipelineEnd,
  pipelineStart,
  requiredGates,
  start,
  validFlow,
} from './pipeline-routes-fixtures.js';

/** A Connection between two blocks of one flow, or between two flows of the pipeline. */
function connection(id: string, from: string, to: string, enabled = true): ConnectionBlock {
  return { kind: 'connection', id, enabled, from, to, artifact: 'artifact' };
}

/** The selection as ids only, so each row reads as the order it expects. */
function idsOf(selection: Selection): { pipeline: string[]; flows: Array<[string, string[]]> } {
  return {
    pipeline: selection.pipeline.map((block) => block.id),
    flows: selection.flows.map((entry) => [entry.flow.id, entry.blocks.map((block) => block.id)]),
  };
}

interface Expected {
  pipeline: string[];
  flows: Array<[string, string[]]>;
}

interface Row {
  name: string;
  blocks: PipelineBlock[];
  expected: Expected;
}

/** The pipeline ids of the five required gates, in their order, followed by the pipeline End. */
const GATE_IDS = ['approve-stories', 'approve-screens', 'approve-plan', 'checks-built', 'approve-checklist'];
const TAIL_IDS = [...GATE_IDS, 'pipeline-end'];

const rows: Row[] = [
  {
    name: 'F-02 AC-015 a disabled flow produces no entry, and the gates around it are still selected',
    blocks: [
      pipelineStart(),
      flow('a', [start('a-start'), agent('a1'), end('a-end')], false),
      validFlow('b', [agent('b1')]),
      ...requiredGates(),
      pipelineEnd(),
    ],
    expected: {
      pipeline: ['pipeline-start', 'b', ...TAIL_IDS],
      flows: [['b', ['b-start', 'b1', 'b-end']]],
    },
  },
  {
    name: 'F-02 AC-015 enabled flows appear in pipeline order, not in the order of their ids',
    blocks: [pipelineStart(), validFlow('z', [agent('z1')]), validFlow('a', [agent('a1')]), ...requiredGates(), pipelineEnd()],
    expected: {
      pipeline: ['pipeline-start', 'z', 'a', ...TAIL_IDS],
      flows: [
        ['z', ['z-start', 'z1', 'z-end']],
        ['a', ['a-start', 'a1', 'a-end']],
      ],
    },
  },
  {
    name: 'F-02 AC-015 disabled blocks inside a flow produce nothing and enabled blocks keep their block order',
    blocks: [
      pipelineStart(),
      flow('a', [
        start('a-start'),
        agent('a3'),
        agent('a2', false),
        agent('a1'),
        connection('a-link', 'a1', 'a3', false),
        end('a-end'),
      ]),
      ...requiredGates(),
      pipelineEnd(),
    ],
    expected: {
      pipeline: ['pipeline-start', 'a', ...TAIL_IDS],
      flows: [['a', ['a-start', 'a3', 'a1', 'a-end']]],
    },
  },
  {
    name: 'F-02 AC-015 a disabled pipeline Connection produces nothing, and the flows on both sides stay selected',
    blocks: [
      pipelineStart(),
      validFlow('a', [agent('a1')]),
      connection('a-to-b', 'a', 'b', false),
      validFlow('b', [agent('b1')]),
      ...requiredGates(),
      pipelineEnd(),
    ],
    expected: {
      pipeline: ['pipeline-start', 'a', 'b', ...TAIL_IDS],
      flows: [
        ['a', ['a-start', 'a1', 'a-end']],
        ['b', ['b-start', 'b1', 'b-end']],
      ],
    },
  },
  {
    name: 'F-02 AC-016 a custom Agent block placed among default blocks is selected at its position',
    blocks: [
      pipelineStart(),
      flow('build', [start('build-start'), agent('implement'), agent('custom-lint'), agent('review'), end('build-end')]),
      ...requiredGates(),
      pipelineEnd(),
    ],
    expected: {
      pipeline: ['pipeline-start', 'build', ...TAIL_IDS],
      flows: [['build', ['build-start', 'implement', 'custom-lint', 'review', 'build-end']]],
    },
  },
  {
    name: 'F-02 AC-016 a disabled custom Agent block produces nothing and the default blocks keep their order',
    blocks: [
      pipelineStart(),
      flow('build', [start('build-start'), agent('implement'), agent('custom-lint', false), agent('review'), end('build-end')]),
      ...requiredGates(),
      pipelineEnd(),
    ],
    expected: {
      pipeline: ['pipeline-start', 'build', ...TAIL_IDS],
      flows: [['build', ['build-start', 'implement', 'review', 'build-end']]],
    },
  },
  {
    name: 'F-02 AC-015 an extra disabled Start or End in an enabled flow produces nothing, the enabled one is selected',
    blocks: [
      pipelineStart(),
      flow('a', [
        start('a-start'),
        { ...start('a-start-2'), enabled: false },
        agent('a1'),
        end('a-end'),
        { ...end('a-end-2'), enabled: false },
      ]),
      ...requiredGates(),
      pipelineEnd(),
    ],
    expected: {
      pipeline: ['pipeline-start', 'a', ...TAIL_IDS],
      flows: [['a', ['a-start', 'a1', 'a-end']]],
    },
  },
  {
    name: 'F-02 AC-015 a disabled gate between flows produces nothing (the refusal checks refuse it before selection runs)',
    blocks: [
      pipelineStart(),
      validFlow('a', [agent('a1')]),
      gate('approve-plan', NEXT, { kind: 'stop' }, false),
      validFlow('b', [agent('b1')]),
      ...requiredGates().filter((block) => block.id !== 'approve-plan'),
      pipelineEnd(),
    ],
    expected: {
      pipeline: ['pipeline-start', 'a', 'b', 'approve-stories', 'approve-screens', 'checks-built', 'approve-checklist', 'pipeline-end'],
      flows: [
        ['a', ['a-start', 'a1', 'a-end']],
        ['b', ['b-start', 'b1', 'b-end']],
      ],
    },
  },
  {
    name: 'F-02 AC-017 an enabled flow with no enabled blocks other than Start and End keeps only those two',
    blocks: [pipelineStart(), validFlow('a', [agent('a1', false), agent('a2', false)]), ...requiredGates(), pipelineEnd()],
    expected: {
      pipeline: ['pipeline-start', 'a', ...TAIL_IDS],
      flows: [['a', ['a-start', 'a-end']]],
    },
  },
  {
    name: 'F-02 AC-017 the pipeline Start and End and the five gates are selected in pipeline order',
    blocks: [pipelineStart(), validFlow('a', [agent('a1')]), ...requiredGates(), pipelineEnd()],
    expected: {
      pipeline: ['pipeline-start', 'a', ...TAIL_IDS],
      flows: [['a', ['a-start', 'a1', 'a-end']]],
    },
  },
  {
    name: 'F-02 AC-017 a gate between flows is selected when the flow before it is disabled',
    blocks: [
      pipelineStart(),
      validFlow('a', [agent('a1')], false),
      gate('approve-plan', NEXT, { kind: 'stop' }),
      validFlow('b', [agent('b1')]),
      pipelineEnd(),
    ],
    expected: {
      pipeline: ['pipeline-start', 'approve-plan', 'b', 'pipeline-end'],
      flows: [['b', ['b-start', 'b1', 'b-end']]],
    },
  },
];

describe('F-02 AC-015, AC-016, AC-017 selection keeps enabled blocks in order, selects custom blocks like defaults, and always selects Start, End and gates', () => {
  it.each(rows)('$name', ({ blocks, expected }) => {
    expect(idsOf(selectBlocks(configWith(blocks)))).toEqual(expected);
  });

  it('F-02 AC-015 gives the same selection for the same config on every call', () => {
    const config = configWith(rows[1]!.blocks);
    expect(selectBlocks(config)).toEqual(selectBlocks(config));
  });
});
