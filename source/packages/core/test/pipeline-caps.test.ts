import { describe, expect, it } from 'vitest';
import { PIPELINE_INPUT_CAPS, pipelineCapProblems } from '../src/pipeline/caps.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import type { ProjectConfig, Rule } from '../src/pipeline/model.js';

/** A rule with a fixed shape; the caps count entries only, so the text is the same for every rule. */
function rule(index: number): Rule {
  return { id: `rule-${index}`, title: `Rule ${index}`, text: 'Fixed text.' };
}

/** A copy of the default configuration with the given idea and rule count. The default is never mutated. */
function configWith(idea: string, ruleCount: number): ProjectConfig {
  const config = structuredClone(defaultProjectConfig);
  config.idea = idea;
  config.rules = Array.from({ length: ruleCount }, (_, index) => rule(index));
  return config;
}

describe('F-04 AC-021 the pipeline input caps are 8,000 idea characters and 60 rules', () => {
  it('F-04 AC-021 the caps are the named constants', () => {
    expect(PIPELINE_INPUT_CAPS).toEqual({ ideaCharacters: 8000, rules: 60 });
  });

  const passing: { name: string; idea: string; ruleCount: number }[] = [
    { name: 'an idea of exactly 8,000 characters', idea: 'x'.repeat(8000), ruleCount: 0 },
    { name: 'an emoji idea of exactly 8,000 code points', idea: '\u{1F600}'.repeat(8000), ruleCount: 0 },
    { name: 'exactly 60 rules', idea: 'Short idea.', ruleCount: 60 },
    { name: 'the default configuration', idea: defaultProjectConfig.idea, ruleCount: defaultProjectConfig.rules.length },
  ];

  for (const { name, idea, ruleCount } of passing) {
    it(`F-04 AC-021 passes ${name}`, () => {
      expect(pipelineCapProblems(configWith(idea, ruleCount))).toEqual([]);
    });
  }

  const failing: { name: string; idea: string; ruleCount: number; expected: string[] }[] = [
    {
      name: 'an idea of 8,001 characters',
      idea: 'x'.repeat(8001),
      ruleCount: 0,
      expected: ['idea: 8001 characters, the limit is 8000'],
    },
    {
      name: 'an emoji idea of 8,001 code points',
      idea: '\u{1F600}'.repeat(8001),
      ruleCount: 0,
      expected: ['idea: 8001 characters, the limit is 8000'],
    },
    {
      name: '61 rules',
      idea: 'Short idea.',
      ruleCount: 61,
      expected: ['rules: 61 rules, the limit is 60'],
    },
    {
      name: 'an idea of 8,001 characters and 61 rules, idea first',
      idea: 'x'.repeat(8001),
      ruleCount: 61,
      expected: ['idea: 8001 characters, the limit is 8000', 'rules: 61 rules, the limit is 60'],
    },
  ];

  for (const { name, idea, ruleCount, expected } of failing) {
    it(`F-04 AC-021 reports ${name}`, () => {
      expect(pipelineCapProblems(configWith(idea, ruleCount))).toEqual(expected);
    });
  }

  it('F-04 AC-021 counts the idea in code points as submitted, with no trimming', () => {
    const padded = ` ${'x'.repeat(8000)} `;
    expect(pipelineCapProblems(configWith(padded, 0))).toEqual([
      'idea: 8002 characters, the limit is 8000',
    ]);
  });

  it('F-04 AC-021 counts an emoji as one character, so 8,000 emoji code points pass and one more is refused', () => {
    const emoji = '\u{1F600}';
    expect(emoji.length).toBe(2);
    expect(pipelineCapProblems(configWith(emoji.repeat(8000), 0))).toEqual([]);
    expect(pipelineCapProblems(configWith(`${emoji.repeat(8000)}x`, 0))).toEqual([
      'idea: 8001 characters, the limit is 8000',
    ]);
  });

  it('F-04 AC-021 reasons carry counts and limits only, never the submitted idea text', () => {
    const secret = 'confidential-brief-text '.repeat(400);
    const problems = pipelineCapProblems(configWith(secret, 0));
    expect(problems).toHaveLength(1);
    expect(problems[0]).not.toContain('confidential');
    expect(problems[0]).toMatch(/^idea: \d+ characters, the limit is 8000$/);
  });

  it('F-04 AC-021 does not change the configuration it reads', () => {
    const config = configWith('x'.repeat(8001), 61);
    const before = structuredClone(config);
    pipelineCapProblems(config);
    expect(config).toEqual(before);
  });
});
