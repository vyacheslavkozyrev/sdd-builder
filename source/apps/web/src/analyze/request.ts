import type { AnalysisFinding, AnalysisResult, ProjectConfig } from '@sddbuilder/core';

/** The part of a request the web app sends. A fake in the tests needs no more than this. */
export interface AnalyzeRequest {
  method: 'POST';
  headers: Record<string, string>;
  body: string;
}

/** The fetch the caller passes in. The browser's `fetch` fits it; tests pass a fake. */
export type FetchFn = (url: string, init: AnalyzeRequest) => Promise<Response>;

export type AnalyzeOutcome = { ok: true; result: AnalysisResult } | { ok: false; message: string };

/**
 * The text shown on any failure (F-05 AC-023). It never shows the server body, so a server
 * message cannot reach the page. The brief stays as it is.
 */
export const ANALYZE_FAILED_MESSAGE =
  'The brief could not be analyzed. Check your connection and try again. Your brief is unchanged.';

/**
 * Sends the configuration to `POST /analyze` as JSON. A 200 analysis gives `{ ok: true, result }`;
 * any other outcome gives `{ ok: false, message }`. The configuration is only read.
 */
export async function analyzeBrief(fetchFn: FetchFn, config: ProjectConfig): Promise<AnalyzeOutcome> {
  let response: Response;
  try {
    response = await fetchFn('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  } catch {
    return failure();
  }
  if (response.status !== 200) {
    return failure();
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return failure();
  }
  return isAnalysisResult(body) ? { ok: true, result: body } : failure();
}

function failure(): AnalyzeOutcome {
  return { ok: false, message: ANALYZE_FAILED_MESSAGE };
}

const REVIEW_STATUSES: readonly string[] = ['ok', 'failed', 'skipped'];
const SEVERITIES: readonly string[] = ['info', 'warning', 'blocker'];

/** Narrows an untrusted reply body (`unknown`) to the core's `AnalysisResult` shape. */
function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!isRecord(value) || !isFindingList(value['findings'])) {
    return false;
  }
  const review = value['review'];
  return (
    isRecord(review) &&
    typeof review['status'] === 'string' &&
    REVIEW_STATUSES.includes(review['status']) &&
    isFindingList(review['findings']) &&
    typeof review['dropped'] === 'number'
  );
}

function isFindingList(value: unknown): value is AnalysisFinding[] {
  return Array.isArray(value) && value.every(isFinding);
}

function isFinding(value: unknown): value is AnalysisFinding {
  return (
    isRecord(value) &&
    typeof value['severity'] === 'string' &&
    SEVERITIES.includes(value['severity']) &&
    typeof value['subject'] === 'string' &&
    typeof value['message'] === 'string'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
