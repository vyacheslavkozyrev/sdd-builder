import { describe, expect, it } from 'vitest';
import { capProblems, INPUT_CAPS, type ModuleSpec, type ProjectConfig } from '../src/index.js';
import { baseConfig } from './fixtures.js';

function moduleNamed(name: string): ModuleSpec {
  return { name, layer: 1, responsibility: 'Holds one responsibility.', dependsOn: [] };
}

function modules(count: number): ModuleSpec[] {
  return Array.from({ length: count }, (_, index) => moduleNamed(`module-${index}`));
}

function rules(count: number, prefix = 'rule'): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix} ${index}`);
}

function withIdea(length: number): ProjectConfig {
  return baseConfig({ idea: 'x'.repeat(length) });
}

describe('F-13 AC-010 idea text is capped at 8,000 characters', () => {
  it('F-13 AC-010 accepts an idea of exactly 8,000 characters', () => {
    expect(capProblems(withIdea(8000))).toEqual([]);
  });

  it('F-13 AC-010 refuses an idea of 8,001 characters with one problem for the idea', () => {
    expect(capProblems(withIdea(8001))).toEqual([
      'idea: 8001 characters, the limit is 8000',
    ]);
  });

  it('F-13 AC-010 the cap value is 8,000 characters', () => {
    expect(INPUT_CAPS.ideaCharacters).toBe(8000);
  });
});

describe('F-13 AC-011 modules are capped at 12', () => {
  it('F-13 AC-011 accepts 12 modules', () => {
    expect(capProblems(baseConfig({ architecture: { style: 'layered', modules: modules(12) } }))).toEqual([]);
  });

  it('F-13 AC-011 refuses 13 modules with one problem for the modules', () => {
    expect(capProblems(baseConfig({ architecture: { style: 'layered', modules: modules(13) } }))).toEqual([
      'architecture.modules: 13 modules, the limit is 12',
    ]);
  });
});

describe('F-13 AC-012 code rules and test rules are capped at 60 together', () => {
  const cases: { name: string; codeRules: number; testRules: number; accepted: boolean }[] = [
    { name: '60 code rules and no test rules', codeRules: 60, testRules: 0, accepted: true },
    { name: '30 code rules and 30 test rules', codeRules: 30, testRules: 30, accepted: true },
    { name: '31 code rules and 30 test rules', codeRules: 31, testRules: 30, accepted: false },
    { name: '0 code rules and 61 test rules', codeRules: 0, testRules: 61, accepted: false },
  ];

  for (const { name, codeRules, testRules, accepted } of cases) {
    it(`F-13 AC-012 ${accepted ? 'accepts' : 'refuses'} ${name}`, () => {
      const problems = capProblems(
        baseConfig({ codeRules: rules(codeRules, 'code'), testRules: rules(testRules, 'test') }),
      );
      if (accepted) {
        expect(problems).toEqual([]);
      } else {
        expect(problems).toEqual([`codeRules and testRules: ${codeRules + testRules} rules, the limit is 60`]);
      }
    });
  }

  it('F-13 AC-012 the cap value is 60 rules', () => {
    expect(INPUT_CAPS.rules).toBe(60);
  });
});

describe('F-13 AC-013 idea length is the JavaScript string length as submitted, with no trimming', () => {
  it('F-13 AC-013 counts surrounding whitespace in the idea length', () => {
    const padded = ` ${'x'.repeat(7999)} `;
    expect(padded.length).toBe(8001);
    expect(capProblems(baseConfig({ idea: padded }))).toEqual([
      'idea: 8001 characters, the limit is 8000',
    ]);
  });

  it('F-13 AC-013 counts a surrogate pair as two characters, as JavaScript does', () => {
    const emoji = '\u{1F600}'.repeat(4000);
    expect(emoji.length).toBe(8000);
    expect(capProblems(baseConfig({ idea: emoji }))).toEqual([]);
    expect(capProblems(baseConfig({ idea: `${emoji}x` }))).toEqual([
      'idea: 8001 characters, the limit is 8000',
    ]);
  });
});

describe('F-13 AC-014 a refusal lists every exceeded cap in a fixed order and never includes submitted text', () => {
  it('F-13 AC-014 lists the idea, then the modules, then the rules when all three are exceeded', () => {
    const config = baseConfig({
      idea: 'SECRET-IDEA-TEXT '.repeat(600),
      architecture: { style: 'layered', modules: modules(13) },
      codeRules: rules(40, 'SECRET-RULE'),
      testRules: rules(21, 'SECRET-TEST'),
    });
    const problems = capProblems(config);

    expect(problems).toEqual([
      `idea: ${config.idea.length} characters, the limit is 8000`,
      'architecture.modules: 13 modules, the limit is 12',
      'codeRules and testRules: 61 rules, the limit is 60',
    ]);
  });

  it('F-13 AC-014 each problem has the form <path>: <reason>', () => {
    const problems = capProblems(
      baseConfig({ idea: 'x'.repeat(8001), architecture: { style: 'layered', modules: modules(13) } }),
    );
    expect(problems).toHaveLength(2);
    for (const problem of problems) {
      expect(problem).toMatch(/^[A-Za-z.]+( and [A-Za-z.]+)?: .+$/);
    }
  });

  it('F-13 AC-014 never includes submitted text in a problem', () => {
    const secret = 'PRIVATE-BRIEF-CONTENT';
    const problems = capProblems(
      baseConfig({
        idea: `${secret} ${'x'.repeat(8000)}`,
        architecture: { style: 'layered', modules: [moduleNamed(secret), ...modules(12)] },
        codeRules: [secret, ...rules(60)],
      }),
    );

    expect(problems).toHaveLength(3);
    for (const problem of problems) {
      expect(problem).not.toContain(secret);
    }
  });

  it('F-13 AC-014 returns no problems for a configuration within every cap', () => {
    expect(capProblems(baseConfig())).toEqual([]);
  });
});
