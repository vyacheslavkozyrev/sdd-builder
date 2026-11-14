import type { AnalysisFinding, AnalysisResult, AnalysisReview } from '@sddbuilder/core';

/** One row of the findings table: the three fields the page shows, nothing else. */
export type FindingRow = Pick<AnalysisFinding, 'severity' | 'subject' | 'message'>;

/**
 * The review part as the page shows it. `ok` lists the review findings; `failed` and `skipped`
 * carry no findings, only the fixed notice for that status (F-05 AC-022).
 */
export type ReviewView =
  | { status: 'ok'; findings: FindingRow[] }
  | { status: 'failed'; notice: string }
  | { status: 'skipped'; notice: string };

/**
 * The fixed notice text per status. It never includes server text, so no finding or model
 * output can reach the page through it (F-05 AC-022).
 */
const REVIEW_NOTICES = {
  failed:
    'The LLM review failed, so it gives no findings. The structural findings above still stand.',
  skipped:
    'The LLM review was skipped, so it gives no findings. The structural findings above still stand.',
} as const;

function toRow(finding: AnalysisFinding): FindingRow {
  return { severity: finding.severity, subject: finding.subject, message: finding.message };
}

/** The structural findings as table rows, in the order the server sent them (F-05 AC-021). */
export function findingRows(result: AnalysisResult): FindingRow[] {
  return result.findings.map(toRow);
}

/**
 * The view for the review status. `ok` gives the review findings as rows; `failed` and `skipped`
 * give a notice and no findings, whatever the review object holds (F-05 AC-022).
 */
export function reviewNotice(review: AnalysisReview): ReviewView {
  switch (review.status) {
    case 'ok':
      return { status: 'ok', findings: review.findings.map(toRow) };
    case 'failed':
      return { status: 'failed', notice: REVIEW_NOTICES.failed };
    case 'skipped':
      return { status: 'skipped', notice: REVIEW_NOTICES.skipped };
  }
}
