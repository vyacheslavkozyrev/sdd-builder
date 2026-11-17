import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { buildConfig } from './analyze-fixture.js';

// The fixture pipeline with the brief fields set to `brief`, and its agent block removed, so that the
// structural checks have findings to compare (Start is left pointing at a missing block).
function brokenPipeline(brief: Partial<ProjectConfig>): ProjectConfig {
  return buildConfig((config) => {
    Object.assign(config, brief);
    config.pipeline.flows[0]!.blocks.splice(1, 1);
  });
}

describe('F-06 AC-011 the brief does not change the structural findings', () => {
  it('F-06 AC-011 gives the same structural findings with no brief and with a blank brief', () => {
    const blankBrief = brokenPipeline({
      name: ' ',
      idea: '\n',
      stack: { language: '  ', framework: '', platform: '', buildTool: '', testFramework: '' },
    });
    const noBrief = brokenPipeline({});
    expect(analyzeStructure(noBrief).length).toBeGreaterThan(0);
    expect(analyzeStructure(blankBrief)).toEqual(analyzeStructure(noBrief));
  });

  it('F-06 AC-011 gives the same structural findings with a blank brief and with a complete brief', () => {
    const blankBrief = brokenPipeline({ name: '', idea: '   ', stack: { language: '' } });
    const completeBrief = brokenPipeline({
      name: 'SDDBuilder',
      idea: 'A wizard that writes a Claude Code layout.',
      stack: {
        language: 'TypeScript',
        framework: 'React',
        platform: 'Web browser',
        buildTool: 'Vite',
        testFramework: 'Vitest',
      },
      rules: [{ id: 'no-secrets', title: 'No secrets', text: 'Never commit keys.' }],
    });
    expect(analyzeStructure(blankBrief).length).toBeGreaterThan(0);
    expect(analyzeStructure(completeBrief)).toEqual(analyzeStructure(blankBrief));
  });
});
