// The analysis entry point of the pipeline model (F-04). `analyzeStructure` concatenates the structural check lists and
// sorts the findings by severity (blocker, warning, info), then subject (path order, as the generator's problem list),
// then message. Pure: the configuration is read, never changed.
import { comparePaths, compareText } from '../generate/generate.js';
import type { AnalysisFinding, AnalysisResult, ProjectConfig } from '../model.js';
import { briefFindings } from './brief.js';
import { cycleFindings } from './cycles.js';
import { inputFindings } from './inputs.js';
import { refusalFindings } from './refusals.js';
import { retryFindings } from './retries.js';

const SEVERITY_RANK: Record<AnalysisFinding['severity'], number> = { blocker: 0, warning: 1, info: 2 };

function compareFindings(a: AnalysisFinding, b: AnalysisFinding): number {
  return (
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    comparePaths(a.subject, b.subject) ||
    compareText(a.message, b.message)
  );
}

/** Every structural finding of the pipeline, sorted. A new array; the configuration is not changed. */
export function analyzeStructure(config: ProjectConfig): AnalysisFinding[] {
  const findings = [
    ...refusalFindings(config),
    ...retryFindings(config),
    ...cycleFindings(config),
    ...inputFindings(config),
    ...briefFindings(config),
  ];
  return findings.sort(compareFindings);
}

/**
 * The analysis when the LLM review is not asked for (the daily review ceiling is reached): the structural findings from
 * `analyzeStructure`, and a review with status `skipped`, no findings and no dropped entries. The model is not involved,
 * so the configuration is not sent anywhere. Pure: the configuration is read, never changed (F-04 AC-022).
 */
export function skippedAnalysis(config: ProjectConfig): AnalysisResult {
  return {
    findings: analyzeStructure(config),
    review: { status: 'skipped', findings: [], dropped: 0 },
  };
}
