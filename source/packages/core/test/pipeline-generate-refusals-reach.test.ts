import { describe, expect, it } from 'vitest';
import {
  NEXT,
  STOP,
  agent,
  condition,
  configWith,
  end,
  flow,
  gate,
  pipelineEnd,
  pipelineStart,
  refusalOf,
  start,
  validFlow,
  type Row,
} from './pipeline-routes-fixtures.js';

describe('F-02 AC-005 every enabled block and flow is reachable from its Start', () => {
  const rows: Row[] = [
    {
      name: 'F-02 AC-005 refuses a flow that follows a gate that stops, naming it',
      blocks: [pipelineStart(), validFlow('a', [agent('a1')]), gate('g', STOP, STOP), validFlow('b', [agent('b1')]), pipelineEnd()],
      expected: ['pipeline.blocks[3]: flow "b" is not reachable from the pipeline Start'],
    },
    {
      name: 'F-02 AC-005 refuses a block that follows a condition that stops, naming it',
      blocks: [
        pipelineStart(),
        flow('a', [start('a-start'), agent('a1'), condition('c', STOP, STOP), agent('a2'), end('a-end')]),
        pipelineEnd(),
      ],
      expected: ['pipeline.blocks[1].blocks[3]: block "a2" is not reachable from the Start of flow "a"'],
    },
    {
      name: 'F-02 AC-005 accepts a block that a pass route reaches when the fail route stops',
      blocks: [
        pipelineStart(),
        flow('a', [start('a-start'), agent('a1'), condition('c', NEXT, STOP), agent('a2'), end('a-end')]),
        pipelineEnd(),
      ],
      expected: [],
    },
    {
      name: 'F-02 AC-005 accepts a disabled block placed after the End of its flow',
      blocks: [pipelineStart(), flow('a', [start('a-start'), agent('a1'), end('a-end'), agent('a2', false)]), pipelineEnd()],
      expected: [],
    },
    {
      name: 'F-02 AC-005 refuses an enabled block placed after the End of its flow, naming it',
      blocks: [pipelineStart(), flow('a', [start('a-start'), agent('a1'), end('a-end'), agent('a2')]), pipelineEnd()],
      expected: ['pipeline.blocks[1].blocks[3]: block "a2" is not reachable from the Start of flow "a"'],
    },
    {
      name: 'F-02 AC-005 refuses a stopped End that no stop route reaches, naming it',
      blocks: [
        pipelineStart(),
        flow('a', [start('a-start'), condition('c', NEXT, NEXT), agent('a1'), end('a-end'), { ...end('a-stopped'), outcome: 'stopped' }]),
        pipelineEnd(),
      ],
      expected: ['pipeline.blocks[1].blocks[4]: block "a-stopped" is not reachable from the Start of flow "a"'],
    },
    {
      name: 'F-02 AC-005 accepts a stopped End that the fail route of a Condition reaches',
      blocks: [
        pipelineStart(),
        flow('a', [start('a-start'), condition('c', NEXT, STOP), agent('a1'), end('a-end'), { ...end('a-stopped'), outcome: 'stopped' }]),
        pipelineEnd(),
      ],
      expected: [],
    },
    {
      name: 'F-02 AC-005 accepts a disabled flow that no route reaches',
      blocks: [pipelineStart(), validFlow('a', [agent('a1')]), gate('g', NEXT, STOP), validFlow('b', [agent('b1')], false), pipelineEnd()],
      expected: [],
    },
    {
      name: 'F-02 AC-005 does not treat a disabled condition as a route that stops',
      blocks: [pipelineStart(), validFlow('a', [condition('c', STOP, STOP, false), agent('a1')]), pipelineEnd()],
      expected: [],
    },
    {
      name: 'F-02 AC-005 does not treat a disabled gate as a route that stops',
      blocks: [pipelineStart(), validFlow('a', [agent('a1')]), gate('g', STOP, STOP, false), validFlow('b', [agent('b1')]), pipelineEnd()],
      expected: [],
    },
  ];
  it.each(rows)('$name', ({ blocks, expected }) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });
});
