import {
  childPath,
  readObject,
  readText,
  type ProblemCollector,
  type Reader,
} from '../check/primitives.js';
import type { Stack } from '../model.js';

// The optional brief fields of a project config (pipeline-schema.md §2; AC-074 to AC-076).
// Each one may be absent. Its text is counted in code points (AC-088).

export const readName: Reader<string> = (value, path, problems) =>
  readText(value, path, { max: 100 }, problems);

export const readIdea: Reader<string> = (value, path, problems) =>
  readText(value, path, { max: 5000 }, problems);

export const readArchitecture: Reader<string> = (value, path, problems) =>
  readText(value, path, { max: 5000 }, problems);

const STACK_KEYS: readonly (keyof Stack)[] = [
  'language',
  'framework',
  'platform',
  'buildTool',
  'testFramework',
];

function isStackKey(key: string): key is keyof Stack {
  return (STACK_KEYS as readonly string[]).includes(key);
}

// `stack` is an object of optional text fields of up to 100 code points each. An unknown key is
// refused with its own path. Returns undefined when any part of it is refused.
export const readStack: Reader<Stack> = (value, path, problems) => {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!isStackKey(key)) {
      problems.add(childPath(path, key), 'is not a known key');
      complete = false;
    }
  }

  const stack: { -readonly [K in keyof Stack]?: string } = {};
  for (const key of STACK_KEYS) {
    if (!Object.hasOwn(record, key)) continue;
    const field = readText(record[key], childPath(path, key), { max: 100 }, problems);
    if (field === undefined) complete = false;
    else stack[key] = field;
  }
  return complete ? stack : undefined;
};
