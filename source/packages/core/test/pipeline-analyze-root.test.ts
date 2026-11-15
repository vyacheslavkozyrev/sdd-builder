import { describe, expect, it } from 'vitest';
import * as root from '../src/index.js';
import { InvalidConfigError } from '../src/errors.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { configProblems, refuseInvalidConfig } from '../src/pipeline/generate/generate.js';
import type { ProjectConfig } from '../src/pipeline/model.js';

/** The default pipeline with every flow tagged with a rule the project does not have (F-02 AC-013 refusals). */
function brokenConfig(): ProjectConfig {
  const pipeline = defaultProjectConfig.pipeline;
  const blocks = pipeline.blocks.map((block) =>
    block.kind === 'flow' ? { ...block, ruleTags: ['no-such-rule'] } : block,
  );
  return { ...defaultProjectConfig, pipeline: { ...pipeline, blocks } };
}

describe('F-04 enabler (T002): root namespace for the pipeline module', () => {
  it('exposes pipeline.parsePipelineConfig and pipeline.generate', () => {
    expect(typeof root.pipeline.parsePipelineConfig).toBe('function');
    expect(typeof root.pipeline.generate).toBe('function');
  });

  it('parsePipelineConfig accepts the default pipeline and rejects a non-object', () => {
    const parsed = root.pipeline.parsePipelineConfig(structuredClone(defaultProjectConfig));
    expect(parsed.ok).toBe(true);
    const rejected = root.pipeline.parsePipelineConfig(null);
    expect(rejected.ok).toBe(false);
  });

  it('exposes the pipeline analysis under the pipeline namespace', () => {
    expect(typeof root.pipeline.analyzeStructure).toBe('function');
    expect(typeof root.pipeline.skippedAnalysis).toBe('function');
  });

  it('keeps every flat root export that existing callers use', () => {
    const flatNames = ['parseProjectConfig', 'InvalidConfigError'] as const;
    for (const name of flatNames) {
      expect(root, `root export ${name}`).toHaveProperty(name);
    }
  });
});

describe('F-04 enabler (T002): configProblems is the shared refusal list', () => {
  it('returns no problems for the default pipeline', () => {
    expect(configProblems(defaultProjectConfig)).toEqual([]);
  });

  it('returns every problem of a broken configuration, in block-index order', () => {
    const blocks = defaultProjectConfig.pipeline.blocks;
    const flowIndexes = blocks.flatMap((block, index) => (block.kind === 'flow' ? [index] : []));
    const expectedPaths = flowIndexes.map((index) => `pipeline.blocks[${index}].ruleTags[0]`);
    expect(expectedPaths.length).toBeGreaterThan(1);
    const paths = configProblems(brokenConfig()).map((problem) => problem.path);
    expect(paths).toEqual(expectedPaths);
  });

  it('refuseInvalidConfig throws with the same problems, formatted as path: message', () => {
    const config = brokenConfig();
    const expected = configProblems(config).map((problem) => `${problem.path}: ${problem.message}`);
    let thrown: unknown;
    try {
      refuseInvalidConfig(config);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(InvalidConfigError);
    expect((thrown as InvalidConfigError).problems).toEqual(expected);
  });

  it('refuseInvalidConfig returns nothing for the default pipeline', () => {
    expect(() => refuseInvalidConfig(defaultProjectConfig)).not.toThrow();
  });
});
