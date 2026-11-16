// F-04 AC-001: the default pipeline (`source/templates/pipeline/default.json`) gives no structural blocker, and no finding
// from the refusal, reachability, iteration-source or brief-blocker checks. Its analysis is not empty, and the test says
// so exactly. Read this way because of Amendment 4 (2026-11-15: the default's `rules` list is empty, so the brief gives
// one `rules` warning) and the owner's acceptance of the six retry warnings of T005 (each retry Condition has no round
// limit). The default's findings are therefore exactly those seven warnings. The default's own structure is not changed.
import { describe, expect, it } from 'vitest';
import { briefFindings } from '../src/pipeline/analyze/brief.js';
import { inputFindings } from '../src/pipeline/analyze/inputs.js';
import { refusalFindings } from '../src/pipeline/analyze/refusals.js';
import { retryFindings } from '../src/pipeline/analyze/retries.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { analyzeStructure } from '../src/pipeline/index.js';
import type { AnalysisFinding } from '../src/pipeline/model.js';

/** The six retry warnings of the default pipeline: one per Condition that routes back with no round limit. */
const RETRY_WARNINGS: AnalysisFinding[] = [
  {
    severity: 'warning',
    subject: 'pipeline.blocks[3]',
    message: 'condition "approve-stories" retries to "specify" with no round limit',
  },
  {
    severity: 'warning',
    subject: 'pipeline.blocks[6]',
    message: 'condition "approve-screens" retries to "ux" with no round limit',
  },
  {
    severity: 'warning',
    subject: 'pipeline.blocks[9]',
    message: 'condition "approve-plan" retries to "plan" with no round limit',
  },
  {
    severity: 'warning',
    subject: 'pipeline.blocks[10].blocks[3]',
    message: 'condition "build-review-gate" retries to "build-implement" with no round limit',
  },
  {
    severity: 'warning',
    subject: 'pipeline.blocks[10].blocks[5]',
    message: 'condition "build-checks" retries to "build-implement" with no round limit',
  },
  {
    severity: 'warning',
    subject: 'pipeline.blocks[15]',
    message: 'condition "approve-checklist" retries to "verify" with no round limit',
  },
];

/** The one brief warning of the default: its `rules` list is empty (Amendment 4). */
const RULES_WARNING: AnalysisFinding = { severity: 'warning', subject: 'rules', message: 'rules is empty' };

/** One line per finding, sorted, so the comparison does not depend on the order the checks run in. */
function lines(findings: readonly AnalysisFinding[]): string[] {
  return findings.map((finding) => `${finding.severity} ${finding.subject} ${finding.message}`).sort();
}

describe('F-04 AC-001 the default pipeline gives no structural blocker', () => {
  it('F-04 AC-001 has no blocker in analyzeStructure(default)', () => {
    const blockers = analyzeStructure(structuredClone(defaultProjectConfig)).filter(
      (finding) => finding.severity === 'blocker',
    );
    expect(blockers).toEqual([]);
  });

  it('F-04 AC-001 has no refusal, iteration-source or brief-blocker finding on the default', () => {
    const config = structuredClone(defaultProjectConfig);
    expect(refusalFindings(config)).toEqual([]);
    expect(inputFindings(config)).toEqual([]);
    expect(briefFindings(config).filter((finding) => finding.severity === 'blocker')).toEqual([]);
  });

  it('F-04 AC-001 has exactly the six retry warnings and the rules warning on the default, and nothing else', () => {
    const findings = analyzeStructure(structuredClone(defaultProjectConfig));
    expect(findings).toHaveLength(RETRY_WARNINGS.length + 1);
    expect(lines(findings)).toEqual(lines([...RETRY_WARNINGS, RULES_WARNING]));
  });

  it('F-04 AC-001 gives the six retry warnings from the retry check alone', () => {
    expect(lines(retryFindings(structuredClone(defaultProjectConfig)))).toEqual(lines(RETRY_WARNINGS));
  });
});
