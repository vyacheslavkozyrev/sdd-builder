// Check routes that go back (architecture.md §12, decision 33). A route to an earlier block of the same flow is a
// back route, and a retry is allowed only when it goes back. A route to the Check itself is not an earlier block,
// so it is a blocker. A back route with no `roundLimit` is a warning, since the retry would have no limit. A route
// to a later block has no finding. A route that names no block of its flow is skipped: references.ts refuses it.

import type { Flow, ProjectConfig, Route } from '../model.js';
import type { LocatedFinding } from './finding.js';

export function checkRoutes(config: ProjectConfig): LocatedFinding[] {
  return config.pipeline.flows.flatMap((flow, flowIndex) =>
    flow.blocks.flatMap((block, blockIndex) => {
      if (block.kind !== 'check') {
        return [];
      }
      const blockPath = `pipeline.flows[${flowIndex}].blocks[${blockIndex}]`;
      const position = { flow: flowIndex, block: blockIndex };
      return [
        ...routeFindings(flow, blockIndex, `${blockPath}.connectedTo.true`, block.connectedTo.true, position),
        ...routeFindings(flow, blockIndex, `${blockPath}.connectedTo.false`, block.connectedTo.false, position),
      ];
    }),
  );
}

// The findings of one route of the Check at `checkIndex`. A route with `stop` names no block and has no finding.
function routeFindings(
  flow: Flow,
  checkIndex: number,
  path: string,
  route: Route,
  position: { flow: number; block: number },
): LocatedFinding[] {
  if (!('to' in route)) {
    return [];
  }
  const targetIndex = flow.blocks.findIndex((block) => block.id === route.to);
  if (targetIndex === -1) {
    return [];
  }
  if (targetIndex === checkIndex) {
    const message =
      'The route names the Check itself, which is not an earlier block. A retry must go to an earlier block of this flow.';
    return [{ severity: 'blocker', path, message, ...position }];
  }
  if (targetIndex > checkIndex || route.roundLimit !== undefined) {
    return [];
  }
  const message = `The retry route to "${route.to}" has no round limit, so it could repeat forever. Set a roundLimit on the route.`;
  return [{ severity: 'warning', path, message, ...position }];
}
