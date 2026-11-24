// The analysis state of step 4 (F-13 AC-014, AC-015, AC-018, AC-019). It is held in memory, and it is pure: no React and
// no I/O. Each state records the configuration key it ran on, so a change to the configuration makes it out of date.

import type { pipeline as core } from '@sddbuilder/core';

export type FindingSeverity = 'blocker' | 'warning' | 'info';

export interface AnalysisFinding {
  readonly severity: FindingSeverity;
  readonly subject: string;
  readonly message: string;
}

// `skipped` is a review that did not run (decision 41); `failed` is a review that ran and did not finish.
export type ReviewStatus = 'ok' | 'failed' | 'skipped';

export interface AnalysisResult {
  readonly findings: readonly AnalysisFinding[];
  readonly review: {
    readonly status: ReviewStatus;
    readonly findings: readonly AnalysisFinding[];
    readonly dropped: number;
  };
}

// `status` is the HTTP status of an error reply, or `null` for a network failure.
export type AnalysisState =
  | { readonly kind: 'not-run' }
  | { readonly kind: 'pending'; readonly key: string }
  | { readonly kind: 'result'; readonly key: string; readonly result: AnalysisResult }
  | { readonly kind: 'error'; readonly key: string; readonly status: number | null; readonly body: unknown };

// The key of a configuration: the same configuration gives the same key. The configuration is built in one fixed
// order (see config.ts), so the serialised form changes exactly when a value changes.
export function configKey(config: core.ProjectConfig): string {
  return JSON.stringify(config);
}

// A new run replaces the previous state, its findings and its status (AC-014).
export function startAnalysis(key: string): AnalysisState {
  return { kind: 'pending', key };
}

export function analysisResult(key: string, result: AnalysisResult): AnalysisState {
  return { kind: 'result', key, result };
}

export function analysisError(key: string, status: number | null, body: unknown): AnalysisState {
  return { kind: 'error', key, status, body };
}

// True when an analysis exists and ran on another configuration (AC-018, AC-019). Not run is not out of date.
export function isOutOfDate(state: AnalysisState, key: string): boolean {
  return state.kind !== 'not-run' && state.key !== key;
}

// Green only for a result on the current configuration, with the review `ok` and no blocker or warning in either
// list of findings. An info finding does not stop it (AC-015).
export function isGreen(state: AnalysisState, key: string): boolean {
  if (state.kind !== 'result' || state.key !== key) return false;
  const { result } = state;
  if (result.review.status !== 'ok') return false;
  return [...result.findings, ...result.review.findings].every((finding) => finding.severity === 'info');
}
