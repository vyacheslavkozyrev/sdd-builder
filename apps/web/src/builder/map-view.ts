// Builder map read model: what each map node and each connection shows.
// Pure: no DOM, no storage, no network. Counts follow the generator: only enabled steps
// count, and only enabled conditions on those steps (selectConditions).
import { selectConditions } from '@sddbuilder/core';
import type { GateType, MapConnection, Scope, Workflow } from '@sddbuilder/core';

/** What one workflow node shows on the map. */
export interface MapNode {
  id: string;
  name: string;
  scope: Scope;
  iterationSource: string;
  /** Enabled steps of the workflow. */
  stepCount: number;
  /** Selected conditions whose fail output is `stop`. */
  gateCount: number;
  /** Selected conditions whose fail output goes to a step. */
  routeCount: number;
}

/** What one connection shows on the map. `null` means none. */
export interface MapEdge {
  id: string;
  from: string;
  to: string;
  label: string | null;
  gateType: GateType | null;
}

/** One node per workflow, in the order given. Disabled workflows are shown with their counts. */
export function mapNodes(workflows: readonly Workflow[]): MapNode[] {
  return workflows.map((workflow) => {
    const conditions = selectConditions(workflow);
    return {
      id: workflow.id,
      name: workflow.name,
      scope: workflow.scope,
      iterationSource: workflow.iterationSource,
      stepCount: workflow.steps.filter((step) => step.enabled).length,
      gateCount: conditions.filter((c) => c.fail?.kind === 'stop').length,
      routeCount: conditions.filter((c) => c.fail?.kind === 'step').length,
    };
  });
}

/** The text drawn on an edge: the artifact label, the gate type, or both joined; empty when neither. */
export function edgeText(edge: MapEdge): string {
  return [edge.label, edge.gateType].filter((part) => part !== null).join(' · ');
}

/** One edge per connection. A blank artifact label is no label. */
export function mapEdges(connections: readonly MapConnection[]): MapEdge[] {
  return connections.map((connection) => ({
    id: connection.id,
    from: connection.from,
    to: connection.to,
    label: connection.artifact?.trim() || null,
    gateType: connection.gate?.type ?? null,
  }));
}
