import { analyzeStructure, checkReview } from '@sddbuilder/core';
import type { AnalysisResult, ProjectConfig } from '@sddbuilder/core';
import { buildReviewPrompt } from './review/prompt.js';

/** The port the analysis calls for the LLM review. The adapter implements it; tests pass a fake. */
export interface ReviewModel {
  complete(prompt: string): Promise<string>;
}

/**
 * The analysis of a configuration: the structural findings from core, and the LLM review.
 * The structural findings are computed first and returned as produced; the review never changes them.
 * The model is called once. A thrown error, a rejection, a reply that is not JSON, or a reply that
 * the reply check fails gives `review.status` `failed` with no review findings; the structural
 * findings still stand.
 */
export async function analyze(config: ProjectConfig, model: ReviewModel): Promise<AnalysisResult> {
  const structural = analyzeStructure(config);
  const prompt = buildReviewPrompt(config, structural);

  let reply: string;
  try {
    reply = await model.complete(prompt);
  } catch {
    return failedResult(structural);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(reply);
  } catch {
    return failedResult(structural);
  }

  const check = checkReview(parsed);
  if (check.status === 'failed') {
    return failedResult(structural);
  }
  return {
    findings: structural,
    review: { status: 'ok', findings: check.findings, dropped: check.dropped },
  };
}

function failedResult(structural: AnalysisResult['findings']): AnalysisResult {
  return {
    findings: structural,
    review: { status: 'failed', findings: [], dropped: 0 },
  };
}
