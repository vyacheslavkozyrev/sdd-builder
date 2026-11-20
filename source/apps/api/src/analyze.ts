// The analysis of a project config (F-06 AC-009, AC-010, AC-013, AC-018 to AC-023, decision 37). The structural rules
// and the brief checks come from core and are always returned. The LLM review is advice: it runs through an injected
// model, and any failure of it (no model, a thrown error, a reply stopped at `max_tokens`, a reply core rejects) leaves
// the review `failed` and the findings intact. One review call per analysis, with no retry. The config is only read.

import { pipeline } from '@sddbuilder/core';
import { reviewRequest, type ReviewRequest } from './review/prompt.js';

// The review as the API consumes it: the reply text and its stop reason. `callReview` (review/anthropic.ts) gives this
// shape when it is wired to the Anthropic client.
export interface ReviewModel {
  review(request: ReviewRequest): Promise<{ readonly text: string; readonly stopReason: string | null }>;
}

export interface AnalysisResult {
  readonly findings: readonly pipeline.Finding[];
  readonly review: pipeline.ReviewResult;
}

// A fresh failed review on each call, so no caller can change the result of another analysis.
function failedReview(): pipeline.ReviewResult {
  return { status: 'failed', findings: [], dropped: 0 };
}

// One review call. Only the model call is inside the try: a thrown error from it becomes a failed review and is logged
// without its text, since the text could carry brief content. Any other error is a programmer error and is not caught.
async function runReview(
  config: pipeline.ProjectConfig,
  model: ReviewModel | null,
  log: (line: string) => void,
): Promise<pipeline.ReviewResult> {
  if (model === null) return failedReview();
  const request = reviewRequest(config);
  let reply: Awaited<ReturnType<ReviewModel['review']>>;
  try {
    reply = await model.review(request);
  } catch {
    log('analyze review call threw; review failed');
    return failedReview();
  }
  if (reply.stopReason === 'max_tokens') return failedReview();
  return pipeline.checkReview(reply.text);
}

export async function analyzePipeline(
  config: pipeline.ProjectConfig,
  model: ReviewModel | null,
  log: (line: string) => void,
): Promise<AnalysisResult> {
  const findings = [...pipeline.analyzeStructure(config), ...pipeline.analyzeBrief(config)];
  const review = await runReview(config, model, log);
  log(`analyze review=${review.status}`);
  return { findings, review };
}
