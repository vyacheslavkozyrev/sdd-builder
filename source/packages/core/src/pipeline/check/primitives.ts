import type { Model, Problem } from '../model.js';

// The problem collector and the value rules shared by every parser and check.
// Readers take an unknown value, return the typed value when it is valid, and
// push a problem at its path otherwise. They never throw on bad input.

export interface ProblemCollector {
  add(path: string, message: string): void;
  list(): Problem[];
}

export type Reader<T> = (value: unknown, path: string, problems: ProblemCollector) => T | undefined;

export interface TextRule {
  readonly max: number;
  readonly min?: number;
  readonly nonBlank?: boolean;
}

export const ROOT_PATH = 'root';

// The text `none` is not an artifact of an End, whether or not a flow has one labelled none (owner decision
// 2026-11-26; F-16 AC-032). Blank is the way to say an End produces no artifact.
export const NONE_TEXT = 'none';
export const NONE_REFUSAL = `'none' is not an artifact: leave it blank for an End that produces no artifact`;

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const ID_MAX = 60;
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// The file-safe form of an id: lowercase letters, digits and hyphens, starting with a letter. Shared by the
// readers and the structural analysis, so both use one pattern (F-03 AC-026, AC-027).
export function isFileSafeId(value: string): boolean {
  return ID_PATTERN.test(value);
}

const MODELS: readonly Model[] = ['haiku', 'sonnet', 'opus', 'inherit'];

export function createProblemCollector(): ProblemCollector {
  const problems: Problem[] = [];
  return {
    add(path, message) {
      problems.push({ path, message });
    },
    list() {
      return [...problems];
    },
  };
}

// Code points, not UTF-16 units: an emoji counts as one (AC-088).
export function codePoints(text: string): number {
  return Array.from(text).length;
}

export function childPath(parent: string, key: string): string {
  return parent === ROOT_PATH ? key : `${parent}.${key}`;
}

export function describeValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'nothing';
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'object') return 'an object';
  if (typeof value === 'string') return 'text';
  if (typeof value === 'number') return 'a number';
  if (typeof value === 'boolean') return 'a boolean';
  return typeof value;
}

function refuse(value: unknown, path: string, problems: ProblemCollector, expected: string): undefined {
  problems.add(path, `must be ${expected}, got ${describeValue(value)}`);
  return undefined;
}

export function readBoolean(value: unknown, path: string, problems: ProblemCollector): boolean | undefined {
  if (typeof value === 'boolean') return value;
  return refuse(value, path, problems, 'true or false');
}

export function readList(value: unknown, path: string, problems: ProblemCollector): unknown[] | undefined {
  if (Array.isArray(value)) return value;
  return refuse(value, path, problems, 'a list');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readObject(
  value: unknown,
  path: string,
  problems: ProblemCollector,
): Record<string, unknown> | undefined {
  if (isRecord(value)) return value;
  return refuse(value, path, problems, 'an object');
}

export function readText(
  value: unknown,
  path: string,
  rule: TextRule,
  problems: ProblemCollector,
): string | undefined {
  if (typeof value !== 'string') return refuse(value, path, problems, 'text');
  if (rule.nonBlank === true && !/\S/.test(value)) {
    problems.add(path, 'must not be blank');
    return undefined;
  }
  const length = codePoints(value);
  if (rule.min !== undefined && length < rule.min) {
    problems.add(path, `must be at least ${rule.min} ${rule.min === 1 ? 'character' : 'characters'}`);
    return undefined;
  }
  if (length > rule.max) {
    problems.add(path, `must be at most ${rule.max} characters`);
    return undefined;
  }
  return value;
}

// An id is a lower-case GUID (AC-028): the builder generates it, and the user never types it.
export function readId(value: unknown, path: string, problems: ProblemCollector): string | undefined {
  if (typeof value !== 'string') return refuse(value, path, problems, 'an id (text)');
  if (!GUID_PATTERN.test(value)) {
    problems.add(path, 'must be a GUID');
    return undefined;
  }
  return value;
}

// A file-safe name (an agent's `name`, which becomes a file name): not an id, so it is not a GUID (F-02 AC-048).
export function readFileSafeName(value: unknown, path: string, problems: ProblemCollector): string | undefined {
  if (typeof value !== 'string') return refuse(value, path, problems, 'a file-safe name (text)');
  if (!isFileSafeId(value) || codePoints(value) > ID_MAX) {
    problems.add(
      path,
      'must be a file-safe name: lowercase letters, digits and hyphens, starting with a letter, at most 60 characters',
    );
    return undefined;
  }
  return value;
}

export function readModel(value: unknown, path: string, problems: ProblemCollector): Model | undefined {
  const model = MODELS.find((candidate) => candidate === value);
  if (model !== undefined) return model;
  problems.add(path, `must be one of ${MODELS.join(', ')}, got ${describeValue(value)}`);
  return undefined;
}

// A required key: absent is a problem; present is read by `read`.
export function readRequired<T>(
  record: Record<string, unknown>,
  key: string,
  parentPath: string,
  problems: ProblemCollector,
  read: Reader<T>,
): T | undefined {
  const path = childPath(parentPath, key);
  if (!Object.hasOwn(record, key)) {
    problems.add(path, 'is required');
    return undefined;
  }
  return read(record[key], path, problems);
}

// An optional key: absent is accepted; present is read by `read`, so `null` is refused (AC-010).
export function readOptional<T>(
  record: Record<string, unknown>,
  key: string,
  parentPath: string,
  problems: ProblemCollector,
  read: Reader<T>,
): T | undefined {
  if (!Object.hasOwn(record, key)) return undefined;
  return read(record[key], childPath(parentPath, key), problems);
}
