import {
  childPath,
  describeValue,
  readId,
  readObject,
  readText,
  type ProblemCollector,
} from '../check/primitives.js';
import type { ConditionBlock } from '../model.js';
import { readRoute } from './route.js';

// The Condition block of a flow (pipeline-schema.md §2, `blockCondition`; AC-056, AC-057). A condition
// requires `id`, `kind`, `description`, `true` and `false`, and has no other key. An unknown key is
// refused at the path of that key; a missing key is refused at the path of the block. `description`
// is text that is not blank and at most 1,000 code points. Each route is read by `readRoute`. An
// invalid condition is left out of the result.

const CONDITION_KEYS: readonly string[] = ['id', 'kind', 'description', 'true', 'false'];

export function readCondition(
  value: unknown,
  path: string,
  problems: ProblemCollector,
  index: number,
): ConditionBlock | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!CONDITION_KEYS.includes(key)) {
      problems.add(childPath(path, key), `has an unknown key ${key}`);
      complete = false;
    }
  }
  for (const key of CONDITION_KEYS) {
    if (!Object.hasOwn(record, key)) {
      problems.add(path, `is missing the key ${key}`);
      complete = false;
    }
  }
  if (!complete) return undefined;

  const id = readId(record.id, childPath(path, 'id'), problems);
  if (record.kind !== 'condition') {
    problems.add(childPath(path, 'kind'), `must be condition, got ${describeValue(record.kind)}`);
    return undefined;
  }
  const description = readText(
    record.description,
    childPath(path, 'description'),
    { max: 1000, min: 1, nonBlank: true },
    problems,
  );
  const onTrue = readRoute(record.true, childPath(path, 'true'), problems);
  const onFalse = readRoute(record.false, childPath(path, 'false'), problems);
  if (id === undefined || description === undefined || onTrue === undefined || onFalse === undefined) {
    return undefined;
  }
  return { index, id, kind: 'condition', description, true: onTrue, false: onFalse };
}
