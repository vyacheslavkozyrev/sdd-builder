import {
  childPath,
  describeValue,
  readId,
  readObject,
  type ProblemCollector,
} from '../check/primitives.js';
import type { Route } from '../model.js';

// A route of a Condition (pipeline-schema.md §2, `route`; AC-058, AC-060). A route is exactly one of
// `{to}`, `{to, roundLimit}` or `{stop: true}`. An unknown key (such as `gate` or `label`) is refused
// at the path of that key. Any other shape is refused at the path of the route. `roundLimit` is an
// integer from 1 to 5 and is refused at its own path. Whether `to` names a block of the flow, and
// an earlier agent for a return, is checked later (AC-059 to AC-062). An invalid route is left out.

const ROUTE_KEYS: readonly string[] = ['to', 'roundLimit', 'stop'];
const ROUND_LIMIT_MIN = 1;
const ROUND_LIMIT_MAX = 5;
const SHAPE_MESSAGE = 'must be {to}, {to, roundLimit} or {stop: true}';

function readRoundLimit(value: unknown, path: string, problems: ProblemCollector): number | undefined {
  if (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= ROUND_LIMIT_MIN &&
    value <= ROUND_LIMIT_MAX
  ) {
    return value;
  }
  problems.add(path, `must be a whole number from 1 to 5, got ${describeValue(value)}`);
  return undefined;
}

export function readRoute(value: unknown, path: string, problems: ProblemCollector): Route | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let known = true;
  for (const key of Object.keys(record)) {
    if (!ROUTE_KEYS.includes(key)) {
      problems.add(childPath(path, key), `has an unknown key ${key}`);
      known = false;
    }
  }
  if (!known) return undefined;

  const hasTo = Object.hasOwn(record, 'to');
  const hasRoundLimit = Object.hasOwn(record, 'roundLimit');

  if (Object.hasOwn(record, 'stop')) {
    if (hasTo || hasRoundLimit || record.stop !== true) {
      problems.add(path, SHAPE_MESSAGE);
      return undefined;
    }
    return { stop: true };
  }

  if (!hasTo) {
    problems.add(path, SHAPE_MESSAGE);
    return undefined;
  }

  const to = readId(record.to, childPath(path, 'to'), problems);
  if (!hasRoundLimit) {
    return to === undefined ? undefined : { to };
  }
  const roundLimit = readRoundLimit(record.roundLimit, childPath(path, 'roundLimit'), problems);
  if (to === undefined || roundLimit === undefined) return undefined;
  return { to, roundLimit };
}
