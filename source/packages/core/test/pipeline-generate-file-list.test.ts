import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GenerationError } from '../src/errors.js';
import type { GeneratedFile } from '../src/model.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { generate, sortedFileList } from '../src/pipeline/generate/generate.js';
import type { ProjectConfig } from '../src/pipeline/model.js';
import {
  BASE_TEMPLATES,
  agent,
  configWith,
  end,
  flow,
  pipelineEnd,
  pipelineStart,
  requiredGates,
  start,
  validFlow,
} from './pipeline-routes-fixtures.js';

/** A small valid pipeline: one enabled flow with one enabled agent, between the pipeline start and end. */
function smallConfig(flowId = 'build'): ProjectConfig {
  return configWith([pipelineStart(), validFlow(flowId, [agent('build-implement')]), ...requiredGates(), pipelineEnd()]);
}

/** Every .ts file under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

const PIPELINE_SRC = join(import.meta.dirname, '..', 'src', 'pipeline');

describe('F-02 AC-030 the file list is sorted by path', () => {
  it('returns the default pipeline files in path order', () => {
    const paths = generate(defaultProjectConfig, BASE_TEMPLATES).files.map((file) => file.path);
    expect(paths.length).toBeGreaterThan(0);
    expect([...paths].sort()).toEqual(paths);
  });

  it('sorts paths in plain code-unit order, so a digit compares as text and step10 comes before step2', () => {
    const files: GeneratedFile[] = [
      { path: 'step2.md', content: '' },
      { path: 'b.md', content: '' },
      { path: 'step10.md', content: '' },
      { path: 'a.md', content: '' },
    ];
    expect(sortedFileList(files).map((file) => file.path)).toEqual(['a.md', 'b.md', 'step10.md', 'step2.md']);
  });

  it('sorts a path with a prefix before a longer path, and an uppercase letter before a lowercase one', () => {
    const files: GeneratedFile[] = [
      { path: 'a2.md', content: '' },
      { path: 'a.md', content: '' },
      { path: 'Z.md', content: '' },
      { path: 'a', content: '' },
    ];
    expect(sortedFileList(files).map((file) => file.path)).toEqual(['Z.md', 'a', 'a.md', 'a2.md']);
  });

  it('sorts the generated files, whatever order the parts produce them in', () => {
    const { files } = generate(smallConfig(), BASE_TEMPLATES);
    const paths = files.map((file) => file.path);
    expect(paths).toEqual([...paths].sort());
  });

  it('keeps each file with its own content after sorting', () => {
    const files: GeneratedFile[] = [
      { path: 'z.md', content: 'last' },
      { path: 'a.md', content: 'first' },
    ];
    expect(sortedFileList(files)).toEqual([
      { path: 'a.md', content: 'first' },
      { path: 'z.md', content: 'last' },
    ]);
  });
});

describe('F-02 AC-030 two outputs with one path are an error, not an overwrite', () => {
  it('refuses two files with one path, naming the path, and returns none', () => {
    const files: GeneratedFile[] = [
      { path: 'CLAUDE.md', content: 'one' },
      { path: 'CLAUDE.md', content: 'two' },
    ];
    expect(() => sortedFileList(files)).toThrow(GenerationError);
    expect(() => sortedFileList(files)).toThrow('duplicate output path "CLAUDE.md"');
  });

  it('names every duplicated path once, in the problems of the error', () => {
    const files: GeneratedFile[] = [
      { path: 'x.md', content: '1' },
      { path: 'y.md', content: '2' },
      { path: 'x.md', content: '3' },
      { path: 'y.md', content: '4' },
      { path: 'y.md', content: '5' },
    ];
    let caught: unknown;
    try {
      sortedFileList(files);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GenerationError);
    expect((caught as GenerationError).problems).toEqual(['duplicate output path "x.md"', 'duplicate output path "y.md"']);
  });

  it('refuses a generated duplicate: a flow named pipeline writes the same command path as the pipeline command', () => {
    // The flow id is `pipeline`, so its command file is `.claude/commands/pipeline.md`, the path of the pipeline command.
    const config = configWith([
      pipelineStart(),
      flow('pipeline', [start('flow-start'), agent('build-implement'), end('flow-end')]),
      ...requiredGates(),
      pipelineEnd(),
    ]);
    let caught: unknown;
    try {
      generate(config, BASE_TEMPLATES);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(GenerationError);
    expect((caught as GenerationError).problems).toEqual(['duplicate output path ".claude/commands/pipeline.md"']);
  });

  it('accepts a list with no repeated path', () => {
    const files: GeneratedFile[] = [
      { path: 'a.md', content: '' },
      { path: 'b.md', content: '' },
    ];
    expect(sortedFileList(files)).toHaveLength(2);
  });
});

describe('F-02 AC-031 generating twice from the same config gives the same paths, order and content', () => {
  it('two runs over the default pipeline give equal paths, order and content', () => {
    const first = generate(defaultProjectConfig, BASE_TEMPLATES);
    const second = generate(defaultProjectConfig, BASE_TEMPLATES);
    expect(second.files.map((file) => file.path)).toEqual(first.files.map((file) => file.path));
    expect(second).toEqual(first);
  });

  it('two runs over the small pipeline give equal output, and the warnings are empty', () => {
    const first = generate(smallConfig(), BASE_TEMPLATES);
    const second = generate(smallConfig(), BASE_TEMPLATES);
    expect(second).toEqual(first);
    expect(first.warnings).toEqual([]);
  });
});

describe('F-02 AC-032 no timestamp, random id or environment value is written into a generated file', () => {
  it('no file holds an ISO timestamp', () => {
    const { files } = generate(defaultProjectConfig, BASE_TEMPLATES);
    const timestamp = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
    expect(files.filter((file) => timestamp.test(file.content)).map((file) => file.path)).toEqual([]);
  });

  it('the pipeline sources use no random value and no clock', () => {
    const offending = sourceFiles(PIPELINE_SRC).filter((file) => {
      const text = readFileSync(file, 'utf8');
      return /Math\.random|crypto\.randomUUID|\bnew Date\b|Date\.now\(|process\.env/.test(text);
    });
    expect(offending).toEqual([]);
  });
});
