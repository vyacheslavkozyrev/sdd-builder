import type { Condition, ProjectConfig, RouteTarget, Workflow } from '../model.js';

/**
 * Checks the outputs of every condition.
 * - Both outputs must be wired (AC-005).
 * - A route to a step must stay in the same workflow (AC-004).
 * - A fail route to a step must go back to an earlier step: a retry (AC-004).
 * - A pass route to a step must go forward.
 * - No route may target a disabled step (AC-010).
 * A condition after a disabled step is dropped, so its routes are not checked.
 */
export function checkRoutes(config: ProjectConfig): string[] {
  const problems: string[] = [];
  for (const workflow of config.workflows) {
    for (const condition of workflow.conditions) {
      if (condition.pass === undefined) {
        problems.push(`condition "${condition.id}": pass output is not wired`);
      }
      if (condition.fail === undefined) {
        problems.push(`condition "${condition.id}": fail output is not wired`);
      }
      if (isStepEnabled(workflow, condition.afterStepId) !== true) {
        continue;
      }
      if (condition.pass !== undefined) {
        problems.push(...checkRoute(workflow, condition, 'pass', condition.pass));
      }
      if (condition.fail !== undefined) {
        problems.push(...checkRoute(workflow, condition, 'fail', condition.fail));
      }
    }
  }
  return problems;
}

function isStepEnabled(workflow: Workflow, stepId: string): boolean | undefined {
  return workflow.steps.find((s) => s.stepId === stepId)?.enabled;
}

function checkRoute(workflow: Workflow, condition: Condition, label: 'pass' | 'fail', route: RouteTarget): string[] {
  if (route.kind !== 'step') {
    return [];
  }
  const target = route.stepId;
  const order = workflow.steps.map((s) => s.stepId);
  const targetIndex = order.indexOf(target);
  const afterIndex = order.indexOf(condition.afterStepId);

  if (targetIndex < 0) {
    return [`condition "${condition.id}": ${label} route targets step "${target}", which is not in workflow "${workflow.id}"`];
  }
  if (isStepEnabled(workflow, target) !== true) {
    return [`condition "${condition.id}": ${label} route targets disabled step "${target}"`];
  }
  if (label === 'fail' && targetIndex >= afterIndex) {
    return [`condition "${condition.id}": fail route must go back to an earlier step; "${target}" is not earlier than "${condition.afterStepId}"`];
  }
  if (label === 'pass' && targetIndex <= afterIndex) {
    return [`condition "${condition.id}": pass route must go forward; "${target}" is not after "${condition.afterStepId}"`];
  }
  return [];
}
