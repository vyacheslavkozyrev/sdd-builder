import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';
import { defaultPipeline } from '../../src/pipeline/default.js';
import { configProblems } from '../../src/pipeline/generate/problems.js';
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { buildConfig } from './analyze-fixture.js';

function defaultConfig(): ProjectConfig {
  const result = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: defaultPipeline });
  if (!result.ok) {
    throw new Error('the default pipeline does not parse');
  }
  return result.config;
}

function blockersOf(config: ProjectConfig) {
  return analyzeStructure(config).filter((finding) => finding.severity === 'blocker');
}

describe('F-04 AC-016 configProblems returns the blockers of the analysis', () => {
  it('F-04 AC-016 returns no problem for the valid fixture', () => {
    expect(configProblems(buildConfig())).toEqual([]);
  });

  it('F-04 AC-016 returns exactly the blockers of analyzeStructure, in the same order', () => {
    const config = buildConfig((config) => {
      const flow = config.pipeline.flows[0];
      if (flow) {
        flow.id = 'pipeline';
        flow.blocks = flow.blocks.filter((block) => block.kind !== 'start');
      }
    });
    const problems = configProblems(config);
    expect(problems.length).toBeGreaterThan(1);
    expect(problems).toEqual(blockersOf(config));
  });

  it('F-04 AC-016 returns no warning, even when the analysis has warnings', () => {
    const config = defaultConfig();
    expect(analyzeStructure(config).some((finding) => finding.severity === 'warning')).toBe(true);
    expect(configProblems(config)).toEqual([]);
  });

  it('F-04 AC-016 keeps the analysis order when a flow has a missing Start and a pipeline id', () => {
    const config = buildConfig((config) => {
      const flow = config.pipeline.flows[0];
      if (flow) {
        flow.id = 'pipeline';
        flow.blocks = flow.blocks.filter((block) => block.kind !== 'start');
      }
    });
    expect(configProblems(config).map((finding) => finding.message)).toEqual([
      'The flow has no Start block. Add one Start block.',
      'The flow id "pipeline" clashes with pipeline.md: its command file would be .claude/commands/pipeline.md, the same file as the pipeline command. Rename the flow.',
    ]);
  });
});

describe('F-04 AC-018 warnings do not refuse a config', () => {
  it('F-04 AC-018 the default pipeline has two retry warnings and no problem', () => {
    const config = defaultConfig();
    const warnings = analyzeStructure(config).filter((finding) => finding.severity === 'warning');
    expect(warnings).toHaveLength(2);
    expect(configProblems(config)).toEqual([]);
  });
});

describe('F-04 AC-020 a pipeline with no flows is refused', () => {
  it('F-04 AC-020 returns the no-flow blocker of F-03 and nothing else', () => {
    const config = buildConfig((config) => {
      config.pipeline.flows = [];
    });
    expect(configProblems(config)).toEqual([
      {
        severity: 'blocker',
        path: 'pipeline.flows',
        message: 'The pipeline has no flow. Add at least one flow.',
      },
    ]);
  });
});
