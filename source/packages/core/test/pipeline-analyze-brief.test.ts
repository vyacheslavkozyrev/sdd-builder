// F-04 AC-010, AC-011, AC-012: brief findings of the pipeline model. Required fields (`name`, `idea`,
// `stack.language`) that are blank give a blocker; an optional stack field that is present but blank gives a warning;
// an empty `rules` list gives a warning. Each case starts from a brief with no findings, so a case asserts only what
// it changes.
import { describe, expect, it } from 'vitest';
import { briefFindings } from '../src/pipeline/analyze/brief.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { analyzeStructure } from '../src/pipeline/index.js';
import type { AnalysisFinding } from '../src/model.js';
import type { ProjectConfig } from '../src/pipeline/model.js';

/** A brief with every required field set and one rule, so it has no brief findings. */
function completeBrief(): ProjectConfig {
  const config = structuredClone(defaultProjectConfig);
  config.name = 'Example project';
  config.idea = 'A tool that does one thing';
  config.stack = { language: 'TypeScript' };
  config.rules = [{ id: 'style', title: 'Style', text: 'Keep it simple.' }];
  return config;
}

const REQUIRED_FIELDS = ['name', 'idea', 'stack.language'] as const;
const OPTIONAL_STACK_FIELDS = ['framework', 'platform', 'buildTool', 'testFramework'] as const;
const BLANK_VALUES = ['', ' ', '   ', '\t', ' \n '] as const;

/** Sets a required field by its subject path. */
function setRequired(config: ProjectConfig, subject: (typeof REQUIRED_FIELDS)[number], value: string): void {
  if (subject === 'name') config.name = value;
  else if (subject === 'idea') config.idea = value;
  else config.stack.language = value;
}

describe('F-04 AC-010 a blank required brief field gives one blocker per field', () => {
  it.each(REQUIRED_FIELDS.flatMap((field) => BLANK_VALUES.map((value) => [field, value] as const)))(
    'F-04 AC-010 blocks a blank %s (value %j) with the field name as subject',
    (field, value) => {
      const config = completeBrief();
      setRequired(config, field, value);
      const expected: AnalysisFinding[] = [
        { severity: 'blocker', subject: field, message: `${field} is required` },
      ];
      expect(briefFindings(config)).toEqual(expected);
    },
  );

  it('F-04 AC-010 gives one blocker per blank required field when several are blank', () => {
    const config = completeBrief();
    config.name = '  ';
    config.idea = '';
    config.stack.language = '\t';
    expect(briefFindings(config).map((finding) => [finding.severity, finding.subject])).toEqual([
      ['blocker', 'name'],
      ['blocker', 'idea'],
      ['blocker', 'stack.language'],
    ]);
  });

  it.each(REQUIRED_FIELDS)('F-04 AC-010 gives no finding for a non-blank %s (negative case)', (field) => {
    const config = completeBrief();
    setRequired(config, field, ' x ');
    expect(briefFindings(config)).toEqual([]);
  });
});

describe('F-04 AC-011 a blank optional stack field gives a warning', () => {
  it.each(OPTIONAL_STACK_FIELDS.flatMap((field) => BLANK_VALUES.map((value) => [field, value] as const)))(
    'F-04 AC-011 warns about a blank stack.%s (value %j) with the path as subject',
    (field, value) => {
      const config = completeBrief();
      config.stack = { ...config.stack, [field]: value };
      const expected: AnalysisFinding[] = [
        { severity: 'warning', subject: `stack.${field}`, message: `stack.${field} is blank` },
      ];
      expect(briefFindings(config)).toEqual(expected);
    },
  );

  it.each(OPTIONAL_STACK_FIELDS)('F-04 AC-011 gives no finding for an absent stack.%s (negative case)', (field) => {
    const config = completeBrief();
    expect(config.stack[field]).toBeUndefined();
    expect(briefFindings(config)).toEqual([]);
  });

  it.each(OPTIONAL_STACK_FIELDS)('F-04 AC-011 gives no finding for a set stack.%s (negative case)', (field) => {
    const config = completeBrief();
    config.stack = { ...config.stack, [field]: 'value' };
    expect(briefFindings(config)).toEqual([]);
  });
});

describe('F-04 AC-012 an empty rules list gives a warning', () => {
  it('F-04 AC-012 warns with subject rules when the list is empty', () => {
    const config = completeBrief();
    config.rules = [];
    const expected: AnalysisFinding[] = [{ severity: 'warning', subject: 'rules', message: 'rules is empty' }];
    expect(briefFindings(config)).toEqual(expected);
  });

  it('F-04 AC-012 gives no finding when the list has at least one rule (negative case)', () => {
    const config = completeBrief();
    expect(config.rules).toHaveLength(1);
    expect(briefFindings(config)).toEqual([]);
  });

  it('F-04 AC-012 the default pipeline yields exactly one brief finding, the rules warning, and no blocker', () => {
    const config = structuredClone(defaultProjectConfig);
    const findings = briefFindings(config);
    expect(findings).toEqual([{ severity: 'warning', subject: 'rules', message: 'rules is empty' }]);
    expect(findings.some((finding) => finding.severity === 'blocker')).toBe(false);
  });

  it('F-04 AC-012 analyzeStructure includes the brief findings of the default pipeline', () => {
    const briefSubjects = analyzeStructure(structuredClone(defaultProjectConfig))
      .filter((finding) => finding.subject === 'rules')
      .map((finding) => finding.message);
    expect(briefSubjects).toEqual(['rules is empty']);
  });
});
