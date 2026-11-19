import {
  childPath,
  describeValue,
  readId,
  readObject,
  type ProblemCollector,
} from '../check/primitives.js';
import type { StartBlock } from '../model.js';

// The Start block of a flow (pipeline-schema.md §2, `blockStart`; AC-044). A start requires `id`,
// `kind` and `next`, and has no other key. An unknown key is refused at the path of that key; a
// missing key is refused at the path of the block. An invalid start is left out of the result.
// Where `next` may point is checked later, by the block links of a flow (AC-045, AC-046).

const START_KEYS: readonly string[] = ['id', 'kind', 'next'];

export function readStart(
  value: unknown,
  path: string,
  problems: ProblemCollector,
  index: number,
): StartBlock | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!START_KEYS.includes(key)) {
      problems.add(childPath(path, key), `has an unknown key ${key}`);
      complete = false;
    }
  }
  for (const key of START_KEYS) {
    if (!Object.hasOwn(record, key)) {
      problems.add(path, `is missing the key ${key}`);
      complete = false;
    }
  }
  if (!complete) return undefined;

  const id = readId(record.id, childPath(path, 'id'), problems);
  const next = readId(record.next, childPath(path, 'next'), problems);
  if (record.kind !== 'start') {
    problems.add(childPath(path, 'kind'), `must be start, got ${describeValue(record.kind)}`);
    return undefined;
  }
  if (id === undefined || next === undefined) return undefined;
  return { index, id, kind: 'start', next };
}
