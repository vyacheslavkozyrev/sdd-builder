// The replies of /analyze and the messages the step shows for a failed request (F-13 AC-010 to AC-013). It is pure: no
// React and no I/O. A reply that does not match the analysis result shape is refused (`null`), so it lists no findings.

import type { AnalysisFinding, AnalysisResult, FindingSeverity, ReviewStatus } from './analysisState.js';
import type { RequestOutcome } from './request.js';

export type FailedOutcome = Exclude<RequestOutcome, { readonly kind: 'ok' }>;

const SEVERITIES: readonly FindingSeverity[] = ['blocker', 'warning', 'info'];
const REVIEW_STATUSES: readonly ReviewStatus[] = ['ok', 'failed', 'skipped'];

// The reason shown after the status code. The 422 and 429 wording is the approved screens' wording (07, 09).
const REASONS: Readonly<Record<number, string>> = {
  400: 'the request was not valid.',
  404: 'the service has no such endpoint.',
  422: 'the configuration is over a limit.',
  429: 'too many requests. Try again later.',
};
const DEFAULT_REASON = 'the service returned an error. Try again later.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSeverity(value: unknown): value is FindingSeverity {
  return SEVERITIES.some((severity) => severity === value);
}

function isReviewStatus(value: unknown): value is ReviewStatus {
  return REVIEW_STATUSES.some((status) => status === value);
}

function parseFinding(value: unknown): AnalysisFinding | null {
  if (!isRecord(value)) return null;
  const { severity, subject, message } = value;
  if (!isSeverity(severity) || typeof subject !== 'string' || typeof message !== 'string') return null;
  return { severity, subject, message };
}

function parseFindings(value: unknown): readonly AnalysisFinding[] | null {
  if (!Array.isArray(value)) return null;
  const items: readonly unknown[] = value;
  const findings: AnalysisFinding[] = [];
  for (const item of items) {
    const finding = parseFinding(item);
    if (finding === null) return null;
    findings.push(finding);
  }
  return findings;
}

// The reply of a 200 as an analysis result, or `null` when it does not have the result shape.
export function parseAnalysisReply(reply: unknown): AnalysisResult | null {
  if (!isRecord(reply)) return null;
  const findings = parseFindings(reply.findings);
  const review = reply.review;
  if (findings === null || !isRecord(review)) return null;
  const reviewFindings = parseFindings(review.findings);
  const { status, dropped } = review;
  if (reviewFindings === null || !isReviewStatus(status)) return null;
  if (typeof dropped !== 'number' || !Number.isInteger(dropped) || dropped < 0) return null;
  return { findings, review: { status, findings: reviewFindings, dropped } };
}

// The sentence shown beside Analyze for a failed request: the status code, or "network error" (AC-010, AC-012).
export function errorMessage(outcome: FailedOutcome): string {
  if (outcome.kind === 'network-error') return 'Analysis could not run: network error.';
  const reason = REASONS[outcome.status] ?? DEFAULT_REASON;
  return `Analysis could not run (${outcome.status}): ${reason}`;
}

// One line per problem of a 422 body (AC-011). A body without a list of string problems gives no lines, and the
// caller then shows the error message alone.
export function problemLines(body: unknown): readonly string[] {
  if (!isRecord(body) || !Array.isArray(body.problems)) return [];
  const problems: readonly unknown[] = body.problems;
  const lines: string[] = [];
  for (const problem of problems) {
    if (typeof problem !== 'string') return [];
    lines.push(problem);
  }
  return lines;
}
