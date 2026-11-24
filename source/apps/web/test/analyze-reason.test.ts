import { describe, expect, it } from 'vitest';
import {
  analysisError,
  analysisResult,
  isGreen,
  startAnalysis,
  type AnalysisFinding,
  type AnalysisResult,
  type AnalysisState,
} from '../src/analyze/analysisState.js';
import {
  ANALYSIS_FAILED,
  FIX_BLOCKER,
  FIX_WARNING,
  RUN_ANALYZE_FIRST,
  generateDisabledReason,
} from '../src/analyze/generateReason.js';

const KEY = 'config-a';
const OTHER_KEY = 'config-b';

function finding(severity: AnalysisFinding['severity']): AnalysisFinding {
  return { severity, subject: 'Subject', message: `${severity} message` };
}

function result(overrides: {
  findings?: AnalysisFinding[];
  status?: AnalysisResult['review']['status'];
  reviewFindings?: AnalysisFinding[];
}): AnalysisResult {
  return {
    findings: overrides.findings ?? [],
    review: {
      status: overrides.status ?? 'ok',
      findings: overrides.reviewFindings ?? [],
      dropped: 0,
    },
  };
}

function stateWith(analysis: AnalysisResult, key = KEY): AnalysisState {
  return analysisResult(key, analysis);
}

describe('F-13 AC-017 each state where Generate is disabled gives one reason, the first that applies', () => {
  const cases: Array<{ name: string; state: AnalysisState; reason: string }> = [
    { name: 'not run gives Run Analyze first', state: { kind: 'not-run' }, reason: RUN_ANALYZE_FIRST },
    {
      name: 'a result on another configuration (out of date) gives Run Analyze first',
      state: stateWith(result({}), OTHER_KEY),
      reason: RUN_ANALYZE_FIRST,
    },
    {
      name: 'a pending analysis gives Run Analyze first',
      state: startAnalysis(KEY),
      reason: RUN_ANALYZE_FIRST,
    },
    {
      name: 'a pending analysis on another configuration gives Run Analyze first',
      state: startAnalysis(OTHER_KEY),
      reason: RUN_ANALYZE_FIRST,
    },
    {
      name: 'an error on the current configuration gives Run Analyze first',
      state: analysisError(KEY, 429, {}),
      reason: RUN_ANALYZE_FIRST,
    },
    {
      name: 'a network error gives Run Analyze first',
      state: analysisError(KEY, null, undefined),
      reason: RUN_ANALYZE_FIRST,
    },
    {
      name: 'a blocker in the structural findings gives Fix the blocker',
      state: stateWith(result({ findings: [finding('blocker')] })),
      reason: FIX_BLOCKER,
    },
    {
      name: 'a blocker in the review findings gives Fix the blocker',
      state: stateWith(result({ reviewFindings: [finding('blocker')] })),
      reason: FIX_BLOCKER,
    },
    {
      name: 'a warning in the structural findings gives Fix the warning',
      state: stateWith(result({ findings: [finding('warning')] })),
      reason: FIX_WARNING,
    },
    {
      name: 'a warning in the review findings gives Fix the warning',
      state: stateWith(result({ reviewFindings: [finding('warning')] })),
      reason: FIX_WARNING,
    },
    {
      name: 'a failed review gives Analysis failed',
      state: stateWith(result({ status: 'failed' })),
      reason: ANALYSIS_FAILED,
    },
    {
      name: 'a skipped review gives Analysis failed',
      state: stateWith(result({ status: 'skipped' })),
      reason: ANALYSIS_FAILED,
    },
    {
      name: 'a blocker wins over a warning',
      state: stateWith(result({ findings: [finding('warning')], reviewFindings: [finding('blocker')] })),
      reason: FIX_BLOCKER,
    },
    {
      name: 'a blocker wins over a failed review',
      state: stateWith(result({ status: 'failed', findings: [finding('blocker')] })),
      reason: FIX_BLOCKER,
    },
    {
      name: 'a warning wins over a failed review',
      state: stateWith(result({ status: 'skipped', reviewFindings: [finding('warning')] })),
      reason: FIX_WARNING,
    },
  ];

  for (const { name, state, reason } of cases) {
    it(`F-13 AC-017 ${name}`, () => {
      expect(generateDisabledReason(state, KEY)).toBe(reason);
    });
  }
});

describe('F-13 AC-025 Generate is enabled (no reason) only when the analysis is green', () => {
  it('F-13 AC-025 a green result on the current configuration gives no reason', () => {
    expect(generateDisabledReason(stateWith(result({})), KEY)).toBeNull();
  });

  it('F-13 AC-025 an info finding does not give a reason (it is still green)', () => {
    expect(generateDisabledReason(stateWith(result({ findings: [finding('info')] })), KEY)).toBeNull();
  });

  it('F-13 AC-025 a warning-free and blocker-free result with a review info is green and enabled', () => {
    const state = stateWith(result({ reviewFindings: [finding('info')] }));
    expect(isGreen(state, KEY)).toBe(true);
    expect(generateDisabledReason(state, KEY)).toBeNull();
  });

  it('F-13 AC-025 a reason is given exactly when the analysis is not green', () => {
    const states: AnalysisState[] = [
      { kind: 'not-run' },
      startAnalysis(KEY),
      analysisError(KEY, 500, {}),
      stateWith(result({})),
      stateWith(result({ findings: [finding('info')] })),
      stateWith(result({ findings: [finding('warning')] })),
      stateWith(result({ status: 'failed' })),
      stateWith(result({}), OTHER_KEY),
    ];
    for (const state of states) {
      expect(generateDisabledReason(state, KEY) === null).toBe(isGreen(state, KEY));
    }
  });
});
