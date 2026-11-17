// The block link and the route (architecture.md §6 decision 33): `connectedTo` on a block is `{ to, label }`,
// and the two outputs of a Check are routes, `{ to, roundLimit? }` or `{ stop: true }`.
// Shape only: whether `to` names a block that exists, and whether a route goes forward, is checked by F-03.

import type { BlockLink, Route } from '../model.js';
import {
  childPath,
  idValue,
  nonBlankText,
  objectValue,
  positiveWholeNumber,
  type Problems,
  visitKeys,
} from '../check/primitives.js';

export function parseBlockLink(value: unknown, path: string, problems: Problems): BlockLink | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  const before = problems.list.length;
  const found: { to: string | undefined; label: string | undefined } = { to: undefined, label: undefined };
  visitKeys(object, ['to', 'label'], path, problems, (key) => {
    if (key === 'to') {
      found.to = idValue(object['to'], childPath(path, 'to'), problems);
    } else if (key === 'label') {
      found.label = nonBlankText(object['label'], childPath(path, 'label'), problems);
    }
  });
  if (found.to === undefined || found.label === undefined || problems.list.length > before) {
    return undefined;
  }
  return { to: found.to, label: found.label };
}

// A route is `{ to, roundLimit? }` or `{ stop: true }`. A route with both `to` and `stop`, or with neither,
// is refused at the route's path; `roundLimit` belongs to a route that goes somewhere, so it is refused on a stop.
export function parseRoute(value: unknown, path: string, problems: Problems): Route | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  const before = problems.list.length;
  const hasTo = object['to'] !== undefined;
  const hasStop = object['stop'] !== undefined;
  const found: { to: string | undefined; roundLimit: number | undefined } = { to: undefined, roundLimit: undefined };
  visitKeys(object, ['to', 'roundLimit', 'stop'], path, problems, (key) => {
    if (key === 'to' && hasTo) {
      found.to = idValue(object['to'], childPath(path, 'to'), problems);
    } else if (key === 'roundLimit' && object['roundLimit'] !== undefined) {
      if (hasStop) {
        problems.add(childPath(path, 'roundLimit'), 'is not allowed on a stop route');
      } else {
        found.roundLimit = positiveWholeNumber(object['roundLimit'], childPath(path, 'roundLimit'), problems);
      }
    } else if (key === 'stop' && hasStop && object['stop'] !== true) {
      problems.add(childPath(path, 'stop'), 'must be true');
    }
  });
  if (hasTo === hasStop) {
    problems.add(path, 'must have either to or stop: exactly one of them');
  }
  if (problems.list.length > before) {
    return undefined;
  }
  if (hasStop) {
    return { stop: true };
  }
  if (found.to === undefined) {
    return undefined;
  }
  const route: Route = { to: found.to };
  if (found.roundLimit !== undefined) {
    route.roundLimit = found.roundLimit;
  }
  return route;
}
