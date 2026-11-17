// The analysis of one brief and pipeline (architecture.md §4, decision 37; US-003, US-004, US-005). It runs the
// structural checks and the brief checks, then at most one review call. The review is advice: a failed review
// leaves the findings in full, and nothing here changes the config.

import { pipeline } from '@sddbuilder/core';
import { reviewRequest } from './review/prompt.js';
import type { ReviewRequest } from './review/prompt.js';
import type { ReviewReply } from './review/anthropic.js';

// The model that makes the review call. The API passes the real client in; a test passes a fake.
export interface ReviewModel {
  review(request: ReviewRequest): Promise<ReviewReply>;
}

// Receives one event per analysis, with the name of the step and its status. It never receives the brief.
export type AnalysisLog = (event: string, status: string) => void;

// `failed` has no entries and `dropped` 0: no reply was checked entry by entry. `ok` is a valid reply.
export type AnalysisReview =
  | { readonly status: 'failed'; readonly findings: readonly []; readonly dropped: 0 }
  | { readonly status: 'ok'; readonly findings: readonly pipeline.ReviewEntry[]; readonly dropped: number };

export interface AnalysisResult {
  readonly findings: readonly pipeline.Finding[];
  readonly review: AnalysisReview;
}

// Analyses the config: the structural findings, then the brief findings, then the review. `model` is null when no
// model is configured, and the review is then `failed` without a call.
export async function analyzePipeline(
  config: pipeline.ProjectConfig,
  model: ReviewModel | null,
  log: AnalysisLog,
): Promise<AnalysisResult> {
  const findings = [...pipeline.analyzeStructure(config), ...pipeline.analyzeBrief(config)];
  const review = await runReview(config, model);
  log('review', review.status);
  return { findings, review };
}

// Makes the one review call and checks its reply. A thrown error is not retried: it is reported as `failed`
// through the review status and the log event.
async function runReview(config: pipeline.ProjectConfig, model: ReviewModel | null): Promise<AnalysisReview> {
  if (model === null) {
    return failedReview();
  }
  const request = reviewRequest(config);
  let reply: ReviewReply;
  try {
    reply = await model.review(request);
  } catch {
    // The error is neither kept nor logged: the review status and the log event say it failed, and its message is
    // left out (privacy, T007).
    return failedReview();
  }
  if (reply.stopReason === 'max_tokens') {
    return failedReview();
  }
  const checked = pipeline.checkReview(reply.text);
  if (checked.status === 'failed') {
    return failedReview();
  }
  return checked;
}

function failedReview(): AnalysisReview {
  return { status: 'failed', findings: [], dropped: 0 };
}
