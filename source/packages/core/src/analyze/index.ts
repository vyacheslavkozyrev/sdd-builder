import type { AnalysisFinding, AnalysisResult, ProjectConfig } from '../model.js';
import { briefFindings } from './brief.js';
import { customStepFindings } from './custom-steps.js';
import { inputFindings } from './inputs.js';
import { reachabilityFindings } from './reachability.js';
import { refusalFindings } from './refusals.js';
import { retryFindings } from './retries.js';

const SEVERITY_RANK: Record<AnalysisFinding['severity'], number> = {
  blocker: 0,
  warning: 1,
  info: 2,
};

/**
 * The structural findings for a configuration: every check in a fixed order, then sorted by severity
 * (`blocker`, `warning`, `info`), then by `subject`, then by `message`, both in code-unit order.
 * The sort is stable, so findings equal on all three keep their order from the fixed concatenation.
 * Returns a new array; the configuration is not changed. The same configuration gives the same list.
 */
export function analyzeStructure(config: ProjectConfig): AnalysisFinding[] {
  const found = [
    ...refusalFindings(config),
    ...reachabilityFindings(config),
    ...inputFindings(config),
    ...retryFindings(config),
    ...briefFindings(config),
    ...customStepFindings(config),
  ];
  return found.sort(compareFindings);
}

function compareFindings(a: AnalysisFinding, b: AnalysisFinding): number {
  return (
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
    compareText(a.subject, b.subject) ||
    compareText(a.message, b.message)
  );
}

function compareText(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

/**
 * The analysis when the LLM review is not asked for (the daily review ceiling is reached): the structural
 * findings from `analyzeStructure`, and a review with status `skipped`, no findings and no dropped entries.
 * The model is not involved, so the configuration is not sent anywhere.
 */
export function skippedAnalysis(config: ProjectConfig): AnalysisResult {
  return {
    findings: analyzeStructure(config),
    review: { status: 'skipped', findings: [], dropped: 0 },
  };
}
