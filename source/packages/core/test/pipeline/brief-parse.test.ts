import { describe, expect, it } from 'vitest';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';

function rule(): Record<string, unknown> {
  return { id: 'no-secrets', title: 'No secrets', text: 'Never commit keys.' };
}

function validPipeline(): Record<string, unknown> {
  return {
    name: 'Feature flow',
    description: 'Runs one feature from brief to commit.',
    arguments: [],
    flows: [{ id: 'build', name: 'Build', description: 'Builds one task', arguments: '', blocks: [] }],
  };
}

function root(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { schemaVersion: 2, rules: [rule()], pipeline: validPipeline(), ...overrides };
}

function fullStack(): Record<string, unknown> {
  return {
    language: 'TypeScript',
    framework: 'React',
    platform: 'Web browser',
    buildTool: 'Vite',
    testFramework: 'Vitest',
  };
}

function pathsOf(input: unknown): string[] {
  const result = parseProjectConfig(input);
  if (result.ok) {
    return ['<config returned>'];
  }
  return result.problems.map((problem) => problem.path);
}

describe('F-06 AC-001 the pipeline model holds the brief', () => {
  it('F-06 AC-001 keeps name, idea, architecture and each stack field as typed', () => {
    const input = root({
      name: 'SDDBuilder',
      idea: 'A wizard that writes a Claude Code layout.',
      architecture: 'A web app, an API and a core package.',
      stack: fullStack(),
    });
    const result = parseProjectConfig(input);
    expect(result).toEqual({
      ok: true,
      config: expect.objectContaining({
        name: 'SDDBuilder',
        idea: 'A wizard that writes a Claude Code layout.',
        architecture: 'A web app, an API and a core package.',
        stack: {
          language: 'TypeScript',
          framework: 'React',
          platform: 'Web browser',
          buildTool: 'Vite',
          testFramework: 'Vitest',
        },
      }),
    });
  });

  it.each([
    { label: 'only a name', brief: { name: 'Alpha' } },
    { label: 'a stack with one field', brief: { stack: { language: 'Go' } } },
    { label: 'an empty stack', brief: { stack: {} } },
  ])('F-06 AC-001 keeps the brief when the config has $label', ({ brief }) => {
    const result = parseProjectConfig(root(brief));
    expect(result).toEqual({ ok: true, config: expect.objectContaining(brief) });
  });
});

describe('F-06 AC-002 a config without brief fields parses', () => {
  it('F-06 AC-002 parses a config with no brief fields and reads the brief as blank', () => {
    const result = parseProjectConfig(root());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.config.name).toBeUndefined();
    expect(result.config.idea).toBeUndefined();
    expect(result.config.architecture).toBeUndefined();
    expect(result.config.stack).toBeUndefined();
    expect(Object.keys(result.config).sort()).toEqual(['pipeline', 'rules', 'schemaVersion']);
  });
});

describe('F-06 AC-003 a brief text field must be a string', () => {
  it.each([
    { label: 'a number in name', field: 'name', value: 42 },
    { label: 'a list in name', field: 'name', value: ['SDDBuilder'] },
    { label: 'a boolean in idea', field: 'idea', value: true },
    { label: 'an object in idea', field: 'idea', value: { text: 'idea' } },
    { label: 'a number in architecture', field: 'architecture', value: 7 },
    { label: 'null in architecture', field: 'architecture', value: null },
  ])('F-06 AC-003 refuses $label at the path $field', ({ field, value }) => {
    const input = root({ [field]: value });
    const result = parseProjectConfig(input);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('config');
    expect(pathsOf(input)).toEqual([field]);
  });

  it.each([
    { label: 'a number in stack.language', key: 'language', value: 3 },
    { label: 'a list in stack.framework', key: 'framework', value: ['React'] },
    { label: 'null in stack.testFramework', key: 'testFramework', value: null },
  ])('F-06 AC-003 refuses $label at its path', ({ key, value }) => {
    const input = root({ stack: { [key]: value } });
    expect(pathsOf(input)).toEqual([`stack.${key}`]);
  });
});

describe('F-06 AC-004 an unknown key inside stack is refused', () => {
  it.each([
    { label: 'an unknown key', key: 'colour', path: 'stack.colour' },
    { label: 'the pipeline key', key: 'pipeline', path: 'stack.pipeline' },
    { label: 'the brief key name', key: 'name', path: 'stack.name' },
  ])('F-06 AC-004 refuses $label inside stack with its path', ({ key, path }) => {
    const input = root({ stack: { language: 'TypeScript', [key]: 'x' } });
    expect(pathsOf(input)).toEqual([path]);
  });

  it('F-06 AC-004 refuses a stack that is not an object, at the path stack', () => {
    const input = root({ stack: 'TypeScript' });
    expect(pathsOf(input)).toEqual(['stack']);
  });

  it('F-06 AC-004 still refuses an unknown key at the root', () => {
    const input = root({ colour: 'red' });
    expect(pathsOf(input)).toEqual(['colour']);
  });
});

describe('F-06 AC-005 idea and architecture are at most 5,000 code points', () => {
  it.each([
    { label: 'a text of exactly 5,000 characters', text: 'a'.repeat(5000), accepted: true },
    { label: 'a text of 5,001 characters', text: 'a'.repeat(5001), accepted: false },
    { label: 'a text of 5,000 surrogate pairs', text: '😀'.repeat(5000), accepted: true },
    { label: 'a text of 5,001 surrogate pairs', text: '😀'.repeat(5001), accepted: false },
    { label: 'a text of 4,999 characters and one surrogate pair', text: `${'a'.repeat(4999)}😀`, accepted: true },
    { label: 'a text of 4,999 characters and two surrogate pairs', text: `${'a'.repeat(4999)}😀😀`, accepted: false },
  ])('F-06 AC-005 $label in idea is accepted: $accepted', ({ text, accepted }) => {
    const input = root({ idea: text });
    if (accepted) {
      expect(parseProjectConfig(input).ok).toBe(true);
    } else {
      expect(pathsOf(input)).toEqual(['idea']);
    }
  });

  it.each([
    { label: 'exactly 5,000 characters', text: 'b'.repeat(5000), accepted: true },
    { label: '5,001 characters', text: 'b'.repeat(5001), accepted: false },
    { label: 'exactly 5,000 surrogate pairs', text: '😀'.repeat(5000), accepted: true },
    { label: '5,001 surrogate pairs', text: '😀'.repeat(5001), accepted: false },
  ])('F-06 AC-005 architecture of $label is accepted: $accepted', ({ text, accepted }) => {
    const input = root({ architecture: text });
    if (accepted) {
      expect(parseProjectConfig(input).ok).toBe(true);
    } else {
      expect(pathsOf(input)).toEqual(['architecture']);
    }
  });

  it('F-06 AC-005 refuses a very long idea without counting it past the cap', () => {
    const input = root({ idea: 'c'.repeat(100000) });
    expect(pathsOf(input)).toEqual(['idea']);
  });
});

describe('F-06 AC-006 the brief text is kept as submitted', () => {
  it.each([
    { label: 'leading and trailing spaces', text: '   spaced out   ' },
    { label: 'line breaks', text: 'first line\nsecond line\r\n\nfourth line' },
    { label: 'trailing line breaks', text: 'ends with a break\n\n' },
    { label: 'only whitespace', text: ' \t\n ' },
  ])('F-06 AC-006 keeps idea with $label unchanged', ({ text }) => {
    const result = parseProjectConfig(root({ idea: text }));
    expect(result).toEqual({ ok: true, config: expect.objectContaining({ idea: text }) });
  });

  it('F-06 AC-006 keeps name, architecture and stack values unchanged', () => {
    const input = root({
      name: '  Padded name  ',
      architecture: '\nlines\n',
      stack: { framework: ' React ' },
    });
    const result = parseProjectConfig(input);
    expect(result).toEqual({
      ok: true,
      config: expect.objectContaining({
        name: '  Padded name  ',
        architecture: '\nlines\n',
        stack: { framework: ' React ' },
      }),
    });
  });
});
