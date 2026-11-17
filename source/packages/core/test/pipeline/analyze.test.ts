import { describe, expect, it } from 'vitest';
import { analyzeStructure, runRules } from '../../src/pipeline/analyze/index.js';
import type { LocatedFinding, Rule } from '../../src/pipeline/analyze/index.js';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';
import { buildConfig, validConfig } from './analyze-fixture.js';

function located(
  flow: number,
  block: number,
  path: string,
  severity: LocatedFinding['severity'] = 'blocker',
): LocatedFinding {
  return { flow, block, path, severity, message: `${path} problem` };
}

// A stub rule that returns fixed findings, whatever the config holds.
function stubRule(...findings: LocatedFinding[]): Rule {
  return () => findings.map((finding) => ({ ...finding }));
}

// Freezes a value and everything under it, so that any write to it throws in strict mode.
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

describe('F-03 AC-025 every finding is returned, in document order', () => {
  it('F-03 AC-025 returns findings from several rules, sorted by flow, then block, then rule, then path', () => {
    const first = stubRule(located(1, 0, 'pipeline.flows[1].blocks[0]'), located(0, 2, 'b'));
    const second = stubRule(located(0, 2, 'a'), located(-1, -1, 'pipeline'), located(0, 0, 'z'));
    const result = runRules(buildConfig(), [first, second]);
    expect(result.map((finding) => finding.path)).toEqual([
      'pipeline',
      'z',
      'b',
      'a',
      'pipeline.flows[1].blocks[0]',
    ]);
  });

  it('F-03 AC-025 keeps every finding of one rule, not only the first', () => {
    const rule = stubRule(located(0, 0, 'one'), located(0, 1, 'two'), located(0, 2, 'three'));
    expect(runRules(buildConfig(), [rule])).toHaveLength(3);
  });

  it('F-03 AC-025 orders by rule position when a flow and block tie, before the path', () => {
    const earlier = stubRule(located(0, 0, 'z-path'));
    const later = stubRule(located(0, 0, 'a-path'));
    const result = runRules(buildConfig(), [earlier, later]);
    expect(result.map((finding) => finding.path)).toEqual(['z-path', 'a-path']);
  });

  it('F-03 AC-025 orders by path when a flow, block and rule tie', () => {
    const rule = stubRule(located(0, 0, 'b'), located(0, 0, 'a'));
    const result = runRules(buildConfig(), [rule]);
    expect(result.map((finding) => finding.path)).toEqual(['a', 'b']);
  });
});

describe('F-03 AC-026 the analysis is repeatable and does not change the config', () => {
  it('F-03 AC-026 gives the same list when the same config is analysed twice', () => {
    const config = buildConfig();
    expect(analyzeStructure(config)).toEqual(analyzeStructure(config));
  });

  it('F-03 AC-026 gives the same list from the stub rules when run twice', () => {
    const rules = [stubRule(located(0, 1, 'x'), located(0, 0, 'y'))];
    const config = buildConfig();
    expect(runRules(config, rules)).toEqual(runRules(config, rules));
  });

  it('F-03 AC-026 does not change the config it analyses', () => {
    // A frozen config makes any write during the analysis throw, so a change cannot pass unnoticed.
    const config = deepFreeze(buildConfig());
    expect(() => runRules(config, [stubRule(located(0, 0, 'x'))])).not.toThrow();
    expect(() => analyzeStructure(config)).not.toThrow();
  });
});

describe('F-03 AC-027 every finding has a severity, a path and a message only', () => {
  it('F-03 AC-027 returns only severity, path and message as keys', () => {
    const rule = stubRule(located(0, 1, 'p', 'blocker'), located(0, 2, 'q', 'warning'));
    const findings = runRules(buildConfig(), [rule]);
    expect(findings).toHaveLength(2);
    for (const finding of findings) {
      expect(Object.keys(finding).sort()).toEqual(['message', 'path', 'severity']);
    }
  });

  it('F-03 AC-027 keeps the severity, path and message of each finding', () => {
    const rule = stubRule(located(0, 1, 'p', 'blocker'), located(0, 2, 'q', 'warning'));
    expect(runRules(buildConfig(), [rule])).toEqual([
      { severity: 'blocker', path: 'p', message: 'p problem' },
      { severity: 'warning', path: 'q', message: 'q problem' },
    ]);
  });
});

describe('F-03 AC-030 a minimal valid pipeline has no findings', () => {
  it('F-03 AC-030 parses the fixture as a valid config', () => {
    expect(parseProjectConfig(validConfig).ok).toBe(true);
  });

  it('F-03 AC-030 returns an empty list for the one-flow Start → Agent → End pipeline', () => {
    expect(analyzeStructure(validConfig)).toEqual([]);
  });
});
