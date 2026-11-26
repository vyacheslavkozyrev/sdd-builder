import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readBlocks } from '../../src/pipeline/parse/block.js';

const BLOCKS = 'pipeline.flows.0.blocks';
const validStart = { id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '6c0c9cc5-82a7-5b5c-afae-4c5d4133ac6e' };
const validAgent = {
  id: '82c969a4-365a-5525-8168-6ae1093b1867',
  kind: 'agent',
  name: 'review',
  description: 'Reviews the plan.',
  arguments: [],
  next: '626950d9-70e8-572f-b0a9-39fc463d5ec3',
};
const validCondition = {
  id: '6235136f-9021-5aaf-9958-4bc813c4d9b1',
  kind: 'condition',
  description: 'The tests pass.',
  true: { to: '626950d9-70e8-572f-b0a9-39fc463d5ec3' },
  false: { stop: true },
};
const validEnd = { id: '626950d9-70e8-572f-b0a9-39fc463d5ec3', kind: 'end', outcome: 'done', producedArtifact: 'Brief' };

function readB(value: unknown, path = BLOCKS) {
  const problems = createProblemCollector();
  const blocks = readBlocks(value, path, problems);
  return { blocks, problems: problems.list() };
}

describe('F-02 AC-040 a flow has at least two blocks', () => {
  it('refuses an empty list at the path of blocks', () => {
    expect(readB([])).toEqual({
      blocks: [],
      problems: [{ path: BLOCKS, message: 'must hold at least 2 blocks, got 0' }],
    });
  });

  it('refuses a list with one block at the path of blocks', () => {
    expect(readB([validStart])).toEqual({
      blocks: [{ ...validStart, index: 0 }],
      problems: [{ path: BLOCKS, message: 'must hold at least 2 blocks, got 1' }],
    });
  });

  it('accepts a list with two blocks', () => {
    expect(readB([validStart, validEnd])).toEqual({
      blocks: [{ ...validStart, index: 0 }, { ...validEnd, index: 1 }],
      problems: [],
    });
  });

  it('counts the listed items, so an invalid block does not cause a count refusal', () => {
    const invalid = { id: 'f816750f-bf56-554f-9106-e5f4c800be80', kind: 'end' };
    expect(readB([validStart, invalid])).toEqual({
      blocks: [{ ...validStart, index: 0 }],
      problems: [
        { path: `${BLOCKS}.1`, message: 'is missing the key outcome' },
      ],
    });
  });

  it('reports items that are not objects at their own paths and does not throw', () => {
    expect(readB([null, 'text', 3, []])).toEqual({
      blocks: [],
      problems: [
        { path: `${BLOCKS}.0`, message: 'must be an object, got null' },
        { path: `${BLOCKS}.1`, message: 'must be an object, got text' },
        { path: `${BLOCKS}.2`, message: 'must be an object, got a number' },
        { path: `${BLOCKS}.3`, message: 'must be an object, got a list' },
      ],
    });
  });

  it('refuses a value that is not a list, at the path of blocks', () => {
    expect(readB({ id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551' })).toEqual({
      blocks: undefined,
      problems: [{ path: BLOCKS, message: 'must be a list, got an object' }],
    });
  });
});

describe('F-02 AC-041 a block kind is start, agent, condition or end', () => {
  it.each([
    ['start', validStart],
    ['agent', validAgent],
    ['condition', validCondition],
    ['end', validEnd],
  ])('accepts a block of kind %s', (_kind, block) => {
    expect(readB([block, validEnd]).problems).toEqual([]);
  });

  it.each(['approval', 'check', 'connection', 'Agent', ''])(
    'refuses the kind %j at the path of kind',
    (kind) => {
      const block = { ...validStart, kind };
      expect(readB([block, validEnd])).toEqual({
        blocks: [{ ...validEnd, index: 1 }],
        problems: [
          {
            path: `${BLOCKS}.0.kind`,
            message: 'must be start, agent, condition or end, got text',
          },
        ],
      });
    },
  );

  it('refuses a kind that is not text, at the path of kind', () => {
    const block = { ...validStart, kind: 3 };
    expect(readB([block, validEnd]).problems).toEqual([
      { path: `${BLOCKS}.0.kind`, message: 'must be start, agent, condition or end, got a number' },
    ]);
  });
});

describe('F-02 AC-042 a block needs a kind and keeps only the keys of its kind', () => {
  it('refuses a block without a kind at the path of the block', () => {
    const block: Record<string, unknown> = { ...validStart };
    delete block.kind;
    expect(readB([block, validEnd])).toEqual({
      blocks: [{ ...validEnd, index: 1 }],
      problems: [{ path: `${BLOCKS}.0`, message: 'is missing the key kind' }],
    });
  });

  it('refuses a true route on an agent as an unknown key at its own path', () => {
    const block = { ...validAgent, true: { to: '626950d9-70e8-572f-b0a9-39fc463d5ec3' } };
    expect(readB([block, validEnd])).toEqual({
      blocks: [{ ...validEnd, index: 1 }],
      problems: [{ path: `${BLOCKS}.0.true`, message: 'has an unknown key true' }],
    });
  });

  it('refuses a roundLimit on a start as an unknown key at its own path', () => {
    const block = { ...validStart, roundLimit: 2 };
    expect(readB([block, validEnd])).toEqual({
      blocks: [{ ...validEnd, index: 1 }],
      problems: [{ path: `${BLOCKS}.0.roundLimit`, message: 'has an unknown key roundLimit' }],
    });
  });

  it('refuses an agent key on an end as an unknown key at its own path', () => {
    const block = { ...validEnd, name: 'review' };
    expect(readB([validStart, block])).toEqual({
      blocks: [{ ...validStart, index: 0 }],
      problems: [{ path: `${BLOCKS}.1.name`, message: 'has an unknown key name' }],
    });
  });
});

describe('F-02 AC-043 a block id follows the id rule', () => {
  it('refuses a block id with a space, at the path of id', () => {
    const block = { ...validStart, id: 'Frame Step' };
    expect(readB([block, validEnd]).problems).toEqual([
      { path: `${BLOCKS}.0.id`, message: expect.stringContaining('must be a GUID') },
    ]);
  });

  it('accepts a block id that is an id', () => {
    expect(readB([validStart, validEnd]).problems).toEqual([]);
  });
});

describe('F-02 blocks: the list keeps the blocks that parse, in order', () => {
  it('leaves out an invalid block and keeps the others in document order', () => {
    const invalid = { id: 'f816750f-bf56-554f-9106-e5f4c800be80', kind: 'end' };
    const result = readB([validStart, invalid, validEnd]);
    expect(result.blocks).toEqual([{ ...validStart, index: 0 }, { ...validEnd, index: 2 }]);
    expect(result.problems).toEqual([
      { path: `${BLOCKS}.1`, message: 'is missing the key outcome' },
    ]);
  });
});
