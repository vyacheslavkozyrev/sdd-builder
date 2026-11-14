import type { AnalysisFinding, Condition, ProjectConfig, Workflow } from '../model.js';

/**
 * Each retry without a round limit, as a warning finding, in workflow and condition list order. A
 * retry is a condition whose fail route goes back to an earlier step of the same workflow
 * (`kind: 'step'`, building-blocks.md §3). A fail route to a later step or to the step the condition
 * follows is not a retry; `validateConfig` refuses it. A retry with `roundLimit` set gives no finding,
 * and so do `next` and `stop` fail routes. Only enabled workflows are checked, and a condition is
 * checked only when the step it follows is enabled in its workflow, as `selectConditions` drops it
 * otherwise. A condition that follows a step the workflow does not hold is skipped here:
 * `validateConfig` reports it and `refusalFindings` makes it a blocker. A switched-off condition
 * (`enabled: false`) is skipped too, so it gives no finding (AC-029).
 */
export function retryFindings(config: ProjectConfig): AnalysisFinding[] {
  return config.workflows
    .filter((workflow) => workflow.enabled)
    .flatMap((workflow) =>
      workflow.conditions.flatMap((condition) => {
        const fail = condition.fail;
        if (!condition.enabled || fail?.kind !== 'step' || condition.roundLimit !== undefined) {
          return [];
        }
        if (!isRetry(condition, fail.stepId, workflow)) {
          return [];
        }
        return [unlimitedRetryFinding(workflow.id, condition.id, fail.stepId)];
      }),
    );
}

/** The condition follows an enabled step, and its fail route targets a step listed before that step. */
function isRetry(condition: Condition, targetId: string, workflow: Workflow): boolean {
  const followsEnabled = workflow.steps.some((entry) => entry.enabled && entry.stepId === condition.afterStepId);
  const order = workflow.steps.map((entry) => entry.stepId);
  const targetIndex = order.indexOf(targetId);
  return followsEnabled && targetIndex >= 0 && targetIndex < order.indexOf(condition.afterStepId);
}

function unlimitedRetryFinding(workflowId: string, conditionId: string, stepId: string): AnalysisFinding {
  return {
    severity: 'warning',
    subject: `workflow "${workflowId}" condition "${conditionId}"`,
    message: `condition "${conditionId}" in workflow "${workflowId}" retries to "${stepId}" with no round limit (no limit set)`,
  };
}
