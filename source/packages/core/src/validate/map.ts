import type { MapConnection, ProjectConfig } from '../model.js';
import { DEFAULT_STEP_CATALOG } from '../catalog.js';

/**
 * True when adding the connection `from → to` to `connections` must be refused:
 * a self-link, or a connection that closes a cycle (a path `to → … → from`
 * already exists).
 */
export function wouldCreateCycle(connections: readonly MapConnection[], from: string, to: string): boolean {
  if (from === to) {
    return true;
  }
  const next = new Map<string, string[]>();
  for (const connection of connections) {
    next.set(connection.from, [...(next.get(connection.from) ?? []), connection.to]);
  }
  const seen = new Set<string>();
  const reaches = (node: string): boolean => {
    if (node === from) {
      return true;
    }
    if (seen.has(node)) {
      return false;
    }
    seen.add(node);
    return (next.get(node) ?? []).some(reaches);
  };
  return reaches(to);
}

/**
 * Checks the global map and the references inside workflows:
 * unknown workflows in connections, connections to or from disabled
 * workflows, cycles on the map, unknown steps, and conditions that follow a
 * step outside their workflow.
 */
export function checkMap(config: ProjectConfig): string[] {
  const problems: string[] = [];
  const workflows = new Map(config.workflows.map((w) => [w.id, w]));
  const stepIds = new Set([...DEFAULT_STEP_CATALOG.map((s) => s.id), ...config.customSteps.map((s) => s.id)]);

  for (const connection of config.connections) {
    for (const end of [connection.from, connection.to]) {
      if (!workflows.has(end)) {
        problems.push(`connection "${connection.id}": unknown workflow "${end}"`);
      }
    }
    for (const end of [connection.from, connection.to]) {
      const target = workflows.get(end);
      if (target && !target.enabled) {
        problems.push(`connection "${connection.id}": workflow "${end}" is disabled`);
      }
    }
  }

  for (const workflow of config.workflows) {
    for (const entry of workflow.steps) {
      if (!stepIds.has(entry.stepId)) {
        problems.push(`workflow "${workflow.id}": unknown step "${entry.stepId}"`);
      }
    }
    const inWorkflow = new Set(workflow.steps.map((s) => s.stepId));
    for (const condition of workflow.conditions) {
      if (!condition.enabled) {
        continue;
      }
      if (!inWorkflow.has(condition.afterStepId)) {
        problems.push(
          `condition "${condition.id}": follows step "${condition.afterStepId}", ` +
            `which is not in workflow "${workflow.id}"`,
        );
      }
    }
  }

  problems.push(...findCycles(config));
  return problems;
}

/** Each cycle is reported once, as the workflows it passes through, in order. */
function findCycles(config: ProjectConfig): string[] {
  const known = new Set(config.workflows.map((w) => w.id));
  const next = new Map<string, string[]>();
  for (const connection of config.connections) {
    if (known.has(connection.from) && known.has(connection.to)) {
      next.set(connection.from, [...(next.get(connection.from) ?? []), connection.to]);
    }
  }

  const problems: string[] = [];
  const done = new Set<string>();
  const visit = (node: string, path: string[]): void => {
    const index = path.indexOf(node);
    if (index >= 0) {
      const cycle = [...path.slice(index), node];
      problems.push(`map cycle: ${cycle.join(' -> ')}`);
      return;
    }
    if (done.has(node)) {
      return;
    }
    for (const following of next.get(node) ?? []) {
      visit(following, [...path, node]);
    }
    done.add(node);
  };

  for (const workflow of config.workflows) {
    visit(workflow.id, []);
  }
  return problems;
}
