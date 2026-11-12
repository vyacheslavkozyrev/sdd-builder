import { DEFAULT_STEP_CATALOG } from '../catalog.js';
import type { AnalysisFinding, MapConnection, ProjectConfig, StepDefinition, Workflow } from '../model.js';

/**
 * Each input an enabled step consumes that no source supplies, as a warning finding, in workflow,
 * step and consumes order. An input is supplied by an earlier enabled step of the same workflow, by
 * an enabled step of an upstream workflow (any workflow with a path to this one through enabled
 * workflows in `connections`), or when it equals the workflow's `iterationSource`. Disabled steps and
 * disabled workflows are not checked. A step id with no definition is skipped here, because
 * `validateConfig` reports it as `unknown step` (enabled or disabled entry alike) and `refusalFindings`
 * turns that into a blocker. A step id listed twice is reported once per input, and only if no
 * occurrence of it is satisfied, as `reachabilityFindings` does for steps.
 */
export function inputFindings(config: ProjectConfig): AnalysisFinding[] {
  const enabled = config.workflows.filter((workflow) => workflow.enabled);
  const enabledIds = new Set(enabled.map((workflow) => workflow.id));
  const producedByWorkflow = new Map(enabled.map((workflow) => [workflow.id, producedBy(workflow, config)]));

  return enabled.flatMap((workflow) => {
    const upstreamProduced = new Set<string>();
    for (const upstreamId of upstreamOf(workflow.id, config.connections, enabledIds)) {
      for (const name of producedByWorkflow.get(upstreamId) ?? []) {
        upstreamProduced.add(name);
      }
    }
    return unsatisfiedInputs(workflow, config, upstreamProduced);
  });
}

function unsatisfiedInputs(workflow: Workflow, config: ProjectConfig, upstreamProduced: ReadonlySet<string>): AnalysisFinding[] {
  const produced = new Set<string>();
  const open = new Map<string, { stepId: string; input: string }>();
  const satisfied = new Set<string>();
  for (const entry of workflow.steps) {
    if (!entry.enabled) {
      continue;
    }
    const definition = definitionOf(entry.stepId, config);
    if (definition === undefined) {
      continue;
    }
    for (const input of definition.consumes) {
      const key = JSON.stringify([entry.stepId, input]);
      if (produced.has(input) || upstreamProduced.has(input) || input === workflow.iterationSource) {
        satisfied.add(key);
      } else if (!open.has(key)) {
        open.set(key, { stepId: entry.stepId, input });
      }
    }
    for (const name of definition.produces) {
      produced.add(name);
    }
  }
  return [...open]
    .filter(([key]) => !satisfied.has(key))
    .map(([, { stepId, input }]) => unsatisfiedFinding(workflow.id, stepId, input));
}

/** The artifact names the enabled steps of a workflow produce. */
function producedBy(workflow: Workflow, config: ProjectConfig): Set<string> {
  const names = new Set<string>();
  for (const entry of workflow.steps) {
    const definition = entry.enabled ? definitionOf(entry.stepId, config) : undefined;
    for (const name of definition?.produces ?? []) {
      names.add(name);
    }
  }
  return names;
}

/**
 * The workflows with a path to `workflowId` through connections whose two endpoints are enabled
 * workflows. Walks backwards over `connections` with a visited set, so a cycle ends. The workflow
 * itself is not in the result.
 */
function upstreamOf(workflowId: string, connections: readonly MapConnection[], enabledIds: ReadonlySet<string>): Set<string> {
  const visited = new Set<string>([workflowId]);
  const pending: string[] = [workflowId];
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    for (const connection of connections) {
      if (connection.to === id && enabledIds.has(connection.from) && !visited.has(connection.from)) {
        visited.add(connection.from);
        pending.push(connection.from);
      }
    }
  }
  visited.delete(workflowId);
  return visited;
}

/** Catalog first, then the user's custom steps, as `select.ts` resolves them. */
function definitionOf(stepId: string, config: ProjectConfig): StepDefinition | undefined {
  return DEFAULT_STEP_CATALOG.find((step) => step.id === stepId) ?? config.customSteps.find((step) => step.id === stepId);
}

function unsatisfiedFinding(workflowId: string, stepId: string, input: string): AnalysisFinding {
  return {
    severity: 'warning',
    subject: `workflow "${workflowId}" step "${stepId}"`,
    message: `step "${stepId}" in workflow "${workflowId}" consumes "${input}" that no step produces and that is not the iteration source`,
  };
}
