// Rule lines for the pipeline command (F-02 AC-024, AC-025). Each function returns one rule as text, without its number;
// the caller numbers the rules of its file. A round limit is written only when the block holds one; without it the rule
// says "no limit set", because the generator never invents a number. Pure.
import type { ConditionBlock } from '../model.js';

/** Which output of a Condition a rule is about. */
export type Outcome = 'pass' | 'fail';

/** The rule for a Condition's check. A diff-size check shows its threshold; the other check types show their decider. */
export function checkRule(block: ConditionBlock): string {
  if (block.checkType === 'diff-size') {
    return `Check diff-size: the staged change is at most ${block.threshold} lines (\`${block.id}\`).`;
  }
  return `Check ${block.checkType}, decided by ${block.decidedBy} (\`${block.id}\`).`;
}

/**
 * The rule for a back route of a Condition on the given outcome: it names the target block and the round limit.
 * Undefined when that outcome does not route back.
 */
export function backRouteRule(block: ConditionBlock, outcome: Outcome): string | undefined {
  const route = outcome === 'pass' ? block.passRoute : block.failRoute;
  if (route.kind !== 'back') {
    return undefined;
  }
  const limit = block.roundLimit === undefined ? 'no limit set' : `round limit ${block.roundLimit}`;
  return `On ${outcome}, go back to \`${route.blockId}\` and run again from there; ${limit}.`;
}
