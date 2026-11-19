import {
  childPath,
  readBoolean,
  readId,
  readList,
  readObject,
  readText,
  type ProblemCollector,
} from '../check/primitives.js';
import type { Argument } from '../model.js';

// Argument rows (pipeline-schema.md §2; AC-015 to AC-017, AC-019). A row requires `id`, `required`
// and `hint`, and has no other key. A row that is missing one of them, or has an unknown key, is
// refused with the path of the row; its fields are then checked one by one, each problem at the
// path of its field. An invalid row is left out of the result. The pipeline, a flow and an agent
// all read their rows here; the `path` passed in names the list the row sits in.

const ARGUMENT_KEYS: readonly string[] = ['id', 'required', 'hint'];

function readArgument(value: unknown, path: string, problems: ProblemCollector): Argument | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!ARGUMENT_KEYS.includes(key)) {
      problems.add(path, `has an unknown key ${key}`);
      complete = false;
    }
  }
  for (const key of ARGUMENT_KEYS) {
    if (!Object.hasOwn(record, key)) {
      problems.add(path, `is missing the key ${key}`);
      complete = false;
    }
  }
  if (!complete) return undefined;

  const id = readId(record.id, childPath(path, 'id'), problems);
  const required = readBoolean(record.required, childPath(path, 'required'), problems);
  const hint = readText(record.hint, childPath(path, 'hint'), { max: 100 }, problems);
  if (id === undefined || required === undefined || hint === undefined) return undefined;
  return { id, required, hint };
}

// Returns the rows that parse, in document order. Returns undefined when the value is not a list.
// An empty list is accepted (AC-015).
export function readArguments(
  value: unknown,
  path: string,
  problems: ProblemCollector,
): Argument[] | undefined {
  const items = readList(value, path, problems);
  if (items === undefined) return undefined;

  const rows: Argument[] = [];
  items.forEach((item, index) => {
    const row = readArgument(item, childPath(path, String(index)), problems);
    if (row !== undefined) rows.push(row);
  });
  return rows;
}
