import { describe, expect, it } from 'vitest';
import type { AnalysisResult } from '../src/model.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { analyzeStructure, skippedAnalysis } from '../src/pipeline/index.js';
import type { ProjectConfig } from '../src/pipeline/model.js';

/** A copy of the default configuration with a blocker: a flow tagged with a rule the project does not have. */
function blockerConfig(): ProjectConfig {
  const config = structuredClone(defaultProjectConfig);
  config.pipeline = {
    ...config.pipeline,
    blocks: config.pipeline.blocks.map((block) =>
      block.kind === 'flow' ? { ...block, ruleTags: ['no-such-rule'] } : block,
    ),
  };
  return config;
}

describe('F-04 AC-022 skipped review keeps the structural findings and has no LLM part', () => {
  const configs: { name: string; config: ProjectConfig }[] = [
    { name: 'the default pipeline', config: structuredClone(defaultProjectConfig) },
    { name: 'a pipeline with a refusal blocker', config: blockerConfig() },
  ];

  for (const { name, config } of configs) {
    it(`F-04 AC-022 review is skipped with no findings and no dropped entries for ${name}`, () => {
      const result: AnalysisResult = skippedAnalysis(config);

      expect(result.review).toEqual({ status: 'skipped', findings: [], dropped: 0 });
    });

    it(`F-04 AC-022 findings equal analyzeStructure for ${name}`, () => {
      expect(skippedAnalysis(config).findings).toEqual(analyzeStructure(config));
    });
  }

  it('F-04 AC-022 keeps the blocker of a refused pipeline in the findings', () => {
    const blockers = skippedAnalysis(blockerConfig()).findings.filter((finding) => finding.severity === 'blocker');
    expect(blockers.length).toBeGreaterThan(0);
  });

  it('F-04 AC-022 is deterministic for equal configurations', () => {
    expect(skippedAnalysis(blockerConfig())).toEqual(skippedAnalysis(blockerConfig()));
  });

  it('F-04 AC-022 does not change the configuration it reads', () => {
    const config = blockerConfig();
    const before = structuredClone(config);
    skippedAnalysis(config);
    expect(config).toEqual(before);
  });
});
