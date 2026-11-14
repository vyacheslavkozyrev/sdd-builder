import { describe, expect, it } from 'vitest';
import type { AnalysisFinding, AnalysisResult, AnalysisReview } from '@sddbuilder/core';
import { findingRows, reviewNotice } from '../src/analyze/result.js';

const blocker: AnalysisFinding = {
  severity: 'blocker',
  subject: 'architecture.modules[0].layer',
  message: 'Layer 0 needs a dependency on a module below it.',
};
const warning: AnalysisFinding = {
  severity: 'warning',
  subject: 'workflows.feature',
  message: 'The feature workflow has no review step.',
};
const info: AnalysisFinding = {
  severity: 'info',
  subject: 'stack.buildTool',
  message: 'Build tool is not set.',
};

function structural(findings: AnalysisFinding[]): AnalysisResult {
  return { findings, review: { status: 'skipped', findings: [], dropped: 0 } };
}

function review(status: AnalysisReview['status'], findings: AnalysisFinding[]): AnalysisReview {
  return { status, findings, dropped: 0 };
}

describe('F-05 AC-021 structural findings as table rows', () => {
  it.each([
    ['no findings gives no rows', [], []],
    [
      'one finding gives one row with severity, subject and message',
      [warning],
      [{ severity: 'warning', subject: warning.subject, message: warning.message }],
    ],
    [
      'several findings keep the order received, with mixed severities',
      [blocker, info, warning, blocker],
      [
        { severity: 'blocker', subject: blocker.subject, message: blocker.message },
        { severity: 'info', subject: info.subject, message: info.message },
        { severity: 'warning', subject: warning.subject, message: warning.message },
        { severity: 'blocker', subject: blocker.subject, message: blocker.message },
      ],
    ],
  ])('F-05 AC-021 %s', (_name, findings, expected) => {
    expect(findingRows(structural(findings))).toEqual(expected);
  });

  it('F-05 AC-021 does not sort the rows by severity', () => {
    const rows = findingRows(structural([info, blocker, warning]));
    expect(rows.map((row) => row.severity)).toEqual(['info', 'blocker', 'warning']);
  });

  it('F-05 AC-021 carries only severity, subject and message into a row', () => {
    const withExtra = { ...warning, id: 'internal-1' } as AnalysisFinding;
    const [row] = findingRows(structural([withExtra]));
    expect(row).toEqual({ severity: 'warning', subject: warning.subject, message: warning.message });
    expect(row).not.toHaveProperty('id');
  });

  it('F-05 AC-021 does not change the result it reads', () => {
    const result = structural([blocker, info]);
    const before = JSON.stringify(result);
    findingRows(result);
    expect(JSON.stringify(result)).toBe(before);
  });

  it('F-05 AC-021 shows structural findings even when the review failed', () => {
    const result: AnalysisResult = {
      findings: [blocker, warning],
      review: review('failed', []),
    };
    expect(findingRows(result).map((row) => row.subject)).toEqual([
      blocker.subject,
      warning.subject,
    ]);
  });
});

describe('F-05 AC-022 review status view', () => {
  it('F-05 AC-022 ok with no review findings gives an ok view with no rows', () => {
    expect(reviewNotice(review('ok', []))).toEqual({ status: 'ok', findings: [] });
  });

  it('F-05 AC-022 ok with review findings gives them as rows in order', () => {
    expect(reviewNotice(review('ok', [info, blocker]))).toEqual({
      status: 'ok',
      findings: [
        { severity: 'info', subject: info.subject, message: info.message },
        { severity: 'blocker', subject: blocker.subject, message: blocker.message },
      ],
    });
  });

  it.each([
    ['failed with no findings', 'failed' as const, []],
    ['failed with findings in the object', 'failed' as const, [blocker, warning]],
    ['skipped with no findings', 'skipped' as const, []],
    ['skipped with findings in the object', 'skipped' as const, [warning]],
  ])('F-05 AC-022 %s gives a notice and no findings key', (_name, status, findings) => {
    const view = reviewNotice(review(status, findings));
    expect(view.status).toBe(status);
    expect(view).not.toHaveProperty('findings');
    expect(view).toHaveProperty('notice');
  });

  it('F-05 AC-022 failed notice names the status', () => {
    const view = reviewNotice(review('failed', []));
    expect(view).toMatchObject({ status: 'failed' });
    if (view.status !== 'failed') throw new Error('expected a failed view');
    expect(view.notice).toContain('failed');
  });

  it('F-05 AC-022 skipped notice names the status', () => {
    const view = reviewNotice(review('skipped', []));
    if (view.status !== 'skipped') throw new Error('expected a skipped view');
    expect(view.notice).toContain('skipped');
  });

  it('F-05 AC-022 failed and skipped give different notices', () => {
    const failed = reviewNotice(review('failed', []));
    const skipped = reviewNotice(review('skipped', []));
    if (failed.status !== 'failed' || skipped.status !== 'skipped') {
      throw new Error('expected failed and skipped views');
    }
    expect(failed.notice).not.toBe(skipped.notice);
  });

  it('F-05 AC-022 the notice text is fixed and does not echo any finding', () => {
    const withFindings = reviewNotice(review('failed', [blocker, warning]));
    const withoutFindings = reviewNotice(review('failed', []));
    if (withFindings.status !== 'failed' || withoutFindings.status !== 'failed') {
      throw new Error('expected failed views');
    }
    expect(withFindings.notice).toBe(withoutFindings.notice);
    for (const finding of [blocker, warning]) {
      expect(withFindings.notice).not.toContain(finding.message);
      expect(withFindings.notice).not.toContain(finding.subject);
    }
  });
});
