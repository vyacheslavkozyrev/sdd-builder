import type { Condition, ProjectConfig, StepDefinition, Workflow } from './model.js';
import { DEFAULT_STEP_CATALOG } from './catalog.js';

/**
 * Enabled workflows in map order: a workflow comes after every enabled
 * workflow connected into it. Unconnected workflows keep their tab order.
 * Disabled workflows take no part.
 */
export function selectWorkflows(config: ProjectConfig): Workflow[] {
  const enabled = config.workflows.filter((w) => w.enabled);
  const tabIndex = new Map(enabled.map((w, index) => [w.id, index]));
  const ids = new Set(enabled.map((w) => w.id));

  const incoming = new Map<string, number>(enabled.map((w) => [w.id, 0]));
  const following = new Map<string, string[]>();
  for (const connection of config.connections) {
    if (ids.has(connection.from) && ids.has(connection.to)) {
      following.set(connection.from, [...(following.get(connection.from) ?? []), connection.to]);
      incoming.set(connection.to, (incoming.get(connection.to) ?? 0) + 1);
    }
  }

  const ordered: Workflow[] = [];
  const byId = new Map(enabled.map((w) => [w.id, w]));
  const ready = enabled.filter((w) => incoming.get(w.id) === 0).map((w) => w.id);
  while (ready.length > 0) {
    ready.sort((a, b) => (tabIndex.get(a) ?? 0) - (tabIndex.get(b) ?? 0));
    const id = ready.shift();
    if (id === undefined) {
      break;
    }
    ordered.push(byId.get(id) as Workflow);
    for (const next of following.get(id) ?? []) {
      const remaining = (incoming.get(next) ?? 0) - 1;
      incoming.set(next, remaining);
      if (remaining === 0) {
        ready.push(next);
      }
    }
  }

  if (ordered.length !== enabled.length) {
    throw new Error('selectWorkflows: the map has a cycle; validate the configuration first');
  }
  return ordered;
}

/** A step as it will be generated: its position in the tab and its definition. */
export interface SelectedStep {
  stepId: string;
  definition: StepDefinition;
}

/** Enabled steps of a workflow, in tab order. Disabled steps produce nothing. */
export function selectSteps(workflow: Workflow, config: ProjectConfig): SelectedStep[] {
  return workflow.steps
    .filter((entry) => entry.enabled)
    .map((entry) => ({ stepId: entry.stepId, definition: findStep(entry.stepId, config) }));
}

/**
 * Conditions that take part: those whose step is enabled. A condition after
 * a disabled step is dropped, as building-blocks.md §3 states.
 */
export function selectConditions(workflow: Workflow): Condition[] {
  const enabled = new Set(workflow.steps.filter((s) => s.enabled).map((s) => s.stepId));
  return workflow.conditions.filter((c) => enabled.has(c.afterStepId));
}

function findStep(stepId: string, config: ProjectConfig): StepDefinition {
  const found = DEFAULT_STEP_CATALOG.find((s) => s.id === stepId) ?? config.customSteps.find((s) => s.id === stepId);
  if (!found) {
    throw new Error(`selectSteps: unknown step "${stepId}"; validate the configuration first`);
  }
  return found;
}
