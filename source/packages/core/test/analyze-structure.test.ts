import { describe, expect, it } from 'vitest';
import {
  analyzeStructure,
  briefFindings,
  validateConfig,
  type AnalysisFinding,
  type ProjectConfig,
  type StepDefinition,
} from '../src/index.js';
import { baseConfig } from './fixtures.js';

/** The default retry conditions that give an AC-005 warning: each routes back with no round limit. */
const DEFAULT_RETRY_CONDITIONS = ['approve-plan', 'review-clean', 'checks-unit'];

/**
 * `baseConfig()` produces six findings, which the valid configuration removes, each for a reason:
 * - `codeRules`, `testRules` and `architecture.modules` are empty (brief warnings): the valid
 *   configuration fills in one rule per list and one module.
 * - The three conditions in DEFAULT_RETRY_CONDITIONS retry with no round limit (retry warnings): the
 *   valid configuration sets `roundLimit: 3` on those three only. `checks-e2e` also routes back, but
 *   it follows `e2e-tests`, which the default process leaves disabled, so it gives no finding and is
 *   left unchanged.
 */
function validConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  const workflows = baseConfig().workflows.map((workflow) => ({
    ...workflow,
    conditions: workflow.conditions.map((condition) =>
      DEFAULT_RETRY_CONDITIONS.includes(condition.id) ? { ...condition, roundLimit: 3 } : condition,
    ),
  }));
  return baseConfig({
    workflows,
    codeRules: ['Use strict types.'],
    testRules: ['Table-driven tests.'],
    architecture: {
      style: 'layered',
      modules: [{ name: 'core', layer: 0, responsibility: 'Domain rules.', dependsOn: [] }],
    },
    ...overrides,
  });
}

function customStep(id: string): StepDefinition {
  return {
    id,
    name: id,
    summary: `${id} summary`,
    kind: 'command',
    origin: 'custom',
    required: false,
    consumes: [],
    produces: [],
    ruleTags: [],
    body: `Body of ${id}.`,
  };
}

/** Findings as `severity | subject | message` rows, which read well in a table. */
function rowsOf(findings: AnalysisFinding[]): string[] {
  return findings.map((finding) => `${finding.severity} | ${finding.subject} | ${finding.message}`);
}

describe('F-04 AC-002 a valid configuration with nothing to advise', () => {
  it('F-04 AC-002 gives an empty findings list for the valid configuration', () => {
    expect(validateConfig(validConfig())).toEqual([]);
    expect(briefFindings(validConfig())).toEqual([]);
    expect(analyzeStructure(validConfig())).toEqual([]);
  });

  it('F-04 AC-002 is not empty when one rule list is emptied, and reports only that warning', () => {
    expect(analyzeStructure(validConfig({ codeRules: [] }))).toEqual([
      { severity: 'warning', subject: 'codeRules', message: 'codeRules is empty' },
    ]);
  });
});

describe('F-04 AC-012 structural findings are sorted by severity, subject, then message', () => {
  const rows: { name: string; config: ProjectConfig; expected: string[] }[] = [
    {
      name: 'blockers come before warnings, even when a warning is found earlier',
      // The default retry warnings are found before the brief checks, so the blocker must move up.
      config: baseConfig({ name: '', customSteps: [customStep('alpha')] }),
      expected: [
        'blocker | name | name is required',
        'warning | architecture.modules | architecture.modules is empty',
        'warning | codeRules | codeRules is empty',
        'warning | custom step "alpha" | custom step "alpha" is not placed in any enabled workflow',
        'warning | testRules | testRules is empty',
        'warning | workflow "implement-cycle" condition "checks-unit" | condition "checks-unit" in workflow "implement-cycle" retries to "implement" with no round limit (no limit set)',
        'warning | workflow "implement-cycle" condition "review-clean" | condition "review-clean" in workflow "implement-cycle" retries to "implement" with no round limit (no limit set)',
        'warning | workflow "specify" condition "approve-plan" | condition "approve-plan" in workflow "specify" retries to "refine" with no round limit (no limit set)',
      ],
    },
    {
      name: 'equal severities are ordered by subject in code-unit order (uppercase before lowercase)',
      config: validConfig({ customSteps: [customStep('beta'), customStep('Alpha')], codeRules: [], testRules: [] }),
      expected: [
        'warning | codeRules | codeRules is empty',
        'warning | custom step "Alpha" | custom step "Alpha" is not placed in any enabled workflow',
        'warning | custom step "beta" | custom step "beta" is not placed in any enabled workflow',
        'warning | testRules | testRules is empty',
      ],
    },
    {
      name: 'equal severity and subject are ordered by message, not by the order the check found them',
      config: validConfig({
        architecture: {
          style: 'layered',
          modules: [
            { name: 'core', layer: 0, responsibility: 'Domain rules.', dependsOn: [] },
            { name: 'ui', layer: 1, responsibility: 'Screens.', dependsOn: ['ghost', 'db'] },
            { name: 'db', layer: 2, responsibility: 'Storage.', dependsOn: [] },
          ],
        },
      }),
      expected: [
        'blocker | module "ui" | module "ui" (layer 1) depends on "db" (layer 2), a higher layer',
        'blocker | module "ui" | module "ui" depends on unknown module "ghost"',
      ],
    },
  ];

  it.each(rows)('F-04 AC-012 $name', ({ config, expected }) => {
    expect(rowsOf(analyzeStructure(config))).toEqual(expected);
  });
});

describe('F-04 AC-012 the same configuration gives the same output every time', () => {
  const configs: { name: string; config: ProjectConfig }[] = [
    { name: 'a valid configuration', config: validConfig() },
    {
      name: 'a configuration with mixed findings',
      config: validConfig({ name: '', codeRules: [], customSteps: [customStep('alpha'), customStep('beta')] }),
    },
  ];

  it.each(configs)('F-04 AC-012 gives equal output on two calls for $name', ({ config }) => {
    const first = analyzeStructure(config);
    const second = analyzeStructure(config);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
  });
});

describe('F-04 AC-012 analyzeStructure does not change its input', () => {
  it('F-04 AC-012 leaves the configuration deep-equal to its state before the call', () => {
    const config = validConfig({ name: '', customSteps: [customStep('alpha')], codeRules: [] });
    const before = structuredClone(config);
    analyzeStructure(config);
    expect(config).toEqual(before);
  });
});
