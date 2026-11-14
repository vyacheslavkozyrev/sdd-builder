import { describe, expect, it } from 'vitest';
import {
  analyzeStructure,
  checkReview,
  DEFAULT_STEP_CATALOG,
  skippedAnalysis,
  validateConfig,
  type ProjectConfig,
  type StepDefinition,
} from '../src/index.js';
import { baseConfig } from './fixtures.js';

/** A custom step that reuses a catalog id: `validateConfig` refuses it, so the analysis holds a blocker. */
function refusedConfig(): ProjectConfig {
  const clash: StepDefinition = {
    id: DEFAULT_STEP_CATALOG[0]!.id,
    name: 'Clash',
    summary: 'Clashes with a catalog id.',
    kind: 'command',
    origin: 'custom',
    required: false,
    consumes: [],
    produces: [],
    ruleTags: [],
    body: 'Body.',
  };
  return baseConfig({ customSteps: [clash] });
}

describe('F-13 AC-022 skipped review keeps the structural findings and has no LLM part', () => {
  const configs: { name: string; config: ProjectConfig }[] = [
    { name: 'the default configuration', config: baseConfig() },
    { name: 'a configuration with a refusal blocker', config: refusedConfig() },
  ];

  for (const { name, config } of configs) {
    it(`F-13 AC-022 review is skipped with no findings and no dropped entries for ${name}`, () => {
      const result = skippedAnalysis(config);

      expect(result.review).toEqual({ status: 'skipped', findings: [], dropped: 0 });
    });

    it(`F-13 AC-022 findings equal the structural findings for ${name}`, () => {
      const result = skippedAnalysis(config);

      expect(result.findings).toEqual(analyzeStructure(config));
      expect(Object.keys(result).sort()).toEqual(['findings', 'review']);
    });
  }

  it('F-13 AC-022 a refused configuration still shows its blocker when the review is skipped', () => {
    const config = refusedConfig();
    expect(validateConfig(config).length).toBeGreaterThan(0);

    const blockers = skippedAnalysis(config).findings.filter((finding) => finding.severity === 'blocker');
    expect(blockers.length).toBeGreaterThan(0);
  });

  it('F-13 AC-022 the same configuration gives the same skipped analysis', () => {
    const config = baseConfig();
    expect(skippedAnalysis(config)).toEqual(skippedAnalysis(config));
  });

  it('F-13 AC-022 does not change the configuration it is given', () => {
    const config = baseConfig();
    const before = structuredClone(config);
    skippedAnalysis(config);
    expect(config).toEqual(before);
  });

  it('F-13 AC-022 the review check still gives failed for a non-array reply and ok for an empty array', () => {
    expect(checkReview('not an array')).toEqual({ status: 'failed' });
    expect(checkReview([])).toEqual({ status: 'ok', findings: [], dropped: 0 });
  });
});
