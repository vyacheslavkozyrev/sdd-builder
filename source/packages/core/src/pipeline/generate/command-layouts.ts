// List builders for the command layouts (F-03 AC-005, AC-006): the values of the list placeholders in
// `templates/claude-code/command.md` and `pipeline-command.md`. Each builder returns its items as text, one per line, and
// reads only the enabled blocks it is given, in block order, so a disabled block is never listed. The wording comes from
// the modules that write the pipeline and flow command files, so both paths say the same thing. Pure: no I/O.
import type { ChildBlock, ConditionBlock, Flow, PipelineBlock, PipelineStartBlock } from '../model.js';
import { describeStep } from './flow-commands.js';
import { argumentLines, describePipelineStep } from './pipeline-command.js';
import { backRouteRule, type Outcome } from './rules-text.js';

const OUTCOMES: readonly Outcome[] = ['pass', 'fail'];

/** Joins items as a numbered list, one item per line, numbered from 1. */
function numbered(items: readonly string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

/** The numbered steps of a flow: its enabled blocks in block order. A disabled block gives no step (F-03 AC-005). */
export function flowStepList(flow: Flow): string {
  const enabled = flow.blocks.filter((block) => block.enabled);
  const selected = new Set(enabled.map((block) => block.id));
  return numbered(enabled.map((block) => describeStep(block, selected)));
}

/** The numbered steps of the pipeline: its enabled flows and checks in pipeline order (F-03 AC-005). */
export function pipelineStepList(blocks: readonly PipelineBlock[]): string {
  const steps = blocks.flatMap((block): string[] => {
    if (!block.enabled) {
      return [];
    }
    const step = describePipelineStep(block);
    return step === undefined ? [] : [step];
  });
  return numbered(steps);
}

/**
 * The numbered back-route rules of the enabled Conditions: one per outcome that routes back, naming the target block
 * and the round limit, or "no limit set" when the block has none (F-03 AC-006). An outcome with no back route gives no rule.
 */
export function routeRuleList(blocks: readonly (ChildBlock | PipelineBlock)[]): string {
  const conditions = blocks.flatMap((block): ConditionBlock[] =>
    block.kind === 'condition' && block.enabled ? [block] : [],
  );
  const rules = conditions.flatMap((block) =>
    OUTCOMES.flatMap((outcome) => {
      const rule = backRouteRule(block, outcome);
      return rule === undefined ? [] : [rule];
    }),
  );
  if (rules.length === 0) {
    return 'There are no back routes.';
  }
  return numbered(rules);
}

/** The arguments the pipeline Start block takes, one line each with its required flag (F-03 AC-005). */
export function argumentList(start: PipelineStartBlock): string {
  return argumentLines(start).join('\n');
}
