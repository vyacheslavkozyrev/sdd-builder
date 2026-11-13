import type { ProjectConfig } from './model.js';

/**
 * Input caps for the brief (F-13, decision 12). Both routes check them before any model call.
 * The idea is counted in JavaScript string length, as submitted, with no trimming.
 */
export const INPUT_CAPS = {
  ideaCharacters: 8000,
  modules: 12,
  rules: 60,
} as const;

/**
 * Each cap the configuration exceeds, as `<path>: <reason>`, in a fixed order: the idea, the
 * modules, then the rules (code and test rules counted together). Reasons carry counts and limits
 * only, never submitted text. An empty list means every cap is met.
 */
export function capProblems(config: ProjectConfig): string[] {
  const problems: string[] = [];
  const ideaLength = config.idea.length;
  if (ideaLength > INPUT_CAPS.ideaCharacters) {
    problems.push(`idea: ${ideaLength} characters, the limit is ${INPUT_CAPS.ideaCharacters}`);
  }
  const moduleCount = config.architecture.modules.length;
  if (moduleCount > INPUT_CAPS.modules) {
    problems.push(`architecture.modules: ${moduleCount} modules, the limit is ${INPUT_CAPS.modules}`);
  }
  const ruleCount = config.codeRules.length + config.testRules.length;
  if (ruleCount > INPUT_CAPS.rules) {
    problems.push(`codeRules and testRules: ${ruleCount} rules, the limit is ${INPUT_CAPS.rules}`);
  }
  return problems;
}
