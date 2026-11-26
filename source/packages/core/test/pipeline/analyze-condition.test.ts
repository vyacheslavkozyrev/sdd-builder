import { describe, expect, it } from 'vitest';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { conditionRule } from '../../src/pipeline/analyze/condition.js';
import type { ConditionBlock, Flow, ProjectConfig } from '../../src/pipeline/model.js';
import { withFlow } from './analyze-fixture.js';

// The valid config with its agent replaced by a condition at index 1 whose description is `description`.
// Both routes lead to the End block, so the condition has its outputs wired.
function withCondition(description: string): ProjectConfig {
  return withFlow((flow: Flow) => ({
    ...flow,
    blocks: flow.blocks.map((block) =>
      block.kind === 'agent'
        ? ({
            index: 1,
            id: '6235136f-9021-5aaf-9958-4bc813c4d9b1',
            kind: 'condition',
            description,
            true: { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' },
            false: { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' },
          } satisfies ConditionBlock)
        : block,
    ),
  }));
}

const DESCRIPTION_FINDING = [{ rule: 'condition-description', path: 'pipeline.flows.0.blocks.1.description' }];

const cases: Array<[string, ProjectConfig, Array<{ rule: string; path: string }>]> = [
  ['F-12 AC-046 a Condition with a description has no finding', withCondition('Is the build green?'), []],
  [
    'F-12 AC-046 an empty Condition description gives a blocker at the description path',
    withCondition(''),
    DESCRIPTION_FINDING,
  ],
  [
    'F-12 AC-046 a Condition description of spaces only gives a blocker at the description path',
    withCondition('   '),
    DESCRIPTION_FINDING,
  ],
  [
    'F-12 AC-046 a Condition description of line breaks and tabs gives a blocker at the description path',
    withCondition('\n\t '),
    DESCRIPTION_FINDING,
  ],
];

describe('F-12 AC-046 Condition description', () => {
  it.each(cases)('%s', (_name, config, expected) => {
    const findings = conditionRule(config);
    expect(findings.every((finding) => finding.severity === 'blocker')).toBe(true);
    expect(findings.map((finding) => ({ rule: finding.rule, path: finding.path }))).toEqual(expected);
  });

  it('F-12 AC-046 a blank Condition description is refused by analyzeStructure with the same blocker', () => {
    expect(analyzeStructure(withCondition(' '))).toContainEqual(
      expect.objectContaining({
        severity: 'blocker',
        rule: 'condition-description',
        path: 'pipeline.flows.0.blocks.1.description',
        message: 'must not be blank',
      }),
    );
  });
});
