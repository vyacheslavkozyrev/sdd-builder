// Map tab read model: the tab row, the flow nodes, the Connection edges with the gates on them, and the Map toolbox
// (F-06 AC-001 to AC-004). Pure: no DOM, no storage, no network. A flow's scope is the one scope of its enabled Agent
// blocks, `mixed` when they differ, and `no agent` when it has none. Its block count counts every block, switched off
// or not. Only a Connection between two flows is an edge; a gate is drawn on the Connection it sits on.
import { pipeline } from '@sddbuilder/core';

type ProjectConfig = pipeline.ProjectConfig;
type FlowBlock = pipeline.FlowBlock;
type ConnectionBlock = pipeline.ConnectionBlock;
type PipelineConditionBlock = pipeline.PipelineConditionBlock;
type Route = pipeline.Route;

/** The scope a flow node shows: its enabled Agent blocks' one scope; `mixed` if they differ; `no agent` if none. */
export type FlowScope = pipeline.Scope | 'mixed' | 'no agent';

/** One tab of the tab row: the Map first, then one tab per flow in order, then the + tab that adds a flow. */
export type MapTab =
  | { kind: 'map'; label: 'Map' }
  | { kind: 'flow'; flowId: string; label: string; enabled: boolean }
  | { kind: 'add'; label: '+' };

/** A flow drawn as a box on the Map. `column` is its left-to-right position among the flows, starting at 0. */
export interface FlowNode {
  id: string;
  name: string;
  enabled: boolean;
  scope: FlowScope;
  blockCount: number;
  column: number;
}

/** A gate or check drawn as a diamond on its Connection. The outputs are labelled with where they go. */
export interface GateDiamond {
  id: string;
  enabled: boolean;
  /** The check type and who decides, e.g. `approval · human`. */
  text: string;
  /** The pass output, e.g. `pass: next`. */
  pass: string;
  /** The fail output, e.g. `fail: stop` or `fail: back to Plan`. */
  fail: string;
}

/** A Connection between two flows drawn as an arrow. `label` is the artifact; null when it is blank. */
export interface ConnectionEdge {
  id: string;
  from: string;
  to: string;
  enabled: boolean;
  label: string | null;
  gates: GateDiamond[];
}

/** The items the Map toolbox offers: a Connection, an Approval gate and a Check gate. */
export interface ToolboxItem {
  kind: 'connection' | 'approval' | 'check';
  label: string;
  hint: string;
}

/** Everything the Map tab draws. */
export interface MapTabView {
  tabs: MapTab[];
  nodes: FlowNode[];
  edges: ConnectionEdge[];
  toolbox: readonly ToolboxItem[];
}

const TOOLBOX: readonly ToolboxItem[] = [
  { kind: 'connection', label: 'Connection', hint: 'runs after · artifact' },
  { kind: 'approval', label: 'Approval', hint: 'human decides: gate' },
  { kind: 'check', label: 'Check', hint: 'agent or diff size: gate' },
];

/** The Map tab read model for a configuration. */
export function mapTabView(config: ProjectConfig): MapTabView {
  const flows = config.pipeline.blocks.filter((block): block is FlowBlock => block.kind === 'flow');
  const names = new Map(flows.map((flow) => [flow.id, flow.name]));
  const flowIds = new Set(flows.map((flow) => flow.id));
  const connections = config.pipeline.blocks.filter(
    (block): block is ConnectionBlock =>
      block.kind === 'connection' && flowIds.has(block.from) && flowIds.has(block.to),
  );
  const conditions = config.pipeline.blocks.filter(
    (block): block is PipelineConditionBlock => block.kind === 'condition',
  );

  return {
    tabs: [
      { kind: 'map', label: 'Map' },
      ...flows.map((flow): MapTab => ({ kind: 'flow', flowId: flow.id, label: flow.name, enabled: flow.enabled })),
      { kind: 'add', label: '+' },
    ],
    nodes: flows.map((flow, column) => ({
      id: flow.id,
      name: flow.name,
      enabled: flow.enabled,
      scope: flowScope(flow),
      blockCount: flow.blocks.length,
      column,
    })),
    edges: connections.map((connection) => {
      const artifact = connection.artifact.trim();
      return {
        id: connection.id,
        from: connection.from,
        to: connection.to,
        enabled: connection.enabled,
        label: artifact === '' ? null : artifact,
        gates: conditions
          .filter((gate) => gate.onConnection === connection.id)
          .map((gate) => gateDiamond(gate, names)),
      };
    }),
    toolbox: TOOLBOX,
  };
}

/** The one scope of a flow's enabled Agent blocks; `mixed` when they differ; `no agent` when there is none. */
function flowScope(flow: FlowBlock): FlowScope {
  const scopes = [
    ...new Set(flow.blocks.flatMap((block) => (block.kind === 'agent' && block.enabled ? [block.scope] : []))),
  ];
  const [only] = scopes;
  if (only === undefined) return 'no agent';
  return scopes.length === 1 ? only : 'mixed';
}

function gateDiamond(gate: PipelineConditionBlock, names: ReadonlyMap<string, string>): GateDiamond {
  return {
    id: gate.id,
    enabled: gate.enabled,
    text: `${gate.checkType} · ${gate.decidedBy}`,
    pass: `pass: ${routeText(gate.passRoute, names)}`,
    fail: `fail: ${routeText(gate.failRoute, names)}`,
  };
}

/** Where a route goes, in words. A back route names the flow it returns to. */
function routeText(route: Route, names: ReadonlyMap<string, string>): string {
  switch (route.kind) {
    case 'next':
      return 'next';
    case 'stop':
      return 'stop';
    case 'back':
      return `back to ${names.get(route.blockId) ?? route.blockId}`;
  }
}
