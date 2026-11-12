import type { Condition, GateType, ProjectConfig } from '../model.js';
import { DEFAULT_STEP_CATALOG, DEFAULT_WORKFLOWS } from '../catalog.js';

/** The fixed set of gate types (building-blocks.md §3). */
export const GATE_TYPES: readonly GateType[] = ['approval', 'checks', 'review', 'diff-size'];

/** Default workflows the process cannot run without. Release is optional. */
export const REQUIRED_WORKFLOW_IDS: readonly string[] = ['specify', 'implement-cycle', 'verify-feature'];

/**
 * Required steps and gates, gate types, round limits, and custom steps.
 * Required catalog steps and gates are those the default workflows mark as required.
 */
export function checkPolicy(config: ProjectConfig): string[] {
  const problems: string[] = [];
  const workflows = new Map(config.workflows.map((w) => [w.id, w]));

  for (const id of REQUIRED_WORKFLOW_IDS) {
    const workflow = workflows.get(id);
    if (!workflow || !workflow.enabled) {
      problems.push(`required workflow "${id}" is missing or disabled`);
    }
  }

  for (const defaults of DEFAULT_WORKFLOWS) {
    const workflow = workflows.get(defaults.id);
    if (!workflow) {
      continue;
    }
    for (const entry of defaults.steps.filter((s) => isRequiredCatalogStep(s.stepId))) {
      const present = workflow.steps.find((s) => s.stepId === entry.stepId);
      if (!present) {
        problems.push(`workflow "${workflow.id}": required step "${entry.stepId}" is missing`);
      } else if (!present.enabled) {
        problems.push(`workflow "${workflow.id}": required step "${entry.stepId}" is disabled`);
      }
    }
    for (const required of defaults.conditions.filter((c) => c.gate.required)) {
      if (!workflow.conditions.some((c) => c.id === required.id)) {
        problems.push(`workflow "${workflow.id}": required gate "${required.id}" is missing`);
      }
    }
  }

  for (const workflow of config.workflows) {
    for (const condition of workflow.conditions) {
      problems.push(...checkCondition(condition));
    }
  }
  for (const connection of config.connections) {
    if (connection.gate && !GATE_TYPES.includes(connection.gate.type)) {
      problems.push(`connection "${connection.id}": gate type "${connection.gate.type}" is not one of ${GATE_TYPES.join(', ')}`);
    }
  }

  for (const step of config.customSteps) {
    if (step.required) {
      problems.push(`custom step "${step.id}" cannot be required`);
    }
  }
  return problems;
}

function isRequiredCatalogStep(stepId: string): boolean {
  return DEFAULT_STEP_CATALOG.find((s) => s.id === stepId)?.required === true;
}

function checkCondition(condition: Condition): string[] {
  const problems: string[] = [];
  if (!GATE_TYPES.includes(condition.gate.type)) {
    problems.push(`condition "${condition.id}": gate type "${condition.gate.type}" is not one of ${GATE_TYPES.join(', ')}`);
  }
  if (condition.roundLimit !== undefined && !(Number.isInteger(condition.roundLimit) && condition.roundLimit > 0)) {
    problems.push(`condition "${condition.id}": round limit must be a positive integer, got ${condition.roundLimit}`);
  }
  return problems;
}
