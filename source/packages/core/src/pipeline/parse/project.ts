import {
  childPath,
  describeValue,
  readObject,
  ROOT_PATH,
  type ProblemCollector,
  type Reader,
} from '../check/primitives.js';
import type { ProjectConfig } from '../model.js';
import { readArchitecture, readIdea, readName, readStack } from './brief.js';
import { readPipeline } from './pipeline.js';
import { readRules } from './rules.js';

// The root object of a project config (pipeline-schema.md §2). Every root key is known here:
// an unknown key is refused (AC-007), a required key must be present (AC-004), and each key
// is checked by its JSON type and limit. `name`, `idea`, `architecture`, `stack`, `rules` and
// `pipeline` are read by their own parsers. The values that parsed are returned in `RootParts`,
// so the entry can run the cross-checks on whatever parsed; a key that did not parse is left out.

export type RootParts = { -readonly [K in keyof ProjectConfig]?: ProjectConfig[K] };

const readSchemaVersion: Reader<2> = (value, path, problems) => {
  if (value === 2) return value;
  problems.add(path, `must be the number 2, got ${describeValue(value)}`);
  return undefined;
};

const REQUIRED_KEYS: readonly string[] = ['schemaVersion', 'rules', 'pipeline'];
const ROOT_KEYS: readonly string[] = [...REQUIRED_KEYS, 'name', 'idea', 'architecture', 'stack'];

// Reads one known root key into `parts`. The key is already known; `schemaVersion` is only checked.
function readRootKey(key: string, value: unknown, path: string, problems: ProblemCollector, parts: RootParts): void {
  switch (key) {
    case 'schemaVersion':
      readSchemaVersion(value, path, problems);
      return;
    case 'name': {
      const name = readName(value, path, problems);
      if (name !== undefined) parts.name = name;
      return;
    }
    case 'idea': {
      const idea = readIdea(value, path, problems);
      if (idea !== undefined) parts.idea = idea;
      return;
    }
    case 'architecture': {
      const architecture = readArchitecture(value, path, problems);
      if (architecture !== undefined) parts.architecture = architecture;
      return;
    }
    case 'stack': {
      const stack = readStack(value, path, problems);
      if (stack !== undefined) parts.stack = stack;
      return;
    }
    case 'rules': {
      const rules = readRules(value, path, problems);
      if (rules !== undefined) parts.rules = rules;
      return;
    }
    case 'pipeline': {
      const pipeline = readPipeline(value, path, problems);
      if (pipeline !== undefined) parts.pipeline = pipeline;
      return;
    }
  }
}

// Checks the root of the config and adds every problem found to `problems`, in document order
// for the keys that are present; a missing required key is reported after them. Returns the
// values that parsed.
export function parseRoot(input: unknown, problems: ProblemCollector): RootParts {
  const parts: RootParts = {};
  const record = readObject(input, ROOT_PATH, problems);
  if (record === undefined) return parts;

  for (const key of Object.keys(record)) {
    const path = childPath(ROOT_PATH, key);
    if (!ROOT_KEYS.includes(key)) {
      problems.add(path, 'is not a known key');
      continue;
    }
    readRootKey(key, record[key], path, problems, parts);
  }

  for (const key of REQUIRED_KEYS) {
    if (!Object.hasOwn(record, key)) problems.add(childPath(ROOT_PATH, key), 'is required');
  }
  return parts;
}
