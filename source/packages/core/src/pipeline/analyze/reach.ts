// Reachability (architecture.md §12, decision 34). Every flow is reached from the first flow along flow Connections.
// Every block of a reached flow is reached from the flow's Start along Connections and Check routes; a stop route
// names no block, so it is not followed. A flow that is not reached gets one blocker at the flow, and its blocks are
// not checked, so one unreached flow gives one finding. A flow with no Start is not checked here (start-end.ts reports
// it). A flow with two Starts is checked from the first one.

import type { Block, Flow, ProjectConfig } from '../model.js';
import type { LocatedFinding } from './finding.js';

export function checkReachability(config: ProjectConfig): LocatedFinding[] {
  const { flows } = config.pipeline;
  const first = flows[0];
  if (first === undefined) {
    return [];
  }
  const flowEdges = new Map(flows.map((flow): [string, string[]] => [flow.id, flowTargets(flow)]));
  const reachedFlows = reachedIds(first.id, flowEdges);
  return flows.flatMap((flow, flowIndex): LocatedFinding[] => {
    if (!reachedFlows.has(flow.id)) {
      const message = `The flow "${flow.id}" is not reached from the first flow. Connect it with a flow Connection from a reached flow, or remove it.`;
      return [{ severity: 'blocker', path: `pipeline.flows[${flowIndex}]`, message, flow: flowIndex, block: -1 }];
    }
    return unreachedBlocks(flow, flowIndex);
  });
}

// The blocks of a reached flow that the first Start does not reach. A flow with no Start has nothing to check from.
function unreachedBlocks(flow: Flow, flowIndex: number): LocatedFinding[] {
  const start = flow.blocks.find((block) => block.kind === 'start');
  if (start === undefined) {
    return [];
  }
  const edges = new Map(flow.blocks.map((block): [string, string[]] => [block.id, blockTargets(block)]));
  const reached = reachedIds(start.id, edges);
  return flow.blocks.flatMap((block, blockIndex): LocatedFinding[] => {
    if (reached.has(block.id)) {
      return [];
    }
    const message = `The block "${block.id}" is not reached from the Start of its flow. Connect it along the chain or a Check route, or remove it.`;
    return [
      {
        severity: 'blocker',
        path: `pipeline.flows[${flowIndex}].blocks[${blockIndex}]`,
        message,
        flow: flowIndex,
        block: blockIndex,
      },
    ];
  });
}

// The ids the block can lead to: its Connection, or both routes of a Check. An End leads nowhere, and a stop route
// names no block.
function blockTargets(block: Block): string[] {
  if (block.kind === 'check') {
    return [block.connectedTo.true, block.connectedTo.false].flatMap((route) =>
      'to' in route ? [route.to] : [],
    );
  }
  if (block.kind === 'end') {
    return [];
  }
  return block.connectedTo === undefined ? [] : [block.connectedTo.to];
}

// The flow a flow leads to through its flow Connection, if it has one.
function flowTargets(flow: Flow): string[] {
  return flow.connectedTo === undefined ? [] : [flow.connectedTo.to];
}

// The ids reached from `start` by following the edges, `start` included. Walks with a stack, so a long chain
// cannot exhaust the call stack.
function reachedIds(start: string, edges: ReadonlyMap<string, readonly string[]>): Set<string> {
  const reached = new Set<string>([start]);
  const pending = [start];
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    for (const target of edges.get(id) ?? []) {
      if (!reached.has(target)) {
        reached.add(target);
        pending.push(target);
      }
    }
  }
  return reached;
}
