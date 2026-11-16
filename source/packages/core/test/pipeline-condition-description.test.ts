import { describe, expect, it } from 'vitest';
import { InvalidConfigError } from '../src/errors.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { generate } from '../src/pipeline/index.js';
import type { ConditionBlock, FlowBlock, PipelineConditionBlock, ProjectConfig } from '../src/pipeline/model.js';
import { BASE_TEMPLATES } from './pipeline-routes-fixtures.js';

const TEMPLATES = BASE_TEMPLATES;

function defaultCopy(): ProjectConfig {
  return structuredClone(defaultProjectConfig);
}

/** The refusal messages of a config that generate refuses; fails the test when it is accepted. */
function refusalOf(config: ProjectConfig): readonly string[] {
  try {
    generate(config, TEMPLATES);
  } catch (error) {
    if (error instanceof InvalidConfigError) return error.problems;
    throw error;
  }
  throw new Error('expected generate to refuse the configuration');
}

function buildFlow(config: ProjectConfig): FlowBlock {
  const found = config.pipeline.blocks.find((block): block is FlowBlock => block.kind === 'flow' && block.id === 'build');
  if (found === undefined) throw new Error('expected a build flow');
  return found;
}

function buildCondition(config: ProjectConfig, id: string): ConditionBlock {
  const found = buildFlow(config).blocks.find((block) => block.id === id);
  if (found?.kind !== 'condition') throw new Error(`expected a Condition "${id}"`);
  return found;
}

function pipelineGate(config: ProjectConfig): PipelineConditionBlock {
  const found = config.pipeline.blocks.find((block): block is PipelineConditionBlock => block.kind === 'condition');
  if (found === undefined) throw new Error('expected a pipeline gate');
  return found;
}

describe('F-06 AC-016 generate refuses an enabled Condition with a blank or missing description', () => {
  it('accepts the default pipeline, whose Conditions all have a description', () => {
    const result = generate(defaultCopy(), TEMPLATES);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);
  });

  it('refuses an enabled child Condition with an empty description, naming its path', () => {
    const config = defaultCopy();
    buildCondition(config, 'build-review-gate').description = '';
    const flowIndex = config.pipeline.blocks.findIndex((block) => block.id === 'build');
    const childIndex = buildFlow(config).blocks.findIndex((block) => block.id === 'build-review-gate');
    expect(refusalOf(config)).toEqual([
      `pipeline.blocks[${flowIndex}].blocks[${childIndex}]: Condition "build-review-gate" has no description; its rule text would be empty`,
    ]);
  });

  it('refuses an enabled child Condition with a whitespace-only description', () => {
    const config = defaultCopy();
    buildCondition(config, 'build-checks').description = '  \n\t ';
    const flowIndex = config.pipeline.blocks.findIndex((block) => block.id === 'build');
    const childIndex = buildFlow(config).blocks.findIndex((block) => block.id === 'build-checks');
    expect(refusalOf(config)).toEqual([
      `pipeline.blocks[${flowIndex}].blocks[${childIndex}]: Condition "build-checks" has no description; its rule text would be empty`,
    ]);
  });

  it('refuses an enabled child Condition whose description is missing, not only blank', () => {
    const config = defaultCopy();
    Reflect.deleteProperty(buildCondition(config, 'build-diff-size'), 'description');
    const flowIndex = config.pipeline.blocks.findIndex((block) => block.id === 'build');
    const childIndex = buildFlow(config).blocks.findIndex((block) => block.id === 'build-diff-size');
    expect(refusalOf(config)).toEqual([
      `pipeline.blocks[${flowIndex}].blocks[${childIndex}]: Condition "build-diff-size" has no description; its rule text would be empty`,
    ]);
  });

  it('refuses an enabled pipeline gate with a blank description, naming its path', () => {
    const config = defaultCopy();
    const gate = pipelineGate(config);
    gate.description = '';
    const index = config.pipeline.blocks.indexOf(gate);
    expect(refusalOf(config)).toEqual([
      `pipeline.blocks[${index}]: Condition "${gate.id}" has no description; its rule text would be empty`,
    ]);
  });

  it('does not check a disabled Condition, even with a blank description', () => {
    const config = defaultCopy();
    const condition = buildCondition(config, 'build-checks');
    condition.enabled = false;
    condition.description = '';
    expect(generate(config, TEMPLATES).files.length).toBeGreaterThan(0);
  });
});
