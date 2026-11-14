// Builder step state for one workflow tab: its ordered steps and the conditions placed after them.
// Pure: no DOM, no storage, no network. Like map-state.ts, every edit returns a new state; a refused
// edit returns a message and leaves the caller's state as it was. Unknown ids throw.
import { getCatalogStep } from '@sddbuilder/core';
import type { RouteTarget, Workflow, WorkflowStep } from '@sddbuilder/core';
import type { EditResult, MapState } from './map-state.js';

/** Adds a catalog step at the end of the workflow's list, enabled. Refuses a step the workflow already has. */
export function addStep(state: MapState, workflowId: string, stepId: string): EditResult {
  const workflow = requireWorkflow(state, workflowId);
  const definition = getCatalogStep(stepId);
  if (workflow.steps.some((s) => s.stepId === stepId)) {
    return refuse(`${definition.name} is already in this workflow.`);
  }
  return {
    ok: true,
    state: replaceWorkflow(state, workflowId, (w) => ({
      ...w,
      steps: [...w.steps, { stepId, enabled: true }],
    })),
  };
}

/**
 * Swaps a step with its neighbour in the given direction. The first step moved up and the last
 * moved down change nothing. Conditions keep their `afterStepId`, so they stay attached to the step.
 */
export function moveStep(state: MapState, workflowId: string, stepId: string, direction: 'up' | 'down'): MapState {
  if (direction !== 'up' && direction !== 'down') {
    throw new Error(`Unknown direction: ${String(direction)}`);
  }
  const workflow = requireWorkflow(state, workflowId);
  const step = requireStep(workflow, stepId);
  const index = workflow.steps.indexOf(step);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= workflow.steps.length) {
    return state;
  }
  const steps = workflow.steps.filter((s) => s !== step);
  steps.splice(target, 0, step);
  return replaceWorkflow(state, workflowId, (w) => ({ ...w, steps }));
}

/**
 * Removes a step and the conditions placed after it. Refused for a required catalog step, and while
 * another condition's pass or fail route points at the step. A route from a condition that is removed
 * with the step does not count.
 */
export function removeStep(state: MapState, workflowId: string, stepId: string): EditResult {
  const workflow = requireWorkflow(state, workflowId);
  requireStep(workflow, stepId);
  const definition = getCatalogStep(stepId);
  if (definition.required) {
    return refuse(`${definition.name} is required and cannot be removed.`);
  }
  for (const condition of workflow.conditions) {
    if (condition.afterStepId === stepId) {
      continue;
    }
    for (const [output, route] of [
      ['pass', condition.pass],
      ['fail', condition.fail],
    ] as const) {
      if (routesTo(route, stepId)) {
        return refuse(
          `${definition.name} cannot be removed: the ${output} route of condition "${condition.id}" points to it.`,
        );
      }
    }
  }
  return {
    ok: true,
    state: replaceWorkflow(state, workflowId, (w) => ({
      ...w,
      steps: w.steps.filter((s) => s.stepId !== stepId),
      conditions: w.conditions.filter((c) => c.afterStepId !== stepId),
    })),
  };
}

/** Switches a step on or off. It stays in its place in the list either way. */
export function setStepEnabled(state: MapState, workflowId: string, stepId: string, enabled: boolean): MapState {
  const workflow = requireWorkflow(state, workflowId);
  requireStep(workflow, stepId);
  return replaceWorkflow(state, workflowId, (w) => ({
    ...w,
    steps: w.steps.map((s) => (s.stepId === stepId ? { ...s, enabled } : s)),
  }));
}

function refuse(message: string): EditResult {
  return { ok: false, message };
}

function routesTo(route: RouteTarget | undefined, stepId: string): boolean {
  return route?.kind === 'step' && route.stepId === stepId;
}

function requireWorkflow(state: MapState, workflowId: string): Workflow {
  const found = state.workflows.find((w) => w.id === workflowId);
  if (!found) {
    throw new Error(`Unknown workflow id: ${workflowId}`);
  }
  return found;
}

function requireStep(workflow: Workflow, stepId: string): WorkflowStep {
  const found = workflow.steps.find((s) => s.stepId === stepId);
  if (!found) {
    throw new Error(`Unknown step id in workflow ${workflow.id}: ${stepId}`);
  }
  return found;
}

function replaceWorkflow(state: MapState, workflowId: string, edit: (workflow: Workflow) => Workflow): MapState {
  return {
    ...state,
    workflows: state.workflows.map((w) => (w.id === workflowId ? edit(w) : w)),
  };
}
