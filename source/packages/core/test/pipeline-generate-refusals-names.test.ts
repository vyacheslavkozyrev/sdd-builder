// F-02 AC-008, AC-009, AC-011 and AC-013: names, clashes, Condition checks and advice.
import { describe, expect, it } from 'vitest';
import { ID_MESSAGE } from '../src/pipeline/ids.js';
import { generate } from '../src/pipeline/index.js';
import type { ConditionBlock, ConnectionBlock, PipelineBlock, PipelineConditionBlock } from '../src/pipeline/model.js';
import { templateSourceFromRecord } from '../src/template-source.js';
import {
  NEXT,
  STOP,
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

const TEMPLATES = templateSourceFromRecord({});

function connection(id: string, from: string, to: string): ConnectionBlock {
  return { kind: 'connection', id, enabled: true, from, to, artifact: 'note' };
}

/** The five gates of the default pipeline, in their order, each passing on and stopping on fail. */
function requiredGates(): PipelineConditionBlock[] {
  return ['approve-stories', 'approve-screens', 'approve-plan', 'checks-built', 'approve-checklist'].map((id) =>
    gate(id, NEXT, STOP),
  );
}

/** A Condition with a check type and extra keys that the model does not allow, as a config built in code could have. */
function withCheck(checkType: unknown, extra: Record<string, unknown> = {}): ConditionBlock {
  return { ...condition('c', NEXT, STOP), ...extra, checkType } as unknown as ConditionBlock;
}

/** The gates of the default pipeline with one of them replaced. */
function gatesWith(replacement: PipelineBlock): PipelineBlock[] {
  return requiredGates().map((block) => (block.id === replacement.id ? replacement : block));
}

describe('F-02 AC-008 an id is file-safe and unique across flows, blocks and arguments, and an agent name is unique', () => {
  const badIds = ['Specify', 'my_flow', '1flow', 'a b', 'ünïcode', ''];
  const rows: Row[] = badIds.map((id) => ({
    name: `F-02 AC-008 refuses the flow id "${id}", which is not file-safe`,
    blocks: [pipelineStart(), flow(id, [start('s-start'), agent('s-agent'), end('s-end')]), ...requiredGates(), pipelineEnd()],
    expected: [`pipeline.blocks[1].id: ${ID_MESSAGE}`],
  }));
  rows.push(
    {
      name: 'F-02 AC-008 refuses a block id that is not file-safe, at its own path',
      blocks: [pipelineStart(), validFlow('specify', [{ ...agent('Build'), name: 'build' }]), ...requiredGates(), pipelineEnd()],
      expected: [`pipeline.blocks[1].blocks[1].id: ${ID_MESSAGE}`],
    },
    {
      name: 'F-02 AC-008 refuses an agent name that is not file-safe',
      blocks: [pipelineStart(), validFlow('specify', [{ ...agent('specify-agent'), name: 'Spec Agent' }]), ...requiredGates(), pipelineEnd()],
      expected: [`pipeline.blocks[1].blocks[1].name: ${ID_MESSAGE}`],
    },
    {
      name: 'F-02 AC-008 refuses an argument name that is not file-safe',
      blocks: [
        { ...pipelineStart(), arguments: [{ name: 'Feature_ID', required: true, hint: 'The feature' }] },
        validFlow('specify', [agent('specify-agent')]),
        ...requiredGates(),
        pipelineEnd(),
      ],
      expected: [`pipeline.blocks[0].arguments[0].name: ${ID_MESSAGE}`],
    },
    {
      name: 'F-02 AC-008 names both paths when a child block repeats the id of its own flow',
      blocks: [
        pipelineStart(),
        flow('specify', [start('specify-start'), agent('specify'), end('specify-end')]),
        ...requiredGates(),
        pipelineEnd(),
      ],
      expected: [
        'pipeline.blocks[1].blocks[1].id: "specify" is used more than once; also at pipeline.blocks[1].id',
        'pipeline.blocks[1].id: "specify" is used more than once; also at pipeline.blocks[1].blocks[1].id',
      ],
    },
    {
      name: 'F-02 AC-008 names every flow that repeats a flow id',
      blocks: [
        pipelineStart(),
        flow('specify', [start('s1'), end('e1')]),
        flow('specify', [start('s2'), end('e2')]),
        ...requiredGates(),
        pipelineEnd(),
      ],
      expected: [
        'pipeline.blocks[1].id: "specify" is used more than once; also at pipeline.blocks[2].id',
        'pipeline.blocks[2].id: "specify" is used more than once; also at pipeline.blocks[1].id',
      ],
    },
    {
      name: 'F-02 AC-008 names the Start block and the argument when an argument repeats a block id',
      blocks: [
        { ...pipelineStart(), arguments: [{ name: 'specify-start', required: true, hint: 'The feature' }] },
        validFlow('specify', [agent('specify-agent')]),
        ...requiredGates(),
        pipelineEnd(),
      ],
      expected: [
        'pipeline.blocks[0].arguments[0].name: "specify-start" is used more than once; also at pipeline.blocks[1].blocks[0].id',
        'pipeline.blocks[1].blocks[0].id: "specify-start" is used more than once; also at pipeline.blocks[0].arguments[0].name',
      ],
    },
    {
      name: 'F-02 AC-008 refuses two agents with the same name, naming both paths',
      blocks: [
        pipelineStart(),
        validFlow('specify', [{ ...agent('specify-review'), name: 'review' }]),
        validFlow('ux', [{ ...agent('ux-review'), name: 'review' }]),
        ...requiredGates(),
        pipelineEnd(),
      ],
      expected: [
        'pipeline.blocks[1].blocks[1].name: "review" is used more than once; also at pipeline.blocks[2].blocks[1].name',
        'pipeline.blocks[2].blocks[1].name: "review" is used more than once; also at pipeline.blocks[1].blocks[1].name',
      ],
    },
    {
      name: 'F-02 AC-008 accepts an agent name that equals a block id, since agent names are their own namespace',
      blocks: [
        pipelineStart(),
        validFlow('specify', [{ ...agent('specify-agent'), name: 'specify' }]),
        ...requiredGates(),
        pipelineEnd(),
      ],
      expected: [],
    },
  );
  it.each(rows)('$name', ({ blocks, expected }) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });
});

describe('F-02 AC-009 a custom block whose id clashes with another id is refused, naming every clashing path', () => {
  // A custom block is an Agent block that the default pipeline does not hold (architecture.md decision 8).
  const rows: Row[] = [
    {
      name: 'F-02 AC-009 refuses a custom agent whose id is the id of a gate, naming both',
      blocks: [pipelineStart(), validFlow('build', [agent('approve-plan')]), ...requiredGates(), pipelineEnd()],
      expected: [
        'pipeline.blocks[1].blocks[1].id: "approve-plan" is used more than once; also at pipeline.blocks[4].id',
        'pipeline.blocks[4].id: "approve-plan" is used more than once; also at pipeline.blocks[1].blocks[1].id',
      ],
    },
    {
      name: 'F-02 AC-009 refuses a custom agent whose id is an argument name, naming both',
      blocks: [
        { ...pipelineStart(), arguments: [{ name: 'feature-id', required: true, hint: 'The feature' }] },
        validFlow('build', [agent('feature-id')]),
        ...requiredGates(),
        pipelineEnd(),
      ],
      expected: [
        'pipeline.blocks[0].arguments[0].name: "feature-id" is used more than once; also at pipeline.blocks[1].blocks[1].id',
        'pipeline.blocks[1].blocks[1].id: "feature-id" is used more than once; also at pipeline.blocks[0].arguments[0].name',
      ],
    },
    {
      name: 'F-02 AC-009 refuses a custom agent whose id is a Connection id in another flow, naming both',
      blocks: [
        pipelineStart(),
        validFlow('specify', [agent('specify-agent'), connection('link', 'specify-agent', 'specify-end')]),
        validFlow('ux', [agent('link')]),
        ...requiredGates(),
        pipelineEnd(),
      ],
      expected: [
        'pipeline.blocks[1].blocks[2].id: "link" is used more than once; also at pipeline.blocks[2].blocks[1].id',
        'pipeline.blocks[2].blocks[1].id: "link" is used more than once; also at pipeline.blocks[1].blocks[2].id',
      ],
    },
    {
      name: 'F-02 AC-009 accepts a custom agent with an id that no other block uses',
      blocks: [pipelineStart(), validFlow('build', [agent('build-lint')]), ...requiredGates(), pipelineEnd()],
      expected: [],
    },
  ];
  it.each(rows)('$name', ({ blocks, expected }) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });
});

describe('F-02 AC-014 a disabled block or flow is not checked for ids, names or clashes', () => {
  const rows: Row[] = [
    {
      name: 'F-02 AC-014 does not refuse a disabled flow whose id is not file-safe',
      blocks: [pipelineStart(), flow('Specify', [start('s-start'), agent('specify-agent'), end('s-end')], false), ...requiredGates(), pipelineEnd()],
      expected: [],
    },
    {
      name: 'F-02 AC-014 does not refuse a disabled flow whose agent name repeats an enabled agent name',
      blocks: [
        pipelineStart(),
        validFlow('specify', [{ ...agent('specify-agent'), name: 'review' }]),
        validFlow('ux', [{ ...agent('ux-agent'), name: 'review' }], false),
        ...requiredGates(),
        pipelineEnd(),
      ],
      expected: [],
    },
    {
      name: 'F-02 AC-014 does not refuse a disabled child block whose id repeats an enabled id',
      blocks: [pipelineStart(), validFlow('build', [agent('build-lint'), { ...agent('build-lint'), enabled: false }]), ...requiredGates(), pipelineEnd()],
      expected: [],
    },
    {
      name: 'F-02 AC-014 does not refuse a disabled custom block whose id clashes with a gate',
      blocks: [pipelineStart(), validFlow('build', [{ ...agent('approve-plan'), enabled: false }]), ...requiredGates(), pipelineEnd()],
      expected: [],
    },
    {
      name: 'F-02 AC-014 does not refuse a disabled pipeline block whose id is not file-safe',
      blocks: [pipelineStart(), validFlow('build', [agent('build-lint')]), ...requiredGates(), { ...connection('Link', 'build', 'approve-plan'), enabled: false }, pipelineEnd()],
      expected: [],
    },
  ];
  it.each(rows)('$name', ({ blocks, expected }) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });
});

describe('F-02 AC-011 a Condition has a fixed check type, and a threshold only for diff-size, a whole number of at least 1', () => {
  const inFlow = (block: ConditionBlock): PipelineBlock[] => [
    pipelineStart(),
    validFlow('build', [agent('build-implement'), block]),
    ...requiredGates(),
    pipelineEnd(),
  ];
  const at = 'pipeline.blocks[1].blocks[2]';
  const rows: Array<{ name: string; block: ConditionBlock; expected: string[] }> = [
    {
      name: 'refuses a check type outside the four fixed values',
      block: withCheck('lint'),
      expected: [`${at}: Condition "c" has a check type outside approval, checks, review, diff-size`],
    },
    {
      name: 'refuses a diff-size Condition with no threshold',
      block: withCheck('diff-size'),
      expected: [`${at}: Condition "c" is diff-size and has no threshold; it must be a whole number of at least 1`],
    },
    {
      name: 'refuses a diff-size threshold of 0',
      block: withCheck('diff-size', { threshold: 0 }),
      expected: [`${at}: Condition "c" threshold must be a whole number of at least 1`],
    },
    {
      name: 'refuses a negative diff-size threshold',
      block: withCheck('diff-size', { threshold: -3 }),
      expected: [`${at}: Condition "c" threshold must be a whole number of at least 1`],
    },
    {
      name: 'refuses a diff-size threshold that is not a whole number',
      block: withCheck('diff-size', { threshold: 1.5 }),
      expected: [`${at}: Condition "c" threshold must be a whole number of at least 1`],
    },
    {
      name: 'refuses a diff-size threshold that is NaN',
      block: withCheck('diff-size', { threshold: Number.NaN }),
      expected: [`${at}: Condition "c" threshold must be a whole number of at least 1`],
    },
    {
      name: 'refuses a diff-size threshold that is infinite',
      block: withCheck('diff-size', { threshold: Number.POSITIVE_INFINITY }),
      expected: [`${at}: Condition "c" threshold must be a whole number of at least 1`],
    },
    {
      name: 'refuses a diff-size threshold that is a string',
      block: withCheck('diff-size', { threshold: '400' }),
      expected: [`${at}: Condition "c" threshold must be a whole number of at least 1`],
    },
    {
      name: 'refuses a threshold on an approval Condition',
      block: withCheck('approval', { threshold: 400 }),
      expected: [`${at}: Condition "c" is approval and has a threshold; only diff-size takes one`],
    },
    {
      name: 'refuses a threshold on a review Condition',
      block: withCheck('review', { threshold: 1 }),
      expected: [`${at}: Condition "c" is review and has a threshold; only diff-size takes one`],
    },
    {
      name: 'accepts a diff-size threshold of 1',
      block: withCheck('diff-size', { threshold: 1 }),
      expected: [],
    },
    {
      name: 'accepts a diff-size threshold of 400, as the default pipeline has',
      block: withCheck('diff-size', { threshold: 400 }),
      expected: [],
    },
    {
      name: 'accepts a checks Condition with no threshold',
      block: withCheck('checks'),
      expected: [],
    },
  ];
  it.each(rows)('F-02 AC-011 $name', ({ block, expected }) => {
    expect(refusalOf(configWith(inFlow(block)))).toEqual(expected);
  });

  it('F-02 AC-011 refuses a check type outside the fixed values on a pipeline gate, naming its path', () => {
    const config = configWith([
      pipelineStart(),
      validFlow('specify', [agent('specify-agent')]),
      ...gatesWith({ ...withCheck('lint'), id: 'approve-plan', onConnection: 'a-to-b' }),
      pipelineEnd(),
    ]);
    expect(refusalOf(config)).toEqual(['pipeline.blocks[4]: Condition "approve-plan" has a check type outside approval, checks, review, diff-size']);
  });

  it('F-02 AC-011 skips the check of a disabled Condition, as AC-014 requires', () => {
    expect(refusalOf(configWith(inFlow({ ...withCheck('lint'), enabled: false })))).toEqual([]);
  });
});

describe('F-02 AC-013 advice does not refuse: a retry with no round limit and an agent with no upstream producer generate', () => {
  it('F-02 AC-013 accepts a back route with no round limit', () => {
    const config = configWith([
      pipelineStart(),
      validFlow('build', [agent('build-implement'), condition('build-review', NEXT, back('build-implement'))]),
      ...requiredGates(),
      pipelineEnd(),
    ]);
    expect(refusalOf(config)).toEqual([]);
  });

  it('F-02 AC-013 accepts an agent that no Connection feeds, and does not refuse generation', () => {
    const config = configWith([
      pipelineStart(),
      validFlow('verify', [agent('verify-agent')]),
      ...requiredGates(),
      pipelineEnd(),
    ]);
    expect(refusalOf(config)).toEqual([]);
    expect(() => generate(config, TEMPLATES)).not.toThrow();
  });
});
