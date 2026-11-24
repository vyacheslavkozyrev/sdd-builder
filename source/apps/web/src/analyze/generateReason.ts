// The reason Generate and download is disabled (F-13 AC-017, AC-025). Pure: no React and no I/O. It gives one reason,
// the first that applies in the order of AC-017, or `null` when Generate is enabled (the analysis is green).

import type { AnalysisFinding, AnalysisState } from './analysisState.js';

export const RUN_ANALYZE_FIRST = 'Run Analyze first';
export const FIX_BLOCKER = 'Fix the blocker to generate';
export const FIX_WARNING = 'Fix the warning to generate';
export const ANALYSIS_FAILED = 'Analysis failed. Analyze again to generate.';

function hasSeverity(findings: readonly AnalysisFinding[], severity: AnalysisFinding['severity']): boolean {
  return findings.some((finding) => finding.severity === severity);
}

export function generateDisabledReason(state: AnalysisState, key: string): string | null {
  // Not run, out of date, pending or an error: there is no current result to judge (AC-017).
  if (state.kind !== 'result' || state.key !== key) return RUN_ANALYZE_FIRST;

  const { result } = state;
  const all = [...result.findings, ...result.review.findings];
  if (hasSeverity(all, 'blocker')) return FIX_BLOCKER;
  if (hasSeverity(all, 'warning')) return FIX_WARNING;
  if (result.review.status !== 'ok') return ANALYSIS_FAILED;
  return null;
}
