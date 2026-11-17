import { describe, expect, it } from 'vitest';
import { createProblems } from '../../src/pipeline/check/primitives.js';
import { parseBlock } from '../../src/pipeline/parse/block.js';

const AT = 'blocks[0]';

function run(value: unknown) {
  const problems = createProblems();
  const block = parseBlock(value, AT, problems);
  return { block, paths: problems.list.map((problem) => problem.path) };
}

function start(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'begin', kind: 'start', ...overrides };
}

function approval(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'review', kind: 'approval', description: 'Owner reviews the spec', ...overrides };
}

function end(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'finish', kind: 'end', outcome: 'done', ...overrides };
}

describe('F-02 AC-009 the block kinds start, approval and end are accepted', () => {
  it.each([
    { label: 'start', value: start() },
    { label: 'approval', value: approval() },
    { label: 'end', value: end() },
  ])('F-02 AC-009 accepts a $label block and returns it typed', ({ value }) => {
    expect(run(value)).toEqual({ block: value, paths: [] });
  });
});

describe('F-02 AC-009 any other kind is refused with the path of kind', () => {
  it.each([
    { label: 'connection', value: 'connection' },
    { label: 'an unknown word', value: 'gate' },
    { label: 'a capitalised kind', value: 'Start' },
    { label: 'an empty string', value: '' },
    { label: 'a number', value: 3 },
    { label: 'null', value: null },
  ])('F-02 AC-009 refuses kind $label', ({ value }) => {
    expect(run(start({ kind: value }))).toEqual({ block: undefined, paths: [`${AT}.kind`] });
  });

  it('F-02 AC-009 refuses a block with no kind, at the path of kind', () => {
    const value = start();
    delete value['kind'];
    expect(run(value)).toEqual({ block: undefined, paths: [`${AT}.kind`] });
  });
});

describe('F-02 AC-004 a block refuses unknown keys, named by their path', () => {
  it('F-02 AC-004 names an unknown key on a start block', () => {
    expect(run(start({ extra: 1 })).paths).toEqual([`${AT}.extra`]);
  });

  it('F-02 AC-004 names an unknown key on an approval block', () => {
    expect(run(approval({ extra: 1 })).paths).toEqual([`${AT}.extra`]);
  });

  it('F-02 AC-004 names an unknown key on an end block', () => {
    expect(run(end({ extra: 1 })).paths).toEqual([`${AT}.extra`]);
  });

  it('F-02 AC-004 reports every problem of a block in document order', () => {
    expect(run(end({ outcome: 'failed', extra: 1, id: 'Bad' })).paths).toEqual([
      `${AT}.id`,
      `${AT}.outcome`,
      `${AT}.extra`,
    ]);
  });

  it.each([
    { label: 'null', value: null },
    { label: 'an array', value: [start()] },
    { label: 'a string', value: 'start' },
    { label: 'undefined', value: undefined },
  ])('F-02 AC-004 refuses a block that is $label, at the block path', ({ value }) => {
    expect(run(value)).toEqual({ block: undefined, paths: [AT] });
  });
});

describe('F-02 AC-005 an End refuses connectedTo', () => {
  it('F-02 AC-005 refuses connectedTo on an End, at its path', () => {
    expect(run(end({ connectedTo: { to: 'review', label: 'spec' } }))).toEqual({
      block: undefined,
      paths: [`${AT}.connectedTo`],
    });
  });
});

describe('F-02 AC-011 an Approval needs a non-blank description', () => {
  it.each([
    { label: 'an empty text', value: '' },
    { label: 'a blank text', value: '   ' },
    { label: 'a number', value: 7 },
    { label: 'null', value: null },
  ])('F-02 AC-011 refuses a description that is $label, with its path', ({ value }) => {
    expect(run(approval({ description: value }))).toEqual({
      block: undefined,
      paths: [`${AT}.description`],
    });
  });

  it('F-02 AC-011 refuses a missing description, with its path', () => {
    const value = approval();
    delete value['description'];
    expect(run(value)).toEqual({ block: undefined, paths: [`${AT}.description`] });
  });
});

describe('F-02 AC-014 an End needs an outcome of done or stopped', () => {
  it.each([{ value: 'done' }, { value: 'stopped' }])(
    'F-02 AC-014 accepts the outcome $value',
    ({ value }) => {
      expect(run(end({ outcome: value }))).toEqual({ block: end({ outcome: value }), paths: [] });
    },
  );

  it.each([
    { label: 'another word', value: 'failed' },
    { label: 'a capitalised word', value: 'Done' },
    { label: 'an empty text', value: '' },
    { label: 'a number', value: 1 },
    { label: 'null', value: null },
  ])('F-02 AC-014 refuses an outcome that is $label, with its path', ({ value }) => {
    expect(run(end({ outcome: value }))).toEqual({ block: undefined, paths: [`${AT}.outcome`] });
  });

  it('F-02 AC-014 refuses a missing outcome, with its path', () => {
    const value = end();
    delete value['outcome'];
    expect(run(value)).toEqual({ block: undefined, paths: [`${AT}.outcome`] });
  });

  it('F-02 AC-014 accepts an end without producedArtifact and returns no such key', () => {
    const result = run(end());
    expect(result.paths).toEqual([]);
    expect(result.block).not.toHaveProperty('producedArtifact');
  });

  it('F-02 AC-014 accepts producedArtifact as text', () => {
    expect(run(end({ producedArtifact: 'spec/specifications/F-02/stories.md' }))).toEqual({
      block: end({ producedArtifact: 'spec/specifications/F-02/stories.md' }),
      paths: [],
    });
  });

  it.each([
    { label: 'an empty text', value: '' },
    { label: 'a blank text', value: '  ' },
  ])(
    'F-02 AC-014 accepts producedArtifact that is $label (optional text, not non-blank text)',
    ({ value }) => {
      expect(run(end({ producedArtifact: value }))).toEqual({
        block: end({ producedArtifact: value }),
        paths: [],
      });
    },
  );

  it.each([
    { label: 'a number', value: 4 },
    { label: 'null', value: null },
  ])('F-02 AC-014 refuses producedArtifact that is $label, with its path', ({ value }) => {
    expect(run(end({ producedArtifact: value }))).toEqual({
      block: undefined,
      paths: [`${AT}.producedArtifact`],
    });
  });
});

describe('F-02 AC-021 a block id is checked with the id rule', () => {
  it('F-02 AC-021 accepts a block id with lowercase letters, digits and hyphens', () => {
    expect(run(start({ id: 'begin-2' }))).toEqual({ block: start({ id: 'begin-2' }), paths: [] });
  });

  it.each([
    { label: 'an uppercase letter', value: 'Begin' },
    { label: 'a leading digit', value: '1begin' },
    { label: 'an underscore', value: 'begin_me' },
    { label: 'a space', value: 'begin me' },
    { label: 'a dot', value: 'begin.me' },
    { label: 'an empty text', value: '' },
  ])('F-02 AC-021 refuses a block id with $label, with its path', ({ value }) => {
    expect(run(start({ id: value }))).toEqual({ block: undefined, paths: [`${AT}.id`] });
  });
});
