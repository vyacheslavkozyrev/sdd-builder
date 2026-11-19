import {
  childPath,
  describeValue,
  readObject,
  ROOT_PATH,
  type ProblemCollector,
  type Reader,
} from '../check/primitives.js';
import { readArchitecture, readIdea, readName, readStack } from './brief.js';
import { readRules } from './rules.js';

// The root object of a project config (pipeline-schema.md §2). Every root key is known here:
// an unknown key is refused (AC-007), a required key must be present (AC-004), and each key
// is checked by its JSON type and limit. `name`, `idea`, `architecture`, `stack` and `rules`
// are read by their own parsers. The body of `pipeline` is read by its own parser in a later task;
// here it is checked for its type only.

const readSchemaVersion: Reader<unknown> = (value, path, problems) => {
  if (value === 2) return value;
  problems.add(path, `must be the number 2, got ${describeValue(value)}`);
  return undefined;
};

const ROOT_READERS: ReadonlyMap<string, Reader<unknown>> = new Map<string, Reader<unknown>>([
  ['schemaVersion', readSchemaVersion],
  ['name', readName],
  ['idea', readIdea],
  ['architecture', readArchitecture],
  ['stack', readStack],
  ['rules', readRules],
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
