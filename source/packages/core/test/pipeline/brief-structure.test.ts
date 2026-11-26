import { describe, expect, it } from 'vitest';
import { analyzeBrief } from '../../src/pipeline/analyze/brief.js';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig, withFlow } from './analyze-fixture.js';

// Every rule id the brief checks can report, taken from a brief where each check fires.
const BLANK_BRIEF: ProjectConfig = { ...validConfig(), name: '', idea: '', stack: { language: '' }, rules: [] };
const BRIEF_RULES = analyzeBrief(BLANK_BRIEF).map((finding) => finding.rule);

// A pipeline with one structural blocker, so the structural findings are not empty.
function brokenPipeline(): ProjectConfig {
  return withFlow((flow) => ({ ...flow, name: '' }));
}

describe('F-06 AC-005 the brief checks are not part of analyzeStructure', () => {
  it('gives the same structural findings for a blank brief and a complete brief', () => {
    const blank = validConfig();
    const complete: ProjectConfig = {
      ...validConfig(),
      name: 'Demo',
      idea: 'A demo project.',
      stack: { language: 'TypeScript', framework: 'React', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' },
      rules: [{ index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style', text: 'Keep it short.' }],
    };
    expect(analyzeStructure(complete)).toEqual(analyzeStructure(blank));
  });

  it('gives the same structural findings for a blank brief and a complete brief with a broken pipeline', () => {
    const blank = brokenPipeline();
    const complete: ProjectConfig = { ...blank, name: 'Demo', idea: 'A demo project.', stack: { language: 'TypeScript' } };
    expect(analyzeStructure(complete)).toEqual(analyzeStructure(blank));
    expect(analyzeStructure(blank).length).toBeGreaterThan(0);
  });

  it('never reports a brief rule, even when the brief is blank', () => {
    expect(BRIEF_RULES).toHaveLength(8);
    const rules = analyzeStructure(BLANK_BRIEF).map((finding) => finding.rule);
    for (const rule of BRIEF_RULES) expect(rules).not.toContain(rule);
  });
});
