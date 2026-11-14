// Builder tab state: the workflow tabs and the switches on gates and branch routes.
// Pure: no DOM, no storage, no network. Like map-state.ts and step-state.ts, every edit returns
// a new state; a refused edit returns a message and leaves the caller's state as it was. Unknown ids throw.
import type { Scope, Workflow } from '@sddbuilder/core';
import { addWorkflow } from './map-state.js';
import type { EditResult, MapState } from './map-state.js';

/** One workflow tab. Tabs are the workflows on the map, in map order. */
export interface WorkflowTab {
  id: string;
  name: string;
  scope: Scope;
}

/** One tab per workflow, in the order given. */
export function tabsFor(workflows: readonly Workflow[]): WorkflowTab[] {
  return workflows.map((w) => ({ id: w.id, name: w.name, scope: w.scope }));
}

/** Adds a tab: a workflow with no steps and no conditions. Uses the same rules as addWorkflow. */
export function addTab(state: MapState, name: string, scope: Scope): EditResult {
  return addWorkflow(state, name, scope);
}

/**
 * Switches a gate or branch route on or off by setting the condition's `enabled` value. Its gate,
 * routes and round limit are kept. A required gate (gate.required true) cannot be switched off and
 * is refused; switching it on is always allowed.
 */
export function setConditionEnabled(
  state: MapState,
  workflowId: string,
  conditionId: string,
  enabled: boolean,
): EditResult {
  const workflow = requireWorkflow(state, workflowId);
  const condition = workflow.conditions.find((c) => c.id === conditionId);
  if (!condition) {
    throw new Error(`Unknown condition id in workflow ${workflowId}: ${conditionId}`);
  }
  if (!enabled && condition.gate.required) {
    return refuse(`The gate "${condition.gate.id}" is required and cannot be switched off.`);
  }
  return {
    ok: true,
    state: {
      ...state,
      workflows: state.workflows.map((w) =>
        w.id === workflowId
          ? { ...w, conditions: w.conditions.map((c) => (c.id === conditionId ? { ...c, enabled } : c)) }
          : w,
      ),
    },
  };
}

function refuse(message: string): EditResult {
  return { ok: false, message };
}

function requireWorkflow(state: MapState, workflowId: string): Workflow {
  const found = state.workflows.find((w) => w.id === workflowId);
  if (!found) {
    throw new Error(`Unknown workflow id: ${workflowId}`);
  }
  return found;
}
