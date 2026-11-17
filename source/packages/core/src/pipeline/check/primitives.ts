// Value rules shared by every parser level (architecture.md §6 decisions 18, 25 to 28, 33).
// Each check takes an unknown value and its path, adds a problem when the value is refused,
// and returns the narrowed value, or undefined when it was refused.

import { MODELS, type Id, type Model } from '../model.js';

export interface Problem {
  readonly path: string;
  readonly message: string;
}

export interface Problems {
  readonly list: Problem[];
  add(path: string, message: string): void;
}

export function createProblems(): Problems {
  const list: Problem[] = [];
  return {
    list,
    add(path, message) {
      list.push({ path, message });
    },
  };
}

export const BODY_MAX_CODE_POINTS = 1000;

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

export function childPath(parent: string, key: string): string {
  return parent === '' ? key : `${parent}.${key}`;
}

export function itemPath(parent: string, index: number): string {
  return `${parent}[${index}]`;
}

export function checkKeys(
  object: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  path: string,
  problems: Problems,
): void {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) {
      problems.add(childPath(path, key), 'unknown key');
    }
  }
}

export function nonBlankText(value: unknown, path: string, problems: Problems): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    problems.add(path, 'must be non-blank text');
    return undefined;
  }
  return value;
}

export function bodyText(value: unknown, path: string, problems: Problems): string | undefined {
  if (typeof value !== 'string') {
    problems.add(path, 'must be text');
    return undefined;
  }
  // A code point is one or two UTF-16 units, so a text longer than twice the cap is refused
  // before it is counted: the spread below never builds an array for an unbounded input.
  if (value.length > 2 * BODY_MAX_CODE_POINTS || [...value].length > BODY_MAX_CODE_POINTS) {
    problems.add(path, `must be at most ${BODY_MAX_CODE_POINTS} characters`);
    return undefined;
  }
  return value;
}

export function positiveWholeNumber(
  value: unknown,
  path: string,
  problems: Problems,
): number | undefined {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    problems.add(path, 'must be a positive whole number');
    return undefined;
  }
  return value;
}

export function booleanValue(value: unknown, path: string, problems: Problems): boolean | undefined {
  if (typeof value !== 'boolean') {
    problems.add(path, 'must be true or false');
    return undefined;
  }
  return value;
}

export function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  problems: Problems,
): T | undefined {
  const found = allowed.find((option) => option === value);
  if (found === undefined) {
    problems.add(path, `must be one of ${allowed.join(', ')}`);
    return undefined;
  }
  return found;
}

export function textList(value: unknown, path: string, problems: Problems): string[] | undefined {
  if (!Array.isArray(value)) {
    problems.add(path, 'must be a list of text');
    return undefined;
  }
  const entries: readonly unknown[] = value;
  const seen = new Set<string>();
  const items: string[] = [];
  let valid = true;
  // An indexed loop, not forEach: forEach skips the holes of a sparse array, which would drop an entry silently.
  for (let index = 0; index < entries.length; index++) {
    const entryPath = itemPath(path, index);
    const text = nonBlankText(entries[index], entryPath, problems);
    if (text === undefined) {
      valid = false;
    } else if (seen.has(text)) {
      problems.add(entryPath, 'duplicates an earlier entry');
      valid = false;
    } else {
      seen.add(text);
      items.push(text);
    }
  }
  return valid ? items : undefined;
}

export function idValue(value: unknown, path: string, problems: Problems): Id | undefined {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    problems.add(path, 'must be an id: lowercase letters, digits and hyphens, starting with a letter');
    return undefined;
  }
  return value;
}

export function modelValue(value: unknown, path: string, problems: Problems): Model | undefined {
  return enumValue(value, MODELS, path, problems);
}
