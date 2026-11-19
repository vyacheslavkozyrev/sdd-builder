import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readArtifacts } from '../../src/pipeline/parse/artifact.js';

const ARTIFACTS = 'pipeline.flows.0.artifacts';
const FIRST = `${ARTIFACTS}.0`;
const SECOND = `${ARTIFACTS}.1`;
const validArtifact = { label: 'plan.md', template: 'Task list, in order' };

function readA(value: unknown, path = ARTIFACTS) {
  const problems = createProblemCollector();
  const artifacts = readArtifacts(value, path, problems);
  return { artifacts, problems: problems.list() };
}

function repeat(char: string, count: number): string {
  return char.repeat(count);
}

describe('F-02 AC-036 an artifact requires label and template', () => {
  it('accepts an artifact with exactly label and template', () => {
    expect(readA([validArtifact])).toEqual({
      artifacts: [{ label: 'plan.md', template: 'Task list, in order' }],
      problems: [],
    });
  });

  it.each(['label', 'template'])('refuses an artifact missing %s at the artifact path', (key) => {
    const value: Record<string, unknown> = { ...validArtifact };
    delete value[key];
    expect(readA([value])).toEqual({
      artifacts: [],
      problems: [{ path: FIRST, message: `is missing the key ${key}` }],
    });
  });

  it.each(['description', 'name', 'x'])('F-02 AC-007 refuses an artifact with the unknown key %s at the path of that key', (key) => {
    expect(readA([{ ...validArtifact, [key]: 'text' }])).toEqual({
      artifacts: [],
      problems: [{ path: `${FIRST}.${key}`, message: `has an unknown key ${key}` }],
    });
  });

  it('refuses an artifact that is not an object, at the artifact path', () => {
    expect(readA(['plan.md'])).toEqual({
      artifacts: [],
      problems: [{ path: FIRST, message: 'must be an object, got text' }],
    });
  });

  it('refuses an artifacts value that is not a list', () => {
    expect(readA({ label: 'plan.md' })).toEqual({
      artifacts: undefined,
      problems: [{ path: ARTIFACTS, message: 'must be a list, got an object' }],
    });
  });
});

describe('F-02 AC-037 an artifact label is one non-blank line of at most 200 code points', () => {
  it('accepts the label plan.md', () => {
    expect(readA([{ label: 'plan.md', template: '' }]).problems).toEqual([]);
  });

  it.each([
    ['the empty string', '', 'must not be blank'],
    ['three spaces', '   ', 'must not be blank'],
    ['two lines', 'plan.md\nspec.md', 'must be one line'],
    ['a carriage return inside', 'plan.md\rspec.md', 'must be one line'],
    ['a line separator U+2028 inside', 'plan.md\u2028spec.md', 'must be one line'],
    ['a paragraph separator U+2029 inside', 'plan.md\u2029spec.md', 'must be one line'],
    ['a vertical tab inside', 'plan.md\vspec.md', 'must be one line'],
    ['a form feed inside', 'plan.md\fspec.md', 'must be one line'],
    ['a next-line character U+0085 inside', 'plan.md\u0085spec.md', 'must be one line'],
    ['201 code points', repeat('a', 201), 'must be at most 200 characters'],
  ])('refuses a label that is %s, at the path of the label', (_name, label, message) => {
    expect(readA([{ label, template: '' }])).toEqual({
      artifacts: [],
      problems: [{ path: `${FIRST}.label`, message }],
    });
  });

  it('accepts a label of exactly 200 code points', () => {
    expect(readA([{ label: repeat('a', 200), template: '' }]).problems).toEqual([]);
  });

  it('counts a label of 200 emoji as 200 code points, and refuses 201 emoji', () => {
    expect(readA([{ label: repeat('😀', 200), template: '' }]).problems).toEqual([]);
    expect(readA([{ label: repeat('😀', 201), template: '' }]).problems).toEqual([
      { path: `${FIRST}.label`, message: 'must be at most 200 characters' },
    ]);
  });
});

describe('F-02 AC-038 an artifact template may be empty and multi-line, at most 5,000 code points', () => {
  it('accepts an empty template', () => {
    expect(readA([{ label: 'plan.md', template: '' }])).toEqual({
      artifacts: [{ label: 'plan.md', template: '' }],
      problems: [],
    });
  });

  it('accepts a multi-line template', () => {
    expect(readA([{ label: 'plan.md', template: '# Plan\n\n- task\n- task' }]).problems).toEqual([]);
  });

  it('accepts a template of exactly 5,000 code points', () => {
    expect(readA([{ label: 'plan.md', template: repeat('a', 5000) }]).problems).toEqual([]);
  });

  it('refuses a template of 5,001 code points, at the path of the template', () => {
    expect(readA([{ label: 'plan.md', template: repeat('a', 5001) }])).toEqual({
      artifacts: [],
      problems: [{ path: `${FIRST}.template`, message: 'must be at most 5000 characters' }],
    });
  });

  it('refuses a template that is not text', () => {
    expect(readA([{ label: 'plan.md', template: null }])).toEqual({
      artifacts: [],
      problems: [{ path: `${FIRST}.template`, message: 'must be text, got null' }],
    });
  });
});

describe('F-02 AC-039 the artifact list keeps its order and accepts an empty list', () => {
  it('keeps the order of the array', () => {
    const result = readA([
      { label: 'spec.md', template: '' },
      { label: 'plan.md', template: '' },
      { label: 'tasks.md', template: '' },
    ]);
    expect(result.artifacts?.map((artifact) => artifact.label)).toEqual(['spec.md', 'plan.md', 'tasks.md']);
    expect(result.problems).toEqual([]);
  });

  it('accepts an empty list', () => {
    expect(readA([])).toEqual({ artifacts: [], problems: [] });
  });
});

describe('F-02 AC-087 two artifacts of one flow cannot share a label', () => {
  it('refuses the second artifact with the same label, at the path of the second label', () => {
    expect(
      readA([
        { label: 'plan.md', template: 'first' },
        { label: 'plan.md', template: 'second' },
      ]),
    ).toEqual({
      artifacts: [{ label: 'plan.md', template: 'first' }],
      problems: [
        {
          path: `${SECOND}.label`,
          message: 'repeats plan.md; each artifact of a flow needs its own label',
        },
      ],
    });
  });

  it('keeps distinct labels that differ only in case', () => {
    expect(
      readA([
        { label: 'plan.md', template: '' },
        { label: 'Plan.md', template: '' },
      ]).problems,
    ).toEqual([]);
  });

  it('accepts the same label in two different flows, reading both lists into one collector', () => {
    const problems = createProblemCollector();
    const first = readArtifacts([{ label: 'plan.md', template: 'one' }], 'pipeline.flows.0.artifacts', problems);
    const second = readArtifacts([{ label: 'plan.md', template: 'two' }], 'pipeline.flows.1.artifacts', problems);
    expect(first).toEqual([{ label: 'plan.md', template: 'one' }]);
    expect(second).toEqual([{ label: 'plan.md', template: 'two' }]);
    expect(problems.list()).toEqual([]);
  });
});

describe('F-02 AC-088 artifact length limits count code points', () => {
  it('accepts a template of 5,000 emoji, because each emoji is one code point', () => {
    expect(readA([{ label: 'plan.md', template: repeat('😀', 5000) }]).problems).toEqual([]);
  });

  it('refuses a template of 5,001 emoji, because each emoji is one code point', () => {
    expect(readA([{ label: 'plan.md', template: repeat('😀', 5001) }]).problems).toEqual([
      { path: `${FIRST}.template`, message: 'must be at most 5000 characters' },
    ]);
  });
});
