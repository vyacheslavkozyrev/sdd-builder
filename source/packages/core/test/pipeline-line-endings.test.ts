// F-07 AC-027: every generated file has LF line endings only and ends with exactly one newline. CRLF input and extra
// trailing newlines are normalised; an empty text becomes one newline. Fixed inputs only, no I/O.
import { describe, expect, it } from 'vitest';
import { pipeline } from '../src/index.js';
import { templateSourceFromRecord } from '../src/template-source.js';
import { agent, configWith, pipelineEnd, pipelineStart, requiredGates, validFlow } from './pipeline-routes-fixtures.js';

describe('F-07 AC-027 line endings of generated text', () => {
  it('F-07 AC-027 generate normalises every template-made file, not only the model-written ones', () => {
    const templates = templateSourceFromRecord({
      'base/CLAUDE.md': '# {{projectName}}\r\n\r\n{{idea}}\r\n\r\n\r\n',
      'base/process.md': '# Process\r\r{{processList}}\r\n\r\n',
      'base/spec-template/stories.md': '# Stories',
      'base/spec-template/plan.md': '\n\n',
      'base/spec-template/progress.md': '# Progress\n',
    });
    const config = configWith([
      pipelineStart(),
      validFlow('build', [agent('build-implement')]),
      ...requiredGates(),
      pipelineEnd(),
    ]);

    const result = pipeline.generate(config, templates);

    expect(result.files.length).toBeGreaterThan(0);
    for (const file of result.files) {
      expect(file.content).not.toMatch(/\r/);
      expect(file.content).toMatch(/\n$/);
      expect(file.content).not.toMatch(/\n\n$/);
    }
    const claude = result.files.find((file) => file.path === 'CLAUDE.md');
    expect(claude?.content).toBe('# My project\n\nA tool that tracks reading lists.\n');
    const plan = result.files.find((file) => file.path.endsWith('/plan.md'));
    expect(plan?.content).toBe('\n');
  });

  it('F-07 AC-027 normalises a very long run of trailing newlines in linear time', () => {
    const text = `a${'\n'.repeat(200_000)}b${'\n'.repeat(200_000)}`;
    expect(pipeline.normaliseFileText(text)).toBe(`a${'\n'.repeat(200_000)}b\n`);
  });

  it.each([
    { label: 'CRLF input', input: 'a\r\nb\r\n', expected: 'a\nb\n' },
    { label: 'CRLF input with no trailing newline', input: 'a\r\nb', expected: 'a\nb\n' },
    { label: 'a lone CR', input: 'a\rb\r', expected: 'a\nb\n' },
    { label: 'a mix of CRLF, CR and LF', input: 'a\r\nb\rc\nd', expected: 'a\nb\nc\nd\n' },
    { label: 'extra trailing newlines', input: 'a\n\n\n', expected: 'a\n' },
    { label: 'extra trailing CRLF pairs', input: 'a\r\n\r\n', expected: 'a\n' },
    { label: 'an empty text', input: '', expected: '\n' },
    { label: 'a text of newlines only', input: '\n\n', expected: '\n' },
    { label: 'a text already correct', input: 'a\nb\n', expected: 'a\nb\n' },
    { label: 'a single line already correct', input: 'a\n', expected: 'a\n' },
    { label: 'a text with a blank line inside kept', input: 'a\n\nb\n', expected: 'a\n\nb\n' },
  ])('F-07 AC-027 normalises $label', ({ input, expected }) => {
    expect(pipeline.normaliseFileText(input)).toBe(expected);
  });

  it('F-07 AC-027 gives the same text for the same input on a second call', () => {
    const once = pipeline.normaliseFileText('x\r\n\r\n');
    expect(pipeline.normaliseFileText('x\r\n\r\n')).toBe(once);
    expect(once).toBe('x\n');
  });
});
