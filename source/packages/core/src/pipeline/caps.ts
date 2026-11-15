// Input caps of the pipeline model (F-04 AC-021). The analyzer's `/analyze` route checks them before any model call.
// The idea is counted in JavaScript string length, as submitted, with no trimming. Pure: no I/O. The flat model in
// `limits.ts` keeps its own caps for `/generate` until F-07; this module does not import them.
import type { ProjectConfig } from './model.js';

/** Input caps of the pipeline brief (F-04 AC-021). */
export const PIPELINE_INPUT_CAPS = {
  ideaCharacters: 8000,
  rules: 60,
} as const;

/**
 * Each cap the configuration exceeds, as `<path>: <reason>`, in a fixed order: the idea, then the rules. Reasons carry
 * counts and limits only, never submitted text. An empty list means every cap is met.
 */
export function pipelineCapProblems(config: ProjectConfig): string[] {
  const problems: string[] = [];
  const ideaLength = config.idea.length;
  if (ideaLength > PIPELINE_INPUT_CAPS.ideaCharacters) {
    problems.push(`idea: ${ideaLength} characters, the limit is ${PIPELINE_INPUT_CAPS.ideaCharacters}`);
  }
  const ruleCount = config.rules.length;
  if (ruleCount > PIPELINE_INPUT_CAPS.rules) {
    problems.push(`rules: ${ruleCount} rules, the limit is ${PIPELINE_INPUT_CAPS.rules}`);
  }
  return problems;
}
