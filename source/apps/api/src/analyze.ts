import { pipeline } from '@sddbuilder/core';
import type { AnalysisResult } from '@sddbuilder/core';
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
