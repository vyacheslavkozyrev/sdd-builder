import { describe, expect, it } from 'vitest';
import { INPUT_CAPS } from '@sddbuilder/core';
import { emptyBrief } from '../src/brief/state.js';
import type { BriefState } from '../src/brief/state.js';
import { canAnalyze } from '../src/brief/gate.js';
import { PRIVACY_CHECKBOX_LABEL, PRIVACY_NOTICE } from '../src/brief/privacy.js';
import { progressEntries } from '../src/brief/progress.js';
import type { ProgressStatus } from '../src/brief/progress.js';

/** A brief that passes validation: name, idea, stack language, style and one module. */
function validBrief(): BriefState {
  return {
    name: 'Hourly Tracker',
    idea: 'Hourly Tracker helps a household see when electricity is cheap.',
    stack: { language: 'TypeScript', framework: '', testFramework: '', buildTool: '' },
    architecture: {
      style: 'Layered',
      modules: [{ name: 'core', layer: '0', responsibility: 'Domain types', dependsOn: '' }],
    },
    codeRules: [],
    testRules: [],
    privacyAccepted: false,
  };
}

function withRules(codeRules: string[], testRules: string[]): BriefState {
  return { ...validBrief(), codeRules, testRules };
}

function statusOf(brief: BriefState): Record<string, ProgressStatus> {
  return Object.fromEntries(progressEntries(brief).map((entry) => [entry.key, entry.status]));
}

describe('F-05 AC-013 progress panel', () => {
  it('shows the four entries in panel order with their labels', () => {
    const entries = progressEntries(emptyBrief());
    expect(entries.map((entry) => [entry.key, entry.label])).toEqual([
      ['idea', 'idea'],
      ['stack', 'stack'],
      ['modules', 'modules'],
      ['rules', 'rules'],
    ]);
  });

  it.each<[string, (brief: BriefState) => void, Record<string, ProgressStatus>]>([
    ['a valid brief with no rules', () => {}, { idea: 'valid', stack: 'valid', modules: 'valid', rules: 'optional' }],
    ['a blank idea', (brief) => { brief.idea = '   '; }, { idea: 'incomplete', stack: 'valid', modules: 'valid', rules: 'optional' }],
    ['an idea over the cap', (brief) => { brief.idea = 'x'.repeat(INPUT_CAPS.ideaCharacters + 1); }, { idea: 'incomplete', stack: 'valid', modules: 'valid', rules: 'optional' }],
    ['a blank stack language', (brief) => { brief.stack.language = ''; }, { idea: 'valid', stack: 'incomplete', modules: 'valid', rules: 'optional' }],
    ['a module layer that is not a whole number', (brief) => { brief.architecture.modules[0]!.layer = '-1'; }, { idea: 'valid', stack: 'valid', modules: 'incomplete', rules: 'optional' }],
    ['a blank architecture style', (brief) => { brief.architecture.style = ''; }, { idea: 'valid', stack: 'valid', modules: 'valid', rules: 'optional' }],
  ])('marks the entries for %s', (_case, change, expected) => {
    const brief = validBrief();
    change(brief);
    expect(statusOf(brief)).toEqual(expected);
  });

  it.each<[string, string[], string[], ProgressStatus]>([
    ['no rules', [], [], 'optional'],
    ['only blank rules', ['   '], [''], 'optional'],
    ['one code rule', ['Strict types'], [], 'valid'],
    ['one test rule', [], ['Vitest only'], 'valid'],
    ['a code rule and a test rule', ['Strict types'], ['Vitest only'], 'valid'],
  ])('rules entry is %s', (_case, codeRules, testRules, expected) => {
    expect(statusOf(withRules(codeRules, testRules)).rules).toBe(expected);
  });

  it('does not change the idea, stack or modules entries when rules are added', () => {
    const { rules: _rulesBefore, ...before } = statusOf(validBrief());
    const { rules: _rulesAfter, ...after } = statusOf(withRules(['Strict types'], ['Vitest only']));
    expect(after).toEqual(before);
  });
});

describe('F-05 AC-014 privacy notice', () => {
  it('holds the exact notice sentence from the wireframe', () => {
    expect(PRIVACY_NOTICE).toBe(
      'Your brief is sent to an AI model provider for review. The service does not store or log it, and the review only advises. It never edits your setup.',
    );
  });

  it('holds the exact checkbox label', () => {
    expect(PRIVACY_CHECKBOX_LABEL).toBe('I understand, send the brief for review');
  });
});

describe('F-05 AC-015 checkbox starts unticked', () => {
  it('emptyBrief starts with the checkbox unticked', () => {
    expect(emptyBrief().privacyAccepted).toBe(false);
  });

  it.each<[string, BriefState]>([
    ['a valid brief', validBrief()],
    ['a valid brief with rules', withRules(['Strict types'], [])],
  ])('keeps Analyze disabled for %s while the box is unticked', (_case, brief) => {
    expect(canAnalyze(brief, brief.privacyAccepted)).toBe(false);
  });
});

describe('F-05 AC-016 Analyze needs a valid brief', () => {
  it.each<[string, (brief: BriefState) => void]>([
    ['a blank name', (brief) => { brief.name = ''; }],
    ['a whitespace-only idea', (brief) => { brief.idea = ' \n\t '; }],
    ['an idea one character over the cap', (brief) => { brief.idea = 'x'.repeat(INPUT_CAPS.ideaCharacters + 1); }],
    ['a blank stack language', (brief) => { brief.stack.language = ''; }],
    ['a blank architecture style', (brief) => { brief.architecture.style = ''; }],
    ['a module layer of 1.5', (brief) => { brief.architecture.modules[0]!.layer = '1.5'; }],
  ])('keeps Analyze disabled for %s even when the box is ticked', (_case, change) => {
    const brief = validBrief();
    change(brief);
    expect(canAnalyze(brief, true)).toBe(false);
  });

  it('keeps Analyze disabled for an empty brief even when the box is ticked', () => {
    expect(canAnalyze(emptyBrief(), true)).toBe(false);
  });

  it.each<[string, (brief: BriefState) => void]>([
    ['an idea of exactly the cap', (brief) => { brief.idea = 'x'.repeat(INPUT_CAPS.ideaCharacters); }],
    ['a layer of 0', (brief) => { brief.architecture.modules[0]!.layer = '0'; }],
    ['no rules at all', () => {}],
    ['only blank rules', (brief) => { brief.codeRules = ['  ']; }],
  ])('enables Analyze for a valid brief with %s when the box is ticked', (_case, change) => {
    const brief = validBrief();
    change(brief);
    expect(canAnalyze(brief, true)).toBe(true);
  });
});

describe('F-05 AC-017 unticking the checkbox disables Analyze again', () => {
  it('goes enabled, disabled, enabled as the box is ticked and unticked', () => {
    const brief = validBrief();
    const states = [false, true, false, true].map((accepted) => canAnalyze(brief, accepted));
    expect(states).toEqual([false, true, false, true]);
  });

  it('stays disabled when the box is unticked for an invalid brief', () => {
    const brief = emptyBrief();
    expect([canAnalyze(brief, true), canAnalyze(brief, false)]).toEqual([false, false]);
  });
});

describe('F-05 AC-027 progress shows modules incomplete for a blank module name', () => {
  it.each<[string, string]>([
    ['an empty name', ''],
    ['a whitespace-only name', '   '],
  ])('F-05 AC-027 marks the modules entry incomplete for %s', (_case, name) => {
    const brief = validBrief();
    brief.architecture.modules[0]!.name = name;
    expect(statusOf(brief).modules).toBe('incomplete');
  });

  it('F-05 AC-027 never ticks modules when a second module has a blank name', () => {
    const brief = validBrief();
    brief.architecture.modules.push({ name: ' ', layer: '1', responsibility: 'Web', dependsOn: 'core' });
    expect(statusOf(brief).modules).toBe('incomplete');
  });
});

describe('F-05 AC-028 progress shows modules incomplete with no modules', () => {
  it('F-05 AC-028 does not show modules as valid when the module list is empty', () => {
    const brief = validBrief();
    brief.architecture.modules = [];
    expect(statusOf(brief).modules).toBe('incomplete');
  });

  it('F-05 AC-028 shows modules as valid once one valid module is listed', () => {
    const brief = validBrief();
    brief.architecture.modules = [{ name: 'core', layer: '0', responsibility: 'Types', dependsOn: '' }];
    expect(statusOf(brief).modules).toBe('valid');
  });
});

describe('F-05 AC-027 AC-028 Analyze stays disabled for a blank module name or no modules', () => {
  it('F-05 AC-027 keeps Analyze disabled for a blank module name even when the box is ticked', () => {
    const brief = validBrief();
    brief.architecture.modules[0]!.name = '  ';
    expect(canAnalyze(brief, true)).toBe(false);
  });

  it('F-05 AC-028 keeps Analyze disabled for an empty module list even when the box is ticked', () => {
    const brief = validBrief();
    brief.architecture.modules = [];
    expect(canAnalyze(brief, true)).toBe(false);
  });
});
