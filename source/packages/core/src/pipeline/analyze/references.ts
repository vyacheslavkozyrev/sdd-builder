// Block connections and Check routes name a block of their own flow (architecture.md §12, decision 33).
// A `connectedTo` that names a block of another flow, or no block, is a blocker at its path. A Check route
// is checked the same way; a route with `stop` names no block and is accepted.

import type { ProjectConfig, Route } from '../model.js';
import type { LocatedFinding } from './finding.js';

export function checkBlockReferences(config: ProjectConfig): LocatedFinding[] {
  const allBlockIds = new Set(config.pipeline.flows.flatMap((flow) => flow.blocks.map((block) => block.id)));
  return config.pipeline.flows.flatMap((flow, flowIndex) => {
    const ownBlockIds = new Set(flow.blocks.map((block) => block.id));
    return flow.blocks.flatMap((block, blockIndex) => {
      const blockPath = `pipeline.flows[${flowIndex}].blocks[${blockIndex}]`;
      const scope: Scope = { ownBlockIds, allBlockIds, position: { flow: flowIndex, block: blockIndex } };
      if (block.kind === 'check') {
        return [
          ...routeFindings(scope, `${blockPath}.connectedTo.true`, block.connectedTo.true),
          ...routeFindings(scope, `${blockPath}.connectedTo.false`, block.connectedTo.false),
        ];
      }
      if (block.kind === 'end' || block.connectedTo === undefined) {
        return [];
      }
      return targetFindings(scope, `${blockPath}.connectedTo`, block.connectedTo.to, 'connection');
    });
  });
}

interface Scope {
  ownBlockIds: ReadonlySet<string>;
  allBlockIds: ReadonlySet<string>;
  position: { flow: number; block: number };
}

function routeFindings(scope: Scope, path: string, route: Route): LocatedFinding[] {
  if (!('to' in route)) {
    return [];
  }
  return targetFindings(scope, path, route.to, 'route');
}

// One blocker when `to` names no block of the flow: a block of another flow, or no block at all.
function targetFindings(scope: Scope, path: string, to: string, kind: 'connection' | 'route'): LocatedFinding[] {
  if (scope.ownBlockIds.has(to)) {
    return [];
  }
  const named = `The ${kind} names "${to}"`;
  const inAnotherFlow = scope.allBlockIds.has(to);
  const message = inAnotherFlow
    ? `${named}, a block of another flow. Name a block of this flow.`
    : `${named}, which is no block. Name a block of this flow.`;
  return [{ severity: 'blocker', path, message, ...scope.position }];
}
