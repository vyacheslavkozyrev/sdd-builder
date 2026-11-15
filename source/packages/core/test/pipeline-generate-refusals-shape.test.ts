import { describe, expect, it } from 'vitest';
import { InvalidConfigError } from '../src/errors.js';
import { generate } from '../src/pipeline/index.js';
import type {
  AgentBlock,
  ChildBlock,
  EndBlock,
  FlowBlock,
  PipelineBlock,
  PipelineStartBlock,
  ProjectConfig,
  StartBlock,
} from '../src/pipeline/model.js';
import { templateSourceFromRecord } from '../src/template-source.js';

const TEMPLATES = templateSourceFromRecord({});

function pipelineStart(id = 'pipeline-start'): PipelineStartBlock {
  return { kind: 'start', id, enabled: true, arguments: [] };
}

function start(id: string, enabled = true): StartBlock {
  return { kind: 'start', id, enabled };
}

function end(id: string, enabled = true): EndBlock {
  return { kind: 'end', id, enabled, outcome: 'done' };
}

function agent(id: string): AgentBlock {
  return { kind: 'agent', id, enabled: true, name: id, scope: 'task' };
}

function flow(id: string, blocks: ChildBlock[]): FlowBlock {
  return { kind: 'flow', id, name: `${id} flow`, enabled: true, blocks };
}

function configWith(blocks: PipelineBlock[]): ProjectConfig {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: { name: 'main', blocks },
    rules: [],
  };
}

/** The problems `generate` refuses a configuration with, or an empty list when it does not refuse it. */
function refusalOf(config: ProjectConfig): string[] {
  try {
    generate(config, TEMPLATES);
  } catch (error) {
    if (error instanceof InvalidConfigError) return [...error.problems];
    throw error;
  }
  return [];
}

describe('F-02 AC-001 a pipeline or a child flow with no Start block, or with two, is refused with its path', () => {
  it.each<[string, PipelineBlock[], string[]]>([
    [
      'the pipeline has no Start block',
      [flow('specify', [start('specify-start'), agent('specify-agent'), end('specify-end')]), end('pipeline-end')],
      ['pipeline: the pipeline has no Start block'],
    ],
    [
      'the pipeline has two Start blocks',
      [pipelineStart('a'), pipelineStart('b'), flow('specify', [start('s'), end('e')]), end('pipeline-end')],
      ['pipeline: the pipeline has 2 Start blocks; exactly one is required'],
    ],
    [
      'a child flow has no Start block',
      [pipelineStart(), flow('specify', [agent('specify-agent'), end('specify-end')]), end('pipeline-end')],
      ['pipeline.blocks[1]: flow "specify" has no Start block'],
    ],
    [
      'a child flow has two Start blocks',
      [pipelineStart(), flow('specify', [start('s1'), start('s2'), end('specify-end')]), end('pipeline-end')],
      ['pipeline.blocks[1]: flow "specify" has 2 Start blocks; exactly one is required'],
    ],
    [
      'a disabled Start block is still counted, so a flow with one disabled Start and one enabled Start has two',
      [pipelineStart(), flow('specify', [start('s1', false), start('s2'), end('specify-end')]), end('pipeline-end')],
      ['pipeline.blocks[1]: flow "specify" has 2 Start blocks; exactly one is required'],
    ],
  ])('F-02 AC-001 refuses when %s', (_name, blocks, expected) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });

  it('F-02 AC-001 refuses an empty child flow for both its missing Start and its missing End', () => {
    expect(refusalOf(configWith([pipelineStart(), flow('empty', []), end('pipeline-end')]))).toEqual([
      'pipeline.blocks[1]: flow "empty" has no End block',
      'pipeline.blocks[1]: flow "empty" has no Start block',
    ]);
  });

  it('F-02 AC-001 accepts a valid shape and returns a result with empty files and warnings', () => {
    const config = configWith([
      pipelineStart(),
      flow('specify', [start('specify-start'), agent('specify-agent'), end('specify-end')]),
      flow('build', [start('build-start'), agent('build-agent'), end('build-end')]),
      end('pipeline-end'),
    ]);
    expect(generate(config, TEMPLATES)).toEqual({ files: [], warnings: [] });
  });
});

describe('F-02 AC-002 a pipeline or a child flow with no End block is refused with its path', () => {
  it.each<[string, PipelineBlock[], string[]]>([
    [
      'the pipeline has no End block',
      [pipelineStart(), flow('specify', [start('specify-start'), agent('specify-agent'), end('specify-end')])],
      ['pipeline: the pipeline has no End block'],
    ],
    [
      'a child flow has no End block',
      [pipelineStart(), flow('specify', [start('specify-start'), agent('specify-agent')]), end('pipeline-end')],
      ['pipeline.blocks[1]: flow "specify" has no End block'],
    ],
    [
      'a child flow whose only End block is disabled still counts it, so it is accepted',
      [pipelineStart(), flow('specify', [start('s'), end('e', false)]), end('pipeline-end')],
      [],
    ],
  ])('F-02 AC-002 handles %s', (_name, blocks, expected) => {
    expect(refusalOf(configWith(blocks))).toEqual(expected);
  });

  it.each<[string, PipelineBlock[]]>([
    [
      'a child flow with two End blocks',
      [pipelineStart(), flow('specify', [start('s'), end('e1'), end('e2')]), end('pipeline-end')],
    ],
    [
      'the pipeline with two End blocks, one of them disabled',
      [pipelineStart(), flow('specify', [start('s'), end('e')]), end('pipeline-end', true), end('e2', false)],
    ],
  ])('F-02 AC-002 accepts %s, since at least one End is required', (_name, blocks) => {
    expect(refusalOf(configWith(blocks))).toEqual([]);
  });
});

describe('F-02 AC-012 several problems are all listed in path order, and no files are returned', () => {
  it('F-02 AC-012 lists every problem across the pipeline and its child flows', () => {
    const config = configWith([
      flow('specify', [start('specify-start'), agent('specify-agent')]),
      flow('build', [agent('build-agent'), end('build-end')]),
      end('pipeline-end'),
    ]);
    expect(refusalOf(config)).toEqual([
      'pipeline: the pipeline has no Start block',
      'pipeline.blocks[0]: flow "specify" has no End block',
      'pipeline.blocks[1]: flow "build" has no Start block',
    ]);
  });

  it('F-02 AC-012 orders a number in a path by its value, so block 2 comes before block 10', () => {
    const filler = (index: number): PipelineBlock => ({
      kind: 'connection',
      id: `link-${index}`,
      enabled: true,
      from: 'early',
      to: 'late',
      artifact: 'note',
    });
    const blocks: PipelineBlock[] = Array.from({ length: 12 }, (_, index) => {
      if (index === 0) return pipelineStart();
      if (index === 2) return flow('early', [agent('early-agent')]);
      if (index === 10) return flow('late', [agent('late-agent')]);
      return filler(index);
    });
    blocks.push(end('pipeline-end'));
    expect(refusalOf(configWith(blocks))).toEqual([
      'pipeline.blocks[2]: flow "early" has no End block',
      'pipeline.blocks[2]: flow "early" has no Start block',
      'pipeline.blocks[10]: flow "late" has no End block',
      'pipeline.blocks[10]: flow "late" has no Start block',
    ]);
  });

  it('F-02 AC-012 sorts problems at the same path by their message', () => {
    expect(refusalOf(configWith([]))).toEqual([
      'pipeline: the pipeline has no End block',
      'pipeline: the pipeline has no Start block',
    ]);
  });

  it('F-02 AC-012 throws one InvalidConfigError carrying every problem, and returns no files', () => {
    const config = configWith([flow('specify', [agent('specify-agent')]), end('pipeline-end')]);
    expect(() => generate(config, TEMPLATES)).toThrow(InvalidConfigError);
    expect(refusalOf(config)).toHaveLength(3);
  });
});
