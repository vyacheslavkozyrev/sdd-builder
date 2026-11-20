import { checkBlockLinks } from '../check/block-links.js';
import type { ProjectConfig } from '../model.js';
import type { Position, PositionedFinding } from './finding.js';

// The targets of a condition's routes (F-03 AC-016 to AC-020). A route names a later block of its own flow; a route
// with a roundLimit names an earlier agent of its flow (a return). The F-02 function checkBlockLinks decides both,
// so the rules are not written twice: each route problem it returns becomes a blocker at the route's `to` path.
// The `next` problems of checkBlockLinks belong to the links rule and are dropped here.

const ROUTE_RULE = 'route-link';
// The `to` path of a route: `true` is slot 0 and `false` is slot 1, so the true route sorts first (AC-032).
const ROUTE_TO_PATH = /^pipeline\.flows\.(\d+)\.blocks\.(\d+)\.(true|false)\.to$/;

function positionOf(path: string): Position {
  const route = ROUTE_TO_PATH.exec(path);
  if (route === null) throw new Error(`the structural analysis has no position for the route path ${path}`);
  return { flow: Number(route[1]), block: Number(route[2]), slot: route[3] === 'true' ? 0 : 1 };
}

export function routesRule(config: ProjectConfig): PositionedFinding[] {
  return checkBlockLinks(config)
    .filter(({ path }) => ROUTE_TO_PATH.test(path))
    .map(({ path, message }) => ({
      severity: 'blocker',
      rule: ROUTE_RULE,
      path,
      message,
      position: positionOf(path),
    }));
}
