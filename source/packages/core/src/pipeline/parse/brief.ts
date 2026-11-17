// The brief fields of the pipeline config (architecture.md §6 decisions 37 and 28): the project's name, idea,
// architecture and stack. All are optional. The text is kept as submitted: nothing is trimmed and no line break
// is changed. Shape only: the analyzer's checks on the brief are in pipeline/analyze.

import type { Stack } from '../model.js';
import { childPath, objectValue, visitKeys, type Problems } from '../check/primitives.js';
import { plainText } from './block.js';

export const BRIEF_KEYS = ['name', 'idea', 'architecture', 'stack'] as const;
const BRIEF_TEXT_MAX_CODE_POINTS = 5000;
const STACK_KEYS = ['language', 'framework', 'platform', 'buildTool', 'testFramework'] as const;

// `idea` and `architecture`: text of at most 5,000 code points (decision 28). A code point is one or two UTF-16
// units, so a text longer than twice the cap is refused before it is counted, as bodyText does.
export function longBriefText(value: unknown, path: string, problems: Problems): string | undefined {
  const text = plainText(value, path, problems);
  if (text === undefined) {
    return undefined;
  }
  if (text.length > 2 * BRIEF_TEXT_MAX_CODE_POINTS || [...text].length > BRIEF_TEXT_MAX_CODE_POINTS) {
    problems.add(path, `must be at most ${BRIEF_TEXT_MAX_CODE_POINTS} code points`);
    return undefined;
  }
  return text;
}

// The stack: an object of text fields. An unknown key is refused with its path (F-06 AC-004).
export function stackValue(value: unknown, path: string, problems: Problems): Stack | undefined {
  const object = objectValue(value, path, problems);
  if (object === undefined) {
    return undefined;
  }
  const before = problems.list.length;
  const values = new Map<string, string>();
  visitKeys(object, STACK_KEYS, path, problems, (key) => {
    const entry = object[key];
    if (entry !== undefined) {
      const text = plainText(entry, childPath(path, key), problems);
      if (text !== undefined) {
        values.set(key, text);
      }
    }
  });
  if (problems.list.length > before) {
    return undefined;
  }
  const stack: Stack = {};
  for (const key of STACK_KEYS) {
    const text = values.get(key);
    if (text !== undefined) {
      stack[key] = text;
    }
  }
  return stack;
}
