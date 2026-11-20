import { describe, expect, it } from 'vitest';
import { analyzeBrief } from '../../src/pipeline/analyze/brief.js';
import type { Finding } from '../../src/pipeline/analyze/finding.js';
import type { ProjectConfig, Stack } from '../../src/pipeline/model.js';
import { validConfig } from './analyze-fixture.js';

const RULE = { index: 0, id: 'style', title: 'Style', text: 'Keep it short.' };

// The valid config with its brief set by `brief`. The pipeline is the fixture's, so only the brief varies.
function withBrief(brief: { name?: string; idea?: string; stack?: Stack; rules?: ProjectConfig['rules'] }): ProjectConfig {
  return { ...validConfig(), ...brief };
}

const COMPLETE_STACK: Stack = {
  language: 'TypeScript',
  framework: 'React',
  platform: 'Web',
  buildTool: 'Vite',
  testFramework: 'Vitest',
};

const COMPLETE: ProjectConfig = withBrief({
  name: 'Demo',
  idea: 'A demo project.',
  stack: COMPLETE_STACK,
  rules: [RULE],
});

function findingsOf(config: ProjectConfig): Array<Pick<Finding, 'severity' | 'path'>> {
  return analyzeBrief(config).map((finding) => ({ severity: finding.severity, path: finding.path }));
}

const BLANK_VALUES: Array<[string, string]> = [
  ['empty', ''],
  ['spaces', '   '],
  ['line breaks', '\n\t \r\n'],
];

describe('F-06 AC-001 a blank name, idea or stack.language is a blocker at its path', () => {
  it.each(BLANK_VALUES)('a required field that is %s gives a blocker at its path', (_label, value) => {
    expect(findingsOf({ ...COMPLETE, name: value })).toEqual([{ severity: 'blocker', path: 'name' }]);
    expect(findingsOf({ ...COMPLETE, idea: value })).toEqual([{ severity: 'blocker', path: 'idea' }]);
    expect(findingsOf({ ...COMPLETE, stack: { ...COMPLETE_STACK, language: value } })).toEqual([
      { severity: 'blocker', path: 'stack.language' },
    ]);
  });

  it('an absent name, idea or stack.language gives a blocker at its path', () => {
    const noName: ProjectConfig = { ...validConfig(), idea: 'Idea', stack: COMPLETE_STACK, rules: [RULE] };
    const noIdea: ProjectConfig = { ...validConfig(), name: 'Demo', stack: COMPLETE_STACK, rules: [RULE] };
    const noLanguage: Stack = { framework: 'React', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' };
    expect(findingsOf(noName)).toEqual([{ severity: 'blocker', path: 'name' }]);
    expect(findingsOf(noIdea)).toEqual([{ severity: 'blocker', path: 'idea' }]);
    expect(findingsOf({ ...COMPLETE, stack: noLanguage })).toEqual([{ severity: 'blocker', path: 'stack.language' }]);
    const noStack: ProjectConfig = { ...validConfig(), name: 'Demo', idea: 'Idea', rules: [RULE] };
    expect(findingsOf(noStack)).toEqual([
      { severity: 'blocker', path: 'stack.language' },
      { severity: 'warning', path: 'stack.framework' },
      { severity: 'warning', path: 'stack.platform' },
      { severity: 'warning', path: 'stack.buildTool' },
      { severity: 'warning', path: 'stack.testFramework' },
    ]);
  });

  it('a required field with text around its spaces is not blank', () => {
    const padded = { ...COMPLETE, name: ' Demo ', idea: '\nIdea\n', stack: { ...COMPLETE_STACK, language: ' TS ' } };
    expect(analyzeBrief(padded)).toEqual([]);
  });
});

describe('F-06 AC-002 a blank or absent optional stack field is a warning at stack.<field>', () => {
  const OPTIONAL = ['framework', 'platform', 'buildTool', 'testFramework'] as const;

  const ABSENT: Array<[string, Stack]> = [
    ['framework', { language: 'TypeScript', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' }],
    ['platform', { language: 'TypeScript', framework: 'React', buildTool: 'Vite', testFramework: 'Vitest' }],
    ['buildTool', { language: 'TypeScript', framework: 'React', platform: 'Web', testFramework: 'Vitest' }],
    ['testFramework', { language: 'TypeScript', framework: 'React', platform: 'Web', buildTool: 'Vite' }],
  ];

  it.each(ABSENT)('stack.%s absent gives a warning at its path', (field, stack) => {
    expect(findingsOf(withBrief({ name: 'Demo', idea: 'Idea', stack, rules: [RULE] }))).toEqual([
      { severity: 'warning', path: `stack.${field}` },
    ]);
  });

  it.each(OPTIONAL)('stack.%s blank gives a warning at its path', (field) => {
    for (const [, value] of BLANK_VALUES) {
      const stack: Stack = { ...COMPLETE_STACK, [field]: value };
      expect(findingsOf(withBrief({ name: 'Demo', idea: 'Idea', stack, rules: [RULE] }))).toEqual([
        { severity: 'warning', path: `stack.${field}` },
      ]);
    }
  });

  it('a stack with no optional field at all gives four warnings in the stack order', () => {
    expect(findingsOf(withBrief({ name: 'Demo', idea: 'Idea', stack: { language: 'TypeScript' }, rules: [RULE] }))).toEqual([
      { severity: 'warning', path: 'stack.framework' },
      { severity: 'warning', path: 'stack.platform' },
      { severity: 'warning', path: 'stack.buildTool' },
      { severity: 'warning', path: 'stack.testFramework' },
    ]);
  });
});

describe('F-06 AC-003 an empty rules list is a warning at rules', () => {
  it('an empty rules list gives a warning at rules', () => {
    expect(findingsOf(withBrief({ name: 'Demo', idea: 'Idea', stack: COMPLETE_STACK, rules: [] }))).toEqual([
      { severity: 'warning', path: 'rules' },
    ]);
  });

  it('a list with one rule gives no rules warning', () => {
    expect(findingsOf(withBrief({ name: 'Demo', idea: 'Idea', stack: COMPLETE_STACK, rules: [RULE] }))).toEqual([]);
  });

  it('a list with several rules gives no rules warning', () => {
    const rules = [RULE, { index: 1, id: 'tone', title: 'Tone', text: 'Be plain.' }];
    expect(findingsOf(withBrief({ name: 'Demo', idea: 'Idea', stack: COMPLETE_STACK, rules }))).toEqual([]);
  });
});

describe('F-06 AC-004 a complete brief gives no brief finding', () => {
  it('a brief with every required field, every optional stack field and one rule gives none', () => {
    expect(analyzeBrief(COMPLETE)).toEqual([]);
  });
});

describe('F-06 AC-006 brief findings come in the fixed order', () => {
  it('lists name, idea, stack.language, the four stack fields, then rules', () => {
    const everything = withBrief({ name: '', idea: '', stack: { language: ' ' }, rules: [] });
    expect(findingsOf(everything)).toEqual([
      { severity: 'blocker', path: 'name' },
      { severity: 'blocker', path: 'idea' },
      { severity: 'blocker', path: 'stack.language' },
      { severity: 'warning', path: 'stack.framework' },
      { severity: 'warning', path: 'stack.platform' },
      { severity: 'warning', path: 'stack.buildTool' },
      { severity: 'warning', path: 'stack.testFramework' },
      { severity: 'warning', path: 'rules' },
    ]);
  });

  it('keeps the order when only some of the fields are blank', () => {
    const config = withBrief({ rules: [], stack: { framework: '', platform: 'Web', testFramework: '' } });
    expect(findingsOf(config).map((finding) => finding.path)).toEqual([
      'name',
      'idea',
      'stack.language',
      'stack.framework',
      'stack.buildTool',
      'stack.testFramework',
      'rules',
    ]);
  });
});
