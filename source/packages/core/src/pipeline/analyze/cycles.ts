// Loops among Connections (architecture.md §12). The Connections of a flow, and the flow Connections of the
// pipeline, form no cycle. A depth-first search over each graph gives one blocker per loop, at the Connection
// that closes it. A link to a missing id is not followed (references.ts reports it), and a Check route is not a
// Connection, so a back route is never a loop here (routes.ts checks it).

import type { Block, ProjectConfig } from '../model.js';
import type { LocatedFinding } from './finding.js';

// Where a Connection sits in the config, and the flow and block positions used to order its finding.
interface Location {
  path: string;
  flow: number;
  block: number;
}

// A Connection that is followed: the item it leaves from, the item it joins, and where it is written.
interface Edge {
  from: string;
  to: string;
  location: Location;
}

export function checkLoops(config: ProjectConfig): LocatedFinding[] {
  return [...checkBlockLoops(config), ...checkFlowLoops(config)];
}

function checkBlockLoops(config: ProjectConfig): LocatedFinding[] {
  return config.pipeline.flows.flatMap((flow, flowIndex) => {
    const blockIds = new Set(flow.blocks.map((block) => block.id));
    const edges = flow.blocks.flatMap((block, blockIndex): Edge[] => {
      const link = blockLink(block);
      if (link === undefined || !blockIds.has(link.to)) {
        return [];
      }
      const location = {
        path: `pipeline.flows[${flowIndex}].blocks[${blockIndex}].connectedTo`,
        flow: flowIndex,
        block: blockIndex,
      };
      return [{ from: block.id, to: link.to, location }];
    });
    return closingEdges(
      flow.blocks.map((block) => block.id),
      edges,
    ).map(({ from, to, location }): LocatedFinding => ({
      severity: 'blocker',
      path: location.path,
      message: `The connection from "${from}" to "${to}" closes a loop among the blocks of this flow. Connections must form a chain; a retry goes in a Check route.`,
      flow: location.flow,
      block: location.block,
    }));
  });
}

function checkFlowLoops(config: ProjectConfig): LocatedFinding[] {
  const flowIds = new Set(config.pipeline.flows.map((flow) => flow.id));
  const edges = config.pipeline.flows.flatMap((flow, flowIndex): Edge[] => {
    if (flow.connectedTo === undefined || !flowIds.has(flow.connectedTo.to)) {
      return [];
    }
    const location = { path: `pipeline.flows[${flowIndex}].connectedTo`, flow: flowIndex, block: -1 };
    return [{ from: flow.id, to: flow.connectedTo.to, location }];
  });
  return closingEdges(
    config.pipeline.flows.map((flow) => flow.id),
    edges,
  ).map(({ from, to, location }): LocatedFinding => ({
    severity: 'blocker',
    path: location.path,
    message: `The flow connection from "${from}" to "${to}" closes a loop among the flows of the pipeline. Flow connections must form a chain.`,
    flow: location.flow,
    block: location.block,
  }));
}

// The Connection of a block, or undefined when the block has none. A Check routes through its own routes, not
// through a Connection, and an End has no Connection.
function blockLink(block: Block): { to: string } | undefined {
  if (block.kind === 'check' || block.kind === 'end') {
    return undefined;
  }
  return block.connectedTo;
}

// Each node has at most one outgoing Connection, so the search follows one chain at a time. A Connection that
// reaches a node still on the current path closes a loop; it is returned, and the search goes on past it.
function closingEdges(nodes: readonly string[], edges: readonly Edge[]): Edge[] {
  const next = new Map<string, Edge>(edges.map((edge) => [edge.from, edge] as const));
  const state = new Map<string, 'open' | 'done'>();
  const closing: Edge[] = [];

  // Walks the chain from each unvisited node without recursion, so a long chain cannot exhaust the call stack.
  for (const start of nodes) {
    const path: string[] = [];
    let node: string | undefined = start;
    while (node !== undefined && !state.has(node)) {
      state.set(node, 'open');
      path.push(node);
      const edge = next.get(node);
      if (edge !== undefined && state.get(edge.to) === 'open') {
        closing.push(edge);
      }
      node = edge?.to;
    }
    for (const visited of path) {
      state.set(visited, 'done');
    }
  }
  return closing;
}
