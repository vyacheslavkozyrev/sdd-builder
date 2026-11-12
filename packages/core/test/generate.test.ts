import { describe, expect, it } from 'vitest';
import { generate, GenerationError, InvalidConfigError, templateSourceFromRecord } from '../src/index.js';
import { baseConfig, connection } from './fixtures.js';
import { fullTemplates } from './fixtures-templates.js';

describe('F-02 T017 generate', () => {
  it('F-02 AC-031 the same input gives byte-identical output', () => {
    const first = generate(baseConfig(), fullTemplates());
    const second = generate(baseConfig(), fullTemplates());
    expect(second).toEqual(first);
  });

  it('F-02 AC-015 produces one workflow command per enabled workflow, and the base files', () => {
    const paths = generate(baseConfig(), fullTemplates()).files.map((f) => f.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        'CLAUDE.md',
        'spec/documents/process.md',
        '.claude/commands/workflow-specify.md',
        '.claude/commands/workflow-implement-cycle.md',
        '.claude/commands/workflow-verify-feature.md',
        '.claude/commands/workflow-release-project.md',
        '.claude/agents/implement.md',
        'scripts/unit-tests.sh',
      ]),
    );
  });

  it('F-03 AC-011 the base files include no script, so scripts/task-check.sh is never read from a template', () => {
    const paths = generate(baseConfig(), fullTemplates()).files.map((f) => f.path);
    expect(paths).not.toContain('scripts/task-check.sh');
    expect(paths).toContain('scripts/unit-tests.sh');
  });

  it('F-02 AC-028 the process document carries the Mermaid view of the map', () => {
    const process = generate(baseConfig(), fullTemplates()).files.find((f) => f.path === 'spec/documents/process.md');
    expect(process?.content).toContain('```mermaid\nflowchart TD');
  });

  it('F-02 AC-033 output is sorted by path and ends with one newline', () => {
    const { files } = generate(baseConfig(), fullTemplates());
    const paths = files.map((f) => f.path);
    expect([...paths].sort()).toEqual(paths);
    for (const file of files) {
      expect(file.content.endsWith('\n') && !file.content.endsWith('\n\n')).toBe(true);
    }
  });

  it('F-02 AC-011 an invalid configuration returns no files and refuses with every problem', () => {
    const config = baseConfig({ connections: [...baseConfig().connections, connection('specify', 'nowhere')] });
    expect(() => generate(config, fullTemplates())).toThrow(InvalidConfigError);
  });

  it('F-02 AC-011 missing templates are collected into one GenerationError', () => {
    const empty = templateSourceFromRecord({});
    let caught: unknown;
    try {
      generate(baseConfig(), empty);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GenerationError);
    const problems = (caught as GenerationError).problems;
    expect(problems).toEqual(expect.arrayContaining(['base/CLAUDE.md: missing base template', 'workflows/workflow.md: missing workflow template']));
    expect(problems.length).toBeGreaterThan(2);
  });
});
