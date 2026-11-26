import { describe, expect, it } from 'vitest';
import { analyzeStructure, type Finding } from '../../src/pipeline/analyze/index.js';
import { blockersOf, configProblems } from '../../src/pipeline/generate/refuse.js';
import defaultPipelineJson from '../../../../templates/pipeline/default.json' with { type: 'json' };
import { parseProjectConfig } from '../../src/pipeline/parse/index.js';
import type { ProjectConfig } from '../../src/pipeline/model.js';
import { validConfig, withFlow } from './analyze-fixture.js';

// A config with several blockers: the flow is named `Pipeline!`, whose command file would be pipeline.md (AC-022), and its
// End block is removed (F-03 AC-004), so the Agent's `next` names no block.
function manyBlockers(): ProjectConfig {
  return withFlow((flow) => ({
    ...flow,
    name: 'Pipeline!',
    blocks: flow.blocks.filter((block) => block.kind !== 'end'),
  }));
}

const warning: Finding = { severity: 'warning', rule: 'test-warning', path: 'root', message: 'a warning' };
const blocker: Finding = { severity: 'blocker', rule: 'test-blocker', path: 'root', message: 'a blocker' };

describe('F-04 AC-019 the refusal returns exactly the blockers of the analysis, in order', () => {
  it('returns the three blockers of the analysis, in the analysis order', () => {
    const problems = configProblems(manyBlockers());
    expect(problems.map(({ severity, rule, path }) => ({ severity, rule, path }))).toEqual([
      { severity: 'blocker', rule: 'flow-end', path: 'pipeline.flows.0' },
      { severity: 'blocker', rule: 'command-file-clash', path: 'pipeline.flows.0.name' },
      { severity: 'blocker', rule: 'block-link', path: 'pipeline.flows.0.blocks.1.next' },
    ]);
  });

  it('returns the same findings as the blockers of analyzeStructure, unchanged', () => {
    const config = manyBlockers();
    expect(configProblems(config)).toEqual(blockersOf(analyzeStructure(config)));
  });
});

describe('F-04 AC-021 warnings do not refuse a configuration', () => {
  it('gives no problem for a valid minimal configuration', () => {
    expect(configProblems(validConfig())).toEqual([]);
  });

  it('gives no problem for the default pipeline, whose analysis has no blocker', () => {
    const parsed = parseProjectConfig({ schemaVersion: 2, rules: [], pipeline: defaultPipelineJson });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(configProblems(parsed.config)).toEqual([]);
  });

  it.each([
    ['an empty list', [], []],
    ['only a warning', [warning], []],
    ['a warning before a blocker', [warning, blocker], [blocker]],
    ['a blocker before a warning', [blocker, warning], [blocker]],
    ['two blockers with a warning between', [blocker, warning, blocker], [blocker, blocker]],
  ])('blockersOf keeps only the blockers for %s, in order', (_name, findings, expected) => {
    expect(blockersOf(findings)).toEqual(expected);
  });
});

describe('F-04 AC-022 a flow named pipeline is refused at the flow name path', () => {
  it('gives one blocker at the name of the flow, because its command file would clash with the pipeline command', () => {
    const problems = configProblems(withFlow((flow) => ({ ...flow, name: 'Pipeline!' })));
    expect(problems).toEqual([
      expect.objectContaining({
        severity: 'blocker',
        rule: 'command-file-clash',
        path: 'pipeline.flows.0.name',
      }),
    ]);
  });

  it('reports the same blocker as the analysis (AC-019)', () => {
    const config = withFlow((flow) => ({ ...flow, name: 'Pipeline!' }));
    expect(configProblems(config)).toEqual(blockersOf(analyzeStructure(config)));
  });
});

describe('F-04 AC-023 a pipeline with no flows is refused', () => {
  it('gives exactly the blocker of F-03 for a pipeline with no flows', () => {
    const base = validConfig();
    const config: ProjectConfig = { ...base, pipeline: { ...base.pipeline, flows: [] } };
    const problems = configProblems(config);
    expect(problems).toEqual([
      expect.objectContaining({
        severity: 'blocker',
        path: 'pipeline.flows',
        message: 'must have at least one flow, got none',
      }),
    ]);
  });
});
