/** One problem with untrusted input: the dotted path of the field ('' for the root) and the reason. Never the submitted value. */
export interface PipelineProblem {
  path: string;
  message: string;
}

export type Obj = Record<string, unknown>;

/** The path of a key under a parent path. The root has no prefix. */
export function childPath(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`;
}

/** The path of an item in a list, e.g. `pipeline.blocks[2]`. */
export function indexPath(path: string, index: number): string {
  return `${path}[${index}]`;
}

/** True for a plain object: not null, not an array. */
export function isPlainObject(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True when the key is present, whatever its value. */
export function has(obj: Obj, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/** Reads a value that must be present. A missing key gives one problem. */
export function requirePresent(obj: Obj, key: string, path: string, problems: PipelineProblem[]): boolean {
  if (has(obj, key)) return true;
  problems.push({ path: childPath(path, key), message: 'is required' });
  return false;
}

/** Reads a value that must be an object. A non-object gives one problem at its path. */
export function readObject(value: unknown, path: string, problems: PipelineProblem[]): Obj | undefined {
  if (isPlainObject(value)) return value;
  problems.push({ path, message: 'must be an object' });
  return undefined;
}

/** Refuses every key that is not allowed, each at its own path. */
export function checkKeys(obj: Obj, allowed: readonly string[], path: string, problems: PipelineProblem[]): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      problems.push({ path: childPath(path, key), message: 'is not a known key' });
    }
  }
}

export function readString(obj: Obj, key: string, path: string, problems: PipelineProblem[]): string | undefined {
  if (!requirePresent(obj, key, path, problems)) return undefined;
  const value = obj[key];
  if (typeof value === 'string') return value;
  problems.push({ path: childPath(path, key), message: 'must be a string' });
  return undefined;
}

/** A string that may be left out. When it is present it must be a string. */
export function readOptionalString(obj: Obj, key: string, path: string, problems: PipelineProblem[]): string | undefined {
  return has(obj, key) ? readString(obj, key, path, problems) : undefined;
}

/** A list whose items are checked later. Only the fact that it is a list is checked here. */
export function readList(obj: Obj, key: string, path: string, problems: PipelineProblem[]): unknown[] | undefined {
  if (!requirePresent(obj, key, path, problems)) return undefined;
  const value = obj[key];
  if (Array.isArray(value)) return value;
  problems.push({ path: childPath(path, key), message: 'must be a list' });
  return undefined;
}

/** The ids of one list of blocks, in order, and the ids of its connections. Read from the raw list, for the references between blocks. */
export interface ListIds {
  ids: readonly string[];
  connections: readonly string[];
}

/** Collects the ids and connection ids of a raw list. Items without a string id are left out. */
export function describeList(list: readonly unknown[]): ListIds {
  const ids: string[] = [];
  const connections: string[] = [];
  for (const item of list) {
    if (!isPlainObject(item)) continue;
    const id = item['id'];
    if (typeof id !== 'string') continue;
    ids.push(id);
    if (item['kind'] === 'connection') connections.push(id);
  }
  return { ids, connections };
}
