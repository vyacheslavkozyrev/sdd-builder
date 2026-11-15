import { describe, expect, it } from 'vitest';
import { GenerationError } from '../src/errors.js';
import type { GeneratedFile } from '../src/model.js';
import { renderBaseFiles } from '../src/pipeline/generate/base-files.js';
import type { ProjectConfig } from '../src/pipeline/model.js';
import { templateSourceFromRecord } from '../src/template-source.js';
import { agent, configWith, flow, gate, NEXT, pipelineEnd, pipelineStart, STOP, validFlow } from './pipeline-routes-fixtures.js';

/** Fixture templates for the base files: the two base files, three spec template files and a file outside the base. */
const TEMPLATES: Record<string, string> = {
  'base/CLAUDE.md': '# {{projectName}}\n\n{{idea}}\n\nLanguage: {{stack.language}}\n',
  'base/process.md': '# Process\n\n{{processList}}\n',
  'base/spec-template/stories.md': '# Stories\n',
  'base/spec-template/plan.md': '# Plan\n',
  'base/spec-template/progress.md': '# Progress\n',
  'workflows/workflow.md': '# Not a base file\n',
};

/** A pipeline with an enabled flow a (a2 disabled), a disabled flow b, a gate between a and c, and an enabled flow c. */
function processConfig(): ProjectConfig {
  return configWith([
    pipelineStart(),
    validFlow('a', [agent('a1'), agent('a2', false)]),
    flow('b', [agent('b1')], false),
    gate('g1', NEXT, STOP),
    validFlow('c', [agent('c1')]),
    pipelineEnd(),
  ]);
}

/** The rendered base files of a configuration, keyed by their output path. */
function filesOf(config: ProjectConfig, records: Record<string, string> = TEMPLATES): GeneratedFile[] {
  return renderBaseFiles(config, templateSourceFromRecord(records));
}

function contentOf(files: readonly GeneratedFile[], path: string): string {
  const file = files.find((entry) => entry.path === path);
  if (file === undefined) throw new Error(`no file at ${path}`);
  return file.content;
}

describe('F-02 AC-018 base files are rendered with the values from the config', () => {
  it('F-02 AC-018 CLAUDE.md takes the project name, idea and stack language from the config', () => {
    const files = filesOf(processConfig());
    expect(contentOf(files, 'CLAUDE.md')).toBe(
      '# My project\n\nA tool that tracks reading lists.\n\nLanguage: TypeScript\n',
    );
  });

  it('F-02 AC-018 no {{name}} placeholder is left in any base file', () => {
    const files = filesOf(processConfig());
    for (const file of files) expect(file.content, file.path).not.toMatch(/\{\{/);
  });

  it('F-02 AC-018 the base files are placed at CLAUDE.md, spec/documents/process.md and the F-00 template folder, sorted by path', () => {
    const files = filesOf(processConfig());
    expect(files.map((file) => file.path)).toEqual([
      'CLAUDE.md',
      'spec/documents/process.md',
      'spec/specifications/F-00-template/plan.md',
      'spec/specifications/F-00-template/progress.md',
      'spec/specifications/F-00-template/stories.md',
    ]);
  });

  it('F-02 AC-018 spec template files keep their content and sit under spec/specifications/F-00-template/', () => {
    const files = filesOf(processConfig());
    expect(contentOf(files, 'spec/specifications/F-00-template/stories.md')).toBe('# Stories\n');
    expect(contentOf(files, 'spec/specifications/F-00-template/plan.md')).toBe('# Plan\n');
    expect(contentOf(files, 'spec/specifications/F-00-template/progress.md')).toBe('# Progress\n');
    expect(files.some((file) => file.path.includes('base/'))).toBe(false);
  });

  it('F-02 AC-018 the same config gives the same files, paths and order', () => {
    const first = filesOf(processConfig());
    const second = filesOf(processConfig());
    expect(second).toEqual(first);
  });
});

describe('F-02 AC-022 process.md is text listing the flows, blocks and gates in order', () => {
  it('F-02 AC-022 lists the enabled pipeline blocks in order, with each flow\'s blocks, and no Mermaid block', () => {
    const text = contentOf(filesOf(processConfig()), 'spec/documents/process.md');
    expect(text).toBe(
      [
        '# Process',
        '',
        '- Start of the pipeline (pipeline-start)',
        '- Flow a flow (a), with its blocks in order:',
        '  - Start (a-start)',
        '  - Agent a1 (a1)',
        '  - End, done (a-end)',
        '- Gate review on connection a-to-b (g1)',
        '- Flow c flow (c), with its blocks in order:',
        '  - Start (c-start)',
        '  - Agent c1 (c1)',
        '  - End, done (c-end)',
        '- End of the pipeline, done (pipeline-end)',
        '',
      ].join('\n'),
    );
    expect(text).not.toMatch(/```|mermaid|flowchart/i);
  });

  it('F-02 AC-022 a disabled flow and its blocks are not listed', () => {
    const text = contentOf(filesOf(processConfig()), 'spec/documents/process.md');
    expect(text).not.toContain('b flow');
    expect(text).not.toContain('b1');
  });

  it('F-02 AC-022 the process list is the same for the same config', () => {
    const first = contentOf(filesOf(processConfig()), 'spec/documents/process.md');
    const second = contentOf(filesOf(processConfig()), 'spec/documents/process.md');
    expect(second).toBe(first);
  });
});

describe('F-02 AC-021 a missing base template fails generation with its path named', () => {
  const missing: Array<{ name: string; path: string }> = [
    { name: 'F-02 AC-021 a missing CLAUDE.md template names base/CLAUDE.md', path: 'base/CLAUDE.md' },
    { name: 'F-02 AC-021 a missing process.md template names base/process.md', path: 'base/process.md' },
  ];

  for (const row of missing) {
    it(row.name, () => {
      const records: Record<string, string> = { ...TEMPLATES };
      delete records[row.path];
      let caught: unknown;
      try {
        filesOf(processConfig(), records);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(GenerationError);
      expect((caught as GenerationError).problems).toContain(`template not found at "${row.path}"`);
    });
  }
});
