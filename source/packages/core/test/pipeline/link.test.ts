import { describe, expect, it } from 'vitest';
import { createProblems } from '../../src/pipeline/check/primitives.js';
import { parseBlock } from '../../src/pipeline/parse/block.js';
import { parseBlockLink, parseRoute } from '../../src/pipeline/parse/link.js';

const AT = 'blocks[0].connectedTo';

function runLink(value: unknown) {
  const problems = createProblems();
  const link = parseBlockLink(value, AT, problems);
  return { link, paths: problems.list.map((problem) => problem.path) };
}

function runRoute(value: unknown) {
  const problems = createProblems();
  const route = parseRoute(value, AT, problems);
  return { route, paths: problems.list.map((problem) => problem.path) };
}

function runBlock(value: unknown) {
  const problems = createProblems();
  const block = parseBlock(value, 'blocks[0]', problems);
  return { block, paths: problems.list.map((problem) => problem.path) };
}

function link(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { to: 'review', label: 'spec', ...overrides };
}

describe('F-02 AC-016 a block link is { to, label }', () => {
  it('F-02 AC-016 accepts a link with a target id and a label and returns it typed', () => {
    expect(runLink(link())).toEqual({ link: { to: 'review', label: 'spec' }, paths: [] });
  });

  it.each([
    { label: 'an empty text', value: '' },
    { label: 'a blank text', value: '   ' },
    { label: 'a number', value: 4 },
    { label: 'null', value: null },
  ])('F-02 AC-016 refuses a label that is $label, with its path', ({ value }) => {
    expect(runLink(link({ label: value }))).toEqual({ link: undefined, paths: [`${AT}.label`] });
  });

  it('F-02 AC-016 refuses a link without a label, with the path of label', () => {
    const value = link();
    delete value['label'];
    expect(runLink(value)).toEqual({ link: undefined, paths: [`${AT}.label`] });
  });

  it('F-02 AC-016 refuses a key other than to and label, such as gate, with its path', () => {
    expect(runLink(link({ gate: { kind: 'approval', description: 'Owner agrees' } }))).toEqual({
      link: undefined,
      paths: [`${AT}.gate`],
    });
  });

  it('F-02 AC-016 refuses a link with no target id, with the path of to', () => {
    const value = link();
    delete value['to'];
    expect(runLink(value)).toEqual({ link: undefined, paths: [`${AT}.to`] });
  });

  it.each([
    { label: 'an uppercase id', value: 'Review' },
    { label: 'an empty text', value: '' },
    { label: 'a number', value: 2 },
  ])('F-02 AC-016 refuses a target that is $label, with the path of to', ({ value }) => {
    expect(runLink(link({ to: value }))).toEqual({ link: undefined, paths: [`${AT}.to`] });
  });

  it('F-02 AC-016 refuses a link that is not an object, at the link path', () => {
    expect(runLink('review:spec')).toEqual({ link: undefined, paths: [AT] });
  });

  it('F-02 AC-016 reports every problem of a link in document order', () => {
    expect(runLink({ label: '', to: 'Bad', gate: 1 }).paths).toEqual([
      `${AT}.label`,
      `${AT}.to`,
      `${AT}.gate`,
    ]);
  });
});

describe('F-02 AC-004 a link refuses unknown keys, named by their path', () => {
  it('F-02 AC-004 names an unknown key on a link', () => {
    expect(runLink(link({ extra: true })).paths).toEqual([`${AT}.extra`]);
  });
});

describe('F-02 AC-018 a route is { to, roundLimit? } or { stop: true }', () => {
  it('F-02 AC-018 accepts a route with a target and returns it without a round limit key', () => {
    const result = runRoute({ to: 'build' });
    expect(result).toEqual({ route: { to: 'build' }, paths: [] });
    expect(result.route).not.toHaveProperty('roundLimit');
  });

  it('F-02 AC-018 accepts a route with a target and a round limit', () => {
    expect(runRoute({ to: 'build', roundLimit: 3 })).toEqual({
      route: { to: 'build', roundLimit: 3 },
      paths: [],
    });
  });

  it('F-02 AC-018 accepts a stop route', () => {
    expect(runRoute({ stop: true })).toEqual({ route: { stop: true }, paths: [] });
  });

  it.each([
    { label: 'zero', value: 0 },
    { label: 'a negative number', value: -1 },
    { label: 'a fraction', value: 1.5 },
    { label: 'a text', value: '2' },
    { label: 'null', value: null },
  ])('F-02 AC-018 refuses a round limit that is $label, with its path', ({ value }) => {
    expect(runRoute({ to: 'build', roundLimit: value })).toEqual({
      route: undefined,
      paths: [`${AT}.roundLimit`],
    });
  });

  it('F-02 AC-018 refuses a route with both to and stop, at the route path', () => {
    expect(runRoute({ to: 'build', stop: true })).toEqual({ route: undefined, paths: [AT] });
  });

  it('F-02 AC-018 refuses a route with neither to nor stop, at the route path', () => {
    expect(runRoute({})).toEqual({ route: undefined, paths: [AT] });
  });

  it('F-02 AC-018 refuses a route with only a round limit, at the route path', () => {
    expect(runRoute({ roundLimit: 2 })).toEqual({ route: undefined, paths: [AT] });
  });

  it('F-02 AC-018 refuses a round limit on a stop route, with its path', () => {
    expect(runRoute({ stop: true, roundLimit: 2 })).toEqual({
      route: undefined,
      paths: [`${AT}.roundLimit`],
    });
  });

  it.each([
    { label: 'false', value: false },
    { label: 'a text', value: 'true' },
  ])('F-02 AC-018 refuses stop that is $label, with its path', ({ value }) => {
    expect(runRoute({ stop: value })).toEqual({ route: undefined, paths: [`${AT}.stop`] });
  });

  it('F-02 AC-018 refuses a target that is not an id, with its path', () => {
    expect(runRoute({ to: 'Build' })).toEqual({ route: undefined, paths: [`${AT}.to`] });
  });

  it('F-02 AC-018 refuses a route that is not an object, at the route path', () => {
    expect(runRoute('build')).toEqual({ route: undefined, paths: [AT] });
  });
});

describe('F-02 AC-004 a route refuses unknown keys, named by their path', () => {
  it('F-02 AC-004 names an unknown key on a route to a block', () => {
    expect(runRoute({ to: 'build', extra: 1 }).paths).toEqual([`${AT}.extra`]);
  });

  it('F-02 AC-004 names an unknown key on a stop route', () => {
    expect(runRoute({ stop: true, extra: 1 }).paths).toEqual([`${AT}.extra`]);
  });
});

describe('F-02 AC-019 a Start or Approval may omit connectedTo', () => {
  it.each([
    { label: 'Start', value: { id: 'begin', kind: 'start' } },
    { label: 'Approval', value: { id: 'review', kind: 'approval', description: 'Owner reviews the spec' } },
  ])('F-02 AC-019 accepts a $label without connectedTo, and returns no such key', ({ value }) => {
    const result = runBlock(value);
    expect(result.paths).toEqual([]);
    expect(result.block).toEqual(value);
    expect(result.block).not.toHaveProperty('connectedTo');
  });

  it.each([
    { label: 'Start', value: { id: 'begin', kind: 'start', connectedTo: link() } },
    {
      label: 'Approval',
      value: { id: 'review', kind: 'approval', description: 'Owner reviews the spec', connectedTo: link() },
    },
  ])('F-02 AC-019 accepts a $label with a connectedTo link', ({ value }) => {
    expect(runBlock(value)).toEqual({ block: value, paths: [] });
  });

  it('F-02 AC-016 refuses a connectedTo link that has no label, with its path on a Start', () => {
    expect(runBlock({ id: 'begin', kind: 'start', connectedTo: { to: 'review' } })).toEqual({
      block: undefined,
      paths: ['blocks[0].connectedTo.label'],
    });
  });

  it('F-02 AC-016 refuses a connectedTo that is null on an Approval, at its path', () => {
    expect(
      runBlock({ id: 'review', kind: 'approval', description: 'Owner reviews the spec', connectedTo: null }),
    ).toEqual({ block: undefined, paths: ['blocks[0].connectedTo'] });
  });

  it('F-02 AC-004 names an unknown key inside the connectedTo of an Approval', () => {
    expect(
      runBlock({
        id: 'review',
        kind: 'approval',
        description: 'Owner reviews the spec',
        connectedTo: link({ gate: 'approval' }),
      }).paths,
    ).toEqual(['blocks[0].connectedTo.gate']);
  });
});
