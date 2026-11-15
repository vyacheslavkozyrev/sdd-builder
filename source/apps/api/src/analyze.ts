import { analyzeStructure, checkReview, pipeline } from '@sddbuilder/core';
import type { AnalysisResult, ProjectConfig } from '@sddbuilder/core';
import { buildReviewPrompt } from './review/prompt.js';
import { buildPipelineReviewPrompt } from './review/pipeline-prompt.js';
import { errorNameOf, formatLogLine, type LogPort } from './log.js';

/** The result of one review call: the reply text, and whether the length limit cut it short. */
export interface ReviewReply {
  text: string;
  truncated: boolean;
}

/** The port the analysis calls for the LLM review. The adapter implements it; tests pass a fake. */
export interface ReviewModel {
  complete(prompt: string): Promise<ReviewReply>;
}

/**
 * The analysis of a configuration: the structural findings from core, and the LLM review.
 * The structural findings are computed first and returned as produced; the review never changes them.
 * The model is called once. A thrown error, a rejection, a truncated reply (it reached the output
 * limit, so it is not parsed), a reply that is not JSON, or a reply that the reply check fails gives
 * `review.status` `failed` with no review findings; the structural findings still stand. A rejected call
 * is logged by its error name only, never by its message.
 */
export async function analyze(config: ProjectConfig, model: ReviewModel, log: LogPort): Promise<AnalysisResult> {
  const structural = analyzeStructure(config);
  const prompt = buildReviewPrompt(config, structural);

  let reply: ReviewReply;
  try {
    reply = await model.complete(prompt);
  } catch (error) {
    log.write(formatLogLine({ event: 'review_model_failed', route: '/analyze', error: errorNameOf(error) }));
    return failedResult(structural);
  }

  if (reply.truncated) {
    return failedResult(structural);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(reply.text);
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

/**
 * The analysis of a pipeline configuration (F-04 AC-016, AC-017, AC-018). The structural findings come from
 * `pipeline.analyzeStructure` and are returned as produced; the model is called once, and its reply is checked by
 * `pipeline.checkReview`. Each failure of the call or the reply gives review `failed` with no findings, and the
 * structural findings still stand. A rejected call is logged by its error name only, never by its message.
 */
export async function analyzePipeline(
  config: pipeline.ProjectConfig,
  model: ReviewModel,
  log: LogPort,
): Promise<AnalysisResult> {
  const structural = pipeline.analyzeStructure(config);
  const prompt = buildPipelineReviewPrompt(config, structural);

  let reply: ReviewReply;
  try {
    reply = await model.complete(prompt);
  } catch (error) {
    log.write(formatLogLine({ event: 'review_model_failed', route: '/analyze', error: errorNameOf(error) }));
    return failedResult(structural);
  }

  if (reply.truncated) {
    return failedResult(structural);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(reply.text);
  } catch {
    return failedResult(structural);
  }

  const check = pipeline.checkReview(parsed);
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
