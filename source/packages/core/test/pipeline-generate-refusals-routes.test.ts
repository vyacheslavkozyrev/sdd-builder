import { describe, expect, it } from 'vitest';
import type { Route } from '../src/pipeline/model.js';
import {
  NEXT,
  agent,
  back,
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

describe('F-02 AC-006 a back route goes to an earlier block of its flow, or to an earlier flow in the pipeline', () => {
  const flowTargets: Array<[string, string[]]> = [
    ['a1', ['pipeline.blocks[1].blocks[1]: back route to "a1" is not an earlier block of flow "a"']],
    ['c', ['pipeline.blocks[1].blocks[1]: back route to "c" is not an earlier block of flow "a"']],
    ['b1', ['pipeline.blocks[1].blocks[1]: back route to "b1" is not a block of flow "a"']],
    ['nowhere', ['pipeline.blocks[1].blocks[1]: back route to "nowhere" is not a block of flow "a"']],
    ['a-start', []],
  ];
  const flowRows: Row[] = flowTargets.map(([target, expected]) => ({
    name: `F-02 AC-006 flow back route to "${target}" is refused unless it is an earlier block of the flow`,
    blocks: [
      pipelineStart(),
      flow('a', [start('a-start'), condition('c', NEXT, back(target)), agent('a1'), agent('a2'), end('a-end')]),
      validFlow('b', [agent('b1')]),
      pipelineEnd(),
    ],
    expected,
  }));
  const pipelineTargets: Array<[string, string[]]> = [
    ['a', []],
    ['b', ['pipeline.blocks[2]: back route to "b" is not an earlier flow of the pipeline']],
    ['g', ['pipeline.blocks[2]: back route to "g" is not a flow of the pipeline']],
    ['a1', ['pipeline.blocks[2]: back route to "a1" is not a flow of the pipeline']],
    ['pipeline-end', ['pipeline.blocks[2]: back route to "pipeline-end" is not a flow of the pipeline']],
  ];
  const pipelineRows: Row[] = pipelineTargets.map(([target, expected]) => ({
    name: `F-02 AC-006 pipeline gate back route to "${target}" is refused unless it is an earlier flow`,
    blocks: [pipelineStart(), validFlow('a', [agent('a1')]), gate('g', NEXT, back(target)), validFlow('b', [agent('b1')]), pipelineEnd()],
    expected,
  }));
  it.each([...flowRows, ...pipelineRows])('$name', ({ blocks, expected }) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });
});

describe('F-02 AC-007 an enabled back route does not point into a disabled block or flow', () => {
  const positions: Array<[string, Route, Route]> = [
    ['pass', back('a1'), NEXT],
    ['fail', NEXT, back('a1')],
  ];
  const rows: Row[] = positions.map(([position, pass, fail]) => ({
    name: `F-02 AC-007 refuses an enabled ${position} route into a disabled block, naming the route`,
    blocks: [
      pipelineStart(),
      flow('a', [start('a-start'), agent('a1', false), agent('a2'), condition('c', pass, fail), end('a-end')]),
      pipelineEnd(),
    ],
    expected: ['pipeline.blocks[1].blocks[3]: back route to "a1" points into a disabled block'],
  }));
  rows.push({
    name: 'F-02 AC-007 refuses an enabled gate back route into a disabled flow, naming the route',
    blocks: [pipelineStart(), validFlow('a', [agent('a1')], false), validFlow('b', [agent('b1')]), gate('g', NEXT, back('a')), pipelineEnd()],
    expected: ['pipeline.blocks[3]: back route to "a" points into a disabled flow'],
  });
  it.each(rows)('$name', ({ blocks, expected }) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });
});

describe('F-02 AC-014 the routes of disabled blocks and flows are not checked', () => {
  const rows: Row[] = [
    {
      name: 'F-02 AC-014 accepts a disabled flow whose routes point nowhere',
      blocks: [
        pipelineStart(),
        validFlow('a', [agent('a1')]),
        gate('g', NEXT, { kind: 'stop' }),
        flow('x', [start('x-start'), condition('x-c', NEXT, back('nowhere')), end('x-end')], false),
        pipelineEnd(),
      ],
      expected: [],
    },
    {
      name: 'F-02 AC-014 accepts a disabled condition with a back route to a later block',
      blocks: [
        pipelineStart(),
        flow('a', [start('a-start'), condition('c', NEXT, back('a2'), false), agent('a1'), agent('a2'), end('a-end')]),
        pipelineEnd(),
      ],
      expected: [],
    },
    {
      name: 'F-02 AC-014 accepts a disabled gate with a back route to a later flow',
      blocks: [pipelineStart(), validFlow('a', [agent('a1')]), gate('g', NEXT, back('b'), false), validFlow('b', [agent('b1')]), pipelineEnd()],
      expected: [],
    },
  ];
  it.each(rows)('$name', ({ blocks, expected }) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });
});
