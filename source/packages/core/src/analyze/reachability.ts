import type { AnalysisFinding, ProjectConfig, RouteTarget, Workflow } from '../model.js';

/**
 * Each enabled step that no route reaches, as a blocker finding, in workflow and step order.
 * The subject is `workflow "<id>" step "<step id>"`; the message names the step and its workflow.
 *
 * The entry of a workflow is its first enabled step. A step with no condition after it routes
 * `next` to the following enabled step. A step with conditions routes only through their pass and
 * fail outputs: `next` is the following enabled step, `step` a named enabled step, `stop` ends the
 * process, and an unwired fail output (undefined) has no target. Disabled steps and disabled
 * workflows are never checked and never followed. A switched-off condition (`enabled: false`) is
 * not a route: its step routes `next` as if it had no condition (AC-029). A step id listed twice is
 * reported once, and is reached if any of its occurrences is.
 */
export function reachabilityFindings(config: ProjectConfig): AnalysisFinding[] {
  return config.workflows.filter((workflow) => workflow.enabled).flatMap(unreachableFindings);
}

function unreachableFindings(workflow: Workflow): AnalysisFinding[] {
  const order = workflow.steps.filter((step) => step.enabled).map((step) => step.stepId);
  const reached = reachedIndices(workflow, order);
  const reachedIds = new Set(order.filter((_, index) => reached[index] === true));
  const reported = new Set<string>();
  return order.flatMap((stepId): AnalysisFinding[] => {
    if (reachedIds.has(stepId) || reported.has(stepId)) {
      return [];
    }
    reported.add(stepId);
    return [unreachableFinding(workflow.id, stepId)];
  });
}

/** Walks from the entry (the first enabled step) and marks every index a route reaches. */
function reachedIndices(workflow: Workflow, order: readonly string[]): boolean[] {
  const reached: boolean[] = order.map(() => false);
  const pending: number[] = order.length > 0 ? [0] : [];
  for (let index = pending.pop(); index !== undefined; index = pending.pop()) {
    if (reached[index] === true) {
      continue;
    }
    reached[index] = true;
    pending.push(...successors(workflow, order, index));
  }
  return reached;
}

/** The indices of the enabled steps that the step at `index` routes to. */
function successors(workflow: Workflow, order: readonly string[], index: number): number[] {
  const stepId = order[index];
  if (stepId === undefined) {
    return [];
  }
  const conditions = workflow.conditions.filter((condition) => condition.enabled && condition.afterStepId === stepId);
  const routes: RouteTarget[] =
    conditions.length === 0
      ? [{ kind: 'next' }]
      : conditions.flatMap((condition) =>
          condition.fail === undefined ? [condition.pass] : [condition.pass, condition.fail],
        );
  return routes.flatMap((route) => {
    const target = targetIndex(route, order, index);
    return target === undefined ? [] : [target];
  });
}

function targetIndex(route: RouteTarget, order: readonly string[], index: number): number | undefined {
  switch (route.kind) {
    case 'next':
      return index + 1 < order.length ? index + 1 : undefined;
    case 'step': {
      const target = order.indexOf(route.stepId);
      return target === -1 ? undefined : target;
    }
    case 'stop':
      return undefined;
  }
}

function unreachableFinding(workflowId: string, stepId: string): AnalysisFinding {
  return {
    severity: 'blocker',
    subject: `workflow "${workflowId}" step "${stepId}"`,
    message: `step "${stepId}" in workflow "${workflowId}" is unreachable`,
  };
}
