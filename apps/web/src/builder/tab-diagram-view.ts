// Tab diagram read model: the nodes and edges of one workflow's diagram, in the order of the workflow.
// Pure: no DOM, no storage, no network. Each step is followed by the conditions placed after it.
// The order comes from the workflow's step list; the layout is only a column per node.
// A condition whose step is not in the workflow is not drawn. Route edges are drawn only for enabled
// conditions, as the generator uses only those (selectConditions).
import { getCatalogStep } from '@sddbuilder/core';
import type { Workflow } from '@sddbuilder/core';

/** One box in the diagram: a workflow step or a condition placed after one. */
export interface DiagramNode {
  id: string;
  kind: 'step' | 'condition';
  /** The step id for a step node; null for a condition node. */
  stepId: string | null;
  /** The text on the box. A switched-off node says so. */
  label: string;
  enabled: boolean;
  /** Left-to-right position, starting at 0. */
  column: number;
}

/** One line in the diagram: the order between neighbours, or a pass or fail route. */
export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  kind: 'sequence' | 'route';
  /** Set on a route edge; null on a sequence edge. */
  label: 'pass' | 'fail' | null;
}

/** The nodes and edges of one workflow's diagram. */
export interface DiagramModel {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

/** The node id of a workflow step. */
export function stepNodeId(stepId: string): string {
  return `step:${stepId}`;
}

/** The node id of a condition. */
export function conditionNodeId(conditionId: string): string {
  return `condition:${conditionId}`;
}

/** The diagram of one workflow: each step in order, with its conditions after it, and the edges between them. */
export function tabDiagram(workflow: Workflow): DiagramModel {
  const nodes: DiagramNode[] = [];
  for (const step of workflow.steps) {
    const name = getCatalogStep(step.stepId).name;
    nodes.push({
      id: stepNodeId(step.stepId),
      kind: 'step',
      stepId: step.stepId,
      label: step.enabled ? name : `${name} (off)`,
      enabled: step.enabled,
      column: nodes.length,
    });
    for (const condition of workflow.conditions.filter((c) => c.afterStepId === step.stepId)) {
      const label = `${condition.gate.type} gate`;
      nodes.push({
        id: conditionNodeId(condition.id),
        kind: 'condition',
        stepId: null,
        label: condition.enabled ? label : `${label} (off)`,
        enabled: condition.enabled,
        column: nodes.length,
      });
    }
  }

  const edges: DiagramEdge[] = [];
  for (let index = 0; index + 1 < nodes.length; index += 1) {
    const from = nodes[index];
    const to = nodes[index + 1];
    if (from !== undefined && to !== undefined) {
      edges.push({ id: `sequence:${from.id}>${to.id}`, from: from.id, to: to.id, kind: 'sequence', label: null });
    }
  }

  const ids = new Set(nodes.map((node) => node.id));
  for (const condition of workflow.conditions) {
    if (!condition.enabled) {
      continue;
    }
    const from = conditionNodeId(condition.id);
    for (const [label, route] of [
      ['pass', condition.pass],
      ['fail', condition.fail],
    ] as const) {
      if (route?.kind === 'step' && ids.has(stepNodeId(route.stepId)) && ids.has(from)) {
        const to = stepNodeId(route.stepId);
        edges.push({ id: `route:${from}>${to}:${label}`, from, to, kind: 'route', label });
      }
    }
  }

  return { nodes, edges };
}
