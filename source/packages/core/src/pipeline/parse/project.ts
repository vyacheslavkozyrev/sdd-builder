import {
  childPath,
  describeValue,
  readList,
  readObject,
  readText,
  ROOT_PATH,
  type ProblemCollector,
  type Reader,
} from '../check/primitives.js';

// The root object of a project config (pipeline-schema.md §2). Every root key is known here:
// an unknown key is refused (AC-007), a required key must be present (AC-004), and each key
// is checked by its JSON type and limit. The bodies of `rules`, `stack` and `pipeline` are
// read by their own parsers in later tasks; here they are checked for their type only.

const readSchemaVersion: Reader<unknown> = (value, path, problems) => {
  if (value === 2) return value;
  problems.add(path, `must be the number 2, got ${describeValue(value)}`);
  return undefined;
};

const ROOT_READERS: ReadonlyMap<string, Reader<unknown>> = new Map<string, Reader<unknown>>([
  ['schemaVersion', readSchemaVersion],
  ['name', (value, path, problems) => readText(value, path, { max: 100 }, problems)],
  ['idea', (value, path, problems) => readText(value, path, { max: 5000 }, problems)],
  ['architecture', (value, path, problems) => readText(value, path, { max: 5000 }, problems)],
  ['stack', readObject],
  ['rules', readList],
  ['pipeline', readObject],
]);

const REQUIRED_KEYS: readonly string[] = ['schemaVersion', 'rules', 'pipeline'];

// Checks the root of the config and adds every problem found to `problems`, in document order
// for the keys that are present; a missing required key is reported after them.
export function parseRoot(input: unknown, problems: ProblemCollector): void {
  const record = readObject(input, ROOT_PATH, problems);
  if (record === undefined) return;

  for (const key of Object.keys(record)) {
    const path = childPath(ROOT_PATH, key);
    const read = ROOT_READERS.get(key);
    if (read === undefined) {
      problems.add(path, 'is not a known key');
      continue;
    }
    read(record[key], path, problems);
  }

  for (const key of REQUIRED_KEYS) {
    if (!Object.hasOwn(record, key)) problems.add(childPath(ROOT_PATH, key), 'is required');
  }
}
